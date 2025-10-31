--[[
Delta Force Game Analysis Script
Detects accolades, achievements, and other game events in video frames.
Uses injected Python functions for OCR and image analysis.
]]

-- Regions of interest for different game elements
local REGIONS = {
    accolade = { x = 400, y = 50, w = 480, h = 150 },      -- Accolade popup
    future_text = { x = 450, y = 80, w = 380, h = 50 },    -- "FUTURE" text
    score = { x = 600, y = 600, w = 300, h = 100 },        -- Score display
    mission = { x = 50, y = 50, w = 500, h = 80 },         -- Mission name
}

-- Color ranges for detection (BGR format)
local COLORS = {
    gold = {
        lower = { 0, 180, 200 },
        upper = { 50, 255, 255 }
    },
    red = {
        lower = { 0, 0, 180 },
        upper = { 80, 80, 255 }
    },
}

-- Track previously detected events to avoid duplicates
local last_accolade_frame = -100
local accolade_cooldown = 30  -- frames between accolades

--[[
Main frame analysis function.
Called once per video frame by the GameAnalyzer.
]]
function analyzeFrame()
    local frame_info = get_frame_info()
    local frame_idx = frame_info.frame_idx

    -- Check for accolades
    detectAccolades(frame_idx)

    -- Check for score changes
    detectScoreChanges(frame_idx)

    -- Check for events
    detectEvents(frame_idx)
end

--[[
Detect accolade popups (achievements/highlights).
]]
function detectAccolades(frame_idx)
    -- Read text from accolade region
    local accolade_text = read_text(REGIONS.accolade)

    -- Check if text contains accolade indicators
    if accolade_text ~= "" then
        -- Check for "FUTURE" indicator
        if check_future(accolade_text) then
            -- Check cooldown to avoid duplicates
            if (frame_idx - last_accolade_frame) >= accolade_cooldown then
                -- Extract details
                local details = read_text_detailed(REGIONS.accolade)

                log_event("accolade_detected", {
                    text = accolade_text,
                    confidence = details.confidence,
                    region = REGIONS.accolade,
                    full_text = details.text
                })

                last_accolade_frame = frame_idx
                debug("Accolade detected: " .. accolade_text)
            end
        end
    end

    -- Also check for gold/yellow color (typical accolade indicator)
    local gold_regions = detect_color(COLORS.gold)
    if #gold_regions > 0 then
        debug("Gold regions detected: " .. #gold_regions)
        for i, region in ipairs(gold_regions) do
            if region.area > 500 then  -- Minimum size filter
                -- Try to read text in this region
                local text = read_text(region)
                if text ~= "" then
                    log_event("gold_highlight", {
                        text = text,
                        region = region,
                        size = region.area
                    })
                end
            end
        end
    end
end

--[[
Detect score changes.
]]
function detectScoreChanges(frame_idx)
    local score_text = read_text(REGIONS.score)

    if score_text ~= "" then
        -- Try to extract numeric score
        local number = tonumber(score_text:match("%d+"))
        if number then
            debug("Score: " .. number)
        end
    end
end

--[[
Detect other game events.
]]
function detectEvents(frame_idx)
    -- Check for mission text
    local mission_text = read_text(REGIONS.mission)
    if mission_text ~= "" then
        debug("Mission: " .. mission_text)
    end

    -- Detect any red regions (damage, alerts)
    local red_regions = detect_color(COLORS.red)
    if #red_regions > 0 then
        -- Could indicate damage or alert
        debug("Red regions detected: " .. #red_regions)
    end
end

--[[
Utility: Format timestamp.
]]
function formatTime(timestamp_ms)
    local seconds = math.floor(timestamp_ms / 1000)
    local minutes = math.floor(seconds / 60)
    local remainder = seconds % 60
    return string.format("%02d:%02d", minutes, remainder)
end

--[[
Utility: Check if string contains substring.
]]
function stringContains(str, substring)
    return string.find(str, substring, 1, true) ~= nil
end

--[[
Utility: Split string by delimiter.
]]
function stringSplit(inputstr, sep)
    if sep == nil then
        sep = "%s"
    end
    local t = {}
    for str in string.gmatch(inputstr, "([^" .. sep .. "]+)") do
        table.insert(t, str)
    end
    return t
end

-- Export main function
return analyzeFrame
