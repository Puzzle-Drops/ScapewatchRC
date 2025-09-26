class SmithingSkill extends BaseSkill {
    constructor() {
        super('smithing', 'Smithing');
        this.requiresBankingBeforeTask = true; // Always bank before smithing/smelting
        this.isProcessingSkill = true;
        this.lastSmithingXp = 0;
        this.currentRecipe = null;
        this.hasBankedForTask = false;
        this.currentTaskId = null;
        
        // State tracking to prevent duplicate starts
        this.isProcessing = false;
        this.processingTaskId = null;
        this.processingStartTime = 0;
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    initializeSkillData() {
        // Task data for UI and task generation
        this.SKILL_DATA = [
            // Smelting tasks
            { itemId: 'bronze_bar',     name: 'Bronze bars',     minCount: 20, maxCount: 40, level: 1  },
            { itemId: 'iron_bar',       name: 'Iron bars',       minCount: 20, maxCount: 40, level: 15 },
            { itemId: 'silver_bar',     name: 'Silver bars',     minCount: 20, maxCount: 40, level: 20 },
            { itemId: 'steel_bar',      name: 'Steel bars',      minCount: 20, maxCount: 40, level: 30 },
            { itemId: 'gold_bar',       name: 'Gold bars',       minCount: 20, maxCount: 40, level: 40 },
            { itemId: 'mithril_bar',    name: 'Mithril bars',    minCount: 20, maxCount: 40, level: 50 },
            { itemId: 'adamantite_bar', name: 'Adamantite bars', minCount: 20, maxCount: 40, level: 70 },
            { itemId: 'runite_bar',     name: 'Runite bars',     minCount: 20, maxCount: 40, level: 85 },
            { itemId: 'amethyst_bar',   name: 'Amethyst bars',   minCount: 20, maxCount: 40, level: 92 },
            
            // Smithing (arrowtips) tasks - larger counts since we get 15 per bar
            { itemId: 'bronze_arrowtips',   name: 'Bronze arrowtips',   minCount: 150, maxCount: 300, level: 5  },
            { itemId: 'iron_arrowtips',     name: 'Iron arrowtips',     minCount: 150, maxCount: 300, level: 20 },
            { itemId: 'steel_arrowtips',    name: 'Steel arrowtips',    minCount: 150, maxCount: 300, level: 35 },
            { itemId: 'mithril_arrowtips',  name: 'Mithril arrowtips',  minCount: 150, maxCount: 300, level: 55 },
            { itemId: 'adamant_arrowtips',  name: 'Adamant arrowtips',  minCount: 150, maxCount: 300, level: 75 },
            { itemId: 'rune_arrowtips',     name: 'Rune arrowtips',     minCount: 150, maxCount: 300, level: 90 },
            { itemId: 'amethyst_arrowtips', name: 'Amethyst arrowtips', minCount: 150, maxCount: 300, level: 96 }
        ];
        
        // Smelting recipes
        this.smeltingRecipes = {
            'bronze_bar': {
                inputs: [{ itemId: 'tin_ore', quantity: 1 }, { itemId: 'copper_ore', quantity: 1 }],
                output: { itemId: 'bronze_bar', quantity: 1 },
                level: 1,
                xp: 6.2,
                duration: 3000,
                successRate: 1.0
            },
            'iron_bar': {
                inputs: [{ itemId: 'iron_ore', quantity: 1 }],
                output: { itemId: 'iron_bar', quantity: 1 },
                level: 15,
                xp: 12.5,
                duration: 2400,
                successRate: 0.5 // 50% success rate for iron
            },
            'silver_bar': {
                inputs: [{ itemId: 'silver_ore', quantity: 1 }],
                output: { itemId: 'silver_bar', quantity: 1 },
                level: 20,
                xp: 13.7,
                duration: 2400,
                successRate: 1.0
            },
            'steel_bar': {
                inputs: [{ itemId: 'iron_ore', quantity: 1 }, { itemId: 'coal', quantity: 2 }],
                output: { itemId: 'steel_bar', quantity: 1 },
                level: 30,
                xp: 17.5,
                duration: 2400,
                successRate: 1.0
            },
            'gold_bar': {
                inputs: [{ itemId: 'gold_ore', quantity: 1 }],
                output: { itemId: 'gold_bar', quantity: 1 },
                level: 40,
                xp: 22.5,
                duration: 3000,
                successRate: 1.0
            },
            'mithril_bar': {
                inputs: [{ itemId: 'mithril_ore', quantity: 1 }, { itemId: 'coal', quantity: 4 }],
                output: { itemId: 'mithril_bar', quantity: 1 },
                level: 50,
                xp: 30,
                duration: 2400,
                successRate: 1.0
            },
            'adamantite_bar': {
                inputs: [{ itemId: 'adamantite_ore', quantity: 1 }, { itemId: 'coal', quantity: 6 }],
                output: { itemId: 'adamantite_bar', quantity: 1 },
                level: 70,
                xp: 37.5,
                duration: 2400,
                successRate: 1.0
            },
            'runite_bar': {
                inputs: [{ itemId: 'runite_ore', quantity: 1 }, { itemId: 'coal', quantity: 8 }],
                output: { itemId: 'runite_bar', quantity: 1 },
                level: 85,
                xp: 50,
                duration: 2400,
                successRate: 1.0
            },
            'amethyst_bar': {
                inputs: [{ itemId: 'amethyst', quantity: 1 }],
                output: { itemId: 'amethyst_bar', quantity: 1 },
                level: 92,
                xp: 150,
                duration: 2400,
                successRate: 1.0
            }
        };
        
        // Smithing recipes (arrowtips)
        this.smithingRecipes = {
            'bronze_arrowtips': {
                inputs: [{ itemId: 'bronze_bar', quantity: 1 }],
                output: { itemId: 'bronze_arrowtips', quantity: 15 },
                level: 5,
                xp: 12.5,
                duration: 2400,
                successRate: 1.0
            },
            'iron_arrowtips': {
                inputs: [{ itemId: 'iron_bar', quantity: 1 }],
                output: { itemId: 'iron_arrowtips', quantity: 15 },
                level: 20,
                xp: 25,
                duration: 2400,
                successRate: 1.0
            },
            'steel_arrowtips': {
                inputs: [{ itemId: 'steel_bar', quantity: 1 }],
                output: { itemId: 'steel_arrowtips', quantity: 15 },
                level: 35,
                xp: 37.5,
                duration: 2400,
                successRate: 1.0
            },
            'mithril_arrowtips': {
                inputs: [{ itemId: 'mithril_bar', quantity: 1 }],
                output: { itemId: 'mithril_arrowtips', quantity: 15 },
                level: 55,
                xp: 50,
                duration: 2400,
                successRate: 1.0
            },
            'adamant_arrowtips': {
                inputs: [{ itemId: 'adamantite_bar', quantity: 1 }],
                output: { itemId: 'adamant_arrowtips', quantity: 15 },
                level: 75,
                xp: 62.5,
                duration: 2400,
                successRate: 1.0
            },
            'rune_arrowtips': {
                inputs: [{ itemId: 'runite_bar', quantity: 1 }],
                output: { itemId: 'rune_arrowtips', quantity: 15 },
                level: 90,
                xp: 75,
                duration: 2400,
                successRate: 1.0
            },
            'amethyst_arrowtips': {
                inputs: [{ itemId: 'amethyst_bar', quantity: 1 }],
                output: { itemId: 'amethyst_arrowtips', quantity: 15 },
                level: 96,
                xp: 100,
                duration: 2400,
                successRate: 1.0
            }
        };
    }
    
    // ==================== TASK GENERATION ====================
    
    generateTask() {
        // Get available products we can make
        const availableProducts = this.getAvailableProducts();
        
        if (availableProducts.length === 0) {
            console.log('No smithing products available with current materials');
            return null;
        }
        
        // Filter out items that already have tasks
        const filteredProducts = this.filterOutExistingTasks(availableProducts);
        
        if (filteredProducts.length === 0) {
            console.log('All available smithing products already have tasks');
            return null;
        }
        
        // Select a product using weighted distribution
        const selectedProduct = this.selectWeightedProduct(filteredProducts);
        if (!selectedProduct) {
            console.log('Failed to select product for smithing');
            return null;
        }
        
        // Find appropriate node (furnace for bars, anvil for arrowtips)
        const activityType = selectedProduct.isSmelting ? 'smelting' : 'smithing';
        const nodes = this.findNodesForActivity(activityType);
        
        if (nodes.length === 0) {
            console.log(`No ${activityType} locations available`);
            return null;
        }
        
        // Select a random node
        const selectedNode = nodes[Math.floor(Math.random() * nodes.length)];
        
        // Determine target count
        let desiredCount = this.determineTargetCount(selectedProduct.outputId);
        
        // For arrowtips, adjust target to be divisible by 15
        if (selectedProduct.outputId.includes('arrowtips')) {
            desiredCount = Math.floor(desiredCount / 15) * 15;
            desiredCount = Math.max(15, desiredCount); // At least 1 bar worth
        }
        
        // Calculate how many crafts needed
        const outputPerCraft = selectedProduct.recipe.output.quantity;
        const craftsNeeded = Math.ceil(desiredCount / outputPerCraft);
        
        // Check if we have enough materials
        const canMake = this.calculateMaxCraftable(selectedProduct.recipe);
        if (canMake < craftsNeeded) {
            desiredCount = canMake * outputPerCraft;
            if (desiredCount < outputPerCraft) {
                console.log(`Not enough materials for even one ${selectedProduct.outputId}`);
                return null;
            }
        }
        
        // Get item names
        const itemData = loadingManager.getData('items')[selectedProduct.outputId];
        const nodeData = window.nodes ? window.nodes.getNode(selectedNode.nodeId) : null;
        const nodeName = nodeData ? nodeData.name : selectedNode.nodeId;
        
        const verb = selectedProduct.isSmelting ? 'Smelt' : 'Smith';
        
        return {
            skill: this.id,
            itemId: selectedProduct.outputId, // Track output production
            targetCount: desiredCount,
            nodeId: selectedNode.nodeId,
            activityId: selectedNode.activityId,
            description: `${verb} ${desiredCount} ${itemData.name} at ${nodeName}`,
            startingCount: 0,
            progress: 0,
            isSmithingTask: true,
            isSmelting: selectedProduct.isSmelting,
            itemsProduced: 0,
            recipe: selectedProduct.recipe
        };
    }
    
    getAvailableProducts() {
        const products = [];
        const smithingLevel = skills.getLevel('smithing');
        
        // Check smelting recipes
        for (const [outputId, recipe] of Object.entries(this.smeltingRecipes)) {
            if (smithingLevel < recipe.level) continue;
            
            // Check if we have materials
            if (this.hasIngredientsForRecipe(recipe)) {
                products.push({
                    outputId: outputId,
                    recipe: recipe,
                    isSmelting: true,
                    available: this.calculateMaxCraftable(recipe)
                });
            }
        }
        
        // Check smithing recipes
        for (const [outputId, recipe] of Object.entries(this.smithingRecipes)) {
            if (smithingLevel < recipe.level) continue;
            
            // Check if we have materials
            if (this.hasIngredientsForRecipe(recipe)) {
                products.push({
                    outputId: outputId,
                    recipe: recipe,
                    isSmelting: false,
                    available: this.calculateMaxCraftable(recipe)
                });
            }
        }
        
        return products;
    }
    
    hasIngredientsForRecipe(recipe) {
        for (const input of recipe.inputs) {
            const totalAvailable = inventory.getItemCount(input.itemId) + bank.getItemCount(input.itemId);
            if (totalAvailable < input.quantity) {
                return false;
            }
        }
        return true;
    }
    
    calculateMaxCraftable(recipe) {
        let maxCraftable = Infinity;
        
        for (const input of recipe.inputs) {
            const totalAvailable = inventory.getItemCount(input.itemId) + bank.getItemCount(input.itemId);
            const canMake = Math.floor(totalAvailable / input.quantity);
            maxCraftable = Math.min(maxCraftable, canMake);
        }
        
        return maxCraftable;
    }
    
    filterOutExistingTasks(products) {
        if (!window.taskManager) return products;
        
        const filtered = [];
        const existingTasks = taskManager.getAllTasks();
        
        for (const product of products) {
            const existingTask = existingTasks.find(task => 
                task.isSmithingTask && 
                task.itemId === product.outputId &&
                task.progress < 1
            );
            
            if (!existingTask) {
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
    
    updateSmithingTaskProgress(outputId, quantity) {
        if (!window.taskManager) return;
        
        const currentTask = taskManager.getFirstIncompleteTask();
        
        if (currentTask && currentTask.isSmithingTask && currentTask.itemId === outputId) {
            currentTask.itemsProduced = (currentTask.itemsProduced || 0) + quantity;
            const progress = currentTask.itemsProduced / currentTask.targetCount;
            
            console.log(`Smithing progress: ${currentTask.itemsProduced}/${currentTask.targetCount}`);
            
            taskManager.setTaskProgress(currentTask, progress);
        }
    }
    
    // ==================== PROCESSING SKILL INTERFACE ====================
    
    hasMaterialsForCurrentTask() {
        if (!window.ai || !window.ai.currentTask || !window.ai.currentTask.isSmithingTask) {
            return false;
        }
        
        const task = window.ai.currentTask;
        const recipe = task.recipe;
        
        // Check if we have all required inputs
        for (const input of recipe.inputs) {
            if (!inventory.hasItem(input.itemId, input.quantity)) {
                return false;
            }
        }
        
        return true;
    }
    
    getMaterialsNeededForTask(task) {
        if (!task || !task.isSmithingTask) return null;
        
        const recipe = task.recipe;
        const craftsRemaining = Math.ceil((task.targetCount - (task.itemsProduced || 0)) / recipe.output.quantity);
        
        // Return the primary material needed
        return {
            itemId: recipe.inputs[0].itemId,
            quantity: recipe.inputs[0].quantity * craftsRemaining
        };
    }
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        // Use duration from current recipe if available
        let duration = this.currentRecipe ? this.currentRecipe.duration : 2400;
        
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
            
            if (timeProcessing < 3000) {
                if (window.ai && window.ai.currentTask && window.ai.currentTask.isSmithingTask) {
                    const taskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
                    if (this.processingTaskId === taskId) {
                        console.log('Already processing, rejecting duplicate start');
                        return false;
                    }
                }
            } else {
                console.log('Processing took too long, resetting state');
                this.clearProcessingState();
            }
        }
        
        // Determine which recipe to use
        let recipe = null;
        
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isSmithingTask) {
            recipe = window.ai.currentTask.recipe;
        } else {
            // Find any recipe we can do
            recipe = this.findRecipeToProcess(activityData);
        }
        
        if (!recipe) {
            console.log('No recipe available to process');
            this.clearProcessingState();
            
            if (window.ai) {
                window.ai.decisionCooldown = 0;
            }
            
            return false;
        }
        
        // Check inputs
        for (const input of recipe.inputs) {
            if (!inventory.hasItem(input.itemId, input.quantity)) {
                console.log(`Missing ${input.quantity} ${input.itemId} for recipe`);
                this.clearProcessingState();
                
                if (window.ai) {
                    window.ai.decisionCooldown = 0;
                }
                
                return false;
            }
        }
        
        // Store recipe
        this.currentRecipe = recipe;
        
        // Set processing state
        this.isProcessing = true;
        this.processingStartTime = Date.now();
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isSmithingTask) {
            this.processingTaskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
        } else {
            this.processingTaskId = null;
        }
        
        console.log(`Starting to process ${recipe.output.itemId}`);
        
        return true;
    }
    
    processRewards(activityData, level) {
        this.clearProcessingState();
        
        if (!this.currentRecipe) {
            this.lastSmithingXp = 0;
            return [];
        }
        
        // Consume inputs
        for (const input of this.currentRecipe.inputs) {
            inventory.removeItem(input.itemId, input.quantity);
        }
        
        // Check success
        const success = Math.random() <= this.currentRecipe.successRate;
        
        if (success) {
            this.lastSmithingXp = this.currentRecipe.xp;
            
            // Update task progress
            this.updateSmithingTaskProgress(this.currentRecipe.output.itemId, this.currentRecipe.output.quantity);
            
            return [{
                itemId: this.currentRecipe.output.itemId,
                quantity: this.currentRecipe.output.quantity
            }];
        } else {
            console.log('Failed to create item (iron smelting failure)');
            this.lastSmithingXp = 0;
            return [];
        }
    }
    
    shouldGrantXP(rewards, activityData) {
        return this.lastSmithingXp > 0;
    }
    
    getXpToGrant(rewards, activityData) {
        return this.lastSmithingXp || 0;
    }
    
    findRecipeToProcess(activityData) {
        const level = skills.getLevel('smithing');
        
        // Check if this is smelting or smithing activity
        if (activityData.id === 'smelting') {
            // Find first smelting recipe we can do
            for (const recipe of Object.values(this.smeltingRecipes)) {
                if (level >= recipe.level && this.hasIngredientsInInventory(recipe)) {
                    return recipe;
                }
            }
        } else if (activityData.id === 'smithing') {
            // Find first smithing recipe we can do
            for (const recipe of Object.values(this.smithingRecipes)) {
                if (level >= recipe.level && this.hasIngredientsInInventory(recipe)) {
                    return recipe;
                }
            }
        }
        
        return null;
    }
    
    hasIngredientsInInventory(recipe) {
        for (const input of recipe.inputs) {
            if (!inventory.hasItem(input.itemId, input.quantity)) {
                return false;
            }
        }
        return true;
    }
    
    canPerformActivity(activityId) {
        const activityData = loadingManager.getData('activities')[activityId];
        if (!activityData || activityData.skill !== this.id) return false;
        
        const level = skills.getLevel('smithing');
        const recipe = this.findRecipeToProcess(activityData);
        
        return recipe !== null;
    }
    
    clearProcessingState() {
        this.isProcessing = false;
        this.processingTaskId = null;
        this.processingStartTime = 0;
    }
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        if (!task || task.skill !== 'smithing') return false;
        if (!task.isSmithingTask) return false;
        
        // Check if we have the required inputs
        const recipe = task.recipe;
        for (const input of recipe.inputs) {
            if (!inventory.hasItem(input.itemId, input.quantity)) {
                console.log(`Need banking: missing ${input.itemId} for smithing`);
                return true;
            }
        }
        
        return false;
    }
    
    handleBanking(task) {
    // Deposit all first
    bank.depositAll();
    console.log('Deposited all items for smithing');
    
    // Mark that we've banked
    const taskId = task ? `${task.itemId}_${task.targetCount}_${task.nodeId}` : null;
    this.currentTaskId = taskId;
    this.hasBankedForTask = true;
    
    let withdrawnAny = false;
    
    if (task && task.isSmithingTask) {
        const recipe = task.recipe;
        const craftsRemaining = Math.ceil((task.targetCount - (task.itemsProduced || 0)) / recipe.output.quantity);
        
        // Calculate how many we can actually make based on bank materials
        let maxCraftable = craftsRemaining;
        for (const input of recipe.inputs) {
            const bankCount = bank.getItemCount(input.itemId);
            const canMake = Math.floor(bankCount / input.quantity);
            maxCraftable = Math.min(maxCraftable, canMake);
        }
        
        if (maxCraftable === 0) {
            console.log('No materials in bank for smithing task');
            return false;
        }
        
        // SPECIAL HANDLING FOR IRON SMELTING (50% failure rate)
        // Always fill inventory with iron ore to account for failures
        if (recipe.output.itemId === 'iron_bar' && recipe.inputs.length === 1) {
            const ironOreCount = bank.getItemCount('iron_ore');
            const toWithdraw = Math.min(28, ironOreCount); // Fill inventory
            
            const withdrawn = bank.withdrawUpTo('iron_ore', toWithdraw);
            if (withdrawn > 0) {
                inventory.addItem('iron_ore', withdrawn);
                console.log(`Withdrew ${withdrawn} iron ore (filling inventory due to 50% failure rate)`);
                withdrawnAny = true;
            } else {
                console.log('Failed to withdraw iron ore');
                return false;
            }
        } else {
            // NORMAL SMITHING/SMELTING - use ratio-based withdrawal
            // Calculate optimal withdrawal based on recipe ratios and inventory space
            const totalSlots = 28;
            
            // Calculate total ratio units (e.g., for steel: 1 iron + 2 coal = 3 units)
            let totalRatioUnits = 0;
            for (const input of recipe.inputs) {
                totalRatioUnits += input.quantity;
            }
            
            // Calculate how many complete sets we can fit in inventory
            const setsPerInventory = Math.floor(totalSlots / totalRatioUnits);
            
            // Limit to what we can actually make and what we need
            const toMake = Math.min(maxCraftable, setsPerInventory);
            
            if (toMake === 0) {
                console.log('Recipe requires too many items per craft for inventory');
                return false;
            }
            
            // Withdraw materials respecting the exact ratios
            for (const input of recipe.inputs) {
                const needed = input.quantity * toMake;
                const withdrawn = bank.withdrawUpTo(input.itemId, needed);
                
                if (withdrawn > 0) {
                    inventory.addItem(input.itemId, withdrawn);
                    console.log(`Withdrew ${withdrawn} ${input.itemId} for ${toMake} crafts`);
                    withdrawnAny = true;
                } else if (withdrawn < needed) {
                    console.log(`Warning: Only withdrew ${withdrawn}/${needed} ${input.itemId}`);
                }
            }
            
            // Log the exact inventory setup for debugging
            if (withdrawnAny) {
                const invSummary = recipe.inputs.map(input => 
                    `${inventory.getItemCount(input.itemId)} ${input.itemId}`
                ).join(', ');
                console.log(`Inventory setup for ${toMake} ${recipe.output.itemId}: ${invSummary}`);
            }
        }
    }
    
    return withdrawnAny;
}
    
    canContinueTask(task) {
        if (!task || !task.isSmithingTask) return true;
        
        // Check if we have enough materials for remaining items
        const recipe = task.recipe;
        const craftsRemaining = Math.ceil((task.targetCount - (task.itemsProduced || 0)) / recipe.output.quantity);
        
        for (const input of recipe.inputs) {
            const totalAvailable = inventory.getItemCount(input.itemId) + bank.getItemCount(input.itemId);
            const needed = input.quantity * craftsRemaining;
            
            if (totalAvailable < input.quantity) {
                console.log(`Cannot continue smithing - need ${input.quantity} ${input.itemId}, have ${totalAvailable}`);
                this.hasBankedForTask = false;
                this.currentTaskId = null;
                this.clearProcessingState();
                return false;
            }
        }
        
        return true;
    }
    
    hasMaterials() {
        // Check if we have any materials to process
        const level = skills.getLevel('smithing');
        
        // Check smelting recipes
        for (const recipe of Object.values(this.smeltingRecipes)) {
            if (level >= recipe.level && this.hasIngredientsInInventory(recipe)) {
                return true;
            }
        }
        
        // Check smithing recipes
        for (const recipe of Object.values(this.smithingRecipes)) {
            if (level >= recipe.level && this.hasIngredientsInInventory(recipe)) {
                return true;
            }
        }
        
        return false;
    }
    
    onActivityComplete(activityData) {
        this.clearProcessingState();
        
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isSmithingTask) {
            if (window.ai.currentTask.progress >= 1) {
                console.log('Smithing task complete, resetting banking state');
                this.hasBankedForTask = false;
                this.currentTaskId = null;
            } else {
                // Check if we need to bank for more materials
                if (!this.hasMaterialsForCurrentTask()) {
                    console.log('Smithing task needs more materials');
                    this.hasBankedForTask = false;
                    
                    if (window.ai) {
                        window.ai.decisionCooldown = 0;
                    }
                }
            }
        }
    }
    
    onActivityStopped() {
        console.log('Smithing activity was stopped, clearing state');
        this.clearProcessingState();
    }
}

// Make SmithingSkill available globally
window.SmithingSkill = SmithingSkill;
