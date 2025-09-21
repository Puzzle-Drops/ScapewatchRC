// Import Firebase modules from CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFunctions, 
    httpsCallable 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
    serverTimestamp,
    startAfter,
    endBefore,
    getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Export Firestore and Functions helpers for use in other modules
window.firestoreHelpers = {
    query,
    collection,
    where,
    orderBy,
    limit,
    getDocs,
    getDoc,
    doc,
    startAfter,
    endBefore,
    getCountFromServer,
    httpsCallable  // Added for Firebase Functions
};

class FirebaseManager {
    constructor() {
        this.app = null;
        this.auth = null;
        this.db = null;
        this.functions = null;
        this.currentUser = null;
        this.username = null;
        this.isOfflineMode = false;
        this.saveTimer = null;
        this.lastSaveTime = 0;
        this.saveDebounceTimer = null;
        this.sessionId = null;
        this.sessionListener = null;
        this.SAVE_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
        
        // New properties for connection management
        this.connectionRetryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 5000; // Start with 5 seconds
        this.maxRetryDelay = 60000; // Max 60 seconds
        this.connectionHealthy = true;
        this.tokenRefreshTimer = null;
        this.lastTokenRefresh = 0;
        this.TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // Refresh token every 30 minutes
        
        // Task storage limit - only save most recent 10 tasks to Firebase
        this.MAX_FIREBASE_TASKS = 10; // Maximum tasks to store in Firebase
    }

    SENTINEL_DATE = new Date('2099-12-31T23:59:59Z');

    // Initialize Firebase with your config
    initialize() {
        // Your Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyDNTjUANEOUzcx13IhqZAT-grfMNPL8ia8",
            authDomain: "scapewatch-f2d9d.firebaseapp.com",
            projectId: "scapewatch-f2d9d",
            storageBucket: "scapewatch-f2d9d.firebasestorage.app",
            messagingSenderId: "631909394106",
            appId: "1:631909394106:web:86cf7b0a7d97675216c483",
            measurementId: "G-HJFKPL6N2B"
        };

        // Initialize Firebase
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.functions = getFunctions(this.app);

        // Restore session ID from localStorage if it exists
        this.sessionId = localStorage.getItem('scapewatch_session_id');

        // Set up auth state listener with error handling
        onAuthStateChanged(this.auth, async (user) => {
            try {
                if (user) {
                    this.currentUser = user;
                    await this.loadUsername();
                    console.log('User logged in:', this.username);
                    
                    // Reset connection state
                    this.connectionHealthy = true;
                    this.connectionRetryCount = 0;
                    
                    // Validate session if we have a stored sessionId
                    if (this.sessionId) {
                        await this.validateSession();
                    }
                    
                    // Start token refresh timer
                    this.startTokenRefreshTimer();
                } else {
                    this.currentUser = null;
                    this.username = null;
                    this.sessionId = null;
                    localStorage.removeItem('scapewatch_session_id');
                    
                    // Clean up timers and listeners
                    this.cleanup();
                }
            } catch (error) {
                console.error('Error in auth state change handler:', error);
                this.handleConnectionError(error);
            }
        }, (error) => {
            console.error('Auth state listener error:', error);
            this.handleConnectionError(error);
        });
    }

    // Start token refresh timer
    startTokenRefreshTimer() {
        // Clear existing timer
        if (this.tokenRefreshTimer) {
            clearInterval(this.tokenRefreshTimer);
        }
        
        // Set up periodic token refresh
        this.tokenRefreshTimer = setInterval(async () => {
            await this.refreshAuthToken();
        }, this.TOKEN_REFRESH_INTERVAL);
        
        // Also refresh immediately if it's been a while
        const timeSinceLastRefresh = Date.now() - this.lastTokenRefresh;
        if (timeSinceLastRefresh > this.TOKEN_REFRESH_INTERVAL) {
            this.refreshAuthToken();
        }
    }

    // Refresh authentication token
    async refreshAuthToken() {
        if (!this.currentUser || this.isOfflineMode) return;
        
        try {
            console.log('Refreshing authentication token...');
            // Force token refresh
            await this.currentUser.getIdToken(true);
            this.lastTokenRefresh = Date.now();
            this.connectionHealthy = true;
            this.connectionRetryCount = 0;
            console.log('Token refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh token:', error);
            this.handleConnectionError(error);
        }
    }

    // Handle connection errors
    handleConnectionError(error) {
        console.error('Connection error detected:', error);
        
        this.connectionHealthy = false;
        this.connectionRetryCount++;
        
        // Check if we've exceeded max retries
        if (this.connectionRetryCount >= this.maxRetries) {
            console.error('Max connection retries exceeded, entering offline mode');
            this.enterTemporaryOfflineMode();
            return;
        }
        
        // Calculate exponential backoff
        const delay = Math.min(
            this.retryDelay * Math.pow(2, this.connectionRetryCount - 1),
            this.maxRetryDelay
        );
        
        console.log(`Retrying connection in ${delay / 1000} seconds (attempt ${this.connectionRetryCount}/${this.maxRetries})`);
        
        // Schedule retry
        setTimeout(async () => {
            if (this.currentUser) {
                try {
                    await this.refreshAuthToken();
                    // If successful, restart session monitoring
                    if (this.connectionHealthy) {
                        this.restartSessionMonitoring();
                    }
                } catch (retryError) {
                    console.error('Retry failed:', retryError);
                    this.handleConnectionError(retryError);
                }
            }
        }, delay);
    }

    // Enter temporary offline mode
    enterTemporaryOfflineMode() {
        console.warn('Entering temporary offline mode due to connection issues');
        
        // Clean up listeners
        this.cleanup();
        
        // Try to reconnect after a longer delay
        setTimeout(async () => {
            console.log('Attempting to reconnect...');
            if (this.currentUser) {
                this.connectionRetryCount = 0; // Reset retry count
                try {
                    await this.refreshAuthToken();
                    if (this.connectionHealthy) {
                        console.log('Reconnection successful');
                        await this.validateSession();
                    }
                } catch (error) {
                    console.error('Reconnection failed:', error);
                    // Try again later
                    this.enterTemporaryOfflineMode();
                }
            }
        }, 5 * 60 * 1000); // Try again in 5 minutes
    }

    // Restart session monitoring after connection recovery
    restartSessionMonitoring() {
        console.log('Restarting session monitoring...');
        
        // Clean up old listener first
        if (this.sessionListener) {
            this.sessionListener();
            this.sessionListener = null;
        }
        
        // Restart monitoring
        this.startSessionMonitoring();
    }

    // Clean up listeners and timers
    cleanup() {
        // Stop session listener
        if (this.sessionListener) {
            this.sessionListener();
            this.sessionListener = null;
        }
        
        // Stop activity timer
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
            this.activityTimer = null;
        }
        
        // Stop token refresh timer
        if (this.tokenRefreshTimer) {
            clearInterval(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
        
        // Stop auto-save timer
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
    }

    // Validate current session
    async validateSession() {
        if (!this.currentUser || !this.sessionId) return;
        
        try {
            const userDoc = await getDoc(doc(this.db, 'users', this.currentUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                
                // Check if our session is still the current one
                if (data.currentSessionId !== this.sessionId) {
                    console.warn('Session mismatch detected');
                    
                    // Check if there's a newer session
                    if (data.currentSessionId && data.lastLoginTime) {
                        const lastLoginTime = data.lastLoginTime.toDate ? data.lastLoginTime.toDate() : new Date(data.lastLoginTime);
                        const timeDiff = Date.now() - lastLoginTime.getTime();
                        
                        // If the other session is recent (within last 5 minutes), we were kicked out
                        if (timeDiff < 5 * 60 * 1000) {
                            this.handleForcedLogout();
                            return;
                        }
                    }
                    
                    // Otherwise, reclaim the session
                    console.log('Reclaiming session...');
                    await this.updateSession();
                }
                
                // Start monitoring
                this.startSessionMonitoring();
            }
        } catch (error) {
            console.error('Failed to validate session:', error);
            this.handleConnectionError(error);
        }
    }

    // Update session info
    async updateSession() {
        if (!this.currentUser) return;
        
        // Generate new session ID if we don't have one
        if (!this.sessionId) {
            this.sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('scapewatch_session_id', this.sessionId);
        }
        
        try {
            await updateDoc(doc(this.db, 'users', this.currentUser.uid), {
                lastLoginTime: serverTimestamp(),
                lastActiveTime: serverTimestamp(),
                currentSessionId: this.sessionId
            });
        } catch (error) {
            console.error('Failed to update session:', error);
            this.handleConnectionError(error);
        }
    }

    // Check if username is available
    async isUsernameAvailable(username) {
        try {
            const usernameDoc = await getDoc(doc(this.db, 'usernames', username.toLowerCase()));
            return !usernameDoc.exists();
        } catch (error) {
            console.error('Failed to check username availability:', error);
            throw error;
        }
    }

    // Reserve username during signup
    async reserveUsername(username, uid) {
        try {
            await setDoc(doc(this.db, 'usernames', username.toLowerCase()), {
                uid: uid,
                username: username,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Failed to reserve username:', error);
            throw error;
        }
    }

    // Load username for current user
    async loadUsername() {
        if (!this.currentUser) return;
        
        try {
            const userDoc = await getDoc(doc(this.db, 'users', this.currentUser.uid));
            if (userDoc.exists()) {
                this.username = userDoc.data().username;
            }
        } catch (error) {
            console.error('Failed to load username:', error);
            this.handleConnectionError(error);
        }
    }

    // Get email from username (for password reset)
    async getEmailFromUsername(username) {
        try {
            const usernameDoc = await getDoc(doc(this.db, 'usernames', username.toLowerCase()));
            
            if (!usernameDoc.exists()) {
                throw new Error('Username not found');
            }
            
            const uid = usernameDoc.data().uid;
            const userDoc = await getDoc(doc(this.db, 'users', uid));
            
            if (!userDoc.exists()) {
                throw new Error('User data not found');
            }
            
            return userDoc.data().email;
        } catch (error) {
            console.error('Failed to get email from username:', error);
            throw error;
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(this.auth, email);
        } catch (error) {
            console.error('Failed to send password reset email:', error);
            throw error;
        }
    }

    // Sign up new user
    async signUp(username, email, password) {
        // Validate username
        if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
            throw new Error('Username must be 3-16 characters and contain only letters, numbers, and underscores');
        }

        // Check if username is available
        const available = await this.isUsernameAvailable(username);
        if (!available) {
            throw new Error('Username is already taken');
        }

        // Create auth account
        const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
        const user = userCredential.user;

        // Generate session ID
        this.sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('scapewatch_session_id', this.sessionId);

        // Reserve username and create user document with organized fields
        await this.reserveUsername(username, user.uid);
        await setDoc(doc(this.db, 'users', user.uid), {
            // Identity info at top
            username: username,
            uid: user.uid,
            email: email,
            
            // Timestamps in logical order
            createdAt: serverTimestamp(),
            lastLoginTime: serverTimestamp(),
            lastActiveTime: serverTimestamp(),
            lastLogoutTime: null,
            lastPlayed: serverTimestamp(),
            
            // Session info last
            currentSessionId: this.sessionId
        });

        this.currentUser = user;
        this.username = username;
        
        // Start session monitoring
        this.startSessionMonitoring();
        
        // Start token refresh timer
        this.startTokenRefreshTimer();

        return user;
    }

    // Login existing user
    async login(username, password) {
        // Get email from username
        const usernameDoc = await getDoc(doc(this.db, 'usernames', username.toLowerCase()));
        
        if (!usernameDoc.exists()) {
            throw new Error('Username not found');
        }

        const uid = usernameDoc.data().uid;
        const userDoc = await getDoc(doc(this.db, 'users', uid));
        
        if (!userDoc.exists()) {
            throw new Error('User data not found');
        }

        const email = userDoc.data().email;
        
        // Sign in with email
        const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
        
        // Generate a unique session ID for this login
        this.sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('scapewatch_session_id', this.sessionId);
        
        // Update user document with new session (maintains field order)
        await updateDoc(doc(this.db, 'users', userCredential.user.uid), {
            lastLoginTime: serverTimestamp(),
            lastActiveTime: serverTimestamp(),
            lastPlayed: serverTimestamp(),
            currentSessionId: this.sessionId
        });

        this.currentUser = userCredential.user;
        this.username = username;
        
        // Start session monitoring
        this.startSessionMonitoring();
        
        // Start token refresh timer
        this.startTokenRefreshTimer();

        return userCredential.user;
    }
    
    // Monitor for session conflicts with improved error handling
    startSessionMonitoring() {
        if (!this.currentUser) return;
        
        // Clear any existing listener
        if (this.sessionListener) {
            this.sessionListener();
            this.sessionListener = null;
        }
        
        // Listen for changes to the user document with error handling
        this.sessionListener = onSnapshot(
            doc(this.db, 'users', this.currentUser.uid),
            (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    // Check if another session has taken over
                    if (data.currentSessionId && data.currentSessionId !== this.sessionId) {
                        console.warn('Another session detected! Session ID:', data.currentSessionId);
                        this.handleForcedLogout();
                    }
                }
                
                // Reset connection health on successful snapshot
                this.connectionHealthy = true;
                this.connectionRetryCount = 0;
            },
            (error) => {
                console.error('Session monitoring error:', error);
                
                // Don't retry on permission errors
                if (error.code === 'permission-denied') {
                    console.error('Permission denied for session monitoring');
                    this.cleanup();
                    return;
                }
                
                // Handle other errors with retry logic
                this.handleConnectionError(error);
            }
        );
            
        // Also update last active time periodically (every 2 minutes)
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
        }
        
        this.activityTimer = setInterval(() => {
            this.updateLastActive();
        }, 2 * 60 * 1000);
    }
    
    // Update last active time with error handling
    async updateLastActive() {
        if (!this.currentUser || this.isOfflineMode || !this.connectionHealthy) return;
        
        try {
            await updateDoc(doc(this.db, 'users', this.currentUser.uid), {
                lastActiveTime: serverTimestamp()
            });
        } catch (error) {
            console.error('Failed to update last active time:', error);
            // Don't trigger full connection error handling for activity updates
            // Just log and continue
        }
    }
    
    // Handle being logged out by another session
    handleForcedLogout() {
        // Save game state before forced logout
        if (!this.isOfflineMode) {
            // Ensure task queue is complete before saving
            if (window.taskManager) {
                taskManager.ensureFullTaskQueue();
                
                // Generate emergency tasks if needed
                if (!taskManager.currentTask) {
                    const emergencyTasks = taskManager.generateMultipleTasks(1);
                    if (emergencyTasks.length > 0) {
                        taskManager.currentTask = emergencyTasks[0];
                        console.log('Generated emergency current task before forced logout');
                    }
                }
                
                if (!taskManager.nextTask) {
                    const emergencyTasks = taskManager.generateMultipleTasks(1);
                    if (emergencyTasks.length > 0) {
                        taskManager.nextTask = emergencyTasks[0];
                        console.log('Generated emergency next task before forced logout');
                    }
                }
            }
            
            // Force save (bypass throttle)
            this.forceSave().then(() => {
                console.log('Game saved before forced logout');
            }).catch(error => {
                console.error('Failed to save before forced logout:', error);
            });
        }
        
        // Clean up everything
        this.cleanup();
        
        // Clear session
        this.currentUser = null;
        this.username = null;
        this.sessionId = null;
        localStorage.removeItem('scapewatch_session_id');
        
        // Show alert and redirect to login
        alert('You have been logged in from another location. You will be logged out from this session.');
        location.reload();
    }

    // Force logout all sessions
    async forceLogoutAllSessions() {
        if (!this.currentUser) return;
        
        try {
            // Clear the session ID in the database
            await updateDoc(doc(this.db, 'users', this.currentUser.uid), {
                currentSessionId: null,
                lastLogoutTime: serverTimestamp()
            });
            
            console.log('All sessions have been logged out');
        } catch (error) {
            console.error('Failed to logout all sessions:', error);
        }
    }

    // Clean undefined values from an object (convert to null)
    cleanUndefinedValues(obj) {
        if (obj === undefined) return null;
        if (obj === null) return null;
        if (typeof obj !== 'object') return obj;
        if (obj instanceof Date) return obj;
        
        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => this.cleanUndefinedValues(item));
        }
        
        // Handle objects
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value === undefined) {
                cleaned[key] = null;
            } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
                cleaned[key] = this.cleanUndefinedValues(value);
            } else {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }

    // Logout
    async logout() {
        // Ensure tasks are fully populated, then save and update hi-scores
        if (!this.isOfflineMode) {
            // Ensure task queue is complete before saving
            if (window.taskManager) {
                taskManager.ensureFullTaskQueue();
                
                // Generate emergency tasks if needed
                if (!taskManager.currentTask) {
                    const emergencyTasks = taskManager.generateMultipleTasks(1);
                    if (emergencyTasks.length > 0) {
                        taskManager.currentTask = emergencyTasks[0];
                        console.log('Generated emergency current task before logout');
                    }
                }
                
                if (!taskManager.nextTask) {
                    const emergencyTasks = taskManager.generateMultipleTasks(1);
                    if (emergencyTasks.length > 0) {
                        taskManager.nextTask = emergencyTasks[0];
                        console.log('Generated emergency next task before logout');
                    }
                }
            }
            
            // Force save on logout (bypass throttle)
            await this.forceSave();
        }
        
        // Clear session in database
        if (this.currentUser) {
            try {
                await updateDoc(doc(this.db, 'users', this.currentUser.uid), {
                    lastLogoutTime: serverTimestamp(),
                    currentSessionId: null
                });
            } catch (error) {
                console.error('Failed to clear session:', error);
            }
        }
        
        // Clean up everything
        this.cleanup();
        
        // Clear local session
        localStorage.removeItem('scapewatch_session_id');
        
        await signOut(this.auth);
        this.currentUser = null;
        this.username = null;
        this.sessionId = null;
        
        // Redirect to login
        location.reload();
    }

    // Collect save data with task limiting for Firebase
    collectSaveData() {
        // Invalidate any caches to ensure fresh data
        if (window.taskManager) {
            taskManager.invalidateCache();
            // Force update task progress one final time before saving
            taskManager.updateAllProgress();
        }
        
        // Get only the most recent tasks for Firebase (maintain task numbering)
        let recentCompletedTasks = [];
        if (window.taskManager && taskManager.completedTasks) {
            // Take only the most recent MAX_FIREBASE_TASKS
            // These tasks keep their original task numbers
            recentCompletedTasks = taskManager.completedTasks.slice(-this.MAX_FIREBASE_TASKS);
            
            // If we have tasks, verify the first task in our saved list has the correct number
            if (recentCompletedTasks.length > 0 && taskManager.completedTasks.length > this.MAX_FIREBASE_TASKS) {
                const firstSavedTaskIndex = taskManager.completedTasks.length - recentCompletedTasks.length;
                console.log(`Saving tasks ${firstSavedTaskIndex + 1} to ${taskManager.completedTasks.length} (${recentCompletedTasks.length} tasks) to Firebase`);
            } else {
                console.log(`Saving all ${recentCompletedTasks.length} tasks to Firebase`);
            }
        }
        
        const saveData = {
            // Player data
            player: {
                position: player.position,
                currentNode: player.currentNode,
                targetNode: player.targetNode,
                path: player.path,
                pathIndex: player.pathIndex,
                segmentProgress: player.segmentProgress,
                targetPosition: player.targetPosition,
                currentActivity: player.currentActivity,
                activityProgress: player.activityProgress,
                activityStartTime: player.activityStartTime
            },
            
            // AI state
            ai: {
                hasBankedForCurrentTask: window.ai ? ai.hasBankedForCurrentTask : false,
                failedNodes: window.ai && ai.failedNodes ? Array.from(ai.failedNodes) : []
            },
            
            // Skills
            skills: {},
            
            // Inventory
            inventory: inventory.slots,
            
            // Bank
            bank: bank.items,

            // Shop
            shop: window.shop ? shop.getState() : null,
            
            // Task system - now with limited completed tasks but preserved total count
            tasks: {
                current: taskManager.currentTask,
                next: taskManager.nextTask,
                queue: taskManager.tasks,
                completed: recentCompletedTasks, // Only the most recent 10
                // CRITICAL: This tracks the TRUE total number of tasks completed
                // Used to maintain accurate task numbering even when we only save 10
                totalCompleted: window.runeCreditManager ? runeCreditManager.totalTasksCompleted : taskManager.completedTasks.length
            },
            
            // Clue system
            clues: window.clueManager ? clueManager.clues : {},
            completedClues: window.clueManager ? clueManager.completedClues : {},
            
            // RuneCred system
            runeCred: null
        };

        // Collect skill data
        for (const [skillId, skill] of Object.entries(skills.skills)) {
            saveData.skills[skillId] = {
                level: skill.level,
                xp: skill.xp
            };
        }

        // Save RuneCred data (always save it now for accounts)
        if (window.runeCreditManager) {
            saveData.runeCred = {
                skillCredits: runeCreditManager.skillCredits,
                skillCredSpent: runeCreditManager.skillCredSpent,
                runeCred: runeCreditManager.runeCred,
                totalTasksCompleted: runeCreditManager.totalTasksCompleted, // This tracks the real total
                tasksPerSkill: runeCreditManager.tasksPerSkill,
                creditsSpentPerSkill: runeCreditManager.creditsSpentPerSkill,
                skillModLevels: runeCreditManager.skillModLevels,
                taskModLevels: runeCreditManager.taskModLevels,
                nodeModLevels: runeCreditManager.nodeModLevels,
                quantityModLevels: runeCreditManager.quantityModLevels,
                speedBonuses: runeCreditManager.speedBonuses,
                petCounts: runeCreditManager.petCounts,
                totalPetsObtained: runeCreditManager.totalPetsObtained,
                totalShinyPetsObtained: runeCreditManager.totalShinyPetsObtained
            };
        }

        return saveData;
    }

    // Save game state with connection checking
    async saveGame() {
        if (this.isOfflineMode) {
            // OFFLINE MODE: Save to localStorage
            try {
                const saveData = this.collectSaveData();
                const cleanedSaveData = this.cleanUndefinedValues(saveData);
                
                // Add metadata for offline save
                const offlineSave = {
                    username: 'Offline Player',
                    uid: 'offline',
                    lastSaved: Date.now(),
                    ...cleanedSaveData
                };
                
                localStorage.setItem('scapewatch_offline_save', JSON.stringify(offlineSave));
                this.showSaveIndicator();
                console.log('Game saved to localStorage (offline mode)');
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
            }
            return;
        }
        
        if (!this.currentUser || !this.connectionHealthy) return;

        // Prevent saving too frequently (10 minutes throttle for normal saves)
        const now = Date.now();
        if (now - this.lastSaveTime < this.SAVE_INTERVAL) {
            console.log(`Save throttled. Next save in ${Math.ceil((this.SAVE_INTERVAL - (now - this.lastSaveTime)) / 1000)} seconds`);
            return;
        }
        
        try {
            // Collect save data (includes only recent 10 tasks now)
            const saveData = this.collectSaveData();
            
            // Clean undefined values before saving
            const cleanedSaveData = this.cleanUndefinedValues(saveData);
            
            // Call the Cloud Function to stage the save
            const saveFunction = httpsCallable(this.functions, 'receivePlayerSave');
            await saveFunction({
                // User info at the very top
                username: this.username,
                uid: this.currentUser.uid,
                
                // Timestamp info next (serverTimestamp doesn't work in functions, use null)
                lastSaved: null, // Will be set server-side
                sessionId: this.sessionId,
                
                // Then all game data (with only recent 10 tasks)
                ...cleanedSaveData
            });

            this.lastSaveTime = now;
            this.showSaveIndicator();
            console.log('Game saved to staging successfully');
            
            // Update hi-scores after successful save
            await this.updateHiscores();
        } catch (error) {
            console.error('Failed to save game:', error);
            this.handleConnectionError(error);
        }
    }

    // Load game state
    async loadGame() {
        if (this.isOfflineMode) {
            // OFFLINE MODE: Load from localStorage
            try {
                const savedData = localStorage.getItem('scapewatch_offline_save');
                if (!savedData) {
                    console.log('No offline save found, starting fresh');
                    return false;
                }
                
                const saveData = JSON.parse(savedData);
                console.log('Loading from localStorage (offline mode)');
                
                // Validate save data before applying
                if (this.validateSaveData(saveData)) {
                    this.applySaveData(saveData);
                    console.log('Offline game loaded successfully');
                    return true;
                } else {
                    console.warn('Offline save data validation failed, starting fresh');
                    return false;
                }
            } catch (error) {
                console.error('Failed to load from localStorage:', error);
                return false;
            }
        }
        
        if (!this.currentUser) return false;

        try {
            // Check staging collection FIRST for most recent data
            const stagingDoc = await getDoc(doc(this.db, '_staging_player_saves', this.currentUser.uid));
            
            let saveData;
            if (stagingDoc.exists()) {
                console.log('Loading from staging (most recent save)');
                saveData = stagingDoc.data();
            } else {
                // Fall back to main saves collection
                const mainDoc = await getDoc(doc(this.db, 'saves', this.currentUser.uid));
                
                if (!mainDoc.exists()) {
                    console.log('No save data found, starting fresh');
                    return false;
                }
                
                console.log('Loading from main saves collection');
                saveData = mainDoc.data();
            }
            
            // Validate save data before applying
            if (this.validateSaveData(saveData)) {
                this.applySaveData(saveData);
                console.log('Game loaded successfully');
                return true;
            } else {
                console.warn('Save data validation failed, starting fresh');
                return false;
            }
        } catch (error) {
            console.error('Failed to load game:', error);
            return false;
        }
    }

    validateSaveData(saveData) {
        if (!saveData) return false;
        
        // Basic structure validation
        if (!saveData.player || !saveData.skills) {
            console.warn('Save data missing core components');
            return false;
        }
        
        // Validate task data if present
        if (saveData.tasks) {
            // Ensure tasks have required fields
            if (saveData.tasks.current && !this.validateTask(saveData.tasks.current)) {
                console.warn('Current task validation failed');
                saveData.tasks.current = null;
            }
            
            if (saveData.tasks.next && !this.validateTask(saveData.tasks.next)) {
                console.warn('Next task validation failed');
                saveData.tasks.next = null;
            }
            
            // Validate task queue
            if (saveData.tasks.queue && Array.isArray(saveData.tasks.queue)) {
                // Remove invalid tasks from queue
                saveData.tasks.queue = saveData.tasks.queue.filter(task => {
                    if (task && task.options) {
                        // Validate each option
                        task.options = task.options.filter(opt => this.validateTask(opt));
                        return task.options.length > 0;
                    }
                    return false;
                });
            }
        }
        
        return true;
    }
    
    validateTask(task) {
        if (!task) return false;
        
        // Check required fields
        const requiredFields = ['skill', 'nodeId', 'activityId', 'targetCount', 'description'];
        for (const field of requiredFields) {
            if (task[field] === undefined || task[field] === null) {
                console.warn(`Task missing required field: ${field}`);
                return false;
            }
        }
        
        // Validate progress is between 0 and 1
        if (task.progress !== undefined) {
            if (task.progress < 0 || task.progress > 1) {
                task.progress = Math.max(0, Math.min(1, task.progress));
            }
        }
        
        return true;
    }

    applySaveData(saveData) {
        // Load player state
        if (saveData.player) {
            // First, restore node information
            player.currentNode = saveData.player.currentNode;
            player.targetNode = saveData.player.targetNode;
            
            // Check if we have a saved path in progress
            if (saveData.player.path && saveData.player.path.length > 0 && 
                saveData.player.pathIndex !== undefined && 
                saveData.player.pathIndex < saveData.player.path.length) {
                
                console.log(`Restoring path: waypoint ${saveData.player.pathIndex}/${saveData.player.path.length}, progress: ${(saveData.player.segmentProgress * 100).toFixed(1)}%`);
                
                // Restore path data
                player.path = saveData.player.path;
                player.pathIndex = saveData.player.pathIndex;
                player.segmentProgress = saveData.player.segmentProgress || 0;
                player.targetPosition = saveData.player.targetPosition;
                
                // CRITICAL: Recalculate position from path data to avoid drift
                if (player.pathIndex > 0 && player.pathIndex < player.path.length) {
                    // We're between two waypoints
                    const prevWaypoint = player.path[player.pathIndex - 1];
                    const nextWaypoint = player.path[player.pathIndex];
                    
                    // Interpolate position based on segment progress
                    const dx = nextWaypoint.x - prevWaypoint.x;
                    const dy = nextWaypoint.y - prevWaypoint.y;
                    
                    player.position = {
                        x: prevWaypoint.x + (dx * player.segmentProgress),
                        y: prevWaypoint.y + (dy * player.segmentProgress)
                    };
                    
                    console.log(`Restored position from path: (${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)})`);
                    
                    // Clear current node since we're mid-path
                    player.currentNode = null;
                } else if (player.pathIndex === 0) {
                    // At the very start of path
                    player.position = saveData.player.position;
                    player.segmentProgress = 0;
                } else {
                    // Path index out of bounds, use saved position
                    player.position = saveData.player.position;
                }
                
            } else if (saveData.player.position) {
                // No active path, just restore position
                player.position = saveData.player.position;
                
                // Clear any invalid path data
                player.path = [];
                player.pathIndex = 0;
                player.segmentProgress = 0;
                player.targetPosition = null;
                
                // Check if we're at a node
                if (!player.currentNode && window.nodes) {
                    const tolerance = 2;
                    const allNodes = nodes.getAllNodes();
                    
                    for (const [nodeId, node] of Object.entries(allNodes)) {
                        const dist = window.distance ? 
                            distance(player.position.x, player.position.y, node.position.x, node.position.y) : 
                            Math.sqrt(Math.pow(node.position.x - player.position.x, 2) + 
                                     Math.pow(node.position.y - player.position.y, 2));
                        
                        if (dist <= tolerance) {
                            player.currentNode = nodeId;
                            console.log(`Found player at node: ${nodeId}`);
                            break;
                        }
                    }
                }
                
                // If still no current node but we had one saved, teleport there
                if (!player.currentNode && saveData.player.currentNode) {
                    console.log(`Restoring player to last known node: ${saveData.player.currentNode}`);
                    const nodeData = nodes.getNode(saveData.player.currentNode);
                    if (nodeData) {
                        player.position = { x: nodeData.position.x, y: nodeData.position.y };
                        player.currentNode = saveData.player.currentNode;
                    }
                }
            }
            
            // Activity state
            if (saveData.player.currentActivity) {
                player.currentActivity = saveData.player.currentActivity;
                player.activityProgress = saveData.player.activityProgress || 0;
                // Adjust activity start time to account for time passed
                if (saveData.player.activityStartTime) {
                    // Calculate how much time should have elapsed
                    const elapsed = player.activityProgress * 
                        (window.loadingManager && loadingManager.getData('activities')[player.currentActivity] ? 
                         loadingManager.getData('activities')[player.currentActivity].baseDuration : 3000);
                    player.activityStartTime = Date.now() - elapsed;
                }
            }
            
            // Animation states (reset these)
            player.isPreparingPath = false;
            player.isBanking = false;
            player.pathPrepEndTime = 0;
            player.bankingEndTime = 0;
        }

        // Load AI state
        if (saveData.ai && window.ai) {
            ai.hasBankedForCurrentTask = saveData.ai.hasBankedForCurrentTask || false;
            if (saveData.ai.failedNodes) {
                ai.failedNodes = new Set(saveData.ai.failedNodes);
            }
            // Sync AI state after loading
            ai.syncAfterLoad();
        }

        // Load skills
        if (saveData.skills) {
            for (const [skillId, skillData] of Object.entries(saveData.skills)) {
                if (skills.skills[skillId]) {
                    skills.skills[skillId].level = skillData.level;
                    skills.skills[skillId].xp = skillData.xp;
                    skills.skills[skillId].xpForNextLevel = getXpForLevel(skillData.level + 1);
                }
            }
        }

        // Load inventory
        if (saveData.inventory) {
            inventory.slots = saveData.inventory;
        }

        // Load bank
        if (saveData.bank) {
            bank.items = saveData.bank;
        }

        // Load shop
        if (saveData.shop && window.shop) {
            shop.loadState(saveData.shop);
            console.log('Shop state loaded');
        }

        // Load tasks with proper numbering
        if (saveData.tasks) {
            taskManager.currentTask = saveData.tasks.current;
            taskManager.nextTask = saveData.tasks.next;
            taskManager.tasks = saveData.tasks.queue || [];
            
            // Load the completed tasks (up to 10 most recent)
            taskManager.completedTasks = saveData.tasks.completed || [];
            
            // IMPORTANT: If we have a totalCompleted count that's higher than our loaded tasks,
            // it means we have more historical tasks that aren't saved
            const totalCompleted = saveData.tasks.totalCompleted || 
                                  (window.runeCreditManager ? runeCreditManager.totalTasksCompleted : 0) ||
                                  taskManager.completedTasks.length;
            
            // If we've done more tasks than we have saved, we know these are the most recent ones
            if (totalCompleted > taskManager.completedTasks.length && taskManager.completedTasks.length > 0) {
                console.log(`Loaded ${taskManager.completedTasks.length} recent tasks out of ${totalCompleted} total completed`);
                
                // Ensure task numbers are correct for the loaded tasks
                // These are the LAST 10 tasks, so their numbers should be from (total - 10 + 1) to total
                const firstTaskNumber = totalCompleted - taskManager.completedTasks.length + 1;
                
                taskManager.completedTasks.forEach((task, index) => {
                    // Only update if task doesn't have a number or if it's clearly wrong
                    if (!task.taskNumber) {
                        task.taskNumber = firstTaskNumber + index;
                    }
                });
            } else if (taskManager.completedTasks.length > 0) {
                // We have all tasks saved, ensure they're numbered
                taskManager.completedTasks.forEach((task, index) => {
                    if (!task.taskNumber) {
                        task.taskNumber = index + 1;
                    }
                });
            }
            
            // CRITICAL: Ensure we have a full task queue
            console.log('Validating task queue after load...');
            taskManager.ensureFullTaskQueue();
        }

        // Load clues
        if (window.clueManager) {
            const clueData = {
                clues: saveData.clues || {},
                completedClues: saveData.completedClues || {}
            };
            clueManager.loadClueData(clueData);
        }

        // Ensure UI updates after all data is loaded
        setTimeout(() => {
            if (window.ui) {
                ui.updateTasks();
            }
        }, 100);

        // Load RuneCred data
        if (saveData.runeCred && window.runeCreditManager) {
            // Enable persistence for online accounts
            runeCreditManager.enablePersistence = true;
            
            // Load all the RuneCred data
            if (saveData.runeCred.skillCredits) runeCreditManager.skillCredits = saveData.runeCred.skillCredits;
            if (saveData.runeCred.skillCredSpent) runeCreditManager.skillCredSpent = saveData.runeCred.skillCredSpent;
            if (saveData.runeCred.runeCred) runeCreditManager.runeCred = saveData.runeCred.runeCred;
            if (saveData.runeCred.totalTasksCompleted) runeCreditManager.totalTasksCompleted = saveData.runeCred.totalTasksCompleted;
            if (saveData.runeCred.tasksPerSkill) runeCreditManager.tasksPerSkill = saveData.runeCred.tasksPerSkill;
            if (saveData.runeCred.creditsSpentPerSkill) runeCreditManager.creditsSpentPerSkill = saveData.runeCred.creditsSpentPerSkill;
            if (saveData.runeCred.skillModLevels) runeCreditManager.skillModLevels = saveData.runeCred.skillModLevels;
            if (saveData.runeCred.taskModLevels) runeCreditManager.taskModLevels = saveData.runeCred.taskModLevels;
            if (saveData.runeCred.nodeModLevels) runeCreditManager.nodeModLevels = saveData.runeCred.nodeModLevels;
            if (saveData.runeCred.quantityModLevels) runeCreditManager.quantityModLevels = saveData.runeCred.quantityModLevels;
            if (saveData.runeCred.speedBonuses) runeCreditManager.speedBonuses = saveData.runeCred.speedBonuses;
            if (saveData.runeCred.petCounts) runeCreditManager.petCounts = saveData.runeCred.petCounts;
            if (saveData.runeCred.totalPetsObtained) runeCreditManager.totalPetsObtained = saveData.runeCred.totalPetsObtained;
            if (saveData.runeCred.totalShinyPetsObtained) runeCreditManager.totalShinyPetsObtained = saveData.runeCred.totalShinyPetsObtained;
            
            // Update Skill Cred based on total level
            runeCreditManager.updateSkillCred();
        }

        // Update UI
        if (window.ui) {
            ui.updateInventory();
            ui.updateSkillsList();
            ui.updateTasks();
            ui.updateBank();
        }
    }

    showSaveIndicator() {
        let indicator = document.getElementById('save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'save-indicator';
            indicator.className = 'save-indicator';
            indicator.textContent = '✔ Game Saved';
            document.body.appendChild(indicator);
        }
        
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }

    startAutoSave() {
        // Save every 10 minutes
        this.saveTimer = setInterval(() => {
            this.saveGame();
        }, this.SAVE_INTERVAL);

        // Also save on important events (force save, bypasses throttle)
        window.addEventListener('beforeunload', () => {
            this.forceSave();
        });
    }

    stopAutoSave() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
        
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
            this.activityTimer = null;
        }
    }

    // Update saveNow to also use the staging system or localStorage
    async saveNow() {
        this.lastSaveTime = 0; // Reset timer to force save
        await this.saveGame(); // This now uses the Cloud Function or localStorage
    }

    // Force save - ALSO goes through Cloud Function (no direct writes) or localStorage
    async forceSave() {
        if (this.isOfflineMode) {
            // OFFLINE MODE: Save to localStorage immediately
            try {
                const saveData = this.collectSaveData();
                const cleanedSaveData = this.cleanUndefinedValues(saveData);
                
                const offlineSave = {
                    username: 'Offline Player',
                    uid: 'offline',
                    lastSaved: Date.now(),
                    ...cleanedSaveData
                };
                
                localStorage.setItem('scapewatch_offline_save', JSON.stringify(offlineSave));
                console.log('Force save to localStorage completed (offline mode)');
            } catch (error) {
                console.error('Failed to force save to localStorage:', error);
            }
            return;
        }
        
        if (!this.currentUser) return;

        try {
            // Collect save data (includes only recent 10 tasks)
            const saveData = this.collectSaveData();
            
            // Clean undefined values before saving
            const cleanedSaveData = this.cleanUndefinedValues(saveData);
            
            // Even force saves go through the staging system
            const saveFunction = httpsCallable(this.functions, 'receivePlayerSave');
            await saveFunction({
                username: this.username,
                uid: this.currentUser.uid,
                lastSaved: null, // Will be set server-side
                sessionId: this.sessionId,
                ...cleanedSaveData
            });

            console.log('Force save staged successfully');
            
            // Update hi-scores after force save too
            await this.updateHiscores(true);
        } catch (error) {
            console.error('Failed to force save:', error);
        }
    }

    async updateHiscores(forceUpdate = false) {
        if (this.isOfflineMode || !this.currentUser || !this.connectionHealthy) return;
        
        try {
            const hiscoreData = {
                uid: this.currentUser.uid,
                username: this.username,
                
                // Overall stats
                totalLevel: skills.getTotalLevel(),
                totalXp: this.calculateTotalXp(),
                
                // Track when milestones were first reached (using sentinel date for "not yet")
                totalLevelFirstReached: this.SENTINEL_DATE,
                
                // Tasks
                tasksCompleted: window.runeCreditManager ? runeCreditManager.totalTasksCompleted : 0,
                tasksFirstReached: this.SENTINEL_DATE,
                
                // Pets
                petsTotal: 0,
                petsShiny: 0,
                petsFirstReached: this.SENTINEL_DATE,
                shinyPetsFirstReached: this.SENTINEL_DATE,

                // Clues
                cluesTotal: 0,
                cluesEasy: 0,
                cluesMedium: 0,
                cluesHard: 0,
                cluesElite: 0,
                cluesMaster: 0,
                cluesTotalFirstReached: this.SENTINEL_DATE,
                cluesEasyFirstReached: this.SENTINEL_DATE,
                cluesMediumFirstReached: this.SENTINEL_DATE,
                cluesHardFirstReached: this.SENTINEL_DATE,
                cluesEliteFirstReached: this.SENTINEL_DATE,
                cluesMasterFirstReached: this.SENTINEL_DATE,
                
                // Update timestamp will be added server-side
                // lastUpdated: serverTimestamp() - removed, will be set by function
            };
            
            // Calculate pet totals
            if (window.runeCreditManager && runeCreditManager.petCounts) {
                for (const skillCounts of Object.values(runeCreditManager.petCounts)) {
                    hiscoreData.petsTotal += (skillCounts.regular || 0) + (skillCounts.shiny || 0);
                    hiscoreData.petsShiny += (skillCounts.shiny || 0);
                }
            }

            // Calculate clue totals
            if (window.clueManager && clueManager.completedClues) {
                hiscoreData.cluesEasy = clueManager.completedClues.easy || 0;
                hiscoreData.cluesMedium = clueManager.completedClues.medium || 0;
                hiscoreData.cluesHard = clueManager.completedClues.hard || 0;
                hiscoreData.cluesElite = clueManager.completedClues.elite || 0;
                hiscoreData.cluesMaster = clueManager.completedClues.master || 0;
                hiscoreData.cluesTotal = hiscoreData.cluesEasy + hiscoreData.cluesMedium + 
                                         hiscoreData.cluesHard + hiscoreData.cluesElite + 
                                         hiscoreData.cluesMaster;
            }
            
            // Add individual skill data
            for (const [skillId, skill] of Object.entries(skills.skills)) {
                hiscoreData[`level_${skillId}`] = skill.level;
                hiscoreData[`xp_${skillId}`] = Math.floor(skill.xp);
                hiscoreData[`levelFirst_${skillId}`] = this.SENTINEL_DATE; // Sentinel date for "not yet"
            }
            
            // Clean undefined values before saving
            const cleanedHiscoreData = this.cleanUndefinedValues(hiscoreData);
            
            // Call the Firebase Function to update hiscores
            const updateHiscoresFunction = httpsCallable(this.functions, 'updatePlayerHiscores');
            await updateHiscoresFunction(cleanedHiscoreData);
            
            console.log('Hiscores updated');
        } catch (error) {
            console.error('Failed to update hiscores:', error);
            // Don't trigger connection error handling for hiscores updates
        }
    }

    calculateTotalXp() {
        let total = 0;
        if (window.skills) {
            for (const skill of Object.values(skills.skills)) {
                total += Math.floor(skill.xp);
            }
        }
        return total;
    }
}

// Create global instance
window.firebaseManager = new FirebaseManager();
