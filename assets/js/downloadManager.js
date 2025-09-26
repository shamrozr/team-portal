// Enhanced DownloadManager.js with ZIP support
// This replaces/enhances your existing downloadManager.js

class DownloadManager {
    constructor() {
        this.downloadQueueData = [];
        this.activeDownloads = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.isDownloading = false;
        this.isMobile = this.detectMobile();
        this.zipLibrary = null; // Will load dynamically
        
        this.createDownloadWidget();
        this.createDownloadFrame();
        this.bindEvents();
        this.loadZipLibrary();
    }
    
    async loadZipLibrary() {
        try {
            // Try client-zip first (fastest, most mobile-friendly)
            if (this.supportsStreams()) {
                const { downloadZip } = await import('https://cdn.skypack.dev/client-zip');
                this.zipLibrary = { type: 'client-zip', lib: downloadZip };
                console.log('✅ Loaded client-zip library');
            } else {
                // Fallback to JSZip for older browsers
                const JSZip = await import('https://cdn.skypack.dev/jszip');
                this.zipLibrary = { type: 'jszip', lib: JSZip.default };
                console.log('✅ Loaded JSZip library (fallback)');
            }
        } catch (error) {
            console.warn('❌ Could not load ZIP library:', error);
            this.zipLibrary = null;
        }
    }
    
    supportsStreams() {
        return typeof ReadableStream !== 'undefined' && 
               typeof WritableStream !== 'undefined' &&
               !this.isMobile; // Client-zip works better on desktop
    }
    
    detectMobile() {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMobileScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;
        return isMobileUA || (isMobileScreen && isTouchDevice);
    }
    
    // MAIN DOWNLOAD METHOD - Now supports both individual and ZIP
    async downloadFiles(files, options = {}) {
        if (!files || files.length === 0) {
            this.showToast('No files to download', 'warning');
            return;
        }
        
        // Default to ZIP for multiple files if library is available
        const shouldZip = options.forceZip || 
                         (files.length > 1 && this.zipLibrary && !options.forceIndividual);
        
        if (shouldZip) {
            return this.downloadAsZip(files, options.zipName || 'download.zip');
        } else {
            return this.downloadIndividually(files);
        }
    }
    
    // NEW: ZIP Download Method
    async downloadAsZip(files, zipName = 'files.zip') {
        console.log(`📦 Starting ZIP download of ${files.length} files`);
        
        if (!this.zipLibrary) {
            console.warn('ZIP library not available, falling back to individual downloads');
            return this.downloadIndividually(files);
        }
        
        try {
            this.showWidget();
            this.updateZipProgress('Preparing ZIP archive...', 0);
            
            if (this.zipLibrary.type === 'client-zip') {
                return await this.downloadWithClientZip(files, zipName);
            } else {
                return await this.downloadWithJSZip(files, zipName);
            }
            
        } catch (error) {
            console.error('ZIP download failed:', error);
            this.showToast(`ZIP download failed: ${error.message}`, 'error');
            
            // Fallback to individual downloads
            console.log('Falling back to individual downloads...');
            return this.downloadIndividually(files);
        }
    }
    
    // Client-Zip Implementation (Best for modern browsers)
    async downloadWithClientZip(files, zipName) {
        const { lib: downloadZip } = this.zipLibrary;
        
        this.updateZipProgress('Fetching files...', 10);
        
        // Prepare file inputs for client-zip
        const fileInputs = files.map((file, index) => ({
            name: file.name,
            input: this.fetchFileForZip(file, index, files.length),
            lastModified: file.modifiedTime ? new Date(file.modifiedTime) : new Date()
        }));
        
        this.updateZipProgress('Creating ZIP stream...', 30);
        
        // Create ZIP stream
        const zipStream = downloadZip(fileInputs);
        
        this.updateZipProgress('Processing files...', 50);
        
        // Convert stream to blob with progress tracking
        const response = new Response(zipStream);
        const reader = response.body.getReader();
        const chunks = [];
        let receivedLength = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            receivedLength += value.length;
            
            // Update progress (rough estimate)
            const progress = Math.min(50 + (receivedLength / (1024 * 1024)) * 10, 90);
            this.updateZipProgress('Building ZIP archive...', progress);
        }
        
        this.updateZipProgress('Finalizing download...', 95);
        
        // Create final blob and trigger download
        const zipBlob = new Blob(chunks, { type: 'application/zip' });
        this.triggerBlobDownload(zipBlob, zipName);
        
        this.updateZipProgress('Download completed!', 100);
        this.showToast(`ZIP download completed: ${zipName}`, 'success');
        
        setTimeout(() => this.hideWidget(), 2000);
    }
    
    // JSZip Implementation (Fallback for older browsers)
    async downloadWithJSZip(files, zipName) {
        const JSZip = this.zipLibrary.lib;
        const zip = new JSZip();
        
        this.updateZipProgress('Downloading files...', 0);
        
        // Download all files first
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = (i / files.length) * 70; // 0-70% for downloading
            
            this.updateZipProgress(`Downloading ${file.name}...`, progress);
            
            try {
                const response = await fetch(this.getDownloadUrl(file.id));
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const blob = await response.blob();
                zip.file(file.name, blob);
                
                console.log(`Added ${file.name} to ZIP`);
                
            } catch (error) {
                console.error(`Failed to add ${file.name} to ZIP:`, error);
                // Continue with other files
            }
        }
        
        this.updateZipProgress('Creating ZIP archive...', 75);
        
        // Generate ZIP with progress callback
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 } // Good balance of speed/size
        }, (metadata) => {
            const progress = 75 + (metadata.percent * 0.2); // 75-95%
            this.updateZipProgress('Compressing files...', progress);
        });
        
        this.updateZipProgress('Starting download...', 98);
        
        // Trigger download
        this.triggerBlobDownload(zipBlob, zipName);
        
        this.updateZipProgress('Download completed!', 100);
        this.showToast(`ZIP download completed: ${zipName}`, 'success');
        
        setTimeout(() => this.hideWidget(), 2000);
    }
    
    // Helper: Fetch file for ZIP with error handling
    async fetchFileForZip(file, index, total) {
        try {
            console.log(`Fetching ${file.name} (${index + 1}/${total})`);
            
            const response = await fetch(this.getDownloadUrl(file.id));
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response.body || response.blob();
            
        } catch (error) {
            console.error(`Failed to fetch ${file.name}:`, error);
            
            // Return empty file as fallback
            return new Blob([''], { type: 'text/plain' });
        }
    }
    
    // Helper: Get download URL for file
    getDownloadUrl(fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    }
    
    // Helper: Trigger blob download
    triggerBlobDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        
        if (this.isMobile) {
            // Mobile-specific download handling
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Desktop download
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
        }
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    
    // FALLBACK: Individual downloads (your existing method)
    async downloadIndividually(files) {
        console.log(`📁 Starting individual downloads of ${files.length} files`);
        
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
        
        // Start processing with delays to avoid race conditions
        if (!this.isDownloading) {
            this.processDownloadQueueSafely();
        }
        
        this.showToast(
            files.length === 1 ? 'Download started' : `Started downloading ${files.length} files`,
            'success'
        );
    }
    
    // ENHANCED: Race-condition safe individual downloads
    async processDownloadQueueSafely() {
        if (this.isDownloading) return;
        
        this.isDownloading = true;
        this.activeDownloads = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        
        console.log(`Processing download queue: ${this.downloadQueueData.length} items`);
        
        try {
            // Process downloads sequentially with delays
            for (let i = 0; i < this.downloadQueueData.length; i++) {
                const item = this.downloadQueueData[i];
                
                if (item.status === 'cancelled') continue;
                
                // Download with retry logic
                await this.downloadSingleFileSafely(item);
                
                // Add delay between downloads to prevent race conditions
                if (i < this.downloadQueueData.length - 1) {
                    console.log('Waiting 1.5s before next download...');
                    await this.delay(1500); // Increased delay for mobile
                }
            }
            
            this.onDownloadsComplete();
            
        } catch (error) {
            console.error('Download queue processing failed:', error);
        } finally {
            this.isDownloading = false;
        }
    }
    
    async downloadSingleFileSafely(item) {
        try {
            item.status = 'downloading';
            item.startTime = Date.now();
            this.activeDownloads++;
            this.updateUI();
            this.updateItemUI(item);
            
            console.log(`Downloading file: ${item.name}`);
            
            const downloadUrl = this.getDownloadUrl(item.id);
            
            if (this.isMobile) {
                // Mobile: Direct link click
                await this.downloadMobileSafe(downloadUrl, item.name);
            } else {
                // Desktop: Iframe method
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
                return this.downloadSingleFileSafely(item);
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
    
    // Mobile-safe download method
    async downloadMobileSafe(url, filename) {
        return new Promise((resolve) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            link.target = '_blank'; // Helps on some mobile browsers
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Assume download started after short delay
            setTimeout(resolve, 800);
        });
    }
    
    // UI UPDATE METHODS
    updateZipProgress(message, percentage) {
        const headerText = document.getElementById('downloadHeaderText');
        const progressText = document.getElementById('downloadProgress');
        const progressFill = document.getElementById('progressFill');
        
        if (headerText) {
            headerText.textContent = 'Creating ZIP...';
        }
        
        if (progressText) {
            progressText.textContent = message;
        }
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        // Update download list with ZIP progress
        const downloadList = document.getElementById('downloadList');
        if (downloadList) {
            downloadList.innerHTML = `
                <div class="download-item downloading">
                    <div class="download-status-icon">📦</div>
                    <div class="download-info">
                        <div class="download-name">Creating ZIP Archive</div>
                        <div class="download-details">${message} (${Math.round(percentage)}%)</div>
                    </div>
                </div>
            `;
        }
    }
    
    // ADD ZIP CONTROLS TO YOUR EXISTING UI
    addZipControls() {
        // Add ZIP download button to your file selection UI
        const actionsContainer = document.querySelector('.actions-left');
        if (actionsContainer && this.zipLibrary) {
            const zipButton = document.createElement('button');
            zipButton.className = 'btn btn-primary';
            zipButton.innerHTML = '📦 Download as ZIP';
            zipButton.onclick = () => this.downloadSelectedAsZip();
            actionsContainer.appendChild(zipButton);
        }
    }
    
    // Method to call from your file manager
    downloadSelectedAsZip() {
        const selectedFiles = window.App?.fileManager?.getSelectedFiles?.() || [];
        
        if (selectedFiles.length === 0) {
            this.showToast('Please select files to download', 'warning');
            return;
        }
        
        this.downloadFiles(selectedFiles, { forceZip: true });
    }
    
    // Enhanced direct download for individual file buttons
    downloadSingleFileDirectly(fileId, fileName) {
        console.log(`Direct download for: ${fileName}`);
        
        const file = {
            id: fileId,
            name: fileName,
            mimeType: 'application/octet-stream'
        };
        
        // Use individual download for single files
        this.downloadFiles([file], { forceIndividual: true });
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
    
    // Your existing methods remain the same...
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
    
    // NEW: Add styles for individual file download buttons
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
            
            /* Mobile: Always show download buttons */
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
    
    // NEW: Add download button to individual files
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
    
    // NEW: Direct download for individual file buttons
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
            
            const downloadUrl = this.isMobile ? 
                `https://drive.google.com/uc?export=download&id=${item.id}&confirm=t` :
                `https://drive.google.com/uc?export=download&id=${item.id}`;
            
            if (this.isMobile) {
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = item.name;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
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
            const downloadIframe = document.createElement('iframe');
            downloadIframe.style.cssText = 'display: none; width: 0; height: 0;';
            downloadIframe.src = url;
            
            document.body.appendChild(downloadIframe);
            
            setTimeout(() => {
                document.body.removeChild(downloadIframe);
                resolve();
            }, 2000);
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
