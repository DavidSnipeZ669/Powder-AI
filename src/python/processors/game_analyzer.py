"""
Game Analyzer Module
Processes game videos using Lua scripts with injected Python functions.
Bridges Python OCR and image processing capabilities with Lua game analysis logic.
"""

import logging
import os
import json
import cv2
import numpy as np
from typing import Dict, List, Optional, Any, Callable, Tuple
from pathlib import Path
from datetime import datetime
import uuid

from processors.lua_processor import LuaProcessor, LuaExecutionMode

logger = logging.getLogger(__name__)


class OCRProvider:
    """Provides OCR capabilities for game video analysis."""

    def __init__(self):
        """Initialize OCR provider."""
        self.use_paddle = False
        try:
            import paddleocr
            self.paddle_ocr = paddleocr.PaddleOCR(use_angle_cls=True, lang='en')
            self.use_paddle = True
            logger.info("PaddleOCR initialized successfully")
        except ImportError:
            logger.warning("PaddleOCR not available. Using fallback OCR.")
            self.paddle_ocr = None

    def read_text(self, image: np.ndarray, region: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        """
        Extract text from image using OCR.

        Args:
            image: Input image (numpy array)
            region: Optional region to crop (keys: x, y, w, h)

        Returns:
            Dict with keys: text (str), confidence (float), details (list)
        """
        try:
            # Crop if region specified
            if region:
                x, y, w, h = region.get('x', 0), region.get('y', 0), region.get('w', image.shape[1]), region.get('h', image.shape[0])
                image = image[y:y+h, x:x+w]

            if self.use_paddle and self.paddle_ocr:
                return self._paddle_ocr_read(image)
            else:
                return self._fallback_ocr_read(image)

        except Exception as e:
            logger.error(f"OCR read error: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "details": [],
                "error": str(e)
            }

    def _paddle_ocr_read(self, image: np.ndarray) -> Dict[str, Any]:
        """Read text using PaddleOCR."""
        result = self.paddle_ocr.ocr(image, cls=True)

        if not result or not result[0]:
            return {
                "text": "",
                "confidence": 0.0,
                "details": []
            }

        # Combine results
        texts = []
        confidences = []
        details = []

        for line in result[0]:
            if line:
                text = line[1][0]
                confidence = line[1][1]
                texts.append(text)
                confidences.append(confidence)
                details.append({
                    "text": text,
                    "confidence": float(confidence),
                    "bbox": line[0]
                })

        combined_text = " ".join(texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return {
            "text": combined_text,
            "confidence": float(avg_confidence),
            "details": details
        }

    def _fallback_ocr_read(self, image: np.ndarray) -> Dict[str, Any]:
        """Fallback OCR (returns empty results)."""
        logger.debug("Using fallback OCR - no text extracted")
        return {
            "text": "",
            "confidence": 0.0,
            "details": []
        }

    def detect_color_region(
        self,
        image: np.ndarray,
        color_range: Dict[str, List[int]],
        min_area: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Detect regions of specific color in image.

        Args:
            image: Input image (BGR)
            color_range: Dict with 'lower' and 'upper' lists [B, G, R]
            min_area: Minimum region area

        Returns:
            List of detected regions with bounding boxes
        """
        try:
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

            lower = np.array(color_range['lower'], dtype=np.uint8)
            upper = np.array(color_range['upper'], dtype=np.uint8)

            mask = cv2.inRange(hsv, lower, upper)
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            regions = []
            for contour in contours:
                area = cv2.contourArea(contour)
                if area >= min_area:
                    x, y, w, h = cv2.boundingRect(contour)
                    regions.append({
                        "x": int(x),
                        "y": int(y),
                        "w": int(w),
                        "h": int(h),
                        "area": int(area)
                    })

            return regions

        except Exception as e:
            logger.error(f"Color detection error: {e}")
            return []


class GameScriptLoader:
    """Loads and manages game-specific analysis scripts."""

    def __init__(self, games_dir: Optional[Path] = None):
        """
        Initialize script loader.

        Args:
            games_dir: Directory containing game-specific scripts
        """
        self.games_dir = games_dir or Path(__file__).parent.parent / 'games'
        logger.info(f"Game scripts directory: {self.games_dir}")

    def load_script(self, game_id: str, script_name: str = "postprocess.lua") -> Optional[str]:
        """
        Load a game script.

        Args:
            game_id: Game identifier (e.g., "DF" for Delta Force)
            script_name: Script filename

        Returns:
            Script content or None if not found
        """
        script_path = self.games_dir / game_id / script_name

        if not script_path.exists():
            logger.error(f"Script not found: {script_path}")
            return None

        try:
            with open(script_path, 'r', encoding='utf-8') as f:
                script = f.read()
            logger.info(f"Loaded script: {script_path} ({len(script)} chars)")
            return script
        except Exception as e:
            logger.error(f"Failed to load script {script_path}: {e}")
            return None

    def get_available_games(self) -> List[str]:
        """Get list of available games."""
        if not self.games_dir.exists():
            return []

        games = [d.name for d in self.games_dir.iterdir() if d.is_dir()]
        return sorted(games)


class GameAnalyzer:
    """
    Analyzes game videos using Lua scripts with injected Python functions.
    """

    def __init__(self, game_id: str, lua_processor: Optional[LuaProcessor] = None):
        """
        Initialize game analyzer.

        Args:
            game_id: Game identifier (e.g., "DF")
            lua_processor: LuaProcessor instance (creates new if not provided)
        """
        self.game_id = game_id
        self.lua_processor = lua_processor or LuaProcessor(mode=LuaExecutionMode.EXTENDED)
        self.ocr = OCRProvider()
        self.script_loader = GameScriptLoader()

        # Analysis state
        self.video_path: Optional[str] = None
        self.current_frame: Optional[np.ndarray] = None
        self.current_frame_idx: int = 0
        self.current_timestamp_ms: float = 0.0

        # Results
        self.events: List[Dict[str, Any]] = []

        logger.info(f"GameAnalyzer initialized for {game_id}")

    def _create_lua_functions(self) -> Dict[str, Callable]:
        """
        Create Python functions to be injected into Lua.
        These functions bridge Python capabilities to Lua scripts.

        Returns:
            Dict of function_name -> callable
        """
        def py_check_future(text: str) -> bool:
            """Check if frame contains "FUTURE" text (accolade indicator)."""
            return "FUTURE" in text.upper()

        def py_read_text(region: Optional[Dict[str, int]] = None) -> str:
            """Read text from current frame using OCR."""
            if self.current_frame is None:
                return ""
            result = self.ocr.read_text(self.current_frame, region)
            return result.get('text', '')

        def py_read_text_detailed(region: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
            """Read text with confidence and details."""
            if self.current_frame is None:
                return {"text": "", "confidence": 0.0}
            return self.ocr.read_text(self.current_frame, region)

        def py_detect_color(color_range: Dict[str, List[int]]) -> List[Dict[str, int]]:
            """Detect colored regions in frame."""
            if self.current_frame is None:
                return []
            return self.ocr.detect_color_region(self.current_frame, color_range)

        def py_get_frame_info() -> Dict[str, Any]:
            """Get current frame information."""
            if self.current_frame is None:
                return {}
            h, w = self.current_frame.shape[:2]
            return {
                "frame_idx": self.current_frame_idx,
                "timestamp_ms": self.current_timestamp_ms,
                "width": w,
                "height": h,
                "channels": self.current_frame.shape[2] if len(self.current_frame.shape) > 2 else 1
            }

        def py_log_event(event_type: str, data: Dict[str, Any]) -> None:
            """Log an event."""
            event = {
                "type": event_type,
                "frame": self.current_frame_idx,
                "timestamp_ms": self.current_timestamp_ms,
                "data": data
            }
            self.events.append(event)
            logger.info(f"Event logged: {event_type} at frame {self.current_frame_idx}")

        def py_debug(message: str) -> None:
            """Debug logging from Lua."""
            logger.debug(f"[Lua] {message}")

        return {
            "check_future": py_check_future,
            "read_text": py_read_text,
            "read_text_detailed": py_read_text_detailed,
            "detect_color": py_detect_color,
            "get_frame_info": py_get_frame_info,
            "log_event": py_log_event,
            "debug": py_debug,
        }

    def load_script(self) -> bool:
        """
        Load game analysis script.

        Returns:
            True if successfully loaded, False otherwise
        """
        script = self.script_loader.load_script(self.game_id)
        if not script:
            logger.error(f"Failed to load script for game {self.game_id}")
            return False

        self.script = script
        logger.info(f"Script loaded for {self.game_id}")
        return True

    def analyze_video(self, video_path: str, output_file: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze a game video.

        Args:
            video_path: Path to video file
            output_file: Optional path to save results

        Returns:
            Dict with analysis results
        """
        self.video_path = video_path
        self.events = []

        try:
            # Load script
            if not self.load_script():
                return {"success": False, "error": "Failed to load game script"}

            # Open video
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return {"success": False, "error": f"Failed to open video: {video_path}"}

            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            logger.info(f"Video: {total_frames} frames @ {fps} fps")

            # Inject Python functions into Lua
            lua_functions = self._create_lua_functions()
            for func_name, func in lua_functions.items():
                self.lua_processor.globals[func_name] = func

            # Execute script to define analysis function
            try:
                self.lua_processor.runtime.execute(self.script)
                logger.info("Script loaded into Lua runtime")
            except Exception as e:
                logger.error(f"Failed to load script into Lua: {e}")
                return {"success": False, "error": f"Lua error: {e}"}

            # Process frames
            frame_count = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                self.current_frame = frame
                self.current_frame_idx = frame_count
                self.current_timestamp_ms = (frame_count / fps) * 1000

                # Call Lua analysis function
                try:
                    # Try to call the main analysis function
                    analyze_func = self.lua_processor.globals.get('analyzeFrame')
                    if analyze_func and callable(analyze_func):
                        analyze_func()
                except Exception as e:
                    logger.error(f"Error analyzing frame {frame_count}: {e}")

                frame_count += 1

                # Log progress
                if frame_count % 100 == 0:
                    logger.info(f"Processed {frame_count}/{total_frames} frames")

            cap.release()

            # Prepare results
            result = {
                "success": True,
                "game_id": self.game_id,
                "video_path": video_path,
                "frames_processed": frame_count,
                "fps": fps,
                "duration_ms": (frame_count / fps) * 1000,
                "events_found": len(self.events),
                "events": self.events
            }

            # Save results if requested
            if output_file:
                try:
                    with open(output_file, 'w') as f:
                        json.dump(result, f, indent=2)
                    logger.info(f"Results saved to {output_file}")
                except Exception as e:
                    logger.error(f"Failed to save results: {e}")

            logger.info(f"Analysis complete: {len(self.events)} events found")
            return result

        except Exception as e:
            logger.error(f"Analysis failed: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def cleanup(self) -> None:
        """Cleanup resources."""
        if self.lua_processor:
            self.lua_processor.cleanup()
        logger.debug("GameAnalyzer cleaned up")
