class CombatSkill extends BaseSkill {
    constructor(id, name) {
        super(id, name);
        this.requiresBankingBeforeTask = true; // Combat always needs pre-banking for food
    }
    
    // ==================== TASK GENERATION ====================
    
    getTaskVerb() {
        return 'Kill';
    }
    
    generateTask() {
        // Get all available monsters for this combat skill at current level
        const availableMonsters = this.getAvailableMonsters();
        if (availableMonsters.length === 0) {
            console.log(`No monsters available for ${this.name} at current level`);
            return null;
        }
        
        // Select a monster using weighted distribution
        const selectedMonster = this.selectWeightedMonster(availableMonsters);
        if (!selectedMonster) {
            console.log(`Failed to select monster for ${this.name}`);
            return null;
        }
        
        // Find viable nodes for this monster
        const viableNodes = this.findViableNodesForMonster(selectedMonster.activityId);
        if (viableNodes.length === 0) {
            console.log(`No viable nodes found for monster ${selectedMonster.monsterName}`);
            return null;
        }
        
        // Select a node using weighted distribution
        const selectedNode = this.selectWeightedNode(viableNodes);
        
        // Determine kill count (base 10-30 modified by RuneCred)
        const killCount = this.determineKillCount(selectedMonster.monsterName);
        
        // Get node data for description
        const nodeData = nodes.getNode(selectedNode.nodeId);
        
        // Determine combat style based on skill
let combatStyle = 'melee';
let styleText = 'Melee';
if (this.id === 'magic') {
    combatStyle = 'magic';
    styleText = 'Magic';
} else if (this.id === 'ranged') {
    combatStyle = 'ranged';
    styleText = 'Ranged';
}
// attack, strength, defence all use melee

return {
    skill: this.id,
    monsterName: selectedMonster.monsterName,
    targetCount: killCount,
    nodeId: selectedNode.nodeId,
    activityId: selectedNode.activityId,
    combatStyle: combatStyle,
    killsCompleted: 0,
    isCombatTask: true,
    description: `Kill ${killCount} ${selectedMonster.monsterName}s with ${styleText} at ${nodeData.name}`,
    startingCount: 0,
    progress: 0
};
    }
    
    getAvailableMonsters() {
        const monsters = [];
        const activities = loadingManager.getData('activities');
        const currentLevel = skills.getLevel(this.id);
        
        // Also need to check slayer level for some monsters
        const slayerLevel = skills.getLevel('slayer');
        
        // Track unique monsters (since each has 3 activity variants)
        const uniqueMonsters = new Map();
        
        for (const [activityId, activity] of Object.entries(activities)) {
            // Only look at activities for this specific skill
            if (activity.skill !== this.id) continue;
            
            // Must be a monster activity (has monsterName)
            if (!activity.monsterName) continue;
            
            // Check level requirements
            const requiredLevel = activity.requiredLevel || 1;
            if (currentLevel < requiredLevel) continue;
            
            const requiredSlayerLevel = activity.requiredSlayerLevel || 1;
            if (slayerLevel < requiredSlayerLevel) continue;
            
            // Add to unique monsters map
            if (!uniqueMonsters.has(activity.monsterName)) {
                uniqueMonsters.set(activity.monsterName, {
                    monsterName: activity.monsterName,
                    activityId: activityId,
                    requiredLevel: requiredLevel,
                    requiredSlayerLevel: requiredSlayerLevel,
                    hitpoints: activity.hitpoints
                });
            }
        }
        
        return Array.from(uniqueMonsters.values());
    }
    
    selectWeightedMonster(monsters) {
        if (monsters.length === 0) return null;
        
        // Use RuneCred weights if available
        if (window.runeCreditManager) {
            const weightedMonsters = [];
            let totalWeight = 0;
            
            for (const monster of monsters) {
                // Use monster name as the "item" for weight lookup
                const weight = runeCreditManager.getTaskWeight(this.id, monster.monsterName);
                totalWeight += weight;
                weightedMonsters.push({ monster, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedMonsters) {
                if (random < weighted.weight) {
                    return weighted.monster;
                }
            }
            
            return monsters[0]; // Fallback
        }
        
        // Default: equal weights
        return monsters[Math.floor(Math.random() * monsters.length)];
    }
    
    findViableNodesForMonster(activityId) {
        const viableNodes = [];
        const allNodes = nodes.getAllNodes();
        
        for (const [nodeId, node] of Object.entries(allNodes)) {
            if (!node.activities) continue;
            
            // Check if node has this activity
            if (node.activities.includes(activityId)) {
                viableNodes.push({
                    nodeId: nodeId,
                    activityId: activityId
                });
            }
        }
        
        return viableNodes;
    }
    
    determineKillCount(monsterName) {
        let minCount = 10;
        let maxCount = 30;
        
        // Apply RuneCred quantity modifier
        if (window.runeCreditManager) {
            const modifier = runeCreditManager.getQuantityModifier(this.id, monsterName);
            minCount = Math.round(minCount * modifier);
            maxCount = Math.round(maxCount * modifier);
        }
        
        // Clamp and ensure valid range
        minCount = Math.max(1, minCount);
        maxCount = Math.max(minCount, maxCount);
        
        // Random between min and max
        const range = maxCount - minCount;
        const count = minCount + Math.round(Math.random() * range);
        
        return count;
    }
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        // Combat only needs initial banking to deposit items and update equipment
        // We don't need to withdraw food since we eat directly from bank
        // The AI tracks if we've already banked for this task
        return false;  // Let AI's hasBankedForCurrentTask flag handle this
    }
    
    handleBanking(task) {
        // Deposit all items first
        const deposited = bank.depositAll();
        console.log(`Deposited ${deposited} items before combat`);
        
        // Equipment is auto-updated by depositAll() now
        
        // Check if we have any food in bank (but don't withdraw it)
        const foodCount = this.countFoodInBank();
        if (foodCount === 0) {
            console.log('Warning: No food in bank for combat!');
            // Could still continue without food, player might die though
        } else {
            console.log(`${foodCount} food available in bank for combat`);
        }
        
        // Combat eats directly from bank, so we don't withdraw anything
        return true;
    }

    countFoodInBank() {
        // Count total food items in bank
        let totalFood = 0;
        const items = loadingManager.getData('items');
        
        for (const [itemId, quantity] of Object.entries(bank.items)) {
            const itemData = items[itemId];
            if (itemData && itemData.category === 'food' && itemData.healAmount) {
                totalFood += quantity;
            }
        }
        
        return totalFood;
    }
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        // Combat has fixed 2.4 second rounds
        let duration = 2400; // 2.4 seconds in milliseconds
        
        // Apply speed bonus from RuneCred system
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus);
        }
        
        return duration;
    }
    
    processRewards(activityData, level) {
        // Combat rewards are handled by CombatManager after kills
        // This shouldn't be called directly
        return [];
    }
    
    shouldGrantXP(rewards, activityData) {
        // XP is granted per damage in combat, not per action
        return false;
    }
    
    canPerformActivity(activityId) {
        const activityData = loadingManager.getData('activities')[activityId];
        if (!activityData) return false;
        
        const requiredLevel = activityData.requiredLevel || 1;
        const currentLevel = skills.getLevel(this.id);
        
        // Check slayer requirement too
        const requiredSlayerLevel = activityData.requiredSlayerLevel || 1;
        const slayerLevel = skills.getLevel('slayer');
        
        return currentLevel >= requiredLevel && slayerLevel >= requiredSlayerLevel;
    }
    
    // ==================== UI DISPLAY METHODS ====================
    
    getAllPossibleTasksForUI() {
        const tasks = [];
        const activities = loadingManager.getData('activities');
        
        // Track unique monsters (since each has 3 activity variants for attack/str/def)
        const uniqueMonsters = new Map();
        
        for (const [activityId, activity] of Object.entries(activities)) {
            // Only look at activities for this specific skill
            if (activity.skill !== this.id) continue;
            
            // Must be a monster activity (has monsterName)
            if (!activity.monsterName) continue;
            
            // Add to unique monsters map if not already there
            if (!uniqueMonsters.has(activity.monsterName)) {
                uniqueMonsters.set(activity.monsterName, {
                    monsterName: activity.monsterName,
                    requiredLevel: activity.requiredLevel || 1,
                    requiredSlayerLevel: activity.requiredSlayerLevel || 1
                });
            }
        }
        
        // Convert to task format for UI
        for (const [monsterName, monsterData] of uniqueMonsters) {
            tasks.push({
                itemId: monsterName,  // Use monster name as "itemId" for consistency
                displayName: monsterName.charAt(0).toUpperCase() + monsterName.slice(1) + 's',
                minCount: 10,  // Base kill counts
                maxCount: 30,
                requiredLevel: monsterData.requiredLevel
            });
        }
        
        // Sort by level requirement
        tasks.sort((a, b) => a.requiredLevel - b.requiredLevel);
        
        return tasks;
    }
    
    getBaseTaskCounts(monsterName) {
        // Combat tasks always have 10-30 base kills
        return { min: 10, max: 30 };
    }
}

// Make CombatSkill available globally
window.CombatSkill = CombatSkill;
