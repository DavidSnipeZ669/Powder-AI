import React, { useState, useEffect } from 'react';
import { useIPC } from '../hooks/useIPC';
import '../styles/AnalysisView.css';

interface AnalysisEvent {
  type: string;
  frame: number;
  timestamp_ms: number;
  data: Record<string, any>;
}

interface AnalysisResult {
  success: boolean;
  game_id?: string;
  video_path?: string;
  frames_processed?: number;
  fps?: number;
  duration_ms?: number;
  events_found?: number;
  events?: AnalysisEvent[];
  error?: string;
}

interface GameListResult {
  success: boolean;
  data?: {
    games: string[];
    count: number;
  };
  error?: string;
}

export const AnalysisView: React.FC = () => {
  const { game, events } = useIPC();

  // State for UI
  const [videoPath, setVideoPath] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<string>('DF');
  const [availableGames, setAvailableGames] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [analysisEvents, setAnalysisEvents] = useState<AnalysisEvent[]>([]);

  // Load available games on mount
  useEffect(() => {
    loadAvailableGames();
  }, []);

  // Setup event listeners
  useEffect(() => {
    const unsubscribeProgress = events.onProgressUpdate((data) => {
      setAnalysisProgress(data.percent || 0);
      if (data.message) {
        setProgressMessage(data.message);
      }
    });

    const unsubscribeError = events.onError((data) => {
      setErrorMessage(data.message || 'An error occurred');
      setIsAnalyzing(false);
    });

    const unsubscribeTaskComplete = events.onTaskCompleted((data) => {
      if (data.events) {
        setAnalysisEvents(data.events);
      }
    });

    return () => {
      unsubscribeProgress();
      unsubscribeError();
      unsubscribeTaskComplete();
    };
  }, [events]);

  const loadAvailableGames = async () => {
    try {
      const result = (await game.list()) as GameListResult;
      if (result.success && result.data) {
        setAvailableGames(result.data.games);
        if (result.data.games.length > 0) {
          setSelectedGame(result.data.games[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load games:', error);
      setErrorMessage('Failed to load available games');
    }
  };

  const handleSelectVideo = async () => {
    try {
      // Use Electron's dialog API
      const { ipcRenderer } = window as any;

      // We'll need to add a new IPC handler for file selection
      // For now, use a simple approach with HTML file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          setVideoPath(file.path || file.name);
          setErrorMessage('');
        }
      };
      input.click();
    } catch (error) {
      console.error('Failed to select video:', error);
      setErrorMessage('Failed to select video file');
    }
  };

  const handleStartAnalysis = async () => {
    // Validation
    if (!videoPath) {
      setErrorMessage('Please select a video file');
      return;
    }

    if (!selectedGame) {
      setErrorMessage('Please select a game');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage('');
      setAnalysisProgress(0);
      setProgressMessage('Initializing analysis...');
      setResults(null);
      setAnalysisEvents([]);

      // Call game analysis API
      const result = (await game.analyze({
        video_path: videoPath,
        game_id: selectedGame,
      })) as AnalysisResult;

      if (result.success) {
        setResults(result);
        setAnalysisProgress(100);
        setProgressMessage('Analysis complete!');
        if (result.events) {
          setAnalysisEvents(result.events);
        }
      } else {
        setErrorMessage(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setErrorMessage((error as Error).message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTimestamp = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  };

  const getEventIcon = (eventType: string): string => {
    switch (eventType) {
      case 'accolade_detected':
        return '⭐';
      case 'gold_highlight':
        return '🏆';
      case 'highlight_detected':
        return '✨';
      case 'text_detected':
        return '📝';
      default:
        return '📌';
    }
  };

  return (
    <div className="analysis-view">
      <div className="analysis-container">
        {/* Header */}
        <header className="analysis-header">
          <h2>🎮 Game Video Analysis</h2>
          <p>Analyze game videos to detect highlights and events</p>
        </header>

        {/* Control Panel */}
        <section className="analysis-controls">
          <div className="control-group">
            <label className="control-label">Video File</label>
            <div className="file-picker">
              <input
                type="text"
                className="file-input"
                placeholder="Select a video file..."
                value={videoPath}
                disabled
              />
              <button
                className="btn btn-primary"
                onClick={handleSelectVideo}
                disabled={isAnalyzing}
              >
                Browse
              </button>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Game</label>
            <select
              className="game-dropdown"
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              disabled={isAnalyzing || availableGames.length === 0}
            >
              {availableGames.map((game) => (
                <option key={game} value={game}>
                  {game}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <button
              className="btn btn-analyze"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || !videoPath || !selectedGame}
            >
              {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
            </button>
          </div>
        </section>

        {/* Progress Section */}
        {isAnalyzing && (
          <section className="analysis-progress">
            <div className="progress-info">
              <div className="progress-message">
                {progressMessage || 'Processing frames...'}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <div className="progress-percent">
                {Math.round(analysisProgress)}%
              </div>
            </div>
          </section>
        )}

        {/* Error Message */}
        {errorMessage && (
          <section className="analysis-error">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{errorMessage}</div>
            <button
              className="btn btn-secondary"
              onClick={() => setErrorMessage('')}
            >
              Dismiss
            </button>
          </section>
        )}

        {/* Results Section */}
        {results && results.success && (
          <section className="analysis-results">
            <div className="results-header">
              <h3>✅ Analysis Complete</h3>
            </div>

            <div className="results-summary">
              <div className="summary-item">
                <span className="summary-label">Game:</span>
                <span className="summary-value">{results.game_id}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Frames:</span>
                <span className="summary-value">
                  {results.frames_processed?.toLocaleString()}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Duration:</span>
                <span className="summary-value">
                  {formatTimestamp(results.duration_ms || 0)}
                </span>
              </div>
              <div className="summary-item highlight">
                <span className="summary-label">Events Found:</span>
                <span className="summary-value">{results.events_found}</span>
              </div>
            </div>

            {/* Events List */}
            {analysisEvents.length > 0 ? (
              <div className="events-list">
                <h4>Detected Events ({analysisEvents.length})</h4>
                <div className="events-container">
                  {analysisEvents.map((event, idx) => (
                    <div key={idx} className="event-item">
                      <div className="event-header">
                        <span className="event-icon">
                          {getEventIcon(event.type)}
                        </span>
                        <span className="event-type">{event.type}</span>
                        <span className="event-time">
                          {formatTimestamp(event.timestamp_ms)}
                        </span>
                      </div>
                      <div className="event-details">
                        <div className="detail-row">
                          <span className="detail-label">Frame:</span>
                          <span className="detail-value">{event.frame}</span>
                        </div>
                        {event.data && Object.keys(event.data).length > 0 && (
                          <div className="detail-row">
                            <span className="detail-label">Data:</span>
                            <span className="detail-value">
                              {JSON.stringify(event.data)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-events">
                <p>No events were detected in the video.</p>
              </div>
            )}
          </section>
        )}

        {/* Empty State */}
        {!isAnalyzing && !results && videoPath && (
          <section className="analysis-ready">
            <div className="ready-icon">🎯</div>
            <p>Ready to analyze! Click "Start Analysis" to begin.</p>
          </section>
        )}

        {!isAnalyzing && !results && !videoPath && (
          <section className="analysis-empty">
            <div className="empty-icon">📹</div>
            <p>Select a video file to get started</p>
          </section>
        )}
      </div>
    </div>
  );
};
