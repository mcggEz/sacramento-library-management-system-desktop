const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, 'library.db');
        this.db = null;
        this.initialized = false;
    }

    async initTables() {
        if (this.initialized) return;
        
        try {
            // Initialize SQL.js with local WebAssembly file
            const SQL = await initSqlJs({
                locateFile: file => path.join(__dirname, file)
            });

            // Load existing database or create new one
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath);
                this.db = new SQL.Database(data);
            } else {
                this.db = new SQL.Database();
            }

            this.initialized = true;

            // Create admin_users table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS admin_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    full_name TEXT,
                    email TEXT,
                    role TEXT DEFAULT 'admin',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                )
            `);

            // Create staffs table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS staffs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE,
                    role TEXT,
                    phone TEXT,
                    department TEXT,
                    hire_date DATE,
                    status TEXT DEFAULT 'Active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create attendance table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS attendance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    name TEXT NOT NULL,
                    library_number TEXT,
                    purpose TEXT,
                    time TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create members table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    member_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    address TEXT,
                    membership_date DATE,
                    status TEXT DEFAULT 'Active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create books table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS books (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    isbn TEXT UNIQUE,
                    title TEXT NOT NULL,
                    author TEXT,
                    publisher TEXT,
                    publication_year INTEGER,
                    category TEXT,
                    copies_available INTEGER DEFAULT 1,
                    total_copies INTEGER DEFAULT 1,
                    location TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create borrowed_books table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS borrowed_books (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    book_id INTEGER,
                    member_id INTEGER,
                    borrowed_date DATE NOT NULL,
                    due_date DATE NOT NULL,
                    returned_date DATE,
                    status TEXT DEFAULT 'Borrowed',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (book_id) REFERENCES books (id),
                    FOREIGN KEY (member_id) REFERENCES members (id)
                )
            `);

            // Create announcements table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS announcements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    author_id INTEGER,
                    priority TEXT DEFAULT 'Normal',
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (author_id) REFERENCES admin_users (id)
                )
            `);

            // Create feedbacks table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS feedbacks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    member_id INTEGER,
                    subject TEXT NOT NULL,
                    message TEXT NOT NULL,
                    rating INTEGER,
                    status TEXT DEFAULT 'Pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (member_id) REFERENCES members (id)
                )
            `);

            // Create library_users table (unified user management)
            this.db.run(`
                CREATE TABLE IF NOT EXISTS library_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    email TEXT UNIQUE,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    middle_name TEXT,
                    phone TEXT,
                    address TEXT,
                    user_type TEXT NOT NULL,
                    role TEXT,
                    department TEXT,
                    membership_id TEXT,
                    student_id TEXT,
                    date_of_birth DATE,
                    gender TEXT,
                    course TEXT,
                    year_level TEXT,
                    section TEXT,
                    enrollment_date DATE,
                    membership_date DATE,
                    hire_date DATE,
                    status TEXT DEFAULT 'Active',
                    is_verified BOOLEAN DEFAULT 0,
                    last_login DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create user_sessions table for tracking login sessions
            this.db.run(`
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    session_token TEXT UNIQUE NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    logout_time DATETIME,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (user_id) REFERENCES library_users (id)
                )
            `);

            // Create user_permissions table for role-based access control
            this.db.run(`
                CREATE TABLE IF NOT EXISTS user_permissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    permission_name TEXT NOT NULL,
                    permission_value BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES library_users (id),
                    UNIQUE(user_id, permission_name)
                )
            `);

            // Insert default data
            await this.insertDefaultData();

            // Save the database
            this.saveDatabase();

        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    async insertDefaultData() {
        try {
            // Insert default admin user if not exists
            const adminExists = this.db.exec('SELECT COUNT(*) as count FROM admin_users WHERE username = "admin"');
            if (adminExists[0].values.length === 0 || adminExists[0].values[0][0] === 0) {
                this.db.run(`
                    INSERT INTO admin_users (username, password, full_name, email, role)
                    VALUES (?, ?, ?, ?, ?)
                `, ['admin', 'password', 'System Administrator', 'admin@library.com', 'admin']);
            }

            // Insert sample staff members if not exists
            const staffCount = this.db.exec('SELECT COUNT(*) as count FROM staffs');
            if (staffCount[0].values.length === 0 || staffCount[0].values[0][0] === 0) {
                const sampleStaffs = [
                    ['Jane Doe', 'jane.doe@library.com', 'Librarian', '+1 (555) 123-4567', 'Reference', '2023-01-15'],
                    ['John Smith', 'john.smith@library.com', 'Assistant', '+1 (555) 234-5678', 'Circulation', '2023-03-20'],
                    ['Maria Garcia', 'maria.garcia@library.com', 'Manager', '+1 (555) 345-6789', 'Administration', '2022-11-10']
                ];

                for (const staff of sampleStaffs) {
                    this.db.run(`
                        INSERT INTO staffs (name, email, role, phone, department, hire_date)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, staff);
                }
            }

            // Insert sample books if not exists
            const bookCount = this.db.exec('SELECT COUNT(*) as count FROM books');
            if (bookCount[0].values.length === 0 || bookCount[0].values[0][0] === 0) {
                const sampleBooks = [
                    ['978-0-7475-3269-9', 'Harry Potter and the Philosopher\'s Stone', 'J.K. Rowling', 'Bloomsbury', 1997, 'Fantasy', 5, 5, 'Fiction Section'],
                    ['978-0-14-028333-4', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Scribner', 1925, 'Classic', 3, 3, 'Classic Section'],
                    ['978-0-06-112008-4', 'To Kill a Mockingbird', 'Harper Lee', 'Harper Perennial', 1960, 'Classic', 4, 4, 'Classic Section']
                ];

                for (const book of sampleBooks) {
                    this.db.run(`
                        INSERT INTO books (isbn, title, author, publisher, publication_year, category, copies_available, total_copies, location)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, book);
                }
            }

            // Insert sample library users if not exists
            const userCount = this.db.exec('SELECT COUNT(*) as count FROM library_users');
            if (userCount[0].values.length === 0 || userCount[0].values[0][0] === 0) {
                const sampleUsers = [
                    // Admin users
                    ['admin', 'password', 'admin@library.com', 'System', 'Administrator', '', '+1 (555) 000-0001', '123 Admin St', 'admin', 'System Administrator', 'IT', null, null, null, null, null, null, null, null, null, null, null, 'Active', 1],
                    ['librarian', 'password', 'librarian@library.com', 'Jane', 'Doe', 'Marie', '+1 (555) 123-4567', '456 Library Ave', 'staff', 'Senior Librarian', 'Reference', null, null, null, null, null, null, null, null, null, '2023-01-15', null, 'Active', 1],
                    
                    // Staff users
                    ['assistant', 'password', 'assistant@library.com', 'John', 'Smith', 'David', '+1 (555) 234-5678', '789 Staff Rd', 'staff', 'Library Assistant', 'Circulation', null, null, null, null, null, null, null, null, null, null, '2023-03-20', 'Active', 1],
                    ['manager', 'password', 'manager@library.com', 'Maria', 'Garcia', 'Isabella', '+1 (555) 345-6789', '321 Manager Blvd', 'staff', 'Library Manager', 'Administration', null, null, null, null, null, null, null, null, null, null, '2022-11-10', 'Active', 1],
                    
                    // Member users
                    ['alice.brown', 'password', 'alice.brown@email.com', 'Alice', 'Brown', 'Elizabeth', '+1 (555) 111-2222', '123 Member St', 'member', 'Regular Member', null, 'MEM-001', null, '1990-05-15', 'Female', null, null, null, null, '2023-06-01', null, 'Active', 1],
                    ['bob.lee', 'password', 'bob.lee@email.com', 'Bob', 'Lee', 'Michael', '+1 (555) 222-3333', '456 Patron Ave', 'member', 'Student Member', null, 'MEM-002', null, '1995-08-22', 'Male', null, null, null, null, '2023-07-15', null, 'Active', 1],
                    ['cathy.white', 'password', 'cathy.white@email.com', 'Cathy', 'White', 'Anne', '+1 (555) 333-4444', '789 Senior Rd', 'member', 'Senior Member', null, 'MEM-003', null, '1965-12-10', 'Female', null, null, null, null, '2023-05-20', null, 'Active', 1],
                    
                    // Student users
                    ['john.doe', 'password', 'john.doe@student.edu', 'John', 'Doe', 'Michael', '+1 (555) 444-5555', '123 Campus St', 'student', 'Student', null, null, '2023-001', '2005-03-15', 'Male', 'Computer Science', '2nd Year', 'A', '2023-08-15', null, null, null, 'Active', 1],
                    ['sarah.johnson', 'password', 'sarah.johnson@student.edu', 'Sarah', 'Johnson', 'Elizabeth', '+1 (555) 555-6666', '456 University Ave', 'student', 'Student', null, null, '2023-002', '2004-07-22', 'Female', 'Business Administration', '3rd Year', 'B', '2023-08-15', null, null, null, 'Active', 1],
                    ['michael.chen', 'password', 'michael.chen@student.edu', 'Michael', 'Chen', 'David', '+1 (555) 666-7777', '789 College Rd', 'student', 'Student', null, null, '2023-003', '2005-11-08', 'Male', 'Engineering', '1st Year', 'C', '2023-08-15', null, null, null, 'Active', 1]
                ];

                for (const user of sampleUsers) {
                    try {
                        this.db.run(`
                            INSERT INTO library_users (username, password, email, first_name, last_name, middle_name, phone, address, user_type, role, department, membership_id, student_id, date_of_birth, gender, course, year_level, section, enrollment_date, membership_date, hire_date, status, is_verified)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, user);
                    } catch (userError) {
                        console.error('Error inserting user:', user[0], userError);
                        // Continue with other users even if one fails
                    }
                }
            }

        } catch (error) {
            console.error('Error inserting default data:', error);
            throw error;
        }
    }

    saveDatabase() {
        if (this.db) {
            const data = this.db.export();
            fs.writeFileSync(this.dbPath, data);
        }
    }

    // Admin authentication
    async authenticateAdmin(username, password) {
        try {
            const result = this.db.exec(
                'SELECT * FROM admin_users WHERE username = ? AND password = ?',
                [username, password]
            );
            
            if (result.length > 0 && result[0].values.length > 0) {
                const user = result[0];
                const userId = user.values[0][0]; // Assuming id is the first column
                
                // Update last login
                this.db.run(
                    'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                    [userId]
                );
                this.saveDatabase();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    // Get admin user by username
    async getAdminByUsername(username) {
        try {
            const result = this.db.exec(
                'SELECT * FROM admin_users WHERE username = ?',
                [username]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const user = {};
                columns.forEach((col, index) => {
                    user[col] = values[index];
                });
                return user;
            }
            return null;
        } catch (error) {
            console.error('Get admin error:', error);
            throw error;
        }
    }

    // Get all admin users
    async getAllAdmins() {
        try {
            const result = this.db.exec('SELECT * FROM admin_users ORDER BY created_at DESC');
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Get all admins error:', error);
            throw error;
        }
    }

    // Helper method to format SQL.js results
    formatResult(sqlResult) {
        const columns = sqlResult.columns;
        const values = sqlResult.values;
        return values.map(row => {
            const obj = {};
            columns.forEach((col, index) => {
                obj[col] = row[index];
            });
            return obj;
        });
    }

    // Add new admin user
    async addAdminUser(data) {
        try {
            this.db.run(`
                INSERT INTO admin_users (username, password, full_name, email, role)
                VALUES (?, ?, ?, ?, ?)
            `, [data.username, data.password, data.full_name, data.email, data.role]);
            
            this.saveDatabase();
            
            const result = this.db.exec(
                'SELECT * FROM admin_users WHERE username = ?',
                [data.username]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const user = {};
                columns.forEach((col, index) => {
                    user[col] = values[index];
                });
                return user;
            }
            return data;
        } catch (error) {
            console.error('Add admin error:', error);
            throw error;
        }
    }

    // Update admin user
    async updateAdminUser(id, data) {
        try {
            this.db.run(`
                UPDATE admin_users 
                SET username = ?, password = ?, full_name = ?, email = ?, role = ?
                WHERE id = ?
            `, [data.username, data.password, data.full_name, data.email, data.role, id]);
            this.saveDatabase();
            return { id, ...data };
        } catch (error) {
            console.error('Update admin error:', error);
            throw error;
        }
    }

    // Delete admin user
    async deleteAdminUser(id) {
        try {
            this.db.run('DELETE FROM admin_users WHERE id = ?', [id]);
            this.saveDatabase();
            return { id };
        } catch (error) {
            console.error('Delete admin error:', error);
            throw error;
        }
    }

    // Add attendance
    async addAttendance(data) {
        try {
            this.db.run(`
                INSERT INTO attendance (date, name, library_number, purpose, time)
                VALUES (?, ?, ?, ?, ?)
            `, [data.date, data.name, data.library_number, data.purpose, data.time]);
            
            this.saveDatabase();
            
            const result = this.db.exec(
                'SELECT * FROM attendance WHERE date = ? AND name = ? ORDER BY id DESC LIMIT 1',
                [data.date, data.name]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const attendance = {};
                columns.forEach((col, index) => {
                    attendance[col] = values[index];
                });
                return attendance;
            }
            return data;
        } catch (error) {
            console.error('Add attendance error:', error);
            throw error;
        }
    }

    // Get attendance
    async getAttendance() {
        try {
            const result = this.db.exec('SELECT * FROM attendance ORDER BY date DESC');
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Get attendance error:', error);
            throw error;
        }
    }

    // Get all staffs
    async getAllStaffs() {
        try {
            const result = this.db.exec('SELECT * FROM staffs ORDER BY created_at DESC');
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Get all staffs error:', error);
            throw error;
        }
    }

    // Get staff by ID
    async getStaffById(id) {
        try {
            const result = this.db.exec('SELECT * FROM staffs WHERE id = ?', [id]);
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const staff = {};
                columns.forEach((col, index) => {
                    staff[col] = values[index];
                });
                return staff;
            }
            return null;
        } catch (error) {
            console.error('Get staff error:', error);
            throw error;
        }
    }

    // Add staff
    async addStaff(data) {
        try {
            this.db.run(`
                INSERT INTO staffs (name, email, role, phone, department, hire_date)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [data.name, data.email, data.role, data.phone, data.department, data.hire_date]);
            
            this.saveDatabase();
            
            const result = this.db.exec(
                'SELECT * FROM staffs WHERE email = ? ORDER BY id DESC LIMIT 1',
                [data.email]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const staff = {};
                columns.forEach((col, index) => {
                    staff[col] = values[index];
                });
                return staff;
            }
            return data;
        } catch (error) {
            console.error('Add staff error:', error);
            throw error;
        }
    }

    // Update staff
    async updateStaff(id, data) {
        try {
            this.db.run(`
                UPDATE staffs 
                SET name = ?, email = ?, role = ?, phone = ?, department = ?, hire_date = ?, status = ?
                WHERE id = ?
            `, [data.name, data.email, data.role, data.phone, data.department, data.hire_date, data.status, id]);
            this.saveDatabase();
            return { id, ...data };
        } catch (error) {
            console.error('Update staff error:', error);
            throw error;
        }
    }

    // Delete staff
    async deleteStaff(id) {
        try {
            this.db.run('DELETE FROM staffs WHERE id = ?', [id]);
            this.saveDatabase();
            return { id };
        } catch (error) {
            console.error('Delete staff error:', error);
            throw error;
        }
    }

    // Get all members
    async getAllMembers() {
        try {
            const result = this.db.exec('SELECT * FROM members ORDER BY created_at DESC');
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Get all members error:', error);
            throw error;
        }
    }

    // Get member by ID
    async getMemberById(id) {
        try {
            const result = this.db.exec('SELECT * FROM members WHERE id = ?', [id]);
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const member = {};
                columns.forEach((col, index) => {
                    member[col] = values[index];
                });
                return member;
            }
            return null;
        } catch (error) {
            console.error('Get member error:', error);
            throw error;
        }
    }

    // Add member
    async addMember(data) {
        try {
            this.db.run(`
                INSERT INTO members (member_id, name, email, phone, address, membership_date)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [data.member_id, data.name, data.email, data.phone, data.address, data.membership_date]);
            
            this.saveDatabase();
            
            const result = this.db.exec(
                'SELECT * FROM members WHERE member_id = ? ORDER BY id DESC LIMIT 1',
                [data.member_id]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const member = {};
                columns.forEach((col, index) => {
                    member[col] = values[index];
                });
                return member;
            }
            return data;
        } catch (error) {
            console.error('Add member error:', error);
            throw error;
        }
    }

    // Update member
    async updateMember(id, data) {
        try {
            this.db.run(`
                UPDATE members 
                SET member_id = ?, name = ?, email = ?, phone = ?, address = ?, membership_date = ?, status = ?
                WHERE id = ?
            `, [data.member_id, data.name, data.email, data.phone, data.address, data.membership_date, data.status, id]);
            this.saveDatabase();
            return { id, ...data };
        } catch (error) {
            console.error('Update member error:', error);
            throw error;
        }
    }

    // Delete member
    async deleteMember(id) {
        try {
            this.db.run('DELETE FROM members WHERE id = ?', [id]);
            this.saveDatabase();
            return { id };
        } catch (error) {
            console.error('Delete member error:', error);
            throw error;
        }
    }

    // Get all books
    async getAllBooks() {
        try {
            const result = this.db.exec('SELECT * FROM books ORDER BY created_at DESC');
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Get all books error:', error);
            throw error;
        }
    }

    // Get book by ID
    async getBookById(id) {
        try {
            const result = this.db.exec('SELECT * FROM books WHERE id = ?', [id]);
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const book = {};
                columns.forEach((col, index) => {
                    book[col] = values[index];
                });
                return book;
            }
            return null;
        } catch (error) {
            console.error('Get book error:', error);
            throw error;
        }
    }

    // Add book
    async addBook(data) {
        try {
            this.db.run(`
                INSERT INTO books (isbn, title, author, publisher, publication_year, category, copies_available, total_copies, location)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [data.isbn, data.title, data.author, data.publisher, data.publication_year, data.category, data.copies_available, data.total_copies, data.location]);
            
            this.saveDatabase();
            
            const result = this.db.exec(
                'SELECT * FROM books WHERE isbn = ? ORDER BY id DESC LIMIT 1',
                [data.isbn]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const book = {};
                columns.forEach((col, index) => {
                    book[col] = values[index];
                });
                return book;
            }
            return data;
        } catch (error) {
            console.error('Add book error:', error);
            throw error;
        }
    }

    // Update book
    async updateBook(id, data) {
        try {
            this.db.run(`
                UPDATE books 
                SET isbn = ?, title = ?, author = ?, publisher = ?, publication_year = ?, category = ?, copies_available = ?, total_copies = ?, location = ?
                WHERE id = ?
            `, [data.isbn, data.title, data.author, data.publisher, data.publication_year, data.category, data.copies_available, data.total_copies, data.location, id]);
            this.saveDatabase();
            return { id, ...data };
        } catch (error) {
            console.error('Update book error:', error);
            throw error;
        }
    }

    // Delete book
    async deleteBook(id) {
        try {
            this.db.run('DELETE FROM books WHERE id = ?', [id]);
            this.saveDatabase();
            return { id };
        } catch (error) {
            console.error('Delete book error:', error);
            throw error;
        }
    }

    // Get all borrowed books
    async getAllBorrowedBooks() {
        try {
            const result = this.db.exec(`
                SELECT bb.*, b.title as book_title, m.name as member_name
                FROM borrowed_books bb
                LEFT JOIN books b ON bb.book_id = b.id
                LEFT JOIN members m ON bb.member_id = m.id
                ORDER BY bb.borrowed_date DESC
            `);
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Get all borrowed books error:', error);
            throw error;
        }
    }

    // Add borrowed book
    async addBorrowedBook(data) {
        try {
            this.db.run(`
                INSERT INTO borrowed_books (book_id, member_id, borrowed_date, due_date)
                VALUES (?, ?, ?, ?)
            `, [data.book_id, data.member_id, data.borrowed_date, data.due_date]);
            
            // Update book availability
            this.db.run(
                'UPDATE books SET copies_available = copies_available - 1 WHERE id = ?',
                [data.book_id]
            );
            
            this.saveDatabase();
            
            const result = this.db.exec(
                'SELECT * FROM borrowed_books WHERE book_id = ? AND member_id = ? ORDER BY id DESC LIMIT 1',
                [data.book_id, data.member_id]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const borrowedBook = {};
                columns.forEach((col, index) => {
                    borrowedBook[col] = values[index];
                });
                return borrowedBook;
            }
            return data;
        } catch (error) {
            console.error('Add borrowed book error:', error);
            throw error;
        }
    }

    // Return book
    async returnBook(id) {
        try {
            this.db.run(`
                UPDATE borrowed_books 
                SET returned_date = CURRENT_DATE, status = 'Returned'
                WHERE id = ?
            `, [id]);
            
            // Update book availability
            this.db.run(
                'UPDATE books SET copies_available = copies_available + 1 WHERE id = (SELECT book_id FROM borrowed_books WHERE id = ?)',
                [id]
            );
            
            this.saveDatabase();
            return { id };
        } catch (error) {
            console.error('Return book error:', error);
            throw error;
        }
    }

    // Get all announcements
    async getAllAnnouncements() {
        try {
            const result = this.db.exec(`
                SELECT a.*, au.full_name as author_name
                FROM announcements a
                LEFT JOIN admin_users au ON a.author_id = au.id
                WHERE a.is_active = 1
                ORDER BY a.created_at DESC
            `);
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Get all announcements error:', error);
            throw error;
        }
    }

    // Add announcement
    async addAnnouncement(data) {
        try {
            this.db.run(`
                INSERT INTO announcements (title, content, author_id, priority)
                VALUES (?, ?, ?, ?)
            `, [data.title, data.content, data.author_id, data.priority]);
            
            this.saveDatabase();
            
            const result = this.db.exec(
                'SELECT * FROM announcements WHERE title = ? ORDER BY id DESC LIMIT 1',
                [data.title]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const announcement = {};
                columns.forEach((col, index) => {
                    announcement[col] = values[index];
                });
                return announcement;
            }
            return data;
        } catch (error) {
            console.error('Add announcement error:', error);
            throw error;
        }
    }

    // Get all feedbacks
    async getAllFeedbacks() {
        try {
            const result = this.db.exec(`
                SELECT f.*, m.name as member_name
                FROM feedbacks f
                LEFT JOIN members m ON f.member_id = m.id
                ORDER BY f.created_at DESC
            `);
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Get all feedbacks error:', error);
            throw error;
        }
    }

    // Add feedback
    async addFeedback(data) {
        try {
            this.db.run(`
                INSERT INTO feedbacks (member_id, subject, message, rating)
                VALUES (?, ?, ?, ?)
            `, [data.member_id, data.subject, data.message, data.rating]);
            
            this.saveDatabase();
            
            const result = this.db.exec(
                'SELECT * FROM feedbacks WHERE member_id = ? ORDER BY id DESC LIMIT 1',
                [data.member_id]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const feedback = {};
                columns.forEach((col, index) => {
                    feedback[col] = values[index];
                });
                return feedback;
            }
            return data;
        } catch (error) {
            console.error('Add feedback error:', error);
            throw error;
        }
    }

    // Get dashboard stats
    async getDashboardStats() {
        try {
            const stats = {};

            // Total members
            const memberCount = this.db.exec('SELECT COUNT(*) as count FROM members WHERE status = "Active"');
            stats.totalMembers = memberCount[0].values[0][0];

            // Total library users
            const userCount = this.db.exec('SELECT COUNT(*) as count FROM library_users WHERE status = "Active"');
            stats.totalUsers = userCount[0].values[0][0];

            // Users by type
            const usersByType = this.db.exec(`
                SELECT user_type, COUNT(*) as count 
                FROM library_users 
                WHERE status = "Active" 
                GROUP BY user_type 
                ORDER BY count DESC
            `);
            stats.usersByType = usersByType.length > 0 ? this.formatResult(usersByType[0]) : [];

            // Total books
            const bookCount = this.db.exec('SELECT COUNT(*) as count FROM books');
            stats.totalBooks = bookCount[0].values[0][0];

            // Available books
            const availableBooks = this.db.exec('SELECT SUM(copies_available) as count FROM books');
            stats.availableBooks = availableBooks[0].values[0][0] || 0;

            // Borrowed books
            const borrowedBooks = this.db.exec('SELECT COUNT(*) as count FROM borrowed_books WHERE status = "Borrowed"');
            stats.borrowedBooks = borrowedBooks[0].values[0][0];

            // Total staff
            const staffCount = this.db.exec('SELECT COUNT(*) as count FROM staffs WHERE status = "Active"');
            stats.totalStaff = staffCount[0].values[0][0];

            // Recent activities (last 7 days)
            const recentActivities = this.db.exec('SELECT COUNT(*) as count FROM borrowed_books WHERE borrowed_date >= date("now", "-7 days")');
            stats.recentActivities = recentActivities[0].values[0][0];

            return stats;
        } catch (error) {
            console.error('Get dashboard stats error:', error);
            throw error;
        }
    }

    // ===== LIBRARY USERS MANAGEMENT =====

    // Authenticate library user
    async authenticateLibraryUser(username, password) {
        try {
            const result = this.db.exec(
                'SELECT * FROM library_users WHERE username = ? AND password = ? AND status = "Active"',
                [username, password]
            );
            
            if (result.length > 0 && result[0].values.length > 0) {
                const user = result[0];
                const userId = user.values[0][0];
                
                // Update last login
                this.db.run(
                    'UPDATE library_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                    [userId]
                );
                this.saveDatabase();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Library user authentication error:', error);
            throw error;
        }
    }

    // Get library user by username
    async getLibraryUserByUsername(username) {
        try {
            const result = this.db.exec(
                'SELECT * FROM library_users WHERE username = ?',
                [username]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const user = {};
                columns.forEach((col, index) => {
                    user[col] = values[index];
                });
                return user;
            }
            return null;
        } catch (error) {
            console.error('Get library user error:', error);
            throw error;
        }
    }

    // Get library user by ID
    async getLibraryUserById(id) {
        try {
            const result = this.db.exec('SELECT * FROM library_users WHERE id = ?', [id]);
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const user = {};
                columns.forEach((col, index) => {
                    user[col] = values[index];
                });
                return user;
            }
            return null;
        } catch (error) {
            console.error('Get library user by ID error:', error);
            throw error;
        }
    }

    // Get all library users
    async getAllLibraryUsers() {
        try {
            const result = this.db.exec('SELECT * FROM library_users ORDER BY created_at DESC');
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Get all library users error:', error);
            throw error;
        }
    }

    // Get users by type
    async getLibraryUsersByType(userType) {
        try {
            const result = this.db.exec(
                'SELECT * FROM library_users WHERE user_type = ? ORDER BY last_name, first_name',
                [userType]
            );
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Get library users by type error:', error);
            throw error;
        }
    }

    // Add library user
    async addLibraryUser(data) {
        try {
            this.db.run(`
                INSERT INTO library_users (username, password, email, first_name, last_name, middle_name, phone, address, user_type, role, department, membership_id, student_id, date_of_birth, gender, course, year_level, section, enrollment_date, membership_date, hire_date, status, is_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [data.username, data.password, data.email, data.first_name, data.last_name, data.middle_name, data.phone, data.address, data.user_type, data.role, data.department, data.membership_id, data.student_id, data.date_of_birth, data.gender, data.course, data.year_level, data.section, data.enrollment_date, data.membership_date, data.hire_date, data.status, data.is_verified]);
            
            this.saveDatabase();
            
            const result = this.db.exec(
                'SELECT * FROM library_users WHERE username = ? ORDER BY id DESC LIMIT 1',
                [data.username]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const user = {};
                columns.forEach((col, index) => {
                    user[col] = values[index];
                });
                return user;
            }
            return data;
        } catch (error) {
            console.error('Add library user error:', error);
            throw error;
        }
    }

    // Update library user
    async updateLibraryUser(id, data) {
        try {
            this.db.run(`
                UPDATE library_users 
                SET username = ?, password = ?, email = ?, first_name = ?, last_name = ?, middle_name = ?, phone = ?, address = ?, user_type = ?, role = ?, department = ?, membership_id = ?, student_id = ?, date_of_birth = ?, gender = ?, course = ?, year_level = ?, section = ?, enrollment_date = ?, membership_date = ?, hire_date = ?, status = ?, is_verified = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [data.username, data.password, data.email, data.first_name, data.last_name, data.middle_name, data.phone, data.address, data.user_type, data.role, data.department, data.membership_id, data.student_id, data.date_of_birth, data.gender, data.course, data.year_level, data.section, data.enrollment_date, data.membership_date, data.hire_date, data.status, data.is_verified, id]);
            this.saveDatabase();
            return { id, ...data };
        } catch (error) {
            console.error('Update library user error:', error);
            throw error;
        }
    }

    // Delete library user
    async deleteLibraryUser(id) {
        try {
            this.db.run('DELETE FROM library_users WHERE id = ?', [id]);
            this.saveDatabase();
            return { id };
        } catch (error) {
            console.error('Delete library user error:', error);
            throw error;
        }
    }

    // Search library users
    async searchLibraryUsers(query) {
        try {
            const result = this.db.exec(`
                SELECT * FROM library_users 
                WHERE username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR membership_id LIKE ? OR student_id LIKE ?
                ORDER BY last_name, first_name
            `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Search library users error:', error);
            throw error;
        }
    }

    // Create user session
    async createUserSession(userId, sessionToken, ipAddress, userAgent) {
        try {
            this.db.run(`
                INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent)
                VALUES (?, ?, ?, ?)
            `, [userId, sessionToken, ipAddress, userAgent]);
            this.saveDatabase();
            return { userId, sessionToken };
        } catch (error) {
            console.error('Create user session error:', error);
            throw error;
        }
    }

    // Validate user session
    async validateUserSession(sessionToken) {
        try {
            const result = this.db.exec(
                'SELECT * FROM user_sessions WHERE session_token = ? AND is_active = 1',
                [sessionToken]
            );
            if (result.length > 0 && result[0].values.length > 0) {
                const columns = result[0].columns;
                const values = result[0].values[0];
                const session = {};
                columns.forEach((col, index) => {
                    session[col] = values[index];
                });
                return session;
            }
            return null;
        } catch (error) {
            console.error('Validate user session error:', error);
            throw error;
        }
    }

    // Logout user session
    async logoutUserSession(sessionToken) {
        try {
            this.db.run(`
                UPDATE user_sessions 
                SET logout_time = CURRENT_TIMESTAMP, is_active = 0
                WHERE session_token = ?
            `, [sessionToken]);
            this.saveDatabase();
            return { sessionToken };
        } catch (error) {
            console.error('Logout user session error:', error);
            throw error;
        }
    }

    // Get user permissions
    async getUserPermissions(userId) {
        try {
            const result = this.db.exec(
                'SELECT permission_name, permission_value FROM user_permissions WHERE user_id = ?',
                [userId]
            );
            if (result.length > 0) {
                return this.formatResult(result[0]);
            }
            return [];
        } catch (error) {
            console.error('Get user permissions error:', error);
            throw error;
        }
    }

    // Set user permission
    async setUserPermission(userId, permissionName, permissionValue) {
        try {
            this.db.run(`
                INSERT OR REPLACE INTO user_permissions (user_id, permission_name, permission_value)
                VALUES (?, ?, ?)
            `, [userId, permissionName, permissionValue]);
            this.saveDatabase();
            return { userId, permissionName, permissionValue };
        } catch (error) {
            console.error('Set user permission error:', error);
            throw error;
        }
    }

    // Close database connection
    async close() {
        // Save database before closing
        this.saveDatabase();
        return Promise.resolve();
    }
}

module.exports = DatabaseManager; 