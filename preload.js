const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveURL: (url) => ipcRenderer.send('save-url', url),
    getURLs: () => ipcRenderer.invoke('get-urls'),
    // openExternal: (link) => ipcRenderer.send('open-external', link)
});