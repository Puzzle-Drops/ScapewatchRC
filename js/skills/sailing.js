class SailingSkill extends BaseSkill {
    constructor() {
        super('sailing', 'Sailing');
        this.lastWaterPosition = null;
        this.waterPixelsTraveled = 0;
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    // Single source of truth for all sailing barracuda trial data
    initializeSkillData() {
        this.SKILL_DATA = [
            { itemId: 'sailing_laps_calm_waters_trial',    name: 'Calm Waters trial',    minCount: 4, maxCount: 8, level: 1  },
            { itemId: 'sailing_laps_reef_runner_trial',    name: 'Reef Runner trial',    minCount: 4, maxCount: 8, level: 20 },
            { itemId: 'sailing_laps_storm_chaser_trial',   name: 'Storm Chaser trial',   minCount: 4, maxCount: 8, level: 30 },
            { itemId: 'sailing_laps_tempest_trial',        name: 'Tempest trial',        minCount: 4, maxCount: 8, level: 40 },
            { itemId: 'sailing_laps_maelstrom_trial',      name: 'Maelstrom trial',      minCount: 4, maxCount: 8, level: 50 },
            { itemId: 'sailing_laps_typhoon_trial',        name: 'Typhoon trial',        minCount: 4, maxCount: 8, level: 60 },
            { itemId: 'sailing_laps_hurricane_trial',      name: 'Hurricane trial',      minCount: 4, maxCount: 8, level: 70 },
            { itemId: 'sailing_laps_kraken_wake_trial',    name: "Kraken's Wake trial",  minCount: 4, maxCount: 8, level: 80 },
            { itemId: 'sailing_laps_neptune_wrath_trial',  name: "Neptune's Wrath trial", minCount: 4, maxCount: 8, level: 90 }
        ];
    }
    
    // ==================== WATER TRAVEL XP ====================
    
    // Called by player.js when moving on water
    trackWaterMovement(currentPosition) {
        if (!this.lastWaterPosition) {
            this.lastWaterPosition = { x: currentPosition.x, y: currentPosition.y };
            return;
        }
        
        // Calculate distance traveled
        const dx = currentPosition.x - this.lastWaterPosition.x;
        const dy = currentPosition.y - this.lastWaterPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Add to accumulated pixels
        this.waterPixelsTraveled += distance;
        
        // Grant XP for every 10 pixels traveled
        while (this.waterPixelsTraveled >= 10) {
            this.waterPixelsTraveled -= 10;
            if (window.skills) {
                skills.addXp('sailing', 1);
            }
        }
        
        // Update last position
        this.lastWaterPosition = { x: currentPosition.x, y: currentPosition.y };
    }
    
    // Reset tracking when leaving water
    resetWaterTracking() {
        this.lastWaterPosition = null;
        this.waterPixelsTraveled = 0;
    }
    
    // ==================== TASK GENERATION ====================
    
    getTaskVerb() {
        return 'Complete';
    }
    
    generateTask() {
        // Get all possible sailing trials at current level
        const possibleTrials = this.getAvailableTrials();
        if (possibleTrials.length === 0) {
            console.log('No sailing trials available at current level');
            return null;
        }
        
        // Select a trial using weighted distribution
        const selectedTrial = this.selectWeightedTrial(possibleTrials);
        if (!selectedTrial) {
            console.log('Failed to select sailing trial');
            return null;
        }
        
        // Find a node for the selected trial
        const trialNode = this.findNodeForTrial(selectedTrial.activityId);
        if (!trialNode) {
            console.log(`No node found for sailing trial ${selectedTrial.activityId}`);
            return null;
        }
        
        // Determine number of laps
        const lapCount = this.determineLapCount(selectedTrial.activityId);
        
        // Get activity data for the name
        const nodeData = nodes.getNode(trialNode);
        
        return {
            skill: this.id,
            itemId: `sailing_laps_${selectedTrial.activityId}`, // Virtual item for tracking
            targetCount: lapCount,
            nodeId: trialNode,
            activityId: selectedTrial.activityId,
            description: `${lapCount} laps at ${nodeData.name}`,
            startingCount: 0,
            progress: 0,
            isSailingTask: true,
            lapsCompleted: 0
        };
    }
    
    getAvailableTrials() {
        const trials = [];
        const activities = loadingManager.getData('activities');
        const currentLevel = skills.getLevel('sailing');
        
        for (const [activityId, activity] of Object.entries(activities)) {
            if (activity.skill !== 'sailing') continue;
            
            const requiredLevel = activity.requiredLevel || 1;
            if (currentLevel < requiredLevel) continue;
            
            // Simply add the trial - all sailing nodes are reachable
            trials.push({
                activityId: activityId,
                requiredLevel: requiredLevel
            });
        }
        
        return trials;
    }
    
    // Select a trial using weighted distribution (with RuneCred support)
    selectWeightedTrial(trials) {
        if (trials.length === 0) return null;
        
        // Use RuneCred weights if available
        if (window.runeCreditManager) {
            const weightedTrials = [];
            let totalWeight = 0;
            
            for (const trial of trials) {
                // Get the weight modifier for this trial's virtual item
                const virtualItemId = `sailing_laps_${trial.activityId}`;
                const weight = runeCreditManager.getTaskWeight(this.id, virtualItemId);
                totalWeight += weight;
                weightedTrials.push({ trial, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedTrials) {
                if (random < weighted.weight) {
                    return weighted.trial;
                }
            }
            
            return trials[0]; // Fallback
        }
        
        // DEFAULT: Equal weights if RuneCred not available
        return trials[Math.floor(Math.random() * trials.length)];
    }
    
    findNodeForTrial(activityId) {
        const allNodes = nodes.getAllNodes();
        const viableNodes = [];
        
        for (const [nodeId, node] of Object.entries(allNodes)) {
            if (node.activities && node.activities.includes(activityId)) {
                // Simply add the node - no pathfinding needed
                viableNodes.push(nodeId);
            }
        }
        
        // Select a node using weighted distribution if we have any
        if (viableNodes.length > 0) {
            if (window.runeCreditManager) {
                const weightedNodes = [];
                let totalWeight = 0;
                
                for (const nodeId of viableNodes) {
                    const weight = runeCreditManager.getNodeWeight(this.id, nodeId);
                    totalWeight += weight;
                    weightedNodes.push({ nodeId, weight: totalWeight });
                }
                
                const random = Math.random() * totalWeight;
                for (const weighted of weightedNodes) {
                    if (random < weighted.weight) {
                        return weighted.nodeId;
                    }
                }
                
                return viableNodes[0]; // Fallback
            }
            
            // Default: random selection
            return viableNodes[Math.floor(Math.random() * viableNodes.length)];
        }
        
        return null;
    }
    
    determineLapCount(activityId) {
        // Get base lap counts from centralized data
        const virtualItemId = `sailing_laps_${activityId}`;
        const skillData = this.getSkillDataForItem(virtualItemId);
        
        let minCount, maxCount;
        
        if (!skillData) {
            // Fallback if not found
            minCount = 10;
            maxCount = 20;
        } else {
            minCount = skillData.minCount;
            maxCount = skillData.maxCount;
        }
        
        // Apply RuneCred quantity modifier to BOTH min and max
        if (window.runeCreditManager) {
            const modifier = runeCreditManager.getQuantityModifier(this.id, virtualItemId);
            minCount = Math.round(minCount * modifier);
            maxCount = Math.round(maxCount * modifier);
        }
        
        // Clamp both min and max to at least 1
        minCount = Math.max(1, minCount);
        maxCount = Math.max(1, maxCount);
        
        // Ensure max is at least as large as min
        maxCount = Math.max(minCount, maxCount);
        
        // Now pick a random value between the modified min and max
        const range = maxCount - minCount;
        const count = minCount + Math.round(Math.random() * range);
        
        return count;
    }
    
    // Update task progress when lap completes
    updateSailingTaskProgress() {
        if (!window.taskManager) return;
        
        const currentTask = taskManager.getFirstIncompleteTask();
        
        if (currentTask && currentTask.isSailingTask) {
            currentTask.lapsCompleted = (currentTask.lapsCompleted || 0) + 1;
            const progress = currentTask.lapsCompleted / currentTask.targetCount;
            
            console.log(`Sailing progress: ${currentTask.lapsCompleted}/${currentTask.targetCount} laps`);
            
            taskManager.setTaskProgress(currentTask, progress);
        }
    }
    
    // ==================== UI DISPLAY METHODS ====================
    
    // getAllPossibleTasksForUI and getBaseTaskCounts now use base class implementation
    // which automatically uses our SKILL_DATA
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        let duration = baseDuration;
        
        // Apply speed bonus from RuneCred system
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus); // Speed bonus reduces duration
        }
        
        return duration;
    }
    
    beforeActivityStart(activityData) {
        // Check if inventory is full (need space for marks of grace)
        if (inventory.isFull()) {
            console.log('Inventory full - need space for marks of grace');
            if (window.ai) {
                window.ai.decisionCooldown = 0;
            }
            return false;
        }
        
        console.log('Starting sailing trial lap');
        return true;
    }
    
    processRewards(activityData, level) {
        const rewards = [];
        
        // Check for mark of grace (same system as agility)
        const markChance = activityData.markOfGraceChance || (1/8);
        if (Math.random() < markChance) {
            rewards.push({
                itemId: 'mark_of_grace',
                quantity: 1
            });
            console.log('Received mark of grace from sailing!');
        }
        
        // Update task progress
        this.updateSailingTaskProgress();
        
        return rewards;
    }
    
    shouldGrantXP(rewards, activityData) {
        // Always grant XP for completing a lap
        return true;
    }
    
    getXpToGrant(rewards, activityData) {
        return activityData.xpPerLap || activityData.xpPerAction || 0;
    }
    
    onActivityComplete(activityData) {
        console.log('Completed sailing trial lap');
    }
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        // Bank if inventory is full (need space for marks of grace)
        return inventory.isFull();
    }
    
    handleBanking(task) {
        // Simple banking - just deposit all
        const deposited = bank.depositAll();
        console.log(`Deposited ${deposited} items before sailing`);
        return true;
    }
}

// Make SailingSkill available globally
window.SailingSkill = SailingSkill;
