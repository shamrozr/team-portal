// assets/js/downloadManager.js - Force download manager for Android

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
    
    // Generate force download URLs - different approach for Android
    getForceDownloadURL(fileId, fileName) {
        if (this.isAndroid) {
            // For Android: Use export URL with additional parameters to force download
            return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&authuser=0&format=original`;
        }
        
        if (this.isIOS) {
            return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
        }
        
        // Desktop
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    
    // Android-specific download methods that force actual download
    getAndroidForceDownloadMethods(fileId, fileName) {
        const encodedFileName = encodeURIComponent(fileName);
        
        return [
            // Method 1: Direct export with Content-Disposition header simulation
            {
                url: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
                method: 'iframe_force'
            },
            
            // Method 2: Use blob approach to force download
            {
                url: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&authuser=0`,
                method: 'blob_download'
            },
            
            // Method 3: Window location with force download headers
            {
                url: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&format=original&disposition=attachment`,
                method: 'window_force'
            }
        ];
    }
    
    setupAdvancedDetection() {
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
                if (timeSinceFocusChange > 1000) {
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
                Check your Downloads folder or notification bar.<br>
                If the file downloaded, click "Next File" to continue.
            `;
        }
        
        const nextButton = document.getElementById('nextFileButton');
        if (nextButton) {
            nextButton.style.animation = 'pulse 2s infinite';
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
                <div class="android-notice" id="androidNotice" style="display: none;">
                    <div class="notice-content">
                        <p id="noticeText">🤖 Android: Force download mode active</p>
                    </div>
                </div>
                <div class="download-instructions" id="downloadInstructions" style="display: none;">
                    <div class="instruction-content">
                        <p id="instructionText">Preparing downloads...</p>
                        <div class="instruction-buttons">
                            <button class="btn btn-primary" id="nextFileButton" style="display: none;">
                                ✅ File Downloaded - Next File
                            </button>
                            <button class="btn btn-warning" id="retryFileButton" style="display: none;">
                                🔄 Try Different Method
                            </button>
                            <button class="btn btn-secondary" id="skipFileButton" style="display: none;">
                                ⏩ Skip This File
                            </button>
                        </div>
                        <div class="download-timer" id="downloadTimer" style="display: none;">
                            <small>Download attempt: <span id="timerDisplay">0s</span> ago</small>
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
            
            .android-notice {
                background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
                border-bottom: 1px solid #0ea5e9;
                padding: 12px 16px;
                text-align: center;
            }
            
            .notice-content {
                color: #0c4a6e;
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
    
    showAndroidNotice() {
        if (this.isAndroid) {
            const noticeElement = document.getElementById('androidNotice');
            if (noticeElement) {
                noticeElement.style.display = 'block';
                
                // Keep notice visible during downloads
                setTimeout(() => {
                    if (!this.isDownloading) {
                        noticeElement.style.display = 'none';
                    }
                }, 5000);
            }
        }
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
        
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleWidget();
        });
        
        close.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideWidget();
        });
        
        cancelAll.addEventListener('click', () => this.cancelAllDownloads());
        startDownloads.addEventListener('click', () => this.startSequentialDownloads());
        pauseDownloads.addEventListener('click', () => this.pauseDownloads());
        resumeDownloads.addEventListener('click', () => this.resumeDownloads());
        
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
    
    async downloadFiles(files) {
        if (!files || files.length === 0) {
            this.showToast('No files to download', 'warning');
            return;
        }
        
        console.log(`Preparing to download ${files.length} files`);
        
        if (files.length === 1) {
            this.downloadSingleFileDirectly(files[0].id, files[0].name);
            return;
        }
        
        this.setupSequentialDownloads(files);
    }
    
    setupSequentialDownloads(files) {
        this.downloadQueueData = [];
        this.currentDownloadIndex = 0;
        this.completedDownloads = 0;
        this.failedDownloads = 0;
        this.isDownloading = false;
        this.waitingForUserConfirmation = false;
        this.manualAdvanceRequired = false;
        
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
            index: index,
            currentMethod: 0 // Track which download method is being used
        }));
        
        this.downloadQueueData = queueItems;
        
        this.showWidget();
        this.showStartButton();
        this.updateUI();
        
        // Show Android notice
        this.showAndroidNotice();
        
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
        
        if (currentItem.status === 'completed' || currentItem.status === 'skipped') {
            console.log(`Skipping already processed file: ${currentItem.name}`);
            this.proceedToNextDownload();
            return;
        }
        
        console.log(`Starting download for: ${currentItem.name} (${this.currentDownloadIndex + 1}/${this.downloadQueueData.length})`);
        
        this.waitingForUserConfirmation = false;
        this.manualAdvanceRequired = false;
        
        currentItem.status = 'current';
        currentItem.startTime = Date.now();
        this.downloadStartTime = Date.now();
        
        this.updateUI();
        this.updateInstructions(currentItem);
        this.startDownloadTimer();
        
        this.triggerFileDownload(currentItem);
        this.waitForUserConfirmation(currentItem);
    }
    
    triggerFileDownload(item) {
        console.log(`Triggering download for: ${item.name} on ${this.isAndroid ? 'Android' : this.isIOS ? 'iOS' : 'Desktop'}`);
        
        if (this.isAndroid) {
            this.triggerAndroidForceDownload(item);
        } else if (this.isIOS) {
            this.triggerIOSDownload(item);
        } else {
            this.triggerDesktopDownload(item);
        }
    }
    
    triggerAndroidForceDownload(item) {
        try {
            console.log(`Android force download for: ${item.name}`);
            
            // Get download method based on current retry
            const methods = this.getAndroidForceDownloadMethods(item.id, item.name);
            const currentMethod = methods[item.currentMethod] || methods[0];
            
            console.log(`Using Android method: ${currentMethod.method}`);
            
            switch (currentMethod.method) {
                case 'iframe_force':
                    this.androidIframeForceDownload(item, currentMethod.url);
                    break;
                    
                case 'blob_download':
                    this.androidBlobDownload(item, currentMethod.url);
                    break;
                    
                case 'window_force':
                    this.androidWindowForceDownload(item, currentMethod.url);
                    break;
                    
                default:
                    this.androidIframeForceDownload(item, currentMethod.url);
            }
            
        } catch (error) {
            console.error(`Android download failed for ${item.name}:`, error);
            this.markDownloadFailed(item, error.message);
        }
        
        setTimeout(() => {
            this.waitingForUserConfirmation = true;
            this.showUserControls();
        }, 2000);
    }
    
    androidIframeForceDownload(item, downloadUrl) {
        console.log(`Android iframe force download: ${downloadUrl}`);
        
        // Create iframe with force download attributes
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'display: none; width: 0; height: 0; border: none;';
        iframe.
