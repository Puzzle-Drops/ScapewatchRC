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
        // TODO: Replace with your Firebase config from Firebase Console
        const firebaseConfig = {
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_AUTH_DOMAIN",
            projectId: "YOUR_PROJECT_ID",
            storageBucket: "YOUR_STORAGE_BUCKET",
            messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
            appId: "YOUR_APP_ID"
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
            
            // RuneCred system (if persistence is enabled)
            runeCred: null
        };

        // Collect skill data
        for (const [skillId, skill] of Object.entries(skills.skills)) {
            saveData.skills[skillId] = {
                level: skill.level,
                xp: skill.xp
            };
        }

        // Save RuneCred data if persistence is enabled
        if (window.runeCreditManager && runeCreditManager.enablePersistence) {
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
        // Load player position
        if (saveData.player) {
            player.position = saveData.player.position;
            player.currentNode = saveData.player.currentNode;
            player.targetNode = saveData.player.targetNode;
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
            // Enable persistence for RuneCred
            runeCreditManager.enablePersistence = true;
            
            // Load all the RuneCred data
            Object.assign(runeCreditManager, saveData.runeCred);
            
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
}

// Create global instance
window.firebaseManager = new FirebaseManager();
