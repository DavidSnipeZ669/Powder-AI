import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import winston from 'winston';

interface PythonCommand {
  command: string;
  args: Record<string, any>;
  request_id: string;
}

interface PythonResponse {
  type: 'response' | 'event';
  request_id?: string;
  result?: Record<string, any>;
  error?: string | null;
  name?: string;
  data?: Record<string, any>;
}

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

export class PythonBridge extends EventEmitter {
  private pythonProcess: ChildProcess | null = null;
  private isReady = false;
  private commandTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly COMMAND_TIMEOUT = 30000; // 30 seconds

  async startPythonEngine(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const pythonPath = process.env.PYTHON_EXECUTABLE || 'python3';
        const enginePath = path.join(__dirname, '..', 'python', 'engine.py');

        logger.info('Starting Python engine', { pythonPath, enginePath });

        this.pythonProcess = spawn(pythonPath, [enginePath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
          },
        });

        if (!this.pythonProcess.stdout || !this.pythonProcess.stderr) {
          throw new Error('Failed to create Python subprocess streams');
        }

        // Setup event listeners
        this.pythonProcess.on('error', (error) => {
          logger.error('Python process error', { error: error.message });
          this.emit('error', error);
          reject(error);
        });

        this.pythonProcess.on('exit', (code, signal) => {
          logger.warn('Python process exited', { code, signal });
          this.isReady = false;
          this.emit('exit', { code, signal });
        });

        // Handle stdout (responses and events from Python)
        let buffer = '';
        this.pythonProcess.stdout.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');

          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const message: PythonResponse = JSON.parse(line);
                this.handlePythonMessage(message);
              } catch (error) {
                logger.error('Failed to parse Python message', {
                  line,
                  error: (error as Error).message,
                });
                this.emit('error', {
                  type: 'parse-error',
                  raw: line,
                });
              }
            }
          }
        });

        // Handle stderr (errors from Python)
        this.pythonProcess.stderr.on('data', (data) => {
          logger.error('Python stderr', { output: data.toString() });
        });

        // Give Python engine time to initialize
        const readyTimeout = setTimeout(() => {
          this.isReady = true;
          logger.info('Python engine ready');
          resolve();
        }, 2000);

        // Cleanup timeout on early exit
        this.pythonProcess.on('exit', () => {
          clearTimeout(readyTimeout);
        });
      } catch (error) {
        logger.error('Failed to start Python engine', {
          error: (error as Error).message,
        });
        reject(error);
      }
    });
  }

  private handlePythonMessage(message: PythonResponse): void {
    if (message.type === 'response' && message.request_id) {
      // Clear timeout for this request
      const timeout = this.commandTimeouts.get(message.request_id);
      if (timeout) {
        clearTimeout(timeout);
        this.commandTimeouts.delete(message.request_id);
      }
      // Emit as command response
      this.emit(`response:${message.request_id}`, message);
    } else if (message.type === 'event') {
      // Broadcast event
      this.emit('event', message);
    }
  }

  async sendCommand(command: string, args: Record<string, any> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.pythonProcess || !this.isReady) {
        reject(new Error('Python engine not ready'));
        return;
      }

      const request_id = `${command}-${Date.now()}-${Math.random()}`;
      const pythonCommand: PythonCommand = {
        command,
        args,
        request_id,
      };

      // Setup response listener
      const responseHandler = (response: PythonResponse) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result);
        }
      };

      this.once(`response:${request_id}`, responseHandler);

      // Setup timeout
      const timeout = setTimeout(() => {
        this.removeListener(`response:${request_id}`, responseHandler);
        this.commandTimeouts.delete(request_id);
        reject(new Error(`Command timeout: ${command}`));
      }, this.COMMAND_TIMEOUT);

      this.commandTimeouts.set(request_id, timeout);

      try {
        const payload = JSON.stringify(pythonCommand);
        if (this.pythonProcess.stdin) {
          this.pythonProcess.stdin.write(payload + '\n');
          logger.debug('Sent command to Python', { command, request_id });
        }
      } catch (error) {
        clearTimeout(timeout);
        this.commandTimeouts.delete(request_id);
        this.removeListener(`response:${request_id}`, responseHandler);
        reject(error);
      }
    });
  }

  async stopPythonEngine(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.pythonProcess) {
        resolve();
        return;
      }

      // Clear all pending timeouts
      this.commandTimeouts.forEach((timeout) => clearTimeout(timeout));
      this.commandTimeouts.clear();

      const killTimeout = setTimeout(() => {
        logger.warn('Force killing Python process');
        this.pythonProcess?.kill('SIGKILL');
        resolve();
      }, 5000);

      this.pythonProcess.on('exit', () => {
        clearTimeout(killTimeout);
        this.pythonProcess = null;
        this.isReady = false;
        resolve();
      });

      this.pythonProcess.kill('SIGTERM');
    });
  }

  isEngineReady(): boolean {
    return this.isReady && this.pythonProcess !== null;
  }

  getEngineStatus(): {
    ready: boolean;
    pid?: number;
  } {
    return {
      ready: this.isReady,
      pid: this.pythonProcess?.pid,
    };
  }
}

// Export singleton instance
export const pythonBridge = new PythonBridge();
