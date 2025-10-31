--[[
Battlefield Game Analysis Script
Detects kills, headshots, vehicle destructions, and other events.
Uses injected Python functions for OCR and image analysis.
]]

-- Regions of interest for different game elements
local REGIONS = {
    kill_notification = { x = 1600, y = 50, w = 300, h = 100 },    -- Kill feed
    headshot_indicator = { x = 1700, y = 150, w = 100, h = 50 },   -- Headshot icon
    vehicle_ui = { x = 50, y = 600, w = 300, h = 200 },            -- Vehicle indicator
    ammo_counter = { x = 100, y = 1000, w = 200, h = 80 },         -- Ammo display
    minimap = { x = 1700, y = 900, w = 200, h = 200 },             -- Minimap
}

-- Color ranges for detection (BGR format)
local COLORS = {
    red_kill = {
        lower = { 0, 0, 200 },
        upper = { 50, 50, 255 }
    },
    yellow_event = {
        lower = { 0, 200, 255 },
        upper = { 100, 255, 255 }
    },
    vehicle_color = {
        lower = { 100, 100, 50 },
        upper = { 200, 200, 150 }
    },
}

-- Track detection state
local last_kill_frame = -100
local kill_cooldown = 15
local last_headshot_frame = -100
local headshot_cooldown = 20
local last_vehicle_frame = -100
local vehicle_cooldown = 60

--[[
Main frame analysis function.
Called once per video frame by the GameAnalyzer.
]]
function analyzeFrame()
    local frame_info = get_frame_info()
    local frame_idx = frame_info.frame_idx

    -- Detect kill events
    detectKills(frame_idx)

    -- Detect headshots
    detectHeadshots(frame_idx)

    -- Detect vehicle events
    detectVehicleEvents(frame_idx)

    -- Detect objectives/combat
    detectCombatEvents(frame_idx)
end

--[[
Detect kill notifications in kill feed.
]]
function detectKills(frame_idx)
    -- Check for red color in kill notification region
    local red_regions = detect_color(COLORS.red_kill)

    if #red_regions > 0 then
        -- Check cooldown to avoid duplicates
        if (frame_idx - last_kill_frame) >= kill_cooldown then
            -- Try to read kill text
            local kill_text = read_text(REGIONS.kill_notification)

            if kill_text ~= "" then
                -- Analyze the kill text
                local killer = extractKiller(kill_text)
                local victim = extractVictim(kill_text)
                local weapon = extractWeapon(kill_text)

                log_event("kill_detected", {
                    text = kill_text,
                    killer = killer,
                    victim = victim,
                    weapon = weapon,
                    frame = frame_idx
                })

                last_kill_frame = frame_idx
                debug("Kill detected: " .. kill_text)
            end
        end
    end
end

--[[
Detect headshot indicators and events.
]]
function detectHeadshots(frame_idx)
    -- Look for yellow indicator (typical Battlefield headshot color)
    local yellow_regions = detect_color(COLORS.yellow_event)

    if #yellow_regions > 0 then
        -- Check cooldown
        if (frame_idx - last_headshot_frame) >= headshot_cooldown then
            -- Check if it's in the headshot indicator region
            for i, region in ipairs(yellow_regions) do
                if isInRegion(region, REGIONS.headshot_indicator) then
                    log_event("headshot_detected", {
                        frame = frame_idx,
                        region = region,
                        confidence = 0.95
                    })

                    last_headshot_frame = frame_idx
                    debug("Headshot detected at frame " .. frame_idx)
                    break
                end
            end
        end
    end
end

--[[
Detect vehicle-related events.
]]
function detectVehicleEvents(frame_idx)
    -- Detect vehicle color in UI
    local vehicle_regions = detect_color(COLORS.vehicle_color)

    if #vehicle_regions > 0 then
        if (frame_idx - last_vehicle_frame) >= vehicle_cooldown then
            -- Check if vehicle UI is visible
            for i, region in ipairs(vehicle_regions) do
                if region.area > 1000 then
                    -- Read vehicle name
                    local vehicle_text = read_text_detailed(region)

                    if vehicle_text.text ~= "" and vehicle_text.confidence > 0.8 then
                        log_event("vehicle_event", {
                            vehicle = vehicle_text.text,
                            confidence = vehicle_text.confidence,
                            frame = frame_idx
                        })

                        last_vehicle_frame = frame_idx
                        debug("Vehicle event: " .. vehicle_text.text)
                    end
                end
            end
        end
    end
end

--[[
Detect general combat events.
]]
function detectCombatEvents(frame_idx)
    -- Check ammo counter for weapon changes
    local ammo_text = read_text(REGIONS.ammo_counter)
    if ammo_text ~= "" then
        local ammo_count = tonumber(ammo_text:match("%d+"))
        if ammo_count and ammo_count == 0 then
            debug("Ammo depleted - possible weapon change")
        end
    end

    -- Check minimap for activity
    local minimap_details = read_text_detailed(REGIONS.minimap)
    if minimap_details.confidence > 0.7 and minimap_details.text ~= "" then
        -- Minimap has text - could indicate objective or capture
        log_event("minimap_activity", {
            text = minimap_details.text,
            confidence = minimap_details.confidence,
            frame = frame_idx
        })
    end
end

--[[
Utility: Extract killer name from kill text.
Expected format: "Killer killed Victim with Weapon"
]]
function extractKiller(text)
    -- Simple extraction - get text before "killed"
    local pattern = "(.+) killed"
    return text:match(pattern) or "Unknown"
end

--[[
Utility: Extract victim name from kill text.
]]
function extractVictim(text)
    -- Extract text between "killed" and "with"
    local pattern = "killed (.+) with"
    return text:match(pattern) or "Unknown"
end

--[[
Utility: Extract weapon name from kill text.
]]
function extractWeapon(text)
    -- Extract text after "with"
    local pattern = "with (.+)"
    return text:match(pattern) or "Unknown Weapon"
end

--[[
Utility: Check if region is within target region.
]]
function isInRegion(region, target)
    local rx1, ry1, rx2, ry2 = region.x, region.y, region.x + region.w, region.y + region.h
    local tx1, ty1, tx2, ty2 = target.x, target.y, target.x + target.w, target.y + target.h

    return rx1 >= tx1 and ry1 >= ty1 and rx2 <= tx2 and ry2 <= ty2
end

--[[
Utility: Format frame info for logging.
]]
function formatFrameInfo(frame_info)
    local seconds = math.floor(frame_info.timestamp_ms / 1000)
    local minutes = math.floor(seconds / 60)
    local secs = seconds % 60
    return string.format("%02d:%02d (%d)", minutes, secs, frame_info.frame_idx)
end

-- Export main function
return analyzeFrame
