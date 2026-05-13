const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveURL: (url) => ipcRenderer.send('save-url', url),
    getURLs: () => ipcRenderer.invoke('get-urls'),
    saveLastURL: (url) => ipcRenderer.send('save-last-url', url),
    getLastURL:  ()    => ipcRenderer.invoke('get-last-url'),
    // openExternal: (link) => ipcRenderer.send('open-external', link)
});