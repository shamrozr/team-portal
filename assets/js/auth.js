// assets/js/auth.js - Authentication management

class AuthManager {
    constructor() {
        this.authData = [];
        this.currentUser = null;
        this.isAuthenticated = false;
        this.loadingScreen = Utils.dom.select('#loadingScreen');
        this.authScreen = Utils.dom.select('#authScreen');
        this.portalScreen = Utils.dom.select('#portalScreen');
        
        // Form elements
        this.managerSelect = Utils.dom.select('#managerSelect');
        this.passwordInput = Utils.dom.select('#passwordInput');
        this.loginButton = Utils.dom.select('#loginButton');
        this.authForm = Utils.dom.select('#authForm');
        this.authError = Utils.dom.select('#authError');
        this.logoutButton = Utils.dom.select('#logoutButton');
        this.userInfo = Utils.dom.select('#userInfo');
        
        this.bindEvents();
    }
    
    async init() {
        try {
            Config.log('info', 'Initializing authentication system...');
            
            // Update loading status
            this.updateLoadingStatus('Loading authentication data...');
            
            // Load authentication data
            await this.loadAuthData();
            
            // Check for existing session
            const savedAuth = Utils.storage.get(Config.STORAGE_KEYS.AUTH_TOKEN);
            if (savedAuth && this.validateSavedAuth(savedAuth)) {
                this.currentUser = savedAuth;
                this.isAuthenticated = true;
                this.showPortal();
            } else {
                this.showAuthScreen();
            }
            
        } catch (error) {
            Config.log('error', 'Failed to initialize authentication:', error);
            this.updateLoadingStatus('Failed to load authentication data');
            Utils.showError('Failed to load authentication system. Please refresh the page.');
        }
    }
    
    async loadAuthData() {
        try {
            const csvData = await Utils.fetchCSV(Config.AUTH_DATA_PATH);
            this.authData = csvData;
            
            Config.log('debug', `Loaded ${this.authData.length} authentication records`);
            
            // Populate manager dropdown
            this.populateManagerDropdown();
            
        } catch (error) {
            Config.log('error', 'Failed to load auth data:', error);
            throw new Error('Failed to load authentication configuration');
        }
    }
    
    populateManagerDropdown() {
        // Clear existing options except the default
        const defaultOption = this.managerSelect.querySelector('option[value=""]');
        this.managerSelect.innerHTML = '';
        this.managerSelect.appendChild(defaultOption);
        
        // Add manager options
        this.authData.forEach(user => {
            if (user.role === 'manager' || user.role === 'admin') {
                const option = Utils.dom.create('option', {
                    value: user.manager,
                    textContent: user.manager
                });
                this.managerSelect.appendChild(option);
            }
        });
        
        Config.log('debug', `Added ${this.managerSelect.options.length - 1} managers to dropdown`);
    }
    
    bindEvents() {
        // Form submission
        if (this.authForm) {
            this.authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Input validation
        if (this.managerSelect) {
            this.managerSelect.addEventListener('change', () => {
                this.clearError();
                this.validateForm();
            });
        }
        
        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', () => {
                this.clearError();
                this.validateForm();
            });
            
            this.passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }
        
        // Logout
        if (this.logoutButton) {
            this.logoutButton.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // Focus management
        if (this.managerSelect) {
            this.managerSelect.addEventListener('focus', () => {
                this.managerSelect.parentElement.classList.add('focused');
            });
            
            this.managerSelect.addEventListener('blur', () => {
                this.managerSelect.parentElement.classList.remove('focused');
            });
        }
        
        if (this.passwordInput) {
            this.passwordInput.addEventListener('focus', () => {
                this.passwordInput.parentElement.classList.add('focused');
            });
            
            this.passwordInput.addEventListener('blur', () => {
                this.passwordInput.parentElement.classList.remove('focused');
            });
        }
    }
    
    async handleLogin() {
        if (!this.validateForm()) {
            return;
        }
        
        const manager = this.managerSelect.value.trim();
        const password = this.passwordInput.value.trim();
        
        if (!manager || !password) {
            this.showError('Please fill in all fields');
            return;
        }
        
        try {
            this.setLoginLoading(true);
            
            // Simulate network delay for better UX
            await Utils.delay(500);
            
            const user = await this.authenticateUser(manager, password);
            
            if (user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                
                // Save session
                Utils.storage.set(Config.STORAGE_KEYS.AUTH_TOKEN, user, Config.CACHE_SETTINGS.AUTH_DATA_TTL);
                
                // Show success feedback
                Utils.dom.addClass(Utils.dom.select('.auth-container'), 'success');
                Utils.showSuccess(Config.SUCCESS_MESSAGES.LOGIN_SUCCESS);
                
                // Navigate to portal after brief delay
                setTimeout(() => {
                    this.showPortal();
                }, 600);
                
            } else {
                this.showError(Config.ERROR_MESSAGES.AUTH_FAILED);
            }
            
        } catch (error) {
            Config.log('error', 'Login failed:', error);
            this.showError('Login failed. Please try again.');
        } finally {
            this.setLoginLoading(false);
        }
    }
    
    async authenticateUser(manager, password) {
        return new Promise((resolve) => {
            // Find user in auth data
            const user = this.authData.find(u => 
                u.manager.toLowerCase() === manager.toLowerCase() && u.password === password
            );
            
            if (user) {
                resolve({
                    manager: user.manager,
                    role: user.role,
                    loginTime: new Date().toISOString()
                });
            } else {
                resolve(null);
            }
        });
    }
    
    validateSavedAuth(savedAuth) {
        // Check if saved auth is still valid
        if (!savedAuth.manager || !savedAuth.role) {
            return false;
        }
        
        // Check if user still exists in auth data
        const userExists = this.authData.some(u => 
            u.manager.toLowerCase() === savedAuth.manager.toLowerCase() && 
            u.role === savedAuth.role
        );
        
        return userExists;
    }
    
    validateForm() {
        const manager = this.managerSelect?.value?.trim();
        const password = this.passwordInput?.value?.trim();
        const isValid = manager && password && password.length >= 1;
        
        if (this.loginButton) {
            this.loginButton.disabled = !isValid;
        }
        
        return isValid;
    }
    
    handleLogout() {
        try {
            // Clear session data
            Utils.storage.remove(Config.STORAGE_KEYS.AUTH_TOKEN);
            Utils.storage.remove(Config.STORAGE_KEYS.LAST_PATH);
            
            // Reset state
            this.currentUser = null;
            this.isAuthenticated = false;
            
            // Reset form
            if (this.authForm) {
                this.authForm.reset();
            }
            this.clearError();
            
            // Show success message
            Utils.showSuccess(Config.SUCCESS_MESSAGES.LOGOUT_SUCCESS);
            
            // Navigate to auth screen
            this.showAuthScreen();
            
            Config.log('info', 'User logged out successfully');
            
        } catch (error) {
            Config.log('error', 'Logout failed:', error);
            Utils.showError('Logout failed. Please refresh the page.');
        }
    }
    
    showAuthScreen() {
        Utils.dom.hide(this.loadingScreen);
        Utils.dom.hide(this.portalScreen);
        Utils.dom.show(this.authScreen);
        
        // Focus the first empty field
        setTimeout(() => {
            if (this.managerSelect && !this.managerSelect.value) {
                this.managerSelect.focus();
            } else if (this.passwordInput && !this.passwordInput.value) {
                this.passwordInput.focus();
            }
        }, 300);
    }
    
    showPortal() {
        Utils.dom.hide(this.loadingScreen);
        Utils.dom.hide(this.authScreen);
        Utils.dom.show(this.portalScreen);
        
        // Update user info display
        if (this.userInfo && this.currentUser) {
            this.userInfo.textContent = `Welcome, ${this.currentUser.manager}`;
            if (this.currentUser.role === 'admin') {
                this.userInfo.textContent += ' (Admin)';
            }
        }
        
        // Initialize file manager if authenticated
        if (window.App?.fileManager) {
            window.App.fileManager.init();
        }
    }
    
    updateLoadingStatus(status) {
        const statusElement = Utils.dom.select('#loadingStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }
    
    setLoginLoading(isLoading) {
        if (this.loginButton) {
            if (isLoading) {
                Utils.dom.addClass(this.loginButton, 'loading');
                Utils.dom.show(this.loginButton.querySelector('.button-spinner'));
                this.loginButton.disabled = true;
            } else {
                Utils.dom.removeClass(this.loginButton, 'loading');
                Utils.dom.hide(this.loginButton.querySelector('.button-spinner'));
                this.validateForm(); // Re-enable if form is valid
            }
        }
        
        if (this.authForm) {
            if (isLoading) {
                Utils.dom.addClass(this.authForm, 'loading');
            } else {
                Utils.dom.removeClass(this.authForm, 'loading');
            }
        }
    }
    
    showError(message) {
        if (this.authError) {
            this.authError.textContent = message;
            Utils.dom.show(this.authError);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.clearError();
            }, 5000);
        }
    }
    
    clearError() {
        if (this.authError) {
            Utils.dom.hide(this.authError);
            this.authError.textContent = '';
        }
        
        // Remove error states from form groups
        const formGroups = Utils.dom.selectAll('.form-group');
        formGroups.forEach(group => {
            Utils.dom.removeClass(group, 'error', 'success');
        });
    }
    
    // Public methods for other modules
    getCurrentUser() {
        return this.currentUser;
    }
    
    isUserAuthenticated() {
        return this.isAuthenticated && this.currentUser !== null;
    }
    
    hasAdminAccess() {
        return this.isAuthenticated && this.currentUser?.role === 'admin';
    }
    
    requireAuth() {
        if (!this.isUserAuthenticated()) {
            Utils.showError(Config.ERROR_MESSAGES.AUTH_REQUIRED);
            this.showAuthScreen();
            return false;
        }
        return true;
    }
    
    // Session management
    refreshSession() {
        if (this.isAuthenticated && this.currentUser) {
            Utils.storage.set(Config.STORAGE_KEYS.AUTH_TOKEN, this.currentUser, Config.CACHE_SETTINGS.AUTH_DATA_TTL);
        }
    }
    
    getSessionInfo() {
        return {
            isAuthenticated: this.isAuthenticated,
            user: this.currentUser,
            loginTime: this.currentUser?.loginTime,
            sessionDuration: this.currentUser?.loginTime ? 
                Date.now() - new Date(this.currentUser.loginTime).getTime() : 0
        };
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}