const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let backendProcess = null;
let mainWindow = null;
let miniPlayerWindow = null;
let lastMiniPlayerState = null;

// Adjust these to match your Flask backend
const BACKEND_PORT = 5000;        // change if your backend listens on a different port
const BACKEND_HEALTH_PATH = '/';  // change to e.g. '/health' if you have a health endpoint

function startBackend() {
  const isPackaged = app.isPackaged;
 
  // Where backend.exe lives
  const backendDir = isPackaged
    ? process.resourcesPath
    : path.join(__dirname, 'release/win-unpacked/resources');

  const exePath = path.join(backendDir, 'backend.exe');

  // Log file in the app's user data folder
  const logPath = path.join(app.getPath('userData'), 'backend.log');

  console.log("Checking for backend at:", exePath);
  console.log("Backend logs will be written to:", logPath);

  if (!fs.existsSync(exePath)) {
    console.error("CRITICAL: backend.exe not found at:", exePath);
    return;
  }

  // Open the log stream
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  // Spawn backend, let stdout/stderr be pipes so we can redirect them
  backendProcess = spawn(exePath, [], {
    shell: false,
    windowsHide: true,
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'UTF-8'
    }
  });

  // Pipe stdout/stderr into log file
  if (backendProcess.stdout) backendProcess.stdout.pipe(logStream);
  if (backendProcess.stderr) backendProcess.stderr.pipe(logStream);

  console.log(`Backend process spawned with PID: ${backendProcess.pid}`);

  backendProcess.on('error', (err) => {
    console.error("Failed to start backend:", err);
  });

  backendProcess.on('exit', (code, signal) => {
    console.log(`Backend exited with code ${code}, signal ${signal}`);
    logStream.end();
  });
}

function waitForFlask(retries, callback) {
  const url = `http://127.0.0.1:${BACKEND_PORT}${BACKEND_HEALTH_PATH}`;

  http.get(url, (res) => {
    // Any successful response means backend is up
    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
      console.log(`Backend is ALIVE and responding (status ${res.statusCode})!`);
      callback();
    } else {
      console.log(`Backend responded but with status ${res.statusCode}; continuing anyway.`);
      callback();
    }
  }).on('error', () => {
    if (retries > 0) {
      process.stdout.write(`Waiting for backend at ${url}... (${retries} left)\r`);
      setTimeout(() => waitForFlask(retries - 1, callback), 1000);
    } else {
      console.log(`\nBackend health check at ${url} timed out. Showing window anyway.`);
      callback();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Keep hidden until backend is (hopefully) ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.on('closed', () => {
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
      miniPlayerWindow.close();
    }
    miniPlayerWindow = null;
  });

  startBackend();

  // Try for 30 seconds total
  waitForFlask(30, () => {
    const indexPath = path.join(__dirname, 'dist/index.html');

    mainWindow.loadFile(indexPath)
      .then(() => {
        console.log("Frontend UI loaded.");
        mainWindow.show();
      })
      .catch(err => {
        console.error("Could not load index.html:", err);
        mainWindow.show();
      });
  });
}

// ── Mini Player ────────────────────────────────────────────────────────────

function createMiniPlayer() {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.focus();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const winWidth  = 300;
  const winHeight = 120;

  miniPlayerWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width  - winWidth  - 20,
    y: height - winHeight - 20,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const miniPath = path.join(__dirname, 'dist', 'mini-player.html');
  miniPlayerWindow.loadFile(miniPath).catch(err => {
    console.error('Could not load mini-player.html:', err);
  });

  miniPlayerWindow.on('closed', () => {
    miniPlayerWindow = null;
  });
}

// IPC: open / close mini player
ipcMain.on('open-mini-player', () => createMiniPlayer());

ipcMain.on('close-mini-player', () => {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.close();
  }
});

// IPC: main renderer pushes playback state → forward to mini player
ipcMain.on('main-state-update', (_event, state) => {
  lastMiniPlayerState = state;
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.webContents.send('mini-player-state', state);
  }
});

// IPC: mini player is ready → send current state immediately
ipcMain.on('mini-player-ready', () => {
  if (lastMiniPlayerState && miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.webContents.send('mini-player-state', lastMiniPlayerState);
  }
});

// IPC: mini player sends a command → forward to main renderer
ipcMain.on('mini-player-command', (_event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('mini-player-command', data);
  }
});

// ── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady()
  .then(createWindow)
  .catch(err => {
    console.error('Error during app startup:', err);
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Make sure backend is killed when app exits
app.on('before-quit', () => {
  if (backendProcess) {
    console.log("Terminating backend...");
    backendProcess.kill();
  }
});