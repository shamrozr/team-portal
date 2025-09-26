// demo-test.js - Test script for Google Drive API database builder
const fs = require('fs');
const path = require('path');

// Mock Google Drive API responses for testing
const mockDriveData = {
  // Root folder response
  'root': {
    files: [
      {
        id: '1ABC123_brands_folder',
        name: 'Brands',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root']
      },
      {
        id: '1DEF456_archive_folder', 
        name: 'Archive',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root']
      },
      {
        id: '1GHI789_readme_file',
        name: 'README.pdf',
        mimeType: 'application/pdf',
        parents: ['root']
      }
    ]
  },
  
  // Brands folder response
  '1ABC123_brands_folder': {
    files: [
      {
        id: '2ABC123_ysl_folder',
        name: 'YSL Bags',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['1ABC123_brands_folder']
      },
      {
        id: '2DEF456_lv_folder',
        name: 'Louis Vuitton',
        mimeType: 'application/vnd.google-apps.folder', 
        parents: ['1ABC123_brands_folder']
      }
    ]
  },
  
  // YSL Bags folder response
  '2ABC123_ysl_folder': {
    files: [
      {
        id: '3ABC123_loulou_folder',
        name: 'Saint Laurent Loulou Puffer bag',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['2ABC123_ysl_folder']
      }
    ]
  },
  
  // Loulou Puffer bag folder response
  '3ABC123_loulou_folder': {
    files: [
      {
        id: '4ABC123_video1',
        name: 'Saint Laurent Loulou Puffer bag (11).mp4',
        mimeType: 'video/mp4',
        parents: ['3ABC123_loulou_folder']
      },
      {
        id: '4DEF456_image1',
        name: 'Saint Laurent Loulou Puffer bag (1).jpg',
        mimeType: 'image/jpeg',
        parents: ['3ABC123_loulou_folder']
      },
      {
        id: '4GHI789_image2',
        name: 'Saint Laurent Loulou Puffer bag (2).jpg',
        mimeType: 'image/jpeg',
        parents: ['3ABC123_loulou_folder']
      }
    ]
  },
  
  // Louis Vuitton folder response
  '2DEF456_lv_folder': {
    files: [
      {
        id: '4JKL012_neverfull_image',
        name: 'Neverfull MM.png',
        mimeType: 'image/png',
        parents: ['2DEF456_lv_folder']
      },
      {
        id: '4MNO345_speedy_image',
        name: 'Speedy 30.jpg',
        mimeType: 'image/jpeg',
        parents: ['2DEF456_lv_folder']
      }
    ]
  },
  
  // Archive folder response  
  '1DEF456_archive_folder': {
    files: [
      {
        id: '5PQR678_old_catalog',
        name: 'Old Catalog.pdf',
        mimeType: 'application/pdf',
        parents: ['1DEF456_archive_folder']
      }
    ]
  }
};

// Mock Google Drive API client
class MockDriveAPI {
  constructor() {
    this.callCount = 0;
    this.callLog = [];
  }
  
  async listFiles(folderId = 'root', pageToken = null) {
    this.callCount++;
    const logEntry = {
      call: this.callCount,
      folderId,
      pageToken,
      timestamp: new Date().toISOString()
    };
    this.callLog.push(logEntry);
    
    console.log(`📁 API Call ${this.callCount}: Listing files in folder "${folderId}"`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const mockResponse = mockDriveData[folderId] || { files: [] };
    
    return {
      files: mockResponse.files || [],
      nextPageToken: null // Simplified for demo
    };
  }
  
  getCallStats() {
    return {
      totalCalls: this.callCount,
      callLog: this.callLog
    };
  }
}

// Database Builder Class (simplified version for testing)
class DriveDatabase {
  constructor(driveAPI) {
    this.drive = driveAPI;
    this.folderMap = new Map();
    this.pathMap = new Map();
  }
  
  async buildDatabase() {
    console.log('🚀 Starting database build...\n');
    
    const rootStructure = await this.processFolder('root', '');
    const stats = this.drive.getCallStats();
    
    console.log('\n📊 Build Statistics:');
    console.log(`   Total API calls: ${stats.totalCalls}`);
    console.log(`   Total folders processed: ${this.folderMap.size}`);
    console.log(`   Total files indexed: ${this.getTotalFileCount(rootStructure)}`);
    
    return rootStructure;
  }
  
  async processFolder(folderId, currentPath) {
    const response = await this.drive.listFiles(folderId);
    const folderData = {
      id: folderId,
      name: folderId === 'root' ? 'Root' : this.getFolderName(folderId),
      type: 'folder',
      path: currentPath,
      children: []
    };
    
    // Separate folders and files
    const folders = response.files.filter(file => 
      file.mimeType === 'application/vnd.google-apps.folder'
    );
    const files = response.files.filter(file => 
      file.mimeType !== 'application/vnd.google-apps.folder'
    );
    
    // Process files first
    for (const file of files) {
      const filePath = currentPath ? `${currentPath}/${file.name}` : `/${file.name}`;
      folderData.children.push({
        id: file.id,
        name: file.name,
        type: 'file',
        mimeType: file.mimeType,
        path: filePath
      });
    }
    
    // Process subfolders recursively
    for (const folder of folders) {
      const folderPath = currentPath ? `${currentPath}/${folder.name}` : `/${folder.name}`;
      const subfolderData = await this.processFolder(folder.id, folderPath);
      folderData.children.push(subfolderData);
    }
    
    this.folderMap.set(folderId, folderData);
    return folderData;
  }
  
  getFolderName(folderId) {
    // Extract folder name from mock data
    for (const [id, data] of Object.entries(mockDriveData)) {
      if (data.files) {
        const folder = data.files.find(f => f.id === folderId);
        if (folder) return folder.name;
      }
    }
    return `Folder_${folderId}`;
  }
  
  getTotalFileCount(structure) {
    let count = 0;
    if (structure.children) {
      for (const child of structure.children) {
        if (child.type === 'file') {
          count++;
        } else if (child.type === 'folder') {
          count += this.getTotalFileCount(child);
        }
      }
    }
    return count;
  }
  
  exportToJSON() {
    const structure = [...this.folderMap.values()].find(folder => folder.id === 'root');
    return JSON.stringify(structure, null, 2);
  }
}

// Test runner
async function runTest() {
  console.log('🧪 Google Drive Database Builder - Demo Test\n');
  console.log('=' .repeat(50));
  
  try {
    // Initialize mock API and database builder
    const mockAPI = new MockDriveAPI();
    const dbBuilder = new DriveDatabase(mockAPI);
    
    // Build the database
    const result = await dbBuilder.buildDatabase();
    
    // Export results
    const jsonOutput = dbBuilder.exportToJSON();
    
    console.log('\n📝 Generated JSON Structure:');
    console.log('=' .repeat(30));
    console.log(jsonOutput);
    
    // Save to file for inspection
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    const outputFile = path.join(outputDir, 'drive-structure-test.json');
    fs.writeFileSync(outputFile, jsonOutput);
    console.log(`\n💾 Output saved to: ${outputFile}`);
    
    // Display API call log
    const stats = mockAPI.getCallStats();
    console.log('\n📞 API Call Log:');
    console.log('=' .repeat(20));
    stats.callLog.forEach(log => {
      console.log(`   ${log.call}. ${log.timestamp} - Folder: ${log.folderId}`);
    });
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Validation function
function validateStructure(structure) {
  const errors = [];
  
  function validateNode(node, path = '') {
    // Check required fields
    if (!node.id) errors.push(`Missing 'id' at ${path}`);
    if (!node.name) errors.push(`Missing 'name' at ${path}`);
    if (!node.type) errors.push(`Missing 'type' at ${path}`);
    if (!node.path) errors.push(`Missing 'path' at ${path}`);
    
    // Validate children if folder
    if (node.type === 'folder' && node.children) {
      node.children.forEach((child, index) => {
        validateNode(child, `${path}/children[${index}]`);
      });
    }
    
    // Validate file-specific fields
    if (node.type === 'file' && !node.mimeType) {
      errors.push(`Missing 'mimeType' for file at ${path}`);
    }
  }
  
  validateNode(structure);
  return errors;
}

// Run the test
if (require.main === module) {
  runTest().then(() => {
    console.log('\n🎯 Demo test completed. Use this as a reference for the actual implementation.');
  });
}

module.exports = { MockDriveAPI, DriveDatabase, validateStructure };