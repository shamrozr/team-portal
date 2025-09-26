// assets/js/previewManager.js - File preview and modal management

class PreviewManager {
    constructor() {
        this.currentFile = null;
        this.currentFiles = [];
        this.currentIndex = 0;
        
        // DOM elements
        this.previewModal = Utils.dom.select('#previewModal');
        this.previewTitle = Utils.dom.select('#previewTitle');
        this.previewContent = Utils.dom.select('#previewContent');
        this.closePreview = Utils.dom.select('#closePreview');
        this.prevFile = Utils.dom.select('#prevFile');
        this.nextFile = Utils.dom.select('#nextFile');
        this.downloadCurrent = Utils.dom.select('#downloadCurrent');
        
        this.bindEvents();
    }
    
    bindEvents() {
        // Close button
        if (this.closePreview) {
            this.closePreview.addEventListener('click', () => {
                this.hidePreview();
            });
        }
        
        // Navigation buttons
        if (this.prevFile) {
            this.prevFile.addEventListener('click', () => {
                this.showPreviousFile();
            });
        }
        
        if (this.nextFile) {
            this.nextFile.addEventListener('click', () => {
                this.showNextFile();
            });
        }
        
        // Download current file
        if (this.downloadCurrent) {
            this.downloadCurrent.addEventListener('click', () => {
                this.downloadCurrentFile();
            });
        }
        
        // Modal overlay click
        if (this.previewModal) {
            this.previewModal.addEventListener('click', (e) => {
                if (e.target === this.previewModal || e.target.classList.contains('modal-overlay')) {
                    this.hidePreview();
                }
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isPreviewVisible()) {
                this.handleKeyboard(e);
            }
        });
    }
    
    showPreview(file, allFiles = []) {
        if (!file) {
            Config.log('warn', 'No file provided for preview');
            return;
        }
        
        Config.log('debug', `Showing preview for file: ${file.name}`);
        
        this.currentFile = file;
        this.currentFiles = allFiles.filter(f => f.type === 'file') || [file];
        this.currentIndex = this.currentFiles.findIndex(f => f.id === file.id);
        
        if (this.currentIndex === -1) {
            this.currentIndex = 0;
        }
        
        // Check if file is previewable
        if (!Config.isPreviewable(file.mimeType, file.size)) {
            this.showPreviewUnavailable(file);
            return;
        }
        
        // Update modal title
        if (this.previewTitle) {
            this.previewTitle.textContent = file.name;
        }
        
        // Load preview content
        this.loadPreviewContent(file);
        
        // Update navigation
        this.updateNavigation();
        
        // Show modal
        this.showPreviewModal();
    }
    
    loadPreviewContent(file) {
        if (!this.previewContent) return;
        
        // Clear previous content
        this.previewContent.innerHTML = '<div class="preview-loading">Loading preview...</div>';
        
        try {
            const mimeType = file.mimeType || Utils.getMimeType(file.name);
            
            if (mimeType.startsWith('image/')) {
                this.loadImagePreview(file);
            } else if (mimeType === 'application/pdf') {
                this.loadPDFPreview(file);
            } else if (mimeType.startsWith('video/')) {
                this.loadVideoPreview(file);
            } else if (mimeType.startsWith('text/')) {
                this.loadTextPreview(file);
            } else {
                this.showPreviewUnavailable(file);
            }
            
        } catch (error) {
            Config.log('error', 'Failed to load preview:', error);
            this.showPreviewError(file, error);
        }
    }
    
    loadImagePreview(file) {
        const img = Utils.dom.create('img', {
            src: Config.getDrivePreviewURL(file.id),
            alt: file.name,
            style: 'max-width: 100%; max-height: 500px; object-fit: contain;'
        });
        
        img.addEventListener('load', () => {
            this.previewContent.innerHTML = '';
            this.previewContent.appendChild(img);
        });
        
        img.addEventListener('error', () => {
            this.showPreviewError(file, new Error('Failed to load image'));
        });
    }
    
    loadPDFPreview(file) {
        const embedUrl = Config.getDriveEmbedURL(file.id);
        
        const iframe = Utils.dom.create('iframe', {
            src: embedUrl,
            style: 'width: 100%; height: 500px; border: none; border-radius: 8px;'
        });
        
        iframe.addEventListener('load', () => {
            // PDF loaded successfully
        });
        
        iframe.addEventListener('error', () => {
            this.showPreviewError(file, new Error('Failed to load PDF'));
        });
        
        this.previewContent.innerHTML = '';
        this.previewContent.appendChild(iframe);
    }
    
    loadVideoPreview(file) {
        const video = Utils.dom.create('video', {
            controls: true,
            style: 'max-width: 100%; max-height: 500px;',
            preload: 'metadata'
        });
        
        const source = Utils.dom.create('source', {
            src: Config.getDrivePreviewURL(file.id),
            type: file.mimeType
        });
        
        video.appendChild(source);
        
        video.addEventListener('loadedmetadata', () => {
            this.previewContent.innerHTML = '';
            this.previewContent.appendChild(video);
        });
        
        video.addEventListener('error', () => {
            this.showPreviewError(file, new Error('Failed to load video'));
        });
    }
    
    loadTextPreview(file) {
        // For text files, we'll show a message about downloading to view
        this.showPreviewUnavailable(file, 'Text files need to be downloaded to view their contents.');
    }
    
    showPreviewUnavailable(file, customMessage = null) {
        const message = customMessage || 
            `Preview not available for ${Utils.getFileExtension(file.name).toUpperCase()} files.`;
        
        const content = Utils.dom.create('div', {
            className: 'preview-unavailable',
            innerHTML: `
                <div style="text-align: center; padding: 2rem; color: #6B7280;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">
                        ${Config.getFileIcon(file.mimeType, file.name)}
                    </div>
                    <h3 style="margin-bottom: 0.5rem; color: #374151;">${Utils.sanitizeHTML(file.name)}</h3>
                    <p style="margin-bottom: 1rem;">${message}</p>
                    <button class="btn btn-primary" onclick="window.App.previewManager.downloadCurrentFile()">
                        Download File
                    </button>
                </div>
            `
        });
        
        this.previewContent.innerHTML = '';
        this.previewContent.appendChild(content);
    }
    
    showPreviewError(file, error) {
        Config.log('error', 'Preview error:', error);
        
        const content = Utils.dom.create('div', {
            className: 'preview-error',
            innerHTML: `
                <div style="text-align: center; padding: 2rem; color: #EF4444;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                    <h3 style="margin-bottom: 0.5rem; color: #374151;">Preview Error</h3>
                    <p style="margin-bottom: 1rem; color: #6B7280;">
                        Failed to load preview for ${Utils.sanitizeHTML(file.name)}
                    </p>
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="btn btn-outline" onclick="window.App.previewManager.loadPreviewContent(window.App.previewManager.currentFile)">
                            Retry
                        </button>
                        <button class="btn btn-primary" onclick="window.App.previewManager.downloadCurrentFile()">
                            Download Instead
                        </button>
                    </div>
                </div>
            `
        });
        
        this.previewContent.innerHTML = '';
        this.previewContent.appendChild(content);
    }
    
    updateNavigation() {
        const hasMultipleFiles = this.currentFiles.length > 1;
        const isFirst = this.currentIndex === 0;
        const isLast = this.currentIndex === this.currentFiles.length - 1;
        
        // Update navigation buttons
        if (this.prevFile) {
            this.prevFile.disabled = !hasMultipleFiles || isFirst;
            this.prevFile.style.display = hasMultipleFiles ? 'flex' : 'none';
        }
        
        if (this.nextFile) {
            this.nextFile.disabled = !hasMultipleFiles || isLast;
            this.nextFile.style.display = hasMultipleFiles ? 'flex' : 'none';
        }
        
        // Update button text with file info
        if (hasMultipleFiles) {
            if (this.prevFile && !isFirst) {
                const prevFile = this.currentFiles[this.currentIndex - 1];
                this.prevFile.title = `Previous: ${prevFile.name}`;
            }
            
            if (this.nextFile && !isLast) {
                const nextFile = this.currentFiles[this.currentIndex + 1];
                this.nextFile.title = `Next: ${nextFile.name}`;
            }
        }
    }
    
    showPreviousFile() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            const file = this.currentFiles[this.currentIndex];
            this.showPreview(file, this.currentFiles);
        }
    }
    
    showNextFile() {
        if (this.currentIndex < this.currentFiles.length - 1) {
            this.currentIndex++;
            const file = this.currentFiles[this.currentIndex];
            this.showPreview(file, this.currentFiles);
        }
    }
    
    downloadCurrentFile() {
        if (this.currentFile && window.App?.downloadManager) {
            window.App.downloadManager.downloadFiles([this.currentFile]);
        }
    }
    
    showPreviewModal() {
        Utils.dom.show(this.previewModal);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Focus the modal for keyboard navigation
        this.previewModal.focus();
    }
    
    hidePreview() {
        Utils.dom.hide(this.previewModal);
        document.body.style.overflow = ''; // Restore scrolling
        
        // Clear current preview data
        this.currentFile = null;
        this.currentFiles = [];
        this.currentIndex = 0;
        
        // Clear preview content
        if (this.previewContent) {
            this.previewContent.innerHTML = '';
        }
    }
    
    isPreviewVisible() {
        return this.previewModal && !this.previewModal.classList.contains('hidden');
    }
    
    handleKeyboard(e) {
        switch (e.key) {
            case Config.KEYBOARD_SHORTCUTS.ESCAPE:
                e.preventDefault();
                this.hidePreview();
                break;
                
            case Config.KEYBOARD_SHORTCUTS.ARROW_LEFT:
                e.preventDefault();
                this.showPreviousFile();
                break;
                
            case Config.KEYBOARD_SHORTCUTS.ARROW_RIGHT:
                e.preventDefault();
                this.showNextFile();
                break;
                
            case Config.KEYBOARD_SHORTCUTS.SPACE:
            case Config.KEYBOARD_SHORTCUTS.ENTER:
                e.preventDefault();
                this.downloadCurrentFile();
                break;
        }
    }
    
    // Public API methods
    getCurrentFile() {
        return this.currentFile;
    }
    
    getCurrentIndex() {
        return this.currentIndex;
    }
    
    getTotalFiles() {
        return this.currentFiles.length;
    }
    
    isFilePreviewable(file) {
        if (!file) return false;
        
        const mimeType = file.mimeType || Utils.getMimeType(file.name);
        return Config.isPreviewable(mimeType, file.size);
    }
    
    getPreviewInfo() {
        return {
            currentFile: this.currentFile,
            currentIndex: this.currentIndex,
            totalFiles: this.currentFiles.length,
            isVisible: this.isPreviewVisible()
        };
    }
    
    // Utility method to preload next/previous images for smoother navigation
    preloadAdjacentImages() {
        if (!this.currentFiles || this.currentFiles.length <= 1) return;
        
        const preloadImage = (index) => {
            if (index < 0 || index >= this.currentFiles.length) return;
            
            const file = this.currentFiles[index];
            if (file.mimeType && file.mimeType.startsWith('image/')) {
                const img = new Image();
                img.src = Config.getDrivePreviewURL(file.id);
            }
        };
        
        // Preload previous and next images
        preloadImage(this.currentIndex - 1);
        preloadImage(this.currentIndex + 1);
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewManager;
}