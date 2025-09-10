class FishingSkill extends BaseSkill {
    constructor() {
        super('fishing', 'Fishing');
        // requiresBankingBeforeTask = false (inherited from BaseSkill)
        this.lastCatchXp = 0;
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    // Single source of truth for all fishing data
    initializeSkillData() {
        this.SKILL_DATA = [
            { itemId: 'raw_shrimps',   name: 'Raw shrimps',   minCount: 50, maxCount: 100, level: 1 },
            { itemId: 'raw_sardine',   name: 'Raw sardine',   minCount: 50, maxCount: 100, level: 5 },
            { itemId: 'raw_herring',   name: 'Raw herring',   minCount: 50, maxCount: 100, level: 10 },
            { itemId: 'raw_anchovies', name: 'Raw anchovies', minCount: 50, maxCount: 100, level: 15 },
            { itemId: 'raw_mackerel',  name: 'Raw mackerel',  minCount: 50, maxCount: 100,  level: 16 },
            { itemId: 'raw_trout',     name: 'Raw trout',     minCount: 50, maxCount: 100,  level: 20 },
            { itemId: 'raw_cod',       name: 'Raw cod',       minCount: 50, maxCount: 100,  level: 23 },
            { itemId: 'raw_pike',      name: 'Raw pike',      minCount: 50, maxCount: 100,  level: 25 },
            { itemId: 'raw_salmon',    name: 'Raw salmon',    minCount: 50, maxCount: 100,  level: 30 },
            { itemId: 'raw_tuna',      name: 'Raw tuna',      minCount: 50, maxCount: 100,  level: 35 },
            { itemId: 'raw_lobster',   name: 'Raw lobster',   minCount: 50, maxCount: 100,  level: 40 },
            { itemId: 'raw_bass',      name: 'Raw bass',      minCount: 50, maxCount: 100,  level: 46 },
            { itemId: 'raw_swordfish', name: 'Raw swordfish', minCount: 50, maxCount: 100,  level: 50 },
            { itemId: 'raw_shark',     name: 'Raw shark',     minCount: 50, maxCount: 100,  level: 76 }
        ];
    }
    
    // ==================== TASK GENERATION OVERRIDES ====================
    
    getTaskVerb() {
        return 'Catch';
    }
    
    // determineTargetCount now uses base class implementation
    // getAllPossibleTasksForUI now uses base class implementation  
    // getBaseTaskCounts now uses base class implementation
    
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

// Make FishingSkill available globally
window.FishingSkill = FishingSkill;
