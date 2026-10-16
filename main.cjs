'use strict';
const { app, BrowserWindow, session, screen, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createStaticServer } = require('./server.cjs');

app.setName('Counterpoint');
// Explicit isolated profile for local QA; ordinary launches use the normal Mac save.
if (process.env.COUNTERPOINT_TEST_PROFILE && path.isAbsolute(process.env.COUNTERPOINT_TEST_PROFILE)) {
  app.setPath('userData', process.env.COUNTERPOINT_TEST_PROFILE);
}
const debugPort = process.env.COUNTERPOINT_DEBUG_PORT;
if (debugPort && /^\d{4,5}$/.test(debugPort) && Number(debugPort) <= 65535) {
  app.commandLine.appendSwitch('remote-debugging-port', debugPort);
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
}
let service;
let mainWindow;
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); } });
  app.whenReady().then(async () => {
    service = await createStaticServer();
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: !details.url.startsWith(service.origin + '/') && !details.url.startsWith('devtools://') });
    });
    installStorage();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  }).catch((error) => { console.error('Counterpoint could not start:', error); app.quit(); });
}
function createWindow() {
  const bounds = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1480, bounds.width), height: Math.min(980, bounds.height),
    minWidth: Math.min(1080, bounds.width), minHeight: Math.min(720, bounds.height),
    title: 'Counterpoint', titleBarStyle: 'hiddenInset', backgroundColor: '#08171c',
    show: false, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false }
  });
  mainWindow.removeMenu();
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.loadURL(service.origin).catch((error) => console.error('Unable to load game:', error));
}
function installStorage() {
  const filename = path.join(app.getPath('userData'), 'saved-game.json');
  let pending = Promise.resolve();
  const trusted = (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame
      || !event.senderFrame.url.startsWith(service.origin + '/')) throw new Error('Untrusted storage caller');
  };
  ipcMain.handle('counterpoint:load', async (event) => {
    trusted(event);
    await pending;
    try { return await fs.readFile(filename, 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  });
  ipcMain.handle('counterpoint:save', (event, data) => {
    trusted(event);
    if (typeof data !== 'string' || Buffer.byteLength(data) > 262144) throw new Error('Invalid save data');
    JSON.parse(data);
    const operation = pending.then(async () => {
      await fs.mkdir(path.dirname(filename), { recursive: true });
      await fs.writeFile(filename + '.tmp', data, { mode: 0o600 });
      await fs.rename(filename + '.tmp', filename);
      return true;
    });
    pending = operation.catch(() => {});
    return operation;
  });
  ipcMain.handle('counterpoint:clear', (event) => {
    trusted(event);
    const operation = pending.then(async () => { await fs.rm(filename, { force: true }); return true; });
    pending = operation.catch(() => {});
    return operation;
  });
}
app.on('window-all-closed', () => { app.quit(); });
app.on('before-quit', () => { service?.server.close(); });
