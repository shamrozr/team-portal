// assets/js/fileManager.js - Updated with bulk download support via ZIP

class FileManager {
    constructor() {
        this.driveData = null;
        this.currentPath = '/';
        this.currentFolder = null;
        this.selectedFiles = new Set();
        this.navigationHistory = [];
        this.historyIndex = -1;
        this.viewMode = 'grid'; // 'grid' or 'list'
        this.searchTerm = '';
        
        // DOM elements
        this.fileGrid = Utils.dom.select('#fileGrid');
        this.breadcrumb = Utils.dom.select('#breadcrumb');
        this.emptyState = Utils.dom.select('#emptyState');
        this.folderActions = Utils.dom.select('#folderActions');
        this.selectedCount = Utils.dom.select('#selectedCount');
        this.selectedNumber = Utils.dom.select('#selectedNumber');
        this.downloadSelected = Utils.dom.select('#downloadSelected');
        
        // Action buttons
        this.selectAllButton = Utils.dom.select('#selectAllButton');
        this.deselectAllButton = Utils.dom.select('#deselectAllButton');
        this.backButton = Utils.dom.select('#backButton');
        this.forwardButton = Utils.dom.select('#forwardButton');
        this.gridViewButton = Utils.dom.select('#gridViewButton');
        this.listViewButton = Utils.dom.select('#listViewButton');
        
        this.bindEvents();
        this.loadUserPreferences();
    }
    
    async init() {
        if (!window.App?.auth?.isUserAuthenticated()) {
            Config.log('warn', 'User not authenticated, cannot initialize file manager');
            return;
        }
        
        try {
            Config.log('info', 'Initializing file manager...');
            
            // Load drive data
            await this.loadDriveData();
            
            // Navigate to saved or root path
            const savedPath = Utils.storage.get(Config.STORAGE_KEYS.LAST_PATH) || '/';
            await this.navigateToPath(savedPath);
            
            Config.log('info', 'File manager initialized successfully');
            
        } catch (error) {
            Config.log('error', 'Failed to initialize file manager:', error);
            Utils.showError('Failed to load file system. Please refresh the page.');
        }
    }
    
    async loadDriveData() {
        try {
            this.driveData = await Utils.fetchJSON(Config.DRIVE_DATA_PATH);
            Config.log('debug', 'Drive data loaded:', this.driveData);
            
            if (!this.driveData) {
                throw new Error('Drive data is empty or invalid');
            }
            
        } catch (error) {
            Config.log('error', 'Failed to load drive data:', error);
            throw new Error('Failed to load file system data');
        }
    }
    
    bindEvents() {
        // Selection buttons
        if (this.selectAllButton) {
            this.selectAllButton.addEventListener('click', () => {
                this.selectAllFiles();
            });
        }
        
        if (this.deselectAllButton) {
            this.deselectAllButton.addEventListener('click', () => {
                this.deselectAllFiles();
            });
        }
        
        // Navigation buttons
        if (this.backButton) {
            this.backButton.addEventListener('click', () => {
                this.navigateBack();
            });
        }
        
        if (this.forwardButton) {
            this.forwardButton.addEventListener('click', () => {
                this.navigateForward();
            });
        }
        
        // View mode buttons
        if (this.gridViewButton) {
            this.gridViewButton.addEventListener('click', () => {
                this.setViewMode('grid');
            });
        }
        
        if (this.listViewButton) {
            this.listViewButton.addEventListener('click', () => {
                this.setViewMode('list');
            });
        }
        
        // Download selected files
        if (this.downloadSelected) {
            this.downloadSelected.addEventListener('click', () => {
                this.downloadSelectedFiles();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
        
        // Breadcrumb navigation
        if (this.breadcrumb) {
            this.breadcrumb.addEventListener('click', (e) => {
                if (e.target.classList.contains('breadcrumb-item') && e.target.dataset.path) {
                    this.navigateToPath(e.target.dataset.path);
                }
            });
        }
    }
    
    async navigateToPath(path) {
        try {
            Config.log('debug', `Navigating to path: ${path}`);
            
            const folder = this.findFolderByPath(path);
            if (!folder) {
                Config.log('warn', `Folder not found for path: ${path}`);
                path = '/'; // Fallback to root
                folder = this.driveData;
            }
            
            this.currentPath = path;
            this.currentFolder = folder;
            
            // Add to navigation history
            this.addToHistory(path);
            
            // Save current path
            Utils.storage.set(Config.STORAGE_KEYS.LAST_PATH, path);
            
            // Update UI
            this.updateBreadcrumb();
            this.renderFiles();
            this.updateNavigationButtons();
            this.clearSelection();
            
        } catch (error) {
            Config.log('error', 'Navigation failed:', error);
            Utils.showError('Failed to navigate to folder');
        }
    }
    
    findFolderByPath(path) {
        if (path === '/' || !path) {
            return this.driveData;
        }
        
        const pathParts = path.split('/').filter(part => part);
        let currentFolder = this.driveData;
        
        for (const part of pathParts) {
            if (!currentFolder.children) {
                return null;
            }
            
            const nextFolder = currentFolder.children.find(child => 
                child.type === 'folder' && child.name === part
            );
            
            if (!nextFolder) {
                return null;
            }
            
            currentFolder = nextFolder;
        }
        
        return currentFolder;
    }
    
    renderFiles() {
        if (!this.currentFolder) {
            this.showEmptyState();
            return;
        }

        const items = this.currentFolder.children || [];
        
        if (items.length === 0) {
            this.showEmptyState();
            return;
        }

        Utils.dom.hide(this.emptyState);
        Utils.dom.show(this.folderActions);
        
        // Clear current files
        this.fileGrid.innerHTML = '';
        
        // Sort items - folders first, then files
        const sortedItems = [...items].sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
        
        // Render items
        sortedItems.forEach((item, index) => {
            const fileElement = this.createFileElement(item, index);
            this.fileGrid.appendChild(fileElement);
            
            // Add download button to files (not folders)
            if (window.App?.downloadManager && item.type === 'file') {
                window.App.downloadManager.addDownloadButtonToFile(fileElement, item);
            }
        });
        
        // Apply view mode
        this.applyViewMode();
        
        // Update selection UI
        this.updateSelectionUI();
    }
    
    createFileElement(item, index) {
        const isFolder = item.type === 'folder';
        const icon = isFolder ? Config.getFileIcon('folder') : Config.getFileIcon(item.mimeType, item.name);
        const fileCount = isFolder && item.children ? item.children.length : null;
        
        const element = Utils.dom.create('div', {
            className: `file-item ${this.viewMode === 'list' ? 'list-view' : ''}`,
            'data-id': item.id,
            'data-type': item.type,
            'data-name': item.name
        });
        
        // Add checkbox for files (not folders) for bulk selection
        const checkboxHtml = !isFolder ? `
            <div class="file-checkbox">
                <input type="checkbox" id="file-${item.id}" onchange="window.App.fileManager.handleFileSelection('${item.id}', this.checked)">
            </div>
        ` : '';
        
        element.innerHTML = `
            ${checkboxHtml}
            <div class="file-content ${this.viewMode === 'list' ? 'list-view' : ''}">
                <div class="file-icon ${this.viewMode === 'list' ? 'list-view' : ''}">${icon}</div>
                <div class="file-info">
                    <div class="file-name" title="${Utils.sanitizeHTML(item.name)}">${Utils.sanitizeHTML(item.name)}</div>
                    <div class="file-details ${this.viewMode === 'list' ? 'list-view' : ''}">
                        ${isFolder ? 
                            (fileCount !== null ? `<span class="file-count">${fileCount} items</span>` : '') :
                            `
                                ${item.size ? `<span>${Config.formatFileSize(item.size)}</span>` : ''}
                                ${item.modifiedTime ? `<span>${Config.formatDate(item.modifiedTime)}</span>` : ''}
                            `
                        }
                    </div>
                </div>
            </div>
        `;
        
        // Add click handlers
        element.addEventListener('click', (e) => {
            // Don't navigate if clicking on checkbox or download button
            if (e.target.type === 'checkbox' || e.target.closest('.file-download-btn')) {
                return;
            }
            
            if (isFolder) {
                this.navigateToFolder(item);
            } else {
                this.openFilePreview(item);
            }
        });
        
        return element;
    }
    
    navigateToFolder(folder) {
        const newPath = this.currentPath === '/' ? 
            `/${folder.name}` : 
            `${this.currentPath}/${folder.name}`;
        
        this.navigateToPath(newPath);
    }
    
    openFilePreview(file) {
        if (window.App?.previewManager) {
            window.App.previewManager.showPreview(file, this.getCurrentFiles());
        }
    }
    
    handleFileSelection(fileId, selected) {
        if (selected) {
            this.selectedFiles.add(fileId);
        } else {
            this.selectedFiles.delete(fileId);
        }
        
        this.updateFileElementSelection(fileId, selected);
        this.updateSelectionUI();
        
        Config.log('debug', `File ${fileId} ${selected ? 'selected' : 'deselected'}. Total selected: ${this.selectedFiles.size}`);
    }
    
    updateFileElementSelection(fileId, selected) {
        const fileElement = Utils.dom.select(`[data-id="${fileId}"]`);
        const checkbox = fileElement?.querySelector('input[type="checkbox"]');
        
        if (fileElement) {
            if (selected) {
                Utils.dom.addClass(fileElement, 'selected');
            } else {
                Utils.dom.removeClass(fileElement, 'selected');
            }
        }
        
        if (checkbox) {
            checkbox.checked = selected;
        }
    }
    
    selectAllFiles() {
        const files = this.getCurrentFiles().filter(item => item.type === 'file');
        
        files.forEach(file => {
            this.selectedFiles.add(file.id);
            this.updateFileElementSelection(file.id, true);
        });
        
        this.updateSelectionUI();
        
        const count = files.length;
        if (count > 0) {
            Utils.showSuccess(`Selected ${count} file${count > 1 ? 's' : ''}`);
        } else {
            Utils.showInfo('No files to select in this folder');
        }
    }

    deselectAllFiles() {
        this.selectedFiles.forEach(fileId => {
            this.updateFileElementSelection(fileId, false);
        });
        
        this.selectedFiles.clear();
        this.updateSelectionUI();
        
        Utils.showInfo('All files deselected');
    }
    
    updateSelectionUI() {
        const selectedCount = this.selectedFiles.size;
        
        if (selectedCount > 0) {
            Utils.dom.show(this.selectedCount);
            Utils.dom.show(this.downloadSelected);
            Utils.dom.show(this.deselectAllButton);
            
            if (this.selectedNumber) {
                this.selectedNumber.textContent = selectedCount;
            }
            
            // Update download button text
            if (this.downloadSelected) {
                if (selectedCount === 1) {
                    this.downloadSelected.textContent = '📥 Download File';
                } else {
                    this.downloadSelected.textContent = `📦 Download ${selectedCount} Files (ZIP)`;
                }
            }
        } else {
            Utils.dom.hide(this.selectedCount);
            Utils.dom.hide(this.downloadSelected);
            Utils.dom.hide(this.deselectAllButton);
        }
    }

    downloadSelectedFiles() {
        const selectedFiles = this.getSelectedFiles();
        
        if (selectedFiles.length === 0) {
            Utils.showWarning('No files selected for download');
            return;
        }
        
        if (window.App?.downloadManager) {
            window.App.downloadManager.downloadFiles(selectedFiles);
        } else {
            Utils.showError('Download manager not available');
        }
    }
    
    downloadFile(file) {
        if (window.App?.downloadManager) {
            window.App.downloadManager.downloadFiles([file]);
        }
    }
    
    getSelectedFiles() {
        const currentFiles = this.getCurrentFiles();
        return currentFiles.filter(file => 
            file.type === 'file' && this.selectedFiles.has(file.id)
        );
    }
    
    getCurrentFiles() {
        return this.currentFolder?.children || [];
    }
    
    clearSelection() {
        this.selectedFiles.clear();
        this.updateSelectionUI();
        
        // Clear checkboxes
        const checkboxes = Utils.dom.selectAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Remove selected class from file elements
        const selectedElements = Utils.dom.selectAll('.file-item.selected');
        selectedElements.forEach(element => {
            Utils.dom.removeClass(element, 'selected');
        });
    }
    
    // Navigation history management
    addToHistory(path) {
        // Remove any forward history if we're navigating from the middle
        if (this.historyIndex < this.navigationHistory.length - 1) {
            this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
        }
        
        // Add new path if it's different from the current one
        if (this.navigationHistory[this.historyIndex] !== path) {
            this.navigationHistory.push(path);
            this.historyIndex = this.navigationHistory.length - 1;
        }
        
        // Limit history size
        if (this.navigationHistory.length > 50) {
            this.navigationHistory.shift();
            this.historyIndex--;
        }
    }
    
    navigateBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const path = this.navigationHistory[this.historyIndex];
            this.navigateToPath(path);
        }
    }
    
    navigateForward() {
        if (this.historyIndex < this.navigationHistory.length - 1) {
            this.historyIndex++;
            const path = this.navigationHistory[this.historyIndex];
            this.navigateToPath(path);
        }
    }
    
    updateNavigationButtons() {
        if (this.backButton) {
            this.backButton.disabled = this.historyIndex <= 0;
        }
        
        if (this.forwardButton) {
            this.forwardButton.disabled = this.historyIndex >= this.navigationHistory.length - 1;
        }
    }
    
    // Breadcrumb management
    updateBreadcrumb() {
        if (!this.breadcrumb) return;
        
        this.breadcrumb.innerHTML = '';
        
        const pathParts = this.currentPath.split('/').filter(part => part);
        
        // Add home/root
        const homeElement = Utils.dom.create('span', {
            className: 'breadcrumb-item',
            'data-path': '/',
            innerHTML: '<span class="breadcrumb-icon">🏠</span>Home'
        });
        
        if (this.currentPath === '/') {
            Utils.dom.addClass(homeElement, 'active');
        }
        
        this.breadcrumb.appendChild(homeElement);
        
        // Add path parts
        let currentPath = '';
        pathParts.forEach((part, index) => {
            currentPath += '/' + part;
            
            // Add separator
            const separator = Utils.dom.create('span', {
                className: 'breadcrumb-separator',
                textContent: '/'
            });
            this.breadcrumb.appendChild(separator);
            
            // Add breadcrumb item
            const itemElement = Utils.dom.create('span', {
                className: 'breadcrumb-item',
                'data-path': currentPath,
                textContent: part
            });
            
            if (index === pathParts.length - 1) {
                Utils.dom.addClass(itemElement, 'active');
            }
            
            this.breadcrumb.appendChild(itemElement);
        });
    }
    
    // View mode management
    setViewMode(mode) {
        if (this.viewMode === mode) return;
        
        this.viewMode = mode;
        
        // Update buttons
        if (mode === 'grid') {
            Utils.dom.addClass(this.gridViewButton, 'active');
            Utils.dom.removeClass(this.listViewButton, 'active');
        } else {
            Utils.dom.addClass(this.listViewButton, 'active');
            Utils.dom.removeClass(this.gridViewButton, 'active');
        }
        
        // Save preference
        Utils.storage.set(Config.STORAGE_KEYS.VIEW_MODE, mode);
        
        // Re-render with new view mode
        this.renderFiles();
        
        Config.log('debug', `View mode changed to: ${mode}`);
    }
    
    applyViewMode() {
        if (this.viewMode === 'list') {
            Utils.dom.addClass(this.fileGrid, 'list-view');
        } else {
            Utils.dom.removeClass(this.fileGrid, 'list-view');
        }
    }
    
    showEmptyState() {
        Utils.dom.show(this.emptyState);
        Utils.dom.hide(this.folderActions);
        this.fileGrid.innerHTML = '';
    }
    
    // Keyboard shortcuts
    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return; // Don't handle shortcuts in form fields
        }
        
        switch (e.key) {
            case Config.KEYBOARD_SHORTCUTS.ESCAPE:
                this.deselectAllFiles();
                break;
                
            case Config.KEYBOARD_SHORTCUTS.ARROW_LEFT:
                if (e.altKey || e.metaKey) {
                    e.preventDefault();
                    this.navigateBack();
                }
                break;
                
            case Config.KEYBOARD_SHORTCUTS.ARROW_RIGHT:
                if (e.altKey || e.metaKey) {
                    e.preventDefault();
                    this.navigateForward();
                }
                break;
        }
        
        if (e.ctrlKey || e.metaKey) {
            switch (e.code) {
                case Config.KEYBOARD_SHORTCUTS.CTRL_A:
                    e.preventDefault();
                    this.selectAllFiles();
                    break;
                    
                case Config.KEYBOARD_SHORTCUTS.CTRL_D:
                    e.preventDefault();
                    this.downloadSelectedFiles();
                    break;
            }
        }
    }
    
    // User preferences
    loadUserPreferences() {
        const savedViewMode = Utils.storage.get(Config.STORAGE_KEYS.VIEW_MODE);
        if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'list')) {
            this.setViewMode(savedViewMode);
        }
    }
    
    // Public API
    getCurrentPath() {
        return this.currentPath;
    }
    
    getCurrentFolder() {
        return this.currentFolder;
    }
    
    getSelectedCount() {
        return this.selectedFiles.size;
    }
    
    refresh() {
        this.navigateToPath(this.currentPath);
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileManager;
}
