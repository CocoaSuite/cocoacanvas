const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

const editor = path.join(__dirname, '..', 'CocoaCanvas-standalone.html');
const editorURL = pathToFileURL(editor).href;
let win;
let pending = [];

function enqueue(args, cwd = process.cwd()) {
  pending.push(...args.filter(a => /\.ccanvas$/i.test(a) && !a.startsWith('-')).map(a => path.resolve(cwd, a)));
  if (win && !win.webContents.isLoading()) void openPending();
}

let opening = false;
async function openPending() {
  if (opening || !win || win.isDestroyed()) return;
  opening = true;
  try {
    while (pending.length && win && !win.isDestroyed()) {
      const filename = pending.shift();
      try {
        const data = await fs.readFile(filename, 'utf8');
        await win.webContents.executeJavaScript(`(() => { fileH = null; openData(${JSON.stringify(data)}); })()`);
      } catch (error) {
        dialog.showErrorBox('Unable to open project', `${path.basename(filename)}: ${error.message}`);
      }
    }
  } finally { opening = false; }
}

function createWindow() {
  win = new BrowserWindow({
    title: 'CocoaCanvas', width: 1400, height: 900,
    minWidth: 760, minHeight: 520, show: false,
    icon: path.join(__dirname, '..', 'icon-512.png'),
    backgroundColor: '#14100d', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  Menu.setApplicationMenu(null);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== editorURL) event.preventDefault();
  });
  win.webContents.once('did-finish-load', () => { void openPending(); });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; });
  void win.loadFile(editor);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  enqueue(process.argv.slice(1));
  app.on('second-instance', (_event, args, cwd) => {
    enqueue(args, cwd);
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.on('open-file', (event, filename) => { event.preventDefault(); enqueue([filename]); });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
