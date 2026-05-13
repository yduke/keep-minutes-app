/**
 * webview_preload.js
 * 注入到 webview 内部的预加载脚本
 * 职责：① 检测登录表单提交  ② 接收并自动填充凭据
 */
const { ipcRenderer } = require('electron');

/* ── 自动填充 ────────────────────────────────────────────────── */
ipcRenderer.on('autofill-credentials', (_event, { username, password }) => {
    const tryFill = () => {
        const pwFields = document.querySelectorAll('input[type="password"]');
        pwFields.forEach(pwField => {
            const form = pwField.closest('form');
            if (!form) return;

            // 常见用户名字段选择器（兼容 WordPress / 自定义站点）
            const userField = form.querySelector([
                'input[type="email"]',
                'input[name*="user"]',
                'input[name*="email"]',
                'input[name*="login"]',
                'input[id*="user"]',
                'input[id*="email"]',
                'input[type="text"]'
            ].join(','));

            if (!userField) return;

            // 用原生 setter 触发 React / Vue 的双向绑定
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            ).set;

            nativeSetter.call(userField, username);
            userField.dispatchEvent(new Event('input', { bubbles: true }));
            userField.dispatchEvent(new Event('change', { bubbles: true }));

            nativeSetter.call(pwField, password);
            pwField.dispatchEvent(new Event('input', { bubbles: true }));
            pwField.dispatchEvent(new Event('change', { bubbles: true }));
        });
    };

    // 页面可能还在加载，稍作等待再重试
    if (document.readyState === 'complete') {
        tryFill();
    } else {
        window.addEventListener('load', tryFill, { once: true });
    }
    // 兜底：500ms 后再尝试一次（应对 SPA 动态渲染）
    setTimeout(tryFill, 500);
});

/* ── 表单提交检测 ─────────────────────────────────────────────── */
document.addEventListener('submit', event => {
    const form = event.target;
    const pwField = form.querySelector('input[type="password"]');
    if (!pwField || !pwField.value) return;

    const userField = form.querySelector([
        'input[type="email"]',
        'input[name*="user"]',
        'input[name*="email"]',
        'input[name*="login"]',
        'input[id*="user"]',
        'input[id*="email"]',
        'input[type="text"]'
    ].join(','));

    if (!userField || !userField.value) return;

    // 发送给宿主页面 (webview.html)
    ipcRenderer.sendToHost('credentials-detected', {
        username: userField.value,
        password: pwField.value,
        origin:   window.location.origin
    });
}, true /* capture，在默认行为前拿到数据 */);