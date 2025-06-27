try {
  require('electron-reload')(__dirname, {
    electron: require(`${__dirname}/node_modules/electron`)
  });
} catch (_) {}

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import the database manager
const DatabaseManager = require('./database.js');

let mainWindow;
let dbManager;

function createWindow() {
  // Initialize database
  dbManager = new DatabaseManager();
  dbManager.initTables(); // Initialize tables and create default admin user

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Optional: add an icon
    show: false // Don't show until ready
  });

  mainWindow.setMenu(null);

  // Load the login page
  mainWindow.loadFile('pages/login.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    // Close database connection when app closes
    if (dbManager) {
      dbManager.close();
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for login with database authentication
ipcMain.handle('login', async (event, credentials) => {
  try {
    const { username, password } = credentials;
    
    // Use database authentication
    const isAuthenticated = dbManager.authenticateAdmin(username, password);
    
    if (isAuthenticated) {
      return { success: true, message: 'Login successful' };
    } else {
      return { success: false, message: 'Invalid username or password' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Database error occurred' };
  }
});

// IPC handler to get admin user info
ipcMain.handle('get-admin-info', async (event, username) => {
  try {
    const adminInfo = dbManager.getAdminByUsername(username);
    return { success: true, data: adminInfo };
  } catch (error) {
    console.error('Get admin info error:', error);
    return { success: false, message: 'Failed to get admin information' };
  }
});

// IPC handler to load dashboard
ipcMain.handle('load-dashboard', async () => {
  mainWindow.loadFile('pages/dashboard.html');
  return { success: true };
});

// IPC handler to load login page (for logout)
ipcMain.handle('load-login', async () => {
  mainWindow.loadFile('pages/login.html');
  return { success: true };
});

// IPC handler to load staffs page
ipcMain.handle('load-staffs', async () => {
  mainWindow.loadFile('pages/staffs.html');
  return { success: true };
});

// IPC handlers for the rest of the pages
ipcMain.handle('load-members', async () => { mainWindow.loadFile('pages/members.html'); });
ipcMain.handle('load-books', async () => { mainWindow.loadFile('pages/books.html'); });
ipcMain.handle('load-borrowed-books', async () => { mainWindow.loadFile('pages/borrowed-books.html'); });
ipcMain.handle('load-help', async () => { mainWindow.loadFile('pages/help.html'); });
ipcMain.handle('load-settings', async () => { mainWindow.loadFile('pages/settings.html'); });
ipcMain.handle('load-reports', async () => { mainWindow.loadFile('pages/reports.html'); });
// IPC handlers for header links
ipcMain.handle('load-library-forms', async () => {
  mainWindow.loadFile('pages/library-forms.html');
  return { success: true };
});

