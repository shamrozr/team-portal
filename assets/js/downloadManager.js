// assets/js/downloadManager.js - Simple individual downloads only

class DownloadManager {
    constructor() {
        this.isMobile = this.detectMobile();
        this.downloadQueue = [];
        this.isProcessing = false;
        this.addFileDownloadButtonStyles();
    }
    
    detectMobile() {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMobileScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;
        
        return isMobileUA || (isMobileScreen && isTouchDevice);
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
            
            .file-download-btn.downloading {
                background: rgba(245, 158, 11, 0.9);
                animation: pulse 1s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 0.9; }
                50% { opacity: 0.6; }
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
        `;
        
        document.head.appendChild(style);
    }
    
    // Add download button to individual files (called by file manager)
    addDownloadButtonToFile(fileElement, file) {
        // Don't add button to folders
        if (file.type === 'folder') return;
        
        // Check if button already exists
        if (fileElement.querySelector('.file-download-btn')) return;
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'file-download-btn';
        downloadBtn.innerHTML = '📥';
        downloadBtn.title = `Download ${file.name}`;
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            this.queueDownload(file.id, file.name, downloadBtn);
        };
        
        // Add to file element
        const fileContent = fileElement.querySelector('.file-content');
        if (fileContent) {
            fileContent.appendChild(downloadBtn);
        }
    }
    
    // Queue download with 1-second delay
    queueDownload(fileId, fileName, buttonElement) {
        // Add to queue
        this.downloadQueue.push({
            fileId,
            fileName,
            buttonElement
        });
        
        // Show queued state
        if (buttonElement) {
            buttonElement.classList.add('downloading');
            buttonElement.innerHTML = '⏳';
            buttonElement.disabled = true;
        }
        
        // Process queue if not already processing
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    
    // Process download queue with 1-second delays
    async processQueue() {
        if (this.isProcessing || this.downloadQueue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.downloadQueue.length > 0) {
            const { fileId, fileName, buttonElement } = this.downloadQueue.shift();
            
            try {
                // Start download
                this.downloadSingleFile(fileId, fileName);
                
                // Update button state
                if (buttonElement) {
                    buttonElement.innerHTML = '✓';
                    buttonElement.classList.remove('downloading');
                    buttonElement.style.background = 'rgba(34, 197, 94, 0.9)';
                }
                
                // Wait 1 second before next download
                if (this.downloadQueue.length > 0) {
                    await this.delay(1000);
                }
                
            } catch (error) {
                console.error(`Download failed for ${fileName}:`, error);
                
                // Update button to show error
                if (buttonElement) {
                    buttonElement.innerHTML = '❌';
                    buttonElement.classList.remove('downloading');
                    buttonElement.style.background = 'rgba(239, 68, 68, 0.9)';
                }
            }
        }
        
        this.isProcessing = false;
    }
    
    // Download single file
    downloadSingleFile(fileId, fileName) {
        console.log(`Starting download: ${fileName}`);
        
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = fileName || '';
        anchor.style.display = 'none';
        
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        
        this.showToast(`Download started: ${fileName}`, 'success');
    }
    
    // Multi-file download - NOT SUPPORTED (removed)
    async downloadFiles(files) {
        if (!files || files.length === 0) {
            this.showToast('No files to download', 'warning');
            return;
        }
        
        // Show message that bulk download is not supported
        this.showToast('Please use individual download buttons on each file', 'info');
    }
    
    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
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
        return this.isProcessing || this.downloadQueue.length > 0;
    }
    
    getQueueLength() {
        return this.downloadQueue.length;
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DownloadManager;
}
