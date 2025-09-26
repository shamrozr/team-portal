// assets/js/downloadManager.js - Updated with individual download modal approach

class DownloadManager {
    constructor() {
        this.downloadedFiles = new Set();
        this.totalFilesToDownload = 0;
        this.isMobile = this.detectMobile();
        
        this.createDownloadFrame();
        this.createDownloadModal();
        this.bindEvents();
    }
    
    detectMobile() {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMobileScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;
        
        return isMobileUA || (isMobileScreen && isTouchDevice);
    }
    
    createDownloadModal() {
        // Remove existing modal if it exists
        const existing = document.getElementById('downloadModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'downloadModal';
        modal.className = 'download-modal hidden';
        modal.innerHTML = `
            <div class="download-modal-overlay"></div>
            <div class="download-modal-container">
                <div class="download-modal-header">
                    <h3 id="downloadModalTitle">Download Files</h3>
                    <button class="download-modal-close" id="closeDownloadModal">×</button>
                </div>
                <div class="download-modal-body">
                    <div class="download-progress-summary">
                        <div class="progress-text">
                            <span id="downloadProgressText">0 of 0 files downloaded</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="downloadProgressFill"></div>
                            </div>
                        </div>
                    </div>
                    <div class="download-file-list" id="downloadFileList">
                        <!-- File list will be populated here -->
                    </div>
                </div>
                <div class="download-modal-footer">
                    <button class="btn btn-secondary" id="downloadAllAtOnce">Download All at Once</button>
                    <button class="btn btn-primary" id="closeWhenDone">Close</button>
                </div>
            </div>
        `;
        
        this.addModalStyles();
        document.body.appendChild(modal);
        this.bindModalEvents();
    }
    
    addModalStyles() {
        if (document.getElementById('downloadModalStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'downloadModalStyles';
        style.textContent = `
            .download-modal {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                z-index: 9999;
                background: rgba(0,0,0,0.75);
                backdrop-filter: blur(4px);
                animation: fadeIn 0.3s ease-in-out;
            }
            .download-modal.hidden { display: none; }
            
            .download-modal-overlay {
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
            }
            
            .download-modal-container {
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                max-width: 90vw;
                max-height: 90vh;
                width: 600px;
                overflow: hidden;
                animation: slideUp 0.3s ease-out;
            }
            
            .download-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-bottom: 1px solid #e2e8f0;
                background: #f8fafc;
            }
            
            .download-modal-header h3 {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 600;
                color: #1f2937;
            }
            
            .download-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #6b7280;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background 0.2s;
            }
            .download-modal-close:hover {
                background: #e5e7eb;
                color: #374151;
            }
            
            .download-modal-body {
                padding: 24px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .download-progress-summary {
                margin-bottom: 24px;
                padding: 16px;
                background: #f0f9ff;
                border: 1px solid #bae6fd;
                border-radius: 8px;
            }
            
            .progress-text {
                font-weight: 500;
                color: #0c4a6e;
                margin-bottom: 8px;
                text-align: center;
            }
            
            .progress-bar-container {
                width: 100%;
            }
            
            .progress-bar {
                width: 100%;
                height: 8px;
                background: #e0f2fe;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #1d4ed8);
                border-radius: 4px;
                transition: width 0.3s ease;
                width: 0%;
            }
            
            .download-file-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .download-file-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                transition: all 0.2s;
            }
            
            .download-file-item:hover {
                border-color: #cbd5e1;
                background: #f8fafc;
            }
            
            .download-file-item.downloaded {
                background: #ecfdf5;
                border-color: #86efac;
            }
            
            .file-item-info {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
                min-width: 0;
            }
            
            .file-item-icon {
                font-size: 20px;
                flex-shrink: 0;
            }
            
            .file-item-details {
                min-width: 0;
                flex: 1;
            }
            
            .file-item-name {
                font-weight: 500;
                color: #1f2937;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 2px;
            }
            
            .file-item-size {
                font-size: 12px;
                color: #6b7280;
            }
            
            .file-item-action {
                flex-shrink: 0;
                margin-left: 12px;
            }
            
            .download-file-btn {
                padding: 8px 16px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                min-width: 100px;
            }
            
            .download-file-btn:hover:not(:disabled) {
                background: #1d4ed8;
                transform: translateY(-1px);
            }
            
            .download-file-btn:disabled {
                background: #10b981;
                cursor: default;
                transform: none;
            }
            
            .download-file-btn.downloaded {
                background: #10b981;
            }
            
            .download-modal-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-top: 1px solid #e2e8f0;
                background: #f8fafc;
            }
            
            /* Mobile optimizations */
            @media (max-width: 768px) {
                .download-modal-container {
                    width: 95vw;
                    max-height: 95vh;
                }
                
                .download-modal-header {
                    padding: 16px 20px;
                }
                
                .download-modal-body {
                    padding: 20px;
                }
                
                .file-item-info {
                    gap: 8px;
                }
                
                .file-item-name {
                    font-size: 14px;
                }
                
                .download-file-btn {
                    padding: 6px 12px;
                    font-size: 13px;
                    min-width: 80px;
                }
                
                .download-modal-footer {
                    padding: 16px 20px;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .download-modal-footer button {
                    width: 100%;
                }
            }
            
            @media (max-width: 480px) {
                .download-file-item {
                    padding: 10px 12px;
                }
                
                .file-item-details {
                    min-width: 0;
                }
                
                .file-item-name {
                    font-size: 13px;
                }
                
                .download-file-btn {
                    padding: 5px 10px;
                    font-size: 12px;
                    min-width: 70px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    bindModalEvents() {
        // Close modal
        document.getElementById('closeDownloadModal').onclick = () => this.hideDownloadModal();
        document.getElementById('closeWhenDone').onclick = () => this.hideDownloadModal();
        
        // Download all at once (fallback to queue system)
        document.getElementById('downloadAllAtOnce').onclick = () => this.downloadAllAtOnce();
        
        // Close on overlay click
        document.querySelector('.download-modal-overlay').onclick = () => this.hideDownloadModal();
        
        // Prevent modal close when clicking inside
        document.querySelector('.download-modal-container').onclick = (e) => e.stopPropagation();
    }
    
    createDownloadFrame() {
        if (!this.downloadFrame) {
            this.downloadFrame = document.createElement('iframe');
            this.downloadFrame.id = 'downloadFrame';
            this.downloadFrame.style.cssText = 'display: none; width: 0; height: 0; border: none;';
            document.body.appendChild(this.downloadFrame);
        }
    }
    
    // Main public method - called from file manager
    async downloadFiles(files) {
        if (!files || files.length === 0) {
            this.showToast('No files to download', 'warning');
            return;
        }
        
        console.log(`Opening download modal for ${files.length} files`);
        
        this.totalFilesToDownload = files.length;
        this.downloadedFiles.clear();
        
        this.populateDownloadModal(files);
        this.showDownloadModal();
    }
    
    populateDownloadModal(files) {
        const fileList = document.getElementById('downloadFileList');
        const modalTitle = document.getElementById('downloadModalTitle');
        
        modalTitle.textContent = `Download Files (${files.length} selected)`;
        fileList.innerHTML = '';
        
        files.forEach(file => {
            const fileItem = this.createFileItem(file);
            fileList.appendChild(fileItem);
        });
        
        this.updateProgress();
    }
    
    createFileItem(file) {
        const item = document.createElement('div');
        item.className = 'download-file-item';
        item.dataset.fileId = file.id;
        
        const icon = Config.getFileIcon(file.mimeType, file.name);
        const size = file.size ? Config.formatFileSize(file.size) : '';
        
        item.innerHTML = `
            <div class="file-item-info">
                <div class="file-item-icon">${icon}</div>
                <div class="file-item-details">
                    <div class="file-item-name" title="${this.sanitizeHTML(file.name)}">${this.sanitizeHTML(file.name)}</div>
                    ${size ? `<div class="file-item-size">${size}</div>` : ''}
                </div>
            </div>
            <div class="file-item-action">
                <button class="download-file-btn" onclick="window.App.downloadManager.downloadSingleFile('${file.id}', '${this.sanitizeHTML(file.name)}')">
                    Download
                </button>
            </div>
        `;
        
        return item;
    }
    
    downloadSingleFile(fileId, fileName) {
        console.log(`Starting download for: ${fileName}`);
        
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        
        try {
            if (this.isMobile) {
                // Mobile: Direct window.open (works better on mobile)
                window.open(downloadUrl, '_blank');
            } else {
                // Desktop: Use iframe method
                this.downloadFrame.src = downloadUrl;
            }
            
            // Mark as downloaded immediately (since we can't track actual completion)
            this.markFileAsDownloaded(fileId);
            
            this.showToast(`Download started: ${fileName}`, 'success');
            
        } catch (error) {
            console.error(`Download failed for ${fileName}:`, error);
            this.showToast(`Download failed: ${fileName}`, 'error');
        }
    }
    
    markFileAsDownloaded(fileId) {
        this.downloadedFiles.add(fileId);
        
        // Update UI for this file
        const fileItem = document.querySelector(`[data-file-id="${fileId}"]`);
        if (fileItem) {
            fileItem.classList.add('downloaded');
            
            const button = fileItem.querySelector('.download-file-btn');
            if (button) {
                button.textContent = 'Downloaded ✓';
                button.disabled = true;
                button.classList.add('downloaded');
            }
        }
        
        // Update progress
        this.updateProgress();
        
        // Check if all files are downloaded
        if (this.downloadedFiles.size === this.totalFilesToDownload) {
            this.onAllFilesDownloaded();
        }
    }
    
    updateProgress() {
        const progressText = document.getElementById('downloadProgressText');
        const progressFill = document.getElementById('downloadProgressFill');
        
        const downloaded = this.downloadedFiles.size;
        const total = this.totalFilesToDownload;
        const percentage = total > 0 ? (downloaded / total) * 100 : 0;
        
        if (progressText) {
            progressText.textContent = `${downloaded} of ${total} files downloaded`;
        }
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
    }
    
    onAllFilesDownloaded() {
        this.showToast('All files downloaded successfully!', 'success');
        
        // Update close button text
        const closeBtn = document.getElementById('closeWhenDone');
        if (closeBtn) {
            closeBtn.textContent = 'All Done!';
            closeBtn.classList.remove('btn-primary');
            closeBtn.classList.add('btn-success');
        }
        
        // Clear selection in file manager
        if (window.App?.fileManager) {
            window.App.fileManager.clearSelection();
        }
    }
    
    downloadAllAtOnce() {
        // Fallback: trigger all downloads at once
        const remainingButtons = document.querySelectorAll('.download-file-btn:not(:disabled)');
        
        if (remainingButtons.length === 0) {
            this.showToast('All files already downloaded!', 'info');
            return;
        }
        
        remainingButtons.forEach((button, index) => {
            setTimeout(() => {
                button.click();
            }, index * 1000); // 1 second delay between each
        });
        
        this.showToast(`Downloading ${remainingButtons.length} files...`, 'info');
    }
    
    showDownloadModal() {
        const modal = document.getElementById('downloadModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }
    
    hideDownloadModal() {
        const modal = document.getElementById('downloadModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
        
        // Reset state
        this.downloadedFiles.clear();
        this.totalFilesToDownload = 0;
    }
    
    // Utility methods
    sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        return this.downloadedFiles.size > 0 && this.downloadedFiles.size < this.totalFilesToDownload;
    }
    
    getDownloadProgress() {
        return {
            downloaded: this.downloadedFiles.size,
            total: this.totalFilesToDownload,
            percentage: this.totalFilesToDownload > 0 ? (this.downloadedFiles.size / this.totalFilesToDownload) * 100 : 0
        };
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DownloadManager;
}
