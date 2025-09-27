// assets/js/downloadManager.js - User-controlled sequential downloads

class DownloadManager {
    constructor() {
        this.downloadQueueData = [];
        this.activeDownloads = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.isDownloading = false;
        this.isMobile = this.detectMobile();
        this.currentDownloadIndex = 0;
        this.userInteractionDetected = false;
        this.downloadStateListeners = new Map();
        
        this.createDownloadWidget();
        this.createDownloadFrame();
        this.bindEvents();
        this.addFileDownloadButtonStyles();
        this.setupDownloadDetection();
    }
    
    detectMobile() {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMobileScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;
        
        return isMobileUA || (isMobileScreen && isTouchDevice);
    }
    
    setupDownloadDetection() {
        // Detect when user interacts with download prompts
        this.setupUserInteractionDetection();
        this.setupDownloadStateDetection();
    }
    
    setupUserInteractionDetection() {
        // Listen for various user interaction events that indicate download action
        const events = ['click', 'touchstart', 'keydown', 'mousedown'];
        
        events.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                // Only track interactions on download-related elements or system dialogs
                if (this.isDownloadRelatedInteraction(e)) {
                    this.userInteractionDetected = true;
                    console.log('User interaction detected for download');
                }
            }, true);
        });
    }
    
    isDownloadRelatedInteraction(event) {
        // Check if the interaction is related to download elements
        const target = event.target;
        
        // Check for download-related elements
        const downloadElements = [
            '.download-trigger',
            '.file-download-btn',
            '[download]',
            'iframe',
            // System download dialog elements (these vary by browser)
            '[role="dialog"]',
            '[aria-label*="download" i]',
            '[aria-label*="save" i]'
        ];
        
        return downloadElements.some(selector => {
            try {
                return target.matches(selector) || target.closest(selector);
            } catch (e) {
                return false;
            }
        });
    }
    
    setupDownloadStateDetection() {
        // Monitor document visibility changes (helps detect download dialogs)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Document became hidden - possible download dialog');
                this.userInteractionDetected = true;
            }
        });
        
        // Monitor focus changes (download dialogs often steal focus)
        window.addEventListener('blur', () => {
            if (this.isDownloading) {
                console.log('Window lost focus during download - possible save dialog');
                this.userInteractionDetected = true;
            }
        });
        
        window.addEventListener('focus', () => {
            if (this.isDownloading && this.userInteractionDetected) {
                console.log('Window regained focus after interaction - download likely handled');
                setTimeout(() => {
                    this.onDownloadHandled();
                }, 1000); // Small delay to ensure download processing
            }
        });
    }
    
    onDownloadHandled() {
        if (this.isDownloading && this.userInteractionDetected) {
            console.log('Download interaction completed, proceeding to next file');
            this.userInteractionDetected = false;
            this.proceedToNextDownload();
        }
    }
    
    createDownloadWidget() {
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
                <div class="download-instructions" id="downloadInstructions" style="display: none;">
                    <div class="instruction-content">
                        <p><strong>📱 Download Instructions:</strong></p>
                        <p id="instructionText">Please save the current file, then click "Next File" to continue.</p>
                        <button class="btn btn-primary" id="nextFileButton" style="display: none;">
                            ⏭️ Next File
                        </button>
                        <button class="btn btn-secondary" id="skipFileButton" style="display: none;">
                            ⏩ Skip This File
                        </button>
                    </div>
                </div>
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
                        <button class="download-btn start-btn" id="startDownloads" style="display: none;">🚀 Start Downloads</button>
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
                width: 350px;
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
                max-height: 450px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            
            .download-instructions {
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                border-bottom: 1px solid #f59e0b;
                padding: 16px;
                text-align: center;
            }
            
            .instruction-content {
                color: #92400e;
                font-size: 13px;
                line-height: 1.4;
            }
            
            .instruction-content p {
                margin: 0 0 8px 0;
            }
            
            .instruction-content strong {
                color: #78350f;
            }
            
            .download-list {
                max-height: 250px;
                overflow-y: auto;
                padding: 8px;
            }
            
            .download-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px;
                border-radius: 8px;
                margin-bottom: 6px;
                transition: all 0.2s;
                font-size: 13px;
                border: 2px solid transparent;
            }
            
            .download-item:hover {
                background: #f8fafc;
            }
            
            .download-item.current {
                background: rgba(59, 130, 246, 0.1);
                border-color: #3b82f6;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
            }
            
            .download-item.waiting {
                background: rgba(251, 191, 36, 0.1);
                border-color: #fbbf24;
            }
            
            .download-item.completed {
                background: rgba(34, 197, 94, 0.1);
                border-color: #22c55e;
            }
            
            .download-item.failed {
                background: rgba(239, 68, 68, 0.1);
                border-color: #ef4444;
            }
            
            .download-status-icon {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
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
                margin-bottom: 3px;
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
                margin-bottom: 12px;
            }
            
            .download-progress span {
                font-size: 12px;
                color: #374151;
                font-weight: 500;
            }
            
            .download-progress-bar {
                width: 100%;
                height: 6px;
                background: #e2e8f0;
                border-radius: 3px;
                overflow: hidden;
                margin-top: 6px;
            }
            
            .download-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                border-radius: 3px;
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
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }
            
            .cancel-btn {
                background: #f3f4f6;
                color: #374151;
            }
            
            .cancel-btn:hover {
                background: #e5e7eb;
            }
            
            .start-btn {
                background: #059669;
                color: white;
            }
            
            .start-btn:hover {
                background: #047857;
            }
            
            .btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                margin: 4px 2px;
            }
            
            .btn-primary {
                background: #3b82f6;
                color: white;
            }
            
            .btn-primary:hover {
                background: #2563eb;
            }
            
            .btn-secondary {
                background: #6b7280;
                color: white;
            }
            
            .btn-secondary:hover {
                background: #4b5563;
            }
            
            .download-spinner {
                width: 18px;
                height: 18px;
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
                    bottom: 10px;
                    right: 10px;
                    left: 10px;
                    width: auto;
                    max-width: none;
                }
                
                .download-controls {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .download-btn {
                    width: 100%;
                }
                
                .instruction-content .btn {
                    width: 100%;
                    margin: 4px 0;
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
        downloadBtn.className = 'file-download-btn download-trigger';
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
        const startDownloads = document.getElementById('startDownloads');
        const nextFileButton = document.getElementById('nextFileButton');
        const skipFileButton = document.getElementById('skipFileButton');
        
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
        
        // Start downloads button
        startDownloads.addEventListener('click', () => {
            this.startSequentialDownloads();
        });
        
        // Next file button
        nextFileButton.addEventListener('click', () => {
            this.proceedToNextDownload();
        });
        
        // Skip file button
        skipFileButton.addEventListener('click', () => {
            this.skipCurrentDownload();
        });
    }
    
    createDownloadFrame() {
        if (!this.downloadFrame) {
            this.downloadFrame = document.createElement('iframe');
            this.downloadFrame.id = 'downloadFrame';
            this.downloadFrame.className = 'download-trigger';
            this.downloadFrame.style.cssText = 'display: none; width: 0; height: 0; border: none;';
            document.body.appendChild(this.downloadFrame);
        }
    }
    
    // Main download function for multiple files
    async downloadFiles(files) {
        if (!files || files.length === 0) {
            this.showToast('No files to download', 'warning');
            return;
        }
        
        console.log(`Preparing to download ${files.length} files`);
        
        // If only one file, download directly
        if (files.length === 1) {
            this.downloadSingleFileDirectly(files[0].id, files[0].name);
            return;
        }
        
        // For multiple files, set up user-controlled sequential downloads
        this.setupSequentialDownloads(files);
    }
    
    setupSequentialDownloads(files) {
        // Reset state
        this.downloadQueueData = [];
        this.currentDownloadIndex = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.isDownloading = false;
        
        // Add files to queue
        const queueItems = files.map((file, index) => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            status: 'waiting',
            progress: 0,
            error: null,
            retries: 0,
            startTime: null,
            endTime: null,
            index: index
        }));
        
        this.downloadQueueData = queueItems;
        
        // Show widget and start button
        this.showWidget();
        this.showStartButton();
        this.updateUI();
        
        this.showToast(`${files.length} files ready for download. Click "Start Downloads" to begin.`, 'info');
    }
    
    startSequentialDownloads() {
        if (this.downloadQueueData.length === 0) {
            this.showToast('No files in download queue', 'warning');
            return;
        }
        
        this.isDownloading = true;
        this.currentDownloadIndex = 0;
        this.hideStartButton();
        this.showInstructions();
        
        // Start with the first file
        this.downloadCurrentFile();
    }
    
    downloadCurrentFile() {
        if (this.currentDownloadIndex >= this.downloadQueueData.length) {
            this.onAllDownloadsComplete();
            return;
        }
        
        const currentItem = this.downloadQueueData[this.currentDownloadIndex];
        if (!currentItem || currentItem.status === 'completed' || currentItem.status === 'skipped') {
            this.proceedToNextDownload();
            return;
        }
        
        console.log(`Starting download for: ${currentItem.name}`);
        
        // Mark as current and start download
        currentItem.status = 'current';
        currentItem.startTime = Date.now();
        this.userInteractionDetected = false;
        
        this.updateUI();
        this.updateInstructions(currentItem);
        
        // Trigger download
        this.triggerFileDownload(currentItem);
        
        // Start monitoring for user interaction
        this.monitorDownloadProgress(currentItem);
    }
    
    triggerFileDownload(item) {
        const downloadUrl = this.isMobile ? 
            `https://drive.google.com/uc?export=download&id=${item.id}&confirm=t` :
            `https://drive.google.com/uc?export=download&id=${item.id}`;
        
        try {
            if (this.isMobile) {
                // For mobile, create download link
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = item.name;
                link.className = 'download-trigger';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // For desktop, use iframe
                this.downloadFrame.src = downloadUrl;
            }
            
            console.log(`Download triggered for: ${item.name}`);
            
        } catch (error) {
            console.error(`Failed to trigger download for ${item.name}:`, error);
            this.markDownloadFailed(item, error.message);
        }
    }
    
    monitorDownloadProgress(item) {
        // Show manual controls after a short delay
        setTimeout(() => {
            if (item.status === 'current') {
                this.showManualControls();
            }
        }, 2000);
        
        // Auto-advance if user interaction is detected quickly
        const checkInterval = setInterval(() => {
            if (this.userInteractionDetected || item.status !== 'current') {
                clearInterval(checkInterval);
                
                if (this.userInteractionDetected) {
                    setTimeout(() => {
                        if (item.status === 'current') {
                            this.markDownloadCompleted(item);
                            this.proceedToNextDownload();
                        }
                    }, 1000);
                }
            }
        }, 500);
        
        // Timeout after 30 seconds if no interaction
        setTimeout(() => {
            clearInterval(checkInterval);
            if (item.status === 'current') {
                console.log(`Download timeout for: ${item.name}`);
                this.showManualControls();
            }
        }, 30000);
    }
    
    markDownloadCompleted(item) {
        item.status = 'completed';
        item.endTime = Date.now();
        item.progress = 100;
        this.completedDownloads++;
        
        console.log(`Download completed: ${item.name}`);
        this.updateUI();
    }
    
    markDownloadFailed(item, error) {
        item.status = 'failed';
        item.error = error || 'Download failed';
        item.endTime = Date.now();
        this.failedDownloads++;
        
        console.log(`Download failed: ${item.name} - ${error}`);
        this.updateUI();
    }
    
    proceedToNextDownload() {
        this.hideManualControls();
        this.userInteractionDetected = false;
        this.currentDownloadIndex++;
        
        if (this.currentDownloadIndex < this.downloadQueueData.length) {
            // Short delay before next download
            setTimeout(() => {
                this.downloadCurrentFile();
            }, 1000);
        } else {
            this.onAllDownloadsComplete();
        }
    }
    
    skipCurrentDownload() {
        const currentItem = this.downloadQueueData[this.currentDownloadIndex];
        if (currentItem) {
            currentItem.status = 'skipped';
            currentItem.endTime = Date.now();
            console.log(`Download skipped: ${currentItem.name}`);
        }
        
        this.proceedToNextDownload();
    }
    
    onAllDownloadsComplete() {
        this.isDownloading = false;
        this.hideInstructions();
        this.hideManualControls();
        
        console.log('All downloads completed', {
            total: this.downloadQueueData.length,
            completed: this.completedDownloads,
            failed: this.failedDownloads
        });
        
        const skipped = this.downloadQueueData.filter(item => item.status === 'skipped').length;
        
        let message = `Downloads finished! `;
        if (this.completedDownloads > 0) message += `${this.completedDownloads} completed`;
        if (this.failedDownloads > 0) message += `, ${this.failedDownloads} failed`;
        if (skipped > 0) message += `, ${skipped} skipped`;
        
        this.showToast(message, this.failedDownloads === 0 ? 'success' : 'warning');
        
        // Clear selection in file manager
        if (window.App?.fileManager) {
            window.App.fileManager.clearSelection();
        }
        
        // Auto-hide widget after delay
        setTimeout(() => {
            this.clearCompletedDownloads();
        }, 5000);
    }
    
    updateInstructions(currentItem) {
        const instructionText = document.getElementById('instructionText');
        if (instructionText && currentItem) {
            const fileNumber = this.currentDownloadIndex + 1;
            const totalFiles = this.downloadQueueData.length;
            instructionText.innerHTML = `
                <strong>File ${fileNumber} of ${totalFiles}:</strong><br>
                ${currentItem.name}<br><br>
                Please save the file when your browser prompts you, then click "Next File" to continue.
            `;
        }
    }
    
    showInstructions() {
        const instructions = document.getElementById('downloadInstructions');
        if (instructions) {
            instructions.style.display = 'block';
        }
    }
    
    hideInstructions() {
        const instructions = document.getElementById('downloadInstructions');
        if (instructions) {
            instructions.style.display = 'none';
        }
    }
    
    showManualControls() {
        const nextButton = document.getElementById('nextFileButton');
        const skipButton = document.getElementById('skipFileButton');
        
        if (nextButton) nextButton.style.display = 'inline-block';
        if (skipButton) skipButton.style.display = 'inline-block';
    }
    
    hideManualControls() {
        const nextButton = document.getElementById('nextFileButton');
        const skipButton = document.getElementById('skipFileButton');
        
        if (nextButton) nextButton.style.display = 'none';
        if (skipButton) skipButton.style.display = 'none';
    }
    
    showStartButton() {
        const startButton = document.getElementById('startDownloads');
        if (startButton) {
            startButton.style.display = 'inline-block';
        }
    }
    
    hideStartButton() {
        const startButton = document.getElementById('startDownloads');
        if (startButton) {
            startButton.style.display = 'none';
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
                link.className = 'download-trigger';
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
            this.hideStartButton();
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
        const completed = this.downloadQueueData.filter(item => 
            item.status === 'completed' || item.status === 'skipped'
        ).length;
        const progress = totalFiles > 0 ? (completed / totalFiles) * 100 : 0;
        
        // Update header text
        const headerText = document.getElementById('downloadHeaderText');
        if (headerText) {
            if (this.isDownloading) {
                const current = this.currentDownloadIndex + 1;
                headerText.textContent = `Downloading ${current}/${totalFiles}`;
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
        
        this.downloadQueueData.forEach((item, index) => {
            const itemElement = this.createQueueItemElement(item, index);
            downloadList.appendChild(itemElement);
        });
    }
    
    createQueueItemElement(item, index) {
        const element = document.createElement('div');
        element.className = `download-item ${item.status}`;
        element.setAttribute('data-id', item.id);
        element.setAttribute('data-index', index);
        
        const statusIcon = this.getStatusIcon(item.status, index);
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
    
    getStatusIcon(status, index) {
        switch (status) {
            case 'waiting': 
                return index === 0 ? '🎯' : `${index + 1}`;
            case 'current': 
                return '<div class="download-spinner"></div>';
            case 'completed': 
                return '✅';
            case 'failed': 
                return '❌';
            case 'skipped': 
                return '⏩';
            default: 
                return '❓';
        }
    }
    
    getStatusText(item) {
        const fileNum = item.index + 1;
        const total = this.downloadQueueData.length;
        
        switch (item.status) {
            case 'waiting': 
                return `Waiting (${fileNum}/${total})`;
            case 'current': 
                return `Downloading now... (${fileNum}/${total})`;
            case 'completed':
                const duration = item.endTime && item.startTime ? 
                    ` in ${((item.endTime - item.startTime) / 1000).toFixed(1)}s` : '';
                return `Downloaded${duration}`;
            case 'failed': 
                return `Failed${item.error ? `: ${item.error}` : ''}`;
            case 'skipped': 
                return 'Skipped by user';
            default: 
                return 'Unknown';
        }
    }
    
    cancelAllDownloads() {
        if (!this.isDownloading && this.downloadQueueData.length === 0) {
            this.showToast('No downloads to cancel', 'info');
            return;
        }
        
        // Mark all pending downloads as cancelled
        this.downloadQueueData.forEach(item => {
            if (item.status === 'waiting' || item.status === 'current') {
                item.status = 'cancelled';
                item.endTime = Date.now();
            }
        });
        
        this.isDownloading = false;
        this.hideInstructions();
        this.hideManualControls();
        this.showStartButton();
        
        this.updateUI();
        this.showToast('Downloads cancelled', 'info');
    }
    
    clearCompletedDownloads() {
        this.downloadQueueData = [];
        this.currentDownloadIndex = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.isDownloading = false;
        
        this.hideStartButton();
        this.hideInstructions();
        this.hideManualControls();
        this.updateUI();
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
