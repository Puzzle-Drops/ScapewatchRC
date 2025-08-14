class FishingSkill extends BaseSkill {
    constructor() {
        super('fishing', 'Fishing');
        // requiresBankingBeforeTask = false (inherited from BaseSkill)
        this.lastCatchXp = 0;
    }
    
    // ==================== TASK GENERATION OVERRIDES ====================
    
    getTaskVerb() {
        return 'Catch';
    }
    
    determineTargetCount(itemId) {
        const fishCounts = {
            'raw_shrimps': { min: 50, max: 150 },
            'raw_anchovies': { min: 50, max: 125 },
            'raw_sardine': { min: 50, max: 125 },
            'raw_herring': { min: 40, max: 100 },
            'raw_mackerel': { min: 40, max: 90 },
            'raw_trout': { min: 35, max: 80 },
            'raw_cod': { min: 35, max: 75 },
            'raw_pike': { min: 30, max: 70 },
            'raw_salmon': { min: 30, max: 60 },
            'raw_tuna': { min: 25, max: 50 },
            'raw_lobster': { min: 20, max: 40 },
            'raw_bass': { min: 20, max: 35 },
            'raw_swordfish': { min: 15, max: 30 },
            'raw_shark': { min: 10, max: 20 }
        };
        
        const counts = fishCounts[itemId] || { min: 20, max: 50 };
        const baseCount = counts.min + Math.random() * (counts.max - counts.min);
        let count = Math.round(baseCount / 5) * 5;
        
        // Apply RuneCred quantity modifier
        if (window.runeCreditManager) {
            const modifier = runeCreditManager.getQuantityModifier(this.id, itemId);
            count = Math.round(count * modifier);
            count = Math.max(5, count); // Minimum of 5
        }
        
        return count;
    }
    
    // ==================== UI DISPLAY METHODS ====================
    
    // Get all possible tasks for UI display (not for generation)
    getAllPossibleTasksForUI() {
        const tasks = [];
        const items = loadingManager.getData('items');
        
        // All possible fish with their base counts
        const fishData = [
            { id: 'raw_shrimps', name: 'Raw shrimps', min: 50, max: 150, level: 1 },
            { id: 'raw_anchovies', name: 'Raw anchovies', min: 50, max: 125, level: 1 },
            { id: 'raw_sardine', name: 'Raw sardine', min: 50, max: 125, level: 5 },
            { id: 'raw_herring', name: 'Raw herring', min: 40, max: 100, level: 10 },
            { id: 'raw_mackerel', name: 'Raw mackerel', min: 40, max: 90, level: 16 },
            { id: 'raw_trout', name: 'Raw trout', min: 35, max: 80, level: 20 },
            { id: 'raw_cod', name: 'Raw cod', min: 35, max: 75, level: 23 },
            { id: 'raw_pike', name: 'Raw pike', min: 30, max: 70, level: 25 },
            { id: 'raw_salmon', name: 'Raw salmon', min: 30, max: 60, level: 30 },
            { id: 'raw_tuna', name: 'Raw tuna', min: 25, max: 50, level: 35 },
            { id: 'raw_lobster', name: 'Raw lobster', min: 20, max: 40, level: 40 },
            { id: 'raw_bass', name: 'Raw bass', min: 20, max: 35, level: 46 },
            { id: 'raw_swordfish', name: 'Raw swordfish', min: 15, max: 30, level: 50 },
            { id: 'raw_shark', name: 'Raw shark', min: 10, max: 20, level: 76 }
        ];
        
        for (const fish of fishData) {
            // Check if item exists in items data
            if (items[fish.id]) {
                tasks.push({
                    itemId: fish.id,
                    displayName: items[fish.id].name || fish.name,
                    minCount: fish.min,
                    maxCount: fish.max,
                    requiredLevel: fish.level
                });
            } else {
                // Use fallback data if item not in items.json
                tasks.push({
                    itemId: fish.id,
                    displayName: fish.name,
                    minCount: fish.min,
                    maxCount: fish.max,
                    requiredLevel: fish.level
                });
            }
        }
        
        return tasks;
    }
    
    // Get base task counts without modifiers (for UI)
    getBaseTaskCounts(itemId) {
        const fishCounts = {
            'raw_shrimps': { min: 50, max: 150 },
            'raw_anchovies': { min: 50, max: 125 },
            'raw_sardine': { min: 50, max: 125 },
            'raw_herring': { min: 40, max: 100 },
            'raw_mackerel': { min: 40, max: 90 },
            'raw_trout': { min: 35, max: 80 },
            'raw_cod': { min: 35, max: 75 },
            'raw_pike': { min: 30, max: 70 },
            'raw_salmon': { min: 30, max: 60 },
            'raw_tuna': { min: 25, max: 50 },
            'raw_lobster': { min: 20, max: 40 },
            'raw_bass': { min: 20, max: 35 },
            'raw_swordfish': { min: 15, max: 30 },
            'raw_shark': { min: 10, max: 20 }
        };
        
        return fishCounts[itemId] || { min: 20, max: 50 };
    }
    
    // ==================== BANKING LOGIC ====================
    
    // Check if we need banking for a fishing task
    needsBankingForTask(task) {
        if (!task || task.skill !== 'fishing') return false;
        
        // First check if inventory is full
        if (inventory.isFull()) {
            return true;
        }
        
        // Then check if the activity requires bait/feathers
        const activityData = loadingManager.getData('activities')[task.activityId];
        if (!activityData) return false;
        
        if (activityData.consumeOnSuccess) {
            for (const required of activityData.consumeOnSuccess) {
                if (!inventory.hasItem(required.itemId, 1)) {
                    // We need bait/feathers and don't have any
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Handle banking for fishing (withdraw bait/feathers)
    handleBanking(task) {
        // Deposit all first
        const deposited = bank.depositAll();
        console.log(`Deposited ${deposited} items`);
        
        // Check if we need to withdraw bait/feathers
        if (task && task.activityId) {
            const activityData = loadingManager.getData('activities')[task.activityId];
            
            if (activityData && activityData.consumeOnSuccess) {
                for (const required of activityData.consumeOnSuccess) {
                    const itemData = loadingManager.getData('items')[required.itemId];
                    const bankCount = bank.getItemCount(required.itemId);
                    
                    if (bankCount === 0) {  // THIS CHECK IS IMPORTANT
                        console.log(`No ${itemData.name} in bank for fishing`);
                        return false; // MUST RETURN FALSE HERE - Task is impossible
                    }
                    
                    // Withdraw stackable items (all of them) or up to 14 non-stackable
                    const withdrawAmount = itemData.stackable ? bankCount : Math.min(14, bankCount);
                    const withdrawn = bank.withdrawUpTo(required.itemId, withdrawAmount);
                    
                    if (withdrawn > 0) {
                        inventory.addItem(required.itemId, withdrawn);
                        console.log(`Withdrew ${withdrawn} ${itemData.name} for fishing`);
                    } else {
                        // Failed to withdraw even though bank said it had some
                        console.log(`Failed to withdraw ${itemData.name} for fishing`);
                        return false; // RETURN FALSE ON WITHDRAWAL FAILURE - Task is impossible
                    }
                }
            }
        }
        
        return true; // Success - we have everything we need
    }
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        let duration = baseDuration;
        
        // First handle existing duration boosts (pike has 20% chance of 3600ms boost)
        if (activityData.durationBoost && Math.random() < activityData.durationBoost.chance) {
            duration = activityData.durationBoost.duration;
        }
        
        // Then apply RuneCred speed bonus on top
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus); // Speed bonus reduces duration
        }
        
        return duration;
    }
    
    processRewards(activityData, level) {
        if (!activityData.rewards) return [];
        
        // Build weighted list of possible catches
        const catches = activityData.rewards
            .filter(r => !r.requiredLevel || level >= r.requiredLevel)
            .map(reward => ({
                itemId: reward.itemId,
                quantity: reward.quantity || 1,
                chance: this.getChance(reward, level),
                xp: reward.xpPerAction || 0
            }));
        
        // Single roll for all fish
        const roll = Math.random();
        let cumulative = 0;
        
        for (const fish of catches) {
            cumulative += fish.chance;
            if (roll < cumulative) {
                this.lastCatchXp = fish.xp;
                return [{ itemId: fish.itemId, quantity: fish.quantity }];
            }
        }
        
        this.lastCatchXp = 0;
        return [];
    }
    
    shouldGrantXP(rewards, activityData) {
        return rewards.length > 0; // Only grant XP if fish caught
    }
    
    getXpToGrant(rewards, activityData) {
        return this.lastCatchXp || 0;
    }
    
    canPerformActivity(activityId) {
        const activityData = loadingManager.getData('activities')[activityId];
        if (!activityData || activityData.skill !== this.id) return false;
        
        const requiredLevel = activityData.requiredLevel || 1;
        const currentLevel = skills.getLevel(this.id);
        
        if (currentLevel < requiredLevel) return false;
        
        // Check for required items (bait/feathers) in bank or inventory
        if (activityData.consumeOnSuccess) {
            for (const required of activityData.consumeOnSuccess) {
                const hasInInventory = inventory.hasItem(required.itemId, 1);
                const hasInBank = bank.getItemCount(required.itemId) > 0;
                if (!hasInInventory && !hasInBank) {
                    return false;
                }
            }
        }
        
        return true;
    }
}
