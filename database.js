const path = require('path');
const fs = require('fs');

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Seed default data for service status
const defaultServiceStatus = {
    "PV-901": { heading: "In Wash Bay", body: "Servicing is 85% complete. Your bike is entering the final polishing loop. Pickup expected in 18 minutes.", glowColor: "bg-yellow-500" },
    "PV-902": { heading: "Awaiting Spares", body: "We are awaiting authorization on an air-filter swap. Estimated delivery shifted to 6:00 PM today.", glowColor: "bg-amber-500" },
    "PV-904": { heading: "Completed & Ready", body: "Completed 90-minute express service profile. Your vehicle is safely parked in Bay 3 for pickup.", glowColor: "bg-green-500" }
};

// Seed default data for Google reviews
const defaultReviews = [
    { author: 'ASWATHI CHANDRAN', rating: 5, comment: 'Prompt delivery and excellent customer service. Highly recommended!', date: '28-06-2026', timestamp: new Date().toISOString() },
    { author: 'Naufal Kozhukkal', rating: 5, comment: 'Professional staff and smooth purchasing experience for my new bike.', date: '10-06-2026', timestamp: new Date().toISOString() },
    { author: 'Raapz Razi', rating: 5, comment: 'Nallath (Good customer service and support)', date: '16-05-2026', timestamp: new Date().toISOString() },
    { author: 'sreejith p', rating: 5, comment: 'One of the best Hero service centre in kannur.Good customer support and service.Please go there and experience it.', date: '24-04-2026', timestamp: new Date().toISOString() },
    { author: 'damodaran Sudhara', rating: 5, comment: 'iam a loyal customer of pavizham associates.I got good service and experience from there.Totally Good and liked it.👍👍👍', date: '24-04-2026', timestamp: new Date().toISOString() },
    { author: 'Akash VP', rating: 5, comment: 'Delivered the vehicle within a week. Good customer support and completely satisfied.', date: '12-04-2026', timestamp: new Date().toISOString() }
];

// In-memory data store for serverless environments (e.g. Vercel) or when SQLite is unavailable
const memoryStore = {
    test_rides: [],
    enquiries: [],
    pre_approvals: [],
    reviews: [...defaultReviews],
    service_status: { ...defaultServiceStatus }
};

let db = null;
let useSQLite = false;

// Attempt SQLite only when not running in serverless environment
if (!isVercel) {
    try {
        const sqlite3 = require('sqlite3').verbose();
        const dbPath = path.join(__dirname, 'data', 'showroom.db');
        const dataDir = path.dirname(dbPath);

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.warn('[Database] SQLite connection error, defaulting to memory store:', err.message);
                useSQLite = false;
            } else {
                console.log('[Database] Connected to SQLite database showroom.db.');
            }
        });

        useSQLite = true;

        // Initialize SQLite schema & seed
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS test_rides (
                id TEXT PRIMARY KEY,
                model TEXT NOT NULL,
                phone TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS enquiries (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                model TEXT NOT NULL,
                finance TEXT NOT NULL,
                notes TEXT,
                timestamp TEXT NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS pre_approvals (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                bike TEXT NOT NULL,
                emi TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                author TEXT NOT NULL,
                rating INTEGER NOT NULL,
                comment TEXT NOT NULL,
                date TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS service_status (
                job_card TEXT PRIMARY KEY,
                heading TEXT NOT NULL,
                body TEXT NOT NULL,
                glow_color TEXT NOT NULL
            )`);

            // Seed service status if empty
            db.get("SELECT COUNT(*) as count FROM service_status", (err, row) => {
                if (!err && row && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO service_status (job_card, heading, body, glow_color) VALUES (?, ?, ?, ?)");
                    Object.entries(defaultServiceStatus).forEach(([code, item]) => {
                        stmt.run(code, item.heading, item.body, item.glowColor);
                    });
                    stmt.finalize();
                }
            });

            // Seed reviews if empty
            db.get("SELECT COUNT(*) as count FROM reviews", (err, row) => {
                if (!err && row && row.count <= 5) {
                    db.run("DELETE FROM reviews", () => {
                        const stmt = db.prepare("INSERT INTO reviews (author, rating, comment, date, timestamp) VALUES (?, ?, ?, ?, ?)");
                        const now = new Date().toISOString();
                        defaultReviews.forEach(r => {
                            stmt.run(r.author, r.rating, r.comment, r.date, now);
                        });
                        stmt.finalize();
                    });
                }
            });
        });
    } catch (e) {
        console.warn('[Database] SQLite could not be loaded, using memory store:', e.message);
        useSQLite = false;
    }
} else {
    console.log('[Database] Vercel serverless environment detected. Running high-speed in-memory store.');
}

module.exports = {
    // Test Rides
    addTestRide: (model, phone, callback) => {
        const id = `TR-${Date.now()}`;
        const timestamp = new Date().toISOString();
        const record = { id, model, phone, timestamp };

        if (useSQLite && db) {
            db.run(
                `INSERT INTO test_rides (id, model, phone, timestamp) VALUES (?, ?, ?, ?)`,
                [id, model, phone, timestamp],
                function(err) {
                    callback(err, record);
                }
            );
        } else {
            memoryStore.test_rides.push(record);
            callback(null, record);
        }
    },

    // Enquiries
    addEnquiry: (name, phone, model, finance, notes, callback) => {
        const id = `ENQ-${Date.now()}`;
        const timestamp = new Date().toISOString();
        const record = { id, name, phone, model, finance, notes, timestamp };

        if (useSQLite && db) {
            db.run(
                `INSERT INTO enquiries (id, name, phone, model, finance, notes, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [id, name, phone, model, finance, notes, timestamp],
                function(err) {
                    callback(err, record);
                }
            );
        } else {
            memoryStore.enquiries.push(record);
            callback(null, record);
        }
    },

    // Pre Approvals
    addPreApproval: (name, phone, bike, emi, callback) => {
        const id = `PRE-${Date.now()}`;
        const timestamp = new Date().toISOString();
        const record = { id, name, phone, bike, emi, timestamp };

        if (useSQLite && db) {
            db.run(
                `INSERT INTO pre_approvals (id, name, phone, bike, emi, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, name, phone, bike, emi, timestamp],
                function(err) {
                    callback(err, record);
                }
            );
        } else {
            memoryStore.pre_approvals.push(record);
            callback(null, record);
        }
    },

    // Service Status
    getServiceStatus: (jobCard, callback) => {
        if (useSQLite && db) {
            db.get(
                `SELECT heading, body, glow_color as glowColor FROM service_status WHERE job_card = ?`,
                [jobCard],
                (err, row) => {
                    if (err || !row) {
                        callback(null, memoryStore.service_status[jobCard] || null);
                    } else {
                        callback(null, row);
                    }
                }
            );
        } else {
            callback(null, memoryStore.service_status[jobCard] || null);
        }
    },

    // Reviews
    getReviews: (callback) => {
        if (useSQLite && db) {
            db.all(
                `SELECT author, rating, comment, date FROM reviews ORDER BY id DESC`,
                [],
                (err, rows) => {
                    if (err || !rows || rows.length === 0) {
                        callback(null, memoryStore.reviews);
                    } else {
                        callback(null, rows);
                    }
                }
            );
        } else {
            callback(null, memoryStore.reviews);
        }
    },

    addReview: (author, rating, comment, date, callback) => {
        const timestamp = new Date().toISOString();
        const newReview = { author, rating: Number(rating), comment, date, timestamp };

        if (useSQLite && db) {
            db.run(
                `INSERT INTO reviews (author, rating, comment, date, timestamp) VALUES (?, ?, ?, ?, ?)`,
                [author, rating, comment, date, timestamp],
                function(err) {
                    if (err) {
                        memoryStore.reviews.unshift(newReview);
                        return callback(null, memoryStore.reviews);
                    }
                    db.all(
                        `SELECT author, rating, comment, date FROM reviews ORDER BY id DESC`,
                        [],
                        (err, rows) => {
                            callback(null, rows || memoryStore.reviews);
                        }
                    );
                }
            );
        } else {
            memoryStore.reviews.unshift(newReview);
            callback(null, memoryStore.reviews);
        }
    },

    syncGoogleReviews: (callback) => {
        if (useSQLite && db) {
            db.get("SELECT COUNT(*) as count FROM reviews WHERE author = 'ASWATHI CHANDRAN'", (err, row) => {
                if (err && callback) return callback(err);
                if (row && row.count === 0) {
                    const now = new Date().toISOString();
                    const stmt = db.prepare("INSERT INTO reviews (author, rating, comment, date, timestamp) VALUES (?, ?, ?, ?, ?)");
                    defaultReviews.forEach(r => {
                        stmt.run(r.author, r.rating, r.comment, r.date, now);
                    });
                    stmt.finalize(callback);
                } else if (callback) {
                    callback(null);
                }
            });
        } else if (callback) {
            callback(null);
        }
    }
};
