class MiningSkill extends BaseSkill {
    constructor() {
        super('mining', 'Mining');
        // requiresBankingBeforeTask = false (inherited from BaseSkill)
        this.alternatingStates = {};
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    // Single source of truth for all mining data
    initializeSkillData() {
        this.SKILL_DATA = [
            { itemId: 'copper_ore',     name: 'Copper ore',     minCount: 25, maxCount: 50, level: 1  },
            { itemId: 'tin_ore',        name: 'Tin ore',        minCount: 25, maxCount: 50, level: 1  },
            { itemId: 'iron_ore',       name: 'Iron ore',       minCount: 50, maxCount: 100, level: 15 },
            { itemId: 'silver_ore',     name: 'Silver ore',     minCount: 50, maxCount: 100,  level: 20 },
            { itemId: 'coal',           name: 'Coal',           minCount: 50, maxCount: 100, level: 30 },
            { itemId: 'gold_ore',       name: 'Gold ore',       minCount: 50, maxCount: 100,  level: 40 },
            { itemId: 'mithril_ore',    name: 'Mithril ore',    minCount: 50, maxCount: 100,  level: 55 },
            { itemId: 'adamantite_ore', name: 'Adamantite ore', minCount: 50, maxCount: 100,  level: 70 },
            { itemId: 'runite_ore',     name: 'Runite ore',     minCount: 50, maxCount: 100,  level: 85 },
            { itemId: 'amethyst',       name: 'Amethyst',       minCount: 50, maxCount: 100,  level: 92 }
        ];
    }
    
    // ==================== TASK GENERATION OVERRIDES ====================
    
    getTaskVerb() {
        return 'Mine';
    }
    
    // determineTargetCount now uses base class implementation
    // getAllPossibleTasksForUI now uses base class implementation  
    // getBaseTaskCounts now uses base class implementation
    
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

// Make MiningSkill available globally
window.MiningSkill = MiningSkill;

