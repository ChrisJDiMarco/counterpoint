'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('counterpointStorage', Object.freeze({
  load: () => ipcRenderer.invoke('counterpoint:load'),
  save: (json) => ipcRenderer.invoke('counterpoint:save', json),
  clear: () => ipcRenderer.invoke('counterpoint:clear')
}));
