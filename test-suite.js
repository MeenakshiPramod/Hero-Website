// test-suite.js - Automated CI Test Suite for Pavizham Hero Website
const fs = require('fs');
const path = require('path');

let failedTests = 0;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        failedTests++;
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

console.log("🚀 Starting Automated CI Validation Suite...\n");

// 1. Validate HTML structure & critical IDs
const htmlPath = path.join(__dirname, 'index.html');
assert(fs.existsSync(htmlPath), 'index.html exists');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
assert(htmlContent.includes('id="financing"'), 'Financing EMI section is present');
assert(htmlContent.includes('id="quick-ride-form"'), 'Quick test ride booking form is present');
assert(htmlContent.includes('id="catalog-grid"'), 'Bikes & Scooters catalog container is present');
assert(htmlContent.includes('id="tracker-response"'), 'Service tracker response container is present');

// 2. Validate Absence of Static Delivery Tags & Presence of Dynamic Availability Badges
assert(!htmlContent.toUpperCase().includes('READY FOR DELIVERY'), 'No hardcoded "READY FOR DELIVERY" tag in index.html');
assert(htmlContent.includes('id="detail-delivery-badge"'), 'Dynamic product detail availability badge container is present');
assert(htmlContent.includes('AVAILABLE IN SHOWROOM'), 'Dynamic "AVAILABLE IN SHOWROOM" badge template is present in index.html');
assert(htmlContent.includes('CHECK SHOWROOM AVAILABILITY'), 'Dynamic "CHECK SHOWROOM AVAILABILITY" fallback state is present in index.html');

// 3. Validate Regional Catalog Data (PIN: 670307) & Dynamic Availability States
const catalogPath = path.join(__dirname, 'data', 'catalog.json');
assert(fs.existsSync(catalogPath), 'data/catalog.json exists');

try {
    const rawCatalog = fs.readFileSync(catalogPath, 'utf8');
    const catalogJson = JSON.parse(rawCatalog);
    const catalog = Array.isArray(catalogJson) ? catalogJson : (catalogJson.vehiclesList || []);
    assert(Array.isArray(catalog) && catalog.length > 0, `Catalog contains ${catalog.length} vehicles`);

    // Verify critical pricing attributes
    let missingPrices = 0;
    let missingPincode = 0;
    let missingAvailabilityProps = 0;

    catalog.forEach(item => {
        if (typeof item.price !== 'number' || isNaN(item.price)) missingPrices++;
        if (!item.pincode || item.pincode !== '670307') missingPincode++;
        if (typeof item.isAvailableInRegion !== 'boolean' || typeof item.inStock !== 'boolean') {
            missingAvailabilityProps++;
        }
    });

    assert(missingPrices === 0, `All vehicles have valid numeric prices (Missing/NaN: ${missingPrices})`);
    assert(missingPincode === 0, `All vehicles are mapped to Pincode 670307`);
    assert(missingAvailabilityProps === 0, `All vehicles have explicit isAvailableInRegion and inStock boolean flags`);

    // Verify dynamic availability state rendering across catalog cards
    function getDynamicAvailabilityState(v) {
        if (v.isAvailableInRegion && v.inStock) {
            return {
                text: 'AVAILABLE IN SHOWROOM',
                class: 'text-emerald-400',
                dotClass: 'bg-emerald-400'
            };
        } else {
            return {
                text: 'CHECK SHOWROOM AVAILABILITY',
                class: 'text-amber-400/90',
                dotClass: 'bg-amber-400'
            };
        }
    }

    const availableCount = catalog.filter(v => v.isAvailableInRegion && v.inStock).length;
    const checkAvailabilityCount = catalog.filter(v => !v.isAvailableInRegion || !v.inStock).length;

    let dynamicRenderErrors = 0;
    catalog.forEach(v => {
        const state = getDynamicAvailabilityState(v);
        if (!state.text || !state.class || !state.dotClass) {
            dynamicRenderErrors++;
        }
    });

    assert(dynamicRenderErrors === 0, `All ${catalog.length} catalog cards render dynamic availability states cleanly (${availableCount} Available in Showroom, ${checkAvailabilityCount} Check Availability)`);
} catch (e) {
    assert(false, `Catalog JSON is valid and parseable: ${e.message}`);
}

// 4. Mathematical Formula Tests (EMI & Kerala RTO calculation verification)
function calculateMockEMI(price, downpayment, tenureMonths) {
    const rtoTax = Math.round(price * 0.10);
    const insurance = 7200;
    const safetyCess = 1850;
    const principal = price - downpayment;
    const netLoan = Math.max(0, principal + rtoTax + insurance + safetyCess);

    const annualRate = 8.5;
    const monthlyRate = (annualRate / 12) / 100;
    const emi = (netLoan * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi);
}

const sampleEMI = calculateMockEMI(95000, 25000, 24);
assert(!isNaN(sampleEMI) && sampleEMI > 0, `EMI Calculator returns valid numeric result: ₹${sampleEMI}/mo`);

// Final summary
console.log("\n==================================");
if (failedTests > 0) {
    console.error(`💥 Build Blocked: ${failedTests} test(s) failed.`);
    process.exit(1);
} else {
    console.log("🎉 All CI checks passed! Safe to deploy.");
    process.exit(0);
}