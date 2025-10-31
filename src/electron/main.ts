import { app, BrowserWindow, Menu, dialog } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import winston from 'winston';
import { pythonBridge } from './python-bridge';
import { registerCommandHandlers } from './ipc/commands';
import { setupEventHandlers } from './ipc/events';
import { initializeDatabase, setDatabase } from '../db/schema';

// Setup logging
const logDir = path.join(os.homedir(), '.powder-ai', 'logs');
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `[${timestamp}] [${level.toUpperCase()}] ${message} ${
        Object.keys(meta).length > 0 ? JSON.stringify(meta) : ''
      }`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.File({
      filename: path.join(logDir, `main-${new Date().toISOString().split('T')[0]}.log`),
    }),
  ],
});

let mainWindow: BrowserWindow | null = null;

/**
 * Create the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    // In development, load from dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from bundled files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  logger.info('Main window created', {
    isDev,
    dimensions: {
      width: 1200,
      height: 800,
    },
  });
}

/**
 * Setup application menu
 */
function setupMenu(): void {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Powder-AI',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About Powder-AI',
              message: 'Powder-AI v0.1.0',
              detail:
                'A cross-platform desktop application for media processing and AI model inference.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Initialize application data directories
 */
async function initializeDataDirectories(): Promise<void> {
  const appDataDir = path.join(os.homedir(), '.powder-ai');
  const subdirs = ['logs', 'cache', 'temp'];

  for (const subdir of subdirs) {
    const dirPath = path.join(appDataDir, subdir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info('Created directory', { path: dirPath });
    }
  }
}

/**
 * Main app ready handler
 */
async function onAppReady(): Promise<void> {
  logger.info('Application starting', {
    version: app.getVersion(),
    platform: process.platform,
    nodeVersion: process.version,
  });

  try {
    // Initialize data directories
    await initializeDataDirectories();
    logger.info('Data directories initialized');

    // Initialize database
    const db = await initializeDatabase();
    setDatabase(db);
    logger.info('Database initialized');

    // Start Python engine
    logger.info('Starting Python engine...');
    await pythonBridge.startPythonEngine();
    logger.info('Python engine started successfully');

    // Create main window
    createWindow();

    if (!mainWindow) {
      throw new Error('Failed to create main window');
    }

    // Register IPC command handlers
    registerCommandHandlers();
    logger.info('IPC command handlers registered');

    // Setup event handlers
    setupEventHandlers(mainWindow);
    logger.info('Event handlers setup');

    // Setup application menu
    setupMenu();

    logger.info('Application ready');
  } catch (error) {
    logger.error('Failed to initialize application', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    dialog.showErrorBox(
      'Initialization Error',
      `Failed to start Powder-AI: ${(error as Error).message}`
    );

    app.quit();
  }
}

/**
 * App lifecycle handlers
 */
app.on('ready', onAppReady);

app.on('window-all-closed', () => {
  // On macOS, applications stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Cleanup on app quit
 */
app.on('before-quit', async () => {
  logger.info('Application quitting');
  try {
    await pythonBridge.stopPythonEngine();
    logger.info('Python engine stopped');
  } catch (error) {
    logger.error('Error stopping Python engine', {
      error: (error as Error).message,
    });
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    message: error.message,
    stack: error.stack,
  });
});
