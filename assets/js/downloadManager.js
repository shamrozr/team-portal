// assets/js/downloadManager.js - Client-side ZIP download manager

class DownloadManager {
    constructor() {
        this.isMobile = this.detectMobile();
        this.addFileDownloadButtonStyles();
        this.loadZipLibrary();
    }
    
    detectMobile() {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMobileScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;
        
        return isMobileUA || (isMobileScreen && isTouchDevice);
    }
    
    // Load fflate library for ZIP creation
    loadZipLibrary() {
        if (window.fflate) {
            console.log('fflate already loaded');
            return;
        }
        
        // Try multiple CDN sources
        const cdnUrls = [
            'https://unpkg.com/fflate@0.8.2/lib/index.js',
            'https://cdn.jsdelivr.net/npm/fflate@0.8.2/lib/index.js',
            'https://cdnjs.cloudflare.com/ajax/libs/fflate/0.8.2/index.min.js'
        ];
        
        this.tryLoadFromCDN(cdnUrls, 0);
    }
    
    tryLoadFromCDN(urls, index) {
        if (index >= urls.length) {
            console.error('All CDN sources failed, falling back to basic download');
            this.zipLibraryFailed = true;
            return;
        }
        
        const script = document.createElement('script');
        script.src = urls[index];
        script.onload = () => {
            console.log(`fflate library loaded successfully from: ${urls[index]}`);
        };
        script.onerror = () => {
            console.warn(`Failed to load from ${urls[index]}, trying next CDN...`);
            this.tryLoadFromCDN(urls, index + 1);
        };
        document.head.appendChild(script);
    }
    
    // Add styles for individual file download buttons
    addFileDownloadButtonStyles() {
        if (document.getElementById('fileDownloadStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'fileDownloadStyles';
        style.textContent = `
            .file-download-btn {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 32px;
                height: 32px;
                background: rgba(59, 130, 246, 0.9);
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: all 0.2s ease;
                opacity: 0;
                transform: scale(0.8);
                z-index: 10;
            }
            
            .file-item:hover .file-download-btn {
                opacity: 1;
                transform: scale(1);
            }
            
            .file-download-btn:hover {
                background: rgba(29, 78, 216, 0.9);
                transform: scale(1.1);
            }
            
            .file-download-btn:active {
                transform: scale(0.95);
            }
            
            /* Mobile: Always show download buttons */
            @media (max-width: 768px) {
                .file-download-btn {
                    opacity: 1;
                    transform: scale(1);
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    width: 28px;
                    height: 28px;
                    font-size: 12px;
                }
                
                .file-item.list-view .file-download-btn {
                    position: relative;
                    top: auto;
                    right: auto;
                    margin-left: 8px;
                }
            }
            
            /* Ensure file items have relative positioning */
            .file-item {
                position: relative;
            }
            
            /* Download progress overlay */
            .download-progress-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .download-progress-content {
                text-align: center;
                background: rgba(255, 255, 255, 0.1);
                padding: 2rem;
                border-radius: 12px;
                backdrop-filter: blur(10px);
            }
            
            .download-progress-content h3 {
                margin: 0 0 1rem 0;
                font-size: 1.2rem;
            }
            
            .download-progress-content p {
                margin: 0.5rem 0;
                opacity: 0.8;
            }
            
            .download-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 1rem auto;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Add download button to individual files
    addDownloadButtonToFile(fileElement, file) {
        if (file.type === 'folder') return;
        if (fileElement.querySelector('.file-download-btn')) return;
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'file-download-btn';
        downloadBtn.innerHTML = '📥';
        downloadBtn.title = `Download ${file.name}`;
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            this.downloadSingleFile(file.id, file.name);
        };
        
        const fileContent = fileElement.querySelector('.file-content');
        if (fileContent) {
            fileContent.appendChild(downloadBtn);
        }
    }
    
    // Download single file (direct method)
    downloadSingleFile(fileId, fileName) {
        console.log(`Starting single file download: ${fileName}`);
        
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        
        try {
            const anchor = document.createElement('a');
            anchor.href = downloadUrl;
            anchor.download = fileName || '';
            anchor.style.display = 'none';
            
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            
            this.showToast(`Download started: ${fileName}`, 'success');
            
        } catch (error) {
            console.error(`Download failed for ${fileName}:`, error);
            this.showToast(`Download failed: ${fileName}`, 'error');
        }
    }
    
    // Multi-file download using ZIP method (with fallback)
    async downloadFiles(files) {
        if (!files || files.length === 0) {
            this.showToast('No files to download', 'warning');
            return;
        }
        
        // If ZIP library failed to load, fall back to individual downloads
        if (!window.fflate || this.zipLibraryFailed) {
            console.log('ZIP library not available, falling back to individual downloads');
            this.fallbackDownload(files);
            return;
        }
        
        console.log(`Starting ZIP download: ${files.length} files`);
        
        // Show progress overlay
        this.showProgressOverlay('Preparing downloads...');
        
        try {
            // Create ZIP archive
            await this.createAndDownloadZip(files);
            
            // Clear selection after successful download
            if (window.App?.fileManager) {
                window.App.fileManager.clearSelection();
            }
            
        } catch (error) {
            console.error('ZIP download failed:', error);
            this.showToast('ZIP download failed. Trying individual downloads...', 'warning');
            this.hideProgressOverlay();
            // Fallback to individual downloads
            this.fallbackDownload(files);
        }
    }
    
    // Fallback: Download files individually with delays
    fallbackDownload(files) {
        this.showToast(`Starting ${files.length} individual downloads...`, 'info');
        
        files.forEach((file, index) => {
            setTimeout(() => {
                this.downloadSingleFile(file.id, file.name);
            }, index * 1000); // 1 second delays
        });
        
        // Clear selection after starting downloads
        if (window.App?.fileManager) {
            window.App.fileManager.clearSelection();
        }
    }
    
    // Create ZIP archive and trigger download
    async createAndDownloadZip(files) {
        const zipData = {};
        let completedFiles = 0;
        
        // Download all files as blobs
        for (const file of files) {
            try {
                this.updateProgress(`Downloading ${file.name}... (${completedFiles + 1}/${files.length})`);
                
                const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
                const response = await fetch(downloadUrl);
                
                if (!response.ok) {
                    throw new Error(`Failed to download ${file.name}: ${response.status}`);
                }
                
                const arrayBuffer = await response.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // Add to ZIP data with sanitized filename
                const safeFileName = this.sanitizeFileName(file.name);
                zipData[safeFileName] = uint8Array;
                
                completedFiles++;
                console.log(`Downloaded: ${file.name} (${uint8Array.length} bytes)`);
                
            } catch (error) {
                console.error(`Failed to download ${file.name}:`, error);
                // Continue with other files instead of failing completely
            }
        }
        
        if (Object.keys(zipData).length === 0) {
            throw new Error('No files were successfully downloaded');
        }
        
        // Create ZIP archive
        this.updateProgress('Creating ZIP archive...');
        
        const zipUint8Array = window.fflate.zipSync(zipData, {
            level: 6, // Compression level (0-9, 6 is good balance)
            comment: `Created by Team Portal - ${new Date().toLocaleDateString()}`
        });
        
        // Create blob and download
        this.updateProgress('Preparing download...');
        
        const zipBlob = new Blob([zipUint8Array], { type: 'application/zip' });
        const zipUrl = URL.createObjectURL(zipBlob);
        
        // Generate ZIP filename
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const zipFileName = `files-${timestamp}.zip`;
        
        // Trigger download
        const anchor = document.createElement('a');
        anchor.href = zipUrl;
        anchor.download = zipFileName;
        anchor.style.display = 'none';
        
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(zipUrl);
        }, 1000);
        
        this.showToast(`ZIP archive created: ${zipFileName} (${Object.keys(zipData).length} files)`, 'success');
    }
    
    // Show progress overlay
    showProgressOverlay(message) {
        // Remove existing overlay
        this.hideProgressOverlay();
        
        const overlay = document.createElement('div');
        overlay.id = 'downloadProgressOverlay';
        overlay.className = 'download-progress-overlay';
        overlay.innerHTML = `
            <div class="download-progress-content">
                <h3>Creating Download Archive</h3>
                <div class="download-spinner"></div>
                <p id="progressMessage">${message}</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }
    
    // Update progress message
    updateProgress(message) {
        const progressMessage = document.getElementById('progressMessage');
        if (progressMessage) {
            progressMessage.textContent = message;
        }
    }
    
    // Hide progress overlay
    hideProgressOverlay() {
        const overlay = document.getElementById('downloadProgressOverlay');
        if (overlay) {
            overlay.remove();
        }
        document.body.style.overflow = '';
    }
    
    // Sanitize filename for ZIP archive
    sanitizeFileName(fileName) {
        // Remove or replace characters that might cause issues in ZIP files
        return fileName
            .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 255); // Limit length
    }
    
    // Utility methods
    showToast(message, type = 'info') {
        if (window.Utils && window.Utils.showToast) {
            if (type === 'success') window.Utils.showSuccess(message);
            else if (type === 'warning') window.Utils.showWarning(message);
            else if (type === 'error') window.Utils.showError(message);
            else window.Utils.showInfo(message);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    // Public API
    hasActiveDownloads() {
        return !!document.getElementById('downloadProgressOverlay');
    }
    
    getQueueLength() {
        return 0; // No queue system with ZIP method
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DownloadManager;
}
