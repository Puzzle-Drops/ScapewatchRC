class FletchingSkill extends BaseSkill {
    constructor() {
        super('fletching', 'Fletching');
        this.requiresBankingBeforeTask = true; // Always bank before fletching
        this.isProcessingSkill = true;
        this.lastFletchingXp = 0;
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
        // Task data for UI and task generation - ALL MULTIPLES OF 15
        this.SKILL_DATA = [
            // Headless arrows
            { itemId: 'headless_arrow', name: 'Headless arrows', minCount: 150, maxCount: 450, level: 1 },
            
            // Arrow shafts from different logs (quantities adjusted for output amounts)
            { itemId: 'arrow_shaft_from_logs', name: 'Arrow shafts (regular logs)', minCount: 150, maxCount: 450, level: 1 },
            { itemId: 'arrow_shaft_from_oak', name: 'Arrow shafts (oak)', minCount: 300, maxCount: 600, level: 15 },
            { itemId: 'arrow_shaft_from_willow', name: 'Arrow shafts (willow)', minCount: 450, maxCount: 900, level: 30 },
            { itemId: 'arrow_shaft_from_maple', name: 'Arrow shafts (maple)', minCount: 600, maxCount: 1200, level: 45 },
            { itemId: 'arrow_shaft_from_yew', name: 'Arrow shafts (yew)', minCount: 750, maxCount: 1500, level: 60 },
            { itemId: 'arrow_shaft_from_magic', name: 'Arrow shafts (magic)', minCount: 900, maxCount: 1800, level: 75 },
            { itemId: 'arrow_shaft_from_redwood', name: 'Arrow shafts (redwood)', minCount: 1050, maxCount: 2100, level: 90 },
            
            // Complete arrows
            { itemId: 'bronze_arrow', name: 'Bronze arrows', minCount: 150, maxCount: 450, level: 1 },
            { itemId: 'iron_arrow', name: 'Iron arrows', minCount: 150, maxCount: 450, level: 15 },
            { itemId: 'steel_arrow', name: 'Steel arrows', minCount: 150, maxCount: 450, level: 30 },
            { itemId: 'mithril_arrow', name: 'Mithril arrows', minCount: 150, maxCount: 450, level: 45 },
            { itemId: 'adamant_arrow', name: 'Adamant arrows', minCount: 150, maxCount: 450, level: 60 },
            { itemId: 'rune_arrow', name: 'Rune arrows', minCount: 150, maxCount: 450, level: 75 },
            { itemId: 'amethyst_arrow', name: 'Amethyst arrows', minCount: 150, maxCount: 450, level: 82 }
        ];
        
        // Fletching recipes
        this.headlessArrowRecipe = {
            inputs: [
                { itemId: 'arrow_shaft', quantity: 15 },
                { itemId: 'feather', quantity: 15 }
            ],
            output: { itemId: 'headless_arrow', quantity: 15 },
            level: 1,
            xp: 19.5, // 1.3 per arrow * 15
            duration: 1200
        };
        
        this.arrowShaftRecipes = {
            'logs': {
                inputs: [{ itemId: 'logs', quantity: 1 }],
                output: { itemId: 'arrow_shaft', quantity: 15 },
                level: 1,
                xp: 5,
                duration: 1200
            },
            'oak_logs': {
                inputs: [{ itemId: 'oak_logs', quantity: 1 }],
                output: { itemId: 'arrow_shaft', quantity: 30 },
                level: 15,
                xp: 10,
                duration: 1200
            },
            'willow_logs': {
                inputs: [{ itemId: 'willow_logs', quantity: 1 }],
                output: { itemId: 'arrow_shaft', quantity: 45 },
                level: 30,
                xp: 15,
                duration: 1200
            },
            'maple_logs': {
                inputs: [{ itemId: 'maple_logs', quantity: 1 }],
                output: { itemId: 'arrow_shaft', quantity: 60 },
                level: 45,
                xp: 20,
                duration: 1200
            },
            'yew_logs': {
                inputs: [{ itemId: 'yew_logs', quantity: 1 }],
                output: { itemId: 'arrow_shaft', quantity: 75 },
                level: 60,
                xp: 25,
                duration: 1200
            },
            'magic_logs': {
                inputs: [{ itemId: 'magic_logs', quantity: 1 }],
                output: { itemId: 'arrow_shaft', quantity: 90 },
                level: 75,
                xp: 30,
                duration: 1200
            },
            'redwood_logs': {
                inputs: [{ itemId: 'redwood_logs', quantity: 1 }],
                output: { itemId: 'arrow_shaft', quantity: 105 },
                level: 90,
                xp: 35,
                duration: 1200
            }
        };
        
        this.completeArrowRecipes = {
            'bronze_arrow': {
                inputs: [
                    { itemId: 'headless_arrow', quantity: 15 },
                    { itemId: 'bronze_arrowtips', quantity: 15 }
                ],
                output: { itemId: 'bronze_arrow', quantity: 15 },
                level: 1,
                xp: 19.5, // 1.3 per arrow * 15
                duration: 1200
            },
            'iron_arrow': {
                inputs: [
                    { itemId: 'headless_arrow', quantity: 15 },
                    { itemId: 'iron_arrowtips', quantity: 15 }
                ],
                output: { itemId: 'iron_arrow', quantity: 15 },
                level: 15,
                xp: 37.5, // 2.5 per arrow * 15
                duration: 1200
            },
            'steel_arrow': {
                inputs: [
                    { itemId: 'headless_arrow', quantity: 15 },
                    { itemId: 'steel_arrowtips', quantity: 15 }
                ],
                output: { itemId: 'steel_arrow', quantity: 15 },
                level: 30,
                xp: 75, // 5 per arrow * 15
                duration: 1200
            },
            'mithril_arrow': {
                inputs: [
                    { itemId: 'headless_arrow', quantity: 15 },
                    { itemId: 'mithril_arrowtips', quantity: 15 }
                ],
                output: { itemId: 'mithril_arrow', quantity: 15 },
                level: 45,
                xp: 112.5, // 7.5 per arrow * 15
                duration: 1200
            },
            'adamant_arrow': {
                inputs: [
                    { itemId: 'headless_arrow', quantity: 15 },
                    { itemId: 'adamant_arrowtips', quantity: 15 }
                ],
                output: { itemId: 'adamant_arrow', quantity: 15 },
                level: 60,
                xp: 150, // 10 per arrow * 15
                duration: 1200
            },
            'rune_arrow': {
                inputs: [
                    { itemId: 'headless_arrow', quantity: 15 },
                    { itemId: 'rune_arrowtips', quantity: 15 }
                ],
                output: { itemId: 'rune_arrow', quantity: 15 },
                level: 75,
                xp: 187.5, // 12.5 per arrow * 15
                duration: 1200
            },
            'amethyst_arrow': {
                inputs: [
                    { itemId: 'headless_arrow', quantity: 15 },
                    { itemId: 'amethyst_arrowtips', quantity: 15 }
                ],
                output: { itemId: 'amethyst_arrow', quantity: 15 },
                level: 82,
                xp: 202.5, // 13.5 per arrow * 15
                duration: 1200
            }
        };
    }
    
    // ==================== TASK GENERATION ====================
    
    generateTask() {
        // Get available products we can make
        const availableProducts = this.getAvailableProducts();
        
        if (availableProducts.length === 0) {
            console.log('No fletching products available with current materials');
            return null;
        }
        
        // Filter out items that already have tasks
        const filteredProducts = this.filterOutExistingTasks(availableProducts);
        
        if (filteredProducts.length === 0) {
            console.log('All available fletching products already have tasks');
            return null;
        }
        
        // Select a product using weighted distribution
        const selectedProduct = this.selectWeightedProduct(filteredProducts);
        if (!selectedProduct) {
            console.log('Failed to select product for fletching');
            return null;
        }
        
        // Find bank nodes for fletching
        const bankNodes = this.findBankNodes();
        
        if (bankNodes.length === 0) {
            console.log('No bank nodes available for fletching');
            return null;
        }
        
        // Select a random bank node
        const selectedNode = bankNodes[Math.floor(Math.random() * bankNodes.length)];
        
        // Determine target count
        let desiredCount = this.determineTargetCount(selectedProduct.outputId);
        
        // ALL fletching tasks should be multiples of 15
        desiredCount = Math.floor(desiredCount / 15) * 15;
        desiredCount = Math.max(15, desiredCount); // At least 1 action worth
        
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
        
        // Build description based on product type
        let description = '';
        if (selectedProduct.isArrowShafts) {
            const logType = selectedProduct.logType;
            const logData = loadingManager.getData('items')[logType];
            description = `Fletch ${desiredCount} arrow shafts from ${logData.name.toLowerCase()} at ${nodeName}`;
        } else {
            description = `Fletch ${desiredCount} ${itemData.name.toLowerCase()} at ${nodeName}`;
        }
        
        return {
            skill: this.id,
            itemId: selectedProduct.outputId,
            targetCount: desiredCount,
            nodeId: selectedNode.nodeId,
            activityId: 'fletching',
            description: description,
            startingCount: 0,
            progress: 0,
            isFletchingTask: true,
            itemsProduced: 0,
            recipe: selectedProduct.recipe,
            productType: selectedProduct.productType,
            logType: selectedProduct.logType
        };
    }
    
    getAvailableProducts() {
        const products = [];
        const fletchingLevel = skills.getLevel('fletching');
        
        // Check headless arrow recipe
        if (fletchingLevel >= this.headlessArrowRecipe.level) {
            if (this.hasIngredientsForRecipe(this.headlessArrowRecipe)) {
                products.push({
                    outputId: 'headless_arrow',
                    recipe: this.headlessArrowRecipe,
                    productType: 'headless',
                    available: this.calculateMaxCraftable(this.headlessArrowRecipe)
                });
            }
        }
        
        // Check arrow shaft recipes
        for (const [logType, recipe] of Object.entries(this.arrowShaftRecipes)) {
            if (fletchingLevel < recipe.level) continue;
            
            if (this.hasIngredientsForRecipe(recipe)) {
                // For arrow shafts, we track them with a special ID for task generation
                const taskItemId = `arrow_shaft_from_${logType.replace('_logs', '').replace('logs', 'logs')}`;
                products.push({
                    outputId: taskItemId,
                    recipe: recipe,
                    productType: 'shafts',
                    logType: logType,
                    isArrowShafts: true,
                    available: this.calculateMaxCraftable(recipe)
                });
            }
        }
        
        // Check complete arrow recipes
        for (const [arrowType, recipe] of Object.entries(this.completeArrowRecipes)) {
            if (fletchingLevel < recipe.level) continue;
            
            if (this.hasIngredientsForRecipe(recipe)) {
                products.push({
                    outputId: arrowType,
                    recipe: recipe,
                    productType: 'arrows',
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
                task.isFletchingTask && 
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
    
    findBankNodes() {
        const bankNodes = [];
        if (!window.nodes) return bankNodes;
        
        const allNodes = window.nodes.getAllNodes();
        
        for (const [nodeId, node] of Object.entries(allNodes)) {
            if (node.type === 'bank') {
                // Check if walkable
                if (window.collision && window.collision.initialized) {
                    if (!collision.isWalkable(Math.floor(node.position.x), Math.floor(node.position.y))) {
                        continue;
                    }
                }
                
                bankNodes.push({
                    nodeId: nodeId,
                    activityId: 'fletching'
                });
            }
        }
        
        return bankNodes;
    }
    
    getTaskVerb() {
        return 'Fletch';
    }

    // Override to ensure multiples of 15
    determineTargetCount(itemId) {
        let minCount, maxCount;
        
        // Get from skill data
        const skillData = this.getSkillDataForItem(itemId);
        if (skillData) {
            minCount = skillData.minCount;
            maxCount = skillData.maxCount;
        } else {
            // Fallback
            minCount = 150;
            maxCount = 450;
        }
        
        // Apply RuneCred quantity modifier
        if (window.runeCreditManager) {
            const modifier = runeCreditManager.getQuantityModifier(this.id, itemId);
            minCount = Math.round(minCount * modifier);
            maxCount = Math.round(maxCount * modifier);
        }
        
        // Ensure multiples of 15
        minCount = Math.max(15, Math.floor(minCount / 15) * 15);
        maxCount = Math.max(15, Math.floor(maxCount / 15) * 15);
        maxCount = Math.max(minCount, maxCount);
        
        // Pick a random value between min and max (in multiples of 15)
        const range = (maxCount - minCount) / 15;
        const multiplier = Math.floor(Math.random() * (range + 1));
        const count = minCount + (multiplier * 15);
        
        return count;
    }
    
    updateFletchingTaskProgress(outputId, quantity) {
    if (!window.taskManager) return;
    
    const currentTask = taskManager.getFirstIncompleteTask();
    
    if (currentTask && currentTask.isFletchingTask) {
        // Check if this is an arrow shaft task by looking at the itemId pattern
        const isArrowShaftTask = currentTask.itemId && currentTask.itemId.startsWith('arrow_shaft_from_');
        
        // For arrow shafts, the task itemId is like "arrow_shaft_from_maple" 
        // but the actual output is "arrow_shaft"
        if ((isArrowShaftTask || currentTask.productType === 'shafts') && outputId === 'arrow_shaft') {
            // This is an arrow shaft task and we produced arrow shafts
            currentTask.itemsProduced = (currentTask.itemsProduced || 0) + quantity;
            const progress = currentTask.itemsProduced / currentTask.targetCount;
            
            console.log(`Fletching progress (arrow shafts): ${currentTask.itemsProduced}/${currentTask.targetCount}`);
            console.log(`Task details: itemId=${currentTask.itemId}, productType=${currentTask.productType}, progress=${progress}`);
            
            taskManager.setTaskProgress(currentTask, progress);
            
            // Force UI update
            if (window.ui) {
                window.ui.updateTasks();
            }
        } else if (currentTask.itemId === outputId) {
            // Regular fletching task (headless arrows or complete arrows)
            currentTask.itemsProduced = (currentTask.itemsProduced || 0) + quantity;
            const progress = currentTask.itemsProduced / currentTask.targetCount;
            
            console.log(`Fletching progress: ${currentTask.itemsProduced}/${currentTask.targetCount}`);
            
            taskManager.setTaskProgress(currentTask, progress);
            
            // Force UI update
            if (window.ui) {
                window.ui.updateTasks();
            }
        }
    }
}
    
    // ==================== PROCESSING SKILL INTERFACE ====================
    
    hasMaterialsForCurrentTask() {
        if (!window.ai || !window.ai.currentTask || !window.ai.currentTask.isFletchingTask) {
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
        if (!task || !task.isFletchingTask) return null;
        
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
        // All fletching is 1200ms
        let duration = 1200;
        
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
            
            if (timeProcessing < 1200) {
                if (window.ai && window.ai.currentTask && window.ai.currentTask.isFletchingTask) {
                    const taskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
                    if (this.processingTaskId === taskId) {
                        console.log('Already fletching, rejecting duplicate start');
                        return false;
                    }
                }
            } else {
                console.log('Fletching took too long, resetting state');
                this.clearProcessingState();
            }
        }
        
        // Determine which recipe to use
        let recipe = null;
        
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isFletchingTask) {
            recipe = window.ai.currentTask.recipe;
        } else {
            // Find any recipe we can do
            recipe = this.findRecipeToProcess();
        }
        
        if (!recipe) {
            console.log('No fletching recipe available');
            this.clearProcessingState();
            
            if (window.ai) {
                window.ai.decisionCooldown = 0;
            }
            
            return false;
        }
        
        // Check inputs
        for (const input of recipe.inputs) {
            if (!inventory.hasItem(input.itemId, input.quantity)) {
                console.log(`Missing ${input.quantity} ${input.itemId} for fletching`);
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
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isFletchingTask) {
            this.processingTaskId = `${window.ai.currentTask.itemId}_${window.ai.currentTask.targetCount}`;
        } else {
            this.processingTaskId = null;
        }
        
        console.log(`Starting to fletch ${recipe.output.itemId}`);
        
        return true;
    }
    
    processRewards(activityData, level) {
        this.clearProcessingState();
        
        if (!this.currentRecipe) {
            this.lastFletchingXp = 0;
            return [];
        }
        
        // Consume inputs
        for (const input of this.currentRecipe.inputs) {
            inventory.removeItem(input.itemId, input.quantity);
        }
        
        // Fletching always succeeds
        this.lastFletchingXp = this.currentRecipe.xp;
        
        // Update task progress
        this.updateFletchingTaskProgress(this.currentRecipe.output.itemId, this.currentRecipe.output.quantity);
        
        return [{
            itemId: this.currentRecipe.output.itemId,
            quantity: this.currentRecipe.output.quantity
        }];
    }
    
    shouldGrantXP(rewards, activityData) {
        return this.lastFletchingXp > 0;
    }
    
    getXpToGrant(rewards, activityData) {
        return this.lastFletchingXp || 0;
    }
    
    findRecipeToProcess() {
        const level = skills.getLevel('fletching');
        
        // Check headless arrows
        if (level >= this.headlessArrowRecipe.level && this.hasIngredientsInInventory(this.headlessArrowRecipe)) {
            return this.headlessArrowRecipe;
        }
        
        // Check arrow shafts
        for (const recipe of Object.values(this.arrowShaftRecipes)) {
            if (level >= recipe.level && this.hasIngredientsInInventory(recipe)) {
                return recipe;
            }
        }
        
        // Check complete arrows
        for (const recipe of Object.values(this.completeArrowRecipes)) {
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
        if (activityId !== 'fletching') return false;
        
        const level = skills.getLevel('fletching');
        const recipe = this.findRecipeToProcess();
        
        return recipe !== null;
    }
    
    clearProcessingState() {
        this.isProcessing = false;
        this.processingTaskId = null;
        this.processingStartTime = 0;
    }
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        if (!task || task.skill !== 'fletching') return false;
        if (!task.isFletchingTask) return false;
        
        // Check if we have the required inputs
        const recipe = task.recipe;
        for (const input of recipe.inputs) {
            if (!inventory.hasItem(input.itemId, input.quantity)) {
                console.log(`Need banking: missing ${input.itemId} for fletching`);
                return true;
            }
        }
        
        return false;
    }
    
    handleBanking(task) {
        // Deposit all first
        bank.depositAll();
        console.log('Deposited all items for fletching');
        
        // Mark that we've banked
        const taskId = task ? `${task.itemId}_${task.targetCount}_${task.nodeId}` : null;
        this.currentTaskId = taskId;
        this.hasBankedForTask = true;
        
        let withdrawnAny = false;
        
        if (task && task.isFletchingTask) {
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
                console.log('No materials in bank for fletching task');
                return false;
            }
            
            // Calculate optimal withdrawal based on inventory space
            const totalSlots = 28;
            let slotsNeeded = 0;
            
            // For recipes with multiple inputs, we need to consider slot usage
            if (recipe.inputs.length === 2) {
                // Need slots for both inputs
                const itemsData = loadingManager.getData('items');
                for (const input of recipe.inputs) {
                    const itemData = itemsData[input.itemId];
                    if (!itemData.stackable) {
                        slotsNeeded += Math.min(input.quantity * maxCraftable, totalSlots);
                    } else {
                        slotsNeeded += 1; // Stackable items take 1 slot
                    }
                }
                
                // Adjust maxCraftable if we can't fit everything
                if (slotsNeeded > totalSlots) {
                    // For arrow/headless arrow recipes (15+15), we can fit 14 crafts max
                    if (recipe.inputs[0].quantity === 15 && recipe.inputs[1].quantity === 15) {
                        maxCraftable = Math.min(maxCraftable, 14);
                    }
                }
            } else {
                // Single input (logs) - withdraw as many as possible
                const itemData = loadingManager.getData('items')[recipe.inputs[0].itemId];
                if (!itemData.stackable) {
                    maxCraftable = Math.min(maxCraftable, totalSlots);
                }
            }
            
            // Limit to what we need and can fit
            const toMake = Math.min(maxCraftable, craftsRemaining);
            
            if (toMake === 0) {
                console.log('Cannot fit materials in inventory');
                return false;
            }
            
            // Withdraw materials
            for (const input of recipe.inputs) {
                const needed = input.quantity * toMake;
                const withdrawn = bank.withdrawUpTo(input.itemId, needed);
                
                if (withdrawn > 0) {
                    inventory.addItem(input.itemId, withdrawn);
                    console.log(`Withdrew ${withdrawn} ${input.itemId} for ${toMake} fletching actions`);
                    withdrawnAny = true;
                } else if (withdrawn < needed) {
                    console.log(`Warning: Only withdrew ${withdrawn}/${needed} ${input.itemId}`);
                }
            }
        }
        
        return withdrawnAny;
    }
    
    canContinueTask(task) {
        if (!task || !task.isFletchingTask) return true;
        
        // Check if we have enough materials for remaining items
        const recipe = task.recipe;
        const craftsRemaining = Math.ceil((task.targetCount - (task.itemsProduced || 0)) / recipe.output.quantity);
        
        for (const input of recipe.inputs) {
            const totalAvailable = inventory.getItemCount(input.itemId) + bank.getItemCount(input.itemId);
            const needed = input.quantity * craftsRemaining;
            
            if (totalAvailable < input.quantity) {
                console.log(`Cannot continue fletching - need ${input.quantity} ${input.itemId}, have ${totalAvailable}`);
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
        const level = skills.getLevel('fletching');
        
        // Check headless arrow recipe
        if (level >= this.headlessArrowRecipe.level && this.hasIngredientsInInventory(this.headlessArrowRecipe)) {
            return true;
        }
        
        // Check arrow shaft recipes
        for (const recipe of Object.values(this.arrowShaftRecipes)) {
            if (level >= recipe.level && this.hasIngredientsInInventory(recipe)) {
                return true;
            }
        }
        
        // Check complete arrow recipes
        for (const recipe of Object.values(this.completeArrowRecipes)) {
            if (level >= recipe.level && this.hasIngredientsInInventory(recipe)) {
                return true;
            }
        }
        
        return false;
    }
    
    onActivityComplete(activityData) {
        this.clearProcessingState();
        
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isFletchingTask) {
            if (window.ai.currentTask.progress >= 1) {
                console.log('Fletching task complete, resetting banking state');
                this.hasBankedForTask = false;
                this.currentTaskId = null;
            } else {
                // Check if we need to bank for more materials
                if (!this.hasMaterialsForCurrentTask()) {
                    console.log('Fletching task needs more materials');
                    this.hasBankedForTask = false;
                    
                    if (window.ai) {
                        window.ai.decisionCooldown = 0;
                    }
                }
            }
        }
    }
    
    onActivityStopped() {
        console.log('Fletching activity was stopped, clearing state');
        this.clearProcessingState();
    }
}
