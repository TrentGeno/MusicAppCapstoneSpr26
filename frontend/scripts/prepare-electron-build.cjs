const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function sleep(ms) {
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
}

function tryRemove(targetPath) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    if (error && ['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(error.code)) {
      return false;
    }
    throw error;
  }
}

function removeWithRetries(targetPath, attempts = 8) {
  for (let i = 0; i < attempts; i += 1) {
    if (tryRemove(targetPath)) {
      return;
    }
    sleep(300);
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
}

function killWindowsProcesses() {
  const images = ['OffBeat.exe', 'backend.exe', 'electron.exe'];

  for (const image of images) {
    spawnSync('taskkill', ['/F', '/IM', image], {
      stdio: 'ignore',
      windowsHide: true,
      shell: false,
    });
  }
}

function main() {
  if (process.platform === 'win32') {
    killWindowsProcesses();
  }

  const projectRoot = path.resolve(__dirname, '..');
  const releaseDir = path.join(projectRoot, 'release');

  removeWithRetries(path.join(releaseDir, 'win-unpacked'));
  removeWithRetries(path.join(releaseDir, 'builder-effective-config.yaml'));

  console.log('Prepared Electron build output directory.');
}

main();
