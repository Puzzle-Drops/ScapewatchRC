class CraftingSkill extends BaseSkill {
    constructor() {
        super('crafting', 'Crafting');
        this.requiresBankingBeforeTask = true; // Always bank before crafting
        this.isProcessingSkill = true;
        this.lastCraftingXp = 0;
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
            // Glass blowing tasks
            { itemId: 'blown_glass',    name: 'Blown glass',    minCount: 25, maxCount: 50, level: 1  },
            { itemId: 'vial_of_water',  name: 'Vials of water', minCount: 25, maxCount: 50, level: 10 },
            
            // Gem cutting tasks
            { itemId: 'sapphire',   name: 'Sapphires',   minCount: 20, maxCount: 40, level: 20 },
            { itemId: 'emerald',    name: 'Emeralds',    minCount: 20, maxCount: 40, level: 27 },
            { itemId: 'ruby',       name: 'Rubies',      minCount: 20, maxCount: 40, level: 34 },
            { itemId: 'diamond',    name: 'Diamonds',    minCount: 20, maxCount: 40, level: 43 },
            
            // Plank making tasks
            { itemId: 'plank',          name: 'Planks',          minCount: 30, maxCount: 60, level: 10 },
            { itemId: 'oak_plank',      name: 'Oak planks',      minCount: 30, maxCount: 60, level: 15 },
            { itemId: 'teak_plank',     name: 'Teak planks',     minCount: 30, maxCount: 60, level: 20 },
            { itemId: 'mahogany_plank', name: 'Mahogany planks', minCount: 30, maxCount: 60, level: 40 }
        ];
        
        // Glass blowing recipes
        this.glassBlowingRecipes = {
            'blown_glass': {
                inputs: [{ itemId: 'ashes', quantity: 1 }],
                output: { itemId: 'blown_glass', quantity: 1 },
                level: 1,
                xp: 20,
                duration: 600,
                activityType: 'blowing_glass'
            },
            'vial_of_water': {
                inputs: [{ itemId: 'blown_glass', quantity: 1 }],
                output: { itemId: 'vial_of_water', quantity: 1 },
                level: 10,
                xp: 20,
                duration: 600,
                activityType: 'blowing_glass'
            }
        };
        
        // Gem cutting recipes
        this.gemCuttingRecipes = {
            'sapphire': {
                inputs: [{ itemId: 'uncut_sapphire', quantity: 1 }],
                output: { itemId: 'sapphire', quantity: 1 },
                level: 20,
                xp: 50,
                duration: 1200,
                activityType: 'cutting_gems'
            },
            'emerald': {
                inputs: [{ itemId: 'uncut_emerald', quantity: 1 }],
                output: { itemId: 'emerald', quantity: 1 },
                level: 27,
                xp: 67.5,
                duration: 1200,
                activityType: 'cutting_gems'
            },
            'ruby': {
                inputs: [{ itemId: 'uncut_ruby', quantity: 1 }],
                output: { itemId: 'ruby', quantity: 1 },
                level: 34,
                xp: 85,
                duration: 1200,
                activityType: 'cutting_gems'
            },
            'diamond': {
                inputs: [{ itemId: 'uncut_diamond', quantity: 1 }],
                output: { itemId: 'diamond', quantity: 1 },
                level: 43,
                xp: 107.5,
                duration: 1200,
                activityType: 'cutting_gems'
            }
        };
        
        // Plank making recipes
        this.plankMakingRecipes = {
            'plank': {
                inputs: [
                    { itemId: 'logs', quantity: 1 },
                    { itemId: 'coins', quantity: 70 }
                ],
                output: { itemId: 'plank', quantity: 1 },
                level: 10,
                xp: 15,
                duration: 600,
                activityType: 'plank_making'
            },
            'oak_plank': {
                inputs: [
                    { itemId: 'oak_logs', quantity: 1 },
                    { itemId: 'coins', quantity: 175 }
                ],
                output: { itemId: 'oak_plank', quantity: 1 },
                level: 15,
                xp: 30,
                duration: 600,
                activityType: 'plank_making'
            },
            'teak_plank': {
                inputs: [
                    { itemId: 'teak_logs', quantity: 1 },
                    { itemId: 'coins', quantity: 350 }
                ],
                output: { itemId: 'teak_plank', quantity: 1 },
                level: 20,
                xp: 45,
                duration: 600,
                activityType: 'plank_making'
            },
            'mahogany_plank': {
                inputs: [
                    { itemId: 'mahogany_logs', quantity: 1 },
                    { itemId: 'coins', quantity: 1050 }
                ],
                output: { itemId: 'mahogany_plank', quantity: 1 },
                level: 40,
                xp: 75,
                duration: 600,
                activityType: 'plank_making'
            }
        };
        
        // Combined recipes for easy lookup
        this.allRecipes = {
            ...this.glassBlowingRecipes,
            ...this.gemCuttingRecipes,
            ...this.plankMakingRecipes
        };
    }
    
    // ==================== TASK GENERATION ====================
    
    generateTask() {
        // Get available products we can make
        const availableProducts = this.getAvailableProducts();
        
        if (availableProducts.length === 0) {
            console.log('No crafting products available with current materials');
            return null;
        }
        
        // Filter out items that already have tasks
        const filteredProducts = this.filterOutExistingTasks(availableProducts);
        
        if (filteredProducts.length === 0) {
            console.log('All available crafting products already have tasks');
            return null;
        }
        
        // Select a product using weighted distribution
        const selectedProduct = this.selectWeightedProduct(filteredProducts);
        if (!selectedProduct) {
            console.log('Failed to select product for crafting');
            return null;
        }
        
        // Find appropriate node based on activity type
        const nodes = this.findNodesForActivity(selectedProduct.recipe.activityType);
        
        if (nodes.length === 0) {
            console.log(`No ${selectedProduct.recipe.activityType} locations available`);
            return null;
        }
        
        // Select a node (could be weighted in future)
        const selectedNode = nodes[Math.floor(Math.random() * nodes.length)];
        
        // Determine target count
        const desiredCount = this.determineTargetCount(selectedProduct.outputId);
        
        // Check if we have enough materials
        const canMake = this.calculateMaxCraftable(selectedProduct.recipe);
        const targetCount = Math.min(desiredCount, canMake);
        
        if (targetCount < 1) {
            console.log(`Not enough materials for even one ${selectedProduct.outputId}`);
            return null;
        }
        
        // Get item names
        const itemData = loadingManager.getData('items')[selectedProduct.outputId];
        const nodeData = window.nodes ? window.nodes.getNode(selectedNode.nodeId) : null;
        const nodeName = nodeData ? nodeData.name : selectedNode.nodeId;
        
        const verb = selectedProduct.recipe.activityType === 'plank_making' ? 'Make' : 'Craft';
        
        return {
            skill: this.id,
            itemId: selectedProduct.outputId,
            targetCount: targetCount,
            nodeId: selectedNode.nodeId,
            activityId: selectedNode.activityId,
            description: `${verb} ${targetCount} ${itemData.name} at ${nodeName}`,
            startingCount: 0,
            progress: 0,
            isCraftingTask: true,
            itemsProduced: 0,
            recipe: selectedProduct.recipe,
            activityType: selectedProduct.recipe.activityType
        };
    }
    
    getAvailableProducts() {
        const products = [];
        const craftingLevel = skills.getLevel('crafting');
        
        // Check all recipes
        for (const [outputId, recipe] of Object.entries(this.allRecipes)) {
            if (craftingLevel < recipe.level) continue;
            
            // Check if we have materials
            if (this.hasIngredientsForRecipe(recipe)) {
                products.push({
                    outputId: outputId,
                    recipe: recipe,
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
                task.isCraftingTask && 
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
        return 'Craft';
    }
    
    updateCraftingTaskProgress(outputId, quantity) {
        if (!window.taskManager) return;
        
        const currentTask = taskManager.getFirstIncompleteTask();
        
        if (currentTask && currentTask.isCraftingTask && currentTask.itemId === outputId) {
            currentTask.itemsProduced = (currentTask.itemsProduced || 0) + quantity;
            const progress = currentTask.itemsProduced / currentTask.targetCount;
            
            console.log(`Crafting progress: ${currentTask.itemsProduced}/${currentTask.targetCount}`);
            
            taskManager.setTaskProgress(currentTask, progress);
        }
    }
    
    // ==================== PROCESSING SKILL INTERFACE ====================
    
    hasMaterialsForCurrentTask() {
        if (!window.ai || !window.ai.currentTask || !window.ai.currentTask.isCraftingTask) {
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
        if (!task || !task.isCraftingTask) return null;
        
        const recipe = task.recipe;
        const craftsRemaining = task.targetCount - (task.itemsProduced || 0);
        
        // Return the primary material needed
        return {
            itemId: recipe.inputs[0].itemId,
            quantity: recipe.inputs[0].quantity * craftsRemaining
        };
    }
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        // Use duration from current recipe if available
        let duration = this.currentRecipe ? this.currentRecipe.duration : 600;
        
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
            
            if (timeProcessing < 1200) { // Max duration is 1200ms for gem cutting
                if (window.ai && window.ai.currentTask && window.ai.currentTask.isCraftingTask) {
                    const taskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
                    if (this.processingTaskId === taskId) {
                        console.log('Already crafting, rejecting duplicate start');
                        return false;
                    }
                }
            } else {
                console.log('Crafting took too long, resetting state');
                this.clearProcessingState();
            }
        }
        
        // Determine which recipe to use
        let recipe = null;
        
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isCraftingTask) {
            recipe = window.ai.currentTask.recipe;
        } else {
            // Find any recipe we can do based on activity type
            recipe = this.findRecipeToProcess(activityData);
        }
        
        if (!recipe) {
            console.log('No recipe available to craft');
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
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isCraftingTask) {
            this.processingTaskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
        } else {
            this.processingTaskId = null;
        }
        
        console.log(`Starting to craft ${recipe.output.itemId}`);
        
        return true;
    }
    
    processRewards(activityData, level) {
        this.clearProcessingState();
        
        if (!this.currentRecipe) {
            this.lastCraftingXp = 0;
            return [];
        }
        
        // Consume inputs
        for (const input of this.currentRecipe.inputs) {
            inventory.removeItem(input.itemId, input.quantity);
        }
        
        // Crafting always succeeds
        this.lastCraftingXp = this.currentRecipe.xp;
        
        // Update task progress
        this.updateCraftingTaskProgress(this.currentRecipe.output.itemId, this.currentRecipe.output.quantity);
        
        return [{
            itemId: this.currentRecipe.output.itemId,
            quantity: this.currentRecipe.output.quantity
        }];
    }
    
    shouldGrantXP(rewards, activityData) {
        return this.lastCraftingXp > 0;
    }
    
    getXpToGrant(rewards, activityData) {
        return this.lastCraftingXp || 0;
    }
    
    findRecipeToProcess(activityData) {
        const level = skills.getLevel('crafting');
        const activityId = activityData.id || activityData.activityId;
        
        // Determine which recipe set to use based on activity
        let recipeSet = null;
        if (activityId === 'blowing_glass') {
            recipeSet = this.glassBlowingRecipes;
        } else if (activityId === 'cutting_gems') {
            recipeSet = this.gemCuttingRecipes;
        } else if (activityId === 'plank_making') {
            recipeSet = this.plankMakingRecipes;
        }
        
        if (!recipeSet) return null;
        
        // Find first recipe we can do
        for (const recipe of Object.values(recipeSet)) {
            if (level >= recipe.level && this.hasIngredientsInInventory(recipe)) {
                return recipe;
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
        
        const level = skills.getLevel('crafting');
        const recipe = this.findRecipeToProcess({ id: activityId });
        
        return recipe !== null;
    }
    
    clearProcessingState() {
        this.isProcessing = false;
        this.processingTaskId = null;
        this.processingStartTime = 0;
    }
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        if (!task || task.skill !== 'crafting') return false;
        if (!task.isCraftingTask) return false;
        
        // Check if we have the required inputs
        const recipe = task.recipe;
        for (const input of recipe.inputs) {
            if (!inventory.hasItem(input.itemId, input.quantity)) {
                console.log(`Need banking: missing ${input.itemId} for crafting`);
                return true;
            }
        }
        
        return false;
    }
    
    handleBanking(task) {
        // Deposit all first
        bank.depositAll();
        console.log('Deposited all items for crafting');
        
        // Mark that we've banked
        const taskId = task ? `${task.itemId}_${task.targetCount}_${task.nodeId}` : null;
        this.currentTaskId = taskId;
        this.hasBankedForTask = true;
        
        let withdrawnAny = false;
        
        if (task && task.isCraftingTask) {
            const recipe = task.recipe;
            const craftsRemaining = task.targetCount - (task.itemsProduced || 0);
            
            // Calculate how many we can actually make
            let maxCraftable = craftsRemaining;
            for (const input of recipe.inputs) {
                const bankCount = bank.getItemCount(input.itemId);
                const canMake = Math.floor(bankCount / input.quantity);
                maxCraftable = Math.min(maxCraftable, canMake);
            }
            
            if (maxCraftable === 0) {
                console.log('No materials in bank for crafting task');
                return false;
            }
            
            // Withdraw materials for as many as we can fit
            const inventorySlots = 28;
            let slotsNeeded = recipe.inputs.length;
            
            // For plank making, we need logs and coins (both stackable)
            // For glass/gems, we need 1 type of material
            let toMake = Math.min(maxCraftable, Math.floor(inventorySlots / slotsNeeded));
            
            // Special handling for stackable items
            const itemsData = loadingManager.getData('items');
            let allStackable = true;
            for (const input of recipe.inputs) {
                if (!itemsData[input.itemId].stackable) {
                    allStackable = false;
                    break;
                }
            }
            
            if (allStackable) {
                // If all inputs are stackable, we can make as many as we have materials for
                toMake = maxCraftable;
            }
            
            if (toMake === 0) {
                console.log('Cannot fit recipe materials in inventory');
                return false;
            }
            
            // Withdraw materials
            for (const input of recipe.inputs) {
                const needed = input.quantity * toMake;
                const withdrawn = bank.withdrawUpTo(input.itemId, needed);
                
                if (withdrawn > 0) {
                    inventory.addItem(input.itemId, withdrawn);
                    console.log(`Withdrew ${withdrawn} ${input.itemId} for ${toMake} crafts`);
                    withdrawnAny = true;
                }
            }
        }
        
        return withdrawnAny;
    }
    
    canContinueTask(task) {
        if (!task || !task.isCraftingTask) return true;
        
        // Check if we have enough materials for remaining items
        const recipe = task.recipe;
        const craftsRemaining = task.targetCount - (task.itemsProduced || 0);
        
        for (const input of recipe.inputs) {
            const totalAvailable = inventory.getItemCount(input.itemId) + bank.getItemCount(input.itemId);
            const needed = input.quantity * craftsRemaining;
            
            if (totalAvailable < input.quantity) {
                console.log(`Cannot continue crafting - need ${input.quantity} ${input.itemId}, have ${totalAvailable}`);
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
        const level = skills.getLevel('crafting');
        
        // Check all recipe types
        const allRecipeSets = [this.glassBlowingRecipes, this.gemCuttingRecipes, this.plankMakingRecipes];
        
        for (const recipeSet of allRecipeSets) {
            for (const recipe of Object.values(recipeSet)) {
                if (level >= recipe.level && this.hasIngredientsInInventory(recipe)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    onActivityComplete(activityData) {
        this.clearProcessingState();
        
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isCraftingTask) {
            if (window.ai.currentTask.progress >= 1) {
                console.log('Crafting task complete, resetting banking state');
                this.hasBankedForTask = false;
                this.currentTaskId = null;
            } else {
                // Check if we need to bank for more materials
                if (!this.hasMaterialsForCurrentTask()) {
                    console.log('Crafting task needs more materials');
                    this.hasBankedForTask = false;
                    
                    if (window.ai) {
                        window.ai.decisionCooldown = 0;
                    }
                }
            }
        }
    }
    
    onActivityStopped() {
        console.log('Crafting activity was stopped, clearing state');
        this.clearProcessingState();
    }
}
