// assets/js/previewManager.js - Mobile-optimized preview manager

class PreviewManager {
    constructor() {
        this.currentFile = null;
        this.currentFiles = [];
        this.currentIndex = 0;
        this.setupModal();
        this.setupKeyboardNavigation();
    }
    
    setupModal() {
        // Remove existing modal if it exists
        const existingModal = document.getElementById('previewModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'previewModal';
        modal.className = 'preview-modal hidden';
        modal.innerHTML = `
            <div class="preview-overlay"></div>
            <div class="preview-container">
                <div class="preview-header">
                    <div class="preview-title" id="previewTitle">Loading...</div>
                    <div class="preview-controls">
                        <button class="preview-btn" id="downloadFromPreview">📥 Download</button>
                        <button class="preview-btn close-btn" id="closePreview">×</button>
                    </div>
                </div>
                <div class="preview-content" id="previewContent">
                    <div class="preview-loading">
                        <div class="spinner"></div>
                        <span>Loading preview...</span>
                    </div>
                </div>
                <div class="preview-navigation">
                    <button class="nav-btn prev-btn" id="prevBtn" title="Previous file">‹</button>
                    <div class="preview-counter">
                        <span id="currentFileIndex">1</span> of <span id="totalFiles">1</span>
                    </div>
                    <button class="nav-btn next-btn" id="nextBtn" title="Next file">›</button>
                </div>
            </div>
        `;
        
        this.addStyles();
        document.body.appendChild(modal);
        this.bindEvents();
    }
    
    bindEvents() {
        const modal = document.getElementById('previewModal');
        
        // Close button
        document.getElementById('closePreview').onclick = () => this.hidePreview();
        
        // Navigation buttons
        document.getElementById('prevBtn').onclick = () => this.showPreviousFile();
        document.getElementById('nextBtn').onclick = () => this.showNextFile();
        
        // Download button
        document.getElementById('downloadFromPreview').onclick = () => this.downloadCurrentFile();
        
        // Overlay click to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('preview-overlay')) {
                this.hidePreview();
            }
        });
    }
    
    addStyles() {
        if (document.getElementById('previewStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'previewStyles';
        style.textContent = `
            .preview-modal {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                z-index: 10000; background: rgba(0,0,0,0.95);
                animation: fadeIn 0.3s ease-in-out;
            }
            .preview-modal.hidden { display: none; }
            
            .preview-overlay {
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            }
            
            .preview-container {
                position: relative; width: 100%; height: 100%;
                display: flex; flex-direction: column;
            }
            
            .preview-header {
                padding: 15px 20px; display: flex; justify-content: space-between;
                align-items: center; background: rgba(0,0,0,0.9); color: white;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .preview-title { 
                font-size: 16px; font-weight: 500; 
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                max-width: 60%;
            }
            
            .preview-controls { 
                display: flex; gap: 10px; align-items: center;
            }
            
            .preview-btn {
                padding: 8px 12px; background: rgba(255,255,255,0.15);
                color: white; border: none; border-radius: 6px;
                cursor: pointer; transition: background 0.2s;
                font-size: 14px; font-weight: 500;
            }
            .preview-btn:hover { background: rgba(255,255,255,0.25); }
            
            .close-btn {
                width: 36px; height: 36px; padding: 0;
                font-size: 20px; font-weight: bold;
                display: flex; align-items: center; justify-content: center;
            }
            
            .preview-content {
                flex: 1; display: flex; align-items: center;
                justify-content: center; padding: 20px; overflow: hidden;
                position: relative;
            }
            
            .preview-image { 
                max-width: 100%; max-height: 100%; object-fit: contain;
                border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            }
            
            .preview-iframe { 
                width: 100%; height: 100%; border: none; 
                border-radius: 8px; background: white;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            }
            
            .preview-navigation {
                padding: 15px 20px; display: flex; justify-content: space-between;
                align-items: center; background: rgba(0,0,0,0.9); color: white;
                border-top: 1px solid rgba(255,255,255,0.1);
            }
            
            .nav-btn {
                width: 44px; height: 44px; border-radius: 50%;
                background: rgba(255,255,255,0.15); color: white;
                border: none; font-size: 20px; cursor: pointer;
                transition: all 0.2s; font-weight: bold;
                display: flex; align-items: center; justify-content: center;
            }
            .nav-btn:hover:not(:disabled) { 
                background: rgba(255,255,255,0.25); 
                transform: scale(1.05);
            }
            .nav-btn:disabled { 
                opacity: 0.3; cursor: not-allowed; 
                background: rgba(255,255,255,0.05);
            }
            
            .preview-counter { 
                font-size: 15px; font-weight: 500;
                background: rgba(255,255,255,0.1);
                padding: 8px 16px; border-radius: 20px;
            }
            
            .preview-loading {
                display: flex; flex-direction: column; align-items: center;
                gap: 20px; color: white; text-align: center;
            }
            
            .preview-loading h3 {
                margin: 0; font-size: 18px; color: white;
            }
            
            .preview-loading p {
                margin: 10px 0; color: rgba(255,255,255,0.8);
            }
            
            .spinner {
                width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3);
                border-top: 3px solid white; border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            .preview-error {
                display: flex; flex-direction: column; align-items: center;
                gap: 20px; color: white; text-align: center; padding: 40px;
            }
            
            .preview-error-icon {
                font-size: 48px; opacity: 0.7;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Mobile optimizations */
            @media (max-width: 768px) {
                .preview-header {
                    padding: 12px 15px;
                }
                
                .preview-title {
                    font-size: 14px; max-width: 50%;
                }
                
                .preview-btn {
                    padding: 6px 10px; font-size: 12px;
                }
                
                .preview-content {
                    padding: 15px;
                }
                
                .preview-navigation {
                    padding: 12px 15px;
                }
                
                .nav-btn {
                    width: 40px; height: 40px; font-size: 18px;
                }
                
                .preview-counter {
                    font-size: 13px; padding: 6px 12px;
                }
            }
            
            @media (max-width: 480px) {
                .preview-header {
                    flex-direction: column; gap: 10px; align-items: stretch;
                }
                
                .preview-title {
                    max-width: 100%; text-align: center;
                }
                
                .preview-controls {
                    justify-content: center;
                }
                
                .preview-content {
                    padding: 10px;
                }
                
                .nav-btn {
                    width: 36px; height: 36px; font-size: 16px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (this.isPreviewVisible()) {
                switch(e.key) {
                    case 'Escape':
                        this.hidePreview();
                        break;
                    case 'ArrowLeft':
                        this.showPreviousFile();
                        break;
                    case 'ArrowRight':
                        this.showNextFile();
                        break;
                    case ' ':
                    case 'Enter':
                        this.downloadCurrentFile();
                        break;
                }
                e.preventDefault();
            }
        });
    }
    
    showPreview(file, allFiles = []) {
        if (!file) {
            console.warn('No file provided for preview');
            return;
        }
        
        this.currentFile = file;
        this.currentFiles = Array.isArray(allFiles) ? allFiles.filter(f => f.type === 'file') : [file];
        this.currentIndex = this.currentFiles.findIndex(f => f.id === file.id);
        
        if (this.currentIndex === -1) {
            this.currentIndex = 0;
        }
        
        this.showPreviewModal();
        this.loadCurrentPreview();
    }
    
    showPreviewModal() {
        const modal = document.getElementById('previewModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }
    
    hidePreview() {
        const modal = document.getElementById('previewModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
        
        this.currentFile = null;
        this.currentFiles = [];
        this.currentIndex = 0;
    }
    
    isPreviewVisible() {
        const modal = document.getElementById('previewModal');
        return modal && !modal.classList.contains('hidden');
    }
    
    async loadCurrentPreview() {
        const currentFile = this.currentFiles[this.currentIndex];
        if (!currentFile) return;
        
        this.currentFile = currentFile;
        
        // Update UI elements
        this.updatePreviewUI();
        
        const content = document.getElementById('previewContent');
        if (!content) return;
        
        // Show loading state
        content.innerHTML = `
            <div class="preview-loading">
                <div class="spinner"></div>
                <span>Loading preview...</span>
            </div>
        `;
        
        try {
            await this.loadPreviewContent(currentFile, content);
        } catch (error) {
            console.error('Preview failed:', error);
            this.showPreviewError(currentFile, content);
        }
    }
    
    updatePreviewUI() {
        const title = document.getElementById('previewTitle');
        const currentIndex = document.getElementById('currentFileIndex');
        const totalFiles = document.getElementById('totalFiles');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (title) title.textContent = this.currentFile.name;
        if (currentIndex) currentIndex.textContent = this.currentIndex + 1;
        if (totalFiles) totalFiles.textContent = this.currentFiles.length;
        
        if (prevBtn) prevBtn.disabled = this.currentIndex === 0;
        if (nextBtn) nextBtn.disabled = this.currentIndex === this.currentFiles.length - 1;
    }
    
    async loadPreviewContent(file, container) {
        const extension = file.name.split('.').pop().toLowerCase();
        const mimeType = file.mimeType || '';
        
        if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
            await this.loadImagePreview(file, container);
        } else if (mimeType.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(extension)) {
            this.loadVideoPreview(file, container);
        } else if (mimeType === 'application/pdf' || extension === 'pdf') {
            this.loadPDFPreview(file, container);
        } else if (this.isDocumentType(mimeType) || ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
            this.loadDocumentPreview(file, container);
        } else {
            throw new Error('Unsupported file type for preview');
        }
    }
    
    async loadImagePreview(file, container) {
    // Try multiple image URL formats for better mobile compatibility
    const imageUrls = [
        `https://lh3.googleusercontent.com/d/${file.id}`,
        `https://drive.google.com/uc?export=view&id=${file.id}`,
        `https://drive.google.com/uc?id=${file.id}`
    ];
    
    let imageLoaded = false;
    
    for (const imageUrl of imageUrls) {
        if (imageLoaded) break;
        
        try {
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    container.innerHTML = `<img src="${imageUrl}" class="preview-image" alt="${file.name}">`;
                    imageLoaded = true;
                    resolve();
                };
                img.onerror = reject;
                img.src = imageUrl;
                
                // Timeout after 3 seconds
                setTimeout(reject, 3000);
            });
        } catch (error) {
            continue; // Try next URL
        }
    }
    
    // If no image URL worked, fallback to iframe
    if (!imageLoaded) {
        container.innerHTML = `<iframe src="https://drive.google.com/file/d/${file.id}/preview" class="preview-iframe" sandbox="allow-scripts allow-same-origin"></iframe>`;
    }
}
    
    loadVideoPreview(file, container) {
    container.innerHTML = `<iframe src="https://drive.google.com/file/d/${file.id}/preview" class="preview-iframe" allow="autoplay; encrypted-media" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>`;
}

loadPDFPreview(file, container) {
    // Use different URL for mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const previewUrl = isMobile ? 
        `https://drive.google.com/file/d/${file.id}/view` :
        `https://drive.google.com/file/d/${file.id}/preview`;
        
    container.innerHTML = `<iframe src="${previewUrl}" class="preview-iframe" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>`;
}
    
    loadDocumentPreview(file, container) {
        container.innerHTML = `<iframe src="https://docs.google.com/viewer?url=https://drive.google.com/uc?id=${file.id}&embedded=true" class="preview-iframe"></iframe>`;
    }
    
    showPreviewError(file, container) {
    container.innerHTML = `
        <div class="preview-error">
            <div class="preview-error-icon">📄</div>
            <h3>Preview not available</h3>
            <p>Unable to load preview for ${file.name}</p>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button class="preview-btn" onclick="window.App.downloadManager.downloadSingleFile('${file.id}', '${file.name}')">
                    📥 Download File
                </button>
                <button class="preview-btn" onclick="window.open('https://drive.google.com/file/d/${file.id}/view', '_blank')">
                    🔗 Open in Drive
                </button>
            </div>
        </div>
    `;
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
            'text/html'
        ];
        return documentTypes.includes(mimeType);
    }
    
    showPreviousFile() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.loadCurrentPreview();
        }
    }
    
    showNextFile() {
        if (this.currentIndex < this.currentFiles.length - 1) {
            this.currentIndex++;
            this.loadCurrentPreview();
        }
    }
    
    downloadCurrentFile() {
    if (this.currentFile && window.App?.downloadManager) {
        // Use the new individual download method instead of the old downloadFiles method
        window.App.downloadManager.downloadSingleFile(this.currentFile.id, this.currentFile.name);
    }
}
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewManager;
}
