// assets/js/downloadManager.js - Debug version with proper error handling

class DownloadManager {
    constructor() {
        console.log('🔧 DownloadManager: Initializing...');
        
        this.downloadedFiles = new Set();
        this.totalFilesToDownload = 0;
        this.isMobile = this.detectMobile();
        
        try {
            this.createDownloadFrame();
            this.createDownloadModal();
            this.bindEvents();
            console.log('✅ DownloadManager: Initialized successfully');
        } catch (error) {
            console.error('❌ DownloadManager: Initialization failed:', error);
        }
    }
    
    detectMobile() {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMobileScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;
        
        return isMobileUA || (isMobileScreen && isTouchDevice);
    }
    
    createDownloadFrame() {
        try {
            if (!this.downloadFrame) {
                this.downloadFrame = document.createElement('iframe');
                this.downloadFrame.id = 'downloadFrame';
                this.downloadFrame.style.cssText = 'display: none; width: 0; height: 0; border: none;';
                document.body.appendChild(this.downloadFrame);
                console.log('✅ Download frame created');
            }
        } catch (error) {
            console.error('❌ Failed to create download frame:', error);
        }
    }
    
    createDownloadModal() {
        try {
            console.log('🔧 Creating download modal...');
            
            // Remove existing modal if it exists
            const existing = document.getElementById('downloadModal');
            if (existing) {
                existing.remove();
                console.log('🗑️ Removed existing modal');
            }
            
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
                            <p>📁 Files will download to your Downloads folder</p>
                            <p>⏯️ Click each button to start downloads</p>
                        </div>
                        <div class="download-file-list" id="downloadFileList">
                            <!-- File list will be populated here -->
                        </div>
                    </div>
                    <div class="download-modal-footer">
                        <button class="download-btn download-btn-secondary" id="downloadAllAtOnce">Download All</button>
                        <button class="download-btn download-btn-primary" id="closeWhenDone">Close</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            console.log('✅ Modal created and added to DOM');
            
            this.addModalStyles();
            this.bindModalEvents();
            
        } catch (error) {
            console.error('❌ Failed to create download modal:', error);
        }
    }
    
    addModalStyles() {
        try {
            if (document.getElementById('downloadModalStyles')) {
                console.log('ℹ️ Modal styles already exist');
                return;
            }
            
            const style = document.createElement('style');
            style.id = 'downloadModalStyles';
            style.textContent = `
                /* Download Modal Styles */
                .download-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 99999;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: modalFadeIn 0.3s ease;
                }
                
                .download-modal.hidden {
                    display: none;
                }
                
                .download-modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                }
                
                .download-modal-container {
                    position: relative;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    width: 90vw;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow: hidden;
                    animation: modalSlideIn 0.3s ease;
                }
                
                .download-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #e5e7eb;
                    background: #f9fafb;
                }
                
                .download-modal-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #111827;
                }
                
                .download-modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                
                .download-modal-close:hover {
                    background: #e5e7eb;
                    color: #374151;
                }
                
                .download-modal-body {
                    padding: 20px;
                    max-height: 50vh;
                    overflow-y: auto;
                }
                
                .download-progress-summary {
                    margin-bottom: 16px;
                    padding: 12px;
                    background: #dbeafe;
                    border-radius: 6px;
                }
                
                .progress-text {
                    text-align: center;
                    font-weight: 500;
                    color: #1e40af;
                    margin-bottom: 8px;
                    font-size: 14px;
                }
                
                .progress-bar-container {
                    width: 100%;
                }
                
                .progress-bar {
                    width: 100%;
                    height: 6px;
                    background: #bfdbfe;
                    border-radius: 3px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    background: #2563eb;
                    border-radius: 3px;
                    transition: width 0.3s ease;
                    width: 0%;
                }
                
                .download-info {
                    background: #fef3c7;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 16px;
                }
                
                .download-info p {
                    margin: 2px 0;
                    font-size: 13px;
                    color: #92400e;
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
                    padding: 12px;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    transition: all 0.2s;
                    background: white;
                }
                
                .download-file-item:hover {
                    border-color: #d1d5db;
                    background: #f9fafb;
                }
                
                .download-file-item.downloaded {
                    background: #ecfdf5;
                    border-color: #86efac;
                }
                
                .file-item-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                    min-width: 0;
                }
                
                .file-item-icon {
                    font-size: 18px;
                    flex-shrink: 0;
                }
                
                .file-item-details {
                    min-width: 0;
                    flex: 1;
                }
                
                .file-item-name {
                    font-weight: 500;
                    color: #111827;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 2px;
                    font-size: 14px;
                }
                
                .file-item-size {
                    font-size: 11px;
                    color: #6b7280;
                }
                
                .file-item-action {
                    flex-shrink: 0;
                    margin-left: 10px;
                }
                
                .download-file-btn {
                    padding: 6px 12px;
                    background: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-width: 80px;
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
                
                .download-modal-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    border-top: 1px solid #e5e7eb;
                    background: #f9fafb;
                    gap: 10px;
                }
                
                .download-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .download-btn-secondary {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                .download-btn-secondary:hover {
                    background: #e5e7eb;
                }
                
                .download-btn-primary {
                    background: #2563eb;
                    color: white;
                }
                
                .download-btn-primary:hover {
                    background: #1d4ed8;
                }
                
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes modalSlideIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                @media (max-width: 768px) {
                    .download-modal-container {
                        width: 95vw;
                        max-height: 90vh;
                    }
                    
                    .download-modal-header,
                    .download-modal-body,
                    .download-modal-footer {
                        padding: 16px;
                    }
                    
                    .download-modal-footer {
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .download-btn {
                        width: 100%;
                    }
                }
            `;
            
            document.head.appendChild(style);
            console.log('✅ Modal styles added');
        } catch (error) {
            console.error('❌ Failed to add modal styles:', error);
        }
    }
    
    bindModalEvents() {
        try {
            console.log('🔧 Binding modal events...');
            
            // Close button
            const closeBtn = document.getElementById('closeDownloadModal');
            const doneBtn = document.getElementById('closeWhenDone');
            const downloadAllBtn = document.getElementById('downloadAllAtOnce');
            const overlay = document.querySelector('.download-modal-overlay');
            const container = document.querySelector('.download-modal-container');
            
            if (closeBtn) {
                closeBtn.onclick = () => {
                    console.log('🔧 Close button clicked');
                    this.hideDownloadModal();
                };
            }
            
            if (doneBtn) {
                doneBtn.onclick = () => {
                    console.log('🔧 Done button clicked');
                    this.hideDownloadModal();
                };
            }
            
            if (downloadAllBtn) {
                downloadAllBtn.onclick = () => {
                    console.log('🔧 Download all button clicked');
                    this.downloadAllAtOnce();
                };
            }
            
            if (overlay) {
                overlay.onclick = () => {
                    console.log('🔧 Overlay clicked');
                    this.hideDownloadModal();
                };
            }
            
            if (container) {
                container.onclick = (e) => {
                    e.stopPropagation();
                };
            }
            
            console.log('✅ Modal events bound successfully');
        } catch (error) {
            console.error('❌ Failed to bind modal events:', error);
        }
    }
    
    bindEvents() {
        try {
            // Desktop keyboard events
            if (!this.isMobile) {
                document.addEventListener('keydown', (e) => {
                    const modal = document.getElementById('downloadModal');
                    if (modal && !modal.classList.contains('hidden') && e.key === 'Escape') {
                        this.hideDownloadModal();
                    }
                });
            }
            console.log('✅ Global events bound');
        } catch (error) {
            console.error('❌ Failed to bind events:', error);
        }
    }
    
    // Main public method - called from file manager
    async downloadFiles(files) {
        try {
            console.log('🔧 downloadFiles called with:', files?.length, 'files');
            
            if (!files || files.length === 0) {
                console.warn('⚠️ No files provided for download');
                this.showToast('No files to download', 'warning');
                return;
            }
            
            this.totalFilesToDownload = files.length;
            this.downloadedFiles.clear();
            
            console.log('🔧 Populating modal with files...');
            this.populateDownloadModal(files);
            
            console.log('🔧 Showing modal...');
            this.showDownloadModal();
            
        } catch (error) {
            console.error('❌ downloadFiles failed:', error);
            this.showToast('Failed to open download modal', 'error');
        }
    }
    
    populateDownloadModal(files) {
        try {
            const fileList = document.getElementById('downloadFileList');
            const modalTitle = document.getElementById('downloadModalTitle');
            
            if (!fileList || !modalTitle) {
                console.error('❌ Modal elements not found');
                return;
            }
            
            modalTitle.textContent = `Download Files (${files.length} selected)`;
            fileList.innerHTML = '';
            
            files.forEach((file, index) => {
                try {
                    const fileItem = this.createFileItem(file, index);
                    fileList.appendChild(fileItem);
                } catch (itemError) {
                    console.error('❌ Failed to create file item:', itemError);
                }
            });
            
            this.updateProgress();
            console.log('✅ Modal populated with', files.length, 'files');
        } catch (error) {
            console.error('❌ Failed to populate modal:', error);
        }
    }
    
    createFileItem(file, index) {
        const item = document.createElement('div');
        item.className = 'download-file-item';
        item.dataset.fileId = file.id;
        
        const icon = this.getFileIcon(file.mimeType, file.name);
        const size = file.size ? this.formatFileSize(file.size) : '';
        const safeName = this.sanitizeHTML(file.name);
        
        item.innerHTML = `
            <div class="file-item-info">
                <div class="file-item-icon">${icon}</div>
                <div class="file-item-details">
                    <div class="file-item-name" title="${safeName}">${safeName}</div>
                    ${size ? `<div class="file-item-size">${size}</div>` : ''}
                </div>
            </div>
            <div class="file-item-action">
                <button class="download-file-btn" onclick="window.App?.downloadManager?.downloadSingleFile('${file.id}', '${safeName}')">
                    Download
                </button>
            </div>
        `;
        
        return item;
    }
    
    downloadSingleFile(fileId, fileName) {
        try {
            console.log('🔧 Starting download for:', fileName);
            
            const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            
            // Use iframe method for downloads
            if (this.downloadFrame) {
                this.downloadFrame.src = downloadUrl;
                console.log('✅ Download initiated via iframe');
            } else {
                console.warn('⚠️ Download frame not found, creating new one');
                this.createDownloadFrame();
                this.downloadFrame.src = downloadUrl;
            }
            
            // Mark as downloaded
            this.markFileAsDownloaded(fileId);
            this.showToast(`Download started: ${fileName}`, 'success');
            
        } catch (error) {
            console.error('❌ Download failed for', fileName, ':', error);
            this.showToast(`Download failed: ${fileName}`, 'error');
        }
    }
    
    markFileAsDownloaded(fileId) {
        try {
            this.downloadedFiles.add(fileId);
            
            // Update UI for this file
            const fileItem = document.querySelector(`[data-file-id="${fileId}"]`);
            if (fileItem) {
                fileItem.classList.add('downloaded');
                
                const button = fileItem.querySelector('.download-file-btn');
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
        } catch (error) {
            console.error('❌ Failed to mark file as downloaded:', error);
        }
    }
    
    updateProgress() {
        try {
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
        } catch (error) {
            console.error('❌ Failed to update progress:', error);
        }
    }
    
    onAllFilesDownloaded() {
        this.showToast('🎉 All downloads started! Check your Downloads folder.', 'success');
        
        const closeBtn = document.getElementById('closeWhenDone');
        if (closeBtn) {
            closeBtn.textContent = 'All Done! 🎉';
            closeBtn.style.background = '#10b981';
        }
        
        // Clear selection in file manager
        if (window.App?.fileManager?.clearSelection) {
            window.App.fileManager.clearSelection();
        }
    }
    
    downloadAllAtOnce() {
        try {
            const remainingButtons = document.querySelectorAll('.download-file-btn:not(:disabled)');
            
            if (remainingButtons.length === 0) {
                this.showToast('All files already downloaded!', 'info');
                return;
            }
            
            remainingButtons.forEach((button, index) => {
                setTimeout(() => {
                    button.click();
                }, index * 1500);
            });
            
            this.showToast(`Starting ${remainingButtons.length} downloads...`, 'info');
        } catch (error) {
            console.error('❌ Download all failed:', error);
        }
    }
    
    showDownloadModal() {
        try {
            console.log('🔧 Showing download modal...');
            const modal = document.getElementById('downloadModal');
            
            if (!modal) {
                console.error('❌ Modal not found!');
                return;
            }
            
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            console.log('✅ Modal shown successfully');
        } catch (error) {
            console.error('❌ Failed to show modal:', error);
        }
    }
    
    hideDownloadModal() {
        try {
            console.log('🔧 Hiding download modal...');
            const modal = document.getElementById('downloadModal');
            
            if (modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }
            
            // Reset state
            this.downloadedFiles.clear();
            this.totalFilesToDownload = 0;
            console.log('✅ Modal hidden successfully');
        } catch (error) {
            console.error('❌ Failed to hide modal:', error);
        }
    }
    
    // Utility methods
    sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
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
    
    showToast(message, type = 'info') {
        try {
            if (window.Utils?.showToast) {
                if (type === 'success') window.Utils.showSuccess(message);
                else if (type === 'warning') window.Utils.showWarning(message);
                else if (type === 'error') window.Utils.showError(message);
                else window.Utils.showInfo(message);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        } catch (error) {
            console.error('❌ Toast failed:', error);
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
