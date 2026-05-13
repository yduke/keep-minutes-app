const { app, BrowserWindow, Menu, ipcMain, shell, dialog, safeStorage } = require('electron');
const path = require('path');
const fs   = require('fs');

const STORE_PATH = path.join(app.getPath('userData'), 'storage.json');

let mainWindow;
let store;

/* ══════════════════════════════════════════════════════════════
   窗口创建
══════════════════════════════════════════════════════════════ */
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
            webviewTag: true          // 允许使用 <webview>
        }
    });
    // mainWindow.webContents.openDevTools();

    if (startURL) {
        mainWindow.loadFile(path.join(__dirname, 'views/webview.html'), {
            query: { url: startURL }
        });
    } else {
        mainWindow.loadFile(path.join(__dirname, 'views/url_input.html'));
    }

    buildMenu();
}

/* ══════════════════════════════════════════════════════════════
   应用菜单
══════════════════════════════════════════════════════════════ */
function buildMenu() {
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
                        if (store) store.delete('lastUrl');
                        if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
                        mainWindow.loadFile(path.join(__dirname, 'views/url_input.html'));
                    }
                });
            }
        },
        {
            label: '身份',
            click: () => showCredentialManager()
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
                    if (result.response === 0) app.quit();
                });
            }
        }
    ]);
    Menu.setApplicationMenu(menu);
}

/* ══════════════════════════════════════════════════════════════
   凭据管理器（简易对话框）
══════════════════════════════════════════════════════════════ */
function showCredentialManager() {
    const creds = store.get('credentials') || {};
    const origins = Object.keys(creds);

    if (origins.length === 0) {
        return dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '已保存的密码',
            message: '暂无已保存的密码',
            buttons: ['确定']
        });
    }

    const detail = origins.map((o, i) => `${i + 1}. ${o}  (用户名: ${creds[o].username})`).join('\n');

    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '已保存的密码',
        message: `共 ${origins.length} 条记录`,
        detail,
        buttons: ['关闭', '清除全部密码'],
        defaultId: 0,
        cancelId: 0
    }).then(result => {
        if (result.response === 1) {
            store.delete('credentials');
            dialog.showMessageBox(mainWindow, {
                type: 'info', title: '完成',
                message: '已清除全部保存的密码', buttons: ['确定']
            });
        }
    });
}

/* ══════════════════════════════════════════════════════════════
   凭据加密/解密工具函数
══════════════════════════════════════════════════════════════ */
function encryptPassword(plaintext) {
    if (safeStorage.isEncryptionAvailable()) {
        return { encrypted: true, data: safeStorage.encryptString(plaintext).toString('base64') };
    }
    // 加密不可用时（少数 Linux 环境）降级明文存储并给出警告
    console.warn('[KeepMinutes] safeStorage 不可用，密码将以明文存储');
    return { encrypted: false, data: plaintext };
}

function decryptPassword(stored) {
    if (stored.encrypted) {
        return safeStorage.decryptString(Buffer.from(stored.data, 'base64'));
    }
    return stored.data;
}

/* ══════════════════════════════════════════════════════════════
   应用启动
══════════════════════════════════════════════════════════════ */
app.whenReady().then(async () => {
    const { default: Store } = await import('electron-store');
    store = new Store();

    const lastUrl = store.get('lastUrl') || null;
    createWindow(lastUrl);

    /* ── URL 相关 IPC（原有） ─────────────────────────────── */
    ipcMain.handle('get-urls', async () => store.get('savedUrls') || []);

    ipcMain.on('save-url', (_event, url) => {
        let urls = store.get('savedUrls') || [];
        if (!Array.isArray(urls)) urls = [];
        if (!urls.includes(url)) {
            urls.unshift(url);
            urls = urls.slice(0, 3);
            store.set('savedUrls', urls);
        }
    });

    ipcMain.on('save-last-url', (_event, url) => {
        store.set('lastUrl', url);
    });

    ipcMain.handle('get-last-url', () => store.get('lastUrl') || null);

    /* ── 凭据相关 IPC（新增） ────────────────────────────── */

    // 保存凭据（密码用 safeStorage 加密）
    ipcMain.handle('save-credentials', (_event, { origin, username, password }) => {
        try {
            const creds = store.get('credentials') || {};
            creds[origin] = {
                username,
                password: encryptPassword(password)
            };
            store.set('credentials', creds);
            return { success: true };
        } catch (err) {
            console.error('[KeepMinutes] 保存凭据失败:', err);
            return { success: false, error: err.message };
        }
    });

    // 读取凭据（解密后返回）
    ipcMain.handle('get-credentials', (_event, origin) => {
        try {
            const creds = store.get('credentials') || {};
            const entry = creds[origin];
            if (!entry) return null;
            return {
                username: entry.username,
                password: decryptPassword(entry.password)
            };
        } catch (err) {
            console.error('[KeepMinutes] 读取凭据失败:', err);
            return null;
        }
    });

    // 删除单条凭据
    ipcMain.handle('delete-credentials', (_event, origin) => {
        const creds = store.get('credentials') || {};
        delete creds[origin];
        store.set('credentials', creds);
        return { success: true };
    });

    /* ── 工具 IPC ─────────────────────────────────────────── */

    // 返回 webview_preload.js 的绝对路径
    ipcMain.handle('get-webview-preload-path', () => {
        return path.join(__dirname, 'views', 'webview_preload.js');
    });

    /* ── macOS 生命周期 ───────────────────────────────────── */
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            const lastUrl = store.get('lastUrl') || null;
            createWindow(lastUrl);
        }
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });
});