const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'netsim.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Could not connect to database", err);
    }
});

// Initialize database tables
db.serialize(() => {
    // Users table (added xp and level for leaderboard)
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            device_fingerprint TEXT NOT NULL,
            registration_ip TEXT,
            is_vpn INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            credits INTEGER DEFAULT 0,
            xp REAL DEFAULT 0,
            level INTEGER DEFAULT 1,
            backup_codes TEXT,
            deletion_requested INTEGER DEFAULT 0,
            policy_accepted INTEGER DEFAULT 1,
            policy_accepted_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);

    // Sessions table
    db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Saves table
    db.run(`
        CREATE TABLE IF NOT EXISTS saves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            slot_id TEXT NOT NULL,
            state_json TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, slot_id)
        )
    `);

    // Device Registry
    db.run(`
        CREATE TABLE IF NOT EXISTS device_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fingerprint TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Transactions table (now supports GCash real-currency)
    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL, -- 'purchase', 'spend', 'convert', 'donate'
            amount INTEGER NOT NULL, -- credits involved
            real_money_amount REAL, -- PHP cost
            currency TEXT DEFAULT 'PHP',
            payment_provider TEXT DEFAULT 'GCASH',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
});

module.exports = db;
