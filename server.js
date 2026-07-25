const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static assets (images, fonts, etc. directly from root)
app.use(express.static(path.join(__dirname)));

// Load catalog database from JSON (since it is readonly vehicle specs catalog)
let catalogData = { vehiclesList: [], specsDetail: {} };
try {
    const catalogPath = path.join(__dirname, 'data', 'catalog.json');
    if (fs.existsSync(catalogPath)) {
        const rawData = fs.readFileSync(catalogPath, 'utf8');
        catalogData = JSON.parse(rawData);
        console.log(`Loaded catalog with ${catalogData.vehiclesList.length} vehicles.`);
    } else {
        console.error('Catalog file not found at:', catalogPath);
    }
} catch (error) {
    console.error('Error reading catalog file:', error);
}

// 1. GET /api/catalog - Retrieve catalog
app.get('/api/catalog', (req, res) => {
    res.json(catalogData);
});

// 2. POST /api/test-ride - Schedule quick test ride
app.post('/api/test-ride', (req, res) => {
    const { model, phone } = req.body;
    if (!model || !phone) {
        return res.status(400).json({ error: 'Model and Phone number are required' });
    }
    
    db.addTestRide(model, phone, (err, booking) => {
        if (err) {
            console.error('Error saving test ride:', err.message);
            return res.status(500).json({ error: 'Database write error' });
        }
        console.log(`Scheduled test ride for ${model} to ${phone}`);
        res.status(201).json({ message: 'Test ride booked successfully', booking });
    });
});

// 3. POST /api/enquiry - Log detailed showroom enquiry
app.post('/api/enquiry', (req, res) => {
    const { name, phone, model, finance, notes } = req.body;
    if (!name || !phone || !model) {
        return res.status(400).json({ error: 'Name, Phone, and Model are required' });
    }
    
    db.addEnquiry(name, phone, model, finance, notes, (err, enquiry) => {
        if (err) {
            console.error('Error saving enquiry:', err.message);
            return res.status(500).json({ error: 'Database write error' });
        }
        console.log(`Log enquiry from ${name} for ${model}`);
        res.status(201).json({ message: 'Enquiry submitted successfully', enquiry });
    });
});

// 4. POST /api/pre-approval - Submit EMI loan pre-approval
app.post('/api/pre-approval', (req, res) => {
    const { name, phone, bike, emi } = req.body;
    if (!name || !phone || !bike || !emi) {
        return res.status(400).json({ error: 'Name, Phone, Bike, and EMI estimate are required' });
    }
    
    db.addPreApproval(name, phone, bike, emi, (err, preApproval) => {
        if (err) {
            console.error('Error saving pre-approval:', err.message);
            return res.status(500).json({ error: 'Database write error' });
        }
        console.log(`Log loan pre-approval for ${name} - ${bike} (${emi})`);
        res.status(201).json({ message: 'Pre-approval submitted successfully', preApproval });
    });
});

// 5. GET /api/track-status/:id - Live job card service status tracking
app.get('/api/track-status/:id', (req, res) => {
    const jobCardId = req.params.id.toUpperCase().trim();
    
    db.getServiceStatus(jobCardId, (err, statusData) => {
        if (err) {
            console.error('Error fetching service status:', err.message);
            return res.status(500).json({ error: 'Database query error' });
        }
        if (!statusData) {
            return res.status(404).json({ error: 'Job Card not found' });
        }
        res.json(statusData);
    });
});

// 6. GET /api/reviews - Get customer reviews (with automatic regular Google sync)
let lastSyncTime = 0;
app.get('/api/reviews', (req, res) => {
    const now = Date.now();
    // Simulate auto-sync from Google listing if 5 minutes have elapsed since last check
    if (now - lastSyncTime > 5 * 60 * 1000) {
        lastSyncTime = now;
        console.log('[Google Maps Sync] Syncing latest reviews from https://www.google.com/maps/place/M/S.+Pavizham+Associates+-+Hero+MotoCorp/...');
        db.syncGoogleReviews((err) => {
            if (err) {
                console.error('[Google Maps Sync Error]', err.message);
            } else {
                console.log('[Google Maps Sync] Sync completed successfully. Database updated.');
            }
        });
    }

    db.getReviews((err, reviews) => {
        if (err) {
            console.error('Error fetching reviews:', err.message);
            return res.status(500).json({ error: 'Database query error' });
        }
        res.json(reviews);
    });
});

// 7. POST /api/reviews - Submit a new review
app.post('/api/reviews', (req, res) => {
    const { author, rating, comment, date } = req.body;
    if (!author || !rating || !comment) {
        return res.status(400).json({ error: 'Author, Rating, and Comment are required' });
    }
    
    db.addReview(author, rating, comment, date, (err, reviews) => {
        if (err) {
            console.error('Error saving review:', err.message);
            return res.status(500).json({ error: 'Database write error' });
        }
        console.log(`Add review from ${author} - Rating ${rating}`);
        res.json(reviews);
    });
});

// Map root / to serve our premium showroom hub HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pavizham_hero_premium_showroom_hub.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
