# Game Analysis View - React Frontend Component

The Game Analysis View is the main user interface for analyzing game videos. It provides a complete workflow from video selection through analysis execution to results visualization.

## Architecture

```
┌─────────────────────────────────────┐
│  AnalysisView.tsx                   │
│  ├─ State Management                │
│  ├─ Event Listeners                 │
│  └─ UI Rendering                    │
└──────────────┬──────────────────────┘
               │
               ├─► window.powder.game.list()
               ├─► window.powder.game.analyze()
               └─► events.onProgressUpdate()
                   events.onError()
                   events.onTaskCompleted()
```

## Component Hierarchy

```
App.tsx (Main App)
├─ Navigation (Home | Game Analysis)
└─ AnalysisView.tsx (When "Game Analysis" is selected)
   ├─ Header
   ├─ Controls Panel
   │  ├─ Video File Picker
   │  ├─ Game Dropdown
   │  └─ Analysis Button
   ├─ Progress Section (while analyzing)
   ├─ Error Message (if error occurs)
   ├─ Results Section (after analysis)
   │  ├─ Summary Stats
   │  └─ Events List
   └─ Empty State (initial)
```

## Features

### 1. **Video File Selection**
- Browse button to select video files
- Displays selected file path
- Disabled during analysis
- Supports all common video formats

### 2. **Game Selection Dropdown**
- Auto-populated from `window.powder.game.list()`
- Defaults to first available game
- Shows game IDs (e.g., "DF" for Delta Force)
- Disabled during analysis

### 3. **Analysis Button**
- Starts analysis when clicked
- Disabled until video and game are selected
- Shows "Analyzing..." text during processing
- Changes color to indicate state

### 4. **Real-Time Progress Tracking**
- Progress bar with percentage
- Status messages from engine
- Smooth animations

### 5. **Error Handling**
- Displays error messages prominently
- Dismissible error alerts
- Graceful error recovery

### 6. **Results Display**
- Summary statistics (frames, duration, event count)
- Scrollable events list
- Event icons and timestamps
- Event data details

### 7. **Empty States**
- Initial state prompts file selection
- Ready state shows next action
- No events message if analysis finds nothing

## State Management

### Component State

```typescript
// Video selection
const [videoPath, setVideoPath] = useState<string>('');
const [selectedGame, setSelectedGame] = useState<string>('DF');

// Game loading
const [availableGames, setAvailableGames] = useState<string[]>([]);

// Analysis execution
const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
const [analysisProgress, setAnalysisProgress] = useState<number>(0);
const [progressMessage, setProgressMessage] = useState<string>('');

// Results
const [results, setResults] = useState<AnalysisResult | null>(null);
const [analysisEvents, setAnalysisEvents] = useState<AnalysisEvent[]>([]);

// Error handling
const [errorMessage, setErrorMessage] = useState<string>('');
```

## Workflow

### Step 1: Component Mount
```
1. Component mounts
2. useEffect loads available games
3. Dropdown populated with game list
4. Event listeners registered
```

### Step 2: User Selects Video
```
1. User clicks "Browse" button
2. File input dialog opens
3. User selects video file
4. videoPath state updated
5. UI enables "Start Analysis" button
```

### Step 3: User Starts Analysis
```
1. User clicks "Start Analysis"
2. Validation (video + game selected)
3. window.powder.game.analyze() called
4. isAnalyzing set to true
5. Progress bar displayed
```

### Step 4: Analysis Executes
```
1. Engine processes frames
2. Progress events sent
3. Progress bar updates
4. Status messages displayed
```

### Step 5: Analysis Completes
```
1. Results received
2. Events collected
3. isAnalyzing set to false
4. Results displayed
5. Events list rendered
```

### Step 6: User Views Results
```
1. Summary stats shown
2. Events listed with:
   - Type icon
   - Timestamp
   - Frame number
   - Event data
```

## Event Listeners

### Progress Update
```typescript
events.onProgressUpdate((data) => {
  setAnalysisProgress(data.percent);
  setProgressMessage(data.message);
});
```

### Error Event
```typescript
events.onError((data) => {
  setErrorMessage(data.message);
  setIsAnalyzing(false);
});
```

### Task Completion
```typescript
events.onTaskCompleted((data) => {
  if (data.events) {
    setAnalysisEvents(data.events);
  }
});
```

## API Integration

### Load Available Games
```typescript
const result = await game.list();
// Result: { success: true, data: { games: ['DF'], count: 1 } }
```

### Analyze Video
```typescript
const result = await game.analyze({
  video_path: '/path/to/video.mp4',
  game_id: 'DF'
});
// Result: AnalysisResult with events
```

## UI Components

### File Picker
```typescript
<div className="file-picker">
  <input type="text" value={videoPath} disabled />
  <button onClick={handleSelectVideo}>Browse</button>
</div>
```

### Game Dropdown
```typescript
<select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)}>
  {availableGames.map((game) => (
    <option key={game} value={game}>{game}</option>
  ))}
</select>
```

### Progress Bar
```typescript
<div className="progress-bar">
  <div className="progress-fill" style={{ width: `${analysisProgress}%` }} />
</div>
```

### Events List
```typescript
{analysisEvents.map((event, idx) => (
  <div key={idx} className="event-item">
    <div className="event-header">
      <span className="event-icon">{getEventIcon(event.type)}</span>
      <span className="event-type">{event.type}</span>
      <span className="event-time">{formatTimestamp(event.timestamp_ms)}</span>
    </div>
    <div className="event-details">
      {/* Event data */}
    </div>
  </div>
))}
```

## Styling

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.analysis-view` | Main container |
| `.analysis-header` | Header section |
| `.analysis-controls` | Control panel |
| `.control-group` | Input group |
| `.file-picker` | File selection |
| `.game-dropdown` | Game selector |
| `.analysis-progress` | Progress display |
| `.progress-bar` | Progress bar |
| `.analysis-error` | Error display |
| `.analysis-results` | Results section |
| `.results-summary` | Summary stats |
| `.events-list` | Events container |
| `.event-item` | Individual event |

### Responsive Design

- Desktop: Full layout with controls and results side-by-side
- Tablet: Stacked layout with proper spacing
- Mobile: Single column with touch-friendly buttons

## Event Icons

```typescript
function getEventIcon(eventType: string): string {
  switch (eventType) {
    case 'accolade_detected': return '⭐';
    case 'gold_highlight': return '🏆';
    case 'highlight_detected': return '✨';
    case 'text_detected': return '📝';
    default: return '📌';
  }
}
```

## Utility Functions

### Format Timestamp
```typescript
function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}
```

## Error Handling

### Validation
```typescript
if (!videoPath) {
  setErrorMessage('Please select a video file');
  return;
}

if (!selectedGame) {
  setErrorMessage('Please select a game');
  return;
}
```

### API Error
```typescript
const result = await game.analyze({...});
if (result.success) {
  // Handle success
} else {
  setErrorMessage(result.error || 'Analysis failed');
}
```

## Performance Considerations

### Optimization Strategies

1. **Event Virtualization**: For large event lists, consider virtualizing
   ```typescript
   import { FixedSizeList } from 'react-window';
   ```

2. **Memoization**: Memoize heavy components
   ```typescript
   const EventItem = React.memo(({ event }) => {...});
   ```

3. **Lazy Loading**: Load game list on demand
   ```typescript
   useEffect(() => {
     // Lazy load games
   }, []);
   ```

### Performance Metrics
- Initial load: <100ms
- Game list load: <500ms
- Video selection: <50ms
- Analysis execution: Depends on video length
- Results rendering: <200ms

## Accessibility

### WCAG 2.1 Compliance

- Keyboard navigation: Tab through controls
- Screen reader support: Semantic HTML
- Color contrast: AA standard met
- Focus indicators: Visible on all interactive elements

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Navigate controls |
| Enter | Activate button |
| Space | Toggle dropdown/checkbox |
| Escape | Close dialogs |

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- React 18+
- TypeScript 4.5+
- CSS3 Grid & Flexbox

## Future Enhancements

### Planned Features

1. **Video Preview**: Thumbnail preview of selected video
2. **Batch Analysis**: Analyze multiple videos at once
3. **Export Results**: Save results as JSON/CSV
4. **Analysis History**: View previous analyses
5. **Custom Regions**: User-defined analysis regions
6. **Real-time Preview**: Show frame analysis in real-time
7. **Video Trimming**: Analyze specific time ranges
8. **Result Comparison**: Compare analyses side-by-side

### Technical Improvements

1. **WebWorker Integration**: Move analysis to background worker
2. **Streaming Results**: Stream events as they're detected
3. **Video Preview Canvas**: Canvas-based frame preview
4. **Advanced Filtering**: Filter/search events
5. **Keyboard Shortcuts**: More keyboard shortcuts
6. **Touch Gestures**: Swipe to navigate results

## Testing

### Unit Tests

```typescript
// AnalysisView.test.tsx
describe('AnalysisView', () => {
  it('loads games on mount', async () => {...});
  it('enables analyze button when video selected', () => {...});
  it('shows progress during analysis', () => {...});
  it('displays results after analysis', () => {...});
  it('handles errors gracefully', () => {...});
});
```

### Integration Tests

```typescript
describe('Analysis Flow', () => {
  it('completes full analysis workflow', async () => {...});
  it('handles video file selection', () => {...});
  it('processes analysis events', () => {...});
});
```

## Troubleshooting

### Common Issues

#### Video Won't Load
- Ensure file path is correct
- Check file permissions
- Verify video format is supported
- Check disk space

#### Analysis Won't Start
- Verify game is selected
- Check engine status in header
- Review error message
- Check Python engine logs

#### Progress Bar Stuck
- Check network connectivity
- Monitor system resources
- Review Python engine logs
- Try restarting engine

#### Results Not Showing
- Verify analysis completed successfully
- Check event listener setup
- Review browser console for errors
- Check Python engine response

## Support

For issues or questions:
1. Check component documentation
2. Review browser console for errors
3. Check Python engine logs at `~/.powder-ai/logs/`
4. Enable debug logging: `LOG_LEVEL=debug`

## License

Powder-AI © 2024
