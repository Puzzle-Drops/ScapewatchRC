class RunecraftingSkill extends BaseSkill {
    constructor() {
        super('runecraft', 'Runecrafting');
        this.requiresBankingBeforeTask = true; // Always bank before runecrafting
        this.isProcessingSkill = true;
        
        // Track pouch contents
        this.pouchContents = {
            small_pouch: 0,
            medium_pouch: 0,
            large_pouch: 0,
            giant_pouch: 0
        };
        
        // Pouch capacities
        this.pouchCapacities = {
            small_pouch: 3,
            medium_pouch: 6,
            large_pouch: 9,
            giant_pouch: 12
        };
        
        // Track current crafting phase
        this.currentPhase = 0; // 0 = inventory, 1 = small/medium/large, 2 = giant
        this.hasBankedForTask = false;
        this.currentTaskId = null;
        
        // Track if we're in a crafting sequence
        this.isCrafting = false;
        this.craftingTaskId = null;
        this.craftingStartTime = 0;
    }
    
    // ==================== TASK GENERATION ====================
    
    generateTask() {
        // Get available runecrafting altars
        const availableAltars = this.getAvailableAltars();
        
        if (availableAltars.length === 0) {
            console.log('No runecrafting altars available at current level');
            return null;
        }
        
        // Check if we have enough essence for at least 2 trips
        const essenceAvailable = this.getTotalEssenceAvailable();
        const essencePerTrip = 58; // Approximate max essence per trip at level 75+
        
        if (essenceAvailable < essencePerTrip * 2) {
            console.log(`Not enough rune essence for runecrafting task (have ${essenceAvailable}, need ${essencePerTrip * 2} for 2 trips)`);
            return null;
        }
        
        // Select an altar using weighted distribution
        const selectedAltar = this.selectWeightedAltar(availableAltars);
        if (!selectedAltar) {
            console.log('Failed to select altar for runecrafting');
            return null;
        }
        
        // Find node for this altar
        const altarNode = this.findNodeForAltar(selectedAltar.activityId);
        if (!altarNode) {
            console.log(`No node found for altar ${selectedAltar.activityId}`);
            return null;
        }
        
        // Determine number of trips (capped by available essence)
        const maxTrips = Math.floor(essenceAvailable / essencePerTrip);
        const desiredTrips = this.determineTargetTrips(selectedAltar.activityId);
        const targetTrips = Math.min(desiredTrips, maxTrips);
        
        // Don't create task for less than 2 trips
        if (targetTrips < 2) {
            console.log(`Not enough trips possible for task (only ${targetTrips} trips)`);
            return null;
        }
        
        // Get activity data for the name
        const activityData = loadingManager.getData('activities')[selectedAltar.activityId];
        const nodeData = nodes.getNode(altarNode);
        
        // Get the rune name from items data for better display
        const runeItemData = loadingManager.getData('items')[activityData.runeType];
        const runeName = runeItemData ? runeItemData.name.toLowerCase() : activityData.runeType.replace('_', ' ');
        
        return {
            skill: this.id,
            itemId: `runecraft_trips_${selectedAltar.activityId}`, // Virtual item for tracking
            targetCount: targetTrips,
            nodeId: altarNode,
            activityId: selectedAltar.activityId,
            description: `Runecraft ${targetTrips} trips of ${runeName} at ${nodeData.name}`,
            startingCount: 0,
            progress: 0,
            isRunecraftingTask: true,
            tripsCompleted: 0,
            runeType: activityData.runeType
        };
    }
    
    getAvailableAltars() {
        const altars = [];
        const activities = loadingManager.getData('activities');
        const currentLevel = skills.getLevel('runecraft');
        
        for (const [activityId, activity] of Object.entries(activities)) {
            if (activity.skill !== 'runecraft') continue;
            
            const requiredLevel = activity.requiredLevel || 1;
            if (currentLevel < requiredLevel) continue;
            
            // Check if we have a node for this altar
            const nodeId = this.findNodeForAltar(activityId);
            if (!nodeId) continue;
            
            altars.push({
                activityId: activityId,
                requiredLevel: requiredLevel,
                nodeId: nodeId
            });
        }
        
        return altars;
    }
    
    // Select an altar using weighted distribution (with RuneCred support)
    selectWeightedAltar(altars) {
        if (altars.length === 0) return null;
        
        // Use RuneCred weights if available
        if (window.runeCreditManager) {
            const weightedAltars = [];
            let totalWeight = 0;
            
            for (const altar of altars) {
                // Get the weight modifier for this altar's virtual item
                const virtualItemId = `runecraft_trips_${altar.activityId}`;
                const weight = runeCreditManager.getTaskWeight(this.id, virtualItemId);
                totalWeight += weight;
                weightedAltars.push({ altar, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedAltars) {
                if (random < weighted.weight) {
                    return weighted.altar;
                }
            }
            
            return altars[0]; // Fallback
        }
        
        // Default: equal weights if RuneCred not available
        return altars[Math.floor(Math.random() * altars.length)];
    }
    
    findNodeForAltar(activityId) {
        const allNodes = nodes.getAllNodes();
        const viableNodes = [];
        
        for (const [nodeId, node] of Object.entries(allNodes)) {
            if (node.activities && node.activities.includes(activityId)) {
                // Check if node is walkable
                if (window.collision && window.collision.initialized) {
                    if (!collision.isWalkable(Math.floor(node.position.x), Math.floor(node.position.y))) {
                        continue;
                    }
                }
                
                // Check if we can path to this node
                if (window.pathfinding && window.player) {
                    const path = pathfinding.findPath(
                        player.position.x, 
                        player.position.y, 
                        node.position.x, 
                        node.position.y
                    );
                    if (!path) {
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
            
            // Default: return first viable node
            return viableNodes[0];
        }
        
        return null;
    }
    
    getTotalEssenceAvailable() {
        let total = 0;
        
        if (window.inventory) {
            total += inventory.getItemCount('rune_essence');
        }
        
        if (window.bank) {
            total += bank.getItemCount('rune_essence');
        }
        
        return total;
    }
    
    determineTargetTrips(activityId) {
        // Different trip counts based on altar
        const tripCounts = {
            'craft_air_runes': { min: 5, max: 15 },
            'craft_mind_runes': { min: 5, max: 15 },
            'craft_water_runes': { min: 5, max: 12 },
            'craft_earth_runes': { min: 5, max: 12 },
            'craft_fire_runes': { min: 4, max: 10 },
            'craft_body_runes': { min: 4, max: 10 },
            'craft_cosmic_runes': { min: 3, max: 8 },
            'craft_chaos_runes': { min: 3, max: 8 },
            'craft_astral_runes': { min: 3, max: 7 },
            'craft_nature_runes': { min: 3, max: 7 },
            'craft_law_runes': { min: 2, max: 6 },
            'craft_death_runes': { min: 2, max: 5 },
            'craft_blood_runes': { min: 2, max: 4 },
            'craft_soul_runes': { min: 2, max: 4 },
            'craft_wrath_runes': { min: 2, max: 3 }
        };
        
        const counts = tripCounts[activityId] || { min: 3, max: 8 };
        const baseCount = counts.min + Math.random() * (counts.max - counts.min);
        let count = Math.round(baseCount);
        
        // Apply RuneCred quantity modifier
        if (window.runeCreditManager) {
            const virtualItemId = `runecraft_trips_${activityId}`;
            const modifier = runeCreditManager.getQuantityModifier(this.id, virtualItemId);
            count = Math.round(count * modifier);
            count = Math.max(1, count); // Minimum of 1 trip
        }
        
        return count;
    }
    
    updateRunecraftingTaskProgress() {
        if (!window.taskManager) return;
        
        const currentTask = taskManager.getFirstIncompleteTask();
        
        if (currentTask && currentTask.isRunecraftingTask) {
            currentTask.tripsCompleted = (currentTask.tripsCompleted || 0) + 1;
            const progress = currentTask.tripsCompleted / currentTask.targetCount;
            
            console.log(`Runecrafting trip complete! Progress: ${currentTask.tripsCompleted}/${currentTask.targetCount} trips`);
            
            taskManager.setTaskProgress(currentTask, progress);
            
            // Update UI immediately
            if (window.ui) {
                window.ui.updateTasks();
            }
        }
    }
    
    getTaskVerb() {
        return 'Runecraft';
    }
    
    // ==================== UI DISPLAY METHODS ====================
    
    // Get all possible tasks for UI display (not for generation)
    getAllPossibleTasksForUI() {
        const tasks = [];
        const activities = loadingManager.getData('activities');
        const items = loadingManager.getData('items');
        
        // All runecrafting altars with their base counts
        const altarData = [
            { id: 'craft_air_runes', rune: 'air_rune', name: 'Air runes', min: 5, max: 15, level: 1 },
            { id: 'craft_mind_runes', rune: 'mind_rune', name: 'Mind runes', min: 5, max: 15, level: 2 },
            { id: 'craft_water_runes', rune: 'water_rune', name: 'Water runes', min: 5, max: 12, level: 5 },
            { id: 'craft_earth_runes', rune: 'earth_rune', name: 'Earth runes', min: 5, max: 12, level: 9 },
            { id: 'craft_fire_runes', rune: 'fire_rune', name: 'Fire runes', min: 4, max: 10, level: 14 },
            { id: 'craft_body_runes', rune: 'body_rune', name: 'Body runes', min: 4, max: 10, level: 20 },
            { id: 'craft_cosmic_runes', rune: 'cosmic_rune', name: 'Cosmic runes', min: 3, max: 8, level: 27 },
            { id: 'craft_chaos_runes', rune: 'chaos_rune', name: 'Chaos runes', min: 3, max: 8, level: 35 },
            { id: 'craft_astral_runes', rune: 'astral_rune', name: 'Astral runes', min: 3, max: 7, level: 40 },
            { id: 'craft_nature_runes', rune: 'nature_rune', name: 'Nature runes', min: 3, max: 7, level: 44 },
            { id: 'craft_law_runes', rune: 'law_rune', name: 'Law runes', min: 2, max: 6, level: 54 },
            { id: 'craft_death_runes', rune: 'death_rune', name: 'Death runes', min: 2, max: 5, level: 65 },
            { id: 'craft_blood_runes', rune: 'blood_rune', name: 'Blood runes', min: 2, max: 4, level: 77 },
            { id: 'craft_soul_runes', rune: 'soul_rune', name: 'Soul runes', min: 2, max: 4, level: 90 },
            { id: 'craft_wrath_runes', rune: 'wrath_rune', name: 'Wrath runes', min: 2, max: 3, level: 95 }
        ];
        
        for (const altar of altarData) {
            // Get rune name from items data if available
            let displayName = altar.name;
            if (items[altar.rune]) {
                displayName = items[altar.rune].name;
            }
            
            tasks.push({
                itemId: `runecraft_trips_${altar.id}`,
                displayName: `${displayName} trips`,
                minCount: altar.min,
                maxCount: altar.max,
                requiredLevel: altar.level
            });
        }
        
        return tasks;
    }
    
    // Get base task counts without modifiers (for UI)
    getBaseTaskCounts(itemId) {
        // Remove the 'runecraft_trips_' prefix to get activityId
        const activityId = itemId.replace('runecraft_trips_', '');
        
        const tripCounts = {
            'craft_air_runes': { min: 5, max: 15 },
            'craft_mind_runes': { min: 5, max: 15 },
            'craft_water_runes': { min: 5, max: 12 },
            'craft_earth_runes': { min: 5, max: 12 },
            'craft_fire_runes': { min: 4, max: 10 },
            'craft_body_runes': { min: 4, max: 10 },
            'craft_cosmic_runes': { min: 3, max: 8 },
            'craft_chaos_runes': { min: 3, max: 8 },
            'craft_astral_runes': { min: 3, max: 7 },
            'craft_nature_runes': { min: 3, max: 7 },
            'craft_law_runes': { min: 2, max: 6 },
            'craft_death_runes': { min: 2, max: 5 },
            'craft_blood_runes': { min: 2, max: 4 },
            'craft_soul_runes': { min: 2, max: 4 },
            'craft_wrath_runes': { min: 2, max: 3 }
        };
        
        return tripCounts[activityId] || { min: 3, max: 8 };
    }
    
    // ==================== PROCESSING SKILL INTERFACE ====================
    
    hasMaterialsForCurrentTask() {
        return this.hasEssenceForCurrentTask();
    }
    
    getMaterialsNeededForTask(task) {
        if (!task || !task.isRunecraftingTask) return null;
        
        const essencePerTrip = 58;
        const tripsRemaining = task.targetCount - (task.tripsCompleted || 0);
        
        return {
            itemId: 'rune_essence',
            quantity: essencePerTrip * tripsRemaining
        };
    }
    
    hasEssenceForCurrentTask() {
        // Check if we have essence in inventory or pouches
        const inventoryEssence = inventory.getItemCount('rune_essence');
        const pouchEssence = this.getTotalPouchContents();
        
        return (inventoryEssence + pouchEssence) > 0;
    }
    
    getTotalPouchContents() {
        return Object.values(this.pouchContents).reduce((sum, count) => sum + count, 0);
    }
    
    // ==================== CORE BEHAVIOR ====================
    
    getDuration(baseDuration, level, activityData) {
        let duration = 600; // All runecrafting actions are 600ms
        
        // Apply speed bonus from RuneCred system
        if (window.runeCreditManager) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.id);
            duration = duration / (1 + speedBonus); // Speed bonus reduces duration
        }
        
        return duration;
    }
    
    beforeActivityStart(activityData) {
        // Check if we're already crafting
        if (this.isCrafting) {
            const currentTime = Date.now();
            const timeCrafting = currentTime - this.craftingStartTime;
            
            if (timeCrafting < 600) {
                if (window.ai && window.ai.currentTask && window.ai.currentTask.isRunecraftingTask) {
                    const taskId = `${window.ai.currentTask.activityId}_${window.ai.currentTask.targetCount}`;
                    if (this.craftingTaskId === taskId) {
                        console.log('Already crafting runes, rejecting duplicate start');
                        return false;
                    }
                }
            } else {
                console.log('Crafting took too long, resetting state');
                this.clearCraftingState();
            }
        }
        
        // Check if we have any essence in inventory
        const inventoryEssence = inventory.getItemCount('rune_essence');
        
        if (inventoryEssence === 0) {
            // No essence in inventory - trip is complete
            console.log('No essence in inventory - trip complete');
            this.clearCraftingState();
            
            // Update task progress for completed trip
            this.updateRunecraftingTaskProgress();
            
            // Reset for next trip
            this.currentPhase = 0;
            this.pouchContents = {
                small_pouch: 0,
                medium_pouch: 0,
                large_pouch: 0,
                giant_pouch: 0
            };
            
            // Tell AI to go bank
            if (window.ai) {
                window.ai.decisionCooldown = 0;
            }
            
            return false;
        }
        
        console.log(`Crafting runes from ${inventoryEssence} inventory essence (Phase ${this.currentPhase})`);
        
        // Set crafting state
        this.isCrafting = true;
        this.craftingStartTime = Date.now();
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isRunecraftingTask) {
            this.craftingTaskId = `${window.ai.currentTask.activityId}_${window.ai.currentTask.targetCount}`;
        }
        
        return true;
    }
    
    hasSmallMediumLargePouches() {
        return this.pouchContents.small_pouch > 0 || 
               this.pouchContents.medium_pouch > 0 || 
               this.pouchContents.large_pouch > 0;
    }
    
    processRewards(activityData, level) {
        // Clear crafting state
        this.clearCraftingState();
        
        // Get current inventory essence
        const essenceToConsume = inventory.getItemCount('rune_essence');
        
        if (essenceToConsume === 0) {
            console.log('ERROR: No essence to consume but activity started');
            return [];
        }
        
        // Consume the essence
        inventory.removeItem('rune_essence', essenceToConsume);
        
        // Calculate runes created
        const runesPerEssence = this.getRunesPerEssence(activityData, level);
        const bonusMultiplier = this.getBonusMultiplier(level);
        const totalRunes = Math.floor(essenceToConsume * runesPerEssence * bonusMultiplier);
        
        // Store XP for later
        this.lastCraftingXp = essenceToConsume * (activityData.xpPerEssence || 5);
        
        console.log(`Crafted ${totalRunes} ${activityData.runeType} from ${essenceToConsume} essence`);
        
        // Now handle pouch emptying based on phase
        if (this.currentPhase === 0) {
            // After first craft, empty small/medium/large pouches
            let totalEmptied = 0;
            
            if (this.pouchContents.small_pouch > 0) {
                inventory.addItem('rune_essence', this.pouchContents.small_pouch);
                console.log(`Emptied ${this.pouchContents.small_pouch} essence from small pouch`);
                totalEmptied += this.pouchContents.small_pouch;
                this.pouchContents.small_pouch = 0;
            }
            
            if (this.pouchContents.medium_pouch > 0) {
                inventory.addItem('rune_essence', this.pouchContents.medium_pouch);
                console.log(`Emptied ${this.pouchContents.medium_pouch} essence from medium pouch`);
                totalEmptied += this.pouchContents.medium_pouch;
                this.pouchContents.medium_pouch = 0;
            }
            
            if (this.pouchContents.large_pouch > 0) {
                inventory.addItem('rune_essence', this.pouchContents.large_pouch);
                console.log(`Emptied ${this.pouchContents.large_pouch} essence from large pouch`);
                totalEmptied += this.pouchContents.large_pouch;
                this.pouchContents.large_pouch = 0;
            }
            
            if (totalEmptied > 0) {
                console.log(`Total essence emptied from pouches: ${totalEmptied}`);
                this.currentPhase = 1; // Move to phase 1
            } else if (this.pouchContents.giant_pouch > 0) {
                // No small/medium/large but has giant - move to phase 1 anyway
                this.currentPhase = 1;
            } else {
                // No pouches at all - trip is done after this craft
                this.currentPhase = 2; // Skip to end
            }
            
        } else if (this.currentPhase === 1) {
            // After second craft, empty giant pouch
            if (this.pouchContents.giant_pouch > 0) {
                inventory.addItem('rune_essence', this.pouchContents.giant_pouch);
                console.log(`Emptied ${this.pouchContents.giant_pouch} essence from giant pouch`);
                this.pouchContents.giant_pouch = 0;
                this.currentPhase = 2; // Move to final phase
            } else {
                // No giant pouch - we're done
                this.currentPhase = 2;
            }
        } else {
            // Phase 2 - all done
            this.currentPhase = 2;
        }
        
        return [{
            itemId: activityData.runeType,
            quantity: totalRunes
        }];
    }
    
    getRunesPerEssence(activityData, level) {
        if (!activityData.runeMultipliers) return 1;
        
        // Find the highest multiplier we qualify for
        let multiplier = 1;
        for (const [reqLevel, mult] of Object.entries(activityData.runeMultipliers)) {
            if (level >= parseInt(reqLevel)) {
                multiplier = mult;
            }
        }
        
        return multiplier;
    }
    
    getBonusMultiplier(level) {
        // 10% bonus per 10 levels, max 60% at level 61
        const bonusLevels = Math.min(Math.floor(level / 10), 6);
        return 1 + (bonusLevels * 0.1);
    }
    
    shouldGrantXP(rewards, activityData) {
        return rewards.length > 0;
    }
    
    getXpToGrant(rewards, activityData) {
        return this.lastCraftingXp || 0;
    }
    
    clearCraftingState() {
        this.isCrafting = false;
        this.craftingTaskId = null;
        this.craftingStartTime = 0;
    }
    
    // ==================== BANKING ====================
    
    needsBankingForTask(task) {
        if (!task || task.skill !== 'runecraft') return false;
        if (!task.isRunecraftingTask) return false;
        
        // Check if we have essence or filled pouches
        const inventoryEssence = inventory.getItemCount('rune_essence');
        const pouchEssence = this.getTotalPouchContents();
        
        if (inventoryEssence === 0 && pouchEssence === 0) {
            console.log('Need banking: no essence in inventory or pouches');
            return true;
        }
        
        return false;
    }
    
    handleBanking(task) {
        // Deposit all first
        bank.depositAll();
        console.log('Deposited all items for runecrafting');
        
        // Mark that we've banked for this task
        const taskId = task ? `${task.activityId}_${task.targetCount}_${task.nodeId}` : null;
        this.currentTaskId = taskId;
        this.hasBankedForTask = true;
        
        const rcLevel = skills.getLevel('runecraft');
        let slotsUsed = 0;
        
        // Withdraw pouches and fill them
        if (rcLevel >= 1 && bank.getItemCount('small_pouch') > 0) {
            const withdrawn = bank.withdrawUpTo('small_pouch', 1);
            if (withdrawn > 0) {
                inventory.addItem('small_pouch', 1);
                // Fill the pouch
                const essenceForPouch = Math.min(3, bank.getItemCount('rune_essence'));
                if (essenceForPouch > 0) {
                    bank.withdrawUpTo('rune_essence', essenceForPouch);
                    this.pouchContents.small_pouch = essenceForPouch;
                    console.log(`Filled small pouch with ${essenceForPouch} essence`);
                }
                slotsUsed++;
            }
        }
        
        if (rcLevel >= 25 && bank.getItemCount('medium_pouch') > 0) {
            const withdrawn = bank.withdrawUpTo('medium_pouch', 1);
            if (withdrawn > 0) {
                inventory.addItem('medium_pouch', 1);
                // Fill the pouch
                const essenceForPouch = Math.min(6, bank.getItemCount('rune_essence'));
                if (essenceForPouch > 0) {
                    bank.withdrawUpTo('rune_essence', essenceForPouch);
                    this.pouchContents.medium_pouch = essenceForPouch;
                    console.log(`Filled medium pouch with ${essenceForPouch} essence`);
                }
                slotsUsed++;
            }
        }
        
        if (rcLevel >= 50 && bank.getItemCount('large_pouch') > 0) {
            const withdrawn = bank.withdrawUpTo('large_pouch', 1);
            if (withdrawn > 0) {
                inventory.addItem('large_pouch', 1);
                // Fill the pouch
                const essenceForPouch = Math.min(9, bank.getItemCount('rune_essence'));
                if (essenceForPouch > 0) {
                    bank.withdrawUpTo('rune_essence', essenceForPouch);
                    this.pouchContents.large_pouch = essenceForPouch;
                    console.log(`Filled large pouch with ${essenceForPouch} essence`);
                }
                slotsUsed++;
            }
        }
        
        if (rcLevel >= 75 && bank.getItemCount('giant_pouch') > 0) {
            const withdrawn = bank.withdrawUpTo('giant_pouch', 1);
            if (withdrawn > 0) {
                inventory.addItem('giant_pouch', 1);
                // Fill the pouch
                const essenceForPouch = Math.min(12, bank.getItemCount('rune_essence'));
                if (essenceForPouch > 0) {
                    bank.withdrawUpTo('rune_essence', essenceForPouch);
                    this.pouchContents.giant_pouch = essenceForPouch;
                    console.log(`Filled giant pouch with ${essenceForPouch} essence`);
                }
                slotsUsed++;
            }
        }
        
        // Fill remaining inventory with essence
        const remainingSlots = 28 - slotsUsed;
        const bankEssence = bank.getItemCount('rune_essence');
        
        if (bankEssence > 0 && remainingSlots > 0) {
            const toWithdraw = Math.min(remainingSlots, bankEssence);
            const withdrawn = bank.withdrawUpTo('rune_essence', toWithdraw);
            
            if (withdrawn > 0) {
                inventory.addItem('rune_essence', withdrawn);
                console.log(`Withdrew ${withdrawn} rune essence for inventory`);
            }
        }
        
        // Check if we have enough for the task
        const totalEssence = inventory.getItemCount('rune_essence') + this.getTotalPouchContents();
        
        if (totalEssence === 0) {
            console.log('No rune essence available for runecrafting');
            return false;
        }
        
        // Reset phase for new trip
        this.currentPhase = 0;
        
        return true;
    }
    
    canContinueTask(task) {
        if (!task || !task.isRunecraftingTask) return true;
        
        // Check if we have enough essence for remaining trips
        // Be conservative - assume we need at least 58 essence per trip (minimum viable trip)
        const minEssencePerTrip = 58;
        const tripsRemaining = task.targetCount - (task.tripsCompleted || 0);
        const essenceNeeded = minEssencePerTrip * tripsRemaining;
        
        const totalAvailable = this.getTotalEssenceAvailable();
        
        if (totalAvailable < minEssencePerTrip) {
            // Can't even do one trip
            console.log(`Cannot continue runecrafting task - need at least ${minEssencePerTrip} essence for one trip, have ${totalAvailable}`);
            this.hasBankedForTask = false;
            this.currentTaskId = null;
            this.clearCraftingState();
            return false;
        }
        
        if (totalAvailable < essenceNeeded) {
            console.log(`Warning: Only have ${totalAvailable} essence, may not complete all ${tripsRemaining} remaining trips`);
            // Still return true - we can do at least one more trip
        }
        
        return true;
    }
    
    hasMaterials() {
        return this.hasEssenceForCurrentTask();
    }
    
    onActivityComplete(activityData) {
        // Check if we have essence in inventory
        const inventoryEssence = inventory.getItemCount('rune_essence');
        
        if (inventoryEssence > 0) {
            // More essence to craft
            console.log(`Continuing runecrafting - ${inventoryEssence} essence remaining`);
            // Activity will restart automatically
        } else {
            // No essence left - trip complete
            console.log('No essence remaining - trip complete');
            
            // Update task progress
            this.updateRunecraftingTaskProgress();
            
            // Reset for next trip
            this.currentPhase = 0;
            this.pouchContents = {
                small_pouch: 0,
                medium_pouch: 0,
                large_pouch: 0,
                giant_pouch: 0
            };
            
            // Clear crafting state
            this.clearCraftingState();
            
            // Tell AI to re-evaluate (go bank)
            if (window.ai) {
                window.ai.decisionCooldown = 0;
            }
        }
    }
    
    onActivityStopped() {
        console.log('Runecrafting activity was stopped, clearing state');
        this.clearCraftingState();
    }
}
