# Game Analyzer - Video Analysis with Lua Scripts

The Game Analyzer is a powerful system that bridges Python's computer vision and image processing capabilities with Lua's game-specific analysis logic. It enables dynamic game video analysis without redeployment by loading game-specific Lua scripts at runtime.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React UI (Renderer Process)                                 │
│  ├─ window.powder.game.analyze(video_path, game_id)         │
│  └─ window.powder.game.list()                                │
└────────────────────┬─────────────────────────────────────────┘
                     │ IPC
┌────────────────────▼─────────────────────────────────────────┐
│  Electron Main Process                                       │
│  ├─ game:analyze (IPC handler)                               │
│  └─ game:list (IPC handler)                                  │
└────────────────────┬─────────────────────────────────────────┘
                     │ Python subprocess
┌────────────────────▼─────────────────────────────────────────┐
│  Python Engine (engine.py)                                   │
│  ├─ cmd_game_analyze()                                       │
│  └─ cmd_game_list()                                          │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────┐
│  GameAnalyzer                                                │
│  ├─ Load video with OpenCV                                   │
│  ├─ Load Lua analysis script                                 │
│  ├─ Inject Python functions into Lua                         │
│  └─ Process frames and collect results                       │
└────────────────────┬─────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼────┐              ┌────▼────┐
    │ Lua    │              │ Python  │
    │Script  │◄─────────────┤OCR/     │
    │        │   Callbacks  │Analysis │
    └────────┘              └─────────┘
```

## Core Components

### 1. GameAnalyzer (`game_analyzer.py`)

Main class that orchestrates video analysis.

**Key Methods:**
- `analyze_video(video_path, output_file)` - Process entire video
- `load_script()` - Load game-specific Lua script
- `_create_lua_functions()` - Create Python functions for Lua

### 2. OCRProvider (`game_analyzer.py`)

Provides text extraction and color detection capabilities.

**Methods:**
- `read_text(image, region)` - Extract text using PaddleOCR
- `detect_color_region(image, color_range)` - Find colored regions

### 3. GameScriptLoader (`game_analyzer.py`)

Manages game-specific scripts and files.

**Methods:**
- `load_script(game_id, script_name)` - Load game script
- `get_available_games()` - List available games

### 4. LuaProcessor (`lua_processor.py`)

Executes Lua scripts with injected Python functions.

## How It Works: Step-by-Step

### Step 1: UI Initiates Analysis

```typescript
// React component
const result = await window.powder.game.analyze({
  video_path: '/path/to/game_video.mp4',
  game_id: 'DF'  // Delta Force
});
```

### Step 2: Electron IPC Routes Request

The `game:analyze` IPC handler forwards to Python engine:

```typescript
// src/electron/ipc/commands.ts
const result = await pythonBridge.sendCommand('game:analyze', args);
```

### Step 3: Python Engine Handles Command

```python
# src/python/engine.py
def cmd_game_analyze(self, args, request_id):
    analyzer = GameAnalyzer(game_id, self.lua_processor)
    result = analyzer.analyze_video(video_path)
```

### Step 4: GameAnalyzer Loads Resources

1. Opens video file with OpenCV
2. Loads Lua script from `src/python/games/{game_id}/postprocess.lua`
3. Creates Python function bridges
4. Injects functions into Lua runtime

### Step 5: Frame-by-Frame Processing

For each video frame:

```python
# In GameAnalyzer.analyze_video()
while cap.isOpened():
    ret, frame = cap.read()
    self.current_frame = frame
    self.current_frame_idx = frame_count

    # Call Lua analysis function
    analyze_func = self.lua_processor.globals.get('analyzeFrame')
    if analyze_func:
        analyze_func()  # Lua function calls Python functions as needed
```

### Step 6: Lua Script Executes

The Lua script can now call injected Python functions:

```lua
-- src/python/games/DF/postprocess.lua
function analyzeFrame()
    -- Python functions are available globally
    local text = read_text(REGIONS.accolade)

    if check_future(text) then
        log_event("accolade_detected", {
            text = text,
            confidence = 0.95
        })
    end
end
```

### Step 7: Results Collected

Events found during analysis are collected:

```python
# In GameAnalyzer._create_lua_functions()
def py_log_event(event_type, data):
    event = {
        "type": event_type,
        "frame": self.current_frame_idx,
        "timestamp_ms": self.current_timestamp_ms,
        "data": data
    }
    self.events.append(event)
```

### Step 8: Results Returned to UI

```python
result = {
    "success": True,
    "game_id": "DF",
    "frames_processed": 1500,
    "events_found": 42,
    "events": [
        {
            "type": "accolade_detected",
            "frame": 150,
            "timestamp_ms": 5000,
            "data": { "text": "FUTURE KILL" }
        },
        ...
    ]
}
```

## Available Python Functions in Lua

These functions are injected into Lua and can be called from scripts:

### Text Extraction

```lua
-- Read text from frame region
local text = read_text(REGIONS.accolade)

-- Read text with confidence scores
local details = read_text_detailed(REGIONS.accolade)
-- Returns: {text="...", confidence=0.95, details=[...]}
```

### Color Detection

```lua
-- Detect colored regions
local regions = detect_color({
    lower = {0, 180, 200},
    upper = {50, 255, 255}
})
-- Returns: [{x=100, y=50, w=200, h=100, area=20000}, ...]
```

### Frame Information

```lua
-- Get current frame details
local info = get_frame_info()
-- Returns: {frame_idx=150, timestamp_ms=5000, width=1920, height=1080, channels=3}
```

### Event Logging

```lua
-- Log an event
log_event("accolade_detected", {
    text = "FUTURE KILL",
    confidence = 0.95
})
```

### Debugging

```lua
-- Debug logging
debug("Processing frame " .. frame_idx)
```

## Creating a Game Script

Game scripts are Lua files that analyze video frames using injected Python functions.

**Directory Structure:**
```
src/python/games/
├── DF/                          # Delta Force
│   ├── postprocess.lua          # Main analysis script
│   └── config.json              # Optional game configuration
└── [GAME_ID]/
    └── postprocess.lua
```

**Script Template:**

```lua
-- Define regions of interest
local REGIONS = {
    ui_element = { x = 100, y = 100, w = 200, h = 100 }
}

-- Define color ranges (BGR)
local COLORS = {
    gold = { lower = {0, 180, 200}, upper = {50, 255, 255} }
}

-- Main analysis function (called once per frame)
function analyzeFrame()
    -- Get frame info
    local info = get_frame_info()

    -- Analyze frame
    local text = read_text(REGIONS.ui_element)
    if text ~= "" then
        -- Log event
        log_event("text_detected", {
            text = text,
            frame = info.frame_idx,
            timestamp = info.timestamp_ms
        })
    end

    -- Detect colors
    local gold_regions = detect_color(COLORS.gold)
    for i, region in ipairs(gold_regions) do
        if region.area > 500 then
            log_event("highlight_detected", region)
        end
    end
end
```

## Performance Considerations

### Optimization Tips

1. **Region of Interest (ROI)**: Process only relevant frame regions
   ```lua
   local text = read_text(REGIONS.small_area)  -- Fast
   -- Instead of:
   local text = read_text()  -- Entire frame - slow
   ```

2. **Frame Skipping**: Analyze every N frames for performance
   ```lua
   function analyzeFrame()
       local info = get_frame_info()
       if info.frame_idx % 5 == 0 then  -- Every 5th frame
           -- Analysis
       end
   end
   ```

3. **Cooldowns**: Avoid duplicate detections
   ```lua
   local last_detection = -100
   if frame_idx - last_detection > 30 then
       -- Detection logic
       last_detection = frame_idx
   end
   ```

### Performance Metrics

- Video Processing: ~30-60 FPS (depends on resolution and OCR)
- OCR per frame: ~50-100ms
- Lua analysis overhead: <5ms
- Color detection: ~10-20ms

## Error Handling

### Video Errors

```json
{
  "success": false,
  "error": "Failed to open video: /path/to/video.mp4"
}
```

### Script Errors

```json
{
  "success": false,
  "error": "Lua error: attempt to index a nil value"
}
```

### OCR Errors

When PaddleOCR is not available, falls back to empty results:

```python
{
  "text": "",
  "confidence": 0.0,
  "details": []
}
```

## Usage Example: Delta Force

Analyzing a Delta Force gameplay video:

```typescript
// 1. List available games
const games = await window.powder.game.list();
// Result: { games: ['DF'], count: 1 }

// 2. Analyze video
const result = await window.powder.game.analyze({
  video_path: '/videos/deltaf_force_gameplay.mp4',
  game_id: 'DF'
});

// 3. Process results
if (result.success) {
  console.log(`Found ${result.events_found} events`);

  result.events.forEach(event => {
    console.log(`${event.type} at frame ${event.frame} (${event.timestamp_ms}ms)`);
    console.log('  Data:', event.data);
  });
}
```

## Output Format

Results are returned as JSON:

```json
{
  "success": true,
  "game_id": "DF",
  "video_path": "/path/to/video.mp4",
  "frames_processed": 1500,
  "fps": 30,
  "duration_ms": 50000,
  "events_found": 42,
  "events": [
    {
      "type": "accolade_detected",
      "frame": 150,
      "timestamp_ms": 5000,
      "data": {
        "text": "FUTURE KILL",
        "confidence": 0.95
      }
    }
  ]
}
```

## Adding New Games

To add analysis for a new game:

1. **Create game directory:**
   ```bash
   mkdir -p src/python/games/{GAME_ID}
   ```

2. **Write postprocess.lua:**
   ```bash
   cat > src/python/games/{GAME_ID}/postprocess.lua << 'EOF'
   function analyzeFrame()
       -- Your game-specific analysis
   end
   EOF
   ```

3. **Use from React:**
   ```typescript
   await window.powder.game.analyze({
     video_path: '/path/to/video.mp4',
     game_id: '{GAME_ID}'
   });
   ```

## Dependencies

- **opencv-python**: Video frame extraction
- **paddleocr**: Text extraction (optional)
- **lupa**: Lua interpreter
- **numpy**: Array operations

## Future Enhancements

- [ ] Streaming analysis (process frames in real-time)
- [ ] GPU acceleration for OCR
- [ ] Multi-threaded frame processing
- [ ] Machine learning model integration
- [ ] Custom color profile per game
- [ ] Frame-level event metadata
- [ ] Video highlight export
