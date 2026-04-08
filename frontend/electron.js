const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess = null;

function startBackend() {
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend.exe')
    : path.join(__dirname, '../backend/dist/backend.exe');

  backendProcess = spawn(backendPath, [], { detached: false, stdio: 'ignore' });
}

function createWindow() {
  if (app.isPackaged) startBackend();

  setTimeout(() => {
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    if (app.isPackaged) {
      win.loadFile(path.join(__dirname, 'dist/index.html'));
    } else {
      win.loadURL('http://localhost:5173');
    }
  }, 2000);
}

app.whenReady().then(() => {
  console.log('App ready');
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});