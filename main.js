const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let manualUpdateCheck = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'AG DiffChecker',
    backgroundColor: '#0d0f14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Custom titlebar feel
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // don't flash white on load
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // auto-check after 3 s so the window is fully settled; skip in dev
    if (app.isPackaged) {
      setTimeout(() => autoUpdater.checkForUpdates(), 3000);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildMenu();
  setupAutoUpdater();
}

function buildMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),

    // File
    {
      label: 'File',
      submenu: [
        {
          label: 'New Comparison',
          accelerator: 'CmdOrCtrl+N',
          click() {
            mainWindow.webContents.executeJavaScript(`
              document.getElementById('left-editor').value = '';
              document.getElementById('right-editor').value = '';
              document.getElementById('left-name').value = 'original.txt';
              document.getElementById('right-name').value = 'modified.txt';
              if (document.getElementById('edit-btn').style.display !== 'none') {
                document.getElementById('edit-btn').click();
              }
            `);
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // Edit
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },

    // View
    {
      label: 'View',
      submenu: [
        {
          label: 'Run Compare',
          accelerator: 'CmdOrCtrl+Enter',
          click() {
            mainWindow.webContents.executeJavaScript(`document.getElementById('diff-btn').click()`);
          }
        },
        {
          label: 'Swap Panels',
          accelerator: 'CmdOrCtrl+Shift+S',
          click() {
            mainWindow.webContents.executeJavaScript(`document.getElementById('swap-btn').click()`);
          }
        },
        { type: 'separator' },
        {
          label: 'Full File View',
          accelerator: 'CmdOrCtrl+1',
          click() {
            mainWindow.webContents.executeJavaScript(`
              if (typeof setViewMode === 'function') setViewMode('full');
            `);
          }
        },
        {
          label: 'Changes Only View',
          accelerator: 'CmdOrCtrl+2',
          click() {
            mainWindow.webContents.executeJavaScript(`
              if (typeof setViewMode === 'function') setViewMode('changes');
            `);
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    // Help
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates…',
          click() {
            manualUpdateCheck = true;
            autoUpdater.checkForUpdates().catch(err => {
              manualUpdateCheck = false;
              dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Update Error',
                message: 'Could not check for updates.',
                detail: err.message,
                buttons: ['OK'],
              });
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Keyboard Shortcuts',
          click() {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Keyboard Shortcuts',
              message: 'DiffChecker Shortcuts',
              detail: [
                'Ctrl+Enter       Run Compare',
                'Ctrl+N           New Comparison',
                'Ctrl+Shift+S     Swap Panels',
                'Ctrl+F           Find in Diff',
                'Ctrl+1           Full File View',
                'Ctrl+2           Changes Only View',
                'F11              Toggle Fullscreen',
              ].join('\n')
            });
          }
        },
        {
          label: 'About DiffChecker',
          click() {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About AG DiffChecker',
              message: 'AG DiffChecker v1.0.1',
              detail: 'A fast, local, side-by-side diff tool.\n\nNo data ever leaves your machine.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setupAutoUpdater() {
  if (!app.isPackaged) return; // no-op in dev / npm start

  autoUpdater.on('update-available', info => {
    manualUpdateCheck = false;
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available`,
      detail: 'Downloading in the background — you\'ll be notified when it\'s ready to install.',
      buttons: ['OK'],
    });
  });

  autoUpdater.on('update-not-available', () => {
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Up to Date',
      message: 'You\'re already on the latest version.',
      buttons: ['OK'],
    });
  });

  autoUpdater.on('error', err => {
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Update Error',
      message: 'Could not check for updates.',
      detail: err.message,
      buttons: ['OK'],
    });
  });

  autoUpdater.on('download-progress', ({ percent }) => {
    mainWindow.setProgressBar(percent / 100);
    mainWindow.setTitle(`DiffChecker — Downloading update ${Math.round(percent)}%`);
  });

  autoUpdater.on('update-downloaded', info => {
    mainWindow.setProgressBar(-1);
    mainWindow.setTitle('DiffChecker');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} is ready to install`,
      detail: 'Restart DiffChecker now to apply the update?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
