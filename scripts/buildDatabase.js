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
      
      return formattedData;
      
    } catch (error) {
      console.error('❌ Database build failed:', error);
      throw error;
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
      
      // Process subfolders recursively
      for (const folder of folders) {
        const folderPath = currentPath ? `${currentPath}/${folder.name}` : `/${folder.name}`;
        const subfolderData = await this.processFolder(folder.id, folderPath, depth + 1);
        
        if (subfolderData) {
          folderData.children.push(subfolderData);
        }
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
    
    do {
      this.apiCallCount++;
      
      try {
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
        
      } catch (error) {
        console.error(`Error listing files in folder ${folderId}:`, error.message);
        
        // If it's a rate limit error, wait and retry
        if (error.code === 429) {
          console.log('   ⏳ Rate limited, waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue; // Retry this iteration
        }
        
        break; // For other errors, stop pagination
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
  }
}

// Main execution function
async function main() {
  console.log('🔧 Google Drive Database Builder');
  console.log('================================\n');
  
  // Get configuration from environment variables
  const config = {
    apiKey: process.env.GOOGLE_DRIVE_API_KEY,
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
    outputPath: process.env.OUTPUT_PATH || './data/drive.json'
  };
  
  // Validate configuration
  if (!config.apiKey) {
    console.error('❌ GOOGLE_DRIVE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  console.log('🔑 API Key configured');
  console.log(`📁 Root folder: ${config.rootFolderId || 'root'}`);
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
      rootFolderId: config.rootFolderId
    };
    
    const summaryPath = config.outputPath.replace('.json', '-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Summary saved to: ${summaryPath}`);
    
    console.log('\n✅ Database build completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

// Export for testing
module.exports = { GoogleDriveDatabase };

// Run if called directly
if (require.main === module) {
  main();
}