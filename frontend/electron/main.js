import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const BACKEND_URL = process.env.INFICHAT_BACKEND_URL || "http://localhost:8080";

// --- Window State Persistence ---
const stateFile = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return { width: 1280, height: 800 };
}

function saveWindowState(win) {
  try {
    const bounds = win.getBounds();
    const isMaximized = win.isMaximized();
    fs.writeFileSync(stateFile, JSON.stringify({ ...bounds, isMaximized }));
  } catch (e) { /* ignore */ }
}

// Helper to check for updates from your self-hosted backend
async function getLatestUpdateInfo() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/system/latest-update', BACKEND_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    protocol.get(url.href, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", (e) => reject(e));
  });
}

function createWindow() {
  const savedState = loadWindowState();

  const mainWindow = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    show: false,
    frame: false,
    transparent: true,
    title: 'InfiChat',
    backgroundColor: '#00000000',
    icon: path.join(__dirname, '../build/icons/win/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
    },
  });

  if (savedState.isMaximized) {
    mainWindow.maximize();
  }

  // Save state on resize/move
  mainWindow.on('resize', () => saveWindowState(mainWindow));
  mainWindow.on('move', () => saveWindowState(mainWindow));
  mainWindow.on('close', () => saveWindowState(mainWindow));



  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Check for updates shortly after app opens
    setTimeout(checkOnStartup, 3000);
  });
}

async function checkOnStartup() {
  if (isDev) return;
  try {
    const info = await getLatestUpdateInfo();
    const currentVersion = app.getVersion();
    if (info.version && info.version !== currentVersion) {
      const { response } = await dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version of InfiChat (${info.version}) is available!`,
        detail: 'Would you like to download the latest installer from your server?',
        buttons: ['Download Now', 'Later'],
        defaultId: 0
      });
      if (response === 0) {
        shell.openExternal(info.download_url);
      }
    }
  } catch (e) {
    // Silently fail — update check is non-critical
  }
}

// IPC Handler for manual check from Settings
ipcMain.handle('check-for-updates', async () => {
  try {
    const info = await getLatestUpdateInfo();
    const currentVersion = app.getVersion();
    return {
      available: info.version && info.version !== currentVersion,
      version: info.version,
      url: info.download_url
    };
  } catch (err) {
    return { available: false, error: true };
  }
});

// IPC Handler for getting app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
