// assets/js/utils.js - Utility functions and helpers

window.Utils = {
    // DOM utilities
    dom: {
        select: (selector) => document.querySelector(selector),
        selectAll: (selector) => document.querySelectorAll(selector),
        
        create: (tagName, attributes = {}) => {
            const element = document.createElement(tagName);
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'textContent' || key === 'innerHTML') {
                    element[key] = value;
                } else if (key === 'className') {
                    element.className = value;
                } else {
                    element.setAttribute(key, value);
                }
            });
            return element;
        },
        
        show: (element) => {
            if (element) {
                element.classList.remove('hidden');
                element.style.display = '';
            }
        },
        
        hide: (element) => {
            if (element) {
                element.classList.add('hidden');
            }
        },
        
        addClass: (element, ...classes) => {
            if (element) {
                element.classList.add(...classes);
            }
        },
        
        removeClass: (element, ...classes) => {
            if (element) {
                element.classList.remove(...classes);
            }
        },
        
        toggleClass: (element, className) => {
            if (element) {
                element.classList.toggle(className);
            }
        },
        
        hasClass: (element, className) => {
            return element ? element.classList.contains(className) : false;
        }
    },
    
    // Storage utilities (localStorage wrapper)
    storage: {
        set: (key, value, ttl = null) => {
            try {
                const item = {
                    value: value,
                    timestamp: Date.now(),
                    ttl: ttl
                };
                localStorage.setItem(key, JSON.stringify(item));
                return true;
            } catch (error) {
                Config.log('error', 'Storage set failed:', error);
                return false;
            }
        },
        
        get: (key) => {
            try {
                const item = localStorage.getItem(key);
                if (!item) return null;
                
                const parsed = JSON.parse(item);
                
                // Check if item has expired
                if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
                    localStorage.removeItem(key);
                    return null;
                }
                
                return parsed.value;
            } catch (error) {
                Config.log('error', 'Storage get failed:', error);
                return null;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                Config.log('error', 'Storage remove failed:', error);
                return false;
            }
        },
        
        clear: () => {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                Config.log('error', 'Storage clear failed:', error);
                return false;
            }
        }
    },
    
    // Network utilities
    async fetchJSON(url) {
        try {
            Config.log('debug', `Fetching JSON from: ${url}`);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            Config.log('debug', `Successfully loaded JSON from: ${url}`);
            return data;
        } catch (error) {
            Config.log('error', `Failed to fetch JSON from ${url}:`, error);
            throw new Error(`Failed to load data from ${url}`);
        }
    },
    
    async fetchCSV(url) {
        try {
            Config.log('debug', `Fetching CSV from: ${url}`);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            const data = this.parseCSV(csvText);
            Config.log('debug', `Successfully loaded CSV from: ${url} (${data.length} rows)`);
            return data;
        } catch (error) {
            Config.log('error', `Failed to fetch CSV from ${url}:`, error);
            throw new Error(`Failed to load CSV data from ${url}`);
        }
    },
    
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length === 0) return [];
        
        const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
        const rows = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => value.trim());
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                rows.push(row);
            }
        }
        
        return rows;
    },
    
    // Utility functions
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    getMimeType(filename) {
        if (!filename) return 'application/octet-stream';
        
        const extension = filename.split('.').pop()?.toLowerCase();
        return Config.EXTENSION_MIME_MAP[extension] || 'application/octet-stream';
    },
    
    getFileExtension(filename) {
        if (!filename) return '';
        return filename.split('.').pop()?.toLowerCase() || '';
    },
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Toast notification system
    showToast(message, type = 'info', duration = Config.UI_SETTINGS.TOAST_DURATION) {
        const toast = this.dom.create('div', {
            className: `toast toast-${type}`,
            textContent: message
        });
        
        // Add toast styles if not already present
        this.ensureToastStyles();
        
        document.body.appendChild(toast);
        
        // Show toast with animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });
        
        // Auto remove toast
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
        
        return toast;
    },
    
    showSuccess(message, duration) {
        return this.showToast(message, 'success', duration);
    },
    
    showError(message, duration) {
        return this.showToast(message, 'error', duration);
    },
    
    showWarning(message, duration) {
        return this.showToast(message, 'warning', duration);
    },
    
    showInfo(message, duration) {
        return this.showToast(message, 'info', duration);
    },
    
    ensureToastStyles() {
        if (document.querySelector('#toast-styles')) return;
        
        const style = this.dom.create('style', {
            id: 'toast-styles',
            textContent: `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 24px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    font-size: 14px;
                    max-width: 400px;
                    z-index: 10000;
                    transform: translateX(100%);
                    transition: transform 0.3s ease-in-out;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                
                .toast-show {
                    transform: translateX(0);
                }
                
                .toast-success { background-color: #059669; }
                .toast-error { background-color: #dc2626; }
                .toast-warning { background-color: #d97706; }
                .toast-info { background-color: #2563eb; }
                
                @media (max-width: 480px) {
                    .toast {
                        left: 20px;
                        right: 20px;
                        max-width: none;
                        transform: translateY(-100%);
                    }
                    
                    .toast-show {
                        transform: translateY(0);
                    }
                }
            `
        });
        
        document.head.appendChild(style);
    },
    
    // Form validation utilities
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    validateRequired(value) {
        return value && value.toString().trim().length > 0;
    },
    
    validateMinLength(value, minLength) {
        return value && value.toString().length >= minLength;
    },
    
    // URL utilities
    getURLParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },
    
    setURLParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.replaceState({}, '', url);
    },
    
    removeURLParam(key) {
        const url = new URL(window.location);
        url.searchParams.delete(key);
        window.history.replaceState({}, '', url);
    },
    
    // Device detection
    isMobile() {
        return window.innerWidth <= 768;
    },
    
    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    },
    
    isDesktop() {
        return window.innerWidth > 1024;
    },
    
    // Performance utilities
    measurePerformance(name, fn) {
        const startTime = performance.now();
        const result = fn();
        const endTime = performance.now();
        Config.log('debug', `Performance [${name}]: ${(endTime - startTime).toFixed(2)}ms`);
        return result;
    },
    
    // Error handling
    handleError(error, context = 'Unknown') {
        Config.log('error', `Error in ${context}:`, error);
        
        let message = Config.ERROR_MESSAGES.GENERIC_ERROR;
        
        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
            message = Config.ERROR_MESSAGES.NETWORK_ERROR;
        } else if (error.message.includes('404')) {
            message = Config.ERROR_MESSAGES.FILE_NOT_FOUND;
        }
        
        this.showError(message);
    }
};

// Freeze the Utils object to prevent modifications
Object.freeze(window.Utils);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Utils;
}
