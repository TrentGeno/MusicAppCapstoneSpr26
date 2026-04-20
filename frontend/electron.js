const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let backendProcess = null;

function startBackend() {
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend.exe')
    : path.join(__dirname, '../backend/dist/backend.exe');

  // Log whether the file exists
  const exists = fs.existsSync(backendPath);
  fs.writeFileSync(path.join(app.getPath('desktop'), 'offbeat-debug.txt'),
    `backendPath: ${backendPath}\nexists: ${exists}\nisPackaged: ${app.isPackaged}\nresourcesPath: ${process.resourcesPath}\n`
  );

  if (!exists) return;

  backendProcess = spawn(backendPath, [], { detached: false, stdio: 'ignore' });
  backendProcess.on('error', (err) => {
    fs.appendFileSync(path.join(app.getPath('desktop'), 'offbeat-debug.txt'), `spawn error: ${err}\n`);
  });
}

function createWindow() {
  startBackend();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  setTimeout(() => {
    if (app.isPackaged) {
      win.loadFile(path.join(__dirname, 'dist/index.html'));
    } else {
      win.loadURL('http://localhost:5173');
    }
    win.webContents.openDevTools(); // open devtools to see console errors
  }, 3000);
}

app.whenReady().then(createWindow);

win.webContents.setWindowOpenHandler(({ url }) => {
  if (url.startsWith('https://')) {
    shell.openExternal(url);
    return { action: 'deny' };
  }
  return { action: 'allow' };
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});