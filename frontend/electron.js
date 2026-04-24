const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let backendProcess = null;
let mainWindow = null;

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
      contextIsolation: true
    }
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