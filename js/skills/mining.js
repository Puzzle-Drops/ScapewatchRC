class MiningSkill extends BaseSkill {
    constructor() {
        super('mining', 'Mining');
        // requiresBankingBeforeTask = false (inherited from BaseSkill)
        this.alternatingStates = {};
    }
    
    // ==================== TASK GENERATION OVERRIDES ====================
    
    getTaskVerb() {
        return 'Mine';
    }
    
    determineTargetCount(itemId) {
        const oreCounts = {
            'copper_ore': { min: 50, max: 150 },
            'tin_ore': { min: 50, max: 150 },
            'iron_ore': { min: 40, max: 120 },
            'silver_ore': { min: 30, max: 80 },
            'coal': { min: 50, max: 100 },
            'gold_ore': { min: 25, max: 60 },
            'mithril_ore': { min: 20, max: 50 },
            'adamantite_ore': { min: 15, max: 35 },
            'runite_ore': { min: 10, max: 20 },
            'amethyst': { min: 10, max: 25 }
        };
        
        const counts = oreCounts[itemId] || { min: 20, max: 50 };
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
        
        // All possible ores with their base counts
        const oreData = [
            { id: 'copper_ore', name: 'Copper ore', min: 50, max: 150, level: 1 },
            { id: 'tin_ore', name: 'Tin ore', min: 50, max: 150, level: 1 },
            { id: 'iron_ore', name: 'Iron ore', min: 40, max: 120, level: 15 },
            { id: 'silver_ore', name: 'Silver ore', min: 30, max: 80, level: 20 },
            { id: 'coal', name: 'Coal', min: 50, max: 100, level: 30 },
            { id: 'gold_ore', name: 'Gold ore', min: 25, max: 60, level: 40 },
            { id: 'mithril_ore', name: 'Mithril ore', min: 20, max: 50, level: 55 },
            { id: 'adamantite_ore', name: 'Adamantite ore', min: 15, max: 35, level: 70 },
            { id: 'runite_ore', name: 'Runite ore', min: 10, max: 20, level: 85 },
            { id: 'amethyst', name: 'Amethyst', min: 10, max: 25, level: 92 }
        ];
        
        for (const ore of oreData) {
            // Check if item exists in items data
            if (items[ore.id]) {
                tasks.push({
                    itemId: ore.id,
                    displayName: items[ore.id].name || ore.name,
                    minCount: ore.min,
                    maxCount: ore.max,
                    requiredLevel: ore.level
                });
            } else {
                // Use fallback data if item not in items.json
                tasks.push({
                    itemId: ore.id,
                    displayName: ore.name,
                    minCount: ore.min,
                    maxCount: ore.max,
                    requiredLevel: ore.level
                });
            }
        }
        
        return tasks;
    }
    
    // Get base task counts without modifiers (for UI)
    getBaseTaskCounts(itemId) {
        const oreCounts = {
            'copper_ore': { min: 50, max: 150 },
            'tin_ore': { min: 50, max: 150 },
            'iron_ore': { min: 40, max: 120 },
            'silver_ore': { min: 30, max: 80 },
            'coal': { min: 50, max: 100 },
            'gold_ore': { min: 25, max: 60 },
            'mithril_ore': { min: 20, max: 50 },
            'adamantite_ore': { min: 15, max: 35 },
            'runite_ore': { min: 10, max: 20 },
            'amethyst': { min: 10, max: 25 }
        };
        
        return oreCounts[itemId] || { min: 20, max: 50 };
    }
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        let duration = baseDuration;
        
        // First apply existing duration scaling logic
        if (activityData.durationScaling?.breakpoints) {
            const breakpoint = activityData.durationScaling.breakpoints
                .filter(bp => level >= bp.level)
                .pop();
            
            if (breakpoint) {
                if (breakpoint.boostChance && breakpoint.boostDuration && Math.random() < breakpoint.boostChance) {
                    duration = breakpoint.boostDuration;
                } else {
                    duration = breakpoint.duration;
                }
            }
        }
        
        // Then apply RuneCred speed bonus on top
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus); // Speed bonus reduces duration
        }
        
        return duration;
    }
    
    processRewards(activityData, level) {
        const rewards = [];
        
        // Handle alternating rewards (copper & tin)
        if (activityData.alternatingRewards) {
            const stateKey = activityData.id;
            if (this.alternatingStates[stateKey] === undefined) {
                this.alternatingStates[stateKey] = 0;
            }
            
            const index = this.alternatingStates[stateKey];
            const reward = activityData.alternatingRewards[index];
            
            if (Math.random() <= this.getChance(reward, level)) {
                rewards.push({
                    itemId: reward.itemId,
                    quantity: reward.quantity || 1
                });
                // Move to next ore type
                this.alternatingStates[stateKey] = 
                    (index + 1) % activityData.alternatingRewards.length;
            }
            return rewards;
        }
        
        // Check for gems first
        if (activityData.gemTable) {
            for (const gem of activityData.gemTable) {
                if (Math.random() <= gem.chance) {
                    return [{ itemId: gem.itemId, quantity: 1 }];
                }
            }
        }
        
        // Standard ore rewards
        return this.standardRewards(activityData, level);
    }
    
    shouldGrantXP(rewards, activityData) {
        // Mining grants XP only if you get ore (not gems)
        if (rewards.length === 0) return false;
        
        const gemIds = activityData.gemTable ? 
            activityData.gemTable.map(gem => gem.itemId) : [];
        
        return rewards.some(r => !gemIds.includes(r.itemId));
    }
    
    getXpToGrant(rewards, activityData) {
        const gemIds = activityData.gemTable ? 
            activityData.gemTable.map(gem => gem.itemId) : [];
        
        const gotOre = rewards.some(r => !gemIds.includes(r.itemId));
        return gotOre ? (activityData.xpPerAction || 0) : 0;
    }
    
    shouldBankItem(itemId) {
        // Don't auto-bank gems (player might want to keep them for crafting)
        const gems = ['uncut_sapphire', 'uncut_emerald', 'uncut_ruby', 'uncut_diamond'];
        return !gems.includes(itemId);
    }
    
    // Save/restore alternating states
    saveState() {
        return { alternatingStates: this.alternatingStates };
    }
    
    loadState(state) {
        if (state.alternatingStates) {
            this.alternatingStates = state.alternatingStates;
        }
    }
}
