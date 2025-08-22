class FarmingSkill extends BaseSkill {
    constructor() {
        super('farming', 'Farming');
        this.requiresBankingBeforeTask = true; // Always bank before farming
        this.isProcessingSkill = true;
        this.lastFarmingXp = 0;
        this.currentSeed = null;
        this.hasBankedForTask = false;
        this.currentTaskId = null;
        
        // State tracking to prevent duplicate planting
        this.isPlanting = false;
        this.plantingTaskId = null;
        this.plantingStartTime = 0;
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    initializeSkillData() {
        // All seed tasks with quantities 1-5
        this.SKILL_DATA = [
            { itemId: 'potato_seed',        name: 'Potato seeds',        minCount: 1, maxCount: 5, level: 1  },
            { itemId: 'guam_seed',          name: 'Guam seeds',          minCount: 1, maxCount: 5, level: 1  },
            { itemId: 'marrentill_seed',    name: 'Marrentill seeds',    minCount: 1, maxCount: 5, level: 14 },
            { itemId: 'tarromin_seed',      name: 'Tarromin seeds',      minCount: 1, maxCount: 5, level: 19 },
            { itemId: 'limpwurt_seed',      name: 'Limpwurt seeds',      minCount: 1, maxCount: 5, level: 26 },
            { itemId: 'harralander_seed',   name: 'Harralander seeds',   minCount: 1, maxCount: 5, level: 26 },
            { itemId: 'ranarr_seed',        name: 'Ranarr seeds',        minCount: 1, maxCount: 5, level: 32 },
            { itemId: 'toadflax_seed',      name: 'Toadflax seeds',      minCount: 1, maxCount: 5, level: 38 },
            { itemId: 'irit_seed',          name: 'Irit seeds',          minCount: 1, maxCount: 5, level: 44 },
            { itemId: 'avantoe_seed',       name: 'Avantoe seeds',       minCount: 1, maxCount: 5, level: 50 },
            { itemId: 'kwuarm_seed',        name: 'Kwuarm seeds',        minCount: 1, maxCount: 5, level: 56 },
            { itemId: 'snape_grass_seed',   name: 'Snape grass seeds',   minCount: 1, maxCount: 5, level: 61 },
            { itemId: 'snapdragon_seed',    name: 'Snapdragon seeds',    minCount: 1, maxCount: 5, level: 62 },
            { itemId: 'potato_cactus_seed', name: 'Potato cactus seeds', minCount: 1, maxCount: 5, level: 64 },
            { itemId: 'cadantine_seed',     name: 'Cadantine seeds',     minCount: 1, maxCount: 5, level: 67 },
            { itemId: 'lantadyme_seed',     name: 'Lantadyme seeds',     minCount: 1, maxCount: 5, level: 73 },
            { itemId: 'dwarf_weed_seed',    name: 'Dwarf weed seeds',    minCount: 1, maxCount: 5, level: 79 },
            { itemId: 'torstol_seed',       name: 'Torstol seeds',       minCount: 1, maxCount: 5, level: 85 }
        ];
        
        // Seed planting data (seed -> harvest + xp)
        this.SEED_DATA = {
            'potato_seed':        { harvest: 'potato',             xp: 9,     level: 1  },
            'guam_seed':          { harvest: 'grimy_guam_leaf',    xp: 12.5,  level: 1  },
            'marrentill_seed':    { harvest: 'grimy_marrentill',   xp: 15,    level: 14 },
            'tarromin_seed':      { harvest: 'grimy_tarromin',     xp: 18,    level: 19 },
            'limpwurt_seed':      { harvest: 'limpwurt_root',     xp: 21.5,  level: 26 },
            'harralander_seed':   { harvest: 'grimy_harralander',  xp: 24,    level: 26 },
            'ranarr_seed':        { harvest: 'grimy_ranarr_weed',  xp: 30.5,  level: 32 },
            'toadflax_seed':      { harvest: 'grimy_toadflax',     xp: 38.5,  level: 38 },
            'irit_seed':          { harvest: 'grimy_irit_leaf',    xp: 48.5,  level: 44 },
            'avantoe_seed':       { harvest: 'grimy_avantoe',      xp: 61.5,  level: 50 },
            'kwuarm_seed':        { harvest: 'grimy_kwuarm',       xp: 78,    level: 56 },
            'snape_grass_seed':   { harvest: 'snape_grass',        xp: 82,    level: 61 },
            'snapdragon_seed':    { harvest: 'grimy_snapdragon',   xp: 98.5,  level: 62 },
            'potato_cactus_seed': { harvest: 'potato_cactus',      xp: 68,    level: 64 },
            'cadantine_seed':     { harvest: 'grimy_cadantine',    xp: 120,   level: 67 },
            'lantadyme_seed':     { harvest: 'grimy_lantadyme',    xp: 151.5, level: 73 },
            'dwarf_weed_seed':    { harvest: 'grimy_dwarf_weed',   xp: 192,   level: 79 },
            'torstol_seed':       { harvest: 'grimy_torstol',      xp: 224.5, level: 85 }
        };
    }
    
    // Calculate seed consumption chance based on level
    getConsumptionChance(seedId, currentLevel) {
        const seedData = this.SEED_DATA[seedId];
        if (!seedData) return 1/10; // Default
        
        const seedLevel = seedData.level;
        
        // If below required level, can't plant
        if (currentLevel < seedLevel) return 0;
        
        // Linear interpolation from 1/10 at seedLevel to 1/20 at 99
        const maxChance = 1/10; // at seed's required level
        const minChance = 1/20; // at level 99
        
        // Calculate progress from seedLevel to 99
        const levelRange = 99 - seedLevel;
        const levelProgress = Math.min(currentLevel - seedLevel, levelRange) / levelRange;
        
        // Interpolate (inverse because chance decreases as level increases)
        return maxChance - (levelProgress * (maxChance - minChance));
    }
    
    // ==================== TASK GENERATION ====================
    
    generateTask() {
        // Get available seeds from bank + inventory
        const availableSeeds = this.getAvailableSeeds();
        
        if (availableSeeds.length === 0) {
            console.log('No seeds available for farming tasks');
            return null;
        }
        
        // Filter out seeds that already have tasks (unless we have lots)
        const filteredSeeds = this.filterOutExistingTasks(availableSeeds);
        
        if (filteredSeeds.length === 0) {
            console.log('All available seeds already have tasks');
            return null;
        }
        
        // Select a seed using weighted distribution
        const selectedSeed = this.selectWeightedSeed(filteredSeeds);
        if (!selectedSeed) {
            console.log('Failed to select seed for farming');
            return null;
        }
        
        // Find farming nodes
        const farmingNodes = this.findFarmingNodes();
        if (farmingNodes.length === 0) {
            console.log('No farming locations available');
            return null;
        }
        
        // Select a farming node using weighted distribution
        const selectedNode = this.selectWeightedFarmingNode(farmingNodes);
        
        // Determine target count (capped by available seeds)
        const desiredCount = this.determineTargetCount(selectedSeed.seedId);
        const targetCount = Math.min(desiredCount, selectedSeed.available);
        
        // Don't create tasks for 0 seeds
        if (targetCount < 1) {
            console.log(`Not enough ${selectedSeed.seedId} for a task (only ${selectedSeed.available} available)`);
            return null;
        }
        
        // Get item names
        const seedItemData = loadingManager.getData('items')[selectedSeed.seedId];
        const nodeData = nodes.getNode(selectedNode.nodeId);
        
        // Create the farming task - track SEED consumption
        return {
            skill: this.id,
            itemId: selectedSeed.seedId, // Track seed consumption
            targetCount: targetCount,
            nodeId: selectedNode.nodeId,
            activityId: selectedNode.activityId,
            description: `Plant ${targetCount} ${seedItemData.name} at ${nodeData.name}`,
            startingCount: 0,
            progress: 0,
            isFarmingTask: true,
            seedsConsumed: 0, // Track seeds consumed
            harvestItem: selectedSeed.harvestItem // Store what we're harvesting
        };
    }
    
    getAvailableSeeds() {
        const availableSeeds = [];
        const farmingLevel = skills.getLevel('farming');
        
        for (const [seedId, seedData] of Object.entries(this.SEED_DATA)) {
            if (farmingLevel < seedData.level) continue;
            
            // Check how much of this seed we have
            const inInventory = inventory.getItemCount(seedId);
            const inBank = bank.getItemCount(seedId);
            const total = inInventory + inBank;
            
            if (total > 0) {
                availableSeeds.push({
                    seedId: seedId,
                    harvestItem: seedData.harvest,
                    available: total,
                    requiredLevel: seedData.level
                });
            }
        }
        
        return availableSeeds;
    }
    
    filterOutExistingTasks(availableSeeds) {
        if (!window.taskManager) return availableSeeds;
        
        const filtered = [];
        const existingTasks = taskManager.getAllTasks();
        
        for (const seed of availableSeeds) {
            const existingTask = existingTasks.find(task => 
                task.isFarmingTask && 
                task.itemId === seed.seedId &&
                task.progress < 1
            );
            
            if (existingTask) {
                // Only allow if we have 10x the max task size (safety margin)
                const maxTaskSize = 5; // Max seeds per task
                const safeAmount = maxTaskSize * 10;
                
                if (seed.available >= safeAmount) {
                    console.log(`Allowing duplicate task for ${seed.seedId} - have ${seed.available}, safe threshold is ${safeAmount}`);
                    filtered.push(seed);
                } else {
                    console.log(`Filtering out ${seed.seedId} - already has task and only ${seed.available} available`);
                }
            } else {
                filtered.push(seed);
            }
        }
        
        return filtered;
    }
    
    selectWeightedSeed(availableSeeds) {
        if (availableSeeds.length === 0) return null;
        
        // Use RuneCred weights if available
        if (window.runeCreditManager) {
            const weightedSeeds = [];
            let totalWeight = 0;
            
            for (const seed of availableSeeds) {
                const weight = runeCreditManager.getTaskWeight(this.id, seed.seedId);
                totalWeight += weight;
                weightedSeeds.push({ seed, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedSeeds) {
                if (random < weighted.weight) {
                    return weighted.seed;
                }
            }
            
            return availableSeeds[0];
        }
        
        // Default: equal weights
        return availableSeeds[Math.floor(Math.random() * availableSeeds.length)];
    }
    
    findFarmingNodes() {
        const farmingNodes = [];
        const allNodes = nodes.getAllNodes();
        
        for (const [nodeId, node] of Object.entries(allNodes)) {
            if (!node.activities) continue;
            
            if (node.activities.includes('plant_seeds')) {
                // Check if node is walkable
                if (window.collision && window.collision.initialized) {
                    if (!collision.isWalkable(Math.floor(node.position.x), Math.floor(node.position.y))) {
                        continue;
                    }
                }
                
                farmingNodes.push({
                    nodeId: nodeId,
                    activityId: 'plant_seeds'
                });
            }
        }
        
        return farmingNodes;
    }
    
    selectWeightedFarmingNode(farmingNodes) {
        if (farmingNodes.length === 0) return null;
        
        // Use RuneCred weights if available
        if (window.runeCreditManager) {
            const weightedNodes = [];
            let totalWeight = 0;
            
            for (const node of farmingNodes) {
                const weight = runeCreditManager.getNodeWeight(this.id, node.nodeId);
                totalWeight += weight;
                weightedNodes.push({ node, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedNodes) {
                if (random < weighted.weight) {
                    return weighted.node;
                }
            }
            
            return farmingNodes[0];
        }
        
        // Default: random selection
        return farmingNodes[Math.floor(Math.random() * farmingNodes.length)];
    }
    
    updateFarmingTaskProgress(seedId) {
        if (!window.taskManager) return;
        
        const currentTask = taskManager.getFirstIncompleteTask();
        
        if (currentTask && currentTask.isFarmingTask && currentTask.itemId === seedId) {
            currentTask.seedsConsumed = (currentTask.seedsConsumed || 0) + 1;
            const progress = currentTask.seedsConsumed / currentTask.targetCount;
            
            console.log(`Farming progress: ${currentTask.seedsConsumed}/${currentTask.targetCount} seeds consumed`);
            
            taskManager.setTaskProgress(currentTask, progress);
        }
    }
    
    getTaskVerb() {
        return 'Plant';
    }
    
    // ==================== PROCESSING SKILL INTERFACE ====================
    
    hasMaterialsForCurrentTask() {
        return this.hasSeedsForCurrentTask();
    }
    
    getMaterialsNeededForTask(task) {
        if (!task || !task.isFarmingTask) return null;
        
        return {
            itemId: task.itemId, // The seeds needed
            quantity: task.targetCount - (task.seedsConsumed || 0)
        };
    }
    
    hasSeedsForCurrentTask() {
    if (!window.ai || !window.ai.currentTask || !window.ai.currentTask.isFarmingTask) {
        return false;
    }
    
    const task = window.ai.currentTask;
    
    // Check if inventory is full FIRST
    if (inventory.isFull()) {
        console.log('Cannot continue farming - inventory full');
        return false; // Can't continue if no space for harvest
    }
    
    const hasSeeds = inventory.hasItem(task.itemId, 1);
    
    if (!hasSeeds) {
        console.log(`No ${task.itemId} in inventory for farming task`);
    }
    
    return hasSeeds;
}
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        let duration = 600; // Farming is always 600ms base
        
        // Apply speed bonus from RuneCred system
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus);
        }
        
        return duration;
    }
    
    beforeActivityStart(activityData) {
        // Check if inventory is full FIRST
        if (inventory.isFull()) {
            console.log('Inventory full - need to bank before continuing farming');
            this.clearPlantingState();
            
            // Clear banking flag so AI knows to bank
            this.hasBankedForTask = false;
            
            // Tell AI to re-evaluate
            if (window.ai) {
                window.ai.decisionCooldown = 0;
            }
            
            return false; // Can't start activity, will trigger AI to re-evaluate
        }
        
        // Check if already planting
        if (this.isPlanting) {
            const currentTime = Date.now();
            const timePlanting = currentTime - this.plantingStartTime;
            
            if (timePlanting < 600) {
                if (window.ai && window.ai.currentTask && window.ai.currentTask.isFarmingTask) {
                    const taskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
                    if (this.plantingTaskId === taskId) {
                        console.log('Already planting, rejecting duplicate start');
                        return false;
                    }
                }
            } else {
                console.log('Planting took too long, resetting state');
                this.clearPlantingState();
            }
        }
        
        // Determine which seed to plant
        let seedToPlant = null;
        
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isFarmingTask) {
            // Use task's seed
            const taskSeedId = window.ai.currentTask.itemId;
            const level = skills.getLevel('farming');
            const seedData = this.SEED_DATA[taskSeedId];
            
            if (seedData && level >= seedData.level && inventory.hasItem(taskSeedId, 1)) {
                seedToPlant = taskSeedId;
                console.log(`Selected ${taskSeedId} for current farming task`);
            } else {
                console.log(`Cannot plant - need ${taskSeedId} for task but don't have it or level`);
                this.clearPlantingState();
                
                if (window.ai) {
                    window.ai.decisionCooldown = 0;
                }
                
                return false;
            }
        } else {
            // No farming task, plant any available seed
            seedToPlant = this.findSeedToPlant(skills.getLevel('farming'));
        }
        
        if (!seedToPlant) {
            console.log('No seeds to plant');
            this.clearPlantingState();
            return false;
        }
        
        // Store current seed
        this.currentSeed = seedToPlant;
        
        // Set planting state
        this.isPlanting = true;
        this.plantingStartTime = Date.now();
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isFarmingTask) {
            this.plantingTaskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
        } else {
            this.plantingTaskId = null;
        }
        
        console.log(`Starting to plant ${this.currentSeed}`);
        
        return true;
    }
    
    processRewards(activityData, level) {
        this.clearPlantingState();
        
        if (!this.currentSeed) {
            this.lastFarmingXp = 0;
            return [];
        }
        
        const seedData = this.SEED_DATA[this.currentSeed];
        if (!seedData) {
            console.error(`No data for seed ${this.currentSeed}`);
            this.lastFarmingXp = 0;
            return [];
        }
        
        // Check if we have space for the harvest BEFORE processing
        if (inventory.isFull()) {
            // Inventory is full, need to bank
            console.log('Inventory full, need to bank before continuing farming');
            this.hasBankedForTask = false;
            this.lastFarmingXp = 0;
            
            // Tell AI to re-evaluate
            if (window.ai) {
                window.ai.decisionCooldown = 0;
            }
            
            return []; // Return no rewards since we can't fit them
        }
        
        // Always get harvest and base XP
        const rewards = [{ itemId: seedData.harvest, quantity: 1 }];
        let totalXp = seedData.xp;
        
        // Check if seed is consumed
        const consumptionChance = this.getConsumptionChance(this.currentSeed, level);
        const isConsumed = Math.random() < consumptionChance;
        
        if (isConsumed) {
            // Consume the seed
            inventory.removeItem(this.currentSeed, 1);
            
            // Add bonus XP for consumption
            totalXp += seedData.xp; // Double XP when seed is consumed
            
            // Update task progress
            this.updateFarmingTaskProgress(this.currentSeed);
            
            console.log(`Seed consumed! ${this.currentSeed} (chance was ${(consumptionChance * 100).toFixed(1)}%)`);
        } else {
            console.log(`Seed not consumed, continuing to harvest (chance was ${(consumptionChance * 100).toFixed(1)}%)`);
        }
        
        this.lastFarmingXp = totalXp;
        
        return rewards;
    }
    
    shouldGrantXP(rewards, activityData) {
        return this.lastFarmingXp > 0;
    }
    
    getXpToGrant(rewards, activityData) {
        return this.lastFarmingXp || 0;
    }
    
    findSeedToPlant(level) {
        // Find any seed we can plant
        for (const [seedId, seedData] of Object.entries(this.SEED_DATA)) {
            if (level >= seedData.level && inventory.hasItem(seedId, 1)) {
                return seedId;
            }
        }
        return null;
    }
    
    canPerformActivity(activityId) {
        if (activityId !== 'plant_seeds') return false;
        
        const level = skills.getLevel('farming');
        const seed = this.findSeedToPlant(level);
        
        return seed !== null;
    }
    
    clearPlantingState() {
        this.isPlanting = false;
        this.plantingTaskId = null;
        this.plantingStartTime = 0;
    }
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        if (!task || task.skill !== 'farming') return false;
        if (!task.isFarmingTask) return false;
        
        // Check if inventory is full (need to deposit harvest)
        if (inventory.isFull()) {
            console.log('Need banking: inventory full during farming');
            return true;
        }
        
        // Check if we have seeds for our task
        if (!inventory.hasItem(task.itemId, 1)) {
            console.log(`Need banking: no ${task.itemId} in inventory for farming task`);
            return true;
        }
        
        return false;
    }
    
    handleBanking(task) {
        // Deposit all first
        bank.depositAll();
        console.log('Deposited all items for farming');
        
        // Mark that we've banked for this task
        const taskId = task ? `${task.itemId}_${task.targetCount}_${task.nodeId}` : null;
        this.currentTaskId = taskId;
        this.hasBankedForTask = true;
        
        let withdrawnAny = false;
        
        if (task && task.isFarmingTask) {
            const taskSeedId = task.itemId;
            const bankCount = bank.getItemCount(taskSeedId);
            const needed = task.targetCount - (task.seedsConsumed || 0);
            
            if (bankCount > 0 && needed > 0) {
                // Withdraw up to 28 seeds (full inventory)
                const toWithdraw = Math.min(28, Math.min(bankCount, needed));
                const withdrawn = bank.withdrawUpTo(taskSeedId, toWithdraw);
                
                if (withdrawn > 0) {
                    inventory.addItem(taskSeedId, withdrawn);
                    console.log(`Withdrew ${withdrawn} ${taskSeedId} for farming task`);
                    withdrawnAny = true;
                }
            } else {
                console.log(`No ${taskSeedId} in bank for farming task`);
            }
        }
        
        return withdrawnAny;
    }
    
    canContinueTask(task) {
        if (!task || !task.isFarmingTask) return true;
        
        // Check if we have enough seeds remaining
        const currentSeeds = inventory.getItemCount(task.itemId) + bank.getItemCount(task.itemId);
        const remaining = task.targetCount - (task.seedsConsumed || 0);
        
        if (currentSeeds < remaining) {
            console.log(`Cannot continue farming task - need ${remaining} more ${task.itemId}, have ${currentSeeds}`);
            this.hasBankedForTask = false;
            this.currentTaskId = null;
            this.clearPlantingState();
            return false;
        }
        
        return true;
    }
    
    hasMaterials() {
        return this.findSeedToPlant(skills.getLevel('farming')) !== null;
    }
    
    onActivityComplete(activityData) {
        this.clearPlantingState();
        
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isFarmingTask) {
            if (window.ai.currentTask.progress >= 1) {
                console.log('Farming task complete, resetting banking state');
                this.hasBankedForTask = false;
                this.currentTaskId = null;
            } else {
                // Check if we need to bank (inventory full or no seeds)
                if (inventory.isFull() || !inventory.hasItem(window.ai.currentTask.itemId, 1)) {
                    console.log('Need to bank - inventory full or no seeds');
                    this.hasBankedForTask = false;
                    
                    if (window.ai) {
                        window.ai.decisionCooldown = 0;
                    }
                }
            }
        }
    }
    
    onActivityStopped() {
        console.log('Farming activity was stopped, clearing state');
        this.clearPlantingState();
    }
}
