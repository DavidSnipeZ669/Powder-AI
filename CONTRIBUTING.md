# Contributing to Powder-AI

Thank you for your interest in contributing to Powder-AI! This project is designed to be community-driven, making it easy for anyone to add support for their favorite games.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Adding a New Game](#adding-a-new-game)
3. [Finding UI Element Coordinates](#finding-ui-element-coordinates)
4. [Writing a postprocess.lua Script](#writing-a-postprocesslua-script)
5. [Testing Your Game](#testing-your-game)
6. [Submitting Your Contribution](#submitting-your-contribution)

---

## Getting Started

### Prerequisites

- Basic Lua programming knowledge (minimal required!)
- A working Powder-AI installation
- A video of your game you want to analyze
- Python 3.8+ (for coordinate finder tool)

### Development Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-repo/Powder-AI.git
cd Powder-AI

# Install dependencies
npm install
pip install -r src/python/requirements.txt

# Run in development mode
npm start
```

---

## Adding a New Game

### Step 1: Create Game Directory

Create a new directory for your game:

```bash
mkdir -p src/python/games/GAME_ID
```

Replace `GAME_ID` with a 2-3 letter identifier for your game:
- `DF` = Delta Force
- `BF` = Battlefield
- `CS` = Counter-Strike
- `VL` = Valorant
- `OW` = Overwatch

### Step 2: Create Game Configuration (Optional)

Create a `config.json` file with game metadata:

```json
{
  "name": "Your Game Name",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "Description of what this analyzer detects",
  "game_id": "GAME_ID",
  "ui_scale": 1.0,
  "supported_resolutions": [
    "1920x1080",
    "2560x1440",
    "3840x2160"
  ],
  "regions": {
    "kill_feed": { "x": 0, "y": 0, "w": 400, "h": 200 },
    "scoreboard": { "x": 0, "y": 0, "w": 600, "h": 800 }
  },
  "events": [
    "kill",
    "headshot",
    "objective_captured",
    "death"
  ]
}
```

### Step 3: Create postprocess.lua Script

Create `src/python/games/GAME_ID/postprocess.lua` with your analysis logic.

See the next section for detailed instructions.

---

## Finding UI Element Coordinates

### Tool: Coordinate Finder

Use the included coordinate finder tool to identify UI element positions:

```bash
python src/python/utils/coordinate_finder.py --video your_video.mp4
```

This tool will:
1. Display your video frame-by-frame
2. Allow you to click on UI elements
3. Show coordinates and dimensions
4. Export coordinates to a file

### Manual Process

If you prefer manual extraction:

1. **Record a video** of your game with clear UI elements
2. **Open the video in your video editor**
3. **Take a screenshot** at a clear moment
4. **Use an image editor** (Paint, GIMP, etc.) to identify coordinates:
   - Hover over elements to see pixel positions
   - Note the X, Y position and Width, Height

### Coordinate Format

Coordinates use (X, Y, W, H) format where:
- **X**: Horizontal position (0 = left edge)
- **Y**: Vertical position (0 = top edge)
- **W**: Width in pixels
- **H**: Height in pixels

Example for a 1920x1080 resolution:
```lua
local REGIONS = {
    kill_feed = { x = 1600, y = 50, w = 300, h = 200 },
    -- X=1600 (right side), Y=50 (near top)
    -- Size: 300 pixels wide, 200 pixels tall
}
```

### Finding Color Ranges

For color detection, use the OCR tool or Python:

```python
import cv2
import numpy as np

# Load image
img = cv2.imread('screenshot.png')
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# Print color at position
color = hsv[100, 200]  # Y=100, X=200
print(f"HSV: {color}")
```

For Lua, convert BGR ranges:
```lua
local COLORS = {
    red = {
        lower = { 0, 0, 200 },      -- BGR: B=0, G=0, R=200
        upper = { 50, 50, 255 }
    }
}
```

---

## Writing a postprocess.lua Script

### Basic Template

```lua
--[[
Game Analysis Script
Detects kills, objectives, and other events.
]]

-- Define regions where UI elements appear
local REGIONS = {
    kill_feed = { x = 1600, y = 50, w = 300, h = 200 },
    score = { x = 800, y = 50, w = 300, h = 100 },
}

-- Define color ranges to detect
local COLORS = {
    red_event = { lower = {0, 0, 200}, upper = {50, 50, 255} },
    gold_text = { lower = {0, 180, 200}, upper = {50, 255, 255} },
}

-- Main analysis function (called for each frame)
function analyzeFrame()
    local frame_info = get_frame_info()

    -- Detect kills
    local text = read_text(REGIONS.kill_feed)
    if text ~= "" then
        log_event("kill_detected", {
            text = text,
            frame = frame_info.frame_idx
        })
    end

    -- Detect events
    detectOtherEvents(frame_info)
end

function detectOtherEvents(frame_info)
    -- Your custom detection logic here
    debug("Analyzing frame " .. frame_info.frame_idx)
end

return analyzeFrame
```

### Available Python Functions

Your Lua script can call these injected Python functions:

#### Text Extraction
```lua
-- Read text from region
local text = read_text(REGIONS.kill_feed)

-- Read with confidence scores
local details = read_text_detailed(REGIONS.kill_feed)
-- Returns: { text = "...", confidence = 0.95, details = [...] }
```

#### Color Detection
```lua
-- Find colored regions
local regions = detect_color(COLORS.red_event)
-- Returns: [{ x=100, y=50, w=200, h=100, area=20000 }, ...]

-- Filter by size
for i, region in ipairs(regions) do
    if region.area > 500 then
        -- Large region detected
    end
end
```

#### Frame Information
```lua
local info = get_frame_info()
-- Returns: {
--   frame_idx = 150,
--   timestamp_ms = 5000,
--   width = 1920,
--   height = 1080,
--   channels = 3
-- }
```

#### Event Logging
```lua
-- Log an event with data
log_event("kill_detected", {
    player = "YourName",
    victim = "Enemy",
    weapon = "Rifle",
    timestamp = frame_info.timestamp_ms
})
```

#### Debugging
```lua
debug("Message here")  -- Logged to console and file
```

### Common Patterns

#### Detecting Text in Region
```lua
function detectKills()
    local text = read_text(REGIONS.kill_feed)
    if text ~= "" and string.find(text, "KILL") then
        log_event("kill_detected", { text = text })
    end
end
```

#### Detecting Colors with Size Filter
```lua
function detectHighlights()
    local regions = detect_color(COLORS.gold)
    for i, region in ipairs(regions) do
        if region.area > 1000 then  -- Large enough
            local text = read_text(region)
            log_event("highlight", { region = region, text = text })
        end
    end
end
```

#### Frame-by-Frame Tracking
```lua
local last_detection = -100
local min_cooldown = 30  -- frames between detections

function analyzeFrame()
    local info = get_frame_info()

    if (info.frame_idx - last_detection) >= min_cooldown then
        -- Detection logic here
        log_event("event", { frame = info.frame_idx })
        last_detection = info.frame_idx
    end
end
```

#### Combining Multiple Conditions
```lua
function detectHeadshot()
    local text = read_text(REGIONS.kill_feed)
    local red_regions = detect_color(COLORS.red)

    if text ~= "" and #red_regions > 0 then
        if string.find(text, "HEADSHOT") then
            log_event("headshot_kill", { text = text })
        end
    end
end
```

### Best Practices

1. **Use Cooldowns**: Avoid duplicate detections
   ```lua
   if (frame_idx - last_kill) >= 30 then
       -- Detection logic
   end
   ```

2. **Filter by Area**: Use region size to reduce false positives
   ```lua
   if region.area > 500 then
       -- Process region
   end
   ```

3. **Check Confidence**: Use OCR confidence scores
   ```lua
   if details.confidence > 0.8 then
       log_event("high_confidence_detection", ...)
   end
   ```

4. **Debug Wisely**: Add debug messages for testing
   ```lua
   debug("Detected text: " .. text)
   ```

5. **Handle Edge Cases**: Account for menu screens, pauses, etc.
   ```lua
   if game_state ~= "playing" then
       return
   end
   ```

---

## Testing Your Game

### Step 1: Record Test Video

Record a short (1-2 minute) video of your game with:
- Clear UI elements visible
- 2-3 events you want to detect
- 1920x1080 or higher resolution
- Good lighting/contrast

### Step 2: Test in UI

1. Launch Powder-AI: `npm start`
2. Go to "Game Analysis" tab
3. Select your video
4. Select your game from dropdown
5. Click "Start Analysis"

### Step 3: Verify Results

Check that:
- ✅ Analysis completes without errors
- ✅ Events are detected correctly
- ✅ Timestamps are accurate
- ✅ Event details are complete

### Step 4: Debug if Needed

Check logs for issues:
```bash
# View Python engine logs
tail -f ~/.powder-ai/logs/python-*.log

# Check browser console (F12)
# Look for IPC or API errors
```

### Step 5: Optimize Regions

If detection isn't working:
1. Adjust region coordinates
2. Adjust color ranges
3. Add debug logging
4. Check OCR confidence

---

## Events Reference

Events should follow this format:

```typescript
interface AnalysisEvent {
  type: string;           // Event name (e.g., "kill_detected")
  frame: number;          // Frame number
  timestamp_ms: number;   // Timestamp in milliseconds
  data: {
    [key: string]: any;   // Custom event data
  };
}
```

### Example Events

**Kill Detection**
```lua
log_event("kill_detected", {
  player = "YourName",
  victim = "Enemy",
  weapon = "AWP",
  headshot = true,
  distance = 45
})
```

**Objective Capture**
```lua
log_event("objective_captured", {
  objective = "Bomb Site A",
  team = "Terrorists",
  captures = 3
})
```

**Achievement/Medal**
```lua
log_event("achievement_unlocked", {
  name = "Ace",
  points = 500,
  difficulty = "hard"
})
```

---

## Submitting Your Contribution

### Step 1: Prepare Your Game Folder

Ensure your game folder has:
```
src/python/games/YOUR_GAME_ID/
├── postprocess.lua         (required)
├── config.json             (optional)
└── README.md               (optional)
```

### Step 2: Test Thoroughly

1. Run with sample video
2. Verify all events detected
3. Check console for errors
4. Test on multiple video qualities if possible

### Step 3: Create Pull Request

```bash
# Create a feature branch
git checkout -b add-game/YOUR_GAME_ID

# Commit your changes
git add src/python/games/YOUR_GAME_ID/
git commit -m "Add support for Your Game"

# Push to your fork
git push origin add-game/YOUR_GAME_ID

# Create PR on GitHub
```

### Step 4: PR Description Template

```markdown
# Add Support for [Game Name]

## Game ID
YOUR_GAME_ID

## What Does This Analyzer Detect?
- Kill events
- Headshots
- Objective captures
- [Other events]

## Tested With
- Resolution: 1920x1080
- Video duration: 2 minutes
- Events detected: 5 kills, 2 headshots

## Coordinates Source
- Screenshots taken from: [date/patch version]
- Tool used: Coordinate Finder / Manual

## Notes
Any additional notes about the analyzer or known limitations.
```

---

## Game Analyzer Examples

### Delta Force (DF)
- Detects: Kills, future medals, highlights
- Regions: Kill feed, accolade popup
- Colors: Gold highlights, red text

### Battlefield (BF)
- Detects: Kills, headshots, vehicles, objectives
- Regions: Kill feed, headshot indicator
- Colors: Red kills, yellow events, vehicle UI

---

## Tips and Tricks

### Dealing with Different Resolutions

Scale coordinates based on resolution:

```lua
local SCALE = 1920 / GAME_WIDTH  -- Adjust for current resolution
local REGIONS = {
    kill_feed = {
        x = math.floor(1600 * SCALE),
        y = math.floor(50 * SCALE),
        w = math.floor(300 * SCALE),
        h = math.floor(200 * SCALE)
    }
}
```

### Handling UI Variations

Account for different UI settings:

```lua
-- Check if using ultra-wide (3440x1440)
local is_ultrawide = SCREEN_WIDTH > 3000

if is_ultrawide then
    -- Adjust regions for ultrawide
    REGIONS.kill_feed.x = 2800
else
    REGIONS.kill_feed.x = 1600
end
```

### Performance Optimization

Skip analysis on some frames for performance:

```lua
function analyzeFrame()
    local info = get_frame_info()

    -- Only process every Nth frame
    if info.frame_idx % 5 == 0 then
        detectKills(info)
    end

    -- Always process for important events
    detectDeaths(info)
end
```

---

## Code of Conduct

- Be respectful and inclusive
- Help others who are learning
- Test your code before submitting
- Document your regions and colors
- Update README if behavior changes

---

## Questions?

- Check existing game analyzers for patterns
- Review the [Game Analyzer Documentation](src/python/processors/GAME_ANALYZER_README.md)
- Check logs for errors
- Ask on GitHub Discussions

---

## Resources

- [Lua 5.1 Reference Manual](https://www.lua.org/manual/5.1/)
- [Game Analyzer API](src/python/processors/GAME_ANALYZER_README.md)
- [Postprocess Lua Guide](src/python/processors/LUA_PROCESSOR_README.md)
- [Analysis View UI Guide](src/renderer/components/ANALYSIS_VIEW_README.md)

---

## License

By contributing to Powder-AI, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Powder-AI! Together, we're building the ultimate game analysis tool. 🎮
