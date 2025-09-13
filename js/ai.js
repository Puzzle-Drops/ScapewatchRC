class AIManager {
    constructor() {
        this.currentTask = null;
        this.decisionCooldown = 0;
        this.failedNodes = new Set();
        this.hasBankedForCurrentTask = false; // Track if we've already banked for current task
        this.isResumingFromLoad = false; // Track if we just loaded a save

    }

    // ==================== SAVE/LOAD SYNCHRONIZATION ====================

// Called after loading a save to restore AI state
syncAfterLoad() {
    console.log('AI syncing state after load...');
    
    // Mark that we're resuming from a load
    this.isResumingFromLoad = true;
    
    // Sync the current task from task manager
    if (window.taskManager && taskManager.currentTask) {
        this.currentTask = taskManager.currentTask;
        console.log(`AI resumed task: ${this.currentTask.description}`);
        
        // Verify we're on the right path
        if (player.isMoving() && player.targetNode) {
            const targetNode = nodes.getNode(player.targetNode);
            
            // Check if we're moving to the task node
            if (targetNode && this.currentTask.nodeId === player.targetNode) {
                console.log(`Resuming movement to task node ${player.targetNode}`);
            } 
            // Check if we're moving to a bank
            else if (targetNode && targetNode.type === 'bank') {
                console.log(`Resuming movement to bank ${player.targetNode}`);
                // If moving to bank and we have the banking flag set, we're good
                if (this.hasBankedForCurrentTask) {
                    console.log('Already banked for this task, continuing to node after banking');
                }
            }
            // Otherwise we might be on a waypoint path
            else {
                console.log(`Resuming path to ${player.targetNode}`);
            }
        }
        
        // Give a longer grace period when resuming
        this.decisionCooldown = 5000; // 5 seconds to let things settle
    } else {
        // No current task in task manager
        this.currentTask = null;
        this.decisionCooldown = 3000; // Still give grace period
    }
}

    // ==================== TASK MANAGEMENT ====================

    selectNextTask() {
        if (!window.taskManager) {
            console.log('Task manager not initialized');
            return;
        }

        // Always work on the current task from task manager
        this.currentTask = taskManager.currentTask;
        
        if (!this.currentTask) {
            console.log('No current task available');
            return;
        }

        // Reset banking flag when selecting a new task
        this.hasBankedForCurrentTask = false;
        console.log('Working on task:', this.currentTask.description);
    }

    // Check if current task is still valid
    isCurrentTaskValid() {
        if (!this.currentTask) return false;
        if (!window.taskManager) return false;
        
        // Check if our task is still the current task in task manager
        return this.currentTask === taskManager.currentTask;
    }

    // ==================== DECISION MAKING & EXECUTION ====================

    update(deltaTime) {
        this.decisionCooldown -= deltaTime;
        
        // Only make decisions if cooldown has expired
        if (this.decisionCooldown > 0) return;

        // CRITICAL: If we have no current task but player is moving, stop and re-evaluate
if (this.currentTask === null && player.isMoving()) {
    // If we're resuming from load, don't panic - let the sync happen
    if (this.isResumingFromLoad) {
        console.log('Resuming from load, allowing movement to continue');
        this.isResumingFromLoad = false; // Clear the flag
        return;
    }
    
    // Check if we're moving to a bank - if so, this is intentional
    if (player.targetNode) {
        const targetNode = nodes.getNode(player.targetNode);
        if (targetNode && targetNode.type === 'bank') {
            // We're moving to bank after task completion - this is fine
            return;
        }
    }
    
    console.log('Task lost while moving, stopping to re-evaluate');
    // Stop movement immediately
    player.path = [];
    player.pathIndex = 0;
    player.targetPosition = null;
    player.targetNode = null;
    player.segmentProgress = 0;
    // Make a decision immediately
    this.makeDecision();
    this.resetDecisionCooldown();
    return;
}

        // Check if current task changed while we were busy
        if (!this.isCurrentTaskValid() && this.currentTask !== null) {
            // Task was invalidated (completed, changed, etc)
            const oldTaskDesc = this.currentTask ? this.currentTask.description : 'none';
            const newTaskDesc = window.taskManager && taskManager.currentTask ? 
                taskManager.currentTask.description : 'none';
            
            console.log(`Task changed from "${oldTaskDesc}" to "${newTaskDesc}"`);
            
            if (player.isMoving()) {
                // Check if we're moving to bank - that's fine after task completion
                if (player.targetNode) {
                    const targetNode = nodes.getNode(player.targetNode);
                    if (targetNode && targetNode.type === 'bank') {
                        console.log('Moving to bank after task completion - continuing movement');
                        this.currentTask = null;
                        this.hasBankedForCurrentTask = false;
                        return; // Don't stop movement to bank
                    }
                }
                
                console.log('Task changed while moving to non-bank location, stopping to re-evaluate');
                // Stop movement
                player.path = [];
                player.pathIndex = 0;
                player.targetPosition = null;
                player.targetNode = null;
                player.segmentProgress = 0;
            }
            if (player.isPerformingActivity()) {
                console.log('Task changed while performing activity, stopping to re-evaluate');
                player.stopActivity();
            }
            this.currentTask = null;
            this.hasBankedForCurrentTask = false; // Reset banking flag
            this.decisionCooldown = 0;
            // Don't return - let it make a new decision immediately
        }

        // Additional check: if we have no task but player is still doing an activity, stop it
        if (this.currentTask === null && player.isPerformingActivity()) {
            console.log('No current task but still performing activity, stopping');
            player.stopActivity();
            this.decisionCooldown = 0;
        }

        // Make decisions when appropriate
        if (!player.isBusy()) {
            this.makeDecision();
            this.resetDecisionCooldown();
        } else if (this.shouldCheckBanking() && !player.isMoving() && !player.isPerformingActivity() && !player.isBanking) {
            this.makeDecision();
            this.resetDecisionCooldown();
        }
    }

    shouldCheckBanking() {
        // Check if inventory is full
        return inventory.isFull();
    }

    makeDecision() {
        console.log('AI making decision...', {
            isBusy: player.isBusy(),
            inventoryFull: inventory.isFull(),
            currentTask: this.currentTask?.description,
            currentNode: player.currentNode,
            hasBankedForTask: this.hasBankedForCurrentTask,
            isBanking: player.isBanking
        });
        
        // If we're currently banking, wait for it to finish
        if (player.isBanking) {
            console.log('Currently banking, waiting...');
            return;
        }
        
        // Check if we need banking
        if (this.needsBanking()) {
            if (this.isMovingToBank()) {
                console.log('Already moving to bank');
                return;
            }
            this.goToBank();
            return;
        }

        // IMPORTANT: Always verify we're working on the right task
        if (!this.isCurrentTaskValid()) {
            console.log('Current task is no longer valid, selecting new task');
            this.selectNextTask();
        }

        // Check if we need a new task
        if (!this.currentTask || this.currentTask.progress >= 1) {
            this.selectNextTask();
        }

        if (!this.currentTask) {
            console.log('No tasks available');
            return;
        }

        console.log('Executing task:', this.currentTask.description);
        this.executeTask(this.currentTask);
    }

    needsBanking() {
        // First, let the skill decide if it needs banking for the current task
        if (this.currentTask) {
            const skill = skillRegistry.getSkill(this.currentTask.skill);
            if (skill && skill.needsBankingForTask) {
                // Skill has specific banking logic - use it
                const needsBank = skill.needsBankingForTask(this.currentTask);
                if (needsBank) {
                    console.log(`Skill ${this.currentTask.skill} says banking needed for task`);
                    return true;
                }
                
                // IMPORTANT: If this is a processing skill and it says no banking needed,
                // trust it! Don't fall through to the inventory.isFull() check
                if (skill.isProcessingSkill) {
                    return false;
                }
            }
        }
        
        // Fallback ONLY for gathering skills (or skills without specific banking logic)
        if (inventory.isFull()) {
            return true;
        }
        
        return false;
    }

    // Check if any processing skill has materials to work with
    hasProcessingMaterials() {
        if (!this.currentTask) return false;
        
        const skill = skillRegistry.getSkill(this.currentTask.skill);
        if (!skill) return false;
        
        // Use the generic interface
        if (skill.isProcessingSkill) {
            return skill.hasMaterials ? skill.hasMaterials() : false;
        }
        
        return false;
    }

    executeTask(task) {
        // Double-check this is still the right task
        if (!this.isCurrentTaskValid()) {
            console.log('Task changed during execution, re-selecting');
            this.selectNextTask();
            return;
        }

        // Check if task is valid
        if (!taskManager.isTaskPossible(task)) {
            console.log('Task is impossible, skipping it');
            if (window.taskManager) {
                taskManager.skipCurrentTask();
            }
            this.currentTask = null;
            this.hasBankedForCurrentTask = false;
            return;
        }
        
        // Check if skill can continue with this task
        const skill = skillRegistry.getSkill(task.skill);
        if (skill && !skill.canContinueTask(task)) {
            console.log(`Skill ${task.skill} cannot continue task, skipping it`);
            if (window.taskManager) {
                taskManager.skipCurrentTask();
            }
            this.currentTask = null;
            this.hasBankedForCurrentTask = false;
            return;
        }

        // ==================== NEW: ALWAYS BANK FIRST ====================
        // For ANY new task, go to bank first (unless we just came from bank)
        if (!this.hasBankedForCurrentTask) {
            console.log(`New task requires initial banking`);
            this.goToBank();
            return;
        }
        // ==================== END NEW BANKING LOGIC ====================

        // Check actual distance to node
        const node = nodes.getNode(task.nodeId);
        if (node) {
            const dist = window.distance(player.position.x, player.position.y, node.position.x, node.position.y);
            if (dist <= 2) {
                if (player.currentNode !== task.nodeId) {
                    console.log(`Already at ${task.nodeId} position (distance: ${dist.toFixed(1)}), setting currentNode`);
                    player.currentNode = task.nodeId;
                }
            }
        }

        // Check if we're at the right node
        if (player.currentNode !== task.nodeId) {
            if (player.targetNode === task.nodeId && player.isMoving()) {
                console.log(`Already moving to ${task.nodeId}`);
                return;
            }
            
            console.log(`Moving to ${task.nodeId} for task`);
            player.moveTo(task.nodeId);
            return;
        }

        // Verify we're actually at the node
        if (node) {
            const dist = window.distance(player.position.x, player.position.y, node.position.x, node.position.y);
            if (dist > 2) {
                console.log(`currentNode says ${task.nodeId} but player is ${dist} tiles away, clearing and moving`);
                player.currentNode = null;
                player.moveTo(task.nodeId);
                return;
            }
        }
        
        // Check for processing skills - do we have the right materials?
        if (skill && skill.isProcessingSkill) {
            if (!skill.hasMaterialsForCurrentTask || !skill.hasMaterialsForCurrentTask()) {
                const materials = skill.getMaterialsNeededForTask ? skill.getMaterialsNeededForTask(task) : null;
                if (materials) {
                    console.log(`No ${materials.itemId} in inventory for ${task.skill} task, need to bank`);
                } else {
                    console.log(`No materials in inventory for ${task.skill} task, need to bank`);
                }
                
                if (materials && bank.getItemCount(materials.itemId) === 0) {
                    console.log(`No ${materials.itemId} in bank either, task impossible, skipping`);
                    if (window.taskManager) {
                        taskManager.skipCurrentTask();
                    }
                    this.currentTask = null;
                    this.hasBankedForCurrentTask = false;
                    return;
                }
                
                this.goToBank();
                return;
            }
        }
        
        // Check if we have required items (for fishing bait, etc)
        if (!player.hasRequiredItems(task.activityId)) {
            if (this.hasAccessToRequiredItems(task.activityId)) {
                console.log(`Missing required items for ${task.activityId}, going to bank`);
                this.goToBankForItems(task.activityId);
                return;
            } else {
                if (this.canBuyRequiredItems(task.activityId)) {
                    console.log(`Need to buy items for ${task.activityId}`);
                    console.log('Shopping not yet implemented by AI, skipping task');
                    if (window.taskManager) {
                        taskManager.skipCurrentTask();
                    }
                    this.currentTask = null;
                    this.hasBankedForCurrentTask = false;
                    return;
                }
                
                console.log(`Cannot perform ${task.activityId} - required items not available, skipping task`);
                if (window.taskManager) {
                    taskManager.skipCurrentTask();
                }
                this.currentTask = null;
                this.hasBankedForCurrentTask = false;
                return;
            }
        }
        
        // Start the activity
        console.log(`Starting activity ${task.activityId} for task`);
        player.startActivity(task.activityId);
    }

    canBuyRequiredItems(activityId) {
        const requiredItems = player.getRequiredItems(activityId);
        
        for (const required of requiredItems) {
            // Check if shop sells it
            if (window.shop && shop.sellsItem(required.itemId)) {
                // Check if we have coins
                const price = shop.getPrice(required.itemId);
                const coins = inventory.getItemCount('coins');
                if (coins >= price * required.quantity) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // ==================== BANKING OPERATIONS ====================

    goToBank() {
    const currentNode = nodes.getNode(player.currentNode);
    
    // If already at a bank, just perform banking
    if (currentNode && currentNode.type === 'bank') {
        this.performBanking();
        return;
    }
    
    // OPTIMIZATION: If we're at a node with pathToBank, use it directly
    if (currentNode && currentNode.pathToBank && currentNode.pathToBank.length > 0) {
        console.log(`Using direct pathToBank from ${player.currentNode} to ${currentNode.nearestBank}`);
        
        // Set up the path directly
        player.path = [...currentNode.pathToBank]; // Copy the array
        player.pathIndex = 0;
        player.segmentProgress = 0;
        player.targetNode = currentNode.nearestBank;
        
        const bankNode = nodes.getNode(currentNode.nearestBank);
        if (bankNode) {
            player.targetPosition = { ...bankNode.position };
        }
        
        // Clear current node since we're leaving
        player.currentNode = null;
        
        // Stop any activity
        player.stopActivity();
        
        // Start path preparation animation
        player.startPathPreparation(600);
        
        console.log(`Direct path to ${currentNode.nearestBank} set (${player.path.length} waypoints)`);
        return;
    }
    
    let targetBankId = null;
    let fallbackBankId = null;
    
    // If we have a task, determine which bank to use
    if (this.currentTask && this.currentTask.nodeId) {
        const taskNode = nodes.getNode(this.currentTask.nodeId);
        
        if (taskNode) {
            // If we're not on a node, just go to the task node's nearest bank
            if (!currentNode) {
                targetBankId = taskNode.nearestBank;
                console.log(`Not on a node, going to task node's nearest bank: ${targetBankId}`);
            } else {
                // We're on a node, compare distances
                const currentNodeBankDist = currentNode.nearestBankDistance || Infinity;
                const taskNodeBankDist = taskNode.nearestBankDistance || Infinity;
                
                // Choose bank with shorter distance to its node
                if (currentNodeBankDist < taskNodeBankDist) {
                    targetBankId = currentNode.nearestBank;
                    fallbackBankId = taskNode.nearestBank;
                    console.log(`Choosing ${currentNode.nearestBank} (dist: ${currentNodeBankDist}) over ${taskNode.nearestBank} (dist: ${taskNodeBankDist})`);
                } else if (taskNodeBankDist < currentNodeBankDist) {
                    targetBankId = taskNode.nearestBank;
                    fallbackBankId = currentNode.nearestBank;
                    console.log(`Choosing ${taskNode.nearestBank} (dist: ${taskNodeBankDist}) over ${currentNode.nearestBank} (dist: ${currentNodeBankDist})`);
                } else {
                    // Equal distances - coin flip
                    if (Math.random() < 0.5) {
                        targetBankId = currentNode.nearestBank;
                        fallbackBankId = taskNode.nearestBank;
                    } else {
                        targetBankId = taskNode.nearestBank;
                        fallbackBankId = currentNode.nearestBank;
                    }
                    console.log(`Equal distances (${currentNodeBankDist}), coin flip chose ${targetBankId}`);
                }
            }
        }
    } else if (currentNode) {
        // No task but we're on a node - use current node's nearest bank
        targetBankId = currentNode.nearestBank;
        console.log(`No task, using current node's nearest bank: ${targetBankId}`);
    }
    
    // NEW FALLBACK LOGIC: If still no bank, check next task and regular tasks
    if (!targetBankId && window.taskManager) {
        console.log('No bank found from current task/node, checking other tasks...');
        
        // Check next task
        if (taskManager.nextTask && taskManager.nextTask.nodeId) {
            const nextTaskNode = nodes.getNode(taskManager.nextTask.nodeId);
            if (nextTaskNode && nextTaskNode.nearestBank) {
                targetBankId = nextTaskNode.nearestBank;
                console.log(`Using bank from next task: ${targetBankId}`);
            }
        }
        
        // Still no bank? Check regular tasks
        if (!targetBankId && taskManager.tasks && taskManager.tasks.length > 0) {
            for (const task of taskManager.tasks) {
                if (task.nodeId) {
                    const taskNode = nodes.getNode(task.nodeId);
                    if (taskNode && taskNode.nearestBank) {
                        targetBankId = taskNode.nearestBank;
                        console.log(`Using bank from queued task: ${targetBankId}`);
                        break;
                    }
                }
            }
        }
    }
    
    // LAST RESORT: Try to find any bank node
    if (!targetBankId) {
        console.log('Still no bank found, trying to find any bank node...');
        const allBanks = nodes.getNodesOfType('bank');
        if (allBanks.length > 0) {
            targetBankId = allBanks[0].id;
            console.log(`Using first available bank: ${targetBankId}`);
        }
    }
    
    // ULTIMATE FALLBACK: Use Lumbridge bank as hardcoded fallback
    if (!targetBankId) {
        console.log('No banks found through any method, using Lumbridge bank as fallback');
        targetBankId = 'lumbridge_bank';
    }
    
    // Verify the bank node exists and is actually a bank
    const bankNode = nodes.getNode(targetBankId);
    if (!bankNode) {
        console.error(`CRITICAL ERROR: Bank node ${targetBankId} not found in nodes data!`);
        if (fallbackBankId) {
            console.log(`Trying fallback bank: ${fallbackBankId}`);
            targetBankId = fallbackBankId;
            fallbackBankId = null;
        } else {
            // Even our hardcoded Lumbridge bank doesn't exist - this is really bad
            console.error('CRITICAL ERROR: Even Lumbridge bank not found! nodes.json is corrupt or missing bank data!');
            return;
        }
    } else if (bankNode.type !== 'bank') {
        console.error(`CRITICAL ERROR: Node ${targetBankId} is not a bank! It's type: ${bankNode.type}`);
        if (fallbackBankId) {
            console.log(`Trying fallback bank: ${fallbackBankId}`);
            targetBankId = fallbackBankId;
            fallbackBankId = null;
        } else {
            // Try Lumbridge as ultimate fallback
            console.log('Node is not a bank, trying Lumbridge bank as fallback');
            targetBankId = 'lumbridge_bank';
        }
    }
    
    // Check if already moving to this bank
    if (player.targetNode === targetBankId && player.isMoving()) {
        console.log(`Already moving to ${targetBankId}`);
        return;
    }
    
    // Try to pathfind to the chosen bank
    console.log(`Attempting to move to ${targetBankId}`);
    
    // Store original position to check if pathfinding worked
    const originalTargetNode = player.targetNode;
    
    // Attempt to move to the primary bank
    player.moveTo(targetBankId);
    
    // Check if pathfinding succeeded (player.targetNode would be set)
    if (player.targetNode !== targetBankId) {
        console.error(`Failed to pathfind to ${targetBankId}`);
        
        // Try fallback bank if available
        if (fallbackBankId) {
            console.log(`Trying fallback bank: ${fallbackBankId}`);
            player.moveTo(fallbackBankId);
            
            // Check if fallback worked
            if (player.targetNode !== fallbackBankId) {
                // Last try: Lumbridge bank
                console.log('Both banks failed, trying Lumbridge bank as last resort');
                player.moveTo('lumbridge_bank');
                
                if (player.targetNode !== 'lumbridge_bank') {
                    console.error(`CRITICAL ERROR: Cannot pathfind to ANY bank! Game state may be corrupted.`);
                    // Restore original target
                    player.targetNode = originalTargetNode;
                    return;
                }
            }
        } else {
            // No fallback available, try Lumbridge
            console.log('Primary bank failed, trying Lumbridge bank as last resort');
            player.moveTo('lumbridge_bank');
            
            if (player.targetNode !== 'lumbridge_bank') {
                console.error(`CRITICAL ERROR: Cannot pathfind to ANY bank! Game state may be corrupted.`);
                // Restore original target
                player.targetNode = originalTargetNode;
                return;
            }
        }
    }
}

    goToBankForItems(activityId) {
    const currentNode = nodes.getNode(player.currentNode);
    
    if (currentNode && currentNode.type === 'bank') {
        this.handleBankingForActivity(activityId);
        return;
    }
    
    let targetBankId = null;
    
    if (currentNode && currentNode.nearestBank) {
        // We're on a node, use its nearest bank
        targetBankId = currentNode.nearestBank;
    } else if (this.currentTask && this.currentTask.nodeId) {
        // Not on a node, but have a task - use task node's nearest bank
        const taskNode = nodes.getNode(this.currentTask.nodeId);
        if (taskNode && taskNode.nearestBank) {
            targetBankId = taskNode.nearestBank;
        }
    }
    
    // NEW FALLBACK: Check other tasks if still no bank
    if (!targetBankId && window.taskManager) {
        // Check next task
        if (taskManager.nextTask && taskManager.nextTask.nodeId) {
            const nextTaskNode = nodes.getNode(taskManager.nextTask.nodeId);
            if (nextTaskNode && nextTaskNode.nearestBank) {
                targetBankId = nextTaskNode.nearestBank;
            }
        }
        
        // Check regular tasks
        if (!targetBankId && taskManager.tasks) {
            for (const task of taskManager.tasks) {
                if (task.nodeId) {
                    const taskNode = nodes.getNode(task.nodeId);
                    if (taskNode && taskNode.nearestBank) {
                        targetBankId = taskNode.nearestBank;
                        break;
                    }
                }
            }
        }
    }
    
    // Try to find any bank
    if (!targetBankId) {
        const allBanks = nodes.getNodesOfType('bank');
        if (allBanks.length > 0) {
            targetBankId = allBanks[0].id;
        }
    }
    
    // Ultimate fallback: Lumbridge bank
    if (!targetBankId) {
        targetBankId = 'lumbridge_bank';
    }
    
    if (targetBankId) {
        console.log(`Moving to ${targetBankId} to get items for ${activityId}`);
        player.moveTo(targetBankId);
    } else {
        console.error('Cannot find any bank for getting items!');
    }
}

    performBanking() {
        // Let the skill handle its own banking if it has a current task
        if (this.currentTask) {
            const skill = skillRegistry.getSkill(this.currentTask.skill);
            if (skill && skill.handleBanking) {
                const success = skill.handleBanking(this.currentTask);
                
                // Mark that we've banked for this task if successful
                if (success) {
                    this.hasBankedForCurrentTask = true;
                } else {
                    console.log('Banking failed for skill task');
                    
                    // IMPORTANT: Skip the impossible task in task manager
                    if (window.taskManager) {
                        taskManager.skipCurrentTask();
                    }
                    
                    // Clear our reference
                    this.currentTask = null;
                    this.hasBankedForCurrentTask = false;
                    return;
                }
                
                // Update task progress after banking
                if (window.taskManager) {
                    taskManager.updateAllProgress();
                    if (window.ui) {
                        window.ui.updateTasks();
                    }
                }
                
                // Re-validate current task after banking
                if (!this.isCurrentTaskValid()) {
                    this.selectNextTask();
                }
                
                // Start banking animation
                player.startBanking(600);
                
                // During banking animation, prepare for next action
                if (this.currentTask && this.currentTask.progress < 1) {
                    // Prepare waypoint path to task node during banking animation
                    const taskNode = nodes.getNode(this.currentTask.nodeId);
                    if (taskNode && player.currentNode !== this.currentTask.nodeId) {
                        console.log('Preparing waypoint path to task node during banking...');
                        
                        // Try to use waypoint paths
                        let path = null;
                        
                        // We're at a bank, going to task node
                        // Check if task node uses this same bank
                        if (taskNode.nearestBank === player.currentNode) {
                            // Same bank - use reversed pathToBank
                            if (taskNode.pathToBank && taskNode.pathToBank.length > 0) {
                                path = [...taskNode.pathToBank].reverse();
                                console.log(`Using reversed pathToBank from ${player.currentNode} to ${this.currentTask.nodeId}`);
                            }
                        } else if (window.pathfinding) {
                            // Different bank - use full waypoint path
                            const waypointPath = pathfinding.buildWaypointPath(player.currentNode, this.currentTask.nodeId);
                            if (waypointPath && waypointPath.length > 0) {
                                path = waypointPath;
                                console.log(`Using waypoint path from ${player.currentNode} to ${this.currentTask.nodeId}`);
                            }
                        }
                        
                        // NO A* FALLBACK - If no waypoint path, we'll teleport when needed
                if (!path) {
                    console.log('No waypoint path available - will teleport if needed');
                }
                        
                        if (path && path.length > 0) {
                            player.path = path;
                            player.pathIndex = 0;
                            player.segmentProgress = 0;
                            player.targetPosition = { ...taskNode.position };
                            player.targetNode = this.currentTask.nodeId;
                            console.log(`Path to ${this.currentTask.nodeId} prepared (${path.length} waypoints)`);
                        }
                    }
                }
                
                this.clearCooldown();
                return;
            }
        }
        
        // Default banking - deposit all
        const deposited = bank.depositAll();
        console.log(`Deposited ${deposited} items`);
        
        // Update task progress after banking
        if (window.taskManager) {
            taskManager.updateAllProgress();
            if (window.ui) {
                window.ui.updateTasks();
            }
        }
        
        // Re-validate current task after banking
        if (!this.isCurrentTaskValid()) {
            this.selectNextTask();
        }
        
        // Start banking animation
        player.startBanking(600);
        
        // During banking animation, prepare for next action
        if (this.currentTask && this.currentTask.progress < 1) {
            // Prepare waypoint path to task node during banking animation
            const taskNode = nodes.getNode(this.currentTask.nodeId);
            if (taskNode && player.currentNode !== this.currentTask.nodeId) {
                console.log('Preparing waypoint path to task node during banking...');
                
                // Try to use waypoint paths
                let path = null;
                
                // We're at a bank, going to task node
                // Check if task node uses this same bank
                if (taskNode.nearestBank === player.currentNode) {
                    // Same bank - use reversed pathToBank
                    if (taskNode.pathToBank && taskNode.pathToBank.length > 0) {
                        path = [...taskNode.pathToBank].reverse();
                        console.log(`Using reversed pathToBank from ${player.currentNode} to ${this.currentTask.nodeId}`);
                    }
                } else if (window.pathfinding) {
                    // Different bank - use full waypoint path
                    const waypointPath = pathfinding.buildWaypointPath(player.currentNode, this.currentTask.nodeId);
                    if (waypointPath && waypointPath.length > 0) {
                        path = waypointPath;
                        console.log(`Using waypoint path from ${player.currentNode} to ${this.currentTask.nodeId}`);
                    }
                }
                
                // NO A* FALLBACK - If no waypoint path, we'll teleport when needed
                        if (!path) {
                            console.log('No waypoint path available - will teleport if needed');
                        }
                
                if (path && path.length > 0) {
                    player.path = path;
                    player.pathIndex = 0;
                    player.segmentProgress = 0;
                    player.targetPosition = { ...taskNode.position };
                    player.targetNode = this.currentTask.nodeId;
                    console.log(`Path to ${this.currentTask.nodeId} prepared (${path.length} waypoints)`);
                }
            }
        }
        
        this.clearCooldown();
    }

    handleBankingForActivity(activityId) {
        const deposited = bank.depositAll();
        console.log(`Deposited ${deposited} items`);
        
        if (!this.withdrawItemsForActivity(activityId)) {
            // Failed to get required items - skip the current task if it exists
            if (this.currentTask && window.taskManager) {
                console.log('Cannot get required items for task, skipping it');
                taskManager.skipCurrentTask();
                this.currentTask = null;
                this.hasBankedForCurrentTask = false;
            }
            return;
        }
        
        // Update task progress
        if (window.taskManager) {
            taskManager.updateAllProgress();
            if (window.ui) {
                window.ui.updateTasks();
            }
        }
        
        // Re-validate current task
        if (!this.isCurrentTaskValid()) {
            this.selectNextTask();
        }
        
        // Start banking animation
        player.startBanking(600);
        
        // During banking animation, prepare for next action
        if (this.currentTask) {
            // Prepare waypoint path to task node during banking animation
            const taskNode = nodes.getNode(this.currentTask.nodeId);
            if (taskNode && player.currentNode !== this.currentTask.nodeId) {
                console.log('Preparing waypoint path to task node during banking...');
                
                // Try to use waypoint paths
                let path = null;
                
                // We're at a bank, going to task node
                // Check if task node uses this same bank
                if (taskNode.nearestBank === player.currentNode) {
                    // Same bank - use reversed pathToBank
                    if (taskNode.pathToBank && taskNode.pathToBank.length > 0) {
                        path = [...taskNode.pathToBank].reverse();
                        console.log(`Using reversed pathToBank from ${player.currentNode} to ${this.currentTask.nodeId}`);
                    }
                } else if (window.pathfinding) {
                    // Different bank - use full waypoint path
                    const waypointPath = pathfinding.buildWaypointPath(player.currentNode, this.currentTask.nodeId);
                    if (waypointPath && waypointPath.length > 0) {
                        path = waypointPath;
                        console.log(`Using waypoint path from ${player.currentNode} to ${this.currentTask.nodeId}`);
                    }
                }
                
                // NO A* FALLBACK - If no waypoint path, we'll teleport when needed
                if (!path) {
                    console.log('No waypoint path available - will teleport if needed');
                }
                
                if (path && path.length > 0) {
                    player.path = path;
                    player.pathIndex = 0;
                    player.segmentProgress = 0;
                    player.targetPosition = { ...taskNode.position };
                    player.targetNode = this.currentTask.nodeId;
                    console.log(`Path to ${this.currentTask.nodeId} prepared (${path.length} waypoints)`);
                }
            }
        }
        
        this.clearCooldown();
    }

    withdrawItemsForActivity(activityId) {
        const requiredItems = player.getRequiredItems(activityId);
        
        if (requiredItems.length === 0) {
            return true;
        }
        
        console.log(`Withdrawing required items for ${activityId}:`, requiredItems);
        
        for (const required of requiredItems) {
            const itemData = loadingManager.getData('items')[required.itemId];
            const bankCount = bank.getItemCount(required.itemId);
            
            if (bankCount === 0) {
                console.log(`No ${required.itemId} in bank`);
                return false;
            }
            
            let withdrawAmount = itemData.stackable ? bankCount : Math.min(14, bankCount);
            
            const withdrawn = bank.withdrawUpTo(required.itemId, withdrawAmount);
            if (withdrawn > 0) {
                inventory.addItem(required.itemId, withdrawn);
                console.log(`Withdrew ${withdrawn} ${itemData.name}`);
            }
        }
        
        return true;
    }

    // ==================== NAVIGATION & MOVEMENT ====================

    hasAccessToRequiredItems(activityId) {
        const requiredItems = player.getRequiredItems(activityId);
        
        for (const required of requiredItems) {
            const inInventory = inventory.getItemCount(required.itemId);
            const inBank = bank.getItemCount(required.itemId);
            
            if (inInventory + inBank === 0) {
                console.log(`No access to required item ${required.itemId}`);
                return false;
            }
        }
        
        return true;
    }

    isMovingToBank() {
        if (!player.isMoving() || !player.targetNode) return false;
        
        const targetNode = nodes.getNode(player.targetNode);
        return targetNode && targetNode.type === 'bank';
    }

    // ==================== HELPER METHODS ====================

    resetDecisionCooldown() {
        this.decisionCooldown = 1000;
    }

    clearCooldown() {
        this.decisionCooldown = 0;
    }

    getStatus() {
        if (!this.currentTask) return 'No active task';
        
        const current = Math.floor(this.currentTask.progress * this.currentTask.targetCount);
        return `${this.currentTask.description} (${current}/${this.currentTask.targetCount})`;
    }
}

// Make AIManager available globally
window.AIManager = AIManager;
