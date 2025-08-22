class ConstructionSkill extends BaseSkill {
    constructor() {
        super('construction', 'Construction');
        this.requiresBankingBeforeTask = true; // Always bank before construction
        this.isProcessingSkill = true;
        this.lastConstructionXp = 0;
        this.currentRecipe = null;
        this.hasBankedForTask = false;
        this.currentTaskId = null;
        
        // State tracking to prevent duplicate starts
        this.isBuilding = false;
        this.buildingTaskId = null;
        this.buildingStartTime = 0;
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    initializeSkillData() {
        // Task data - in multiples of 5 tables (25-50 planks)
        this.SKILL_DATA = [
            { itemId: 'plank',          name: 'Wood tables',     minCount: 5, maxCount: 10, level: 1  },
            { itemId: 'oak_plank',      name: 'Oak tables',      minCount: 5, maxCount: 10, level: 22 },
            { itemId: 'teak_plank',     name: 'Teak tables',     minCount: 5, maxCount: 10, level: 38 },
            { itemId: 'mahogany_plank', name: 'Mahogany tables', minCount: 5, maxCount: 10, level: 52 }
        ];
        
        // Building recipes - all consume 5 planks per table
        this.buildingRecipes = {
            'plank': {
                inputs: [{ itemId: 'plank', quantity: 5 }],
                output: null, // No actual item output
                level: 1,
                xp: 140,
                duration: 3000,
                tableName: 'wood table'
            },
            'oak_plank': {
                inputs: [{ itemId: 'oak_plank', quantity: 5 }],
                output: null,
                level: 22,
                xp: 300,
                duration: 3000,
                tableName: 'oak table'
            },
            'teak_plank': {
                inputs: [{ itemId: 'teak_plank', quantity: 5 }],
                output: null,
                level: 38,
                xp: 450,
                duration: 3000,
                tableName: 'teak table'
            },
            'mahogany_plank': {
                inputs: [{ itemId: 'mahogany_plank', quantity: 5 }],
                output: null,
                level: 52,
                xp: 700,
                duration: 3000,
                tableName: 'mahogany table'
            }
        };
    }

    // ==================== UI DISPLAY METHODS ====================

// Override to prevent base class from replacing our table names with plank names
getAllPossibleTasksForUI() {
    const tasks = [];
    
    for (const data of this.SKILL_DATA) {
        tasks.push({
            itemId: data.itemId,
            displayName: data.name, // Use our SKILL_DATA names (e.g., "Teak tables")
            minCount: data.minCount,
            maxCount: data.maxCount,
            requiredLevel: data.level
        });
    }
    
    return tasks;
}
    
    // ==================== TASK GENERATION ====================
    
    generateTask() {
        // Get available planks from bank + inventory
        const availablePlanks = this.getAvailablePlanks();
        
        if (availablePlanks.length === 0) {
            console.log('No planks available for construction tasks');
            return null;
        }
        
        // Filter out items that already have construction tasks
        const filteredPlanks = this.filterOutExistingTasks(availablePlanks);
        
        if (filteredPlanks.length === 0) {
            console.log('All available planks already have tasks');
            return null;
        }
        
        // Select a plank type using weighted distribution
        const selectedPlank = this.selectWeightedPlank(filteredPlanks);
        if (!selectedPlank) {
            console.log('Failed to select plank for construction');
            return null;
        }
        
        // Find construction nodes
        const constructionNodes = this.findConstructionNodes();
        if (constructionNodes.length === 0) {
            console.log('No construction locations available');
            return null;
        }
        
        // Select a construction location (could be weighted in future)
        const selectedNode = constructionNodes[Math.floor(Math.random() * constructionNodes.length)];
        
        // Determine target count (in tables)
        const desiredTables = this.determineTargetCount(selectedPlank.plankId);
        const planksNeeded = desiredTables * 5;
        const targetTables = Math.min(desiredTables, Math.floor(selectedPlank.available / 5));
        
        // Don't create tasks for very small amounts
        if (targetTables < 1) {
            console.log(`Not enough ${selectedPlank.plankId} for a task (only ${selectedPlank.available} available, need at least 5)`);
            return null;
        }
        
        // Get item names
        const recipe = this.buildingRecipes[selectedPlank.plankId];
        const nodeData = nodes.getNode(selectedNode.nodeId);
        
        // Create the construction task
        return {
            skill: this.id,
            itemId: selectedPlank.plankId, // Track plank consumption
            targetCount: targetTables, // Number of tables to build
            nodeId: selectedNode.nodeId,
            activityId: selectedNode.activityId,
            description: `Construct ${targetTables} ${recipe.tableName}s at ${nodeData.name}`,
            startingCount: 0,
            progress: 0,
            isConstructionTask: true, // Flag to identify construction tasks
            tablesBuilt: 0, // Track tables built
            recipe: recipe
        };
    }
    
    // Get all available planks
    getAvailablePlanks() {
        const availablePlanks = [];
        const constructionLevel = skills.getLevel('construction');
        
        for (const [plankId, recipe] of Object.entries(this.buildingRecipes)) {
            if (constructionLevel < recipe.level) continue;
            
            // Check how much of this plank we have
            const inInventory = inventory.getItemCount(plankId);
            const inBank = bank.getItemCount(plankId);
            const total = inInventory + inBank;
            
            if (total >= 5) { // Need at least 5 planks for 1 table
                availablePlanks.push({
                    plankId: plankId,
                    available: total,
                    requiredLevel: recipe.level
                });
            }
        }
        
        return availablePlanks;
    }
    
    // Filter out planks that already have tasks
    filterOutExistingTasks(availablePlanks) {
        if (!window.taskManager) return availablePlanks;
        
        const filtered = [];
        const existingTasks = taskManager.getAllTasks();
        
        for (const plank of availablePlanks) {
            // Check if there's already a construction task for this plank
            const existingTask = existingTasks.find(task => 
                task.isConstructionTask && 
                task.itemId === plank.plankId &&
                task.progress < 1
            );
            
            if (existingTask) {
                // Only allow if we have 10x the amount needed for a typical task
                const typicalTaskSize = this.determineTargetCount(plank.plankId) * 5; // Convert tables to planks
                const safeAmount = typicalTaskSize * 10;
                
                if (plank.available >= safeAmount) {
                    console.log(`Allowing duplicate task for ${plank.plankId} - have ${plank.available}, safe threshold is ${safeAmount}`);
                    filtered.push(plank);
                } else {
                    console.log(`Filtering out ${plank.plankId} - already has task and only ${plank.available} available`);
                }
            } else {
                // No existing task for this item, safe to use
                filtered.push(plank);
            }
        }
        
        return filtered;
    }
    
    // Select plank using weighted distribution
    selectWeightedPlank(availablePlanks) {
        if (availablePlanks.length === 0) return null;
        
        // Use RuneCred weights if available
        if (window.runeCreditManager) {
            const weightedPlanks = [];
            let totalWeight = 0;
            
            for (const plank of availablePlanks) {
                const weight = runeCreditManager.getTaskWeight(this.id, plank.plankId);
                totalWeight += weight;
                weightedPlanks.push({ plank, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedPlanks) {
                if (random < weighted.weight) {
                    return weighted.plank;
                }
            }
            
            return availablePlanks[0];
        }
        
        // Default: equal weights
        return availablePlanks[Math.floor(Math.random() * availablePlanks.length)];
    }
    
    // Find nodes where we can build tables
    findConstructionNodes() {
        const constructionNodes = [];
        const allNodes = nodes.getAllNodes();
        
        for (const [nodeId, node] of Object.entries(allNodes)) {
            if (!node.activities) continue;
            
            if (node.activities.includes('build_tables')) {
                // Check if walkable
                if (window.collision && window.collision.initialized) {
                    if (!collision.isWalkable(Math.floor(node.position.x), Math.floor(node.position.y))) {
                        continue;
                    }
                }
                
                constructionNodes.push({
                    nodeId: nodeId,
                    activityId: 'build_tables'
                });
            }
        }
        
        return constructionNodes;
    }
    
    getTaskVerb() {
        return 'Construct';
    }
    
    // Update construction task progress when we build a table
    updateConstructionTaskProgress() {
        if (!window.taskManager) return;
        
        const currentTask = taskManager.getFirstIncompleteTask();
        
        if (currentTask && currentTask.isConstructionTask) {
            currentTask.tablesBuilt = (currentTask.tablesBuilt || 0) + 1;
            const progress = currentTask.tablesBuilt / currentTask.targetCount;
            
            console.log(`Construction progress: ${currentTask.tablesBuilt}/${currentTask.targetCount} tables built`);
            
            taskManager.setTaskProgress(currentTask, progress);
        }
    }
    
    // ==================== PROCESSING SKILL INTERFACE ====================
    
    hasMaterialsForCurrentTask() {
        if (!window.ai || !window.ai.currentTask || !window.ai.currentTask.isConstructionTask) {
            return false;
        }
        
        const task = window.ai.currentTask;
        const hasPlanks = inventory.hasItem(task.itemId, 5); // Need 5 planks for 1 table
        
        if (!hasPlanks) {
            console.log(`No ${task.itemId} in inventory for construction task (need 5)`);
        }
        
        return hasPlanks;
    }
    
    getMaterialsNeededForTask(task) {
        if (!task || !task.isConstructionTask) return null;
        
        const tablesRemaining = task.targetCount - (task.tablesBuilt || 0);
        
        return {
            itemId: task.itemId,
            quantity: tablesRemaining * 5 // 5 planks per table
        };
    }
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        let duration = 3000; // Construction is always 3000ms base
        
        // Apply speed bonus from RuneCred system
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus);
        }
        
        return duration;
    }
    
    beforeActivityStart(activityData) {
        // Check if already building
        if (this.isBuilding) {
            const currentTime = Date.now();
            const timeBuilding = currentTime - this.buildingStartTime;
            
            if (timeBuilding < 3000) {
                if (window.ai && window.ai.currentTask && window.ai.currentTask.isConstructionTask) {
                    const taskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
                    if (this.buildingTaskId === taskId) {
                        console.log('Already building, rejecting duplicate start');
                        return false;
                    }
                }
            } else {
                console.log('Building took too long, resetting state');
                this.clearBuildingState();
            }
        }
        
        // If we have a construction task, we MUST build that specific table type
        let recipe = null;
        
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isConstructionTask) {
            const taskPlankId = window.ai.currentTask.itemId;
            const level = skills.getLevel('construction');
            
            recipe = this.buildingRecipes[taskPlankId];
            
            if (!recipe || level < recipe.level) {
                console.log(`Cannot build - wrong level for ${taskPlankId}`);
                this.clearBuildingState();
                
                if (window.ai) {
                    window.ai.decisionCooldown = 0;
                }
                
                return false;
            }
            
            // Check if we have the planks
            if (!inventory.hasItem(taskPlankId, 5)) {
                console.log(`Cannot build - need 5 ${taskPlankId} but don't have them`);
                this.clearBuildingState();
                
                if (window.ai) {
                    window.ai.decisionCooldown = 0;
                }
                
                return false;
            }
        } else {
            // No construction task, find any recipe we can do
            recipe = this.findRecipeToBuild();
        }
        
        if (!recipe) {
            console.log('No recipe available to build');
            this.clearBuildingState();
            return false;
        }
        
        // Store recipe
        this.currentRecipe = recipe;
        
        // Set building state
        this.isBuilding = true;
        this.buildingStartTime = Date.now();
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isConstructionTask) {
            this.buildingTaskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
        } else {
            this.buildingTaskId = null;
        }
        
        console.log(`Starting to build ${recipe.tableName}`);
        
        return true;
    }
    
    processRewards(activityData, level) {
        // Clear building state
        this.clearBuildingState();
        
        if (!this.currentRecipe) {
            this.lastConstructionXp = 0;
            return [];
        }
        
        // Consume the planks
        inventory.removeItem(this.currentRecipe.inputs[0].itemId, 5);
        
        // Update task progress
        this.updateConstructionTaskProgress();
        
        // Construction always succeeds
        this.lastConstructionXp = this.currentRecipe.xp;
        
        console.log(`Built ${this.currentRecipe.tableName} for ${this.currentRecipe.xp} XP`);
        
        // No item output for construction
        return [];
    }
    
    shouldGrantXP(rewards, activityData) {
        return this.lastConstructionXp > 0;
    }
    
    getXpToGrant(rewards, activityData) {
        return this.lastConstructionXp || 0;
    }
    
    findRecipeToBuild() {
        const level = skills.getLevel('construction');
        
        // Find first recipe we can do
        for (const [plankId, recipe] of Object.entries(this.buildingRecipes)) {
            if (level >= recipe.level && inventory.hasItem(plankId, 5)) {
                return recipe;
            }
        }
        
        return null;
    }
    
    canPerformActivity(activityId) {
        if (activityId !== 'build_tables') return false;
        
        const recipe = this.findRecipeToBuild();
        return recipe !== null;
    }
    
    clearBuildingState() {
        this.isBuilding = false;
        this.buildingTaskId = null;
        this.buildingStartTime = 0;
    }
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        if (!task || task.skill !== 'construction') return false;
        if (!task.isConstructionTask) return false;
        
        // Check if we have 5 planks for at least one table
        if (!inventory.hasItem(task.itemId, 5)) {
            console.log(`Need banking: need 5 ${task.itemId} for construction`);
            return true;
        }
        
        return false;
    }
    
    handleBanking(task) {
        // Deposit all first
        bank.depositAll();
        console.log('Deposited all items for construction');
        
        // Mark that we've banked
        const taskId = task ? `${task.itemId}_${task.targetCount}_${task.nodeId}` : null;
        this.currentTaskId = taskId;
        this.hasBankedForTask = true;
        
        let withdrawnAny = false;
        
        if (task && task.isConstructionTask) {
            const plankId = task.itemId;
            const bankCount = bank.getItemCount(plankId);
            const tablesRemaining = task.targetCount - (task.tablesBuilt || 0);
            const planksNeeded = tablesRemaining * 5;
            
            if (bankCount > 0 && planksNeeded > 0) {
                // Withdraw up to 25 planks (5 tables worth) or whatever we need/have
                const toWithdraw = Math.min(25, Math.min(bankCount, planksNeeded));
                const withdrawn = bank.withdrawUpTo(plankId, toWithdraw);
                
                if (withdrawn > 0) {
                    inventory.addItem(plankId, withdrawn);
                    const tablesCanBuild = Math.floor(withdrawn / 5);
                    console.log(`Withdrew ${withdrawn} ${plankId} for ${tablesCanBuild} tables`);
                    withdrawnAny = true;
                }
            } else {
                console.log(`No ${plankId} in bank for construction task`);
            }
        }
        
        return withdrawnAny;
    }
    
    canContinueTask(task) {
        if (!task || !task.isConstructionTask) return true;
        
        // Check if we have enough planks remaining
        const currentPlanks = inventory.getItemCount(task.itemId) + bank.getItemCount(task.itemId);
        const tablesRemaining = task.targetCount - (task.tablesBuilt || 0);
        const planksNeeded = tablesRemaining * 5;
        
        if (currentPlanks < 5) {
            console.log(`Cannot continue construction task - need at least 5 ${task.itemId}, have ${currentPlanks}`);
            this.hasBankedForTask = false;
            this.currentTaskId = null;
            this.clearBuildingState();
            return false;
        }
        
        return true;
    }
    
    hasMaterials() {
        // Check if we have any planks to build with
        const level = skills.getLevel('construction');
        
        for (const [plankId, recipe] of Object.entries(this.buildingRecipes)) {
            if (level >= recipe.level && inventory.hasItem(plankId, 5)) {
                return true;
            }
        }
        
        return false;
    }
    
    onActivityComplete(activityData) {
        this.clearBuildingState();
        
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isConstructionTask) {
            if (window.ai.currentTask.progress >= 1) {
                console.log('Construction task complete, resetting banking state');
                this.hasBankedForTask = false;
                this.currentTaskId = null;
            } else {
                // Check if we need to bank for more planks
                if (!inventory.hasItem(window.ai.currentTask.itemId, 5)) {
                    console.log('Construction task needs more planks');
                    this.hasBankedForTask = false;
                    
                    if (window.ai) {
                        window.ai.decisionCooldown = 0;
                    }
                }
            }
        }
    }
    
    onActivityStopped() {
        console.log('Construction activity was stopped, clearing state');
        this.clearBuildingState();
    }
}
