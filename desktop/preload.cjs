const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('oetDesktop', {
  info: () => ipcRenderer.invoke('desktop:info'),
  createProfile: name => ipcRenderer.invoke('desktop:create-profile', name),
  switchProfile: id => ipcRenderer.invoke('desktop:switch-profile', id),
  renameProfile: name => ipcRenderer.invoke('desktop:rename-profile', name),
  backup: data => ipcRenderer.invoke('desktop:backup', data),
  restore: () => ipcRenderer.invoke('desktop:restore'),
  aiStatus: () => ipcRenderer.invoke('desktop:ai-status'),
  checkUpdates: () => ipcRenderer.invoke('desktop:check-updates'),
  onUpdateStatus: callback => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('desktop:update-status', listener);
    return () => ipcRenderer.removeListener('desktop:update-status', listener);
  },
});
