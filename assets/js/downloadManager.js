// assets/js/downloadManager.js - Enhanced with client-side ZIP creation

class DownloadManager {
    constructor() {
        this.downloadQueueData = [];
        this.activeDownloads = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.isDownloading = false;
        this.isMobile = this.detectMobile();
        this.zipWorker = null;
        
        this.createDownloadWidget();
        this.createDownloadFrame();
        this.bindEvents();
        this.addFileDownloadButtonStyles();
        this.loadJSZip();
    }
    
    async loadJSZip() {
        // Load JSZip library from CDN
        if (typeof JSZip === 'undefined') {
            try {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                script.onload = () => {
                    console.log('✅ JSZip loaded successfully');
                };
                script.onerror = () => {
                    console.error('❌ Failed to load JSZip');
                };
                document.head.appendChild(script);
            } catch (error) {
                console.error('Failed to load JSZip:', error);
            }
        }
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
                        <button class="download-btn zip-btn" id="createZip" style="display: none;">📦 Create ZIP</button>
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
                gap: 8px;
                flex-wrap: wrap;
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
            
            .zip-btn {
                background: #059669;
                color: white;
            }
            
            .zip-btn:hover {
                background: #047857;
            }
            
            .zip-btn:disabled {
                background: #9ca3af;
                cursor: not-allowed;
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
                
                .download-controls {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .download-btn {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
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
            
            @media (max-width: 768px) {
                .file-download-btn {
                    opacity: 1;
                    transform: scale(1);
                    top: 6px;
                    right: 6px;
                    width: 28px;
                    height: 28px;
                    font-size: 12px;
                }
            }
            
            .file-item {
                position: relative;
            }
        `;
        document.head.appendChild(style);
    }
    
    addDownloadButtonToFile(fileElement, file) {
        if (file.type === 'folder') return;
        if (fileElement.querySelector('.file-download-btn')) return;
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'file-download-btn';
        downloadBtn.innerHTML = '📥';
        downloadBtn.title = `Download ${file.name}`;
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            this.downloadSingleFileDirectly(file.id, file.name);
        };
        
        const fileContent = fileElement.querySelector('.file-content');
        if (fileContent) {
            fileContent.appendChild(downloadBtn);
        }
    }
    
    bindEvents() {
        const widget = document.getElementById('downloadWidget');
        const toggle = document.getElementById('downloadToggle');
        const close = document.getElementById('downloadClose');
        const cancelAll = document.getElementById('cancelAll');
        const createZip = document.getElementById('createZip');
        
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
        
        // Create ZIP button
        createZip.addEventListener('click', () => {
            this.createZipFromDownloads();
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
    
    // NEW: Bulk download with ZIP creation
    async downloadFiles(files) {
        if (!files || files.length === 0) {
            this.showToast('No files to download', 'warning');
            return;
        }
        
        console.log(`Starting download of ${files.length} files`);
        
        // If only one file, download directly
        if (files.length === 1) {
            this.downloadSingleFileDirectly(files[0].id, files[0].name);
            return;
        }
        
        // For multiple files, add to queue for ZIP creation
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
            endTime: null,
            data: null // Will store the downloaded blob
        }));
        
        this.downloadQueueData.push(...queueItems);
        
        // Show widget and ZIP button
        this.showWidget();
        this.showZipButton();
        this.updateUI();
        
        // Start downloading files for ZIP
        if (!this.isDownloading) {
            this.downloadFilesForZip();
        }
        
        this.showToast(`Preparing ${files.length} files for ZIP download...`, 'info');
    }
    
    async downloadFilesForZip() {
        if (this.isDownloading) return;
        
        this.isDownloading = true;
        this.activeDownloads = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        
        console.log(`Downloading files for ZIP: ${this.downloadQueueData.length} items`);
        
        try {
            // Download files sequentially to avoid overwhelming the browser
            for (let item of this.downloadQueueData) {
                if (item.status === 'cancelled') continue;
                
                await this.downloadFileForZip(item);
                
                // Small delay between downloads
                await this.delay(500);
            }
            
            this.onDownloadsComplete();
            
        } catch (error) {
            console.error('Download queue processing failed:', error);
        } finally {
            this.isDownloading = false;
        }
    }
    
    async downloadFileForZip(item) {
        try {
            item.status = 'downloading';
            item.startTime = Date.now();
            this.activeDownloads++;
            this.updateUI();
            this.updateItemUI(item);
            
            console.log(`Downloading file for ZIP: ${item.name}`);
            
            // Download file as blob
            const downloadUrl = `https://drive.google.com/uc?export=download&id=${item.id}`;
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            item.data = blob;
            
            item.status = 'completed';
            item.endTime = Date.now();
            item.progress = 100;
            this.completedDownloads++;
            this.activeDownloads--;
            
            console.log(`File downloaded for ZIP: ${item.name}`);
            
        } catch (error) {
            console.error(`Download failed for ${item.name}:`, error);
            
            if (item.retries < 2) {
                item.retries++;
                item.status = 'retrying';
                this.updateItemUI(item);
                
                await this.delay(2000 * item.retries);
                return this.downloadFileForZip(item);
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
    
    async createZipFromDownloads() {
        if (typeof JSZip === 'undefined') {
            this.showToast('ZIP library not loaded. Please try again.', 'error');
            return;
        }
        
        const completedFiles = this.downloadQueueData.filter(item => 
            item.status === 'completed' && item.data
        );
        
        if (completedFiles.length === 0) {
            this.showToast('No files available for ZIP creation', 'warning');
            return;
        }
        
        try {
            this.showToast('Creating ZIP file...', 'info');
            
            const zip = new JSZip();
            const zipButton = document.getElementById('createZip');
            
            // Disable ZIP button and show progress
            zipButton.disabled = true;
            zipButton.innerHTML = '⏳ Creating ZIP...';
            
            // Add files to ZIP
            for (const item of completedFiles) {
                zip.file(item.name, item.data);
            }
            
            // Generate ZIP
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });
            
            // Create download link
            const zipName = `files_${new Date().toISOString().split('T')[0]}.zip`;
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(zipBlob);
            downloadLink.download = zipName;
            downloadLink.style.display = 'none';
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Clean up object URL
            setTimeout(() => {
                URL.revokeObjectURL(downloadLink.href);
            }, 1000);
            
            this.showToast(`ZIP file "${zipName}" downloaded successfully!`, 'success');
            
            // Reset button
            zipButton.disabled = false;
            zipButton.innerHTML = '📦 Create ZIP';
            
            // Clear completed downloads after a delay
            setTimeout(() => {
                this.clearCompletedDownloads();
            }, 2000);
            
        } catch (error) {
            console.error('ZIP creation failed:', error);
            this.showToast('Failed to create ZIP file', 'error');
            
            // Reset button
            const zipButton = document.getElementById('createZip');
            zipButton.disabled = false;
            zipButton.innerHTML = '📦 Create ZIP';
        }
    }
    
    // Direct download for individual files
    downloadSingleFileDirectly(fileId, fileName) {
        console.log(`Direct download for: ${fileName}`);
        
        const downloadUrl = this.isMobile ? 
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t` :
            `https://drive.google.com/uc?export=download&id=${fileId}`;
        
        try {
            if (this.isMobile) {
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                this.downloadFrame.src = downloadUrl;
            }
            
            this.showToast(`Download started: ${fileName}`, 'success');
            
        } catch (error) {
            console.error(`Download failed for ${fileName}:`, error);
            this.showToast(`Download failed: ${fileName}`, 'error');
        }
    }
    
    showZipButton() {
        const zipButton = document.getElementById('createZip');
        if (zipButton) {
            zipButton.style.display = 'inline-block';
        }
    }
    
    hideZipButton() {
        const zipButton = document.getElementById('createZip');
        if (zipButton) {
            zipButton.style.display = 'none';
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
        if (widget && !this.isDownloading) {
            widget.classList.add('hidden');
            this.hideZipButton();
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
            case 'queued': return 'Queued for ZIP';
            case 'downloading': return 'Downloading...';
            case 'retrying': return `Retrying... (${item.retries}/2)`;
            case 'completed':
                const duration = item.endTime && item.startTime ? 
                    ` in ${((item.endTime - item.startTime) / 1000).toFixed(1)}s` : '';
                return `Ready for ZIP${duration}`;
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
        
        const hasCompletedFiles = this.downloadQueueData.some(item => 
            item.status === 'completed' && item.data
        );
        
        if (hasCompletedFiles) {
            this.showToast('Files ready! Click "Create ZIP" to download all files.', 'success');
        } else {
            this.showToast(`Downloads completed with ${this.failedDownloads} failures`, 'warning');
        }
        
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
            this.hideZipButton();
            this.updateUI();
        }
    }
    
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
    
    hasActiveDownloads() {
        return this.isDownloading;
    }
    
    getQueueLength() {
        return this.downloadQueueData.length;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DownloadManager;
}
