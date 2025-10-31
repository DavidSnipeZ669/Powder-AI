import { BrowserWindow } from 'electron';
import { pythonBridge } from '../python-bridge';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Define available IPC event channels
export const IPC_EVENTS = {
  PROGRESS_UPDATE: 'progress:update',
  STATUS_CHANGED: 'status:changed',
  ERROR_OCCURRED: 'error:occurred',
  ENGINE_CRASHED: 'error:engine-crashed',
  PARSE_ERROR: 'error:parse-error',
  MODEL_LOADED: 'model:loaded',
  TASK_COMPLETED: 'task:completed',
} as const;

/**
 * Setup event listeners for Python engine output
 * These events are broadcast from Python via pythonBridge
 * and forwarded to the UI (renderer process) via mainWindow.webContents.send()
 */
export function setupEventHandlers(mainWindow: BrowserWindow): void {
  // Listen for events from Python bridge
  pythonBridge.on('event', (message: any) => {
    const { name, data } = message;

    logger.debug('Python event received', {
      name,
      data,
    });

    // Map Python event names to IPC event channels
    let ipcChannel = '';

    switch (name) {
      case 'progress':
        ipcChannel = IPC_EVENTS.PROGRESS_UPDATE;
        break;
      case 'status':
        ipcChannel = IPC_EVENTS.STATUS_CHANGED;
        break;
      case 'error':
        ipcChannel = IPC_EVENTS.ERROR_OCCURRED;
        break;
      case 'model_loaded':
        ipcChannel = IPC_EVENTS.MODEL_LOADED;
        break;
      case 'task_completed':
        ipcChannel = IPC_EVENTS.TASK_COMPLETED;
        break;
      default:
        logger.warn('Unknown event name from Python', { name });
        return;
    }

    // Broadcast event to UI
    mainWindow.webContents.send(ipcChannel, data);
  });

  // Listen for engine errors
  pythonBridge.on('error', (error: any) => {
    logger.error('Python bridge error', {
      type: error.type || 'unknown',
      message: error.message || String(error),
    });

    if (error.type === 'parse-error') {
      mainWindow.webContents.send(IPC_EVENTS.PARSE_ERROR, {
        message: 'Failed to parse response from engine',
        raw: error.raw,
      });
    } else {
      mainWindow.webContents.send(IPC_EVENTS.ERROR_OCCURRED, {
        message: error.message || String(error),
      });
    }
  });

  // Listen for engine exit
  pythonBridge.on('exit', (exitInfo: any) => {
    logger.warn('Python engine exited unexpectedly', exitInfo);

    mainWindow.webContents.send(IPC_EVENTS.ENGINE_CRASHED, {
      code: exitInfo.code,
      signal: exitInfo.signal,
      message: 'Python engine crashed. Click restart to recover.',
    });
  });
}

/**
 * Broadcast an event to the UI without waiting for Python
 * Useful for app-level events (startup, shutdown, etc)
 */
export function broadcastEvent(
  mainWindow: BrowserWindow,
  channel: string,
  data: any
): void {
  logger.debug('Broadcasting event to UI', { channel, data });
  mainWindow.webContents.send(channel, data);
}
