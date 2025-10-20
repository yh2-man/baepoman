import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'child_process';
import electronSquirrelStartup from 'electron-squirrel-startup';
import Store from 'electron-store';

// Initialize electron-store in the main process
const store = new Store();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (electronSquirrelStartup) {
  app.quit();
}

let signalingServerProcess;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 950,
    height: 600,
    minWidth: 950,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // contextIsolation is true by default and is a security best practice.
      // We do not need to disable it.
      contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src 'self' ws://localhost:3001;",
    },
  });

  mainWindow.loadURL('http://localhost:5173');
};

// Set up IPC handlers for the store
function setupStoreHandlers() {
  ipcMain.handle('electron-store-get', async (event, key) => {
    return store.get(key);
  });
  ipcMain.handle('electron-store-set', async (event, key, value) => {
    store.set(key, value);
  });
  ipcMain.handle('electron-store-delete', async (event, key) => {
    store.delete(key);
  });
}

app.whenReady().then(() => {
  // Set up IPC handlers before creating the window
  setupStoreHandlers();

  /*
  const serverPath = path.join(__dirname, '..', '..', 'signaling-server');
  signalingServerProcess = spawn('node', ['index.js'], {
    cwd: serverPath,
    shell: true
  });

  signalingServerProcess.stdout.on('data', (data) => {
    console.log(`Signaling Server: ${data}`);
  });
  signalingServerProcess.stderr.on('data', (data) => {
    console.error(`Signaling Server Error: ${data}`);
  });
  signalingServerProcess.on('close', (code) => {
    console.log(`Signaling Server exited with code ${code}`);
  });
  */

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/*
app.on('will-quit', () => {
  if (signalingServerProcess) {
    console.log('Stopping signaling server...');
    signalingServerProcess.kill();
  }
});
*/
