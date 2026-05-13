const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const STORE_PATH = path.join(app.getPath('userData'), 'storage.json');

let mainWindow;
let store; // 提升到模块级，供菜单回调使用

function createWindow(startURL) {
    mainWindow = new BrowserWindow({
        width: 375,
        height: 812,
        resizable: false,
        maximizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true
        }
    });
    // mainWindow.webContents.openDevTools(); // Uncomment this line to open DevTools for debugging

    if (startURL) {
        // 直接携带 URL 参数加载 webview 页面，无需用户重新选择
        mainWindow.loadFile(path.join(__dirname, 'views/webview.html'), {
            query: { url: startURL }
        });
    } else {
        mainWindow.loadFile(path.join(__dirname, 'views/url_input.html'));
    }

    const menu = Menu.buildFromTemplate([
        {
            label: '更改服务器',
            click: () => {
                dialog.showMessageBox(mainWindow, {
                    type: 'question',
                    buttons: ['确定', '取消'],
                    defaultId: 1,
                    title: '确认',
                    message: '确定要更改服务器吗？'
                }).then(result => {
                    if (result.response === 0) {
                        // 清除最近使用的 URL，下次启动回到输入页
                        if (store) store.delete('lastUrl');
                        if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
                        mainWindow.loadFile(path.join(__dirname, 'views/url_input.html'));
                    }
                });
            }
        },
        {
            label: '关于',
            click: () => {
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: '关于',
                    message: '关于此应用',
                    detail: `
    时光捕手APP
    版本: ${app.getVersion()}
    作者: Duke Yin
    网站: https://keepmins.com
                    `,
                    buttons: ['确定']
                });
            }
        },
        {
            label: '退出',
            click: () => {
                dialog.showMessageBox(mainWindow, {
                    type: 'question',
                    buttons: ['确定', '取消'],
                    defaultId: 1,
                    title: '确认',
                    message: '确定要退出吗？'
                }).then(result => {
                    if (result.response === 0) {
                        app.quit();
                    }
                });
            }
        }
    ]);
    Menu.setApplicationMenu(menu);
}




app.whenReady().then(async () => {
    // 先初始化 store，再决定启动页面
    const { default: Store } = await import('electron-store');
    store = new Store();

    // 读取上次成功打开的 URL，有则直接跳过输入页
    const lastUrl = store.get('lastUrl') || null;
    createWindow(lastUrl);

    ipcMain.handle('get-urls', async () => {
        return store.get('savedUrls') || [];
    });

    ipcMain.on('save-url', (event, url) => {
        let urls = store.get('savedUrls') || [];
        if (!Array.isArray(urls)) {
            urls = [];
        }
        if (!urls.includes(url)) { // Prevent duplicates
            urls.unshift(url);
            urls = urls.slice(0, 3); // Limit to 3 URLs
            store.set('savedUrls', urls);
        }
    });

    // 保存最近一次成功打开的 URL
    ipcMain.on('save-last-url', (event, url) => {
        store.set('lastUrl', url);
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            const lastUrl = store.get('lastUrl') || null;
            createWindow(lastUrl);
        }
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
});