const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveURL: (url) => ipcRenderer.send('save-url', url),
    getURL: () => ipcRenderer.invoke('get-url'),
    openExternal: (link) => ipcRenderer.send('open-external', link)
});
