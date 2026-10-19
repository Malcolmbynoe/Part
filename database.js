const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

// Store the database in the project's database folder
const dbPath = path.join(__dirname, "..", "database", "nova.db");

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        year INTEGER,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        image TEXT,
        status TEXT NOT NULL DEFAULT 'available',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        image TEXT,
        status TEXT NOT NULL DEFAULT 'available',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        item_type TEXT NOT NULL,
        item_description TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS rentals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,
        vehicle_id INTEGER NOT NULL,

        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,

        pickup_date TEXT NOT NULL,
        return_date TEXT NOT NULL,

        rate_type TEXT NOT NULL,

        daily_rate REAL,
        weekly_rate REAL,
        monthly_rate REAL,

        total_price REAL NOT NULL DEFAULT 0,

        status TEXT NOT NULL DEFAULT 'pending',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

        FOREIGN KEY(vehicle_id)
        REFERENCES vehicles(id)
        ON DELETE CASCADE
    );

    
`);

// ========================================
// VEHICLE RENTAL RATE COLUMNS
// ========================================

const vehicleColumns = db
    .prepare("PRAGMA table_info(vehicles)")
    .all()
    .map(column => column.name);

if (!vehicleColumns.includes("daily_rate")) {
    db.exec(`
        ALTER TABLE vehicles
        ADD COLUMN daily_rate REAL;
    `);
}

if (!vehicleColumns.includes("weekly_rate")) {
    db.exec(`
        ALTER TABLE vehicles
        ADD COLUMN weekly_rate REAL;
    `);
}

if (!vehicleColumns.includes("monthly_rate")) {
    db.exec(`
        ALTER TABLE vehicles
        ADD COLUMN monthly_rate REAL;
    `);
}

// Create the initial administrator
const adminEmail = "admin@novaauto.com";
const adminPassword = "Nova123!";

const existingAdmin = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(adminEmail);

if (!existingAdmin) {

    const hashedPassword =
        bcrypt.hashSync(adminPassword, 12);

    db.prepare(`
        INSERT INTO users
        (name, email, password, role)
        VALUES (?, ?, ?, ?)
    `).run(
        "Nova Administrator",
        adminEmail,
        hashedPassword,
        "admin"
    );

    console.log("Initial Nova admin account created.");
}

module.exports = db;