// scripts/buildDatabase.js - Google Drive API Database Builder
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveDatabase {
  constructor(apiKey, rootFolderId = null) {
    this.apiKey = apiKey;
    this.rootFolderId = rootFolderId;
    this.drive = google.drive({
      version: 'v3',
      auth: apiKey
    });
    this.folderMap = new Map();
    this.apiCallCount = 0;
    this.processedFolders = new Set();
  }

  async buildDatabase() {
    console.log('🚀 Starting Google Drive database build...');
    console.log(`📁 Root folder ID: ${this.rootFolderId || 'root'}`);
    
    try {
      const startTime = Date.now();
      
      // Test API connection first
      await this.testAPIConnection();
      
      // Build the folder hierarchy
      const rootStructure = await this.processFolder(
        this.rootFolderId || 'root', 
        ''
      );
      
      const buildTime = Date.now() - startTime;
      
      console.log('\n📊 Build Statistics:');
      console.log(`   ⏱️  Build time: ${buildTime}ms`);
      console.log(`   📞 API calls made: ${this.apiCallCount}`);
      console.log(`   📁 Folders processed: ${this.processedFolders.size}`);
      console.log(`   📄 Total files: ${this.countFiles(rootStructure)}`);
      
      // Convert to the required format
      const formattedData = this.formatForPortal(rootStructure);
      
      // Debug: Print first level of structure
      this.debugStructure(formattedData);
      
      return formattedData;
      
    } catch (error) {
      console.error('❌ Database build failed:', error);
      throw error;
    }
  }

  async testAPIConnection() {
    console.log('🔧 Testing API connection...');
    try {
      const response = await this.drive.files.get({
        fileId: this.rootFolderId || 'root',
        fields: 'id,name,mimeType'
      });
      
      console.log(`✅ API connection successful. Root folder: ${response.data.name || 'Drive Root'}`);
      this.apiCallCount++;
    } catch (error) {
      console.error('❌ API connection failed:', error);
      throw new Error(`Failed to connect to Google Drive API: ${error.message}`);
    }
  }

  async processFolder(folderId, currentPath, depth = 0) {
    if (this.processedFolders.has(folderId)) {
      console.log(`⚠️  Skipping already processed folder: ${folderId}`);
      return null;
    }
    
    this.processedFolders.add(folderId);
    
    const indent = '  '.repeat(depth);
    console.log(`${indent}📁 Processing: ${folderId} (${currentPath || 'root'})`);
    
    try {
      // Get folder metadata first
      let folderName = 'root';
      if (folderId !== 'root') {
        const folderInfo = await this.getFolderInfo(folderId);
        folderName = folderInfo.name;
      }
      
      const folderData = {
        id: folderId,
        name: folderName,
        type: 'folder',
        path: currentPath || '/',
        children: []
      };
      
      // Get all files and folders in this directory
      const allItems = await this.getAllItems(folderId);
      
      // Separate folders and files
      const folders = allItems.filter(item => 
        item.mimeType === 'application/vnd.google-apps.folder'
      );
      const files = allItems.filter(item => 
        item.mimeType !== 'application/vnd.google-apps.folder'
      );
      
      console.log(`${indent}   📄 ${files.length} files, 📁 ${folders.length} folders`);
      
      // Add files to folder
      for (const file of files) {
        const filePath = currentPath ? `${currentPath}/${file.name}` : `/${file.name}`;
        folderData.children.push({
          id: file.id,
          name: file.name,
          type: 'file',
          mimeType: file.mimeType,
          path: filePath,
          size: file.size ? parseInt(file.size) : 0,
          modifiedTime: file.modifiedTime
        });
      }
      
      // Process subfolders recursively (limit depth to prevent infinite loops)
      if (depth < 10) {
        for (const folder of folders) {
          const folderPath = currentPath ? `${currentPath}/${folder.name}` : `/${folder.name}`;
          const subfolderData = await this.processFolder(folder.id, folderPath, depth + 1);
          
          if (subfolderData) {
            folderData.children.push(subfolderData);
          }
        }
      } else {
        console.log(`${indent}⚠️  Maximum depth reached, skipping subfolders`);
      }
      
      this.folderMap.set(folderId, folderData);
      return folderData;
      
    } catch (error) {
      console.error(`❌ Error processing folder ${folderId}:`, error.message);
      // Return partial data instead of failing completely
      return {
        id: folderId,
        name: `Error: ${folderId}`,
        type: 'folder',
        path: currentPath || '/',
        children: [],
        error: error.message
      };
    }
  }

  async getFolderInfo(folderId) {
    this.apiCallCount++;
    
    try {
      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'id,name,mimeType,parents'
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error getting folder info for ${folderId}:`, error.message);
      return { id: folderId, name: `Unknown_${folderId}` };
    }
  }

  async getAllItems(folderId) {
    let allItems = [];
    let pageToken = null;
    const maxRetries = 3;
    let retryCount = 0;
    
    do {
      try {
        this.apiCallCount++;
        
        const response = await this.drive.files.list({
          q: `'${folderId}' in parents and trashed=false`,
          fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,parents)',
          pageSize: 1000, // Maximum allowed
          pageToken: pageToken
        });
        
        allItems = allItems.concat(response.data.files || []);
        pageToken = response.data.nextPageToken;
        
        if (response.data.files && response.data.files.length > 0) {
          console.log(`   📥 Retrieved ${response.data.files.length} items (Total: ${allItems.length})`);
        }
        
        retryCount = 0; // Reset retry count on success
        
      } catch (error) {
        console.error(`Error listing files in folder ${folderId}:`, error.message);
        
        // If it's a rate limit error, wait and retry
        if (error.code === 429 && retryCount < maxRetries) {
          retryCount++;
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`   ⏳ Rate limited, waiting ${waitTime}ms... (Retry ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry this iteration
        }
        
        break; // For other errors or max retries reached, stop pagination
      }
      
    } while (pageToken);
    
    return allItems;
  }

  formatForPortal(structure) {
    // Convert the nested structure to a flat array format expected by the portal
    function flattenStructure(node) {
      const result = {
        id: node.id,
        name: node.name,
        type: node.type,
        path: node.path
      };
      
      // Add file-specific properties
      if (node.type === 'file') {
        result.mimeType = node.mimeType;
        if (node.size) result.size = node.size;
        if (node.modifiedTime) result.modifiedTime = node.modifiedTime;
      }
      
      // Add children if folder
      if (node.children && node.children.length > 0) {
        result.children = node.children.map(child => flattenStructure(child));
      }
      
      return result;
    }
    
    return flattenStructure(structure);
  }

  debugStructure(structure, maxItems = 100) {
    console.log('\n🔍 DEBUG: Database Structure Preview');
    console.log('=' .repeat(50));
    
    let itemCount = 0;
    
    function printNode(node, indent = '') {
      if (itemCount >= maxItems) {
        console.log(`${indent}... (showing first ${maxItems} items)`);
        return;
      }
      
      const icon = node.type === 'folder' ? '📁' : '📄';
      const size = node.size ? ` (${this.formatBytes(node.size)})` : '';
      console.log(`${indent}${icon} ${node.name}${size}`);
      itemCount++;
      
      if (node.children && node.children.length > 0) {
        const childIndent = indent + '  ';
        for (const child of node.children.slice(0, 10)) { // Limit children shown
          printNode.call(this, child, childIndent);
          if (itemCount >= maxItems) break;
        }
        
        if (node.children.length > 10) {
          console.log(`${childIndent}... and ${node.children.length - 10} more items`);
        }
      }
    }
    
    printNode.call(this, structure);
    console.log('\n' + '=' .repeat(50));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  countFiles(structure) {
    let count = 0;
    
    if (structure.children) {
      for (const child of structure.children) {
        if (child.type === 'file') {
          count++;
        } else if (child.type === 'folder') {
          count += this.countFiles(child);
        }
      }
    }
    
    return count;
  }

  async saveToFile(data, outputPath) {
    const jsonData = JSON.stringify(data, null, 2);
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, jsonData);
    console.log(`💾 Database saved to: ${outputPath}`);
    console.log(`📏 File size: ${(jsonData.length / 1024).toFixed(2)} KB`);
    
    // Also save a minified version for production
    const minifiedData = JSON.stringify(data);
    const minifiedPath = outputPath.replace('.json', '.min.json');
    fs.writeFileSync(minifiedPath, minifiedData);
    console.log(`💾 Minified version saved to: ${minifiedPath}`);
    console.log(`📏 Minified size: ${(minifiedData.length / 1024).toFixed(2)} KB`);
  }
}

// Main execution function
async function main() {
  console.log('🔧 Google Drive Database Builder');
  console.log('================================\n');
  
  // Get configuration from environment variables
  const config = {
    apiKey: process.env.GOOGLE_DRIVE_API_KEY,
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1G9QC1GTuMHvnMBHNCD--ImNU0b2FUet7',
    outputPath: process.env.OUTPUT_PATH || './data/drive.json'
  };
  
  // Validate configuration
  if (!config.apiKey) {
    console.error('❌ GOOGLE_DRIVE_API_KEY environment variable is required');
    console.log('💡 Set it in your environment or GitHub secrets');
    process.exit(1);
  }
  
  console.log('🔑 API Key configured');
  console.log(`📁 Root folder: ${config.rootFolderId}`);
  console.log(`💾 Output path: ${config.outputPath}\n`);
  
  try {
    // Initialize database builder
    const dbBuilder = new GoogleDriveDatabase(config.apiKey, config.rootFolderId);
    
    // Build database
    const databaseData = await dbBuilder.buildDatabase();
    
    // Save to file
    await dbBuilder.saveToFile(databaseData, config.outputPath);
    
    // Create a summary file
    const summary = {
      buildTime: new Date().toISOString(),
      apiCalls: dbBuilder.apiCallCount,
      foldersProcessed: dbBuilder.processedFolders.size,
      totalFiles: dbBuilder.countFiles(databaseData),
      rootFolderId: config.rootFolderId,
      rootFolderName: databaseData.name
    };
    
    const summaryPath = config.outputPath.replace('.json', '-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Summary saved to: ${summaryPath}`);
    
    console.log('\n✅ Database build completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Commit and push the generated drive.json file');
    console.log('2. Deploy your changes to Cloudflare Pages');
    console.log('3. Test the portal with the new database');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    
    // Provide helpful error messages
    if (error.message.includes('API key')) {
      console.log('\n💡 API Key Issues:');
      console.log('- Make sure your Google Drive API key is valid');
      console.log('- Ensure the API key has Drive API access enabled');
      console.log('- Check that the key is not restricted to specific websites');
    }
    
    if (error.message.includes('folder')) {
      console.log('\n💡 Folder Access Issues:');
      console.log('- Make sure the folder ID is correct');
      console.log('- Ensure the folder is publicly accessible or shared with your API key');
      console.log(`- Current folder ID: ${config.rootFolderId}`);
    }
    
    process.exit(1);
  }
}

// Export for testing
module.exports = { GoogleDriveDatabase };

// Run if called directly
if (require.main === module) {
  main();
}
