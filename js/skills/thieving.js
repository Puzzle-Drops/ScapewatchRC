class ThievingSkill extends BaseSkill {
    constructor() {
        super('thieving', 'Thieving');
        this.requiresBankingBeforeTask = false; // Don't start trip with banking for gathering skills
        this.isStunned = false;
        this.stunEndTime = 0;
        this.blackjackCounter = {}; // Track consecutive successful blackjacks per NPC
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
        
        // Determine target count
        const targetCount = this.determineTargetCount(selectedNPC.activityId);
        
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
        
        // Default: equal weights if RuneCred not available
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
    
    determineTargetCount(activityId) {
        // Different counts based on NPC difficulty
        const counts = {
            'pickpocket_man': { min: 50, max: 100 },
            'pickpocket_farmer': { min: 40, max: 80 },
            'pickpocket_ham': { min: 35, max: 70 },
            'pickpocket_warrior': { min: 30, max: 60 },
            'pickpocket_rogue': { min: 30, max: 60 },
            'pickpocket_master_farmer': { min: 30, max: 65 },
            'pickpocket_guard': { min: 25, max: 50 },
            'blackjack_bearded': { min: 30, max: 60 },
            'pickpocket_bandit_camp': { min: 25, max: 50 },
            'blackjack_bandit': { min: 30, max: 60 },
            'pickpocket_knight': { min: 30, max: 60 },
            'pickpocket_watchman': { min: 20, max: 40 },
            'pickpocket_menaphite': { min: 25, max: 50 },
            'pickpocket_paladin': { min: 20, max: 40 },
            'pickpocket_gnome': { min: 20, max: 40 },
            'pickpocket_hero': { min: 15, max: 30 },
            'pickpocket_vyre': { min: 15, max: 30 },
            'pickpocket_elf': { min: 15, max: 30 },
            'pickpocket_tzhaar': { min: 20, max: 40 }
        };
        
        const range = counts[activityId] || { min: 20, max: 50 };
        const baseCount = range.min + Math.random() * (range.max - range.min);
        let count = Math.round(baseCount / 5) * 5;
        
        // Apply RuneCred quantity modifier
        if (window.runeCreditManager) {
            const virtualItemId = `thieving_${activityId}`;
            const modifier = runeCreditManager.getQuantityModifier(this.id, virtualItemId);
            count = Math.round(count * modifier);
            count = Math.max(5, count); // Minimum of 5
        }
        
        return count;
    }
    
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
    
    // Get all possible tasks for UI display (not for generation)
    getAllPossibleTasksForUI() {
        const tasks = [];
        const activities = loadingManager.getData('activities');
        
        // All thieving NPCs with their base counts
        const npcData = [
            { id: 'pickpocket_man', name: 'Man/Woman', min: 50, max: 100, level: 1 },
            { id: 'pickpocket_farmer', name: 'Farmer', min: 40, max: 80, level: 10 },
            { id: 'pickpocket_ham', name: 'H.A.M. Member', min: 35, max: 70, level: 15 },
            { id: 'pickpocket_warrior', name: 'Warrior woman', min: 30, max: 60, level: 25 },
            { id: 'pickpocket_rogue', name: 'Rogue', min: 30, max: 60, level: 32 },
            { id: 'pickpocket_master_farmer', name: 'Master Farmer', min: 30, max: 65, level: 38 },
            { id: 'pickpocket_guard', name: 'Guard', min: 25, max: 50, level: 40 },
            { id: 'blackjack_bearded', name: 'Bearded Pollnivnian Bandit', min: 30, max: 60, level: 45 },
            { id: 'pickpocket_bandit_camp', name: 'Bandit', min: 25, max: 50, level: 53 },
            { id: 'blackjack_bandit', name: 'Menaphite Thug', min: 30, max: 60, level: 65 },
            { id: 'pickpocket_knight', name: 'Knight of Ardougne', min: 30, max: 60, level: 55 },
            { id: 'pickpocket_watchman', name: 'Watchman', min: 20, max: 40, level: 65 },
            { id: 'pickpocket_menaphite', name: 'Menaphite Thug', min: 25, max: 50, level: 65 },
            { id: 'pickpocket_paladin', name: 'Paladin', min: 20, max: 40, level: 70 },
            { id: 'pickpocket_gnome', name: 'Gnome', min: 20, max: 40, level: 75 },
            { id: 'pickpocket_hero', name: 'Hero', min: 15, max: 30, level: 80 },
            { id: 'pickpocket_vyre', name: 'Vyre', min: 15, max: 30, level: 82 },
            { id: 'pickpocket_elf', name: 'Elf', min: 15, max: 30, level: 85 },
            { id: 'pickpocket_tzhaar', name: 'TzHaar-Hur', min: 20, max: 40, level: 90 }
        ];
        
        for (const npc of npcData) {
            // Check if activity exists
            if (activities[npc.id]) {
                const activity = activities[npc.id];
                tasks.push({
                    itemId: `thieving_${npc.id}`,
                    displayName: activity.targetName || activity.name || npc.name,
                    minCount: npc.min,
                    maxCount: npc.max,
                    requiredLevel: npc.level
                });
            } else {
                // Use fallback data
                tasks.push({
                    itemId: `thieving_${npc.id}`,
                    displayName: npc.name,
                    minCount: npc.min,
                    maxCount: npc.max,
                    requiredLevel: npc.level
                });
            }
        }
        
        return tasks;
    }
    
    // Get base task counts without modifiers (for UI)
    getBaseTaskCounts(itemId) {
        // Remove the 'thieving_' prefix to get activityId
        const activityId = itemId.replace('thieving_', '');
        
        const counts = {
            'pickpocket_man': { min: 50, max: 100 },
            'pickpocket_farmer': { min: 40, max: 80 },
            'pickpocket_ham': { min: 35, max: 70 },
            'pickpocket_warrior': { min: 30, max: 60 },
            'pickpocket_rogue': { min: 30, max: 60 },
            'pickpocket_master_farmer': { min: 30, max: 65 },
            'pickpocket_guard': { min: 25, max: 50 },
            'blackjack_bearded': { min: 30, max: 60 },
            'pickpocket_bandit_camp': { min: 25, max: 50 },
            'blackjack_bandit': { min: 30, max: 60 },
            'pickpocket_knight': { min: 30, max: 60 },
            'pickpocket_watchman': { min: 20, max: 40 },
            'pickpocket_menaphite': { min: 25, max: 50 },
            'pickpocket_paladin': { min: 20, max: 40 },
            'pickpocket_gnome': { min: 20, max: 40 },
            'pickpocket_hero': { min: 15, max: 30 },
            'pickpocket_vyre': { min: 15, max: 30 },
            'pickpocket_elf': { min: 15, max: 30 },
            'pickpocket_tzhaar': { min: 20, max: 40 }
        };
        
        return counts[activityId] || { min: 20, max: 50 };
    }
    
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
            // 1/5 chance for special seeds, otherwise potato seed
            if (Math.random() > 0.2) {
                return { itemId: 'potato_seed', quantity: 1 };
            }
            
            // Roll for special seeds
            const seedTable = [
                { itemId: 'snape_grass_seed', chance: 1/260 },
                { itemId: 'limpwurt_seed', chance: 1/86.3 },
                { itemId: 'potato_cactus_seed', chance: 1/2460 },
                { itemId: 'guam_seed', chance: 1/63 },
                { itemId: 'marrentill_seed', chance: 1/95.6 },
                { itemId: 'tarromin_seed', chance: 1/140 },
                { itemId: 'harralander_seed', chance: 1/206 },
                { itemId: 'ranarr_seed', chance: 1/320 },
                { itemId: 'toadflax_seed', chance: 1/443 },
                { itemId: 'irit_seed', chance: 1/651 },
                { itemId: 'avantoe_seed', chance: 1/947 },
                { itemId: 'kwuarm_seed', chance: 1/1389 },
                { itemId: 'snapdragon_seed', chance: 1/2400 },
                { itemId: 'cadantine_seed', chance: 1/2976 },
                { itemId: 'lantadyme_seed', chance: 1/4167 },
                { itemId: 'dwarf_weed_seed', chance: 1/6944 },
                { itemId: 'torstol_seed', chance: 1/12000 }
            ];
            
            const roll = Math.random();
            let cumulative = 0;
            
            for (const seed of seedTable) {
                cumulative += seed.chance;
                if (roll < cumulative) {
                    return { itemId: seed.itemId, quantity: 1 };
                }
            }
            
            // Fallback to potato seed
            return { itemId: 'potato_seed', quantity: 1 };
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
