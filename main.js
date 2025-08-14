const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const STORE_PATH = path.join(app.getPath('userData'), 'storage.json');



let mainWindow;

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
        mainWindow.loadFile(path.join(__dirname, 'views/webview.html'));
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
                    // If the user clicked "确定"
                    // console.log(result);
                    if (result.response === 0) {
                        if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
                        mainWindow.loadFile(path.join(__dirname, 'views/url_input.html'));
                    } else {
                        return;
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




app.whenReady().then(async () => { // Make the callback async
    createWindow();
    // Dynamically import electron-store
    const { default: Store } = await import('electron-store');
    const store = new Store();

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



    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });


    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
});

