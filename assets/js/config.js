// assets/js/config.js - Global configuration and constants

window.Config = {
    // Data file paths
    AUTH_DATA_PATH: 'data/auth.csv',
    DRIVE_DATA_PATH: 'data/drive.json',
    
    // External data URLs (set these to use external Excel/CSV files)
    AUTH_DATA_URL: null, // Set to Excel download URL, e.g., 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0'
    
    // Google Drive URLs
    DRIVE_DOWNLOAD_BASE: 'https://drive.google.com/uc?export=download&id=',
    DRIVE_PREVIEW_BASE: 'https://drive.google.com/uc?id=',
    DRIVE_EMBED_BASE: 'https://drive.google.com/file/d/',
    
    // File type icons mapping
    FILE_ICONS: {
        // Folders
        'folder': '📁',
        
        // Images
        'image/jpeg': '🖼️',
        'image/jpg': '🖼️',
        'image/png': '🖼️',
        'image/gif': '🎞️',
        'image/bmp': '🖼️',
        'image/webp': '🖼️',
        'image/svg+xml': '🖼️',
        
        // Videos
        'video/mp4': '🎬',
        'video/avi': '🎬',
        'video/mov': '🎬',
        'video/wmv': '🎬',
        'video/flv': '🎬',
        'video/webm': '🎬',
        'video/mkv': '🎬',
        
        // Audio
        'audio/mp3': '🎵',
        'audio/wav': '🎵',
        'audio/ogg': '🎵',
        'audio/m4a': '🎵',
        'audio/flac': '🎵',
        
        // Documents
        'application/pdf': '📄',
        'application/msword': '📝',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
        'application/vnd.ms-excel': '📊',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
        'application/vnd.ms-powerpoint': '📊',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
        
        // Text files
        'text/plain': '📃',
        'text/html': '🌐',
        'text/css': '🎨',
        'text/javascript': '⚡',
        'application/json': '⚙️',
        'text/xml': '🔧',
        
        // Archives
        'application/zip': '📦',
        'application/x-rar-compressed': '📦',
        'application/x-7z-compressed': '📦',
        
        // Default
        'default': '📄'
    },
    
    // File extension to MIME type mapping (fallback)
    EXTENSION_MIME_MAP: {
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        
        // Videos
        'mp4': 'video/mp4',
        'avi': 'video/avi',
        'mov': 'video/mov',
        'wmv': 'video/wmv',
        'flv': 'video/flv',
        'webm': 'video/webm',
        'mkv': 'video/mkv',
        
        // Audio
        'mp3': 'audio/mp3',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/m4a',
        'flac': 'audio/flac',
        
        // Documents
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        
        // Text
        'txt': 'text/plain',
        'html': 'text/html',
        'htm': 'text/html',
        'css': 'text/css',
        'js': 'text/javascript',
        'json': 'application/json',
        'xml': 'text/xml',
        
        // Archives
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed'
    },
    
    // File types that can be previewed
    PREVIEWABLE_TYPES: [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
        'application/pdf',
        'text/plain',
        'text/html',
        'video/mp4',
        'video/webm',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ],
    
    // Maximum file size for preview (in bytes)
    MAX_PREVIEW_SIZE: 50 * 1024 * 1024, // 50MB
    
    // Download settings
    DOWNLOAD_SETTINGS: {
        MAX_CONCURRENT: 3,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 2000, // 2 seconds
        DOWNLOAD_DELAY: 1000 // 1 second between downloads
    },
    
    // UI settings
    UI_SETTINGS: {
        ANIMATION_DURATION: 300,
        TOAST_DURATION: 5000,
        BREADCRUMB_MAX_ITEMS: 5,
        FILES_PER_PAGE: 100,
        SEARCH_DEBOUNCE: 300
    },
    
    // Cache settings
    CACHE_SETTINGS: {
        AUTH_DATA_TTL: 5 * 60 * 1000, // 5 minutes
        DRIVE_DATA_TTL: 10 * 60 * 1000, // 10 minutes
        FILE_INFO_TTL: 30 * 60 * 1000 // 30 minutes
    },
    
    // Error messages
    ERROR_MESSAGES: {
        AUTH_FAILED: 'Invalid credentials. Please check your username and password.',
        AUTH_REQUIRED: 'Please log in to access the portal.',
        NETWORK_ERROR: 'Network error. Please check your connection and try again.',
        FILE_NOT_FOUND: 'File not found or access denied.',
        DOWNLOAD_FAILED: 'Download failed. Please try again.',
        PREVIEW_FAILED: 'Preview not available for this file type.',
        DATA_LOAD_FAILED: 'Failed to load data. Please refresh the page.',
        INVALID_FILE_TYPE: 'File type not supported.',
        FILE_TOO_LARGE: 'File is too large for preview.',
        GENERIC_ERROR: 'An unexpected error occurred. Please try again.'
    },
    
    // Success messages
    SUCCESS_MESSAGES: {
        LOGIN_SUCCESS: 'Successfully logged in to Team Portal.',
        LOGOUT_SUCCESS: 'Successfully logged out.',
        DOWNLOAD_START: 'Download started.',
        DOWNLOAD_COMPLETE: 'All downloads completed successfully.',
        FILE_SELECTED: 'File selected for download.',
        FILES_SELECTED: 'files selected for download.'
    },
    
    // Keyboard shortcuts
    KEYBOARD_SHORTCUTS: {
        ESCAPE: 'Escape',
        ENTER: 'Enter',
        SPACE: ' ',
        ARROW_LEFT: 'ArrowLeft',
        ARROW_RIGHT: 'ArrowRight',
        ARROW_UP: 'ArrowUp',
        ARROW_DOWN: 'ArrowDown',
        CTRL_A: 'KeyA',
        CTRL_D: 'KeyD'
    },
    
    // Local storage keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'teamPortal_authToken',
        USER_PREFERENCES: 'teamPortal_userPrefs',
        LAST_PATH: 'teamPortal_lastPath',
        VIEW_MODE: 'teamPortal_viewMode'
    },
    
    // Development settings
    DEBUG: false, // Set to true for development
    LOG_LEVEL: 'warn', // 'debug', 'info', 'warn', 'error'
    
    // Helper functions
    getFileIcon(mimeType, fileName) {
        if (!mimeType && fileName) {
            const extension = fileName.split('.').pop()?.toLowerCase();
            mimeType = this.EXTENSION_MIME_MAP[extension] || 'application/octet-stream';
        }
        
        return this.FILE_ICONS[mimeType] || this.FILE_ICONS.default;
    },
    
    isPreviewable(mimeType, fileSize = 0) {
        if (fileSize > this.MAX_PREVIEW_SIZE) return false;
        return this.PREVIEWABLE_TYPES.includes(mimeType);
    },
    
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    },
    
    getDriveDownloadURL(fileId) {
        return this.DRIVE_DOWNLOAD_BASE + fileId;
    },
    
    getDrivePreviewURL(fileId) {
        return this.DRIVE_PREVIEW_BASE + fileId;
    },
    
    getD
