const { contextBridge, ipcRenderer } = require('electron');

const ALLOWED_SEND = [
  'open-mini-player',
  'close-mini-player',
  'mini-player-command',
  'mini-player-ready',
  'main-state-update',
];

const ALLOWED_RECEIVE = [
  'mini-player-state',
  'mini-player-command',
];

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    if (ALLOWED_SEND.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  on: (channel, callback) => {
    if (ALLOWED_RECEIVE.includes(channel)) {
      const handler = (_event, ...args) => callback(...args);
      ipcRenderer.on(channel, handler);
      return handler;
    }
    return null;
  },
  off: (channel, handler) => {
    if (ALLOWED_RECEIVE.includes(channel) && handler) {
      ipcRenderer.removeListener(channel, handler);
    }
  },
});
