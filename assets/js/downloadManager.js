// assets/js/downloadManager.js - Mobile-optimized download manager

class DownloadManager {
    constructor() {
        this.downloadQueueData = [];
        this.activeDownloads = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.isDownloading = false;
        this.isMobile = this.detectMobile();
        
        this.createDownloadWidget();
        this.createDownloadFrame();
        this.bindEvents();
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
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
                    <span id="downloadHeaderText">Downloads</span>
                </div>
                <div class="download-actions">
                    <button class="download-toggle" id="downloadToggle" title="Toggle download list">▼</button>
                    <button class="download-close" id="downloadClose" title="Close downloads">×</button>
                </div>
            </div>
            <div class="download-body" id="downloadBody">
                <div class="download-list" id="downloadList">
                    <!-- Download items will be added here -->
                </div>
                <div class="download-summary" id="downloadSummary">
                    <div class="download-progress">
                        <span id="downloadProgress">0 of 0 files</span>
                        <div class="download-progress-bar">
                            <div class="download-progress-fill" id="progressFill"></div>
                        </div>
                    </div>
                    <div class="download-controls">
                        <button class="download-btn cancel-btn" id="cancelAll">Cancel All</button>
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
                width: 320px;
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
                max-height: 400px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .download-list {
                max-height: 300px;
                overflow-y: auto;
                padding: 8px;
            }
            
            .download-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px;
                border-radius: 6px;
                margin-bottom: 4px;
                transition: background 0.2s;
                font-size: 13px;
            }
            
            .download-item:hover {
                background: #f8fafc;
            }
            
            .download-item.downloading {
                background: rgba(59, 130, 246, 0.1);
                border-left: 3px solid #3b82f6;
            }
            
            .download-item.completed {
                background: rgba(34, 197, 94, 0.1);
                border-left: 3px solid #22c55e;
            }
            
            .download-item.failed {
                background: rgba(239, 68, 68, 0.1);
                border-left: 3px solid #ef4444;
            }
            
            .download-status-icon {
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
            }
            
            .download-info {
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
            }
            
            .download-details {
                font-size: 11px;
                color: #6b7280;
            }
            
            .download-summary {
                padding: 12px 16px;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
            }
            
            .download-progress {
                margin-bottom: 8px;
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
                justify-content: center;
            }
            
            .download-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .cancel-btn {
                background: #f3f4f6;
                color: #374151;
            }
            
            .cancel-btn:hover {
                background: #e5e7eb;
            }
            
            .download-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid #e5e7eb;
                border-top: 2px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Mobile optimizations */
            @media (max-width: 768px) {
                .download-widget {
                    bottom: 15px;
                    right: 15px;
                    width: 280px;
                    max-width: calc(100vw - 30px);
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
                    padding: 6px;
                    font-size: 12px;
                }
                
                .download-summary {
                    padding: 10px 12px;
                }
            }
            
            @media (max-width: 480px) {
                .download-widget {
                    bottom: 10px;
                    right: 10px;
                    width: 260px;
                    max-width: calc(100vw - 20px);
                }
                
                .download-widget.minimized {
                    width: 180px;
                }
                
                .download-header {
                    padding: 8px 10px;
                }
                
                .download-title {
                    font-size: 12px;
                }
                
                .download-list {
                    max-height: 200px;
                    padding: 4px;
                }
                
                .download-item {
                    padding: 5px;
                    font-size: 11px;
                    gap: 8px;
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
        
        // Cancel all button
        cancelAll.addEventListener('click', () => {
            this.cancelAllDownloads();
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
        
        console.log(`Starting download of ${files.length} files`);
        
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
        
        // Show widget
        this.showWidget();
        this.updateUI();
        
        // Start processing
        if (!this.isDownloading) {
            this.processDownloadQueue();
        }
        
        this.showToast(files.length === 1 ? 'Download started' : `Started downloading ${files.length} files`, 'success');
    }
    
    async processDownloadQueue() {
        if (this.isDownloading) return;
        
        this.isDownloading = true;
        this.activeDownloads = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        
        console.log(`Processing download queue: ${this.downloadQueueData.length} items`);
        
        try {
            for (let i = 0; i < this.downloadQueueData.length; i++) {
                const item = this.downloadQueueData[i];
                
                if (item.status === 'cancelled') continue;
                
                await this.downloadSingleFile(item);
                
                // Add delay between downloads
                if (i < this.downloadQueueData.length - 1) {
                    await this.delay(1000);
                }
            }
            
            this.onDownloadsComplete();
            
        } catch (error) {
            console.error('Download queue processing failed:', error);
        } finally {
            this.isDownloading = false;
        }
    }
    
    async downloadSingleFile(item) {
        try {
            item.status = 'downloading';
            item.startTime = Date.now();
            this.activeDownloads++;
            this.updateUI();
            this.updateItemUI(item);
            
            console.log(`Downloading file: ${item.name}`);
            
            const downloadUrl = `https://drive.google.com/uc?export=download&id=${item.id}`;
            
            if (this.isMobile) {
                // Mobile: Use direct link opening
                await this.downloadWithDirectLink(downloadUrl, item.name);
            } else {
                // Desktop: Use iframe method
                await this.downloadWithIframe(downloadUrl, item.name);
            }
            
            item.status = 'completed';
            item.endTime = Date.now();
            item.progress = 100;
            this.completedDownloads++;
            this.activeDownloads--;
            
            console.log(`File downloaded successfully: ${item.name}`);
            
        } catch (error) {
            console.error(`Download failed for ${item.name}:`, error);
            
            if (item.retries < 3) {
                item.retries++;
                item.status = 'retrying';
                this.updateItemUI(item);
                
                await this.delay(2000 * item.retries);
                return this.downloadSingleFile(item);
            } else {
                item.status = 'failed';
                item.error = error.message || 'Download failed';
                item.endTime = Date.now();
                this.failedDownloads++;
                this.activeDownloads--;
            }
        }
        
        this.updateUI();
        this.updateItemUI(item);
    }
    
    downloadWithDirectLink(url, filename) {
        return new Promise((resolve) => {
            // For mobile, create a temporary link and click it
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.target = '_blank';
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Resolve after a short delay
            setTimeout(resolve, 1000);
        });
    }
    
    downloadWithIframe(url, filename) {
        return new Promise((resolve, reject) => {
            try {
                this.downloadFrame.src = url;
                
                setTimeout(resolve, 1000);
                
                const errorHandler = () => {
                    reject(new Error('Download request failed'));
                };
                
                this.downloadFrame.addEventListener('error', errorHandler, { once: true });
                
                setTimeout(() => {
                    this.downloadFrame.removeEventListener('error', errorHandler);
                }, 5000);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    showWidget() {
        const widget = document.getElementById('downloadWidget');
        if (widget) {
            widget.classList.remove('hidden');
        }
    }
    
    hideWidget() {
        const widget = document.getElementById('downloadWidget');
        if (widget && !this.isDownloading) {
            widget.classList.add('hidden');
            setTimeout(() => this.clearCompletedDownloads(), 1000);
        }
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
    
    updateUI() {
        const totalFiles = this.downloadQueueData.length;
        const completed = this.completedDownloads + this.failedDownloads;
        const progress = totalFiles > 0 ? (completed / totalFiles) * 100 : 0;
        
        // Update header text
        const headerText = document.getElementById('downloadHeaderText');
        if (headerText) {
            if (this.isDownloading && this.activeDownloads > 0) {
                headerText.textContent = `Downloading... (${this.activeDownloads})`;
            } else {
                headerText.textContent = `Downloads (${totalFiles})`;
            }
        }
        
        // Update progress
        const progressText = document.getElementById('downloadProgress');
        const progressFill = document.getElementById('progressFill');
        
        if (progressText) {
            progressText.textContent = `${completed} of ${totalFiles} files`;
        }
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        this.updateQueueUI();
    }
    
    updateQueueUI() {
        const downloadList = document.getElementById('downloadList');
        if (!downloadList) return;
        
        downloadList.innerHTML = '';
        
        this.downloadQueueData.forEach(item => {
            const itemElement = this.createQueueItemElement(item);
            downloadList.appendChild(itemElement);
        });
    }
    
    createQueueItemElement(item) {
        const element = document.createElement('div');
        element.className = `download-item ${item.status}`;
        element.setAttribute('data-id', item.id);
        
        const statusIcon = this.getStatusIcon(item.status);
        const statusText = this.getStatusText(item);
        
        element.innerHTML = `
            <div class="download-status-icon">${statusIcon}</div>
            <div class="download-info">
                <div class="download-name" title="${this.sanitizeHTML(item.name)}">${this.sanitizeHTML(item.name)}</div>
                <div class="download-details">${statusText}${item.size ? ` • ${this.formatFileSize(item.size)}` : ''}</div>
            </div>
        `;
        
        return element;
    }
    
    updateItemUI(item) {
        const itemElement = document.querySelector(`[data-id="${item.id}"]`);
        if (!itemElement) return;
        
        itemElement.className = `download-item ${item.status}`;
        
        const statusIcon = itemElement.querySelector('.download-status-icon');
        const statusDetails = itemElement.querySelector('.download-details');
        
        if (statusIcon) {
            statusIcon.innerHTML = this.getStatusIcon(item.status);
        }
        
        if (statusDetails) {
            const statusText = this.getStatusText(item);
            statusDetails.innerHTML = `${statusText}${item.size ? ` • ${this.formatFileSize(item.size)}` : ''}`;
        }
    }
    
    getStatusIcon(status) {
        switch (status) {
            case 'queued': return '⏳';
            case 'downloading': return '<div class="download-spinner"></div>';
            case 'retrying': return '<div class="download-spinner"></div>';
            case 'completed': return '✅';
            case 'failed': return '❌';
            case 'cancelled': return '⏹️';
            default: return '❓';
        }
    }
    
    getStatusText(item) {
        switch (item.status) {
            case 'queued': return 'Queued';
            case 'downloading': return 'Downloading...';
            case 'retrying': return `Retrying... (${item.retries}/3)`;
            case 'completed':
                const duration = item.endTime && item.startTime ? 
                    ` in ${((item.endTime - item.startTime) / 1000).toFixed(1)}s` : '';
                return `Downloaded${duration}`;
            case 'failed': return `Failed${item.error ? `: ${item.error}` : ''}`;
            case 'cancelled': return 'Cancelled';
            default: return 'Unknown';
        }
    }
    
    cancelAllDownloads() {
        if (!this.isDownloading) {
            this.showToast('No active downloads to cancel', 'info');
            return;
        }
        
        this.downloadQueueData.forEach(item => {
            if (item.status === 'queued' || item.status === 'downloading') {
                item.status = 'cancelled';
                item.endTime = Date.now();
            }
        });
        
        this.isDownloading = false;
        this.activeDownloads = 0;
        
        this.updateUI();
        this.showToast('Downloads cancelled', 'info');
    }
    
    onDownloadsComplete() {
        console.log('All downloads completed', {
            total: this.downloadQueueData.length,
            completed: this.completedDownloads,
            failed: this.failedDownloads
        });
        
        if (this.failedDownloads === 0) {
            this.showToast('All downloads completed successfully!', 'success');
        } else {
            this.showToast(`Downloads completed with ${this.failedDownloads} failures`, 'warning');
        }
        
        // Clear selection in file manager
        if (window.App?.fileManager) {
            window.App.fileManager.clearSelection();
        }
    }
    
    clearCompletedDownloads() {
        this.downloadQueueData = this.downloadQueueData.filter(item => 
            item.status !== 'completed' && item.status !== 'failed' && item.status !== 'cancelled'
        );
        
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        
        if (this.downloadQueueData.length === 0) {
            this.updateUI();
        }
    }
    
    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        return this.isDownloading;
    }
    
    getQueueLength() {
        return this.downloadQueueData.length;
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DownloadManager;
}
