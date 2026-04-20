const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let backendProcess = null;
let mainWindow = null;

function startBackend() {
  const backendPath = path.join(process.resourcesPath, 'backend.exe');
  if (!fs.existsSync(backendPath)) return;

  backendProcess = spawn(`"${backendPath}"`, [], {
    detached: false,
    shell: true,
    windowsHide: true,
    stdio: 'ignore',
    cwd: process.resourcesPath,
  });
}
function waitForFlask(retries, callback) {
  http.get('http://127.0.0.1:5000/tracks', () => {
    callback();
  }).on('error', () => {
    if (retries > 0) setTimeout(() => waitForFlask(retries - 1, callback), 500);
    else callback();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  startBackend();
  waitForFlask(40, () => {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});