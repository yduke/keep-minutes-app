const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const STORE_PATH = path.join(app.getPath('userData'), 'storage.json');

function loadURLFromStore() {
    if (fs.existsSync(STORE_PATH)) {
        try {
            const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
            return data.url || null;
        } catch {
            return null;
        }
    }
    return null;
}

function saveURLToStore(url) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ url }));
}

let mainWindow;

function createWindow(startURL) {
    mainWindow = new BrowserWindow({
        width: 375,
        height: 812,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true
        }
    });

    if (startURL) {
        mainWindow.loadFile(path.join(__dirname, 'views/webview.html'));
    } else {
        mainWindow.loadFile(path.join(__dirname, 'views/url_input.html'));
    }

    const menu = Menu.buildFromTemplate([
        {
            label: '更改服务器',
            click: () => {
                if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
                mainWindow.loadFile(path.join(__dirname, 'views/url_input.html'));
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
        { role: 'quit', label: '退出' }
    ]);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    createWindow(loadURLFromStore());
});

ipcMain.on('save-url', (event, url) => {
    saveURLToStore(url);
    mainWindow.loadFile(path.join(__dirname, 'views/webview.html'));
});

ipcMain.handle('get-url', () => {
    return loadURLFromStore();
});

ipcMain.on('open-external', (event, link) => {
    shell.openExternal(link);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
