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
            } else if (mimeType.startsWith('text/') || this.isDocumentType(mimeType)) {
                this.loadDocumentPreview(file);
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
            src: this.getPreviewURL(file.id),
            alt: file.name,
            style: 'max-width: 100%; max-height: 500px; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);'
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
        const embedUrl = this.getEmbedURL(file.id);
        
        const iframe = Utils.dom.create('iframe', {
            src: embedUrl,
            style: 'width: 100%; height: 600px; border: none; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);',
            sandbox: 'allow-scripts allow-same-origin allow-popups'
        });
        
        iframe.addEventListener('load', () => {
            // PDF loaded successfully
            Config.log('debug', 'PDF preview loaded successfully');
        });
        
        iframe.addEventListener('error', () => {
            this.showPreviewError(file, new Error('Failed to load PDF'));
        });
        
        this.previewContent.innerHTML = '';
        this.previewContent.appendChild(iframe);
    }
    
    loadVideoPreview(file) {
        // For videos, we'll also use iframe for better compatibility
        const embedUrl = this.getEmbedURL(file.id);
        
        const iframe = Utils.dom.create('iframe', {
            src: embedUrl,
            style: 'width: 100%; height: 500px; border: none; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);',
            sandbox: 'allow-scripts allow-same-origin allow-popups',
            allow: 'autoplay; encrypted-media'
        });
        
        iframe.addEventListener('load', () => {
            Config.log('debug', 'Video preview loaded successfully');
        });
        
        iframe.addEventListener('error', () => {
            this.showPreviewError(file, new Error('Failed to load video'));
        });
        
        this.previewContent.innerHTML = '';
        this.previewContent.appendChild(iframe);
    }
    
    loadDocumentPreview(file) {
        // For documents (Word, Excel, PowerPoint), use Google Drive viewer
        const embedUrl = this.getEmbedURL(file.id);
        
        const iframe = Utils.dom.create('iframe', {
            src: embedUrl,
            style: 'width: 100%; height: 600px; border: none; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);',
            sandbox: 'allow-scripts allow-same-origin allow-popups'
        });
        
        iframe.addEventListener('load', () => {
            Config.log('debug', 'Document preview loaded successfully');
        });
        
        iframe.addEventListener('error', () => {
            this.showPreviewUnavailable(file, 'Document preview not available. Click download to view the file.');
        });
        
        this.previewContent.innerHTML = '';
        this.previewContent.appendChild(iframe);
    }
    
    isDocumentType(mimeType) {
        const documentTypes = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/html',
            'text/css',
            'text/javascript',
            'application/json'
        ];
        
        return documentTypes.includes(mimeType);
    }
    
    getPreviewURL(fileId) {
        // Use direct view URL instead of export for better compatibility
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    
    getEmbedURL(fileId) {
        // Use the embed URL format that works better in iframes
        return `https://drive.google.com/file/d/${fileId}/preview?usp=sharing`;
    }
    
    showPreviewUnavailable(file, customMessage = null) {
        const message = customMessage || 
            `Preview not available for ${Utils.getFileExtension(file.name).toUpperCase()} files.`;
        
        const content = Utils.dom.create('div', {
            className: 'preview-unavailable',
            innerHTML: `
                <div style="text-align: center; padding: 3rem; color: #6B7280;">
                    <div style="font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.5;">
                        ${Config.getFileIcon(file.mimeType, file.name)}
                    </div>
                    <h3 style="margin-bottom: 1rem; color: #374151; font-size: 1.25rem;">${Utils.sanitizeHTML(file.name)}</h3>
                    <p style="margin-bottom: 2rem; line-height: 1.6; max-width: 400px; margin-left: auto; margin-right: auto;">${message}</p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="window.App.previewManager.downloadCurrentFile()">
                            📥 Download File
                        </button>
                        <button class="btn btn-outline" onclick="window.App.previewManager.openInNewTab()">
                            🔗 Open in Drive
                        </button>
                    </div>
                    ${file.size ? `<p style="margin-top: 1rem; font-size: 0.875rem; color: #9CA3AF;">File size: ${Config.formatFileSize(file.size)}</p>` : ''}
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
                <div style="text-align: center; padding: 3rem; color: #EF4444;">
                    <div style="font-size: 4rem; margin-bottom: 1.5rem;">❌</div>
                    <h3 style="margin-bottom: 1rem; color: #374151; font-size: 1.25rem;">Preview Error</h3>
                    <p style="margin-bottom: 2rem; color: #6B7280; line-height: 1.6;">
                        Failed to load preview for <strong>${Utils.sanitizeHTML(file.name)}</strong>
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-outline" onclick="window.App.previewManager.loadPreviewContent(window.App.previewManager.currentFile)">
                            🔄 Retry Preview
                        </button>
                        <button class="btn btn-primary" onclick="window.App.previewManager.downloadCurrentFile()">
                            📥 Download Instead
                        </button>
                        <button class="btn btn-outline" onclick="window.App.previewManager.openInNewTab()">
                            🔗 Open in Drive
                        </button>
                    </div>
                </div>
            `
        });
        
        this.previewContent.innerHTML = '';
        this.previewContent.appendChild(content);
    }
    
    openInNewTab() {
        if (this.currentFile) {
            const driveUrl = `https://drive.google.com/file/d/${this.currentFile.id}/view`;
            window.open(driveUrl, '_blank', 'noopener,noreferrer');
        }
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
        return Config.isPreviewable(mimeType, file.size) || this.isDocumentType(mimeType);
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
                img.src = this.getPreviewURL(file.id);
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
