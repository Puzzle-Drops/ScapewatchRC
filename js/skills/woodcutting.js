class WoodcuttingSkill extends BaseSkill {
    constructor() {
        super('woodcutting', 'Woodcutting');
        // requiresBankingBeforeTask = false (inherited from BaseSkill)
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    // Single source of truth for all woodcutting item data
    initializeSkillData() {
        this.SKILL_DATA = [
            { itemId: 'logs',         name: 'Logs',         minCount: 50, maxCount: 100, level: 1  },
            { itemId: 'oak_logs',     name: 'Oak logs',     minCount: 50, maxCount: 100, level: 15 },
            { itemId: 'willow_logs',  name: 'Willow logs',  minCount: 50, maxCount: 100, level: 30 },
            { itemId: 'teak_logs',    name: 'Teak logs',    minCount: 50, maxCount: 100,  level: 35 },
            { itemId: 'maple_logs',   name: 'Maple logs',   minCount: 50, maxCount: 100,  level: 45 },
            { itemId: 'mahogany_logs', name: 'Mahogany logs', minCount: 50, maxCount: 100,  level: 50 },
            { itemId: 'yew_logs',     name: 'Yew logs',     minCount: 50, maxCount: 100,  level: 60 },
            { itemId: 'magic_logs',   name: 'Magic logs',   minCount: 50, maxCount: 100,  level: 75 },
            { itemId: 'redwood_logs', name: 'Redwood logs', minCount: 50, maxCount: 100,  level: 90 }
        ];
    }
    
    // ==================== TASK GENERATION OVERRIDES ====================
    
    getTaskVerb() {
        return 'Chop';
    }
    
    // determineTargetCount() now uses the base class implementation
    // which automatically uses our SKILL_DATA
    
    // getAllPossibleTasksForUI() now uses the base class implementation
    // which automatically uses our SKILL_DATA
    
    // getBaseTaskCounts() now uses the base class implementation
    // which automatically uses our SKILL_DATA
    
    // ==================== CORE BEHAVIOR ====================
    
    // Woodcutting has no duration scaling beyond the base speed bonus
    getDuration(baseDuration, level, activityData) {
        let duration = baseDuration;
        
        // Apply speed bonus from RuneCred system
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus); // Speed bonus reduces duration
        }
        
        return duration;
    }
    
    // Standard reward processing
    processRewards(activityData, level) {
        return this.standardRewards(activityData, level);
    }
    
    // Only grant XP if logs were obtained
    shouldGrantXP(rewards, activityData) {
        return rewards.length > 0;
    }
    
    getXpToGrant(rewards, activityData) {
        return rewards.length > 0 ? (activityData.xpPerAction || 0) : 0;
    }
}

// Make WoodcuttingSkill available globally
window.WoodcuttingSkill = WoodcuttingSkill;

