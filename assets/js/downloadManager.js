// assets/js/downloadManager.js - Simplified using anchor tag method

class DownloadManager {
    constructor() {
        this.isMobile = this.detectMobile();
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
            this.downloadSingleFile(file.id, file.name);
        };
        
        // Add to file element
        const fileContent = fileElement.querySelector('.file-content');
        if (fileContent) {
            fileContent.appendChild(downloadBtn);
        }
    }
    
    // Download single file using anchor tag method
    downloadSingleFile(fileId, fileName) {
        console.log(`Starting download for: ${fileName}`);
        
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        
        try {
            // Create anchor tag and trigger download
            const anchor = document.createElement('a');
            anchor.href = downloadUrl;
            anchor.download = fileName || ''; // Let browser pick name if not provided
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
    
    // Multi-file download using anchor tag method
    async downloadFiles(files) {
        if (!files || files.length === 0) {
            this.showToast('No files to download', 'warning');
            return;
        }
        
        console.log(`Starting multi-file download: ${files.length} files`);
        
        const downloadUrls = files.map(file => ({
            url: `https://drive.google.com/uc?export=download&id=${file.id}`,
            name: file.name
        }));
        
        // Download all files using anchor method
        this.multiFileDownload(downloadUrls);
        
        // Show appropriate message based on device
        if (this.isMobile) {
            if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
                this.showToast(`Started ${files.length} downloads. On iOS, you may need to manually save each file.`, 'info');
            } else {
                this.showToast(`Started ${files.length} downloads. Check your Downloads folder.`, 'success');
            }
        } else {
            this.showToast(`Started ${files.length} downloads. Check your Downloads folder.`, 'success');
        }
        
        // Clear selection after starting downloads
        if (window.App?.fileManager) {
            window.App.fileManager.clearSelection();
        }
    }
    
    // Multi-file download implementation
    multiFileDownload(fileData) {
        fileData.forEach((file, index) => {
            // Add small delay between downloads to prevent browser blocking
            setTimeout(() => {
                const anchor = document.createElement('a');
                anchor.href = file.url;
                anchor.download = file.name || '';
                anchor.style.display = 'none';
                
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                
                console.log(`Download triggered for: ${file.name}`);
            }, index * 100); // 100ms delay between each download
        });
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
    
    // Public API (for compatibility with existing code)
    hasActiveDownloads() {
        return false; // No queue system with anchor method
    }
    
    getQueueLength() {
        return 0; // No queue system with anchor method
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DownloadManager;
}
