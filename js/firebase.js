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

        // Set up auth state listener
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUsername();
                console.log('User logged in:', this.username);
            } else {
                this.currentUser = null;
                this.username = null;
            }
        });
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

        // Reserve username and create user document
        await this.reserveUsername(username, user.uid);
        await this.db.collection('users').doc(user.uid).set({
            username: username,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
        });

        this.currentUser = user;
        this.username = username;

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
        
        // Update last played
        await this.db.collection('users').doc(userCredential.user.uid).update({
            lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
        });

        this.currentUser = userCredential.user;
        this.username = username;

        return userCredential.user;
    }

    // Logout
    async logout() {
        // Save before logout
        if (!this.isOfflineMode) {
            await this.saveGame();
        }
        
        await this.auth.signOut();
        this.currentUser = null;
        this.username = null;
        
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
            
            // Save to Firestore
            await this.db.collection('saves').doc(this.currentUser.uid).set({
                ...saveData,
                username: this.username,
                lastSaved: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.lastSaveTime = now;
            this.showSaveIndicator();
            console.log('Game saved successfully');
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
            this.applySaveData(saveData);
            
            console.log('Game loaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            return false;
        }
    }

    // Collect all game data for saving
    collectSaveData() {
        const saveData = {
            // Player data
            player: {
                position: player.position,
                currentNode: player.currentNode,
                targetNode: player.targetNode
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
            
            // Save to Firestore immediately
            await this.db.collection('saves').doc(this.currentUser.uid).set({
                ...saveData,
                username: this.username,
                lastSaved: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.lastSaveTime = Date.now();
            console.log('Force save completed (task completion)');
        } catch (error) {
            console.error('Failed to force save:', error);
        }
    }
}

// Create global instance
window.firebaseManager = new FirebaseManager();
