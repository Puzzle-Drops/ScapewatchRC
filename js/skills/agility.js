class AgilitySkill extends BaseSkill {
    constructor() {
        super('agility', 'Agility');
    }
    
    // ==================== CENTRALIZED SKILL DATA ====================
    // Single source of truth for all agility course data
    initializeSkillData() {
        this.SKILL_DATA = [
            { itemId: 'agility_laps_draynor_rooftop',     name: 'Draynor Rooftop laps',     minCount: 8, maxCount: 12, level: 1  },
            { itemId: 'agility_laps_al_kharid_rooftop',   name: 'Al Kharid Rooftop laps',   minCount: 8, maxCount: 12, level: 20 },
            { itemId: 'agility_laps_varrock_rooftop',     name: 'Varrock Rooftop laps',     minCount: 8,  maxCount: 12, level: 30 },
            { itemId: 'agility_laps_canifis_rooftop',     name: 'Canifis Rooftop laps',     minCount: 8, maxCount: 12, level: 40 },
            { itemId: 'agility_laps_falador_rooftop',     name: 'Falador Rooftop laps',     minCount: 8,  maxCount: 12, level: 50 e},
            { itemId: 'agility_laps_seers_rooftop',       name: "Seers' Village Rooftop laps", minCount: 8, maxCount: 12, level: 60 },
            { itemId: 'agility_laps_pollnivneach_rooftop', name: 'Pollnivneach Rooftop laps', minCount: 8,  maxCount: 12, level: 70 },
            { itemId: 'agility_laps_rellekka_rooftop',    name: 'Rellekka Rooftop laps',    minCount: 8,  maxCount: 12, level: 80 },
            { itemId: 'agility_laps_ardougne_rooftop',    name: 'Ardougne Rooftop laps',    minCount: 8,  maxCount: 12, level: 90 }
        ];
    }
    
    // ==================== TASK GENERATION ====================
    
    getTaskVerb() {
        return 'Complete';
    }
    
    generateTask() {
        // Get all possible agility courses at current level
        const possibleCourses = this.getAvailableCourses();
        if (possibleCourses.length === 0) {
            console.log('No agility courses available at current level');
            return null;
        }
        
        // Select a course using weighted distribution
        const selectedCourse = this.selectWeightedCourse(possibleCourses);
        if (!selectedCourse) {
            console.log('Failed to select agility course');
            return null;
        }
        
        // Use the pre-validated node from getAvailableCourses
        const courseNode = selectedCourse.nodeId || this.findNodeForCourse(selectedCourse.activityId);
        if (!courseNode) {
            console.log(`No node found for agility course ${selectedCourse.activityId}`);
            return null;
        }
        
        // Determine number of laps
        const lapCount = this.determineLapCount(selectedCourse.activityId);
        
        // Get activity data for the name
        const nodeData = nodes.getNode(courseNode);
        
        return {
            skill: this.id,
            itemId: `agility_laps_${selectedCourse.activityId}`, // Virtual item for tracking
            targetCount: lapCount,
            nodeId: courseNode,
            activityId: selectedCourse.activityId,
            description: `${lapCount} laps at ${nodeData.name}`,
            startingCount: 0,
            progress: 0,
            isAgilityTask: true,
            lapsCompleted: 0
        };
    }
    
    getAvailableCourses() {
        const courses = [];
        const activities = loadingManager.getData('activities');
        const currentLevel = skills.getLevel('agility');
        
        for (const [activityId, activity] of Object.entries(activities)) {
            if (activity.skill !== 'agility') continue;
            
            const requiredLevel = activity.requiredLevel || 1;
            if (currentLevel < requiredLevel) continue;
            
            // Check if this course has a reachable node
            const courseNode = this.findNodeForCourse(activityId);
            if (!courseNode) {
                console.log(`No reachable node for agility course ${activityId}, excluding from available courses`);
                continue;
            }
            
            courses.push({
                activityId: activityId,
                requiredLevel: requiredLevel,
                nodeId: courseNode  // Store the valid node for later use
            });
        }
        
        return courses;
    }
    
    // Select a course using weighted distribution (with RuneCred support)
    selectWeightedCourse(courses) {
        if (courses.length === 0) return null;
        
        // Use RuneCred weights if available
        if (window.runeCreditManager) {
            const weightedCourses = [];
            let totalWeight = 0;
            
            for (const course of courses) {
                // Get the weight modifier for this course's virtual item
                const virtualItemId = `agility_laps_${course.activityId}`;
                const weight = runeCreditManager.getTaskWeight(this.id, virtualItemId);
                totalWeight += weight;
                weightedCourses.push({ course, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedCourses) {
                if (random < weighted.weight) {
                    return weighted.course;
                }
            }
            
            return courses[0]; // Fallback
        }
        
        // DEFAULT: Equal weights if RuneCred not available
        return courses[Math.floor(Math.random() * courses.length)];
    }
    
    findNodeForCourse(activityId) {
        const allNodes = nodes.getAllNodes();
        const viableNodes = [];
        
        for (const [nodeId, node] of Object.entries(allNodes)) {
            if (node.activities && node.activities.includes(activityId)) {
                // Check if node is walkable
                if (window.collision && window.collision.initialized) {
                    if (!collision.isWalkable(Math.floor(node.position.x), Math.floor(node.position.y))) {
                        console.log(`Agility node ${nodeId} is not walkable, skipping`);
                        continue;
                    }
                }
                
                // Check if we can path to this node from current position
                if (window.pathfinding && window.player) {
                    const path = pathfinding.findPath(
                        player.position.x, 
                        player.position.y, 
                        node.position.x, 
                        node.position.y
                    );
                    if (!path) {
                        console.log(`No path to agility node ${nodeId}, skipping`);
                        continue;
                    }
                }
                
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
        const virtualItemId = `agility_laps_${activityId}`;
        const skillData = this.getSkillDataForItem(virtualItemId);
        
        if (!skillData) {
            // Fallback if not found
            const min = 10, max = 20;
            const baseCount = min + Math.random() * (max - min);
            return Math.round(baseCount);
        }
        
        const baseCount = skillData.minCount + Math.random() * (skillData.maxCount - skillData.minCount);
        let count = Math.round(baseCount);
        
        // Apply RuneCred quantity modifier
        if (window.runeCreditManager) {
            const modifier = runeCreditManager.getQuantityModifier(this.id, virtualItemId);
            count = Math.round(count * modifier);
            count = Math.max(2, count); // Minimum of 2 laps
        }
        
        return count;
    }
    
    // Update task progress when lap completes
    updateAgilityTaskProgress() {
        if (!window.taskManager) return;
        
        const currentTask = taskManager.getFirstIncompleteTask();
        
        if (currentTask && currentTask.isAgilityTask) {
            currentTask.lapsCompleted = (currentTask.lapsCompleted || 0) + 1;
            const progress = currentTask.lapsCompleted / currentTask.targetCount;
            
            console.log(`Agility progress: ${currentTask.lapsCompleted}/${currentTask.targetCount} laps`);
            
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
        
        console.log('Starting agility lap');
        return true;
    }
    
    processRewards(activityData, level) {
        const rewards = [];
        
        // Check for mark of grace
        const markChance = activityData.markOfGraceChance || (1/8);
        if (Math.random() < markChance) {
            rewards.push({
                itemId: 'mark_of_grace',
                quantity: 1
            });
            console.log('Received mark of grace!');
        }
        
        // Update task progress
        this.updateAgilityTaskProgress();
        
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
        console.log('Completed agility lap');
    }
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        // Bank if inventory is full (need space for marks of grace)
        return inventory.isFull();
    }
    
    handleBanking(task) {
        // Simple banking - just deposit all
        const deposited = bank.depositAll();
        console.log(`Deposited ${deposited} items before agility`);
        return true;
    }
}
