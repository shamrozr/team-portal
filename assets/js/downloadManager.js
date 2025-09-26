// assets/js/downloadManager.js - Download queue and progress management

class DownloadManager {
    constructor() {
        this.downloadQueueData = []; // Renamed to avoid conflict
        this.activeDownloads = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.isDownloading = false;
        
        // DOM elements
        this.downloadModal = Utils.dom.select('#downloadModal');
        this.downloadQueueElement = Utils.dom.select('#downloadQueue'); // Renamed for clarity
        this.downloadProgress = Utils.dom.select('#downloadProgress');
        this.downloadStatus = Utils.dom.select('#downloadStatus');
        this.cancelDownloads = Utils.dom.select('#cancelDownloads');
        this.downloadFrame = Utils.dom.select('#downloadFrame');
        
        this.bindEvents();
        this.createDownloadFrame();
    }
    
    bindEvents() {
        // Cancel downloads button
        if (this.cancelDownloads) {
            this.cancelDownloads.addEventListener('click', () => {
                this.cancelAllDownloads();
            });
        }
        
        // Modal close handling
        if (this.downloadModal) {
            this.downloadModal.addEventListener('click', (e) => {
                if (e.target === this.downloadModal || e.target.classList.contains('modal-overlay')) {
                    // Only allow closing if no active downloads
                    if (!this.isDownloading) {
                        this.hideDownloadModal();
                    }
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDownloadModalVisible()) {
                if (!this.isDownloading) {
                    this.hideDownloadModal();
                }
            }
        });
    }
    
    createDownloadFrame() {
        // Create hidden iframe for downloads if it doesn't exist
        if (!this.downloadFrame) {
            this.downloadFrame = Utils.dom.create('iframe', {
                id: 'downloadFrame',
                style: 'display: none; width: 0; height: 0; border: none;'
            });
            document.body.appendChild(this.downloadFrame);
        }
    }
    
    async downloadFiles(files) {
        if (!files || files.length === 0) {
            Utils.showWarning('No files to download');
            return;
        }
        
        Config.log('info', `Starting download of ${files.length} files`);
        
        // Add files to queue
        const queueItems = files.map(file => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            status: 'queued',
            progress: 0,
            error: null,
            retries: 0,
            startTime: null,
            endTime: null
        }));
        
        this.downloadQueueData.push(...queueItems);
        
        // Show download modal
        this.showDownloadModal();
        
        // Update UI
        this.updateDownloadUI();
        
        // Start processing if not already running
        if (!this.isDownloading) {
            this.processDownloadQueue();
        }
        
        // Show success message
        const message = files.length === 1 ? 
            Config.SUCCESS_MESSAGES.DOWNLOAD_START : 
            `Started downloading ${files.length} files`;
        Utils.showSuccess(message);
    }
    
    async processDownloadQueue() {
        if (this.isDownloading) {
            return;
        }
        
        this.isDownloading = true;
        this.activeDownloads = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        
        Config.log('debug', `Processing download queue: ${this.downloadQueueData.length} items`);
        
        try {
            // Process downloads sequentially to avoid overwhelming the browser
            for (let i = 0; i < this.downloadQueueData.length; i++) {
                const item = this.downloadQueueData[i];
                
                if (item.status === 'cancelled') {
                    continue;
                }
                
                await this.downloadSingleFile(item);
                
                // Add delay between downloads to prevent rate limiting
                if (i < this.downloadQueueData.length - 1) {
                    await Utils.delay(Config.DOWNLOAD_SETTINGS.DOWNLOAD_DELAY);
                }
            }
            
            // All downloads processed
            this.onDownloadsComplete();
            
        } catch (error) {
            Config.log('error', 'Download queue processing failed:', error);
            this.updateStatus('Download process failed');
        } finally {
            this.isDownloading = false;
        }
    }
    
    async downloadSingleFile(item) {
        try {
            item.status = 'downloading';
            item.startTime = Date.now();
            this.activeDownloads++;
            this.updateDownloadUI();
            this.updateItemUI(item);
            
            Config.log('debug', `Downloading file: ${item.name}`);
            
            // Create download URL
            const downloadUrl = Config.getDriveDownloadURL(item.id);
            
            // Start download using iframe method
            await this.downloadWithIframe(downloadUrl, item.name);
            
            // Mark as completed
            item.status = 'completed';
            item.endTime = Date.now();
            item.progress = 100;
            this.completedDownloads++;
            this.activeDownloads--;
            
            Config.log('debug', `File downloaded successfully: ${item.name}`);
            
        } catch (error) {
            Config.log('error', `Download failed for ${item.name}:`, error);
            
            // Handle retry logic
            if (item.retries < Config.DOWNLOAD_SETTINGS.RETRY_ATTEMPTS) {
                item.retries++;
                item.status = 'retrying';
                this.updateItemUI(item);
                
                // Wait before retry
                await Utils.delay(Config.DOWNLOAD_SETTINGS.RETRY_DELAY * item.retries);
                
                // Retry download
                return this.downloadSingleFile(item);
            } else {
                // Max retries reached
                item.status = 'failed';
                item.error = error.message || 'Download failed';
                item.endTime = Date.now();
                this.failedDownloads++;
                this.activeDownloads--;
            }
        }
        
        this.updateDownloadUI();
        this.updateItemUI(item);
    }
    
    downloadWithIframe(url, filename) {
        return new Promise((resolve, reject) => {
            try {
                // Set the iframe source to trigger download
                this.downloadFrame.src = url;
                
                // Most downloads should start immediately
                // We'll resolve after a short delay since we can't reliably detect completion
                setTimeout(() => {
                    resolve();
                }, 1000);
                
                // Add error handling for iframe load failures
                const errorHandler = () => {
                    reject(new Error('Download request failed'));
                };
                
                this.downloadFrame.addEventListener('error', errorHandler, { once: true });
                
                // Cleanup after timeout
                setTimeout(() => {
                    this.downloadFrame.removeEventListener('error', errorHandler);
                }, 5000);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    showDownloadModal() {
        Utils.dom.show(this.downloadModal);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    hideDownloadModal() {
        if (this.isDownloading) {
            Utils.showWarning('Cannot close while downloads are in progress');
            return;
        }
        
        Utils.dom.hide(this.downloadModal);
        document.body.style.overflow = ''; // Restore scrolling
        
        // Clear completed downloads after a delay
        setTimeout(() => {
            this.clearCompletedDownloads();
        }, 1000);
    }
    
    isDownloadModalVisible() {
        return this.downloadModal && !this.downloadModal.classList.contains('hidden');
    }
    
    updateDownloadUI() {
        const totalFiles = this.downloadQueueData.length;
        const completed = this.completedDownloads + this.failedDownloads;
        
        // Update progress text
        if (this.downloadProgress) {
            this.downloadProgress.textContent = `${completed} of ${totalFiles} files`;
        }
        
        // Update status
        let status = '';
        if (this.isDownloading) {
            if (this.activeDownloads > 0) {
                status = `Downloading... (${this.activeDownloads} active)`;
            } else {
                status = 'Preparing next download...';
            }
        } else if (completed === totalFiles) {
            if (this.failedDownloads > 0) {
                status = `Completed with ${this.failedDownloads} failed`;
            } else {
                status = 'All downloads completed';
            }
        } else {
            status = 'Queued';
        }
        
        this.updateStatus(status);
        
        // Update queue UI
        this.updateQueueUI();
    }
    
    updateStatus(status) {
        if (this.downloadStatus) {
            this.downloadStatus.textContent = status;
        }
    }
    
    updateQueueUI() {
        if (!this.downloadQueueElement) return;
        
        this.downloadQueueElement.innerHTML = '';
        
        this.downloadQueueData.forEach(item => {
            const itemElement = this.createQueueItemElement(item);
            this.downloadQueueElement.appendChild(itemElement);
        });
    }
    
    createQueueItemElement(item) {
        const statusIcon = this.getStatusIcon(item.status);
        const statusText = this.getStatusText(item);
        
        const element = Utils.dom.create('div', {
            className: `download-item ${item.status}`,
            'data-id': item.id
        });
        
        element.innerHTML = `
            <div class="download-info">
                <div class="download-name" title="${Utils.sanitizeHTML(item.name)}">
                    ${Utils.sanitizeHTML(item.name)}
                </div>
                <div class="download-status">
                    ${statusText}
                    ${item.size ? `• ${Config.formatFileSize(item.size)}` : ''}
                    ${item.error ? `• ${Utils.sanitizeHTML(item.error)}` : ''}
                </div>
            </div>
            <div class="download-progress">
                ${statusIcon}
            </div>
        `;
        
        return element;
    }
    
    updateItemUI(item) {
        const itemElement = Utils.dom.select(`[data-id="${item.id}"]`);
        if (!itemElement) return;
        
        // Update classes
        itemElement.className = `download-item ${item.status}`;
        
        // Update status text
        const statusElement = itemElement.querySelector('.download-status');
        if (statusElement) {
            const statusText = this.getStatusText(item);
            statusElement.innerHTML = `
                ${statusText}
                ${item.size ? `• ${Config.formatFileSize(item.size)}` : ''}
                ${item.error ? `• ${Utils.sanitizeHTML(item.error)}` : ''}
            `;
        }
        
        // Update progress icon
        const progressElement = itemElement.querySelector('.download-progress');
        if (progressElement) {
            progressElement.innerHTML = this.getStatusIcon(item.status);
        }
    }
    
    getStatusIcon(status) {
        switch (status) {
            case 'queued':
                return '⏳';
            case 'downloading':
                return '<div class="loading-spinner"></div>';
            case 'retrying':
                return '<div class="loading-spinner"></div>';
            case 'completed':
                return '✅';
            case 'failed':
                return '❌';
            case 'cancelled':
                return '⏹️';
            default:
                return '❓';
        }
    }
    
    getStatusText(item) {
        switch (item.status) {
            case 'queued':
                return 'Queued for download';
            case 'downloading':
                return 'Downloading...';
            case 'retrying':
                return `Retrying... (${item.retries}/${Config.DOWNLOAD_SETTINGS.RETRY_ATTEMPTS})`;
            case 'completed':
                const duration = item.endTime && item.startTime ? 
                    `in ${((item.endTime - item.startTime) / 1000).toFixed(1)}s` : '';
                return `Downloaded ${duration}`;
            case 'failed':
                return 'Download failed';
            case 'cancelled':
                return 'Cancelled';
            default:
                return 'Unknown status';
        }
    }
    
    cancelAllDownloads() {
        if (!this.isDownloading) {
            Utils.showInfo('No active downloads to cancel');
            return;
        }
        
        Config.log('info', 'Cancelling all downloads');
        
        // Mark all queued items as cancelled
        this.downloadQueueData.forEach(item => {
            if (item.status === 'queued' || item.status === 'downloading') {
                item.status = 'cancelled';
                item.endTime = Date.now();
            }
        });
        
        // Stop the download process
        this.isDownloading = false;
        this.activeDownloads = 0;
        
        this.updateDownloadUI();
        Utils.showInfo('Downloads cancelled');
    }
    
    onDownloadsComplete() {
        Config.log('info', 'All downloads completed', {
            total: this.downloadQueueData.length,
            completed: this.completedDownloads,
            failed: this.failedDownloads
        });
        
        // Show completion message
        if (this.failedDownloads === 0) {
            Utils.showSuccess(Config.SUCCESS_MESSAGES.DOWNLOAD_COMPLETE);
        } else {
            Utils.showWarning(`Downloads completed with ${this.failedDownloads} failures`);
        }
        
        // Clear selection in file manager
        if (window.App?.fileManager) {
            window.App.fileManager.clearSelection();
        }
    }
    
    clearCompletedDownloads() {
        // Remove completed and failed downloads from queue
        this.downloadQueueData = this.downloadQueueData.filter(item => 
            item.status !== 'completed' && item.status !== 'failed' && item.status !== 'cancelled'
        );
        
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        
        if (this.downloadQueueData.length === 0) {
            this.updateDownloadUI();
        }
    }
    
    // Public API methods
    getQueueStatus() {
        return {
            total: this.downloadQueueData.length,
            active: this.activeDownloads,
            completed: this.completedDownloads,
            failed: this.failedDownloads,
            isDownloading: this.isDownloading
        };
    }
    
    hasActiveDownloads() {
        return this.isDownloading;
    }
    
    getQueueLength() {
        return this.downloadQueueData.length;
    }
    
    clearQueue() {
        if (this.isDownloading) {
            Utils.showWarning('Cannot clear queue while downloads are active');
            return false;
        }
        
        this.downloadQueueData = [];
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.updateDownloadUI();
        return true;
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DownloadManager;
}
