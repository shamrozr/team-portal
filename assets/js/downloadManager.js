// assets/js/downloadManager.js - Fixed version with same-page downloads and proper styling

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
                    <div class="download-info">
                        <p>📱 Files will download directly to your device's Downloads folder.</p>
                        <p>💻 Click each button to start individual downloads, or use "Download All" for bulk downloading.</p>
                    </div>
                    <div class="download-file-list" id="downloadFileList">
                        <!-- File list will be populated here -->
                    </div>
                </div>
                <div class="download-modal-footer">
                    <button class="btn-secondary" id="downloadAllAtOnce">Download All at Once</button>
                    <button class="btn-primary" id="closeWhenDone">Close</button>
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
            /* Download Modal - Scoped styles to avoid conflicts */
            .download-modal {
                position: fixed !important;
                top: 0 !important; 
                left: 0 !important; 
                right: 0 !important; 
                bottom: 0 !important;
                z-index: 10000 !important;
                background: rgba(0,0,0,0.75) !important;
                backdrop-filter: blur(4px);
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                animation: fadeIn 0.3s ease-in-out;
            }
            .download-modal.hidden { 
                display: none !important; 
            }
            
            .download-modal-overlay {
                position: absolute !important;
                top: 0 !important; 
                left: 0 !important; 
                right: 0 !important; 
                bottom: 0 !important;
            }
            
            .download-modal-container {
                position: relative !important;
                background: white !important;
                border-radius: 12px !important;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
                max-width: 90vw !important;
                max-height: 90vh !important;
                width: 600px !important;
                overflow: hidden !important;
                animation: slideUp 0.3s ease-out;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .download-modal-header {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding: 20px 24px !important;
                border-bottom: 1px solid #e2e8f0 !important;
                background: #f8fafc !important;
                margin: 0 !important;
            }
            
            .download-modal-header h3 {
                margin: 0 !important;
                font-size: 1.25rem !important;
                font-weight: 600 !important;
                color: #1f2937 !important;
                padding: 0 !important;
            }
            
            .download-modal-close {
                background: none !important;
                border: none !important;
                font-size: 24px !important;
                color: #6b7280 !important;
                cursor: pointer !important;
                padding: 4px !important;
                border-radius: 4px !important;
                transition: background 0.2s !important;
                margin: 0 !important;
                width: auto !important;
                height: auto !important;
            }
            .download-modal-close:hover {
                background: #e5e7eb !important;
                color: #374151 !important;
            }
            
            .download-modal-body {
                padding: 24px !important;
                max-height: 60vh !important;
                overflow-y: auto !important;
                margin: 0 !important;
            }
            
            .download-progress-summary {
                margin-bottom: 20px !important;
                padding: 16px !important;
                background: #f0f9ff !important;
                border: 1px solid #bae6fd !important;
                border-radius: 8px !important;
            }
            
            .progress-text {
                font-weight: 500 !important;
                color: #0c4a6e !important;
                margin-bottom: 8px !important;
                text-align: center !important;
                padding: 0 !important;
            }
            
            .progress-bar-container {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .progress-bar {
                width: 100% !important;
                height: 8px !important;
                background: #e0f2fe !important;
                border-radius: 4px !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .progress-fill {
                height: 100% !important;
                background: linear-gradient(90deg, #3b82f6, #1d4ed8) !important;
                border-radius: 4px !important;
                transition: width 0.3s ease !important;
                width: 0% !important;
            }
            
            .download-info {
                background: #fffbeb !important;
                border: 1px solid #fde68a !important;
                border-radius: 8px !important;
                padding: 12px !important;
                margin-bottom: 20px !important;
                font-size: 14px !important;
            }
            
            .download-info p {
                margin: 4px 0 !important;
                color: #92400e !important;
                padding: 0 !important;
                line-height: 1.4 !important;
            }
            
            .download-file-list {
                display: flex !important;
                flex-direction: column !important;
                gap: 8px !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .download-file-item {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                padding: 12px 16px !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 8px !important;
                transition: all 0.2s !important;
                margin: 0 !important;
                background: white !important;
            }
            
            .download-file-item:hover {
                border-color: #cbd5e1 !important;
                background: #f8fafc !important;
            }
            
            .download-file-item.downloaded {
                background: #ecfdf5 !important;
                border-color: #86efac !important;
            }
            
            .file-item-info {
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                flex: 1 !important;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .file-item-icon {
                font-size: 20px !important;
                flex-shrink: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .file-item-details {
                min-width: 0 !important;
                flex: 1 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .file-item-name {
                font-weight: 500 !important;
                color: #1f2937 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                margin-bottom: 2px !important;
                padding: 0 !important;
                font-size: 14px !important;
            }
            
            .file-item-size {
                font-size: 12px !important;
                color: #6b7280 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            .file-item-action {
                flex-shrink: 0 !important;
                margin-left: 12px !important;
                padding: 0 !important;
            }
            
            .download-file-btn {
                padding: 8px 16px !important;
                background: #3b82f6 !important;
                color: white !important;
                border: none !important;
                border-radius: 6px !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                min-width: 100px !important;
                margin: 0 !important;
                text-align: center !important;
            }
            
            .download-file-btn:hover:not(:disabled) {
                background: #1d4ed8 !important;
                transform: translateY(-1px) !important;
            }
            
            .download-file-btn:disabled {
                background: #10b981 !important;
                cursor: default !important;
                transform: none !important;
            }
            
            .download-file-btn.downloaded {
                background: #10b981 !important;
            }
            
            .download-modal-footer {
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding: 20px 24px !important;
                border-top: 1px solid #e2e8f0 !important;
                background: #f8fafc !important;
                margin: 0 !important;
                gap: 12px !important;
            }
            
            .download-modal-footer .btn-secondary,
            .download-modal-footer .btn-primary {
                padding: 8px 16px !important;
                border-radius: 6px !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                border: none !important;
                margin: 0 !important;
                text-align: center !important;
            }
            
            .download-modal-footer .btn-secondary {
                background: #f3f4f6 !important;
                color: #374151 !important;
            }
            
            .download-modal-footer .btn-secondary:hover {
                background: #e5e7eb !important;
            }
            
            .download-modal-footer .btn-primary {
                background: #3b82f6 !important;
                color: white !important;
            }
            
            .download-modal-footer .btn-primary:hover {
                background: #1d4ed8 !important;
            }
            
            /* Mobile optimizations */
            @media (max-width: 768px) {
                .download-modal-container {
                    width: 95vw !important;
                    max-height: 95vh !important;
                }
                
                .download-modal-header {
                    padding: 16px 20px !important;
                }
                
                .download-modal-body {
                    padding: 20px !important;
                }
                
                .file-item-info {
                    gap: 8px !important;
                }
                
                .file-item-name {
                    font-size: 13px !important;
                }
                
                .download-file-btn {
                    padding: 6px 12px !important;
                    font-size: 13px !important;
                    min-width: 80px !important;
                }
                
                .download-modal-footer {
                    padding: 16px 20px !important;
                    flex-direction: column !important;
                    gap: 10px !important;
                }
                
                .download-modal-footer .btn-secondary,
                .download-modal-footer .btn-primary {
                    width: 100% !important;
                }
            }
            
            @media (max-width: 480px) {
                .download-file-item {
                    padding: 10px 12px !important;
                }
                
                .download-file-btn {
                    padding: 5px 10px !important;
                    font-size: 12px !important;
                    min-width: 70px !important;
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    bindModalEvents() {
        // Close modal
        document.getElementById('closeDownloadModal').onclick = () => this.hideDownloadModal();
        document.getElementById('closeWhenDone').onclick = () => this.hideDownloadModal();
        
        // Download all at once
        document.getElementById('downloadAllAtOnce').onclick = () => this.downloadAllAtOnce();
        
        // Close on overlay click
        document.querySelector('.download-modal-overlay').onclick = () => this.hideDownloadModal();
        
        // Prevent modal close when clicking inside
        document.querySelector('.download-modal-container').onclick = (e) => e.stopPropagation();
    }
    
    bindEvents() {
        // Mobile-friendly events
        if (this.isMobile) {
            // Handle Android back button (if app is added to home screen)
            window.addEventListener('popstate', (e) => {
                const modal = document.getElementById('downloadModal');
                if (modal && !modal.classList.contains('hidden')) {
                    e.preventDefault();
                    this.hideDownloadModal();
                    history.pushState(null, null, window.location.href);
                }
            });
        } else {
            // Desktop-only: Escape key for users with keyboards
            document.addEventListener('keydown', (e) => {
                const modal = document.getElementById('downloadModal');
                if (modal && !modal.classList.contains('hidden') && e.key === 'Escape') {
                    this.hideDownloadModal();
                }
            });
        }
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
            // Always use iframe method for same-page downloads
            this.downloadFrame.src = downloadUrl;
            
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
        this.showToast('🎉 All downloads started! Check your Downloads folder.', 'success');
        
        // Update close button text
        const closeBtn = document.getElementById('closeWhenDone');
        if (closeBtn) {
            closeBtn.textContent = 'All Done! 🎉';
            closeBtn.style.background = '#10b981';
        }
        
        // Clear selection in file manager
        if (window.App?.fileManager) {
            window.App.fileManager.clearSelection();
        }
    }
    
    downloadAllAtOnce() {
        // Trigger all downloads with delays to prevent browser blocking
        const remainingButtons = document.querySelectorAll('.download-file-btn:not(:disabled)');
        
        if (remainingButtons.length === 0) {
            this.showToast('All files already downloaded!', 'info');
            return;
        }
        
        remainingButtons.forEach((button, index) => {
            setTimeout(() => {
                button.click();
            }, index * 1500); // 1.5 second delays to prevent browser blocking
        });
        
        this.showToast(`Starting ${remainingButtons.length} downloads...`, 'info');
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
