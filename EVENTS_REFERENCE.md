# Events Reference Guide

This document defines the standard event format and provides examples for different games.

## Event Structure

All events follow this JSON format:

```json
{
  "type": "event_name",
  "frame": 150,
  "timestamp_ms": 5000,
  "data": {
    "custom_field_1": "value",
    "custom_field_2": 42
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Event identifier (e.g., "kill_detected", "headshot") |
| `frame` | number | Frame number in video |
| `timestamp_ms` | number | Time in milliseconds from video start |
| `data` | object | Custom event-specific data |

---

## Standard Events

### Combat Events

#### Kill Detected
```json
{
  "type": "kill_detected",
  "frame": 150,
  "timestamp_ms": 5000,
  "data": {
    "killer": "PlayerName",
    "victim": "EnemyName",
    "weapon": "Rifle",
    "distance": 45,
    "headshot": false
  }
}
```

#### Headshot
```json
{
  "type": "headshot",
  "frame": 175,
  "timestamp_ms": 5833,
  "data": {
    "killer": "PlayerName",
    "victim": "EnemyName",
    "weapon": "Sniper",
    "distance": 150,
    "confidence": 0.95
  }
}
```

#### Death Event
```json
{
  "type": "death",
  "frame": 200,
  "timestamp_ms": 6667,
  "data": {
    "player": "PlayerName",
    "killer": "EnemyName",
    "cause": "Rifle",
    "location": "Warehouse"
  }
}
```

### Objective Events

#### Objective Captured
```json
{
  "type": "objective_captured",
  "frame": 300,
  "timestamp_ms": 10000,
  "data": {
    "objective": "Bomb Site A",
    "team": "Terrorists",
    "players": ["Player1", "Player2"],
    "contested": false
  }
}
```

#### Objective Defended
```json
{
  "type": "objective_defended",
  "frame": 350,
  "timestamp_ms": 11667,
  "data": {
    "objective": "Flag",
    "team": "Defenders",
    "attackers_killed": 3
  }
}
```

### Achievement Events

#### Medal/Achievement Unlocked
```json
{
  "type": "achievement_unlocked",
  "frame": 400,
  "timestamp_ms": 13333,
  "data": {
    "name": "Ace",
    "description": "5 kills without dying",
    "points": 500,
    "rarity": "rare"
  }
}
```

#### Kill Streak
```json
{
  "type": "killstreak_achieved",
  "frame": 420,
  "timestamp_ms": 14000,
  "data": {
    "streak": 5,
    "tier_name": "Killing Spree",
    "bonus_points": 250
  }
}
```

### Vehicle Events

#### Vehicle Event
```json
{
  "type": "vehicle_event",
  "frame": 500,
  "timestamp_ms": 16667,
  "data": {
    "vehicle": "Tank",
    "action": "entered",
    "player": "PlayerName"
  }
}
```

#### Vehicle Destruction
```json
{
  "type": "vehicle_destroyed",
  "frame": 550,
  "timestamp_ms": 18333,
  "data": {
    "vehicle": "Helicopter",
    "killer": "PlayerName",
    "method": "Missile",
    "occupants": 4
  }
}
```

### UI Events

#### Score Change
```json
{
  "type": "score_changed",
  "frame": 600,
  "timestamp_ms": 20000,
  "data": {
    "player": "PlayerName",
    "old_score": 1000,
    "new_score": 1500,
    "change": 500,
    "reason": "Kill"
  }
}
```

#### Loadout Change
```json
{
  "type": "loadout_changed",
  "frame": 650,
  "timestamp_ms": 21667,
  "data": {
    "player": "PlayerName",
    "old_loadout": "Rifle + Pistol",
    "new_loadout": "Shotgun + SMG",
    "location": "Loadout Screen"
  }
}
```

---

## Game-Specific Events

### Delta Force (DF)

#### Future Medal
```json
{
  "type": "future_medal",
  "frame": 100,
  "timestamp_ms": 3333,
  "data": {
    "medal_name": "FUTURE KILL",
    "text": "FUTURE KILL",
    "confidence": 0.98
  }
}
```

#### Accolade Popup
```json
{
  "type": "accolade_detected",
  "frame": 120,
  "timestamp_ms": 4000,
  "data": {
    "accolade": "Elite Kill",
    "description": "Killed with precision",
    "points": 150
  }
}
```

### Battlefield (BF)

#### Kill Feed Event
```json
{
  "type": "kill_detected",
  "frame": 150,
  "timestamp_ms": 5000,
  "data": {
    "text": "Player1 killed Player2 with M16",
    "killer": "Player1",
    "victim": "Player2",
    "weapon": "M16"
  }
}
```

#### Headshot Indicator
```json
{
  "type": "headshot_detected",
  "frame": 160,
  "timestamp_ms": 5333,
  "data": {
    "frame": 160,
    "region": {
      "x": 1700,
      "y": 150,
      "w": 100,
      "h": 50
    },
    "confidence": 0.95
  }
}
```

#### Minimap Activity
```json
{
  "type": "minimap_activity",
  "frame": 200,
  "timestamp_ms": 6667,
  "data": {
    "text": "Squad member engaged",
    "confidence": 0.87,
    "activity_type": "combat"
  }
}
```

---

## Event Categories

### By Priority

**Critical Events** (highest priority)
- Kill detected
- Death
- Objective captured
- Achievement unlocked

**Important Events** (medium priority)
- Headshot
- Vehicle destroyed
- Killstreak achieved
- Score change

**Info Events** (low priority)
- Minimap activity
- Loadout change
- UI interaction
- Frame analysis

### By Type

**Combat Events**
- kill_detected
- headshot
- death
- killstreak_achieved

**Objective Events**
- objective_captured
- objective_defended
- objective_completed

**Achievement Events**
- achievement_unlocked
- medal_earned
- rank_up

**Vehicle Events**
- vehicle_event
- vehicle_destroyed
- vehicle_captured

**UI Events**
- score_changed
- loadout_changed
- ui_interaction

---

## Event Confidence

All events should include optional confidence scores:

```json
{
  "type": "kill_detected",
  "timestamp_ms": 5000,
  "data": {
    "text": "Player1 killed Player2",
    "confidence": 0.95,  // 0.0-1.0 scale
    "ocr_confidence": 0.92,
    "detection_method": "text_ocr"
  }
}
```

**Confidence Levels:**
- `0.95+` - Very high confidence
- `0.85-0.95` - High confidence
- `0.75-0.85` - Medium confidence
- `0.65-0.75` - Low confidence
- `<0.65` - Very low (usually filtered)

---

## Event Timing

### Frame-based Timing

Frame numbers are 0-indexed from video start:
- Frame 0 = First frame
- Frame 150 = 150th frame in video

### Timestamp Calculation

```
timestamp_ms = frame_number / fps * 1000

Example (30 fps):
Frame 150: 150 / 30 * 1000 = 5000 ms (5 seconds)
```

---

## Creating Custom Events

### Define Your Event Type

```json
{
  "type": "custom_event_name",
  "frame": 0,
  "timestamp_ms": 0,
  "data": {
    "field1": "value",
    "field2": 123
  }
}
```

### Guidelines

1. **Unique Type Name**: Use snake_case
2. **Include Timestamp**: Always include frame + timestamp_ms
3. **Structured Data**: Keep data object flat and simple
4. **Add Confidence**: Include confidence for OCR-based detections
5. **Document Fields**: Explain what each field means

### Example Custom Event

```lua
-- In postprocess.lua
log_event("special_ability_used", {
  ability = "Time Slow",
  cooldown_ms = 30000,
  effect_duration = 5000,
  targets_affected = 3,
  confidence = 0.88
})
```

---

## Event Filtering

### Recommended Filters

```typescript
// Filter by confidence
const highConfidence = events.filter(e =>
  (e.data.confidence || 1.0) >= 0.85
);

// Filter by type
const kills = events.filter(e =>
  e.type === 'kill_detected'
);

// Filter by timeframe
const firstMinute = events.filter(e =>
  e.timestamp_ms < 60000
);

// Filter by player
const playerEvents = events.filter(e =>
  e.data.player === 'PlayerName'
);
```

---

## Event Statistics

### Summary Statistics

```typescript
{
  total_events: 42,
  events_by_type: {
    "kill_detected": 25,
    "headshot": 5,
    "achievement_unlocked": 3,
    "score_changed": 9
  },
  events_by_confidence: {
    "high": 38,    // >= 0.85
    "medium": 3,   // 0.70-0.84
    "low": 1       // < 0.70
  },
  timeline: {
    "0-60s": 12,
    "60-120s": 18,
    "120-180s": 8,
    "180+s": 4
  }
}
```

---

## Event Export

### JSON Export
```json
{
  "analysis": {
    "game_id": "DF",
    "video_path": "/path/to/video.mp4",
    "duration_ms": 180000,
    "total_events": 42
  },
  "events": [...]
}
```

### CSV Export
```csv
timestamp_ms,type,frame,player,details
5000,kill_detected,150,Player1,"killed Player2 with Rifle"
5500,headshot,165,Player1,"confirmed headshot"
10000,achievement_unlocked,300,Player1,"Ace medal"
```

---

## Real-World Examples

### 30-Second Kill Sequence

```json
[
  {
    "type": "kill_detected",
    "frame": 450,
    "timestamp_ms": 15000,
    "data": {
      "killer": "Player1",
      "victim": "Enemy1",
      "weapon": "Rifle"
    }
  },
  {
    "type": "headshot",
    "frame": 480,
    "timestamp_ms": 16000,
    "data": {
      "killer": "Player1",
      "victim": "Enemy2"
    }
  },
  {
    "type": "killstreak_achieved",
    "frame": 500,
    "timestamp_ms": 16667,
    "data": {
      "streak": 3,
      "tier_name": "Killing Spree"
    }
  },
  {
    "type": "achievement_unlocked",
    "frame": 520,
    "timestamp_ms": 17333,
    "data": {
      "name": "Ace",
      "points": 500
    }
  }
]
```

---

## Performance Metrics

### Event Detection Rate

Expected events per minute:
- **High Action**: 20-30 events/min
- **Medium Action**: 10-20 events/min
- **Low Action**: 5-10 events/min

### Accuracy Metrics

- **Kill Detection**: 90-95% accuracy
- **Headshot Detection**: 85-90% accuracy
- **Objective Detection**: 80-90% accuracy
- **Achievement Detection**: 95%+ accuracy

---

## Documentation

When documenting events for a game:

```markdown
## Events Detected

| Event Type | Example | Accuracy |
|------------|---------|----------|
| kill_detected | Player1 killed Player2 | 92% |
| headshot | Headshot indicator | 87% |
| achievement | Medal popup | 98% |

### Kill Detection
- **Region**: Kill feed at (1600, 50)
- **Method**: OCR text extraction
- **Fields**: killer, victim, weapon
- **Confidence**: 0.92
```

---

For more information, see:
- [Game Analyzer Documentation](src/python/processors/GAME_ANALYZER_README.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Analysis View Guide](src/renderer/components/ANALYSIS_VIEW_README.md)
