class WoodcuttingSkill extends BaseSkill {
    constructor() {
        super('woodcutting', 'Woodcutting');
        // requiresBankingBeforeTask = false (inherited from BaseSkill)
    }
    
    // ==================== TASK GENERATION OVERRIDES ====================
    
    getTaskVerb() {
        return 'Chop';
    }
    
    determineTargetCount(itemId) {
        const logCounts = {
            'logs': { min: 50, max: 150 },
            'oak_logs': { min: 40, max: 120 },
            'willow_logs': { min: 40, max: 100 },
            'teak_logs': { min: 25, max: 75 },
            'maple_logs': { min: 25, max: 60 },
            'mahogany_logs': { min: 25, max: 60 },
            'yew_logs': { min: 15, max: 40 },
            'magic_logs': { min: 10, max: 25 },
            'redwood_logs': { min: 10, max: 25 }
        };
        
        const counts = logCounts[itemId] || { min: 20, max: 50 };
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
        
        // All possible logs with their base counts
        const logData = [
            { id: 'logs', name: 'Logs', min: 50, max: 150, level: 1 },
            { id: 'oak_logs', name: 'Oak logs', min: 40, max: 120, level: 15 },
            { id: 'willow_logs', name: 'Willow logs', min: 40, max: 100, level: 30 },
            { id: 'teak_logs', name: 'Teak logs', min: 25, max: 75, level: 35 },
            { id: 'maple_logs', name: 'Maple logs', min: 25, max: 60, level: 45 },
            { id: 'mahogany_logs', name: 'Mahogany logs', min: 25, max: 60, level: 50 },
            { id: 'yew_logs', name: 'Yew logs', min: 15, max: 40, level: 60 },
            { id: 'magic_logs', name: 'Magic logs', min: 10, max: 25, level: 75 },
            { id: 'redwood_logs', name: 'Redwood logs', min: 10, max: 25, level: 90 }
        ];
        
        for (const log of logData) {
            // Check if item exists in items data
            if (items[log.id]) {
                tasks.push({
                    itemId: log.id,
                    displayName: items[log.id].name || log.name,
                    minCount: log.min,
                    maxCount: log.max,
                    requiredLevel: log.level
                });
            } else {
                // Use fallback data if item not in items.json
                tasks.push({
                    itemId: log.id,
                    displayName: log.name,
                    minCount: log.min,
                    maxCount: log.max,
                    requiredLevel: log.level
                });
            }
        }
        
        return tasks;
    }
    
    // Get base task counts without modifiers (for UI)
    getBaseTaskCounts(itemId) {
        const logCounts = {
            'logs': { min: 50, max: 150 },
            'oak_logs': { min: 40, max: 120 },
            'willow_logs': { min: 40, max: 100 },
            'teak_logs': { min: 25, max: 75 },
            'maple_logs': { min: 25, max: 60 },
            'mahogany_logs': { min: 25, max: 60 },
            'yew_logs': { min: 15, max: 40 },
            'magic_logs': { min: 10, max: 25 },
            'redwood_logs': { min: 10, max: 25 }
        };
        
        return logCounts[itemId] || { min: 20, max: 50 };
    }
    
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
