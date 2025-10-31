import { ipcMain, IpcMainInvokeEvent } from 'electron';
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

// Define available IPC commands
export const IPC_COMMANDS = {
  PROCESS_START: 'process:start',
  PROCESS_CANCEL: 'process:cancel',
  MODEL_LOAD: 'model:load',
  MODEL_LIST: 'model:list',
  ENGINE_STATUS: 'engine:status',
  ENGINE_RESTART: 'engine:restart',
} as const;

/**
 * Register all IPC command handlers
 * These handlers receive commands from the UI (via ipcRenderer.invoke)
 * and forward them to the Python engine via python-bridge
 */
export function registerCommandHandlers(): void {
  // Process: Start a new processing task
  ipcMain.handle(
    IPC_COMMANDS.PROCESS_START,
    async (event: IpcMainInvokeEvent, args: Record<string, any>) => {
      try {
        logger.info('IPC command received', {
          command: IPC_COMMANDS.PROCESS_START,
          args,
        });

        const result = await pythonBridge.sendCommand('process:start', args);
        return { success: true, data: result };
      } catch (error) {
        logger.error('IPC command error', {
          command: IPC_COMMANDS.PROCESS_START,
          error: (error as Error).message,
        });
        throw error;
      }
    }
  );

  // Process: Cancel a running task
  ipcMain.handle(
    IPC_COMMANDS.PROCESS_CANCEL,
    async (event: IpcMainInvokeEvent, args: Record<string, any>) => {
      try {
        logger.info('IPC command received', {
          command: IPC_COMMANDS.PROCESS_CANCEL,
          args,
        });

        const result = await pythonBridge.sendCommand('process:cancel', args);
        return { success: true, data: result };
      } catch (error) {
        logger.error('IPC command error', {
          command: IPC_COMMANDS.PROCESS_CANCEL,
          error: (error as Error).message,
        });
        throw error;
      }
    }
  );

  // Model: Load a specific model
  ipcMain.handle(
    IPC_COMMANDS.MODEL_LOAD,
    async (event: IpcMainInvokeEvent, args: Record<string, any>) => {
      try {
        logger.info('IPC command received', {
          command: IPC_COMMANDS.MODEL_LOAD,
          args,
        });

        const result = await pythonBridge.sendCommand('model:load', args);
        return { success: true, data: result };
      } catch (error) {
        logger.error('IPC command error', {
          command: IPC_COMMANDS.MODEL_LOAD,
          error: (error as Error).message,
        });
        throw error;
      }
    }
  );

  // Model: List available models
  ipcMain.handle(
    IPC_COMMANDS.MODEL_LIST,
    async (event: IpcMainInvokeEvent) => {
      try {
        logger.info('IPC command received', {
          command: IPC_COMMANDS.MODEL_LIST,
        });

        const result = await pythonBridge.sendCommand('model:list', {});
        return { success: true, data: result };
      } catch (error) {
        logger.error('IPC command error', {
          command: IPC_COMMANDS.MODEL_LIST,
          error: (error as Error).message,
        });
        throw error;
      }
    }
  );

  // Engine: Get current engine status
  ipcMain.handle(
    IPC_COMMANDS.ENGINE_STATUS,
    async (event: IpcMainInvokeEvent) => {
      logger.info('IPC command received', {
        command: IPC_COMMANDS.ENGINE_STATUS,
      });

      const status = pythonBridge.getEngineStatus();
      return {
        success: true,
        data: {
          ready: status.ready,
          pid: status.pid,
        },
      };
    }
  );

  // Engine: Restart the Python engine
  ipcMain.handle(
    IPC_COMMANDS.ENGINE_RESTART,
    async (event: IpcMainInvokeEvent) => {
      try {
        logger.info('IPC command received', {
          command: IPC_COMMANDS.ENGINE_RESTART,
        });

        await pythonBridge.stopPythonEngine();
        await pythonBridge.startPythonEngine();

        return { success: true, data: { message: 'Engine restarted' } };
      } catch (error) {
        logger.error('IPC command error', {
          command: IPC_COMMANDS.ENGINE_RESTART,
          error: (error as Error).message,
        });
        throw error;
      }
    }
  );
}
