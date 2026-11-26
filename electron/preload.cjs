const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chunkAPI', {
  getChunks: () => ipcRenderer.invoke('data:chunks'),
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (state) => ipcRenderer.invoke('state:save', state),
  saveStateSync: (state) => ipcRenderer.sendSync('state:save-sync', state),
  exportState: () => ipcRenderer.invoke('state:export'),
  importState: () => ipcRenderer.invoke('state:import'),
  resetState: () => ipcRenderer.invoke('state:reset'),
  openDataFolder: () => ipcRenderer.invoke('shell:open-data-folder'),
  focusWindow: () => ipcRenderer.invoke('app:focus'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  transcribeGermanAudio: (audio) => ipcRenderer.invoke('whisper:transcribe', audio),
  cancelTranscription: () => ipcRenderer.invoke('whisper:cancel'),
  getWhisperStatus: () => ipcRenderer.invoke('whisper:status'),
  downloadWhisperModel: (modelKey) => ipcRenderer.invoke('whisper:download', modelKey),
  cancelWhisperDownload: () => ipcRenderer.invoke('whisper:cancel-download'),
  deleteWhisperModel: (modelKey) => ipcRenderer.invoke('whisper:delete-model', modelKey),
  onWhisperProgress: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('whisper:download-progress', handler);
    return () => ipcRenderer.removeListener('whisper:download-progress', handler);
  },
  onWhisperComplete: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('whisper:download-complete', handler);
    return () => ipcRenderer.removeListener('whisper:download-complete', handler);
  },
});
