class HerbloreSkill extends BaseSkill {
    constructor() {
        super('herblore', 'Herblore');
        this.requiresBankingBeforeTask = true; // Always bank before herblore tasks
        this.isProcessingSkill = true;
        this.lastHerbloreXp = 0;
        this.currentRecipe = null;
        this.hasBankedForTask = false;
        this.currentTaskId = null;
        
        // State tracking to prevent duplicate starts
        this.isProcessing = false;
        this.processingTaskId = null;
        this.processingStartTime = 0;
        
        // Track which activity we're doing
        this.currentActivityType = null; // 'cleaning' or 'potion'
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    initializeSkillData() {
        // Task data for UI and task generation
        this.SKILL_DATA = [
            // Cleaning herbs tasks
            { itemId: 'grimy_guam_leaf', name: 'Grimy guam leaf', minCount: 50, maxCount: 100, level: 1 },
            { itemId: 'grimy_marrentill', name: 'Grimy marrentill', minCount: 50, maxCount: 100, level: 5 },
            { itemId: 'grimy_tarromin', name: 'Grimy tarromin', minCount: 50, maxCount: 100, level: 11 },
            { itemId: 'grimy_harralander', name: 'Grimy harralander', minCount: 50, maxCount: 100, level: 20 },
            { itemId: 'grimy_ranarr_weed', name: 'Grimy ranarr weed', minCount: 50, maxCount: 100, level: 25 },
            { itemId: 'grimy_toadflax', name: 'Grimy toadflax', minCount: 50, maxCount: 100, level: 30 },
            { itemId: 'grimy_irit_leaf', name: 'Grimy irit leaf', minCount: 50, maxCount: 100, level: 40 },
            { itemId: 'grimy_avantoe', name: 'Grimy avantoe', minCount: 50, maxCount: 100, level: 48 },
            { itemId: 'grimy_kwuarm', name: 'Grimy kwuarm', minCount: 50, maxCount: 100, level: 54 },
            { itemId: 'grimy_snapdragon', name: 'Grimy snapdragon', minCount: 50, maxCount: 100, level: 59 },
            { itemId: 'grimy_cadantine', name: 'Grimy cadantine', minCount: 50, maxCount: 100, level: 65 },
            { itemId: 'grimy_lantadyme', name: 'Grimy lantadyme', minCount: 50, maxCount: 100, level: 67 },
            { itemId: 'grimy_dwarf_weed', name: 'Grimy dwarf weed', minCount: 50, maxCount: 100, level: 70 },
            { itemId: 'grimy_torstol', name: 'Grimy torstol', minCount: 50, maxCount: 100, level: 75 },
            
            // Potion tasks
            { itemId: 'attack_potion', name: 'Attack potions', minCount: 25, maxCount: 50, level: 1 },
            { itemId: 'antipoison', name: 'Antipoison', minCount: 25, maxCount: 50, level: 5 },
            { itemId: 'strength_potion', name: 'Strength potions', minCount: 25, maxCount: 50, level: 12 },
            { itemId: 'energy_potion', name: 'Energy potions', minCount: 25, maxCount: 50, level: 26 },
            { itemId: 'defence_potion', name: 'Defence potions', minCount: 25, maxCount: 50, level: 30 },
            { itemId: 'prayer_potion', name: 'Prayer potions', minCount: 25, maxCount: 50, level: 38 },
            { itemId: 'super_attack_potion', name: 'Super attack potions', minCount: 25, maxCount: 50, level: 45 },
            { itemId: 'superantipoison', name: 'Superantipoison', minCount: 25, maxCount: 50, level: 48 },
            { itemId: 'super_energy', name: 'Super energy', minCount: 25, maxCount: 50, level: 52 },
            { itemId: 'super_strength', name: 'Super strength potions', minCount: 25, maxCount: 50, level: 55 },
            { itemId: 'super_restore', name: 'Super restore', minCount: 25, maxCount: 50, level: 63 },
            { itemId: 'super_defence', name: 'Super defence', minCount: 25, maxCount: 50, level: 66 },
            { itemId: 'antifire_potion', name: 'Antifire potions', minCount: 25, maxCount: 50, level: 69 },
            { itemId: 'ranging_potion', name: 'Ranging potions', minCount: 25, maxCount: 50, level: 72 },
            { itemId: 'magic_potion', name: 'Magic potions', minCount: 25, maxCount: 50, level: 76 },
            { itemId: 'stamina_potion', name: 'Stamina potions', minCount: 25, maxCount: 50, level: 77 },
            { itemId: 'saradomin_brew', name: 'Saradomin brews', minCount: 25, maxCount: 50, level: 81 },
            { itemId: 'super_combat_potion', name: 'Super combat potions', minCount: 25, maxCount: 50, level: 90 }
        ];
        
        // Herb cleaning recipes
        this.cleaningRecipes = {
            'grimy_guam_leaf': { clean: 'guam_leaf', level: 1, xp: 2.5 },
            'grimy_marrentill': { clean: 'marrentill', level: 5, xp: 3.8 },
            'grimy_tarromin': { clean: 'tarromin', level: 11, xp: 5 },
            'grimy_harralander': { clean: 'harralander', level: 20, xp: 6.3 },
            'grimy_ranarr_weed': { clean: 'ranarr_weed', level: 25, xp: 7.5 },
            'grimy_toadflax': { clean: 'toadflax', level: 30, xp: 8 },
            'grimy_irit_leaf': { clean: 'irit_leaf', level: 40, xp: 8.8 },
            'grimy_avantoe': { clean: 'avantoe', level: 48, xp: 10 },
            'grimy_kwuarm': { clean: 'kwuarm', level: 54, xp: 11.3 },
            'grimy_snapdragon': { clean: 'snapdragon', level: 59, xp: 11.8 },
            'grimy_cadantine': { clean: 'cadantine', level: 65, xp: 12.5 },
            'grimy_lantadyme': { clean: 'lantadyme', level: 67, xp: 13.1 },
            'grimy_dwarf_weed': { clean: 'dwarf_weed', level: 70, xp: 13.8 },
            'grimy_torstol': { clean: 'torstol', level: 75, xp: 15 }
        };
        
        // Potion making recipes
        this.potionRecipes = {
            'attack_potion': { herb: 'guam_leaf', level: 1, xp: 25 },
            'antipoison': { herb: 'marrentill', level: 5, xp: 37.5 },
            'strength_potion': { herb: 'tarromin', level: 12, xp: 50 },
            'energy_potion': { herb: 'harralander', level: 26, xp: 67.5 },
            'defence_potion': { herb: 'ranarr_weed', level: 30, xp: 75 },
            'prayer_potion': { herb: 'ranarr_weed', level: 38, xp: 87.5 },
            'super_attack_potion': { herb: 'irit_leaf', level: 45, xp: 100 },
            'superantipoison': { herb: 'irit_leaf', level: 48, xp: 106.3 },
            'super_energy': { herb: 'avantoe', level: 52, xp: 117.5 },
            'super_strength': { herb: 'kwuarm', level: 55, xp: 125 },
            'super_restore': { herb: 'snapdragon', level: 63, xp: 142.5 },
            'super_defence': { herb: 'cadantine', level: 66, xp: 150 },
            'antifire_potion': { herb: 'lantadyme', level: 69, xp: 157.5 },
            'ranging_potion': { herb: 'dwarf_weed', level: 72, xp: 162.5 },
            'magic_potion': { herb: 'lantadyme', level: 76, xp: 172.5 },
            'stamina_potion': { herb: 'mark_of_grace', level: 77, xp: 102 },
            'saradomin_brew': { herb: 'toadflax', level: 81, xp: 180 },
            'super_combat_potion': { herb: 'torstol', level: 90, xp: 150 }
        };
    }
    
    // ==================== TASK GENERATION ====================
    
    generateTask() {
        // Get available products we can make
        const availableProducts = this.getAvailableProducts();
        
        if (availableProducts.length === 0) {
            console.log('No herblore products available with current materials');
            return null;
        }
        
        // Filter out items that already have tasks
        const filteredProducts = this.filterOutExistingTasks(availableProducts);
        
        if (filteredProducts.length === 0) {
            console.log('All available herblore products already have tasks');
            return null;
        }
        
        // Select a product using weighted distribution
        const selectedProduct = this.selectWeightedProduct(filteredProducts);
        if (!selectedProduct) {
            console.log('Failed to select product for herblore');
            return null;
        }
        
        // Find appropriate nodes based on activity type
        const activityType = selectedProduct.activityType;
        const nodes = this.findNodesForActivity(activityType);
        
        if (nodes.length === 0) {
            console.log(`No ${activityType} locations available`);
            return null;
        }
        
        // Select a node (could be weighted in future)
        const selectedNode = nodes[Math.floor(Math.random() * nodes.length)];
        
        // Determine target count
        const desiredCount = this.determineTargetCount(selectedProduct.outputId);
        const targetCount = Math.min(desiredCount, selectedProduct.available);
        
        if (targetCount < 5) {
            console.log(`Not enough materials for ${selectedProduct.outputId}`);
            return null;
        }
        
        // Get item names
        const nodeData = window.nodes ? window.nodes.getNode(selectedNode.nodeId) : null;
        const nodeName = nodeData ? nodeData.name : selectedNode.nodeId;
        
        // Create appropriate description
        let description = '';
        if (selectedProduct.isHerbCleaning) {
            const itemData = loadingManager.getData('items')[selectedProduct.outputId];
            const herbName = itemData ? itemData.name : selectedProduct.outputId;
            description = `Clean ${targetCount} ${herbName} at ${nodeName}`;
        } else {
            const itemData = loadingManager.getData('items')[selectedProduct.outputId];
            const potionName = itemData ? itemData.name : selectedProduct.outputId;
            description = `Brew ${targetCount} ${potionName} at ${nodeName}`;
        }
        
        return {
            skill: this.id,
            itemId: selectedProduct.outputId,
            targetCount: targetCount,
            nodeId: selectedNode.nodeId,
            activityId: activityType,
            description: description,
            startingCount: 0,
            progress: 0,
            isHerbloreTask: true,
            itemsProduced: 0,
            recipe: selectedProduct.recipe,
            activityType: activityType,
            isHerbCleaning: selectedProduct.isHerbCleaning
        };
    }
    
    getAvailableProducts() {
        const products = [];
        const herbloreLevel = skills.getLevel('herblore');
        
        // Check herb cleaning
        for (const [grimyHerb, recipe] of Object.entries(this.cleaningRecipes)) {
            if (herbloreLevel < recipe.level) continue;
            
            const available = inventory.getItemCount(grimyHerb) + bank.getItemCount(grimyHerb);
            if (available > 0) {
                products.push({
                    outputId: grimyHerb, // For cleaning, we track the grimy herb consumption
                    recipe: recipe,
                    activityType: 'cleaning_herbs',
                    isHerbCleaning: true,
                    available: available
                });
            }
        }
        
        // Check potion making
        for (const [potionId, recipe] of Object.entries(this.potionRecipes)) {
            if (herbloreLevel < recipe.level) continue;
            
            // Check if we have both vials and herbs
            const vialCount = inventory.getItemCount('vial_of_water') + bank.getItemCount('vial_of_water');
            const herbCount = inventory.getItemCount(recipe.herb) + bank.getItemCount(recipe.herb);
            const available = Math.min(vialCount, herbCount);
            
            if (available > 0) {
                products.push({
                    outputId: potionId,
                    recipe: recipe,
                    activityType: 'making_potions',
                    isHerbCleaning: false,
                    available: available
                });
            }
        }
        
        return products;
    }
    
    filterOutExistingTasks(products) {
        if (!window.taskManager) return products;
        
        const filtered = [];
        const existingTasks = taskManager.getAllTasks();
        
        for (const product of products) {
            const existingTask = existingTasks.find(task => 
                task.isHerbloreTask && 
                task.itemId === product.outputId &&
                task.progress < 1
            );
            
            if (existingTask) {
                // Only allow if we have 10x the amount needed for a typical task
                const typicalTaskSize = this.determineTargetCount(product.outputId);
                const safeAmount = typicalTaskSize * 10;
                
                if (product.available >= safeAmount) {
                    filtered.push(product);
                }
            } else {
                filtered.push(product);
            }
        }
        
        return filtered;
    }
    
    selectWeightedProduct(products) {
        if (products.length === 0) return null;
        
        // Use RuneCred weights if available
        if (window.runeCreditManager) {
            const weightedProducts = [];
            let totalWeight = 0;
            
            for (const product of products) {
                const weight = runeCreditManager.getTaskWeight(this.id, product.outputId);
                totalWeight += weight;
                weightedProducts.push({ product, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedProducts) {
                if (random < weighted.weight) {
                    return weighted.product;
                }
            }
            
            return products[0];
        }
        
        // Default: equal weights
        return products[Math.floor(Math.random() * products.length)];
    }
    
    findNodesForActivity(activityType) {
        const matchingNodes = [];
        if (!window.nodes) return matchingNodes;
        
        const allNodes = window.nodes.getAllNodes();
        
        for (const [nodeId, node] of Object.entries(allNodes)) {
            if (!node.activities) continue;
            
            // Look for nodes that have this specific activity
            if (node.activities.includes(activityType)) {
                // Check if walkable
                if (window.collision && window.collision.initialized) {
                    if (!collision.isWalkable(Math.floor(node.position.x), Math.floor(node.position.y))) {
                        continue;
                    }
                }
                
                matchingNodes.push({
                    nodeId: nodeId,
                    activityId: activityType
                });
            }
        }
        
        return matchingNodes;
    }
    
    getTaskVerb() {
        return 'Process';
    }
    
    updateHerbloreTaskProgress(outputId, quantity) {
        if (!window.taskManager) return;
        
        const currentTask = taskManager.getFirstIncompleteTask();
        
        if (currentTask && currentTask.isHerbloreTask) {
            // For herb cleaning, we track grimy herbs consumed
            // For potion making, we track potions produced
            if (currentTask.isHerbCleaning && outputId === currentTask.itemId) {
                // Cleaning task - we consumed a grimy herb
                currentTask.itemsProduced = (currentTask.itemsProduced || 0) + 1;
            } else if (!currentTask.isHerbCleaning && outputId === currentTask.itemId) {
                // Potion task - we produced a potion
                currentTask.itemsProduced = (currentTask.itemsProduced || 0) + quantity;
            } else {
                return; // Wrong item for this task
            }
            
            const progress = currentTask.itemsProduced / currentTask.targetCount;
            
            console.log(`Herblore progress: ${currentTask.itemsProduced}/${currentTask.targetCount}`);
            
            taskManager.setTaskProgress(currentTask, progress);
        }
    }
    
    // ==================== PROCESSING SKILL INTERFACE ====================
    
    hasMaterialsForCurrentTask() {
        if (!window.ai || !window.ai.currentTask || !window.ai.currentTask.isHerbloreTask) {
            return false;
        }
        
        const task = window.ai.currentTask;
        
        if (task.isHerbCleaning) {
            // Check if we have grimy herbs
            return inventory.hasItem(task.itemId, 1);
        } else {
            // Check if we have vial and herb for potion
            const recipe = task.recipe;
            return inventory.hasItem('vial_of_water', 1) && inventory.hasItem(recipe.herb, 1);
        }
    }
    
    getMaterialsNeededForTask(task) {
        if (!task || !task.isHerbloreTask) return null;
        
        const remaining = task.targetCount - (task.itemsProduced || 0);
        
        if (task.isHerbCleaning) {
            return {
                itemId: task.itemId,
                quantity: remaining
            };
        } else {
            // Return the herb as primary material (vials are secondary)
            return {
                itemId: task.recipe.herb,
                quantity: remaining
            };
        }
    }
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        // Use duration based on activity type
        let duration = this.currentActivityType === 'cleaning' ? 200 : 1200;
        
        // Apply speed bonus
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus);
        }
        
        return duration;
    }
    
    beforeActivityStart(activityData) {
        // Check if already processing
        if (this.isProcessing) {
            const currentTime = Date.now();
            const timeProcessing = currentTime - this.processingStartTime;
            
            if (timeProcessing < 600) { // Max duration is 600ms for potions
                if (window.ai && window.ai.currentTask && window.ai.currentTask.isHerbloreTask) {
                    const taskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
                    if (this.processingTaskId === taskId) {
                        console.log('Already processing herblore, rejecting duplicate start');
                        return false;
                    }
                }
            } else {
                console.log('Herblore took too long, resetting state');
                this.clearProcessingState();
            }
        }
        
        // Determine which recipe to use based on activity
        let recipe = null;
        const activityId = activityData.id || activityData.activityId;
        
        if (activityId === 'cleaning_herbs') {
            this.currentActivityType = 'cleaning';
            recipe = this.findHerbToClean();
        } else if (activityId === 'making_potions') {
            this.currentActivityType = 'potion';
            recipe = this.findPotionToMake();
        }
        
        if (!recipe) {
            console.log('No herblore recipe available');
            this.clearProcessingState();
            
            if (window.ai) {
                window.ai.decisionCooldown = 0;
            }
            
            return false;
        }
        
        // Store recipe
        this.currentRecipe = recipe;
        
        // Set processing state
        this.isProcessing = true;
        this.processingStartTime = Date.now();
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isHerbloreTask) {
            this.processingTaskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
        } else {
            this.processingTaskId = null;
        }
        
        console.log(`Starting herblore: ${this.currentActivityType}`);
        
        return true;
    }
    
    findHerbToClean() {
        const level = skills.getLevel('herblore');
        
        // If we have a task, clean that specific herb
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isHerbloreTask && window.ai.currentTask.isHerbCleaning) {
            const grimyHerb = window.ai.currentTask.itemId;
            if (inventory.hasItem(grimyHerb, 1)) {
                const recipe = this.cleaningRecipes[grimyHerb];
                if (recipe && level >= recipe.level) {
                    return {
                        input: grimyHerb,
                        output: recipe.clean,
                        xp: recipe.xp,
                        type: 'cleaning'
                    };
                }
            }
        }
        
        // Otherwise, clean any herb we can (scan inventory slots in order)
        for (let i = 0; i < inventory.maxSlots; i++) {
            const slot = inventory.slots[i];
            if (!slot) continue;
            
            const recipe = this.cleaningRecipes[slot.itemId];
            if (recipe && level >= recipe.level) {
                return {
                    input: slot.itemId,
                    output: recipe.clean,
                    xp: recipe.xp,
                    type: 'cleaning'
                };
            }
        }
        
        return null;
    }
    
    findPotionToMake() {
        const level = skills.getLevel('herblore');
        
        // Check if we have vial of water
        if (!inventory.hasItem('vial_of_water', 1)) {
            return null;
        }
        
        // If we have a task, make that specific potion
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isHerbloreTask && !window.ai.currentTask.isHerbCleaning) {
            const potionId = window.ai.currentTask.itemId;
            const recipe = this.potionRecipes[potionId];
            if (recipe && level >= recipe.level && inventory.hasItem(recipe.herb, 1)) {
                return {
                    herb: recipe.herb,
                    output: potionId,
                    xp: recipe.xp,
                    type: 'potion'
                };
            }
        }
        
        // Otherwise, make any potion we can
        for (const [potionId, recipe] of Object.entries(this.potionRecipes)) {
            if (level >= recipe.level && inventory.hasItem(recipe.herb, 1)) {
                return {
                    herb: recipe.herb,
                    output: potionId,
                    xp: recipe.xp,
                    type: 'potion'
                };
            }
        }
        
        return null;
    }
    
    processRewards(activityData, level) {
        this.clearProcessingState();
        
        if (!this.currentRecipe) {
            this.lastHerbloreXp = 0;
            return [];
        }
        
        // Process based on recipe type
        if (this.currentRecipe.type === 'cleaning') {
            // Consume grimy herb
            inventory.removeItem(this.currentRecipe.input, 1);
            
            // Update task progress for cleaning
            this.updateHerbloreTaskProgress(this.currentRecipe.input, 1);
            
            // Give clean herb
            this.lastHerbloreXp = this.currentRecipe.xp;
            return [{
                itemId: this.currentRecipe.output,
                quantity: 1
            }];
        } else {
            // Consume vial and herb
            inventory.removeItem('vial_of_water', 1);
            inventory.removeItem(this.currentRecipe.herb, 1);
            
            // Give potion
            this.lastHerbloreXp = this.currentRecipe.xp;
            
            // Update task progress for potion
            this.updateHerbloreTaskProgress(this.currentRecipe.output, 1);
            
            return [{
                itemId: this.currentRecipe.output,
                quantity: 1
            }];
        }
    }
    
    shouldGrantXP(rewards, activityData) {
        return this.lastHerbloreXp > 0;
    }
    
    getXpToGrant(rewards, activityData) {
        return this.lastHerbloreXp || 0;
    }
    
    canPerformActivity(activityId) {
        const level = skills.getLevel('herblore');
        
        if (activityId === 'cleaning_herbs') {
            return this.findHerbToClean() !== null;
        } else if (activityId === 'making_potions') {
            return this.findPotionToMake() !== null;
        }
        
        return false;
    }
    
    clearProcessingState() {
        this.isProcessing = false;
        this.processingTaskId = null;
        this.processingStartTime = 0;
        this.currentActivityType = null;
    }
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        if (!task || task.skill !== 'herblore') return false;
        if (!task.isHerbloreTask) return false;
        
        if (task.isHerbCleaning) {
            // Check if we have grimy herbs
            if (!inventory.hasItem(task.itemId, 1)) {
                console.log(`Need banking: no ${task.itemId} for cleaning`);
                return true;
            }
        } else {
            // Check if we have vials and herbs
            const recipe = task.recipe;
            if (!inventory.hasItem('vial_of_water', 1) || !inventory.hasItem(recipe.herb, 1)) {
                console.log(`Need banking: missing materials for ${task.itemId}`);
                return true;
            }
        }
        
        return false;
    }
    
    handleBanking(task) {
        // Deposit all first
        bank.depositAll();
        console.log('Deposited all items for herblore');
        
        // Mark that we've banked
        const taskId = task ? `${task.itemId}_${task.targetCount}_${task.nodeId}` : null;
        this.currentTaskId = taskId;
        this.hasBankedForTask = true;
        
        let withdrawnAny = false;
        
        if (task && task.isHerbloreTask) {
            const remaining = task.targetCount - (task.itemsProduced || 0);
            
            if (task.isHerbCleaning) {
                // Withdraw up to 28 grimy herbs
                const toWithdraw = Math.min(28, remaining);
                const withdrawn = bank.withdrawUpTo(task.itemId, toWithdraw);
                
                if (withdrawn > 0) {
                    inventory.addItem(task.itemId, withdrawn);
                    console.log(`Withdrew ${withdrawn} ${task.itemId} for cleaning`);
                    withdrawnAny = true;
                } else {
                    console.log(`No ${task.itemId} in bank`);
                    return false;
                }
            } else {
                // Withdraw 14 vials and 14 herbs for potion making
                const toMake = Math.min(14, remaining);
                
                // Withdraw vials
                const vialsWithdrawn = bank.withdrawUpTo('vial_of_water', toMake);
                if (vialsWithdrawn > 0) {
                    inventory.addItem('vial_of_water', vialsWithdrawn);
                    console.log(`Withdrew ${vialsWithdrawn} vials`);
                    withdrawnAny = true;
                }
                
                // Withdraw herbs
                const herbsWithdrawn = bank.withdrawUpTo(task.recipe.herb, toMake);
                if (herbsWithdrawn > 0) {
                    inventory.addItem(task.recipe.herb, herbsWithdrawn);
                    console.log(`Withdrew ${herbsWithdrawn} ${task.recipe.herb}`);
                    withdrawnAny = true;
                }
                
                if (vialsWithdrawn === 0 || herbsWithdrawn === 0) {
                    console.log('Missing materials for potion making');
                    return false;
                }
            }
        }
        
        return withdrawnAny;
    }
    
    canContinueTask(task) {
        if (!task || !task.isHerbloreTask) return true;
        
        const remaining = task.targetCount - (task.itemsProduced || 0);
        
        if (task.isHerbCleaning) {
            const available = inventory.getItemCount(task.itemId) + bank.getItemCount(task.itemId);
            if (available < remaining) {
                console.log(`Cannot continue cleaning - need ${remaining} more, have ${available}`);
                this.hasBankedForTask = false;
                this.currentTaskId = null;
                this.clearProcessingState();
                return false;
            }
        } else {
            const vialsAvailable = inventory.getItemCount('vial_of_water') + bank.getItemCount('vial_of_water');
            const herbsAvailable = inventory.getItemCount(task.recipe.herb) + bank.getItemCount(task.recipe.herb);
            const canMake = Math.min(vialsAvailable, herbsAvailable);
            
            if (canMake < remaining) {
                console.log(`Cannot continue potion making - need ${remaining}, can make ${canMake}`);
                this.hasBankedForTask = false;
                this.currentTaskId = null;
                this.clearProcessingState();
                return false;
            }
        }
        
        return true;
    }
    
    hasMaterials() {
        const level = skills.getLevel('herblore');
        
        // Check for cleanable herbs
        for (const grimyHerb in this.cleaningRecipes) {
            const recipe = this.cleaningRecipes[grimyHerb];
            if (level >= recipe.level && inventory.hasItem(grimyHerb, 1)) {
                return true;
            }
        }
        
        // Check for makeable potions
        if (inventory.hasItem('vial_of_water', 1)) {
            for (const potionId in this.potionRecipes) {
                const recipe = this.potionRecipes[potionId];
                if (level >= recipe.level && inventory.hasItem(recipe.herb, 1)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    onActivityComplete(activityData) {
        this.clearProcessingState();
        
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isHerbloreTask) {
            if (window.ai.currentTask.progress >= 1) {
                console.log('Herblore task complete, resetting banking state');
                this.hasBankedForTask = false;
                this.currentTaskId = null;
            } else {
                // Check if we need to bank for more materials
                if (!this.hasMaterialsForCurrentTask()) {
                    console.log('Herblore task needs more materials');
                    this.hasBankedForTask = false;
                    
                    if (window.ai) {
                        window.ai.decisionCooldown = 0;
                    }
                }
            }
        }
    }
    
    onActivityStopped() {
        console.log('Herblore activity was stopped, clearing state');
        this.clearProcessingState();
    }
}
