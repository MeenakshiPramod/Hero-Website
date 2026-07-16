const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static assets (images, fonts, etc. directly from root)
app.use(express.static(path.join(__dirname)));

// Load catalog database
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

// API endpoint to retrieve catalog
app.get('/api/catalog', (req, res) => {
    res.json(catalogData);
});

// Map root / to serve our premium showroom hub HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pavizham_hero_premium_showroom_hub.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
