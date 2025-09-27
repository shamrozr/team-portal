// assets/js/downloadManager.js - Method 1: Direct Download URLs with JSZip Client-Side

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
        
        // JSZip instance for bulk downloads
        this.zip = null;
        this.zipProgress = { downloaded: 0, total: 0 };
        
        this.createDownloadWidget();
        this.bindEvents();
        this.addFileDownloadButtonStyles();
        
        console.log(`🚀 DownloadManager initialized - Method 1: Direct Download with JSZip`);
        console.log(`Device: Mobile: ${this.isMobile}, Android: ${this.isAndroid}, iOS: ${this.isIOS}`);
        console.log(`JSZip available: ${typeof JSZip !== 'undefined'}`);
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
    
    // Get multiple direct download URL formats for better video compatibility
    getDirectDownloadURL(fileId) {
        // Multiple URL formats to try for better compatibility, especially for videos
        return [
            `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&authuser=0`,
            `https://drive.google.com/file/d/${fileId}/view?usp=drive_link`,
            `https://drive.google.com/uc?export=download&id=${fileId}`,
            `https://lh3.googleusercontent.com/d/${fileId}`,
            `https://drive.google.com/uc?id=${fileId}&export=download`
        ];
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
                <div class="method-indicator">
                    <div class="method-badge">
                        🎯 Method 1: Direct Download + JSZip
                    </div>
                </div>
                <div class="download-progress-section" id="downloadProgressSection" style="display: none;">
                    <div class="overall-progress">
                        <div class="progress-label">
                            <span id="progressLabel">Preparing...</span>
                            <span id="progressStats">0/0</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="overallProgressFill"></div>
                        </div>
                        <div class="progress-details">
                            <small id="progressDetails">Getting ready to download files...</small>
                        </div>
                    </div>
                </div>
                <div class="download-list" id="downloadList">
                    <!-- Download items will be added here -->
                </div>
                <div class="download-summary" id="downloadSummary">
                    <div class="download-controls">
                        <button class="download-btn cancel-btn" id="cancelAll">Cancel All</button>
                        <button class="download-btn start-btn" id="startDownloads" style="display: none;">🚀 Start Downloads</button>
                        <button class="download-btn test-btn" id="testMethod">🧪 Test Method</button>
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
                position: fixed; bottom: 20px; right: 20px; width: 400px;
                max-width: calc(100vw - 40px); background: white; border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.15); z-index: 9999;
                border: 1px solid #e2e8f0; overflow: hidden; transition: all 0.3s ease;
            }
            .download-widget.hidden { display: none; }
            .download-widget.minimized .download-body { display: none; }
            .download-widget.minimized { width: 250px; }
            
            .download-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; cursor: pointer;
            }
            .download-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; }
            .download-icon { font-size: 16px; }
            .download-actions { display: flex; gap: 4px; }
            .download-toggle, .download-close {
                background: rgba(255,255,255,0.2); border: none; color: white;
                width: 24px; height: 24px; border-radius: 4px; cursor: pointer;
                display: flex; align-items: center; justify-content: center;
                font-size: 12px; transition: background 0.2s;
            }
            .download-toggle:hover, .download-close:hover { background: rgba(255,255,255,0.3); }
            
            .download-body { max-height: 600px; overflow-y: auto; display: flex; flex-direction: column; }
            
            .method-indicator {
                background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
                border-bottom: 1px solid #0ea5e9; padding: 12px 16px; text-align: center;
            }
            .method-badge {
                color: #0c4a6e; font-size: 12px; font-weight: 600;
                background: rgba(14, 165, 233, 0.1); padding: 4px 8px;
                border-radius: 12px; display: inline-block;
            }
            
            .download-progress-section {
                padding: 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
            }
            .overall-progress { display: flex; flex-direction: column; gap: 8px; }
            .progress-label {
                display: flex; justify-content: space-between; align-items: center;
                font-size: 14px; font-weight: 500; color: #374151;
            }
            .progress-bar {
                width: 100%; height: 8px; background: #e2e8f0;
                border-radius: 4px; overflow: hidden;
            }
            .progress-fill {
                height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                border-radius: 4px; transition: width 0.3s ease; width: 0%;
            }
            .progress-details {
                font-size: 11px; color: #6b7280; text-align: center;
            }
            
            .download-list { max-height: 300px; overflow-y: auto; padding: 8px; }
            .download-item {
                display: flex; align-items: center; gap: 12px; padding: 12px;
                border-radius: 8px; margin-bottom: 6px; transition: all 0.2s;
                font-size: 13px; border: 2px solid transparent;
            }
            .download-item:hover { background: #f8fafc; }
            .download-item.current {
                background: rgba(59, 130, 246, 0.1); border-color: #3b82f6;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
            }
            .download-item.completed {
                background: rgba(34, 197, 94, 0.1); border-color: #22c55e;
            }
            .download-item.failed {
                background: rgba(239, 68, 68, 0.1); border-color: #ef4444;
            }
            .download-item.waiting {
                background: rgba(156, 163, 175, 0.1); border-color: #9ca3af;
            }
            
            .download-status-icon {
                width: 28px; height: 28px; display: flex; align-items: center;
                justify-content: center; font-size: 16px; flex-shrink: 0;
                border-radius: 50%; background: rgba(255, 255, 255, 0.8);
            }
            .download-info { flex: 1; min-width: 0; }
            .download-name {
                font-weight: 500; color: #1f2937; white-space: nowrap;
                overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;
            }
            .download-details {
                font-size: 11px; color: #6b7280;
                display: flex; justify-content: space-between; align-items: center;
            }
            
            .download-summary {
                padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0;
            }
            .download-controls {
                display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;
            }
            .download-btn {
                padding: 8px 12px; border: none; border-radius: 6px;
                font-size: 12px; font-weight: 500; cursor: pointer;
                transition: all 0.2s; white-space: nowrap;
            }
            .cancel-btn { background: #f3f4f6; color: #374151; }
            .cancel-btn:hover { background: #e5e7eb; }
            .start-btn { background: #059669; color: white; }
            .start-btn:hover { background: #047857; }
            .test-btn { background: #3b82f6; color: white; }
            .test-btn:hover { background: #2563eb; }
            
            .download-spinner {
                width: 18px; height: 18px; border: 2px solid #e5e7eb;
                border-top: 2px solid #3b82f6; border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            
            /* Mobile optimizations */
            @media (max-width: 768px) {
                .download-widget { bottom: 10px; right: 10px; left: 10px; width: auto; max-width: none; }
                .download-controls { flex-direction: column; align-items: stretch; }
                .download-btn { width: 100%; margin: 2px 0; }
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
                position: absolute; top: 8px; right: 8px; width: 32px; height: 32px;
                background: rgba(59, 130, 246, 0.9); color: white; border: none;
                border-radius: 50%; cursor: pointer; display: flex; align-items: center;
                justify-content: center; font-size: 14px; transition: all 0.2s ease;
                opacity: 0; transform: scale(0.8); z-index: 10;
            }
            .file-item:hover .file-download-btn { opacity: 1; transform: scale(1); }
            .file-download-btn:hover { background: rgba(29, 78, 216, 0.9); transform: scale(1.1); }
            
            @media (max-width: 768px) {
                .file-download-btn {
                    opacity: 1; transform: scale(1); top: 6px; right: 6px;
                    width: 28px; height: 28px; font-size: 12px;
                }
            }
            .file-item { position: relative; }
        `;
        document.head.appendChild(style);
    }
    
    bindEvents() {
        const toggle = document.getElementById('downloadToggle');
        const close = document.getElementById('downloadClose');
        const cancelAll = document.getElementById('cancelAll');
        const startDownloads = document.getElementById('startDownloads');
        const testMethod = document.getElementById('testMethod');
        
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
        startDownloads.addEventListener('click', () => this.startMethod1Downloads());
        testMethod.addEventListener('click', () => this.testMethod1());
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
            this.downloadSingleFile(file);
        };
        
        const fileContent = fileElement.querySelector('.file-content');
        if (fileContent) {
            fileContent.appendChild(downloadBtn);
        }
    }
    
    // Method 1: Single file download using direct URL in same window (like before)
    downloadSingleFile(file) {
        console.log(`🎯 Method 1: Direct download for single file: ${file.name}`);
        
        // Use the standard direct download URL for ALL files (including videos)
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
        
        try {
            // Direct download in same window (like the original behavior)
            window.location.href = downloadUrl;
            
            // Show success message
            Utils.showSuccess(`Starting download: ${file.name}`);
            
            console.log(`Single file download initiated: ${downloadUrl}`);
            
        } catch (error) {
            console.error('Single file download failed:', error);
            Utils.showError(`Failed to start download: ${file.name}`);
        }
    }
    
    // Special method ONLY for video files to bypass Google Drive restrictions
    downloadVideoFile(file) {
        console.log(`🎥 Special video download for: ${file.name}`);
        
        // Your Google Apps Script proxy URL for video downloads
        const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbxtL7OLjxf_wprAfMczlxXA72lOVl2ajTdgHA6whd9lgP01nH1sdFDatKno83wThGW3/exec';
        
        try {
            // Use Google Apps Script proxy for video downloads
            const videoDownloadUrl = `${appsScriptUrl}?fileId=${file.id}&fileName=${encodeURIComponent(file.name)}`;
            
            console.log(`Attempting video download via Apps Script: ${videoDownloadUrl}`);
            
            // Use window.location for videos with Apps Script proxy
            window.location.href = videoDownloadUrl;
            
            // Show success message
            Utils.showSuccess(`Starting video download via proxy: ${file.name}`);
            
        } catch (error) {
            console.error('Video download via Apps Script failed:', error);
            
            // Fallback: try opening Google Drive's share page
            try {
                const fallbackUrl = `https://drive.google.com/file/d/${file.id}/view?usp=sharing`;
                window.open(fallbackUrl, '_blank');
                Utils.showInfo(`Apps Script failed. Opening ${file.name} in Google Drive - click download button there`);
            } catch (fallbackError) {
                Utils.showError(`Failed to download video: ${file.name}`);
            }
        }
    }
    
    // Helper method to detect video files
    isVideoFile(file) {
        if (!file) return false;
        
        // Check by MIME type first
        if (file.mimeType && file.mimeType.startsWith('video/')) {
            return true;
        }
        
        // Check by file extension as fallback
        const extension = file.name.split('.').pop()?.toLowerCase();
        const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp', 'ogv'];
        
        return videoExtensions.includes(extension);
    }
    
    // Method 1: Multiple files download using JSZip (Hybrid Approach)
    async downloadFiles(files) {
        if (!files || files.length === 0) {
            Utils.showWarning('No files to download');
            return;
        }
        
        console.log(`🎯 Method 1: Preparing to download ${files.length} files`);
        
        if (files.length === 1) {
            this.downloadSingleFile(files[0]);
            return;
        }
        
        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            Utils.showError('JSZip library not loaded. Cannot create ZIP files.');
            return;
        }
        
        // Separate videos from other files
        const videos = files.filter(file => this.isVideoFile(file));
        const nonVideos = files.filter(file => !this.isVideoFile(file));
        
        console.log(`Found ${videos.length} videos and ${nonVideos.length} other files`);
        
        // Handle based on file composition
        if (videos.length === 0) {
            // Only non-videos: create ZIP normally
            this.setupBulkDownload(nonVideos);
        } else if (nonVideos.length === 0) {
            // Only videos: show video download page
            this.showVideoDownloadPage(videos);
        } else {
            // Mixed files: hybrid approach
            this.setupHybridDownload(nonVideos, videos);
        }
    }
    
    setupHybridDownload(nonVideos, videos) {
        Utils.showInfo(`📦 Creating ZIP with ${nonVideos.length} files. ${videos.length} videos will open separately.`);
        
        // Start ZIP download for non-videos
        this.setupBulkDownload(nonVideos);
        
        // Show video download page after a short delay
        setTimeout(() => {
            this.showVideoDownloadPage(videos);
        }, 2000);
    }
    
    showVideoDownloadPage(videos) {
        console.log(`🎥 Opening video download page for ${videos.length} videos`);
        
        // Create HTML content for video downloads
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Video Downloads - ${videos.length} files</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        max-width: 800px; margin: 0 auto; padding: 20px;
                        background: #f8fafc; color: #334155;
                    }
                    .header {
                        text-align: center; margin-bottom: 30px;
                        padding: 20px; background: white; border-radius: 12px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    .video-list {
                        display: grid; gap: 12px;
                    }
                    .video-item {
                        display: flex; align-items: center; gap: 15px;
                        padding: 15px; background: white; border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        transition: all 0.2s ease;
                    }
                    .video-item:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                    }
                    .video-icon {
                        font-size: 24px; flex-shrink: 0;
                    }
                    .video-info {
                        flex: 1; min-width: 0;
                    }
                    .video-name {
                        font-weight: 500; color: #1e293b;
                        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    }
                    .video-size {
                        font-size: 12px; color: #64748b; margin-top: 4px;
                    }
                    .download-btn {
                        padding: 8px 16px; background: #3b82f6; color: white;
                        text-decoration: none; border-radius: 6px;
                        font-size: 14px; font-weight: 500;
                        transition: background 0.2s;
                    }
                    .download-btn:hover {
                        background: #2563eb;
                    }
                    .bulk-actions {
                        margin: 20px 0; text-align: center;
                        padding: 20px; background: white; border-radius: 8px;
                    }
                    .bulk-btn {
                        margin: 0 10px; padding: 10px 20px;
                        background: #059669; color: white; border: none;
                        border-radius: 6px; cursor: pointer; font-weight: 500;
                    }
                    .instructions {
                        background: #e0f2fe; border: 1px solid #0ea5e9;
                        padding: 15px; border-radius: 8px; margin-bottom: 20px;
                        font-size: 14px; line-height: 1.5;
                    }
                    @media (max-width: 768px) {
                        body { padding: 10px; }
                        .video-item { flex-direction: column; text-align: center; }
                        .video-info { text-align: center; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎥 Video Downloads</h1>
                    <p>${videos.length} video file${videos.length > 1 ? 's' : ''} ready for download</p>
                </div>
                
                <div class="instructions">
                    <strong>📱 Mobile Users:</strong> Tap "Download" for each video. They'll open in Google Drive where you can download the full files.
                    <br><strong>💻 Desktop Users:</strong> Right-click "Download" → "Save link as" for faster downloads.
                </div>
                
                <div class="bulk-actions">
                    <button class="bulk-btn" onclick="downloadAll()">📥 Open All Downloads</button>
                    <button class="bulk-btn" onclick="copyAllLinks()">📋 Copy All Links</button>
                </div>
                
                <div class="video-list">
                    ${videos.map((video, index) => `
                        <div class="video-item">
                            <div class="video-icon">🎬</div>
                            <div class="video-info">
                                <div class="video-name" title="${this.escapeHtml(video.name)}">${this.escapeHtml(video.name)}</div>
                                <div class="video-size">${video.size ? this.formatFileSize(video.size) : 'Size unknown'}</div>
                            </div>
                            <a href="https://drive.google.com/uc?export=download&id=${video.id}" 
                               class="download-btn" 
                               target="_blank"
                               data-video-url="https://drive.google.com/uc?export=download&id=${video.id}">
                               📥 Download
                            </a>
                        </div>
                    `).join('')}
                </div>
                
                <script>
                    function downloadAll() {
                        const links = document.querySelectorAll('.download-btn');
                        links.forEach((link, index) => {
                            setTimeout(() => {
                                window.open(link.href, '_blank');
                            }, index * 1000); // 1 second delay between each
                        });
                    }
                    
                    function copyAllLinks() {
                        const links = Array.from(document.querySelectorAll('.download-btn'))
                            .map(link => link.href)
                            .join('\\n');
                        
                        navigator.clipboard.writeText(links).then(() => {
                            alert('✅ All download links copied to clipboard!');
                        }).catch(() => {
                            // Fallback for older browsers
                            const textArea = document.createElement('textarea');
                            textArea.value = links;
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            alert('✅ All download links copied to clipboard!');
                        });
                    }
                    
                    // Add click tracking
                    document.querySelectorAll('.download-btn').forEach(btn => {
                        btn.addEventListener('click', function(e) {
                            console.log('Video download initiated:', this.dataset.videoUrl);
                        });
                    });
                </script>
            </body>
            </html>
        `;
        
        // Open the video download page
        const downloadWindow = window.open('', '_blank');
        downloadWindow.document.write(htmlContent);
        downloadWindow.document.close();
        
        Utils.showSuccess(`🎥 Video download page opened with ${videos.length} videos`);
    }
    
    escapeHtml(text) {
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
    
    setupBulkDownload(files) {
        this.downloadQueueData = files.map((file, index) => ({
            ...file,
            status: 'waiting',
            progress: 0,
            error: null,
            index: index
        }));
        
        this.showWidget();
        this.updateDownloadList();
        this.showStartButton();
        
        Utils.showInfo(`${files.length} files queued for ZIP download. Click "Start Downloads" to begin.`);
    }
    
    async startMethod1Downloads() {
        if (this.downloadQueueData.length === 0) {
            Utils.showWarning('No files in download queue');
            return;
        }
        
        console.log(`🚀 Method 1: Starting bulk download with JSZip...`);
        
        this.isDownloading = true;
        this.hideStartButton();
        this.showProgressSection();
        
        try {
            // Initialize JSZip
            this.zip = new JSZip();
            this.zipProgress = { downloaded: 0, total: this.downloadQueueData.length };
            
            this.updateProgressSection('Downloading files for ZIP...', 0, this.downloadQueueData.length);
            
            // Download all files and add to ZIP
            const downloadPromises = this.downloadQueueData.map((item, index) => 
                this.downloadFileForZip(item, index)
            );
            
            await Promise.allSettled(downloadPromises);
            
            // Generate and download ZIP
            await this.generateAndDownloadZip();
            
        } catch (error) {
            console.error('Bulk download failed:', error);
            Utils.showError(`Bulk download failed: ${error.message}`);
        } finally {
            this.isDownloading = false;
            this.showStartButton();
        }
    }
    
    async downloadFileForZip(item, index) {
        try {
            item.status = 'current';
            this.updateDownloadList();
            
            console.log(`Downloading file ${index + 1}/${this.downloadQueueData.length}: ${item.name}`);
            
            // For ZIP downloads, only include non-video files
            const urls = this.getDirectDownloadURL(item.id);
            let success = false;
            
            for (let i = 0; i < urls.length && !success; i++) {
                try {
                    console.log(`Trying URL ${i + 1}/${urls.length} for ${item.name}`);
                    
                    const response = await fetch(urls[i], {
                        method: 'GET',
                        headers: {
                            'User-Agent': navigator.userAgent,
                            'Referer': 'https://drive.google.com/'
                        }
                    });
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        console.log(`URL ${i + 1} returned ${blob.size} bytes for ${item.name}`);
                        
                        // Accept any reasonable file size for non-videos
                        if (blob.size > 100) {
                            this.zip.file(item.name, blob);
                            
                            item.status = 'completed';
                            this.zipProgress.downloaded++;
                            success = true;
                            
                            console.log(`✅ Successfully downloaded ${item.name} (${blob.size} bytes)`);
                            
                            this.updateProgressSection(
                                `Downloaded ${this.zipProgress.downloaded}/${this.zipProgress.total} files...`,
                                this.zipProgress.downloaded,
                                this.zipProgress.total
                            );
                        } else {
                            console.warn(`File ${item.name} size ${blob.size} bytes too small, trying next URL...`);
                        }
                    } else {
                        console.warn(`URL ${i + 1} failed with status: ${response.status}`);
                    }
                } catch (error) {
                    console.warn(`URL ${i + 1} failed for ${item.name}:`, error.message);
                }
            }
            
            if (!success) {
                throw new Error('All URLs failed or returned files too small');
            }
            
        } catch (error) {
            console.error(`Failed to download ${item.name}:`, error);
            item.status = 'failed';
            item.error = error.message;
        }
        
        this.updateDownloadList();
    }
    
    async generateAndDownloadZip() {
        try {
            this.updateProgressSection('Creating ZIP file...', this.zipProgress.downloaded, this.zipProgress.total);
            
            const successfulFiles = this.downloadQueueData.filter(item => item.status === 'completed');
            
            if (successfulFiles.length === 0) {
                throw new Error('No files were successfully downloaded');
            }
            
            console.log(`Generating ZIP with ${successfulFiles.length} files...`);
            
            const zipBlob = await this.zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });
            
            const zipName = `files_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.zip`;
            this.downloadBlob(zipBlob, zipName);
            
            this.updateProgressSection(
                `✅ ZIP created: ${zipName} (${successfulFiles.length} files)`,
                this.zipProgress.total,
                this.zipProgress.total
            );
            
            Utils.showSuccess(`ZIP download complete! ${successfulFiles.length} files packaged.`);
            
        } catch (error) {
            console.error('ZIP generation failed:', error);
            throw new Error(`Failed to create ZIP: ${error.message}`);
        }
    }
    
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Test Method 1
    testMethod1() {
        console.log('🧪 Testing Method 1: Direct Download + JSZip');
        
        // Create test file object (you can replace with actual file ID for testing)
        const testFile = {
            id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Example Google Sheets file
            name: 'test_file.csv',
            type: 'file',
            mimeType: 'text/csv'
        };
        
        try {
            Utils.showInfo('Testing Method 1: Direct Download URL...');
            this.downloadSingleFile(testFile);
        } catch (error) {
            console.error('Test failed:', error);
            Utils.showError(`Test failed: ${error.message}`);
        }
    }
    
    // UI Helper Methods
    showWidget() {
        const widget = document.getElementById('downloadWidget');
        if (widget) widget.classList.remove('hidden');
    }
    
    hideWidget() {
        const widget = document.getElementById('downloadWidget');
        if (widget) widget.classList.add('hidden');
    }
    
    toggleWidget() {
        const widget = document.getElementById('downloadWidget');
        if (widget) widget.classList.toggle('minimized');
    }
    
    showStartButton() {
        const startBtn = document.getElementById('startDownloads');
        if (startBtn) startBtn.style.display = 'inline-block';
    }
    
    hideStartButton() {
        const startBtn = document.getElementById('startDownloads');
        if (startBtn) startBtn.style.display = 'none';
    }
    
    showProgressSection() {
        const section = document.getElementById('downloadProgressSection');
        if (section) section.style.display = 'block';
    }
    
    updateProgressSection(label, current, total) {
        const progressLabel = document.getElementById('progressLabel');
        const progressStats = document.getElementById('progressStats');
        const progressFill = document.getElementById('overallProgressFill');
        const progressDetails = document.getElementById('progressDetails');
        
        if (progressLabel) progressLabel.textContent = label;
        if (progressStats) progressStats.textContent = `${current}/${total}`;
        if (progressDetails) progressDetails.textContent = `Progress: ${current} of ${total} completed`;
        
        if (progressFill) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            progressFill.style.width = `${percentage}%`;
        }
    }
    
    updateDownloadList() {
        const listElement = document.getElementById('downloadList');
        if (!listElement) return;
        
        listElement.innerHTML = '';
        
        this.downloadQueueData.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = `download-item ${item.status}`;
            
            let icon = '⏳';
            if (item.status === 'completed') icon = '✅';
            else if (item.status === 'failed') icon = '❌';
            else if (item.status === 'current') icon = '⬇️';
            else if (item.status === 'skipped') icon = '⏩';
            
            itemElement.innerHTML = `
                <div class="download-status-icon">${icon}</div>
                <div class="download-info">
                    <div class="download-name">${Utils.sanitizeHTML(item.name)}</div>
                    <div class="download-details">
                        <span>${item.status}</span>
                        ${item.error ? `<span style="color: #ef4444;">${item.error}</span>` : ''}
                        ${item.warning ? `<span style="color: #f59e0b;">${item.warning}</span>` : ''}
                    </div>
                </div>
            `;
            
            listElement.appendChild(itemElement);
        });
    }
    
    cancelAllDownloads() {
        this.downloadQueueData = [];
        this.isDownloading = false;
        this.zip = null;
        this.hideWidget();
        Utils.showInfo('All downloads cancelled');
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DownloadManager;
}
