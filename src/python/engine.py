#!/usr/bin/env python3
"""
Powder-AI Python Engine
Main entry point for background processing engine.
Listens for JSON commands on stdin and outputs JSON responses on stdout.
"""

import sys
import json
import logging
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
import os
from pathlib import Path

# Setup logging
log_dir = Path.home() / '.powder-ai' / 'logs'
log_dir.mkdir(parents=True, exist_ok=True)
log_file = log_dir / f"python-{datetime.now().strftime('%Y-%m-%d')}.log"

logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stderr),  # Also log to stderr for debugging
    ]
)

logger = logging.getLogger(__name__)


class PythonEngine:
    """Main engine that processes commands from Electron main process."""

    def __init__(self):
        """Initialize the engine."""
        self.is_running = True
        self.active_tasks: Dict[str, Any] = {}
        logger.info('Python engine initialized')

    def send_response(self, request_id: str, result: Optional[Dict[str, Any]] = None,
                     error: Optional[str] = None) -> None:
        """Send a response back to the main process."""
        response = {
            'type': 'response',
            'request_id': request_id,
            'result': result or {},
            'error': error,
        }
        self._send_json(response)

    def send_event(self, name: str, data: Dict[str, Any]) -> None:
        """Send an event to the main process."""
        event = {
            'type': 'event',
            'name': name,
            'data': data,
        }
        self._send_json(event)

    def _send_json(self, obj: Dict[str, Any]) -> None:
        """Send a JSON object to stdout."""
        try:
            json_str = json.dumps(obj)
            print(json_str, flush=True)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f'Failed to send JSON: {e}')

    def handle_command(self, command: str, args: Dict[str, Any],
                      request_id: str) -> None:
        """Handle incoming command from main process."""
        try:
            logger.info(f'Handling command: {command} (request_id: {request_id})')

            if command == 'process:start':
                self.cmd_process_start(args, request_id)
            elif command == 'process:cancel':
                self.cmd_process_cancel(args, request_id)
            elif command == 'model:load':
                self.cmd_model_load(args, request_id)
            elif command == 'model:list':
                self.cmd_model_list(args, request_id)
            else:
                error_msg = f'Unknown command: {command}'
                logger.warning(error_msg)
                self.send_response(request_id, error=error_msg)

        except Exception as e:
            logger.error(f'Error handling command {command}: {e}', exc_info=True)
            self.send_response(request_id, error=str(e))

    def cmd_process_start(self, args: Dict[str, Any], request_id: str) -> None:
        """Handle process:start command."""
        try:
            input_path = args.get('input')
            model = args.get('model')

            if not input_path or not model:
                self.send_response(request_id, error='Missing input or model')
                return

            # Create task
            task_id = str(uuid.uuid4())
            self.active_tasks[task_id] = {
                'status': 'processing',
                'input': input_path,
                'model': model,
            }

            logger.info(f'Started processing task {task_id}: {input_path} with {model}')

            # Send progress event
            self.send_event('progress', {'percent': 0, 'task_id': task_id})

            # Simulate processing progress (in real implementation, this would be actual ML processing)
            for i in range(1, 101, 20):
                self.send_event('progress', {'percent': i, 'task_id': task_id})

            # Send completion event
            self.send_event('task_completed', {
                'task_id': task_id,
                'status': 'completed',
                'output': f'/path/to/output_{task_id}.mp4'
            })

            # Send response
            self.send_response(request_id, result={
                'task_id': task_id,
                'status': 'started',
            })

        except Exception as e:
            logger.error(f'Error in process:start: {e}', exc_info=True)
            self.send_response(request_id, error=str(e))

    def cmd_process_cancel(self, args: Dict[str, Any], request_id: str) -> None:
        """Handle process:cancel command."""
        try:
            task_id = args.get('task_id')

            if not task_id:
                self.send_response(request_id, error='Missing task_id')
                return

            if task_id in self.active_tasks:
                self.active_tasks[task_id]['status'] = 'cancelled'
                logger.info(f'Cancelled task {task_id}')
                self.send_response(request_id, result={'task_id': task_id, 'status': 'cancelled'})
            else:
                self.send_response(request_id, error=f'Task {task_id} not found')

        except Exception as e:
            logger.error(f'Error in process:cancel: {e}', exc_info=True)
            self.send_response(request_id, error=str(e))

    def cmd_model_load(self, args: Dict[str, Any], request_id: str) -> None:
        """Handle model:load command."""
        try:
            model_name = args.get('model')

            if not model_name:
                self.send_response(request_id, error='Missing model name')
                return

            logger.info(f'Loading model: {model_name}')

            # Simulate model loading
            self.send_event('model_loaded', {'model': model_name, 'status': 'loaded'})

            self.send_response(request_id, result={
                'model': model_name,
                'status': 'loaded',
            })

        except Exception as e:
            logger.error(f'Error in model:load: {e}', exc_info=True)
            self.send_response(request_id, error=str(e))

    def cmd_model_list(self, args: Dict[str, Any], request_id: str) -> None:
        """Handle model:list command."""
        try:
            # Return list of available models
            models = [
                {'name': 'yolov8', 'type': 'object_detection'},
                {'name': 'resnet50', 'type': 'image_classification'},
                {'name': 'bert', 'type': 'nlp'},
            ]

            logger.info('Listing available models')

            self.send_response(request_id, result={'models': models})

        except Exception as e:
            logger.error(f'Error in model:list: {e}', exc_info=True)
            self.send_response(request_id, error=str(e))

    def run(self) -> None:
        """Main engine loop - read commands from stdin."""
        logger.info('Python engine started, waiting for commands')
        self.send_event('ready', {'status': 'engine_ready'})

        while self.is_running:
            try:
                line = sys.stdin.readline()
                if not line:
                    logger.info('End of stdin, shutting down')
                    break

                line = line.strip()
                if not line:
                    continue

                # Parse JSON command
                try:
                    message = json.loads(line)
                except json.JSONDecodeError as e:
                    logger.error(f'Invalid JSON received: {line} - {e}')
                    continue

                # Extract command fields
                command = message.get('command')
                args = message.get('args', {})
                request_id = message.get('request_id')

                if not command or not request_id:
                    logger.warning(f'Invalid message format: {message}')
                    continue

                # Handle the command
                self.handle_command(command, args, request_id)

            except KeyboardInterrupt:
                logger.info('Received interrupt signal')
                break
            except Exception as e:
                logger.error(f'Unexpected error in main loop: {e}', exc_info=True)

        logger.info('Python engine shutting down')

    def shutdown(self) -> None:
        """Shutdown the engine."""
        self.is_running = False


def main() -> None:
    """Main entry point."""
    try:
        engine = PythonEngine()
        engine.run()
    except Exception as e:
        logger.error(f'Fatal error: {e}', exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
