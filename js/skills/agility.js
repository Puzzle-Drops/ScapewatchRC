class AgilitySkill extends BaseSkill {
    constructor() {
        super('agility', 'Agility');
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
        
        // Default: equal weights if RuneCred not available
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
        // Base lap counts on course difficulty/level
        const lapCounts = {
            'draynor_rooftop': { min: 10, max: 25 },
            'al_kharid_rooftop': { min: 10, max: 20 },
            'varrock_rooftop': { min: 8, max: 18 },
            'canifis_rooftop': { min: 10, max: 20 },
            'falador_rooftop': { min: 8, max: 15 },
            'seers_rooftop': { min: 10, max: 20 },
            'pollnivneach_rooftop': { min: 8, max: 15 },
            'rellekka_rooftop': { min: 8, max: 15 },
            'ardougne_rooftop': { min: 8, max: 15 }
        };
        
        const counts = lapCounts[activityId] || { min: 10, max: 20 };
        const baseCount = counts.min + Math.random() * (counts.max - counts.min);
        let count = Math.round(baseCount);
        
        // Apply RuneCred quantity modifier
        if (window.runeCreditManager) {
            const virtualItemId = `agility_laps_${activityId}`;
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
    
    // Get all possible tasks for UI display (not for generation)
    getAllPossibleTasksForUI() {
        const tasks = [];
        const activities = loadingManager.getData('activities');
        
        // All agility courses with their base counts
        const courseData = [
            { id: 'draynor_rooftop', name: 'Draynor Rooftop', min: 10, max: 25, level: 1 },
            { id: 'al_kharid_rooftop', name: 'Al Kharid Rooftop', min: 10, max: 20, level: 20 },
            { id: 'varrock_rooftop', name: 'Varrock Rooftop', min: 8, max: 18, level: 30 },
            { id: 'canifis_rooftop', name: 'Canifis Rooftop', min: 10, max: 20, level: 40 },
            { id: 'falador_rooftop', name: 'Falador Rooftop', min: 8, max: 15, level: 50 },
            { id: 'seers_rooftop', name: "Seers' Village Rooftop", min: 10, max: 20, level: 60 },
            { id: 'pollnivneach_rooftop', name: 'Pollnivneach Rooftop', min: 8, max: 15, level: 70 },
            { id: 'rellekka_rooftop', name: 'Rellekka Rooftop', min: 8, max: 15, level: 80 },
            { id: 'ardougne_rooftop', name: 'Ardougne Rooftop', min: 8, max: 15, level: 90 }
        ];
        
        for (const course of courseData) {
            // Check if activity exists
            if (activities[course.id]) {
                const activity = activities[course.id];
                tasks.push({
                    itemId: `agility_laps_${course.id}`,
                    displayName: `${activity.name || course.name} laps`,
                    minCount: course.min,
                    maxCount: course.max,
                    requiredLevel: course.level
                });
            } else {
                // Use fallback data
                tasks.push({
                    itemId: `agility_laps_${course.id}`,
                    displayName: `${course.name} laps`,
                    minCount: course.min,
                    maxCount: course.max,
                    requiredLevel: course.level
                });
            }
        }
        
        return tasks;
    }
    
    // Get base task counts without modifiers (for UI)
    getBaseTaskCounts(itemId) {
        // Remove the 'agility_laps_' prefix to get activityId
        const activityId = itemId.replace('agility_laps_', '');
        
        const lapCounts = {
            'draynor_rooftop': { min: 10, max: 25 },
            'al_kharid_rooftop': { min: 10, max: 20 },
            'varrock_rooftop': { min: 8, max: 18 },
            'canifis_rooftop': { min: 10, max: 20 },
            'falador_rooftop': { min: 8, max: 15 },
            'seers_rooftop': { min: 10, max: 20 },
            'pollnivneach_rooftop': { min: 8, max: 15 },
            'rellekka_rooftop': { min: 8, max: 15 },
            'ardougne_rooftop': { min: 8, max: 15 }
        };
        
        return lapCounts[activityId] || { min: 10, max: 20 };
    }
    
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
