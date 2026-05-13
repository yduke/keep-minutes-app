const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ── URL 管理（原有） ──────────────────────────────────────
    saveURL:        (url)  => ipcRenderer.send('save-url', url),
    getURLs:        ()     => ipcRenderer.invoke('get-urls'),
    saveLastURL:    (url)  => ipcRenderer.send('save-last-url', url),
    getLastURL:     ()     => ipcRenderer.invoke('get-last-url'),

    // ── 凭据管理（新增） ──────────────────────────────────────
    /** 保存凭据：{ origin, username, password } */
    saveCredentials:   (creds) => ipcRenderer.invoke('save-credentials', creds),
    /** 获取凭据：传入 origin 字符串，返回 { username, password } 或 null */
    getCredentials:    (origin) => ipcRenderer.invoke('get-credentials', origin),
    /** 删除凭据：传入 origin 字符串 */
    deleteCredentials: (origin) => ipcRenderer.invoke('delete-credentials', origin),

    // ── 工具 ──────────────────────────────────────────────────
    /** 获取 webview_preload.js 的绝对路径，供 webview 的 preload 属性使用 */
    getWebviewPreloadPath: () => ipcRenderer.invoke('get-webview-preload-path'),
});