class TaskManager {
    constructor() {
        this.currentTask = null;
        this.nextTask = null;
        this.tasks = []; // The 5 rerollable tasks
        this.maxTasks = 5;
        this.completedTasks = []; // Track completed tasks
        this.skillWeights = null; // For future weighted distribution
        this.itemCountCache = {}; // Cache for item counts
        this.cacheValid = false; // Track if cache needs update
    }

    // Initialize with first set of tasks
    initialize() {
        if (!this.currentTask && !this.nextTask && this.tasks.length === 0) {
            this.generateInitialTasks();
        }
    }

    // Generate initial set of tasks (current, next, and 5 regular)
    generateInitialTasks() {
        // Generate current and next as single tasks
        const initialTasks = this.generateMultipleTasks(2);
        
        if (initialTasks.length > 0) {
            this.currentTask = initialTasks[0];
            // Initialize startingCount for current task if it's a gathering task
            if (this.currentTask && !this.currentTask.isCookingTask) {
                this.currentTask.startingCount = this.getCurrentItemCount(this.currentTask.itemId);
            }
        }
        
        if (initialTasks.length > 1) {
            this.nextTask = initialTasks[1];
        }
        
        // Generate 5 task slots with 3 options each
        this.tasks = [];
        for (let i = 0; i < 5; i++) {
            const options = this.generateMultipleTasks(3);
            if (options.length > 0) {
                this.tasks.push({
                    options: options,
                    selectedIndex: 0,  // Auto-select first option
                    displayOrder: [0, 1, 2]  // Track display order for swapping
                });
            }
        }
        
        // Notify UI to update
        if (window.ui) {
            window.ui.updateTasks();
        }
        
        // Notify AI about the new current task
        if (window.ai) {
            window.ai.currentTask = null;
            window.ai.decisionCooldown = 0;
        }
    }

    // Generate multiple tasks at once
    generateMultipleTasks(count) {
        const generatedTasks = [];
        const availableSkills = this.getAvailableSkills();
        
        if (availableSkills.length === 0) {
            console.error('No skills available to generate tasks');
            return generatedTasks;
        }

        let attempts = 0;
        const maxAttempts = count * 10; // Initial attempts with weighting
        let useWeighting = true;
        let weightedFailures = 0;

        while (generatedTasks.length < count && attempts < maxAttempts + 50) { // Extra attempts for unweighted
            attempts++;
            
            // After 10 consecutive failures with weighting, switch to unweighted
            if (useWeighting && weightedFailures >= 10) {
                console.warn('10 consecutive weighted task generation failures, switching to unweighted selection');
                useWeighting = false;
                weightedFailures = 0; // Reset counter
            }
            
            // Pick a skill - use weighting or random based on flag
            let skill;
            if (useWeighting && window.runeCreditManager) {
                skill = runeCreditManager.getWeightedSkill(availableSkills);
            } else {
                // Unweighted random selection
                skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            }
            
            // Try to generate a task for this skill
            const task = skill.generateTask();
            
            if (task) {
                // Set initial progress tracking based on task type
                if (task.isCookingTask) {
                    task.rawFoodConsumed = 0;
                    task.startingCount = 0;
                } else {
                    task.startingCount = null; // Will be set when task becomes current
                }
                task.progress = 0;
                generatedTasks.push(task);
                
                // Log which method succeeded
                const method = useWeighting ? 'weighted' : 'unweighted';
                console.log(`Generated task (${method}): ${task.description}`);
                
                // Reset failure counter on success
                weightedFailures = 0;
            } else {
                // Track failures only when using weighting
                if (useWeighting) {
                    weightedFailures++;
                }
            }
        }

        if (generatedTasks.length < count) {
            console.warn(`Only generated ${generatedTasks.length} tasks after ${attempts} attempts`);
        }

        return generatedTasks;
    }

    // Get all registered skills that can generate tasks
    getAvailableSkills() {
        if (!window.skillRegistry || !window.skillRegistry.initialized) {
            return [];
        }
        
        return window.skillRegistry.getAllSkills().filter(skill => 
            typeof skill.generateTask === 'function'
        );
    }

    // Get current count of an item (inventory + bank) with caching
    getCurrentItemCount(itemId) {
        // If cache is valid and item is cached, return cached value
        if (this.cacheValid && this.itemCountCache.hasOwnProperty(itemId)) {
            return this.itemCountCache[itemId];
        }
        
        let count = 0;
        
        if (window.inventory) {
            count += inventory.getItemCount(itemId);
        }
        
        if (window.bank) {
            count += bank.getItemCount(itemId);
        }
        
        // Update cache
        this.itemCountCache[itemId] = count;
        this.cacheValid = true;
        
        return count;
    }
    
    // Invalidate the cache when items change
    invalidateCache() {
        this.cacheValid = false;
        this.itemCountCache = {};
    }

    // Generic method to set task progress directly
    setTaskProgress(task, progress) {
        task.progress = Math.min(Math.max(0, progress), 1);
        
        // Check if complete
        if (task.progress >= 1) {
            this.completeTask(task); // No await needed - fire and forget
        }
        
        // Update UI
        if (window.ui) {
            window.ui.updateTaskProgressBarsOnly();
        }
    }

    // Update task progress for a specific task (for gathering tasks)
    updateTaskProgress(task) {
        // Cooking tasks should not use this method - they update via setTaskProgress
        if (task.isCookingTask) {
            return;
        }
        
        // Normal gathering task - track items gained
        const currentCount = this.getCurrentItemCount(task.itemId);
        const itemsGained = currentCount - task.startingCount;
        const progress = itemsGained / task.targetCount;
        
        this.setTaskProgress(task, progress);
    }

    // Update progress for the current task if it matches the given item
    updateProgressForItem(itemId) {
        // Only update gathering tasks - processing tasks manage their own progress
        if (this.currentTask && 
            !this.currentTask.isCookingTask && 
            !this.currentTask.isFiremakingTask && 
            !this.currentTask.isAgilityTask && 
            !this.currentTask.isSailingTask && 
            !this.currentTask.isThievingTask && 
            !this.currentTask.isHuntingTask && 
            this.currentTask.itemId === itemId) {
            this.updateTaskProgress(this.currentTask);
        }
    }

    // Update all task progress (called periodically to sync)
    updateAllProgress() {
        // Only update the current task
        if (this.currentTask && this.currentTask.progress < 1) {
            // Check if this task manages its own progress (processing skills)
            if (this.currentTask.isCookingTask || 
                this.currentTask.isFiremakingTask ||
                this.currentTask.isAgilityTask ||
                this.currentTask.isSailingTask ||
                this.currentTask.isThievingTask ||
                this.currentTask.isRunecraftingTask ||
                this.currentTask.isConstructionTask ||
                this.currentTask.isHerbloreTask ||
                this.currentTask.isFletchingTask ||
                this.currentTask.isFarmingTask ||
                this.currentTask.isHuntingTask) {
                // These tasks manage their own progress through their skills
                // Just check if complete
                if (this.currentTask.progress >= 1) {
                    this.completeTask(this.currentTask); // No await needed - fire and forget
                }
            } else {
                // Gathering tasks - calculate progress based on inventory/bank
                // Initialize startingCount if this is the first time
                if (this.currentTask.startingCount === null) {
                    this.currentTask.startingCount = this.getCurrentItemCount(this.currentTask.itemId);
                    console.log(`Task "${this.currentTask.description}" now active, starting count: ${this.currentTask.startingCount}`);
                }
                
                // Update gathering task based on current counts
                const currentCount = this.getCurrentItemCount(this.currentTask.itemId);
                const itemsGained = currentCount - this.currentTask.startingCount;
                this.currentTask.progress = Math.min(itemsGained / this.currentTask.targetCount, 1);
                
                if (this.currentTask.progress >= 1) {
                    this.completeTask(this.currentTask); // No await needed - fire and forget
                }
            }
        }
    }

    // Mark a task as complete and move to completed list
async completeTask(task) {
    console.log(`Task complete: ${task.description}`);
    task.progress = 1;
    task.completedAt = Date.now();
    
    // Add to completed tasks
    this.completedTasks.push(task);
    
    // Show task completion celebration
    if (window.xpDropManager) {
        xpDropManager.showTaskComplete(task);
    }
    
    // Award credits - NOW PASSING THE TASK OBJECT
    if (window.runeCreditManager) {
        runeCreditManager.onTaskComplete(task);
    }

    // Rotate shop stock on task completion
    if (window.shop) {
        shop.rotateStock();
    }
    
    // Update speed bonuses based on current levels
    if (window.runeCreditManager) {
        runeCreditManager.updateSpeedBonuses();
    }
    
    // If this was the current task, promote next task
    if (task === this.currentTask) {
        await this.promoteNextTask();
        
        // CRITICAL: Ensure task queue is fully populated before saving
        this.ensureFullTaskQueue();
        
        // Double-check that we have valid current and next tasks
        if (!this.currentTask) {
            const emergencyTasks = this.generateMultipleTasks(1);
            if (emergencyTasks.length > 0) {
                this.currentTask = emergencyTasks[0];
                console.log('Generated emergency current task');
            }
        }
        
        if (!this.nextTask) {
            const emergencyTasks = this.generateMultipleTasks(1);
            if (emergencyTasks.length > 0) {
                this.nextTask = emergencyTasks[0];
                console.log('Generated emergency next task');
            }
        }
    }
    
    // FORCE SAVE after ENTIRE task transition is complete
    // This prevents pet roll exploitation and ensures consistent state
    if (window.firebaseManager && !firebaseManager.isOfflineMode) {
        await firebaseManager.forceSave();
    }
}

    // Skip the current task when it's impossible
    skipCurrentTask() {
        if (!this.currentTask) return;
        
        console.log(`Skipping impossible task: ${this.currentTask.description}`);
        
        // Mark as skipped (not completed)
        this.currentTask.progress = -1; // -1 indicates skipped
        this.currentTask.skippedAt = Date.now();
        
        // Could track skipped tasks if desired
        // this.skippedTasks.push(this.currentTask);
        
        // Promote the next task (same as when completing a task)
        this.promoteNextTask(); // No await needed here
    }

    // Move next task to current, and first regular task to next
    async promoteNextTask() {
        // Store the previous task's bank for optimization
        const previousBank = this.currentTask && window.nodes ? 
            (nodes.getNode(this.currentTask.nodeId)?.nearestBank) : null;
        
        this.currentTask = this.nextTask;
        
        // Check if new task uses same bank as previous (for AI optimization)
        if (this.currentTask && previousBank && window.ai) {
            const newTaskBank = window.nodes ? 
                nodes.getNode(this.currentTask.nodeId)?.nearestBank : null;
            
            if (newTaskBank === previousBank) {
                console.log(`New task uses same bank (${previousBank}), AI can skip re-banking`);
                // AI can check this to avoid unnecessary re-banking
                if (window.ai) {
                    window.ai.hasBankedForCurrentTask = true;
                }
            } else {
                console.log(`New task uses different bank (${previousBank} → ${newTaskBank})`);
                if (window.ai) {
                    window.ai.hasBankedForCurrentTask = false;
                }
            }
        }
        
        // Initialize starting count for new current task if it's a gathering task
        if (this.currentTask && !this.currentTask.isCookingTask && this.currentTask.startingCount === null) {
            this.currentTask.startingCount = this.getCurrentItemCount(this.currentTask.itemId);
            console.log(`New current task "${this.currentTask.description}" starting count: ${this.currentTask.startingCount}`);
        }
        
        // Move first regular task to next
        if (this.tasks.length > 0) {
            const firstTaskSlot = this.tasks.shift();
            // Get the selected task from the slot (or pick first if none selected)
            const selectedTask = firstTaskSlot.options[firstTaskSlot.selectedIndex || 0];
            this.nextTask = selectedTask;
            console.log(`Promoted task to next: ${this.nextTask.description}`);
        } else {
            this.nextTask = null;
        }
        
        // Ensure we always have 5 tasks in the queue
        this.ensureFullTaskQueue();
        
        // Update UI
        if (window.ui) {
            window.ui.updateTasks();
        }
        
        // Notify AI to re-evaluate
        if (window.ai) {
            console.log('Current task changed, notifying AI to re-evaluate');
            window.ai.currentTask = null;
            window.ai.decisionCooldown = 0;
        }
        
        // Return promise for async completion
        return Promise.resolve();
    }

    // Ensure we always have 5 tasks in the queue
    ensureFullTaskQueue() {
        const tasksNeeded = this.maxTasks - this.tasks.length;
        
        if (tasksNeeded <= 0) {
            return; // Already have enough tasks
        }
        
        console.log(`Task queue has ${this.tasks.length} tasks, generating ${tasksNeeded} more to reach ${this.maxTasks}`);
        
        for (let i = 0; i < tasksNeeded; i++) {
            const options = this.generateMultipleTasks(3);
            if (options.length > 0) {
                this.tasks.push({
                    options: options,
                    selectedIndex: 0,  // Auto-select first option
                    displayOrder: [0, 1, 2]  // Initialize display order
                });
            }
        }
        
        console.log(`Added ${tasksNeeded} task slots to queue, now have ${this.tasks.length} slots`);
    }

    // Reroll only the non-selected options for a task slot
    rerollNonSelectedOptions(index) {
        if (index < 0 || index >= this.tasks.length) {
            console.error('Invalid task index');
            return;
        }

        const taskSlot = this.tasks[index];
        const selectedIndex = taskSlot.selectedIndex || 0;
        const selectedTask = taskSlot.options[selectedIndex];
        
        console.log(`Keeping selected task: ${selectedTask.description}`);
        console.log('Rerolling other 2 options...');

        // Generate 2 new tasks to replace the non-selected ones
        const newOptions = this.generateMultipleTasks(2);
        
        if (newOptions.length === 2) {
            // Create new options array with selected task + 2 new ones
            const updatedOptions = [selectedTask, ...newOptions];
            
            this.tasks[index] = {
                options: updatedOptions,
                selectedIndex: 0,  // Selected task is now at index 0
                displayOrder: [0, 1, 2]  // Reset display order
            };
            
            console.log('Generated 2 new alternative options');
            
            // Update UI
            if (window.ui) {
                window.ui.updateTasks();
            }
        } else {
            console.error('Failed to generate replacement task options');
        }
    }

    // Reroll a specific regular task (index 0-4)
    rerollTask(index) {
        if (index < 0 || index >= this.tasks.length) {
            console.error('Invalid task index');
            return;
        }

        const oldTaskSlot = this.tasks[index];
        const oldTask = oldTaskSlot.options[oldTaskSlot.selectedIndex || 0];
        console.log(`Rerolling task: ${oldTask.description}`);

        // Generate 3 new task options
        const newOptions = this.generateMultipleTasks(3);
        
        if (newOptions.length > 0) {
            this.tasks[index] = {
                options: newOptions,
                selectedIndex: 0,  // Auto-select first option
                displayOrder: [0, 1, 2]  // Reset display order for new tasks
            };
            console.log(`Generated ${newOptions.length} new task options`);
            
            // Ensure we still have a full queue after reroll
            this.ensureFullTaskQueue();
            
            // Update UI
            if (window.ui) {
                window.ui.updateTasks();
            }
        } else {
            console.error('Failed to generate replacement tasks');
            // Try to maintain full queue even if reroll failed
            this.ensureFullTaskQueue();
        }
    }

    // Select a specific task option for a queue slot
    selectTaskOption(slotIndex, optionIndex) {
        if (slotIndex < 0 || slotIndex >= this.tasks.length) {
            console.error('Invalid slot index');
            return;
        }
        
        const slot = this.tasks[slotIndex];
        if (optionIndex < 0 || optionIndex >= slot.options.length) {
            console.error('Invalid option index');
            return;
        }
        
        // If selecting the already selected option, do nothing
        if (slot.selectedIndex === optionIndex) {
            return;
        }
        
        const oldTask = slot.options[slot.selectedIndex || 0];
        const newTask = slot.options[optionIndex];
        
        console.log(`Changing task selection from "${oldTask.description}" to "${newTask.description}"`);
        
        // Swap positions in display order
        const oldDisplayPos = slot.displayOrder.indexOf(slot.selectedIndex);
        const newDisplayPos = slot.displayOrder.indexOf(optionIndex);
        
        // Swap the positions
        const temp = slot.displayOrder[oldDisplayPos];
        slot.displayOrder[oldDisplayPos] = slot.displayOrder[newDisplayPos];
        slot.displayOrder[newDisplayPos] = temp;
        
        // Update selected index
        slot.selectedIndex = optionIndex;
        
        // Update UI
        if (window.ui) {
            window.ui.updateTasks();
        }
    }

    // Get the currently selected task for a slot
    getSelectedTask(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.tasks.length) {
            return null;
        }
        
        const slot = this.tasks[slotIndex];
        return slot.options[slot.selectedIndex || 0];
    }

    // Get the first incomplete task (for AI)
    getFirstIncompleteTask() {
        // Always return current task if it's incomplete
        if (this.currentTask && this.currentTask.progress < 1) {
            return this.currentTask;
        }
        return null;
    }

    // Get all active tasks (current, next, and regular tasks)
    getAllTasks() {
        const allTasks = [];
        
        if (this.currentTask) allTasks.push(this.currentTask);
        if (this.nextTask) allTasks.push(this.nextTask);
        
        // For regular tasks, get the selected option from each slot
        for (const slot of this.tasks) {
            const selectedTask = slot.options[slot.selectedIndex || 0];
            allTasks.push(selectedTask);
        }
        
        return allTasks;
    }

    // Get completed tasks
    getCompletedTasks() {
        return this.completedTasks;
    }

    // Clear all tasks (for debugging)
    clearTasks() {
        this.currentTask = null;
        this.nextTask = null;
        this.tasks = [];
        // Don't clear completed tasks
        
        if (window.ui) {
            window.ui.updateTasks();
        }
    }

    // Generate new batch of tasks
    generateNewTasks() {
        this.generateInitialTasks();
    }

    // Check if a task is valid/possible
    isTaskPossible(task) {
        // Check if node exists and is walkable
        const node = window.nodes ? nodes.getNode(task.nodeId) : null;
        if (!node) {
            console.error(`Task impossible - node ${task.nodeId} not found`);
            return false;
        }

        // Check if node is accessible
        if (window.collision && window.collision.initialized) {
            if (!collision.isWalkable(node.position.x, node.position.y)) {
                console.error(`Task impossible - node ${task.nodeId} not walkable`);
                return false;
            }
        }

        // Check if activity exists at node
        if (!node.activities || !node.activities.includes(task.activityId)) {
            console.error(`Task impossible - activity ${task.activityId} not at node ${task.nodeId}`);
            return false;
        }

        // For cooking tasks, check if we still have enough raw food
        if (task.isCookingTask) {
            const currentRawFood = this.getCurrentItemCount(task.itemId);
            const remaining = task.targetCount - (task.rawFoodConsumed || 0);
            
            if (currentRawFood < remaining) {
                console.error(`Cooking task impossible - need ${remaining} ${task.itemId}, have ${currentRawFood}`);
                return false;
            }
        }

        // Check level requirement
        const activityData = loadingManager.getData('activities')[task.activityId];
        if (activityData) {
            const requiredLevel = activityData.requiredLevel || 1;
            const currentLevel = window.skills ? skills.getLevel(task.skill) : 1;
            
            if (currentLevel < requiredLevel) {
                console.error(`Task impossible - need level ${requiredLevel}, have ${currentLevel}`);
                return false;
            }
        }

        return true;
    }
}

// Make TaskManager available globally
window.TaskManager = TaskManager;

// Create global instance
window.taskManager = new TaskManager();
