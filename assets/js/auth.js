// assets/js/auth.js - Authentication management with persistent login

class AuthManager {
    constructor() {
        this.authData = [];
        this.currentUser = null;
        this.isAuthenticated = false;
        this.loadingScreen = Utils.dom.select('#loadingScreen');
        this.authScreen = Utils.dom.select('#authScreen');
        this.portalScreen = Utils.dom.select('#portalScreen');
        
        // Form elements
        this.usernameInput = Utils.dom.select('#usernameInput');
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
            
            // Check for existing session (7-day persistence)
            const savedAuth = Utils.storage.get(Config.STORAGE_KEYS.AUTH_TOKEN);
            if (savedAuth && this.validateSavedAuth(savedAuth)) {
                this.currentUser = savedAuth;
                this.isAuthenticated = true;
                
                // Extend session on each visit
                this.extendSession();
                
                this.showPortal();
            } else {
                // Clear invalid session
                Utils.storage.remove(Config.STORAGE_KEYS.AUTH_TOKEN);
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
            // Load from local CSV file (downloaded during build)
            const csvData = await Utils.fetchCSV(Config.AUTH_DATA_PATH);
            this.authData = csvData;
            
            Config.log('debug', `Loaded ${this.authData.length} authentication records`);
            
        } catch (error) {
            Config.log('error', 'Failed to load auth data:', error);
            throw new Error('Failed to load authentication configuration');
        }
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
        if (this.usernameInput) {
            this.usernameInput.addEventListener('input', () => {
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
        if (this.usernameInput) {
            this.usernameInput.addEventListener('focus', () => {
                this.usernameInput.parentElement.classList.add('focused');
            });
            
            this.usernameInput.addEventListener('blur', () => {
                this.usernameInput.parentElement.classList.remove('focused');
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
        
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();
        
        if (!username || !password) {
            this.showError('Please fill in all fields');
            return;
        }
        
        try {
            this.setLoginLoading(true);
            
            // Simulate network delay for better UX
            await Utils.delay(500);
            
            const user = await this.authenticateUser(username, password);
            
            if (user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                
                // Save session for 7 days (persistent login)
                const sessionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
                Utils.storage.set(Config.STORAGE_KEYS.AUTH_TOKEN, user, sessionDuration);
                
                // Show success feedback
                Utils.dom.addClass(Utils.dom.select('.auth-container'), 'success');
                Utils.showSuccess('✅ Login successful! You\'ll stay logged in for 7 days.');
                
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
    
    async authenticateUser(username, password) {
        return new Promise((resolve) => {
            // Find user in auth data
            const user = this.authData.find(u => 
                u.manager.toLowerCase() === username.toLowerCase() && u.password === password
            );
            
            if (user) {
                resolve({
                    manager: user.manager,
                    role: user.role,
                    loginTime: new Date().toISOString(),
                    sessionVersion: this.getSessionVersion() // For session invalidation when passwords change
                });
            } else {
                resolve(null);
            }
        });
    }
    
    validateSavedAuth(savedAuth) {
        // Check if saved auth is still valid
        if (!savedAuth.manager || !savedAuth.role || !savedAuth.loginTime) {
            return false;
        }
        
        // Check if user still exists in auth data with same credentials
        const userExists = this.authData.some(u => 
            u.manager.toLowerCase() === savedAuth.manager.toLowerCase() && 
            u.role === savedAuth.role
        );
        
        if (!userExists) {
            Config.log('debug', 'User no longer exists in auth data');
            return false;
        }
        
        // Check session age (max 7 days)
        const sessionAge = Date.now() - new Date(savedAuth.loginTime).getTime();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (sessionAge > maxAge) {
            Config.log('debug', 'Session expired due to age');
            return false;
        }
        
        // Check session version (invalidate if passwords changed)
        const currentVersion = this.getSessionVersion();
        if (savedAuth.sessionVersion && savedAuth.sessionVersion !== currentVersion) {
            Config.log('debug', 'Session invalidated due to credential changes');
            return false;
        }
        
        return true;
    }
    
    getSessionVersion() {
        // Create a simple hash of all user credentials to detect changes
        // When CSV data changes (passwords updated), sessions will be invalidated
        const credentialString = this.authData
            .map(u => `${u.manager}:${u.password}:${u.role}`)
            .sort()
            .join('|');
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < credentialString.length; i++) {
            const char = credentialString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return hash.toString(36);
    }
    
    extendSession() {
        if (this.isAuthenticated && this.currentUser) {
            // Update last access time and extend session
            this.currentUser.lastAccess = new Date().toISOString();
            const sessionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
            Utils.storage.set(Config.STORAGE_KEYS.AUTH_TOKEN, this.currentUser, sessionDuration);
            
            Config.log('debug', 'Session extended for 7 more days');
        }
    }
    
    validateForm() {
        const username = this.usernameInput?.value?.trim();
        const password = this.passwordInput?.value?.trim();
        const isValid = username && password && password.length >= 1;
        
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
            Utils.showSuccess('Successfully logged out. See you next time!');
            
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
            if (this.usernameInput && !this.usernameInput.value) {
                this.usernameInput.focus();
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
            const loginDuration = this.getLoginDuration();
            this.userInfo.textContent = `Welcome back, ${this.currentUser.manager}`;
            if (this.currentUser.role === 'admin') {
                this.userInfo.textContent += ' (Admin)';
            }
            if (loginDuration) {
                this.userInfo.title = `Logged in ${loginDuration} ago. Session expires in ${this.getSessionTimeRemaining()}.`;
            }
        }
        
        // Initialize file manager if authenticated
        if (window.App?.fileManager) {
            window.App.fileManager.init();
        }
    }
    
    getLoginDuration() {
        if (!this.currentUser?.loginTime) return '';
        
        const loginTime = new Date(this.currentUser.loginTime);
        const now = new Date();
        const diffTime = Math.abs(now - loginTime);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        } else {
            return 'today';
        }
    }
    
    getSessionTimeRemaining() {
        if (!this.currentUser?.loginTime) return '';
        
        const loginTime = new Date(this.currentUser.loginTime);
        const expiryTime = new Date(loginTime.getTime() + (7 * 24 * 60 * 60 * 1000));
        const now = new Date();
        const timeRemaining = expiryTime - now;
        
        if (timeRemaining <= 0) return 'expired';
        
        const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (daysRemaining > 0) {
            return `${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
        } else {
            return `${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}`;
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
        this.extendSession();
    }
    
    getSessionInfo() {
        return {
            isAuthenticated: this.isAuthenticated,
            user: this.currentUser,
            loginTime: this.currentUser?.loginTime,
            sessionDuration: this.currentUser?.loginTime ? 
                Date.now() - new Date(this.currentUser.loginTime).getTime() : 0,
            timeRemaining: this.getSessionTimeRemaining()
        };
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
