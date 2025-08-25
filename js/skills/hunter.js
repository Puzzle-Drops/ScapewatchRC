class HunterSkill extends BaseSkill {
    constructor() {
        super('hunter', 'Hunter');
        // requiresBankingBeforeTask = false (inherited from BaseSkill)
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    initializeSkillData() {
        this.SKILL_DATA = [
            { itemId: 'hunter_birds',        name: 'Birds',        minCount: 20, maxCount: 40, level: 1  },
            { itemId: 'hunter_butterflies',  name: 'Butterflies',  minCount: 20, maxCount: 40, level: 25 },
            { itemId: 'hunter_kebbits',      name: 'Kebbits',      minCount: 20, maxCount: 40, level: 45 },
            { itemId: 'chinchompa',          name: 'Chinchompas',  minCount: 20, maxCount: 40, level: 63 },
            { itemId: 'hunter_moths',        name: 'Moths',        minCount: 20, maxCount: 40, level: 75 },
            { itemId: 'hunter_salamanders',  name: 'Salamanders',  minCount: 20, maxCount: 40, level: 79 },
            { itemId: 'hunter_herbiboars',   name: 'Herbiboars',   minCount: 5, maxCount: 10, level: 82 },
            { itemId: 'hunter_birdhouse',    name: 'Birdhouses',   minCount: 2, maxCount: 4, level: 90 }
        ];
    }
    
    // ==================== TASK GENERATION ====================
    
    getTaskVerb() {
        return 'Hunt';
    }
    
    generateTask() {
        // Get all possible hunting activities at current level
        const possibleActivities = this.getPossibleHuntingActivities();
        if (possibleActivities.length === 0) {
            console.log('No hunting activities available at current level');
            return null;
        }
        
        // Select an activity using weighted distribution
        const selectedActivity = this.selectWeightedActivity(possibleActivities);
        if (!selectedActivity) {
            console.log('Failed to select hunting activity');
            return null;
        }
        
        // Find viable nodes for this activity
        const viableNodes = this.findViableNodesForActivity(selectedActivity.activityId);
        if (viableNodes.length === 0) {
            console.log(`No viable nodes found for ${selectedActivity.activityId}`);
            return null;
        }
        
        // Select a node using weighted distribution
        const selected = this.selectWeightedNode(viableNodes);
        
        // Determine target count based on activity type
        const targetCount = this.determineHuntingTargetCount(selectedActivity.activityId);
        
        // Get activity data for the name
        const activityData = loadingManager.getData('activities')[selectedActivity.activityId];
        const nodeData = nodes.getNode(selected.nodeId);
        
        // Determine what we're hunting for the description
        const targetName = this.getHuntingTargetName(selectedActivity.activityId);
        
        return {
            skill: this.id,
            itemId: this.getTaskItemId(selectedActivity.activityId), // Virtual item for tracking
            targetCount: targetCount,
            nodeId: selected.nodeId,
            activityId: selectedActivity.activityId,
            description: `${this.getTaskVerb()} ${targetCount} ${targetName} at ${nodeData.name}`,
            startingCount: 0,
            progress: 0,
            isHuntingTask: true,
            successfulCatches: 0
        };
    }
    
    getPossibleHuntingActivities() {
        const activities = [];
        const activitiesData = loadingManager.getData('activities');
        const currentLevel = skills.getLevel('hunter');
        
        for (const [activityId, activity] of Object.entries(activitiesData)) {
            if (activity.skill !== 'hunter') continue;
            
            const requiredLevel = activity.requiredLevel || 1;
            if (currentLevel < requiredLevel) continue;
            
            activities.push({
                activityId: activityId,
                requiredLevel: requiredLevel
            });
        }
        
        return activities;
    }
    
    selectWeightedActivity(activities) {
        if (activities.length === 0) return null;
        
        // Use RuneCred weights if available
        if (window.runeCreditManager) {
            const weightedActivities = [];
            let totalWeight = 0;
            
            for (const activity of activities) {
                const itemId = this.getTaskItemId(activity.activityId);
                const weight = runeCreditManager.getTaskWeight(this.id, itemId);
                totalWeight += weight;
                weightedActivities.push({ activity, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedActivities) {
                if (random < weighted.weight) {
                    return weighted.activity;
                }
            }
            
            return activities[0]; // Fallback
        }
        
        // DEFAULT: Equal weights if RuneCred not available
        return activities[Math.floor(Math.random() * activities.length)];
    }
    
    findViableNodesForActivity(activityId) {
        const viableNodes = [];
        const allNodes = nodes.getAllNodes();
        
        for (const [nodeId, node] of Object.entries(allNodes)) {
            if (!node.activities) continue;
            
            // Check if node has this hunting activity
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
    
    getTaskItemId(activityId) {
        // Map activity to the primary reward item for task tracking
        const mapping = {
            'hunt_birds': 'hunter_birds',
            'hunt_butterflies': 'hunter_butterflies',
            'hunt_kebbits': 'hunter_kebbits',
            'hunt_chinchompas': 'chinchompa',
            'hunt_moths': 'hunter_moths',
            'hunt_salamanders': 'hunter_salamanders',
            'hunt_herbiboars': 'hunter_herbiboars',
            'hunt_birdhouse': 'hunter_birdhouse'
        };
        return mapping[activityId] || activityId;
    }
    
    getHuntingTargetName(activityId) {
        const names = {
            'hunt_birds': 'birds',
            'hunt_butterflies': 'butterflies',
            'hunt_kebbits': 'kebbits',
            'hunt_chinchompas': 'chinchompas',
            'hunt_moths': 'moths',
            'hunt_salamanders': 'salamanders',
            'hunt_herbiboars': 'herbiboars',
            'hunt_birdhouse': 'birdhouses'
        };
        return names[activityId] || 'creatures';
    }
    
    determineHuntingTargetCount(activityId) {
        const itemId = this.getTaskItemId(activityId);
        return this.determineTargetCount(itemId); // Use base class method with SKILL_DATA
    }
    
    // Update task progress when successful catch
    updateHuntingTaskProgress() {
        if (!window.taskManager) return;
        
        const currentTask = taskManager.getFirstIncompleteTask();
        
        if (currentTask && currentTask.isHuntingTask) {
            currentTask.successfulCatches = (currentTask.successfulCatches || 0) + 1;
            const progress = currentTask.successfulCatches / currentTask.targetCount;
            
            console.log(`Hunting progress: ${currentTask.successfulCatches}/${currentTask.targetCount} catches`);
            
            taskManager.setTaskProgress(currentTask, progress);
        }
    }
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        let duration = baseDuration;
        
        // Apply linear scaling if durationScaling is defined
        if (activityData.durationScaling) {
            const scaling = activityData.durationScaling;
            const clampedLevel = Math.max(scaling.minLevel, Math.min(level, scaling.maxLevel));
            const progress = (clampedLevel - scaling.minLevel) / (scaling.maxLevel - scaling.minLevel);
            
            // Linear interpolation from max duration (at min level) to min duration (at max level)
            duration = scaling.maxDuration - (scaling.maxDuration - scaling.minDuration) * progress;
        }
        
        // Apply speed bonus from RuneCred system
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus);
        }
        
        return duration;
    }
    
    processRewards(activityData, level) {
        // Calculate success chance
        const successChance = this.getSuccessChance(activityData, level);
        
        // Check if the catch was successful
        if (Math.random() > successChance) {
            console.log('Failed to catch creature');
            return []; // No rewards on failure
        }
        
        console.log('Successfully caught creature!');
        
        // Update task progress on success
        this.updateHuntingTaskProgress();
        
        // Process the actual rewards
        const rewards = [];
        
        // Handle specific reward patterns for each activity
        if (activityData.id === 'hunt_birds') {
            // 75% feathers, 25% fishing bait
            if (Math.random() < 0.75) {
                const quantity = 5 + Math.floor(Math.random() * 6); // 5-10
                rewards.push({ itemId: 'feather', quantity: quantity });
            } else {
                const quantity = 5 + Math.floor(Math.random() * 6); // 5-10
                rewards.push({ itemId: 'fishing_bait', quantity: quantity });
            }
            // Check for seed chance
            if (activityData.seedTableChance && Math.random() < activityData.seedTableChance) {
                const seed = sharedDropTables.rollMasterFarmerSeeds();
                if (seed) rewards.push(seed);
            }
        } else if (activityData.id === 'hunt_butterflies' || activityData.id === 'hunt_moths') {
            // Rune essence notes
            const minQty = activityData.id === 'hunt_butterflies' ? 5 : 10;
            const maxQty = activityData.id === 'hunt_butterflies' ? 10 : 30;
            const quantity = minQty + Math.floor(Math.random() * (maxQty - minQty + 1));
            rewards.push({ itemId: 'rune_essence_note', quantity: quantity });
        } else if (activityData.id === 'hunt_kebbits') {
            // 50% potato seed, 50% roll seed table
            if (Math.random() < 0.5) {
                rewards.push({ itemId: 'potato_seed', quantity: 1 });
            } else {
                const seed = sharedDropTables.rollMasterFarmerSeeds();
                if (seed) rewards.push(seed);
            }
        } else if (activityData.id === 'hunt_chinchompas') {
            rewards.push({ itemId: 'chinchompa', quantity: 1 });
        } else if (activityData.id === 'hunt_salamanders') {
            rewards.push({ itemId: 'coal', quantity: 1 });
        } else if (activityData.id === 'hunt_herbiboars') {
            // Roll seed table 15 times
            for (let i = 0; i < 15; i++) {
                const seed = sharedDropTables.rollMasterFarmerSeeds();
                if (seed) {
                    // Combine quantities if we already have this seed
                    const existing = rewards.find(r => r.itemId === seed.itemId);
                    if (existing) {
                        existing.quantity += seed.quantity;
                    } else {
                        rewards.push(seed);
                    }
                }
            }
        } else if (activityData.id === 'hunt_birdhouse') {
            // Roll seed table 25 times
            for (let i = 0; i < 25; i++) {
                const seed = sharedDropTables.rollMasterFarmerSeeds();
                if (seed) {
                    // Combine quantities if we already have this seed
                    const existing = rewards.find(r => r.itemId === seed.itemId);
                    if (existing) {
                        existing.quantity += seed.quantity;
                    } else {
                        rewards.push(seed);
                    }
                }
            }
        }
        
        return rewards;
    }
    
    getSuccessChance(activityData, level) {
        // Always success for herbiboars and birdhouse
        if (activityData.id === 'hunt_herbiboars' || activityData.id === 'hunt_birdhouse') {
            return 1.0;
        }
        
        // Use success chance scaling if defined
        if (activityData.successChanceScaling) {
            const scaling = activityData.successChanceScaling;
            const clampedLevel = Math.max(scaling.minLevel, Math.min(level, scaling.maxLevel));
            const progress = (clampedLevel - scaling.minLevel) / (scaling.maxLevel - scaling.minLevel);
            
            // Linear interpolation
            return scaling.minChance + (scaling.maxChance - scaling.minChance) * progress;
        }
        
        return 0.5; // Default 50% chance if not specified
    }
    
    shouldGrantXP(rewards, activityData) {
        // Only grant XP on successful catch (when we have rewards)
        return rewards.length > 0;
    }
    
    getXpToGrant(rewards, activityData) {
        return rewards.length > 0 ? (activityData.xpPerAction || 0) : 0;
    }
    
    beforeActivityStart(activityData) {
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
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        // Bank if inventory is full
        return inventory.isFull();
    }
    
    handleBanking(task) {
        // Simple banking - deposit all
        const deposited = bank.depositAll();
        console.log(`Deposited ${deposited} items before hunting`);
        return true;
    }
    
    // ==================== UI DISPLAY ====================
    
    getAllPossibleTasksForUI() {
        const tasks = [];
        const activities = loadingManager.getData('activities');
        
        for (const data of this.SKILL_DATA) {
            // Map virtual items to display names
            let displayName;
            if (data.itemId === 'chinchompa') {
                displayName = 'Chinchompas';
            } else if (data.itemId.startsWith('hunter_')) {
                displayName = data.name;
            } else {
                displayName = data.name;
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
}
