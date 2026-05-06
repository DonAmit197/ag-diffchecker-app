// preload.js
// Runs in a privileged context between main and renderer.
// Keep this minimal — only expose what the renderer truly needs.
const { contextBridge } = require('electron');

// Expose app version to the renderer if needed
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
});
