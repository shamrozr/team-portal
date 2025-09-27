// assets/js/downloadManager.js - Android-optimized with direct download URLs

class DownloadManager {
    constructor() {
        this.downloadQueueData = [];
        this.activeDownloads = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.isDownloading = false;
        this.isMobile = this.detectMobile();
        this.isAndroid = this.detectAndroid();
        this.isIOS = this.detectIOS();
        this.currentDownloadIndex = 0;
        this.downloadStartTime = null;
        this.waitingForUserConfirmation = false;
        this.manualAdvanceRequired = false;
        
        this.createDownloadWidget();
        this.createDownloadFrame();
        this.bindEvents();
        this.addFileDownloadButtonStyles();
        this.setupAdvancedDetection();
        
        console.log(`Device detected: Mobile: ${this.isMobile}, Android: ${this.isAndroid}, iOS: ${this.isIOS}`);
    }
    
    detectMobile() {
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMobileScreen = window.innerWidth <= 768;
        const isTouchDevice = 'ontouchstart' in window;
        
        return isMobileUA || (isMobileScreen && isTouchDevice);
    }
    
    detectAndroid() {
        return /Android/i.test(navigator.userAgent);
    }
    
    detectIOS() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
    
    setupAdvancedDetection() {
        // More conservative detection - require explicit user confirmation
        this.setupFocusDetection();
        this.setupVisibilityDetection();
        this.setupNavigationDetection();
    }
    
    setupFocusDetection() {
        let focusChangeCount = 0;
        let lastFocusChange = 0;
        
        window.addEventListener('blur', () => {
            if (this.waitingForUserConfirmation) {
                focusChangeCount++;
                lastFocusChange = Date.now();
                console.log('Window blur detected during download');
            }
        });
        
        window.addEventListener('focus', () => {
            if (this.waitingForUserConfirmation && focusChangeCount > 0) {
                const timeSinceFocusChange = Date.now() - lastFocusChange;
                if (timeSinceFocusChange > 1000) { // At least 1 second gap
                    console.log('Window focus returned after significant delay');
                    this.suggestAdvancement();
                }
            }
        });
    }
    
    setupVisibilityDetection() {
        document.addEventListener('visibilitychange', () => {
            if (this.waitingForUserConfirmation) {
                if (document.hidden) {
                    console.log('Page became hidden - possible download dialog');
                } else {
                    console.log('Page became visible again');
                    setTimeout(() => {
                        this.suggestAdvancement();
                    }, 2000);
                }
            }
        });
    }
    
    setupNavigationDetection() {
        window.addEventListener('beforeunload', () => {
            if (this.waitingForUserConfirmation) {
                console.log('User attempting to navigate away - download likely handled');
            }
        });
    }
    
    suggestAdvancement() {
        if (this.waitingForUserConfirmation && !this.manualAdvanceRequired) {
            this.showAdvancementSuggestion();
        }
    }
    
    showAdvancementSuggestion() {
        const instructionText = document.getElementById('instructionText');
        if (instructionText) {
            instructionText.innerHTML = `
                <strong>📱 File download may be complete!</strong><br>
                If you've saved the file, click "Next File" to continue.<br>
                If not, please save it first, then click "Next File".
            `;
        }
        
        const nextButton = document.getElementById('nextFileButton');
        if (nextButton) {
            nextButton.style.animation = 'pulse 2s infinite';
        }
    }
    
    // Generate optimized download URLs based on device
    getOptimizedDownloadURL(fileId, fileName) {
        // For Android: Use direct download URL that bypasses Google Drive UI
        if (this.isAndroid) {
            // Method 1: Direct export URL with additional parameters
            return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&uuid=${Date.now()}`;
        }
        
        // For iOS: Use standard URL
        if (this.isIOS) {
            return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
        }
        
        // For desktop: Use iframe-friendly URL
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    
    // Alternative URL generation for Android
    getAndroidFallbackURL(fileId) {
        // Alternative direct download URLs for Android
        const alternatives = [
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&authuser=0`,
            `https://drive.google.com/u/0/uc?export=download&id=${fileId}&confirm=t`,
            `https://docs.google.com/uc?export=download&id=${fileId}&confirm=t`,
            `https://drive.google.com/file/d/${fileId}/view?usp=drive_link&download=1`
        ];
        
        return alternatives;
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
                <div class="device-info" id="deviceInfo" style="display: none;">
                    <div class="device-content">
                        <p id="deviceText">Optimizing for your device...</p>
                    </div>
                </div>
                <div class="download-instructions" id="downloadInstructions" style="display: none;">
                    <div class="instruction-content">
                        <p id="instructionText">Preparing downloads...</p>
                        <div class="instruction-buttons">
                            <button class="btn btn-primary" id="nextFileButton" style="display: none;">
                                ✅ File Saved - Next File
                            </button>
                            <button class="btn btn-warning" id="retryFileButton" style="display: none;">
                                🔄 Retry This File
                            </button>
                            <button class="btn btn-secondary" id="skipFileButton" style="display: none;">
                                ⏩ Skip This File
                            </button>
                        </div>
                        <div class="download-timer" id="downloadTimer" style="display: none;">
                            <small>Download started: <span id="timerDisplay">0s</span> ago</small>
                        </div>
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
                        <button class="download-btn pause-btn" id="pauseDownloads" style="display: none;">⏸️ Pause</button>
                        <button class="download-btn resume-btn" id="resumeDownloads" style="display: none;">▶️ Resume</button>
                    </div>
                </div>
            </div>
        `;
        
        this.addStyles();
        document.body.appendChild(widget);
        this.showDeviceInfo();
    }
    
    showDeviceInfo() {
        const deviceInfo = document.getElementById('deviceInfo');
        const deviceText = document.getElementById('deviceText');
        
        if (deviceInfo && deviceText) {
            let deviceMessage = '';
            
            if (this.isAndroid) {
                deviceMessage = '🤖 Android detected - Using direct download links to avoid Google Drive popups';
            } else if (this.isIOS) {
                deviceMessage = '🍎 iOS detected - Using optimized download method';
            } else {
                deviceMessage = '💻 Desktop detected - Using standard download method';
            }
            
            deviceText.textContent = deviceMessage;
            deviceInfo.style.display = 'block';
            
            // Hide after 3 seconds
            setTimeout(() => {
                deviceInfo.style.display = 'none';
            }, 3000);
        }
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
                width: 380px;
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
            
            .device-info {
                background: linear-gradient(135deg, #dbeafe, #bfdbfe);
                border-bottom: 1px solid #3b82f6;
                padding: 12px 16px;
                text-align: center;
            }
            
            .device-content {
                color: #1e40af;
                font-size: 12px;
                font-weight: 500;
            }
            
            .download-instructions {
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                border-bottom: 2px solid #f59e0b;
                padding: 16px;
                text-align: center;
            }
            
            .instruction-content {
                color: #92400e;
                font-size: 13px;
                line-height: 1.5;
            }
            
            .instruction-content p {
                margin: 0 0 12px 0;
                font-weight: 500;
            }
            
            .instruction-buttons {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin: 12px 0;
            }
            
            .download-timer {
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid rgba(146, 64, 14, 0.2);
            }
            
            .download-timer small {
                color: #78350f;
                font-size: 11px;
            }
            
            .download-list {
                max-height: 280px;
                overflow-y: auto;
                padding: 8px;
            }
            
            .download-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 6px;
                transition: all 0.2s;
                font-size: 13px;
                border: 2px solid transparent;
                position: relative;
            }
            
            .download-item:hover {
                background: #f8fafc;
            }
            
            .download-item.current {
                background: rgba(59, 130, 246, 0.1);
                border-color: #3b82f6;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
                animation: currentPulse 2s infinite;
            }
            
            .download-item.waiting {
                background: rgba(156, 163, 175, 0.1);
                border-color: #9ca3af;
            }
            
            .download-item.completed {
                background: rgba(34, 197, 94, 0.1);
                border-color: #22c55e;
            }
            
            .download-item.failed {
                background: rgba(239, 68, 68, 0.1);
                border-color: #ef4444;
            }
            
            .download-item.skipped {
                background: rgba(251, 191, 36, 0.1);
                border-color: #fbbf24;
                opacity: 0.7;
            }
            
            @keyframes currentPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }
            }
            
            .download-status-icon {
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.8);
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
                margin-bottom: 4px;
            }
            
            .download-details {
                font-size: 11px;
                color: #6b7280;
                display: flex;
                justify-content: space-between;
                align-items: center;
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
            
            .download-btn, .btn {
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            
            .cancel-btn {
                background: #f3f4f6;
                color: #374151;
            }
            
            .cancel-btn:hover {
                background: #e5e7eb;
            }
            
            .start-btn, .resume-btn {
                background: #059669;
                color: white;
            }
            
            .start-btn:hover, .resume-btn:hover {
                background: #047857;
            }
            
            .pause-btn {
                background: #d97706;
                color: white;
            }
            
            .pause-btn:hover {
                background: #b45309;
            }
            
            .btn-primary {
                background: #3b82f6;
                color: white;
            }
            
            .btn-primary:hover {
                background: #2563eb;
                transform: translateY(-1px);
            }
            
            .btn-secondary {
                background: #6b7280;
                color: white;
            }
            
            .btn-secondary:hover {
                background: #4b5563;
            }
            
            .btn-warning {
                background: #f59e0b;
                color: white;
            }
            
            .btn-warning:hover {
                background: #d97706;
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
                
                .download-btn, .btn {
                    width: 100%;
                    margin: 2px 0;
                }
                
                .instruction-buttons {
                    flex-direction: column;
                }
                
                .instruction-buttons .btn {
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
        const toggle = document.getElementById('downloadToggle');
        const close = document.getElementById('downloadClose');
        const cancelAll = document.getElementById('cancelAll');
        const startDownloads = document.getElementById('startDownloads');
        const pauseDownloads = document.getElementById('pauseDownloads');
        const resumeDownloads = document.getElementById('resumeDownloads');
        const nextFileButton = document.getElementById('nextFileButton');
        const retryFileButton = document.getElementById('retryFileButton');
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
        
        // Control buttons
        cancelAll.addEventListener('click', () => this.cancelAllDownloads());
        startDownloads.addEventListener('click', () => this.startSequentialDownloads());
        pauseDownloads.addEventListener('click', () => this.pauseDownloads());
        resumeDownloads.addEventListener('click', () => this.resumeDownloads());
        
        // File control buttons
        nextFileButton.addEventListener('click', () => this.proceedToNextDownload());
        retryFileButton.addEventListener('click', () => this.retryCurrentDownload());
        skipFileButton.addEventListener('click', () => this.skipCurrentDownload());
    }
    
    createDownloadFrame() {
        if (!this.downloadFrame) {
            this.downloadFrame = document.createElement('iframe');
            this.downloadFrame.id = 'downloadFrame';
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
        // Reset state completely
        this.downloadQueueData = [];
        this.currentDownloadIndex = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.isDownloading = false;
        this.waitingForUserConfirmation = false;
        this.manualAdvanceRequired = false;
        
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
        
        this.showToast(`${files.length} files added to download queue. Click "Start Downloads" to begin.`, 'info');
    }
    
    startSequentialDownloads() {
        if (this.downloadQueueData.length === 0) {
            this.showToast('No files in download queue', 'warning');
            return;
        }
        
        this.isDownloading = true;
        this.currentDownloadIndex = 0;
        this.hideStartButton();
        this.showPauseButton();
        this.showInstructions();
        
        console.log('Starting sequential downloads...');
        
        // Start with the first file
        this.downloadCurrentFile();
    }
    
    downloadCurrentFile() {
        if (this.currentDownloadIndex >= this.downloadQueueData.length) {
            this.onAllDownloadsComplete();
            return;
        }
        
        const currentItem = this.downloadQueueData[this.currentDownloadIndex];
        if (!currentItem) {
            console.warn('No current item found, advancing...');
            this.proceedToNextDownload();
            return;
        }
        
        // Skip already processed files
        if (currentItem.status === 'completed' || currentItem.status === 'skipped') {
            console.log(`Skipping already processed file: ${currentItem.name}`);
            this.proceedToNextDownload();
            return;
        }
        
        console.log(`Starting download for: ${currentItem.name} (${this.currentDownloadIndex + 1}/${this.downloadQueueData.length})`);
        
        // Reset states
        this.waitingForUserConfirmation = false;
        this.manualAdvanceRequired = false;
        
        // Mark as current and start download
        currentItem.status = 'current';
        currentItem.startTime = Date.now();
        this.downloadStartTime = Date.now();
        
        this.updateUI();
        this.updateInstructions(currentItem);
        this.startDownloadTimer();
        
        // Trigger download
        this.triggerFileDownload(currentItem);
        
        // Start waiting for user confirmation
        this.waitForUserConfirmation(currentItem);
    }
    
    triggerFileDownload(item) {
        console.log(`Triggering download for: ${item.name} on ${this.isAndroid ? 'Android' : this.isIOS ? 'iOS' : 'Desktop'}`);
        
        if (this.isAndroid) {
            this.triggerAndroidDownload(item);
        } else if (this.isIOS) {
            this.triggerIOSDownload(item);
        } else {
            this.triggerDesktopDownload(item);
        }
    }
    
    triggerAndroidDownload(item) {
        try {
            // Use direct download URL for Android to avoid Google Drive popup
            const downloadUrl = this.getOptimizedDownloadURL(item.id, item.name);
            
            console.log(`Android download URL: ${downloadUrl}`);
            
            // Method 1: Direct link click (stays in same tab)
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = item.name;
            link.target = '_self'; // Force same tab
            link.style.display = 'none';
            
            // Add additional attributes to prevent new tab opening
            link.setAttribute('rel', 'noopener noreferrer');
            
            document.body.appendChild(link);
            
            // Force click event in same context
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            
            console.log(`Android download triggered for: ${item.name}`);
            
            // If method 1 fails, try fallback URLs
            setTimeout(() => {
                if (this.waitingForUserConfirmation && item.status === 'current') {
                    this.tryAndroidFallback(item);
                }
            }, 5000);
            
        } catch (error) {
            console.error(`Android download failed for ${item.name}:`, error);
            this.markDownloadFailed(item, error.message);
        }
        
        // Set waiting state
        setTimeout(() => {
            this.waitingForUserConfirmation = true;
            this.showUserControls();
        }, 2000);
    }
    
    tryAndroidFallback(item) {
        console.log(`Trying Android fallback for: ${item.name}`);
        
        const fallbackURLs = this.getAndroidFallbackURL(item.id);
        
        // Try first fallback URL
        try {
            const fallbackUrl = fallbackURLs[0];
            console.log(`Trying fallback URL: ${fallbackUrl}`);
            
            // Use window.location.href for more direct approach
            const tempIframe = document.createElement('iframe');
            tempIframe.style.cssText = 'display: none; width: 0; height: 0;';
            tempIframe.src = fallbackUrl;
            document.body.appendChild(tempIframe);
            
            // Remove iframe after 3 seconds
            setTimeout(() => {
                if (tempIframe.parentNode) {
                    document.body.removeChild(tempIframe);
                }
            }, 3000);
            
        } catch (error) {
            console.error(`Android fallback failed for ${item.name}:`, error);
        }
    }
    
    triggerIOSDownload(item) {
        try {
            const downloadUrl = this.getOptimizedDownloadURL(item.id, item.name);
            
            console.log(`iOS download URL: ${downloadUrl}`);
            
            // For iOS, use the standard approach
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = item.name;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`iOS download triggered for: ${item.name}`);
            
        } catch (error) {
            console.error(`iOS download failed for ${item.name}:`, error);
            this.markDownloadFailed(item, error.message);
        }
        
        setTimeout(() => {
            this.waitingForUserConfirmation = true;
            this.showUserControls();
        }, 2000);
    }
    
    triggerDesktopDownload(item) {
        try {
            const downloadUrl = this.getOptimizedDownloadURL(item.id, item.name);
            
            console.log(`Desktop download URL: ${downloadUrl}`);
            
            // For desktop, use iframe method
            this.downloadFrame.src = downloadUrl;
            
            console.log(`Desktop download triggered for: ${item.name}`);
            
        } catch (error) {
            console.error(`Desktop download failed for ${item.name}:`, error);
            this.markDownloadFailed(item, error.message);
        }
        
        setTimeout(() => {
            this.waitingForUserConfirmation = true;
            this.showUserControls();
        }, 2000);
    }
    
    waitForUserConfirmation(item) {
        // Show instructions after a delay
        setTimeout(() => {
            if (item.status === 'current' && this.waitingForUserConfirmation) {
                this.updateInstructions(item, 'waiting');
            }
        }, 3000);
        
        // Show suggestion to advance after longer delay
        setTimeout(() => {
            if (item.status === 'current' && this.waitingForUserConfirmation) {
                this.showAdvancementSuggestion();
            }
        }, 8000);
        
        // Require manual advancement after timeout
        setTimeout(() => {
            if (item.status === 'current' && this.waitingForUserConfirmation) {
                this.manualAdvanceRequired = true;
                this.updateInstructions(item, 'manual');
            }
        }, 15000);
    }
    
    updateInstructions(currentItem, phase = 'downloading') {
        const instructionText = document.getElementById('instructionText');
        if (!instructionText || !currentItem) return;
        
        const fileNumber = this.currentDownloadIndex + 1;
        const totalFiles = this.downloadQueueData.length;
        
        switch (phase) {
            case 'downloading':
                let downloadingMessage = `
                    <strong>📥 Downloading File ${fileNumber} of ${totalFiles}</strong><br>
                    <em>${currentItem.name}</em><br><br>
                `;
                
                if (this.isAndroid) {
                    downloadingMessage += `🤖 Android: Direct download started - no Google Drive popup!<br>`;
                } else if (this.isIOS) {
                    downloadingMessage += `🍎 iOS: Optimized download started.<br>`;
                } else {
                    downloadingMessage += `💻 Desktop: Download started.<br>`;
                }
                
                downloadingMessage += `<small>Please wait for the download to start...</small>`;
                instructionText.innerHTML = downloadingMessage;
                break;
                
            case 'waiting':
                instructionText.innerHTML = `
                    <strong>💾 Please Save the File</strong><br>
                    <em>${currentItem.name}</em><br><br>
                    ${this.isAndroid ? 
                        '🤖 Check your Downloads folder or notification bar.<br>' :
                        'If your browser showed a download dialog, please save the file.<br>'
                    }
                    Once saved, click "File Saved - Next File" below.
                `;
                break;
                
            case 'manual':
                instructionText.innerHTML = `
                    <strong>⏳ Waiting for Your Confirmation</strong><br>
                    <em>${currentItem.name}</em><br><br>
                    <span style="color: #dc2626;">Please confirm if you saved the file:</span><br>
                    • If saved ✅ → Click "File Saved - Next File"<br>
                    • If failed ❌ → Click "Retry This File"<br>
                    • To skip → Click "Skip This File"
                `;
                break;
        }
    }
    
    startDownloadTimer() {
        const timerDisplay = document.getElementById('timerDisplay');
        const timerContainer = document.getElementById('downloadTimer');
        
        if (!timerDisplay || !timerContainer) return;
        
        timerContainer.style.display = 'block';
        
        const updateTimer = () => {
            if (this.downloadStartTime && this.waitingForUserConfirmation) {
                const elapsed = Math.floor((Date.now() - this.downloadStartTime) / 1000);
                timerDisplay.textContent = `${elapsed}s`;
                setTimeout(updateTimer, 1000);
            } else {
                timerContainer.style.display = 'none';
            }
        };
        
        updateTimer();
    }
    
    showUserControls() {
        const nextButton = document.getElementById('nextFileButton');
        const retryButton = document.getElementById('retryFileButton');
        const skipButton = document.getElementById('skipFileButton');
        
        if (nextButton) {
            nextButton.style.display = 'block';
            nextButton.style.animation = '';
        }
        if (retryButton) retryButton.style.display = 'block';
        if (skipButton) skipButton.style.display = 'block';
    }
    
    hideUserControls() {
        const nextButton = document.getElementById('nextFileButton');
        const retryButton = document.getElementById('retryFileButton');
        const skipButton = document.getElementById('skipFileButton');
        
        if (nextButton) nextButton.style.display = 'none';
        if (retryButton) retryButton.style.display = 'none';
        if (skipButton) skipButton.style.display = 'none';
        
        const timerContainer = document.getElementById('downloadTimer');
        if (timerContainer) timerContainer.style.display = 'none';
    }
    
    proceedToNextDownload() {
        console.log('User confirmed file saved, proceeding to next download');
        
        const currentItem = this.downloadQueueData[this.currentDownloadIndex];
        if (currentItem && currentItem.status === 'current') {
            this.markDownloadCompleted(currentItem);
        }
        
        this.hideUserControls();
        this.waitingForUserConfirmation = false;
        this.manualAdvanceRequired = false;
        this.currentDownloadIndex++;
        
        if (this.currentDownloadIndex < this.downloadQueueData.length) {
            setTimeout(() => {
                this.downloadCurrentFile();
            }, 1000);
        } else {
            this.onAllDownloadsComplete();
        }
    }
    
    retryCurrentDownload() {
        console.log('User requested retry for current download');
        
        const currentItem = this.downloadQueueData[this.currentDownloadIndex];
        if (currentItem) {
            currentItem.retries = (currentItem.retries || 0) + 1;
            currentItem.status = 'waiting';
            
            this.hideUserControls();
            this.waitingForUserConfirmation = false;
            this.manualAdvanceRequired = false;
            
            setTimeout(() => {
                this.downloadCurrentFile();
            }, 1000);
        }
    }
    
    skipCurrentDownload() {
        console.log('User requested to skip current download');
        
        const currentItem = this.downloadQueueData[this.currentDownloadIndex];
        if (currentItem) {
            currentItem.status = 'skipped';
            currentItem.endTime = Date.now();
        }
        
        this.hideUserControls();
        this.waitingForUserConfirmation = false;
        this.manualAdvanceRequired = false;
        this.currentDownloadIndex++;
        
        if (this.currentDownloadIndex < this.downloadQueueData.length) {
            setTimeout(() => {
                this.downloadCurrentFile();
            }, 1000);
        } else {
            this.onAllDownloadsComplete();
        }
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
        
        setTimeout(() => {
            if (item.status === 'failed') {
                this.showUserControls();
                this.updateInstructions(item, 'manual');
            }
        }, 1000);
    }
    
    pauseDownloads() {
        console.log('Downloads paused by user');
        this.isDownloading = false;
        this.showResumeButton();
        this.hidePauseButton();
        
        const instructionText = document.getElementById('instructionText');
        if (instructionText) {
            instructionText.innerHTML = `
                <strong>⏸️ Downloads Paused</strong><br>
                Click "Resume" to continue downloading files.
            `;
        }
        
        this.showToast('Downloads paused', 'info');
    }
    
    resumeDownloads() {
        console.log('Downloads resumed by user');
        this.isDownloading = true;
        this.showPauseButton();
        this.hideResumeButton();
        
        const currentItem = this.downloadQueueData[this.currentDownloadIndex];
        if (currentItem && currentItem.status !== 'completed' && currentItem.status !== 'skipped') {
            this.downloadCurrentFile();
        } else {
            this.proceedToNextDownload();
        }
        
        this.showToast('Downloads resumed', 'info');
    }
    
    onAllDownloadsComplete() {
        console.log('All downloads completed');
        
        this.isDownloading = false;
        this.waitingForUserConfirmation = false;
        this.hideInstructions();
        this.hideUserControls();
        this.hidePauseButton();
        this.hideResumeButton();
        
        const completed = this.downloadQueueData.filter(item => item.status === 'completed').length;
        const failed = this.downloadQueueData.filter(item => item.status === 'failed').length;
        const skipped = this.downloadQueueData.filter(item => item.status === 'skipped').length;
        const total = this.downloadQueueData.length;
        
        console.log('Download summary:', { total, completed, failed, skipped });
        
        let message = `Downloads finished! ${completed} completed`;
        if (failed > 0) message += `, ${failed} failed`;
        if (skipped > 0) message += `, ${skipped} skipped`;
        message += ` out of ${total} total files.`;
        
        this.showToast(message, failed === 0 ? 'success' : 'warning');
        
        if (window.App?.fileManager) {
            window.App.fileManager.clearSelection();
        }
        
        const instructionText = document.getElementById('instructionText');
        if (instructionText) {
            instructionText.innerHTML = `
                <strong>🎉 All Downloads Complete!</strong><br>
                ✅ ${completed} files downloaded successfully<br>
                ${failed > 0 ? `❌ ${failed} files failed<br>` : ''}
                ${skipped > 0 ? `⏩ ${skipped} files skipped<br>` : ''}
                <br><small>You can close this widget or start new downloads.</small>
            `;
        }
    }
    
    // Direct download for individual files
    downloadSingleFileDirectly(fileId, fileName) {
        console.log(`Direct download for: ${fileName}`);
        
        const downloadUrl = this.getOptimizedDownloadURL(fileId, fileName);
        
        try {
            if (this.isAndroid) {
                // Android: Use direct link to avoid popups
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                link.target = '_self';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showToast(`🤖 Android: Direct download started for ${fileName}`, 'success');
            } else if (this.isIOS) {
                // iOS: Standard approach
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showToast(`🍎 iOS: Download started for ${fileName}`, 'success');
            } else {
                // Desktop: Use iframe
                this.downloadFrame.src = downloadUrl;
                this.showToast(`💻 Desktop: Download started for ${fileName}`, 'success');
            }
            
        } catch (error) {
            console.error(`Download failed for ${fileName}:`, error);
            this.showToast(`Download failed: ${fileName}`, 'error');
        }
    }
    
    showStartButton() {
        const startButton = document.getElementById('startDownloads');
        if (startButton) startButton.style.display = 'inline-block';
    }
    
    hideStartButton() {
        const startButton = document.getElementById('startDownloads');
        if (startButton) startButton.style.display = 'none';
    }
    
    showPauseButton() {
        const pauseButton = document.getElementById('pauseDownloads');
        if (pauseButton) pauseButton.style.display = 'inline-block';
    }
    
    hidePauseButton() {
        const pauseButton = document.getElementById('pauseDownloads');
        if (pauseButton) pauseButton.style.display = 'none';
    }
    
    showResumeButton() {
        const resumeButton = document.getElementById('resumeDownloads');
        if (resumeButton) resumeButton.style.display = 'inline-block';
    }
    
    hideResumeButton() {
        const resumeButton = document.getElementById('resumeDownloads');
        if (resumeButton) resumeButton.style.display = 'none';
    }
    
    showInstructions() {
        const instructions = document.getElementById('downloadInstructions');
        if (instructions) instructions.style.display = 'block';
    }
    
    hideInstructions() {
        const instructions = document.getElementById('downloadInstructions');
        if (instructions) instructions.style.display = 'none';
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
            this.clearDownloadData();
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
        
        const headerText = document.getElementById('downloadHeaderText');
        if (headerText) {
            if (this.isDownloading) {
                const current = this.currentDownloadIndex + 1;
                headerText.textContent = `Downloading ${current}/${totalFiles}`;
            } else if (totalFiles > 0) {
                headerText.textContent = `Downloads (${completed}/${totalFiles})`;
            } else {
                headerText.textContent = 'Downloads';
            }
        }
        
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
                <div class="download-details">
                    <span>${statusText}</span>
                    ${item.size ? `<span>${this.formatFileSize(item.size)}</span>` : ''}
                </div>
            </div>
        `;
        
        return element;
    }
    
    getStatusIcon(status, index) {
        switch (status) {
            case 'waiting': 
                return index === 0 ? '🎯' : `<span style="font-size: 12px; font-weight: bold;">${index + 1}</span>`;
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
                const retryText = item.retries > 0 ? ` (retry ${item.retries})` : '';
                return `Failed${retryText}`;
            case 'skipped': 
                return 'Skipped by user';
            default: 
                return 'Unknown';
        }
    }
    
    cancelAllDownloads() {
        console.log('User cancelled all downloads');
        
        this.downloadQueueData.forEach(item => {
            if (item.status === 'waiting' || item.status === 'current') {
                item.status = 'cancelled';
                item.endTime = Date.now();
            }
        });
        
        this.isDownloading = false;
        this.waitingForUserConfirmation = false;
        this.hideInstructions();
        this.hideUserControls();
        this.hidePauseButton();
        this.hideResumeButton();
        this.showStartButton();
        
        this.updateUI();
        this.showToast('All downloads cancelled', 'info');
    }
    
    clearDownloadData() {
        console.log('Clearing download data');
        
        this.downloadQueueData = [];
        this.currentDownloadIndex = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.isDownloading = false;
        this.waitingForUserConfirmation = false;
        
        this.hideStartButton();
        this.hidePauseButton();
        this.hideResumeButton();
        this.hideInstructions();
        this.hideUserControls();
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
