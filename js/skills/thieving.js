class ThievingSkill extends BaseSkill {
    constructor() {
        super('thieving', 'Thieving');
        this.requiresBankingBeforeTask = false; // Don't start trip with banking for gathering skills
        this.isStunned = false;
        this.stunEndTime = 0;
        this.blackjackCounter = {}; // Track consecutive successful blackjacks per NPC
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    // Single source of truth for all thieving data
    // Note: itemId is virtual (thieving_X), display name is the NPC name
    initializeSkillData() {
        this.SKILL_DATA = [
            { itemId: 'thieving_pickpocket_man',          name: 'Man/Woman',                minCount: 50, maxCount: 100, level: 1  },
            { itemId: 'thieving_pickpocket_farmer',       name: 'Farmer',                   minCount: 50, maxCount: 100,  level: 10 },
            { itemId: 'thieving_pickpocket_ham',          name: 'H.A.M. Member',            minCount: 50, maxCount: 100,  level: 15 },
            { itemId: 'thieving_pickpocket_warrior',      name: 'Warrior',                  minCount: 50, maxCount: 100,  level: 25 },
            { itemId: 'thieving_pickpocket_rogue',        name: 'Rogue',                    minCount: 50, maxCount: 100,  level: 32 },
            { itemId: 'thieving_pickpocket_master_farmer', name: 'Master Farmer',           minCount: 50, maxCount: 100,  level: 38 },
            { itemId: 'thieving_pickpocket_guard',        name: 'Guard',                    minCount: 50, maxCount: 100,  level: 40 },
            { itemId: 'thieving_blackjack_bearded',       name: 'Bearded Pollnivnian Bandit', minCount: 50, maxCount: 100,  level: 45 },
            { itemId: 'thieving_pickpocket_bandit_camp',  name: 'Bandit',                   minCount: 50, maxCount: 100,  level: 53 },
            { itemId: 'thieving_blackjack_bandit',        name: 'Menaphite Thug',           minCount: 50, maxCount: 100,  level: 55 },
            { itemId: 'thieving_pickpocket_knight',       name: 'Knight of Ardougne',       minCount: 50, maxCount: 100,  level: 55 },
            { itemId: 'thieving_pickpocket_watchman',     name: 'Watchman',                 minCount: 50, maxCount: 100,  level: 65 },
            { itemId: 'thieving_pickpocket_menaphite',    name: 'Menaphite Thug',           minCount: 50, maxCount: 100,  level: 65 },
            { itemId: 'thieving_pickpocket_paladin',      name: 'Paladin',                  minCount: 50, maxCount: 100,  level: 70 },
            { itemId: 'thieving_pickpocket_gnome',        name: 'Gnome',                    minCount: 50, maxCount: 100,  level: 75 },
            { itemId: 'thieving_pickpocket_hero',         name: 'Hero',                     minCount: 50, maxCount: 100,  level: 80 },
            { itemId: 'thieving_pickpocket_vyre',         name: 'Vyre',                     minCount: 50, maxCount: 100,  level: 82 },
            { itemId: 'thieving_pickpocket_elf',          name: 'Elf',                      minCount: 50, maxCount: 100,  level: 85 },
            { itemId: 'thieving_pickpocket_tzhaar',       name: 'TzHaar-Hur',               minCount: 50, maxCount: 100,  level: 90 }
        ];
    }
    
    // ==================== TASK GENERATION ====================
    
    getTaskVerb() {
        return 'Pickpocket';
    }
    
    generateTask() {
        // Get all possible NPCs at current level
        const possibleNPCs = this.getPossibleNPCs();
        if (possibleNPCs.length === 0) {
            console.log('No NPCs available for thieving at current level');
            return null;
        }
        
        // Select an NPC using weighted distribution
        const selectedNPC = this.selectWeightedNPC(possibleNPCs);
        if (!selectedNPC) {
            console.log('Failed to select NPC for thieving');
            return null;
        }
        
        // Find viable nodes for this NPC
        const viableNodes = this.findViableNodesForNPC(selectedNPC.activityId);
        if (viableNodes.length === 0) {
            console.log(`No viable nodes found for ${selectedNPC.activityId}`);
            return null;
        }
        
        // Select a node using weighted distribution
        const selected = this.selectWeightedNode(viableNodes);
        
        // Determine target count (using centralized data)
        const targetCount = this.determineTargetCount(`thieving_${selectedNPC.activityId}`);
        
        // Get activity data for the name
        const activityData = loadingManager.getData('activities')[selectedNPC.activityId];
        const nodeData = nodes.getNode(selected.nodeId);
        
        return {
            skill: this.id,
            itemId: `thieving_${selectedNPC.activityId}`, // Virtual item for tracking
            targetCount: targetCount,
            nodeId: selected.nodeId,
            activityId: selectedNPC.activityId,
            description: `${this.getTaskVerb()} ${activityData.targetName || activityData.name} ${targetCount} times at ${nodeData.name}`,
            startingCount: 0,
            progress: 0,
            isThievingTask: true,
            successfulThefts: 0
        };
    }
    
    getPossibleNPCs() {
        const npcs = [];
        const activities = loadingManager.getData('activities');
        const currentLevel = skills.getLevel('thieving');
        
        for (const [activityId, activity] of Object.entries(activities)) {
            if (activity.skill !== 'thieving') continue;
            
            const requiredLevel = activity.requiredLevel || 1;
            if (currentLevel < requiredLevel) continue;
            
            npcs.push({
                activityId: activityId,
                requiredLevel: requiredLevel
            });
        }
        
        return npcs;
    }
    
    // Select an NPC using weighted distribution (with RuneCred support)
    selectWeightedNPC(npcs) {
        if (npcs.length === 0) return null;
        
        // Use RuneCred weights if available
        if (window.runeCreditManager) {
            const weightedNPCs = [];
            let totalWeight = 0;
            
            for (const npc of npcs) {
                // Get the weight modifier for this NPC's virtual item
                const virtualItemId = `thieving_${npc.activityId}`;
                const weight = runeCreditManager.getTaskWeight(this.id, virtualItemId);
                totalWeight += weight;
                weightedNPCs.push({ npc, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedNPCs) {
                if (random < weighted.weight) {
                    return weighted.npc;
                }
            }
            
            return npcs[0]; // Fallback
        }
        
        // DEFAULT: Equal weights if RuneCred not available
        return npcs[Math.floor(Math.random() * npcs.length)];
    }
    
    findViableNodesForNPC(activityId) {
        const viableNodes = [];
        const allNodes = nodes.getAllNodes();
        
        for (const [nodeId, node] of Object.entries(allNodes)) {
            if (!node.activities) continue;
            
            // Check if node has this thieving activity
            if (node.activities.includes(activityId)) {
                // Check if node is walkable
                if (window.collision && window.collision.initialized) {
                    if (!collision.isWalkable(Math.floor(node.position.x), Math.floor(node.position.y))) {
                        continue;
                    }
                }
                
                viableNodes.push({
                    nodeId: nodeId,
                    activityId: activityId
                });
            }
        }
        
        return viableNodes;
    }
    
    // determineTargetCount now uses base class implementation
    
    // Update thieving task progress
    updateThievingTaskProgress() {
        if (!window.taskManager) return;
        
        const currentTask = taskManager.getFirstIncompleteTask();
        
        if (currentTask && currentTask.isThievingTask) {
            currentTask.successfulThefts = (currentTask.successfulThefts || 0) + 1;
            const progress = currentTask.successfulThefts / currentTask.targetCount;
            
            console.log(`Thieving progress: ${currentTask.successfulThefts}/${currentTask.targetCount} successful thefts`);
            
            taskManager.setTaskProgress(currentTask, progress);
        }
    }
    
    // ==================== UI DISPLAY METHODS ====================
    
    // Override getAllPossibleTasksForUI to handle activity names properly
    getAllPossibleTasksForUI() {
        const tasks = [];
        const activities = loadingManager.getData('activities');
        
        for (const data of this.SKILL_DATA) {
            // Get the activity ID from the virtual item ID
            const activityId = data.itemId.replace('thieving_', '');
            
            // Check if activity exists to get better naming
            let displayName = data.name;
            if (activities[activityId]) {
                const activity = activities[activityId];
                displayName = activity.targetName || activity.name || data.name;
            }
            
            tasks.push({
                itemId: data.itemId,
                displayName: displayName,
                minCount: data.minCount,
                maxCount: data.maxCount,
                requiredLevel: data.level
            });
        }
        
        return tasks;
    }
    
    // getBaseTaskCounts now uses base class implementation
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        // Check if we're stunned
        if (this.isStunned) {
            const remainingStun = this.stunEndTime - Date.now();
            if (remainingStun > 0) {
                // Return a very long duration to prevent activity from starting
                // This prevents the spam without needing to log anything
                return 999999;
            } else {
                this.isStunned = false;
            }
        }
        
        // Special case for blackjacking - every 3rd successful attempt takes longer
        if (activityData.id && activityData.id.includes('blackjack')) {
            const counter = this.blackjackCounter[activityData.id] || 0;
            if (counter > 0 && counter % 3 === 0) {
                return 1200; // Double duration every 3rd attempt
            }
        }
        
        // All thieving activities are 600ms base
        let duration = 600;
        
        // Apply speed bonus from RuneCred system
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus); // Speed bonus reduces duration
        }
        
        return duration;
    }
    
    beforeActivityStart(activityData) {
        // Check if we're still stunned
        if (this.isStunned && Date.now() < this.stunEndTime) {
            const remainingTime = Math.ceil((this.stunEndTime - Date.now()) / 1000);
            console.log(`Still stunned for ${remainingTime} more seconds`);
            return false;
        }
        
        // Clear stun if it expired (backup check - should be handled in canPerformActivity)
        if (this.isStunned) {
            console.log('Stun expired in beforeActivityStart, clearing');
            this.isStunned = false;
            if (window.player) {
                player.setStunned(false);
            }
        }
        
        // Check inventory space
        if (inventory.isFull()) {
            console.log('Inventory full - need to bank');
            if (window.ai) {
                window.ai.decisionCooldown = 0;
            }
            return false;
        }
        
        return true;
    }
    
    processRewards(activityData, level) {
        // Calculate success chance
        const successChance = this.getSuccessChance(activityData, level);
        const success = Math.random() <= successChance;
        
        if (!success) {
            // Failed - apply stun (applyStun will handle the console message)
            this.applyStun();
            
            // Reset blackjack counter on failure
            if (activityData.id && activityData.id.includes('blackjack')) {
                this.blackjackCounter[activityData.id] = 0;
            }
            
            return [];
        }
        
        // Success - process rewards
        console.log('Pickpocket successful!');
        
        // Increment blackjack counter if applicable
        if (activityData.id && activityData.id.includes('blackjack')) {
            this.blackjackCounter[activityData.id] = (this.blackjackCounter[activityData.id] || 0) + 1;
        }
        
        // Update task progress
        this.updateThievingTaskProgress();
        
        // Get rewards
        const rewards = this.rollThievingRewards(activityData, level);
        
        // Double rewards at level 50+
        if (level >= 50) {
            for (const reward of rewards) {
                reward.quantity *= 2;
            }
        }
        
        return rewards;
    }
    
    getSuccessChance(activityData, level) {
        if (!activityData.successChanceScaling) {
            return 1.0; // Default to always successful if not specified
        }
        
        const scaling = activityData.successChanceScaling;
        
        // Clamp level to valid range
        const clampedLevel = Math.max(scaling.minLevel, Math.min(level, scaling.maxLevel));
        
        // Linear interpolation
        const progress = (clampedLevel - scaling.minLevel) / (scaling.maxLevel - scaling.minLevel);
        return scaling.minChance + (scaling.maxChance - scaling.minChance) * progress;
    }
    
    rollThievingRewards(activityData, level) {
        const rewards = [];
        
        // Process guaranteed drops
        if (activityData.guaranteedDrops) {
            for (const drop of activityData.guaranteedDrops) {
                const quantity = this.rollQuantity(drop.quantity);
                rewards.push({
                    itemId: drop.itemId,
                    quantity: quantity
                });
            }
        }
        
        // Process chance-based drops
        if (activityData.drops) {
            for (const drop of activityData.drops) {
                if (Math.random() <= drop.chance) {
                    const quantity = this.rollQuantity(drop.quantity);
                    rewards.push({
                        itemId: drop.itemId,
                        quantity: quantity
                    });
                }
            }
        }
        
        // Process herb table drops
        if (activityData.herbTableChance && Math.random() <= activityData.herbTableChance) {
            const herb = sharedDropTables.rollHerbTable();
            if (herb) {
                rewards.push(herb);
            }
        }
        
        // Process special drop tables (like master farmer seeds)
        if (activityData.specialDropTable) {
            const specialDrop = this.rollSpecialTable(activityData.specialDropTable);
            if (specialDrop) {
                rewards.push(specialDrop);
            }
        }
        
        return rewards;
    }
    
    rollQuantity(quantitySpec) {
        if (typeof quantitySpec === 'number') {
            return quantitySpec;
        } else if (typeof quantitySpec === 'string' && quantitySpec.includes('-')) {
            const [min, max] = quantitySpec.split('-').map(n => parseInt(n));
            return min + Math.floor(Math.random() * (max - min + 1));
        }
        return 1;
    }
    
    rollSpecialTable(tableName) {
        // Handle special tables like master farmer seeds
        if (tableName === 'master_farmer_seeds') {
            // Use the shared drop table for master farmer seeds
            return sharedDropTables.rollMasterFarmerSeeds();
        }
        
        return null;
    }
    
    applyStun() {
        // Apply speed modifier to stun duration
        let stunDuration = 6000; // Base 6 second stun
        
        // Apply action speed modifier if dev console is available
        if (window.devConsole && window.devConsole.speedModifiers) {
            stunDuration = stunDuration * window.devConsole.speedModifiers.actionDuration;
        }
        
        this.isStunned = true;
        this.stunEndTime = Date.now() + stunDuration;
        
        // Notify player to show stun animation
        if (window.player) {
            player.setStunned(true, stunDuration);
        }
        
        // Only log if stun is significant (more than 100ms)
        if (stunDuration > 100) {
            console.log(`Pickpocket failed! Stunned for ${(stunDuration / 1000).toFixed(1)} seconds`);
        } else {
            console.log('Pickpocket failed! (Brief stun)');
        }
    }
    
    shouldGrantXP(rewards, activityData) {
        // Only grant XP on successful pickpocket (when we have rewards)
        return rewards.length > 0;
    }
    
    getXpToGrant(rewards, activityData) {
        return rewards.length > 0 ? (activityData.xpPerAction || 0) : 0;
    }
    
    onActivityComplete(activityData) {
        // Clear stun if activity completed (stun duration passed)
        if (this.isStunned && Date.now() >= this.stunEndTime) {
            this.isStunned = false;
            if (window.player) {
                player.setStunned(false);
            }
        }
    }
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        // Bank if inventory is full
        return inventory.isFull();
    }
    
    handleBanking(task) {
        // Simple banking - deposit all
        const deposited = bank.depositAll();
        console.log(`Deposited ${deposited} items before thieving`);
        return true;
    }
    
    canPerformActivity(activityId) {
        const activityData = loadingManager.getData('activities')[activityId];
        if (!activityData || activityData.skill !== this.id) return false;
        
        const requiredLevel = activityData.requiredLevel || 1;
        const currentLevel = skills.getLevel(this.id);
        
        // Check if stun has expired and clear it if so
        if (this.isStunned && Date.now() >= this.stunEndTime) {
            console.log('Stun expired, clearing stun state');
            this.isStunned = false;
            // Also clear player stun
            if (window.player) {
                player.setStunned(false);
            }
        }
        
        return currentLevel >= requiredLevel && !this.isStunned;
    }
}

// Make ThievingSkill available globally
window.ThievingSkill = ThievingSkill;
