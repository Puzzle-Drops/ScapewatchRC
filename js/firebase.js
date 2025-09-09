class FirebaseManager {
    constructor() {
        this.app = null;
        this.auth = null;
        this.db = null;
        this.currentUser = null;
        this.username = null;
        this.isOfflineMode = false;
        this.saveTimer = null;
        this.lastSaveTime = 0;
        this.saveDebounceTimer = null;
        this.sessionId = null;
        this.sessionListener = null;
    }

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
        this.app = firebase.initializeApp(firebaseConfig);
        this.auth = firebase.auth();
        this.db = firebase.firestore();

        // Restore session ID from localStorage if it exists
        this.sessionId = localStorage.getItem('scapewatch_session_id');

        // Set up auth state listener
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUsername();
                console.log('User logged in:', this.username);
                
                // Validate session if we have a stored sessionId
                if (this.sessionId) {
                    await this.validateSession();
                }
            } else {
                this.currentUser = null;
                this.username = null;
                this.sessionId = null;
                localStorage.removeItem('scapewatch_session_id');
            }
        });
    }

    // Validate current session
    async validateSession() {
        if (!this.currentUser || !this.sessionId) return;
        
        try {
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            if (userDoc.exists) {
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
            await this.db.collection('users').doc(this.currentUser.uid).update({
                lastLoginTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastActiveTime: firebase.firestore.FieldValue.serverTimestamp(),
                currentSessionId: this.sessionId
            });
        } catch (error) {
            console.error('Failed to update session:', error);
        }
    }

    // Check if username is available
    async isUsernameAvailable(username) {
        const usernameDoc = await this.db.collection('usernames').doc(username.toLowerCase()).get();
        return !usernameDoc.exists;
    }

    // Reserve username during signup
    async reserveUsername(username, uid) {
        await this.db.collection('usernames').doc(username.toLowerCase()).set({
            uid: uid,
            username: username,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // Load username for current user
    async loadUsername() {
        if (!this.currentUser) return;
        
        const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
        if (userDoc.exists) {
            this.username = userDoc.data().username;
        }
    }

    // Get email from username (for password reset)
    async getEmailFromUsername(username) {
        const usernameDoc = await this.db.collection('usernames').doc(username.toLowerCase()).get();
        
        if (!usernameDoc.exists) {
            throw new Error('Username not found');
        }
        
        const uid = usernameDoc.data().uid;
        const userDoc = await this.db.collection('users').doc(uid).get();
        
        if (!userDoc.exists) {
            throw new Error('User data not found');
        }
        
        return userDoc.data().email;
    }

    // Reset password
    async resetPassword(email) {
        await this.auth.sendPasswordResetEmail(email);
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
        const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Generate session ID
        this.sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('scapewatch_session_id', this.sessionId);

        // Reserve username and create user document with organized fields
        await this.reserveUsername(username, user.uid);
        await this.db.collection('users').doc(user.uid).set({
            // Identity info at top
            username: username,
            uid: user.uid,
            email: email,
            
            // Timestamps in logical order
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLoginTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastActiveTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogoutTime: null,
            lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
            
            // Session info last
            currentSessionId: this.sessionId
        });

        this.currentUser = user;
        this.username = username;
        
        // Start session monitoring
        this.startSessionMonitoring();

        return user;
    }

    // Login existing user
    async login(username, password) {
        // Get email from username
        const usernameDoc = await this.db.collection('usernames').doc(username.toLowerCase()).get();
        
        if (!usernameDoc.exists) {
            throw new Error('Username not found');
        }

        const uid = usernameDoc.data().uid;
        const userDoc = await this.db.collection('users').doc(uid).get();
        
        if (!userDoc.exists) {
            throw new Error('User data not found');
        }

        const email = userDoc.data().email;
        
        // Sign in with email
        const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
        
        // Generate a unique session ID for this login
        this.sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('scapewatch_session_id', this.sessionId);
        
        // Update user document with new session (maintains field order)
        await this.db.collection('users').doc(userCredential.user.uid).update({
            lastLoginTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastActiveTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
            currentSessionId: this.sessionId
        });

        this.currentUser = userCredential.user;
        this.username = username;
        
        // Start session monitoring
        this.startSessionMonitoring();

        return userCredential.user;
    }
    
    // Monitor for session conflicts
    startSessionMonitoring() {
        if (!this.currentUser) return;
        
        // Clear any existing listener
        if (this.sessionListener) {
            this.sessionListener();
            this.sessionListener = null;
        }
        
        // Listen for changes to the user document
        this.sessionListener = this.db.collection('users')
            .doc(this.currentUser.uid)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    // Check if another session has taken over
                    if (data.currentSessionId && data.currentSessionId !== this.sessionId) {
                        console.warn('Another session detected! Session ID:', data.currentSessionId);
                        this.handleForcedLogout();
                    }
                }
            });
            
        // Also update last active time periodically (every 2 minutes)
        this.activityTimer = setInterval(() => {
            this.updateLastActive();
        }, 2 * 60 * 1000);
    }
    
    // Update last active time
    async updateLastActive() {
        if (!this.currentUser || this.isOfflineMode) return;
        
        try {
            await this.db.collection('users').doc(this.currentUser.uid).update({
                lastActiveTime: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Failed to update last active time:', error);
        }
    }
    
    // Handle being logged out by another session
    handleForcedLogout() {
        // Stop monitoring
        if (this.sessionListener) {
            this.sessionListener();
            this.sessionListener = null;
        }
        
        // Stop activity timer
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
            this.activityTimer = null;
        }
        
        // Stop auto-save
        this.stopAutoSave();
        
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
            await this.db.collection('users').doc(this.currentUser.uid).update({
                currentSessionId: null,
                lastLogoutTime: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('All sessions have been logged out');
        } catch (error) {
            console.error('Failed to logout all sessions:', error);
        }
    }

    // Logout
    async logout() {
        // Save before logout
        if (!this.isOfflineMode) {
            await this.saveGame();
        }
        
        // Clear session in database
        if (this.currentUser) {
            try {
                await this.db.collection('users').doc(this.currentUser.uid).update({
                    lastLogoutTime: firebase.firestore.FieldValue.serverTimestamp(),
                    currentSessionId: null
                });
            } catch (error) {
                console.error('Failed to clear session:', error);
            }
        }
        
        // Stop monitoring
        if (this.sessionListener) {
            this.sessionListener();
            this.sessionListener = null;
        }
        
        // Stop activity timer
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
            this.activityTimer = null;
        }
        
        // Clear local session
        localStorage.removeItem('scapewatch_session_id');
        
        await this.auth.signOut();
        this.currentUser = null;
        this.username = null;
        this.sessionId = null;
        
        // Redirect to login
        location.reload();
    }

    // Save game state
async saveGame() {
    if (this.isOfflineMode || !this.currentUser) return;

    // Prevent saving too frequently
    const now = Date.now();
    if (now - this.lastSaveTime < 5000) return; // Min 5 seconds between saves
    
    try {
        const saveData = this.collectSaveData();
        
        // Save to Firestore with organized field order for readability
        await this.db.collection('saves').doc(this.currentUser.uid).set({
            // User info at the very top
            username: this.username,
            uid: this.currentUser.uid,
            
            // Timestamp info next
            lastSaved: firebase.firestore.FieldValue.serverTimestamp(),
            sessionId: this.sessionId,
            
            // Then all game data
            ...saveData
        });

        this.lastSaveTime = now;
        this.showSaveIndicator();
        console.log('Game saved successfully');
        
        // Update hi-scores
        await this.updateHiscores();
    } catch (error) {
        console.error('Failed to save game:', error);
    }
}

    // Load game state
    async loadGame() {
        if (this.isOfflineMode || !this.currentUser) return false;

        try {
            const saveDoc = await this.db.collection('saves').doc(this.currentUser.uid).get();
            
            if (!saveDoc.exists) {
                console.log('No save data found, starting fresh');
                return false;
            }

            const saveData = saveDoc.data();
            
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

    // Validate save data integrity
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
    
    // Validate individual task
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

    // Collect all game data for saving
    collectSaveData() {
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
            
            // Task system
            tasks: {
                current: taskManager.currentTask,
                next: taskManager.nextTask,
                queue: taskManager.tasks,
                completed: taskManager.completedTasks
            },
            
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
                totalTasksCompleted: runeCreditManager.totalTasksCompleted,
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

    // Apply loaded save data to game
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
            // Reset decision cooldown on login
            ai.decisionCooldown = 0;
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

        // Load tasks
        if (saveData.tasks) {
            taskManager.currentTask = saveData.tasks.current;
            taskManager.nextTask = saveData.tasks.next;
            taskManager.tasks = saveData.tasks.queue || [];
            taskManager.completedTasks = saveData.tasks.completed || [];
            
            // CRITICAL: Ensure we have a full task queue
            console.log('Validating task queue after load...');
            taskManager.ensureFullTaskQueue();
        }

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

    // Show save indicator
    showSaveIndicator() {
        let indicator = document.getElementById('save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'save-indicator';
            indicator.className = 'save-indicator';
            indicator.textContent = '✓ Game Saved';
            document.body.appendChild(indicator);
        }
        
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }

    // Set up auto-save
    startAutoSave() {
        // Save every 30 seconds
        this.saveTimer = setInterval(() => {
            this.saveGame();
        }, 30000);

        // Also save on important events
        window.addEventListener('beforeunload', () => {
            this.saveGame();
        });
    }

    // Stop auto-save
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

    // Manual save trigger (for dev console or save button)
    async saveNow() {
        this.lastSaveTime = 0; // Reset timer to force save
        await this.saveGame();
    }

    // Force save (bypasses cooldown for critical moments)
    async forceSave() {
        if (this.isOfflineMode || !this.currentUser) return;

        try {
            const saveData = this.collectSaveData();
            
            // Save to Firestore immediately with organized field order
            await this.db.collection('saves').doc(this.currentUser.uid).set({
                // User info at the very top
                username: this.username,
                uid: this.currentUser.uid,
                
                // Timestamp info next
                lastSaved: firebase.firestore.FieldValue.serverTimestamp(),
                sessionId: this.sessionId,
                
                // Then all game data
                ...saveData
            });

            this.lastSaveTime = Date.now();
            console.log('Force save completed (task completion)');
        } catch (error) {
            console.error('Failed to force save:', error);
        }
    }

    async updateHiscores(forceUpdate = false) {
    if (this.isOfflineMode || !this.currentUser) return;
    
    // Throttle updates unless forced
    const now = Date.now();
    if (!forceUpdate && this.lastHiscoresUpdate && (now - this.lastHiscoresUpdate < 5 * 60 * 1000)) {
        return; // Skip if updated within last 5 minutes
    }
    
    try {
        const hiscoreData = {
            uid: this.currentUser.uid,
            username: this.username,
            
            // Overall stats
            totalLevel: skills.getTotalLevel(),
            totalXp: this.calculateTotalXp(),
            
            // Track when milestones were first reached
            totalLevelFirstReached: null, // Will be set by cloud function if new record
            
            // Tasks
            tasksCompleted: window.runeCreditManager ? runeCreditManager.totalTasksCompleted : 0,
            tasksFirstReached: null,
            
            // Pets
            petsTotal: 0,
            petsShiny: 0,
            petsFirstReached: null,
            shinyPetsFirstReached: null,
            
            // Update timestamp
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Calculate pet totals
        if (window.runeCreditManager && runeCreditManager.petCounts) {
            for (const skillCounts of Object.values(runeCreditManager.petCounts)) {
                hiscoreData.petsTotal += (skillCounts.regular || 0) + (skillCounts.shiny || 0);
                hiscoreData.petsShiny += (skillCounts.shiny || 0);
            }
        }
        
        // Add individual skill data
        for (const [skillId, skill] of Object.entries(skills.skills)) {
            hiscoreData[`level_${skillId}`] = skill.level;
            hiscoreData[`xp_${skillId}`] = Math.floor(skill.xp);
            hiscoreData[`levelFirst_${skillId}`] = null; // Will be set by cloud function if new record
        }
        
        // Use merge to preserve "firstReached" timestamps
        await this.db.collection('hiscores').doc(this.currentUser.uid).set(hiscoreData, { merge: true });
        
        this.lastHiscoresUpdate = now;
        console.log('Hiscores updated');
    } catch (error) {
        console.error('Failed to update hiscores:', error);
    }
}

// Helper to calculate total XP
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
