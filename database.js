const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'showroom.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database showroom.db.');
    }
});

// Initialize database schema
db.serialize(() => {
    // 1. test_rides table
    db.run(`CREATE TABLE IF NOT EXISTS test_rides (
        id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        phone TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )`);

    // 2. enquiries table
    db.run(`CREATE TABLE IF NOT EXISTS enquiries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        model TEXT NOT NULL,
        finance TEXT NOT NULL,
        notes TEXT,
        timestamp TEXT NOT NULL
    )`);

    // 3. pre_approvals table
    db.run(`CREATE TABLE IF NOT EXISTS pre_approvals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        bike TEXT NOT NULL,
        emi TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )`);

    // 4. reviews table
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        date TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )`);

    // 5. service_status table
    db.run(`CREATE TABLE IF NOT EXISTS service_status (
        job_card TEXT PRIMARY KEY,
        heading TEXT NOT NULL,
        body TEXT NOT NULL,
        glow_color TEXT NOT NULL
    )`);
    
    // Seed service status and reviews if empty
    db.get("SELECT COUNT(*) as count FROM service_status", (err, row) => {
        if (!err && row.count === 0) {
            console.log("Seeding service status data...");
            const stmt = db.prepare("INSERT INTO service_status (job_card, heading, body, glow_color) VALUES (?, ?, ?, ?)");
            stmt.run("PV-901", "In Wash Bay", "Servicing is 85% complete. Your bike is entering the final polishing loop. Pickup expected in 18 minutes.", "bg-yellow-500");
            stmt.run("PV-902", "Awaiting Spares", "We are awaiting authorization on an air-filter swap. Estimated delivery shifted to 6:00 PM today.", "bg-amber-500");
            stmt.run("PV-904", "Completed & Ready", "Completed 90-minute express service profile. Your vehicle is safely parked in Bay 3 for pickup.", "bg-green-500");
            stmt.finalize();
        }
    });

    db.get("SELECT COUNT(*) as count FROM reviews", (err, row) => {
        if (!err && row.count <= 5) {
            console.log("Seeding latest Google reviews...");
            db.run("DELETE FROM reviews", () => {
                const stmt = db.prepare("INSERT INTO reviews (author, rating, comment, date, timestamp) VALUES (?, ?, ?, ?, ?)");
                const defaults = [
                    { author: 'ASWATHI CHANDRAN', rating: 5, comment: 'Prompt delivery and excellent customer service. Highly recommended!', date: '28-06-2026' },
                    { author: 'Naufal Kozhukkal', rating: 5, comment: 'Professional staff and smooth purchasing experience for my new bike.', date: '10-06-2026' },
                    { author: 'Raapz Razi', rating: 5, comment: 'Nallath (Good customer service and support)', date: '16-05-2026' },
                    { author: 'sreejith p', rating: 5, comment: 'One of the best Hero service centre in kannur.Good customer support and service.Please go there and experience it.', date: '24-04-2026' },
                    { author: 'damodaran Sudhara', rating: 5, comment: 'iam a loyal customer of pavizham associates.I got good service and experience from there.Totally Good and liked it.👍👍👍', date: '24-04-2026' },
                    { author: 'Akash VP', rating: 5, comment: 'Delivered the vehicle within a week. Good customer support and completely satisfied.', date: '12-04-2026' }
                ];
                const now = new Date().toISOString();
                defaults.forEach(r => {
                    stmt.run(r.author, r.rating, r.comment, r.date, now);
                });
                stmt.finalize();
            });
        }
    });
});

module.exports = {
    // Test Rides
    addTestRide: (model, phone, callback) => {
        const id = `TR-${Date.now()}`;
        const timestamp = new Date().toISOString();
        db.run(
            `INSERT INTO test_rides (id, model, phone, timestamp) VALUES (?, ?, ?, ?)`,
            [id, model, phone, timestamp],
            function(err) {
                callback(err, { id, model, phone, timestamp });
            }
        );
    },

    // Enquiries
    addEnquiry: (name, phone, model, finance, notes, callback) => {
        const id = `ENQ-${Date.now()}`;
        const timestamp = new Date().toISOString();
        db.run(
            `INSERT INTO enquiries (id, name, phone, model, finance, notes, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, name, phone, model, finance, notes, timestamp],
            function(err) {
                callback(err, { id, name, phone, model, finance, notes, timestamp });
            }
        );
    },

    // Pre Approvals
    addPreApproval: (name, phone, bike, emi, callback) => {
        const id = `PRE-${Date.now()}`;
        const timestamp = new Date().toISOString();
        db.run(
            `INSERT INTO pre_approvals (id, name, phone, bike, emi, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, name, phone, bike, emi, timestamp],
            function(err) {
                callback(err, { id, name, phone, bike, emi, timestamp });
            }
        );
    },

    // Service Status
    getServiceStatus: (jobCard, callback) => {
        db.get(
            `SELECT heading, body, glow_color as glowColor FROM service_status WHERE job_card = ?`,
            [jobCard],
            (err, row) => {
                callback(err, row);
            }
        );
    },

    // Reviews
    getReviews: (callback) => {
        db.all(
            `SELECT author, rating, comment, date FROM reviews ORDER BY id DESC`,
            [],
            (err, rows) => {
                callback(err, rows);
            }
        );
    },

    addReview: (author, rating, comment, date, callback) => {
        const timestamp = new Date().toISOString();
        db.run(
            `INSERT INTO reviews (author, rating, comment, date, timestamp) VALUES (?, ?, ?, ?, ?)`,
            [author, rating, comment, date, timestamp],
            function(err) {
                if (err) return callback(err);
                db.all(
                    `SELECT author, rating, comment, date FROM reviews ORDER BY id DESC`,
                    [],
                    (err, rows) => {
                        callback(err, rows);
                    }
                );
            }
        );
    },

    syncGoogleReviews: (callback) => {
        db.get("SELECT COUNT(*) as count FROM reviews WHERE author = 'ASWATHI CHANDRAN'", (err, row) => {
            if (err) return callback(err);
            if (row.count === 0) {
                const now = new Date().toISOString();
                const stmt = db.prepare("INSERT INTO reviews (author, rating, comment, date, timestamp) VALUES (?, ?, ?, ?, ?)");
                stmt.run('ASWATHI CHANDRAN', 5, 'Prompt delivery and excellent customer service. Highly recommended!', '28-06-2026', now);
                stmt.run('Naufal Kozhukkal', 5, 'Professional staff and smooth purchasing experience for my new bike.', '10-06-2026', now);
                stmt.finalize(callback);
            } else {
                callback(null);
            }
        });
    }
};
