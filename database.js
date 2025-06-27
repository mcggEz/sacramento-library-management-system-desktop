const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, 'library_data.json');
        this.data = this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const fileContent = fs.readFileSync(this.dbPath, 'utf8');
                return JSON.parse(fileContent);
            }
        } catch (error) {
            console.error('Error loading database:', error);
        }
        
        // Return default structure if file doesn't exist or is corrupted
        return {
            admin_users: [],
            attendance: [],
            lastId: 0
        };
    }

    saveData() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving database:', error);
            return false;
        }
    }

    getNextId() {
        this.data.lastId += 1;
        return this.data.lastId;
    }

    initTables() {
        // Check if admin user exists, if not create default admin
        const adminExists = this.data.admin_users.find(user => user.username === 'admin');
        if (!adminExists) {
            const adminUser = {
                id: this.getNextId(),
                username: 'admin',
                password: 'password',
                full_name: 'System Administrator',
                email: 'admin@library.com',
                role: 'admin',
                created_at: new Date().toISOString(),
                last_login: null
            };
            this.data.admin_users.push(adminUser);
            this.saveData();
        }
    }

    // Admin authentication
    authenticateAdmin(username, password) {
        const user = this.data.admin_users.find(u => u.username === username && u.password === password);
        if (user) {
            // Update last login
            user.last_login = new Date().toISOString();
            this.saveData();
            return true;
        }
        return false;
    }

    // Get admin user by username
    getAdminByUsername(username) {
        return this.data.admin_users.find(u => u.username === username);
    }

    // Get all admin users
    getAllAdmins() {
        return this.data.admin_users;
    }

    // Add new admin user
    addAdminUser(data) {
        const newUser = {
            id: this.getNextId(),
            username: data.username,
            password: data.password,
            full_name: data.full_name || '',
            email: data.email || '',
            role: data.role || 'admin',
            created_at: new Date().toISOString(),
            last_login: null
        };
        
        this.data.admin_users.push(newUser);
        this.saveData();
        return { lastInsertRowid: newUser.id };
    }

    // Update admin user
    updateAdminUser(id, data) {
        const userIndex = this.data.admin_users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            const user = this.data.admin_users[userIndex];
            if (data.username) user.username = data.username;
            if (data.password) user.password = data.password;
            if (data.full_name) user.full_name = data.full_name;
            if (data.email) user.email = data.email;
            if (data.role) user.role = data.role;
            
            this.saveData();
            return { changes: 1 };
        }
        return null;
    }

    // Delete admin user
    deleteAdminUser(id) {
        const userIndex = this.data.admin_users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            this.data.admin_users.splice(userIndex, 1);
            this.saveData();
            return { changes: 1 };
        }
        return { changes: 0 };
    }

    // Add attendance record
    addAttendance(data) {
        const record = {
            id: this.getNextId(),
            date: data.date,
            name: data.name,
            library_number: data.libraryNumber,
            purpose: data.purpose,
            time: data.time,
            created_at: new Date().toISOString()
        };
        
        this.data.attendance.push(record);
        this.saveData();
        return { lastInsertRowid: record.id };
    }

    // Get all attendance records
    getAttendance() {
        return this.data.attendance.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Close database connection (no-op for JSON database)
    close() {
        // Nothing to close for JSON database
    }
}

module.exports = DatabaseManager;

