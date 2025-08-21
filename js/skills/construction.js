class ConstructionSkill extends BaseSkill {
    constructor() {
        super('construction', 'Construction');
        this.requiresBankingBeforeTask = true;
        this.isProcessingSkill = true;
        this.lastConstructionXp = 0;
        this.currentRecipe = null;
        this.hasBankedForTask = false;
        this.currentTaskId = null;
        
        // Remote banking state
        this.isRemoteBanking = false;
        this.remoteBankEndTime = 0;
        this.remoteBankDuration = 5000; // 5 seconds
        this.plankCost = 25; // Gold per plank for remote banking
        
        // State tracking to prevent duplicate starts
        this.isBuilding = false;
        this.buildingTaskId = null;
        this.buildingStartTime = 0;
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    initializeSkillData() {
        // Task data - tracking TABLES BUILT (not planks)
        this.SKILL_DATA = [
            { itemId: 'wood_table',     name: 'Wood tables',     minCount: 20, maxCount: 40, level: 1  },
            { itemId: 'oak_table',      name: 'Oak tables',      minCount: 20, maxCount: 40, level: 22 },
            { itemId: 'teak_table',     name: 'Teak tables',     minCount: 20, maxCount: 40, level: 38 },
            { itemId: 'mahogany_table', name: 'Mahogany tables', minCount: 20, maxCount: 40, level: 52 }
        ];
        
        // Table building recipes
        this.tableRecipes = {
            'wood_table': {
                inputs: [{ itemId: 'plank', quantity: 5 }],
                output: { itemId: 'wood_table', quantity: 1 }, // Virtual item
                level: 1,
                xp: 140,
                duration: 3000,
                plankType: 'plank'
            },
            'oak_table': {
                inputs: [{ itemId: 'oak_plank', quantity: 5 }],
                output: { itemId: 'oak_table', quantity: 1 },
                level: 22,
                xp: 300,
                duration: 3000,
                plankType: 'oak_plank'
            },
            'teak_table': {
                inputs: [{ itemId: 'teak_plank', quantity: 5 }],
                output: { itemId: 'teak_table', quantity: 1 },
                level: 38,
                xp: 450,
                duration: 3000,
                plankType: 'teak_plank'
            },
            'mahogany_table': {
                inputs: [{ itemId: 'mahogany_plank', quantity: 5 }],
                output: { itemId: 'mahogany_table', quantity: 1 },
                level: 52,
                xp: 700,
                duration: 3000,
                plankType: 'mahogany_plank'
            }
        };
    }
    
    // ==================== TASK GENERATION ====================
    
    generateTask() {
        // Get available table types we can build
        const availableTables = this.getAvailableTables();
        
        if (availableTables.length === 0) {
            console.log('No construction materials available for tasks');
            return null;
        }
        
        // Filter out tables that already have tasks
        const filteredTables = this.filterOutExistingTasks(availableTables);
        
        if (filteredTables.length === 0) {
            console.log('All available table types already have tasks');
            return null;
        }
        
        // Select a table type using weighted distribution
        const selectedTable = this.selectWeightedTable(filteredTables);
        if (!selectedTable) {
            console.log('Failed to select table for construction');
            return null;
        }
        
        // Find construction node (Rimmington House)
        const constructionNode = 'rimmington_house'; // Will be added to nodes.json
        
        // Determine target count (tables to build)
        const desiredCount = this.determineTargetCount(selectedTable.tableId);
        const targetCount = Math.min(desiredCount, selectedTable.maxBuildable);
        
        // Don't create tasks for very small amounts
        if (targetCount < 5) {
            console.log(`Not enough resources for construction task (only ${selectedTable.maxBuildable} tables possible)`);
            return null;
        }
        
        // Create the construction task
        return {
            skill: this.id,
            itemId: selectedTable.tableId, // Track table type
            targetCount: targetCount,
            nodeId: constructionNode,
            activityId: 'build_tables',
            description: `Construct ${targetCount} ${selectedTable.tableName.toLowerCase()} at the Rimmington House`,
            startingCount: 0,
            progress: 0,
            isConstructionTask: true,
            tablesBuilt: 0,
            recipe: selectedTable.recipe,
            plankType: selectedTable.recipe.plankType,
            planksPerTable: 5,
            totalPlanksNeeded: targetCount * 5
        };
    }
    
    getAvailableTables() {
        const availableTables = [];
        const constructionLevel = skills.getLevel('construction');
        
        // Try each table type from highest to lowest level
        const tableTypes = ['mahogany_table', 'teak_table', 'oak_table', 'wood_table'];
        
        for (const tableId of tableTypes) {
            const recipe = this.tableRecipes[tableId];
            if (!recipe || constructionLevel < recipe.level) continue;
            
            // Check planks and gold available
            const plankType = recipe.plankType;
            const planksInBank = bank.getItemCount(plankType);
            const goldInBank = bank.getItemCount('coins');
            
            // Calculate how many tables we can build
            const tablesFromPlanks = Math.floor(planksInBank / 5);
            // Require DOUBLE the gold needed for task generation
            const goldNeeded = planksInBank * this.plankCost * 2;
            const hasEnoughGold = goldInBank >= goldNeeded;
            
            if (tablesFromPlanks > 0 && hasEnoughGold) {
                const skillData = this.SKILL_DATA.find(d => d.itemId === tableId);
                availableTables.push({
                    tableId: tableId,
                    tableName: skillData ? skillData.name : tableId,
                    recipe: recipe,
                    maxBuildable: tablesFromPlanks,
                    planksAvailable: planksInBank,
                    goldAvailable: goldInBank,
                    requiredLevel: recipe.level
                });
            }
        }
        
        return availableTables;
    }
    
    filterOutExistingTasks(availableTables) {
        if (!window.taskManager) return availableTables;
        
        const filtered = [];
        const existingTasks = taskManager.getAllTasks();
        
        for (const table of availableTables) {
            const existingTask = existingTasks.find(task => 
                task.isConstructionTask && 
                task.itemId === table.tableId &&
                task.progress < 1
            );
            
            if (existingTask) {
                // Only allow if we have 10x the resources needed
                const typicalTaskSize = this.determineTargetCount(table.tableId);
                const planksNeeded = typicalTaskSize * 5 * 10; // 10x task worth
                
                if (table.planksAvailable >= planksNeeded) {
                    console.log(`Allowing duplicate task for ${table.tableId} - have ${table.planksAvailable} planks`);
                    filtered.push(table);
                }
            } else {
                filtered.push(table);
            }
        }
        
        return filtered;
    }
    
    selectWeightedTable(availableTables) {
        if (availableTables.length === 0) return null;
        
        // Use RuneCred weights if available
        if (window.runeCreditManager) {
            const weightedTables = [];
            let totalWeight = 0;
            
            for (const table of availableTables) {
                const weight = runeCreditManager.getTaskWeight(this.id, table.tableId);
                totalWeight += weight;
                weightedTables.push({ table, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedTables) {
                if (random < weighted.weight) {
                    return weighted.table;
                }
            }
            
            return availableTables[0];
        }
        
        // Default: pick highest level table available
        return availableTables[0];
    }
    
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
    
    getTaskVerb() {
        return 'Construct';
    }
    
    // ==================== PROCESSING SKILL INTERFACE ====================
    
    hasMaterialsForCurrentTask() {
        if (!window.ai || !window.ai.currentTask || !window.ai.currentTask.isConstructionTask) {
            return false;
        }
        
        const task = window.ai.currentTask;
        const hasEnoughPlanks = inventory.getItemCount(task.plankType) >= 5;
        
        return hasEnoughPlanks;
    }
    
    getMaterialsNeededForTask(task) {
        if (!task || !task.isConstructionTask) return null;
        
        const tablesRemaining = task.targetCount - (task.tablesBuilt || 0);
        
        return {
            itemId: task.plankType,
            quantity: tablesRemaining * 5
        };
    }
    
    // ==================== REMOTE BANKING ====================
    
    canRemoteBank() {
        // Check if we're already remote banking
        if (this.isRemoteBanking) return false;
        
        // Check if we have gold in inventory
        const goldInInventory = inventory.getItemCount('coins');
        if (goldInInventory < this.plankCost) {
            console.log('Not enough gold for remote banking');
            return false;
        }
        
        return true;
    }
    
    startRemoteBanking(plankType, quantity) {
        if (!this.canRemoteBank()) return false;
        
        const goldNeeded = quantity * this.plankCost;
        const goldInInventory = inventory.getItemCount('coins');
        
        if (goldInInventory < goldNeeded) {
            console.log(`Need ${goldNeeded} gold for ${quantity} planks, have ${goldInInventory}`);
            return false;
        }
        
        // Check bank has planks
        const planksInBank = bank.getItemCount(plankType);
        const planksToWithdraw = Math.min(quantity, planksInBank);
        
        if (planksToWithdraw === 0) {
            console.log(`No ${plankType} in bank for remote banking`);
            return false;
        }
        
        // Start remote banking animation
        this.isRemoteBanking = true;
        this.remoteBankEndTime = Date.now() + this.remoteBankDuration;
        
        // Notify player for animation
        if (window.player) {
            player.startRemoteBanking(this.remoteBankDuration);
        }
        
        console.log(`Remote banking ${planksToWithdraw} ${plankType} for ${planksToWithdraw * this.plankCost} gold`);
        
        // Schedule the actual transaction
        setTimeout(() => {
            // Consume gold
            inventory.removeItem('coins', planksToWithdraw * this.plankCost);
            
            // Withdraw planks from bank
            const withdrawn = bank.withdrawUpTo(plankType, planksToWithdraw);
            if (withdrawn > 0) {
                inventory.addItem(plankType, withdrawn);
                console.log(`Remote banked ${withdrawn} ${plankType}`);
            }
            
            // Clear remote banking state
            this.isRemoteBanking = false;
            
            // Resume construction
            if (window.ai) {
                window.ai.decisionCooldown = 0;
            }
        }, this.remoteBankDuration);
        
        return true;
    }
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        // Check if we're remote banking
        if (this.isRemoteBanking) {
            const remainingTime = this.remoteBankEndTime - Date.now();
            if (remainingTime > 0) {
                return 999999; // Prevent activity during remote banking
            } else {
                this.isRemoteBanking = false;
            }
        }
        
        // Construction is always 3000ms
        let duration = 3000;
        
        // Apply speed bonus
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus);
        }
        
        return duration;
    }
    
    beforeActivityStart(activityData) {
        // Check if remote banking
        if (this.isRemoteBanking) {
            const remainingTime = Math.ceil((this.remoteBankEndTime - Date.now()) / 1000);
            console.log(`Remote banking for ${remainingTime} more seconds`);
            return false;
        }
        
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
        
        // Check if we need remote banking (less than 5 planks)
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isConstructionTask) {
            const task = window.ai.currentTask;
            const planksInInventory = inventory.getItemCount(task.plankType);
            
            if (planksInInventory < 5) {
                // Need remote banking
                console.log(`Only ${planksInInventory} planks, need remote banking`);
                
                // Calculate how many planks we need for remaining tables
                const tablesRemaining = task.targetCount - (task.tablesBuilt || 0);
                const planksNeeded = Math.min(tablesRemaining * 5, 140); // Max inventory space
                
                if (this.startRemoteBanking(task.plankType, planksNeeded)) {
                    return false; // Don't start activity, we're remote banking
                } else {
                    // Can't remote bank - task impossible
                    console.log('Cannot remote bank for more planks');
                    if (window.ai) {
                        window.ai.decisionCooldown = 0;
                    }
                    return false;
                }
            }
            
            // Store recipe
            this.currentRecipe = task.recipe;
        } else {
            // No task, find any recipe we can do
            const recipe = this.findRecipeToProcess();
            if (!recipe) {
                console.log('No construction recipe available');
                this.clearBuildingState();
                if (window.ai) {
                    window.ai.decisionCooldown = 0;
                }
                return false;
            }
            this.currentRecipe = recipe;
        }
        
        // Check we have materials
        if (!inventory.hasItem(this.currentRecipe.plankType, 5)) {
            console.log(`Missing planks for construction`);
            this.clearBuildingState();
            if (window.ai) {
                window.ai.decisionCooldown = 0;
            }
            return false;
        }
        
        // Set building state
        this.isBuilding = true;
        this.buildingStartTime = Date.now();
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isConstructionTask) {
            this.buildingTaskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
        } else {
            this.buildingTaskId = null;
        }
        
        console.log(`Starting to build ${this.currentRecipe.output.itemId}`);
        
        return true;
    }
    
    processRewards(activityData, level) {
        this.clearBuildingState();
        
        if (!this.currentRecipe) {
            this.lastConstructionXp = 0;
            return [];
        }
        
        // Consume planks
        inventory.removeItem(this.currentRecipe.plankType, 5);
        
        // Construction always succeeds
        this.lastConstructionXp = this.currentRecipe.xp;
        
        // Update task progress
        this.updateConstructionTaskProgress();
        
        // We don't actually create table items
        return [];
    }
    
    shouldGrantXP(rewards, activityData) {
        return this.lastConstructionXp > 0;
    }
    
    getXpToGrant(rewards, activityData) {
        return this.lastConstructionXp || 0;
    }
    
    findRecipeToProcess() {
        const level = skills.getLevel('construction');
        
        // Find first recipe we can do
        for (const recipe of Object.values(this.tableRecipes)) {
            if (level >= recipe.level && inventory.hasItem(recipe.plankType, 5)) {
                return recipe;
            }
        }
        
        return null;
    }
    
    canPerformActivity(activityId) {
        if (activityId !== 'build_tables') return false;
        
        const level = skills.getLevel('construction');
        const recipe = this.findRecipeToProcess();
        
        return recipe !== null && !this.isRemoteBanking;
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
        
        // Check if we have planks in inventory
        const planksInInventory = inventory.getItemCount(task.plankType);
        if (planksInInventory < 5) {
            console.log(`Need banking: only ${planksInInventory} planks in inventory`);
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
            // Calculate planks needed for whole task
            const tablesRemaining = task.targetCount - (task.tablesBuilt || 0);
            const planksNeeded = tablesRemaining * 5;
            
            // Withdraw all coins first (for remote banking)
            const coinsInBank = bank.getItemCount('coins');
            if (coinsInBank > 0) {
                const coinsWithdrawn = bank.withdrawUpTo('coins', coinsInBank);
                if (coinsWithdrawn > 0) {
                    inventory.addItem('coins', coinsWithdrawn);
                    console.log(`Withdrew ${coinsWithdrawn} coins for remote banking`);
                    withdrawnAny = true;
                }
            }
            
            // Withdraw planks (up to 27 since coins take 1 slot)
            const planksToWithdraw = Math.min(planksNeeded, 27);
            const planksWithdrawn = bank.withdrawUpTo(task.plankType, planksToWithdraw);
            
            if (planksWithdrawn > 0) {
                inventory.addItem(task.plankType, planksWithdrawn);
                console.log(`Withdrew ${planksWithdrawn} ${task.plankType} for construction`);
                withdrawnAny = true;
            } else {
                console.log(`No ${task.plankType} in bank for construction task`);
                return false;
            }
            
            // Check if we have enough gold for the task
            const goldNeeded = planksNeeded * this.plankCost;
            const goldInInventory = inventory.getItemCount('coins');
            
            if (goldInInventory < goldNeeded) {
                console.log(`Not enough gold for task (need ${goldNeeded}, have ${goldInInventory})`);
                return false;
            }
        }
        
        return withdrawnAny;
    }
    
    canContinueTask(task) {
        if (!task || !task.isConstructionTask) return true;
        
        // Check if we have enough resources
        const tablesRemaining = task.targetCount - (task.tablesBuilt || 0);
        const planksNeeded = tablesRemaining * 5;
        const goldNeeded = planksNeeded * this.plankCost;
        
        const totalPlanks = inventory.getItemCount(task.plankType) + bank.getItemCount(task.plankType);
        const totalGold = inventory.getItemCount('coins') + bank.getItemCount('coins');
        
        if (totalPlanks < 5 || totalGold < this.plankCost * 5) {
            console.log(`Cannot continue construction - insufficient resources`);
            this.hasBankedForTask = false;
            this.currentTaskId = null;
            this.clearBuildingState();
            return false;
        }
        
        return true;
    }
    
    hasMaterials() {
        const level = skills.getLevel('construction');
        
        for (const recipe of Object.values(this.tableRecipes)) {
            if (level >= recipe.level && inventory.hasItem(recipe.plankType, 5)) {
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
                // Check if we need more planks
                if (!this.hasMaterialsForCurrentTask()) {
                    console.log('Construction task needs more planks');
                    // Don't clear banking flag - we'll remote bank
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
