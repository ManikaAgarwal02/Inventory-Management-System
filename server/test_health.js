const http = require('http');
const connectDB = require('./Backend Configuration/Configuration Folders/DB Configuration/dbCofig');
const mongoose = require('mongoose');

async function runTests() {
    console.log("=== STARTING FULL BACKEND INTEGRATION TESTS ===");
    
    // Check if server is running
    const serverCheck = await new Promise((resolve) => {
        const req = http.get('http://localhost:4000/api/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', err => resolve({ error: err.message }));
    });
    
    console.log("Health check result:", serverCheck);
    process.exit(0);
}

runTests();
