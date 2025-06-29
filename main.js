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

async function createWindow() {
  // Initialize database
  dbManager = new DatabaseManager();
  try {
    await dbManager.initTables(); // Initialize tables and create default admin user
  } catch (error) {
    console.error('Database initialization error:', error);
  }

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
  mainWindow.on('closed', async () => {
    mainWindow = null;
    // Close database connection when app closes
    if (dbManager) {
      await dbManager.close();
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
    const isAuthenticated = await dbManager.authenticateAdmin(username, password);
    
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
    const adminInfo = await dbManager.getAdminByUsername(username);
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

// Staff Management IPC Handlers
ipcMain.handle('get-all-staffs', async () => {
  try {
    const staffs = await dbManager.getAllStaffs();
    return { success: true, data: staffs };
  } catch (error) {
    console.error('Get staffs error:', error);
    return { success: false, message: 'Failed to get staffs' };
  }
});

ipcMain.handle('add-staff', async (event, staffData) => {
  try {
    const result = await dbManager.addStaff(staffData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Add staff error:', error);
    return { success: false, message: 'Failed to add staff' };
  }
});

ipcMain.handle('update-staff', async (event, { id, data }) => {
  try {
    const result = await dbManager.updateStaff(id, data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Update staff error:', error);
    return { success: false, message: 'Failed to update staff' };
  }
});

ipcMain.handle('delete-staff', async (event, id) => {
  try {
    const result = await dbManager.deleteStaff(id);
    return { success: true, data: result };
  } catch (error) {
    console.error('Delete staff error:', error);
    return { success: false, message: 'Failed to delete staff' };
  }
});

// Members Management IPC Handlers
ipcMain.handle('get-all-members', async () => {
  try {
    const members = await dbManager.getAllMembers();
    return { success: true, data: members };
  } catch (error) {
    console.error('Get members error:', error);
    return { success: false, message: 'Failed to get members' };
  }
});

ipcMain.handle('add-member', async (event, memberData) => {
  try {
    const result = await dbManager.addMember(memberData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Add member error:', error);
    return { success: false, message: 'Failed to add member' };
  }
});

ipcMain.handle('update-member', async (event, { id, data }) => {
  try {
    const result = await dbManager.updateMember(id, data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Update member error:', error);
    return { success: false, message: 'Failed to update member' };
  }
});

ipcMain.handle('delete-member', async (event, id) => {
  try {
    const result = await dbManager.deleteMember(id);
    return { success: true, data: result };
  } catch (error) {
    console.error('Delete member error:', error);
    return { success: false, message: 'Failed to delete member' };
  }
});

// Books Management IPC Handlers
ipcMain.handle('get-all-books', async () => {
  try {
    const books = await dbManager.getAllBooks();
    return { success: true, data: books };
  } catch (error) {
    console.error('Get books error:', error);
    return { success: false, message: 'Failed to get books' };
  }
});

ipcMain.handle('add-book', async (event, bookData) => {
  try {
    const result = await dbManager.addBook(bookData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Add book error:', error);
    return { success: false, message: 'Failed to add book' };
  }
});

ipcMain.handle('update-book', async (event, { id, data }) => {
  try {
    const result = await dbManager.updateBook(id, data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Update book error:', error);
    return { success: false, message: 'Failed to update book' };
  }
});

ipcMain.handle('delete-book', async (event, id) => {
  try {
    const result = await dbManager.deleteBook(id);
    return { success: true, data: result };
  } catch (error) {
    console.error('Delete book error:', error);
    return { success: false, message: 'Failed to delete book' };
  }
});

// Borrowed Books Management IPC Handlers
ipcMain.handle('get-all-borrowed-books', async () => {
  try {
    const borrowedBooks = await dbManager.getAllBorrowedBooks();
    return { success: true, data: borrowedBooks };
  } catch (error) {
    console.error('Get borrowed books error:', error);
    return { success: false, message: 'Failed to get borrowed books' };
  }
});

ipcMain.handle('add-borrowed-book', async (event, borrowedBookData) => {
  try {
    const result = await dbManager.addBorrowedBook(borrowedBookData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Add borrowed book error:', error);
    return { success: false, message: 'Failed to add borrowed book' };
  }
});

ipcMain.handle('return-book', async (event, id) => {
  try {
    const result = await dbManager.returnBook(id);
    return { success: true, data: result };
  } catch (error) {
    console.error('Return book error:', error);
    return { success: false, message: 'Failed to return book' };
  }
});

// Dashboard Stats IPC Handler
ipcMain.handle('get-dashboard-stats', async () => {
  try {
    const stats = await dbManager.getDashboardStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return { success: false, message: 'Failed to get dashboard statistics' };
  }
});

// Announcements Management IPC Handlers
ipcMain.handle('get-all-announcements', async () => {
  try {
    const announcements = await dbManager.getAllAnnouncements();
    return { success: true, data: announcements };
  } catch (error) {
    console.error('Get announcements error:', error);
    return { success: false, message: 'Failed to get announcements' };
  }
});

ipcMain.handle('add-announcement', async (event, announcementData) => {
  try {
    const result = await dbManager.addAnnouncement(announcementData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Add announcement error:', error);
    return { success: false, message: 'Failed to add announcement' };
  }
});

// Feedbacks Management IPC Handlers
ipcMain.handle('get-all-feedbacks', async () => {
  try {
    const feedbacks = await dbManager.getAllFeedbacks();
    return { success: true, data: feedbacks };
  } catch (error) {
    console.error('Get feedbacks error:', error);
    return { success: false, message: 'Failed to get feedbacks' };
  }
});

ipcMain.handle('add-feedback', async (event, feedbackData) => {
  try {
    const result = await dbManager.addFeedback(feedbackData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Add feedback error:', error);
    return { success: false, message: 'Failed to add feedback' };
  }
});

// Attendance Management IPC Handlers
ipcMain.handle('get-attendance', async () => {
  try {
    const attendance = await dbManager.getAttendance();
    return { success: true, data: attendance };
  } catch (error) {
    console.error('Get attendance error:', error);
    return { success: false, message: 'Failed to get attendance' };
  }
});

ipcMain.handle('add-attendance', async (event, attendanceData) => {
  try {
    const result = await dbManager.addAttendance(attendanceData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Add attendance error:', error);
    return { success: false, message: 'Failed to add attendance' };
  }
});

// Admin Management IPC Handlers
ipcMain.handle('get-all-admins', async () => {
  try {
    const admins = await dbManager.getAllAdmins();
    return { success: true, data: admins };
  } catch (error) {
    console.error('Get admins error:', error);
    return { success: false, message: 'Failed to get admins' };
  }
});

ipcMain.handle('add-admin-user', async (event, adminData) => {
  try {
    const result = await dbManager.addAdminUser(adminData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Add admin error:', error);
    return { success: false, message: 'Failed to add admin' };
  }
});

ipcMain.handle('update-admin-user', async (event, { id, data }) => {
  try {
    const result = await dbManager.updateAdminUser(id, data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Update admin error:', error);
    return { success: false, message: 'Failed to update admin' };
  }
});

ipcMain.handle('delete-admin-user', async (event, id) => {
  try {
    const result = await dbManager.deleteAdminUser(id);
    return { success: true, data: result };
  } catch (error) {
    console.error('Delete admin error:', error);
    return { success: false, message: 'Failed to delete admin' };
  }
});

