const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
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

// IPC handlers for login
ipcMain.handle('login', async (event, credentials) => {
  // Simple authentication logic (replace with your actual auth)
  const { username, password } = credentials;
  
  if (username === 'admin' && password === 'password') {
    return { success: true, message: 'Login successful' };
  } else {
    return { success: false, message: 'Invalid credentials' };
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
ipcMain.handle('load-reservations', async () => { mainWindow.loadFile('pages/reservations.html'); });
ipcMain.handle('load-announcements', async () => { mainWindow.loadFile('pages/announcements.html'); });
ipcMain.handle('load-feedbacks', async () => { mainWindow.loadFile('pages/feedbacks.html'); });
ipcMain.handle('load-help', async () => { mainWindow.loadFile('pages/help.html'); });
ipcMain.handle('load-settings', async () => { mainWindow.loadFile('pages/settings.html'); });

// IPC handlers for header links
ipcMain.handle('load-library-forms', async () => { 
    console.log('Creating new library forms window...');
    
    // Check if a forms window already exists
    const existingWindows = BrowserWindow.getAllWindows();
    const existingFormsWindow = existingWindows.find(win => win.getTitle().includes('Library Forms'));
    
    if (existingFormsWindow) {
        console.log('Forms window already exists, focusing it...');
        existingFormsWindow.focus();
        return { success: true };
    }
    
    const formsWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'Library Forms - Manila-Sacramento Friendship Library',
        icon: null, // You can add an icon path here if you have one
        resizable: true,
        minimizable: true,
        maximizable: true,
        show: false, // Don't show until ready
        parent: mainWindow, // Make it a child of the main window
        modal: false // Don't make it modal
    });
    
    console.log('Forms window created, loading content...');
    
    try {
        // Load the forms page
        await formsWindow.loadFile('pages/library-forms.html');
        console.log('Forms page loaded successfully');
        
        // Show the window when ready
        formsWindow.once('ready-to-show', () => {
            formsWindow.show();
            formsWindow.focus(); // Bring to front
            console.log('Library forms window is now visible');
        });
        
        // Handle window closed
        formsWindow.on('closed', () => {
            console.log('Library forms window closed');
        });
        
        // Optional: Open DevTools in development
        if (process.argv.includes('--dev')) {
            formsWindow.webContents.openDevTools();
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error creating forms window:', error);
        return { success: false, error: error.message };
    }
});