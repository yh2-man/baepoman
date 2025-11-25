const { contextBridge, ipcRenderer } = require('electron');

// Expose a controlled API to the renderer process using IPC.
// This is more secure and robust than requiring modules directly in the preload script.
contextBridge.exposeInMainWorld('electron', {
  store: {
    get(key) {
      return ipcRenderer.invoke('electron-store-get', key);
    },
    set(key, value) {
      return ipcRenderer.invoke('electron-store-set', key, value);
    },
    delete(key) {
      return ipcRenderer.invoke('electron-store-delete', key);
    },
  },
  // Taskbar Badge
  setUnreadBadge: (count, dataUrl) => ipcRenderer.send('set-unread-badge', { count, dataUrl }),
});
