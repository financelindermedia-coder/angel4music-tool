// ============================================================
// main.js — Angel for Music Desktop App (Electron)
// ============================================================

const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 960,
    minWidth: 900,
    minHeight: 700,
    title: 'Angel for Music — Video Generator',
    backgroundColor: '#141414',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false  // Lokale Dateien & Blob-URLs ohne CORS-Probleme
    }
  });

  // Menüleiste ausblenden
  win.setMenuBarVisibility(false);

  // generator.html als Startseite laden
  win.loadFile('generator.html');
}

app.whenReady().then(() => {
  // Medien-Berechtigungen automatisch erlauben (für WebAudio + MediaRecorder)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
