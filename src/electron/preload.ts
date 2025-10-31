import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

/**
 * Preload script - exposed safe APIs to renderer process
 * This script runs in the renderer process before any other scripts
 * It establishes a secure bridge for IPC communication
 */

interface ProcessAPI {
  start: (args: Record<string, any>) => Promise<any>;
  cancel: (args: Record<string, any>) => Promise<any>;
}

interface ModelAPI {
  load: (args: Record<string, any>) => Promise<any>;
  list: () => Promise<any>;
}

interface EngineAPI {
  status: () => Promise<any>;
  restart: () => Promise<any>;
}

interface ScriptAPI {
  execute: (args: Record<string, any>) => Promise<any>;
  eval: (args: Record<string, any>) => Promise<any>;
  call: (args: Record<string, any>) => Promise<any>;
}

interface GameAPI {
  analyze: (args: Record<string, any>) => Promise<any>;
  list: () => Promise<any>;
}

interface EventAPI {
  onProgressUpdate: (
    callback: (data: any) => void
  ) => () => void;
  onStatusChanged: (
    callback: (data: any) => void
  ) => () => void;
  onError: (
    callback: (data: any) => void
  ) => () => void;
  onEngineCrashed: (
    callback: (data: any) => void
  ) => () => void;
  onModelLoaded: (
    callback: (data: any) => void
  ) => () => void;
  onTaskCompleted: (
    callback: (data: any) => void
  ) => () => void;
}

interface PowderAPI {
  process: ProcessAPI;
  model: ModelAPI;
  engine: EngineAPI;
  script: ScriptAPI;
  game: GameAPI;
  events: EventAPI;
}

// Create the API object to expose to renderer
const api: PowderAPI = {
  process: {
    start: (args) => ipcRenderer.invoke('process:start', args),
    cancel: (args) => ipcRenderer.invoke('process:cancel', args),
  },
  model: {
    load: (args) => ipcRenderer.invoke('model:load', args),
    list: () => ipcRenderer.invoke('model:list'),
  },
  engine: {
    status: () => ipcRenderer.invoke('engine:status'),
    restart: () => ipcRenderer.invoke('engine:restart'),
  },
  script: {
    execute: (args) => ipcRenderer.invoke('script:execute', args),
    eval: (args) => ipcRenderer.invoke('script:eval', args),
    call: (args) => ipcRenderer.invoke('script:call', args),
  },
  events: {
    onProgressUpdate: (callback) => {
      const listener = (_event: IpcRendererEvent, data: any) => {
        callback(data);
      };
      ipcRenderer.on('progress:update', listener);
      // Return unsubscribe function
      return () => {
        ipcRenderer.removeListener('progress:update', listener);
      };
    },
    onStatusChanged: (callback) => {
      const listener = (_event: IpcRendererEvent, data: any) => {
        callback(data);
      };
      ipcRenderer.on('status:changed', listener);
      return () => {
        ipcRenderer.removeListener('status:changed', listener);
      };
    },
    onError: (callback) => {
      const listener = (_event: IpcRendererEvent, data: any) => {
        callback(data);
      };
      ipcRenderer.on('error:occurred', listener);
      return () => {
        ipcRenderer.removeListener('error:occurred', listener);
      };
    },
    onEngineCrashed: (callback) => {
      const listener = (_event: IpcRendererEvent, data: any) => {
        callback(data);
      };
      ipcRenderer.on('error:engine-crashed', listener);
      return () => {
        ipcRenderer.removeListener('error:engine-crashed', listener);
      };
    },
    onModelLoaded: (callback) => {
      const listener = (_event: IpcRendererEvent, data: any) => {
        callback(data);
      };
      ipcRenderer.on('model:loaded', listener);
      return () => {
        ipcRenderer.removeListener('model:loaded', listener);
      };
    },
    onTaskCompleted: (callback) => {
      const listener = (_event: IpcRendererEvent, data: any) => {
        callback(data);
      };
      ipcRenderer.on('task:completed', listener);
      return () => {
        ipcRenderer.removeListener('task:completed', listener);
      };
    },
  },
};

// Expose API to renderer process
contextBridge.exposeInMainWorld('powder', api);

// Type declaration for TypeScript in renderer
declare global {
  interface Window {
    powder: PowderAPI;
  }
}
