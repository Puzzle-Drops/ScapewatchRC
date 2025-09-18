// In firebase.js, add these methods to handle local task storage:

// Add these properties to the FirebaseManager constructor:
constructor() {
    // ... existing properties ...
    this.MAX_FIREBASE_TASKS = 500; // Maximum tasks to store in Firebase
    this.localTasksKey = null; // Will be set to 'completedTasks_[uid]' when user logs in
}

// Add method to get local storage key for current user
getLocalTasksKey() {
    if (!this.currentUser) return null;
    return `completedTasks_${this.currentUser.uid}`;
}

// Add method to save completed tasks locally
saveCompletedTasksLocally() {
    if (!this.currentUser || !window.taskManager) return;
    
    const key = this.getLocalTasksKey();
    if (!key) return;
    
    try {
        // Save ALL completed tasks to localStorage
        localStorage.setItem(key, JSON.stringify(taskManager.completedTasks));
        console.log(`Saved ${taskManager.completedTasks.length} completed tasks locally`);
    } catch (error) {
        console.error('Failed to save tasks locally:', error);
        // If localStorage is full, we could implement cleanup here
    }
}

// Add method to load completed tasks from local storage
loadCompletedTasksLocally() {
    if (!this.currentUser) return [];
    
    const key = this.getLocalTasksKey();
    if (!key) return [];
    
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const tasks = JSON.parse(stored);
            console.log(`Loaded ${tasks.length} completed tasks from local storage`);
            return tasks;
        }
    } catch (error) {
        console.error('Failed to load local tasks:', error);
    }
    
    return [];
}

// Add method to merge local and Firebase tasks
mergeCompletedTasks(localTasks, firebaseTasks) {
    // Create a map to deduplicate tasks based on a unique identifier
    // We'll use a combination of skill, nodeId, activityId, and timestamp
    const taskMap = new Map();
    
    // Helper to create unique task key
    const getTaskKey = (task) => {
        return `${task.skill}_${task.nodeId}_${task.activityId}_${task.timestamp || ''}`;
    };
    
    // Add Firebase tasks first (these are the most recent 500)
    firebaseTasks.forEach(task => {
        taskMap.set(getTaskKey(task), task);
    });
    
    // Add local tasks (older ones that might not be in Firebase)
    localTasks.forEach(task => {
        const key = getTaskKey(task);
        if (!taskMap.has(key)) {
            taskMap.set(key, task);
        }
    });
    
    // Convert back to array and sort by timestamp (if available)
    const merged = Array.from(taskMap.values());
    
    // Sort by timestamp if tasks have them, otherwise maintain order
    if (merged.length > 0 && merged[0].timestamp) {
        merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    
    console.log(`Merged tasks: ${localTasks.length} local + ${firebaseTasks.length} Firebase = ${merged.length} total`);
    return merged;
}

// Modified collectSaveData to only include recent tasks:
collectSaveData() {
    // Invalidate any caches to ensure fresh data
    if (window.taskManager) {
        taskManager.invalidateCache();
        // Force update task progress one final time before saving
        taskManager.updateAllProgress();
    }
    
    // Get only the most recent tasks for Firebase
    let recentCompletedTasks = [];
    if (window.taskManager && taskManager.completedTasks) {
        // Take only the most recent MAX_FIREBASE_TASKS
        recentCompletedTasks = taskManager.completedTasks.slice(-this.MAX_FIREBASE_TASKS);
        console.log(`Saving ${recentCompletedTasks.length} of ${taskManager.completedTasks.length} tasks to Firebase`);
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
        
        // Task system - now includes only recent completed tasks
        tasks: {
            current: taskManager.currentTask,
            next: taskManager.nextTask,
            queue: taskManager.tasks,
            completed: recentCompletedTasks // Only the most recent 500
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

// Modified saveGame method:
async saveGame() {
    if (this.isOfflineMode || !this.currentUser || !this.connectionHealthy) return;

    // Prevent saving too frequently (10 minutes throttle for normal saves)
    const now = Date.now();
    if (now - this.lastSaveTime < this.SAVE_INTERVAL) {
        console.log(`Save throttled. Next save in ${Math.ceil((this.SAVE_INTERVAL - (now - this.lastSaveTime)) / 1000)} seconds`);
        return;
    }
    
    try {
        // Save ALL completed tasks locally first
        this.saveCompletedTasksLocally();
        
        // Collect save data (includes only recent 500 tasks)
        const saveData = this.collectSaveData();
        
        // Clean undefined values before saving
        const cleanedSaveData = this.cleanUndefinedValues(saveData);
        
        // Save to Firestore with organized field order for readability
        await setDoc(doc(this.db, 'saves', this.currentUser.uid), {
            // User info at the very top
            username: this.username,
            uid: this.currentUser.uid,
            
            // Timestamp info next
            lastSaved: serverTimestamp(),
            sessionId: this.sessionId,
            
            // Then all game data (with only recent 500 tasks)
            ...cleanedSaveData
        });

        this.lastSaveTime = now;
        this.showSaveIndicator();
        console.log('Game saved successfully');
        
        // Update hi-scores after successful save
        await this.updateHiscores();
    } catch (error) {
        console.error('Failed to save game:', error);
        this.handleConnectionError(error);
    }
}

// Modified forceSave method:
async forceSave() {
    if (this.isOfflineMode || !this.currentUser) return;

    try {
        // Save ALL completed tasks locally first
        this.saveCompletedTasksLocally();
        
        // Collect save data (includes only recent 500 tasks)
        const saveData = this.collectSaveData();
        
        // Clean undefined values before saving
        const cleanedSaveData = this.cleanUndefinedValues(saveData);
        
        // Save to Firestore immediately with organized field order
        await setDoc(doc(this.db, 'saves', this.currentUser.uid), {
            // User info at the very top
            username: this.username,
            uid: this.currentUser.uid,
            
            // Timestamp info next
            lastSaved: serverTimestamp(),
            sessionId: this.sessionId,
            
            // Then all game data (with only recent 500 tasks)
            ...cleanedSaveData
        });

        console.log('Force save completed (logout/task completion)');
        
        // Update hi-scores after force save too
        await this.updateHiscores(true);
    } catch (error) {
        console.error('Failed to force save:', error);
    }
}

// Modified applySaveData to handle merged tasks:
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

    // Load tasks with merged completed tasks
    if (saveData.tasks) {
        taskManager.currentTask = saveData.tasks.current;
        taskManager.nextTask = saveData.tasks.next;
        taskManager.tasks = saveData.tasks.queue || [];
        
        // Load local completed tasks
        const localTasks = this.loadCompletedTasksLocally();
        const firebaseTasks = saveData.tasks.completed || [];
        
        // Merge local and Firebase tasks
        taskManager.completedTasks = this.mergeCompletedTasks(localTasks, firebaseTasks);
        
        // Save the merged list locally to ensure we have the complete history
        this.saveCompletedTasksLocally();
        
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
