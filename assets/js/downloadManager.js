// assets/js/downloadManager.js - Individual button approach based on your working code

class DownloadManager {
    constructor() {
        this.downloadedFiles = new Set();
        this.totalFilesToDownload = 0;
        this.isMobile = this.detectMobile();
        
        this.createDownloadWidget();
        this.createDownloadFrame();
        this.bindEvents();
    }
    
    detectMobile() {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMobileScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;
        
        return isMobileUA || (isMobileScreen && isTouchDevice);
    }
    
    createDownloadWidget() {
        // Remove existing widget
        const existing = document.getElementById('downloadWidget');
        if (existing) existing.remove();
        
        const widget = document.createElement('div');
        widget.id = 'downloadWidget';
        widget.className = 'download-widget hidden';
        widget.innerHTML = `
            <div class="download-header">
                <div class="download-title">
                    <span class="download-icon">📥</span>
                    <span id="downloadHeaderText">Individual Downloads</span>
                </div>
                <div class="download-actions">
                    <button class="download-toggle" id="downloadToggle" title="Toggle download list">▼</button>
                    <button class="download-close" id="downloadClose" title="Close downloads">×</button>
                </div>
            </div>
            <div class="download-body" id="downloadBody">
                <div class="download-info-text">
                    <p>Click each file's download button individually:</p>
                </div>
                <div class="download-list" id="downloadList">
                    <!-- Download items will be added here -->
                </div>
                <div class="download-summary" id="downloadSummary">
                    <div class="download-progress">
                        <span id="downloadProgress">0 of 0 files downloaded</span>
                        <div class="download-progress-bar">
                            <div class="download-progress-fill" id="progressFill"></div>
                        </div>
                    </div>
                    <div class="download-controls">
                        <button class="download-btn primary-btn" id="downloadAllBtn">Download All</button>
                        <button class="download-btn cancel-btn" id="cancelAll">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        this.addStyles();
        document.body.appendChild(widget);
    }
    
    addStyles() {
        if (document.getElementById('downloadStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'downloadStyles';
        style.textContent = `
            .download-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 360px;
                max-width: calc(100vw - 40px);
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                z-index: 9999;
                border: 1px solid #e2e8f0;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .download-widget.hidden { display: none; }
            .download-widget.minimized .download-body { display: none; }
            .download-widget.minimized { width: 200px; }
            
            .download-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                cursor: pointer;
            }
            
            .download-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 14px;
            }
            
            .download-icon {
                font-size: 16px;
            }
            
            .download-actions {
                display: flex;
                gap: 4px;
            }
            
            .download-toggle, .download-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                transition: background 0.2s;
            }
            
            .download-toggle:hover, .download-close:hover {
                background: rgba(255,255,255,0.3);
            }
            
            .download-body {
                max-height: 500px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .download-info-text {
                padding: 12px 16px;
                background: #fffbeb;
                border-bottom: 1px solid #fde68a;
                font-size: 13px;
                color: #92400e;
            }
            
            .download-info-text p {
                margin: 0;
            }
            
            .download-list {
                max-height: 300px;
                overflow-y: auto;
                padding: 8px;
                flex: 1;
            }
            
            .download-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                margin-bottom: 8px;
                transition: all 0.2s;
                font-size: 13px;
                background: white;
            }
            
            .download-item:hover {
                border-color: #d1d5db;
                background: #f9fafb;
            }
            
            .download-item.downloaded {
                background: rgba(34, 197, 94, 0.1);
                border-color: #22c55e;
            }
            
            .download-item-info {
                flex: 1;
                min-width: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .download-item-icon {
                font-size: 16px;
                flex-shrink: 0;
            }
            
            .download-item-details {
                flex: 1;
                min-width: 0;
            }
            
            .download-name {
                font-weight: 500;
                color: #1f2937;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 2px;
                font-size: 13px;
            }
            
            .download-size {
                font-size: 11px;
                color: #6b7280;
            }
            
            .download-item-btn {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                min-width: 70px;
                font-weight: 500;
            }
            
            .download-item-btn:hover:not(:disabled) {
                background: #1d4ed8;
                transform: translateY(-1px);
            }
            
            .download-item-btn:disabled {
                background: #10b981;
                cursor: default;
                transform: none;
            }
            
            .download-summary {
                padding: 12px 16px;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
            }
            
            .download-progress {
                margin-bottom: 12px;
            }
            
            .download-progress span {
                font-size: 12px;
                color: #374151;
                font-weight: 500;
            }
            
            .download-progress-bar {
                width: 100%;
                height: 4px;
                background: #e2e8f0;
                border-radius: 2px;
                overflow: hidden;
                margin-top: 4px;
            }
            
            .download-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                border-radius: 2px;
                transition: width 0.3s ease;
                width: 0%;
            }
            
            .download-controls {
                display: flex;
                gap: 8px;
                justify-content: space-between;
            }
            
            .download-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                flex: 1;
            }
            
            .primary-btn {
                background: #3b82f6;
                color: white;
            }
            
            .primary-btn:hover {
                background: #1d4ed8;
            }
            
            .cancel-btn {
                background: #f3f4f6;
                color: #374151;
            }
            
            .cancel-btn:hover {
                background: #e5e7eb;
            }
            
            /* Mobile optimizations */
            @media (max-width: 768px) {
                .download-widget {
                    bottom: 15px;
                    right: 15px;
                    left: 15px;
                    width: auto;
                    max-width: none;
                }
                
                .download-widget.minimized {
                    left: auto;
                    width: 200px;
                }
                
                .download-header {
                    padding: 10px 12px;
                }
                
                .download-title {
                    font-size: 13px;
                }
                
                .download-list {
                    max-height: 250px;
                    padding: 6px;
                }
                
                .download-item {
                    padding: 10px;
                    font-size: 12px;
                }
                
                .download-item-btn {
                    min-width: 60px;
                    padding: 5px 8px;
                }
                
                .download-summary {
                    padding: 10px 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    bindEvents() {
        const widget = document.getElementById('downloadWidget');
        const toggle = document.getElementById('downloadToggle');
        const close = document.getElementById('downloadClose');
        const cancelAll = document.getElementById('cancelAll');
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        
        // Header click to toggle
        document.getElementById('downloadWidget').querySelector('.download-header').addEventListener('click', (e) => {
            if (e.target === toggle || e.target === close) return;
            this.toggleWidget();
        });
        
        // Toggle button
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleWidget();
        });
        
        // Close button
        close.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideWidget();
        });
        
        // Cancel/Close button
        cancelAll.addEventListener('click', () => {
            this.hideWidget();
        });
        
        // Download all button
        downloadAllBtn.addEventListener('click', () => {
            this.downloadAllFiles();
        });
    }
    
    createDownloadFrame() {
        if (!this.downloadFrame) {
            this.downloadFrame = document.createElement('iframe');
            this.downloadFrame.id = 'downloadFrame';
            this.downloadFrame.style.cssText = 'display: none; width: 0; height: 0; border: none;';
            document.body.appendChild(this.downloadFrame);
        }
    }
    
    async downloadFiles(files) {
        if (!files || files.length === 0) {
            this.showToast('No files to download', 'warning');
            return;
        }
        
        this.totalFilesToDownload = files.length;
        this.downloadedFiles.clear();
        
        // Populate the widget with files
        this.populateDownloadList(files);
        
        // Show widget
        this.showWidget();
        this.updateProgress();
        
        this.showToast(`Ready to download ${files.length} files`, 'success');
    }
    
    populateDownloadList(files) {
        const downloadList = document.getElementById('downloadList');
        if (!downloadList) return;
        
        downloadList.innerHTML = '';
        
        files.forEach((file, index) => {
            const itemElement = this.createDownloadItem(file, index);
            downloadList.appendChild(itemElement);
        });
    }
    
    createDownloadItem(file, index) {
        const element = document.createElement('div');
        element.className = 'download-item';
        element.setAttribute('data-id', file.id);
        
        const icon = this.getFileIcon(file.mimeType, file.name);
        const size = file.size ? this.formatFileSize(file.size) : '';
        
        element.innerHTML = `
            <div class="download-item-info">
                <div class="download-item-icon">${icon}</div>
                <div class="download-item-details">
                    <div class="download-name" title="${this.sanitizeHTML(file.name)}">${this.sanitizeHTML(file.name)}</div>
                    ${size ? `<div class="download-size">${size}</div>` : ''}
                </div>
            </div>
            <button class="download-item-btn" onclick="window.App.downloadManager.downloadSingleFile('${file.id}', '${this.sanitizeHTML(file.name)}')">
                Download
            </button>
        `;
        
        return element;
    }
    
    downloadSingleFile(fileId, fileName) {
        console.log(`Starting download for: ${fileName}`);
        
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        
        try {
            // Always use window.open for individual downloads (works on both mobile and desktop)
            window.open(downloadUrl, '_blank');
            
            // Mark as downloaded
            this.markFileAsDownloaded(fileId);
            
            this.showToast(`Download started: ${fileName}`, 'success');
            
        } catch (error) {
            console.error(`Download failed for ${fileName}:`, error);
            this.showToast(`Download failed: ${fileName}`, 'error');
        }
    }
    
    downloadAllFiles() {
        const remainingButtons = document.querySelectorAll('.download-item-btn:not(:disabled)');
        
        if (remainingButtons.length === 0) {
            this.showToast('All files already downloaded!', 'info');
            return;
        }
        
        // Download with delays to prevent browser blocking
        remainingButtons.forEach((button, index) => {
            setTimeout(() => {
                button.click();
            }, index * 1000); // 1 second delays
        });
        
        this.showToast(`Starting ${remainingButtons.length} downloads...`, 'info');
    }
    
    markFileAsDownloaded(fileId) {
        this.downloadedFiles.add(fileId);
        
        // Update UI for this file
        const fileItem = document.querySelector(`[data-id="${fileId}"]`);
        if (fileItem) {
            fileItem.classList.add('downloaded');
            
            const button = fileItem.querySelector('.download-item-btn');
            if (button) {
                button.textContent = 'Downloaded ✓';
                button.disabled = true;
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
        const downloaded = this.downloadedFiles.size;
        const total = this.totalFilesToDownload;
        const percentage = total > 0 ? (downloaded / total) * 100 : 0;
        
        // Update progress text
        const progressText = document.getElementById('downloadProgress');
        if (progressText) {
            progressText.textContent = `${downloaded} of ${total} files downloaded`;
        }
        
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        // Update header
        const headerText = document.getElementById('downloadHeaderText');
        if (headerText) {
            if (downloaded === total && total > 0) {
                headerText.textContent = 'All Downloads Complete!';
            } else {
                headerText.textContent = `Downloads (${downloaded}/${total})`;
            }
        }
    }
    
    onAllFilesDownloaded() {
        this.showToast('All downloads started! Check your Downloads folder.', 'success');
        
        // Update download all button
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        if (downloadAllBtn) {
            downloadAllBtn.textContent = 'All Done!';
            downloadAllBtn.style.background = '#10b981';
            downloadAllBtn.disabled = true;
        }
        
        // Clear selection in file manager
        if (window.App?.fileManager) {
            window.App.fileManager.clearSelection();
        }
    }
    
    showWidget() {
        const widget = document.getElementById('downloadWidget');
        if (widget) {
            widget.classList.remove('hidden');
        }
    }
    
    hideWidget() {
        const widget = document.getElementById('downloadWidget');
        if (widget) {
            widget.classList.add('hidden');
        }
        
        // Reset state
        this.downloadedFiles.clear();
        this.totalFilesToDownload = 0;
    }
    
    toggleWidget() {
        const widget = document.getElementById('downloadWidget');
        const toggle = document.getElementById('downloadToggle');
        
        if (widget.classList.contains('minimized')) {
            widget.classList.remove('minimized');
            toggle.textContent = '▼';
        } else {
            widget.classList.add('minimized');
            toggle.textContent = '▲';
        }
    }
    
    // Utility methods
    getFileIcon(mimeType, fileName) {
        if (window.Config?.getFileIcon) {
            return window.Config.getFileIcon(mimeType, fileName);
        }
        
        // Fallback icons
        if (mimeType?.startsWith('image/')) return '🖼️';
        if (mimeType?.startsWith('video/')) return '🎬';
        if (mimeType?.startsWith('audio/')) return '🎵';
        if (mimeType === 'application/pdf') return '📄';
        return '📄';
    }
    
    formatFileSize(bytes) {
        if (window.Config?.formatFileSize) {
            return window.Config.formatFileSize(bytes);
        }
        
        // Fallback file size formatting
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
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
    
    getQueueLength() {
        return this.totalFilesToDownload;
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DownloadManager;
}
