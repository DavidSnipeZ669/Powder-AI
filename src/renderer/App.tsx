import React, { useState, useEffect } from 'react';
import { useIPC } from './hooks/useIPC';
import { AnalysisView } from './components/AnalysisView';
import './styles/App.css';

type ViewType = 'home' | 'analysis';

export const App: React.FC = () => {
  const { process, engine, events } = useIPC();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [engineStatus, setEngineStatus] = useState<string>('unknown');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  // Initialize app and setup event listeners
  useEffect(() => {
    // Check engine status on startup
    checkEngineStatus();

    // Setup event listeners
    const unsubscribeProgress = events.onProgressUpdate((data) => {
      setProcessingProgress(data.percent || 0);
    });

    const unsubscribeError = events.onError((data) => {
      setErrorMessage(data.message || 'An error occurred');
    });

    const unsubscribeEngineCrash = events.onEngineCrashed((data) => {
      setEngineStatus('crashed');
      setErrorMessage(data.message || 'Engine crashed');
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeProgress();
      unsubscribeError();
      unsubscribeEngineCrash();
    };
  }, []);

  const checkEngineStatus = async () => {
    try {
      const result = await engine.status();
      if (result.success) {
        setEngineStatus(result.data.ready ? 'ready' : 'offline');
      }
    } catch (error) {
      setEngineStatus('error');
      setErrorMessage((error as Error).message);
    }
  };

  const handleStartProcess = async () => {
    try {
      setErrorMessage('');
      setProcessingProgress(0);

      // Example: start a process with sample args
      const result = await process.start({
        input: 'sample.mp4',
        model: 'yolov8',
      });

      if (result.success) {
        console.log('Process started:', result.data);
      }
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleRestartEngine = async () => {
    try {
      setErrorMessage('');
      await engine.restart();
      setEngineStatus('ready');
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Powder-AI</h1>
        <nav className="app-nav">
          <button
            className={`nav-button ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentView('home')}
          >
            Home
          </button>
          <button
            className={`nav-button ${currentView === 'analysis' ? 'active' : ''}`}
            onClick={() => setCurrentView('analysis')}
          >
            Game Analysis
          </button>
        </nav>
        <div className="status-indicator">
          <span
            className={`status-badge status-${engineStatus}`}
          >
            Engine: {engineStatus.charAt(0).toUpperCase() + engineStatus.slice(1)}
          </span>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'analysis' && <AnalysisView />}
        {currentView === 'home' && (
        <section className="controls">
          <h2>Processing Controls</h2>

          <div className="button-group">
            <button
              onClick={handleStartProcess}
              disabled={engineStatus !== 'ready'}
              className="btn btn-primary"
            >
              Start Processing
            </button>

            {engineStatus === 'crashed' && (
              <button
                onClick={handleRestartEngine}
                className="btn btn-warning"
              >
                Restart Engine
              </button>
            )}
          </div>

          {processingProgress > 0 && processingProgress < 100 && (
            <div className="progress-section">
              <label>Progress: {processingProgress}%</label>
              <progress value={processingProgress} max={100} />
            </div>
          )}
        </section>

        {errorMessage && (
          <section className="error-section">
            <h3>Error</h3>
            <p>{errorMessage}</p>
            <button
              onClick={() => setErrorMessage('')}
              className="btn btn-secondary"
            >
              Dismiss
            </button>
          </section>
        )}

        <section className="info-section">
          <h2>Application Information</h2>
          <ul>
            <li>Version: 0.1.0</li>
            <li>Platform: {typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'}</li>
            <li>Status: Engine {engineStatus}</li>
          </ul>
        </section>
      </main>

      <footer className="app-footer">
        <p>&copy; 2024 Powder-AI. All rights reserved.</p>
      </footer>
    </div>
  );
};
