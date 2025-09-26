// scripts/downloadAuthData.js - Download authentication CSV from external source
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

async function downloadAuthData() {
    console.log('🔐 Downloading Authentication Data...');
    console.log('=====================================\n');
    
    // Get CSV URL from environment variable or default
    const csvUrl = process.env.AUTH_CSV_URL;
    
    if (!csvUrl) {
        console.error('❌ AUTH_CSV_URL environment variable is required');
        console.log('💡 Set it to your Google Sheets CSV export URL');
        console.log('Example: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0');
        process.exit(1);
    }
    
    console.log(`📥 Downloading from: ${csvUrl}`);
    
    try {
        // Download the CSV
        const csvData = await downloadFile(csvUrl);
        
        // Validate CSV format
        validateCSVFormat(csvData);
        
        // Ensure data directory exists
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Save to data/auth.csv
        const outputPath = path.join(dataDir, 'auth.csv');
        fs.writeFileSync(outputPath, csvData);
        
        // Parse and show summary
        const lines = csvData.trim().split('\n');
        const userCount = lines.length - 1; // Subtract header
        
        console.log(`✅ Successfully downloaded authentication data`);
        console.log(`📊 Users found: ${userCount}`);
        console.log(`💾 Saved to: ${outputPath}`);
        console.log(`📏 File size: ${csvData.length} bytes`);
        
        // Show first few lines (without passwords)
        console.log('\n📋 Data preview:');
        console.log('manager,role,password');
        lines.slice(1, Math.min(4, lines.length)).forEach((line, index) => {
            const parts = line.split(',');
            if (parts.length >= 3) {
                console.log(`${parts[0]},${parts[1]},***`);
            }
        });
        
        if (userCount > 3) {
            console.log(`... and ${userCount - 3} more users`);
        }
        
        console.log('\n✅ Authentication data download completed!');
        
    } catch (error) {
        console.error('\n❌ Failed to download authentication data:', error.message);
        
        // Provide helpful error messages
        if (error.message.includes('ENOTFOUND')) {
            console.log('\n💡 Network Issues:');
            console.log('- Check your internet connection');
            console.log('- Verify the URL is correct');
        }
        
        if (error.message.includes('403') || error.message.includes('401')) {
            console.log('\n💡 Access Issues:');
            console.log('- Make sure the Google Sheet is publicly accessible');
            console.log('- Share settings should be "Anyone with the link can view"');
        }
        
        if (error.message.includes('CSV format')) {
            console.log('\n💡 Format Issues:');
            console.log('- Ensure your sheet has columns: manager,role,password');
            console.log('- Check that the first row contains these exact headers');
        }
        
        process.exit(1);
    }
}

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        console.log(`🌐 Making request to: ${url}`);
        
        const request = protocol.get(url, (response) => {
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                console.log(`🔄 Following redirect to: ${response.headers.location}`);
                return downloadFile(response.headers.location)
                    .then(resolve)
                    .catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            let data = '';
            response.on('data', chunk => {
                data += chunk;
            });
            
            response.on('end', () => {
                console.log(`📦 Downloaded ${data.length} bytes`);
                resolve(data);
            });
        });
        
        request.on('error', (error) => {
            reject(new Error(`Network error: ${error.message}`));
        });
        
        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Request timeout after 30 seconds'));
        });
    });
}

function validateCSVFormat(csvData) {
    const lines = csvData.trim().split('\n');
    
    if (lines.length < 2) {
        throw new Error('CSV format error: File must have at least a header and one data row');
    }
    
    const header = lines[0].toLowerCase().trim();
    const expectedHeader = 'manager,role,password';
    
    if (header !== expectedHeader) {
        throw new Error(`CSV format error: Header should be "${expectedHeader}" but got "${header}"`);
    }
    
    // Validate data rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const parts = line.split(',');
        if (parts.length !== 3) {
            throw new Error(`CSV format error: Line ${i + 1} should have 3 columns (manager,role,password) but has ${parts.length}`);
        }
        
        const [manager, role, password] = parts.map(p => p.trim());
        if (!manager || !role || !password) {
            throw new Error(`CSV format error: Line ${i + 1} has empty fields. All fields are required.`);
        }
        
        // Validate role
        if (!['manager', 'admin'].includes(role.toLowerCase())) {
            console.warn(`⚠️  Warning: Line ${i + 1} has role "${role}". Expected "manager" or "admin".`);
        }
    }
    
    console.log('✅ CSV format validation passed');
}

// Export for testing
module.exports = { downloadAuthData };

// Run if called directly
if (require.main === module) {
    downloadAuthData();
}
