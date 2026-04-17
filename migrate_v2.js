const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'netsim.db');
const db = new sqlite3.Database(dbPath);

console.log('Running SQLite Schema Alterations...');

db.serialize(() => {
    db.run("ALTER TABLE users ADD COLUMN backup_codes TEXT", (err) => {
        if(err) console.log("backup_codes exists or error:", err.message);
        else console.log("SUCCESS: Added backup_codes.");
    });
    db.run("ALTER TABLE users ADD COLUMN deletion_requested INTEGER DEFAULT 0", (err) => {
        if(err) console.log("deletion_requested exists or error:", err.message);
        else console.log("SUCCESS: Added deletion_requested.");
    });
});

db.close(() => {
   console.log('Migration Complete.');
});
