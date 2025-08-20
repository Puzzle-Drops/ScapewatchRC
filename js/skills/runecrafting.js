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
    
    // ==================== CENTRALIZED SKILL DATA ====================
    // Single source of truth for all runecrafting data
    // Note: itemId is virtual (runecraft_trips_X), display name is for the runes
    initializeSkillData() {
        this.SKILL_DATA = [
            { itemId: 'runecraft_trips_craft_air_runes',    name: 'Air runes trips',    minCount: 3, maxCount: 6, level: 1  },
            { itemId: 'runecraft_trips_craft_mind_runes',   name: 'Mind runes trips',   minCount: 3, maxCount: 6, level: 2  },
            { itemId: 'runecraft_trips_craft_water_runes',  name: 'Water runes trips',  minCount: 3, maxCount: 6, level: 5  },
            { itemId: 'runecraft_trips_craft_earth_runes',  name: 'Earth runes trips',  minCount: 3, maxCount: 6, level: 9  },
            { itemId: 'runecraft_trips_craft_fire_runes',   name: 'Fire runes trips',   minCount: 3, maxCount: 6, level: 14 },
            { itemId: 'runecraft_trips_craft_body_runes',   name: 'Body runes trips',   minCount: 3, maxCount: 6, level: 20 },
            { itemId: 'runecraft_trips_craft_cosmic_runes', name: 'Cosmic runes trips', minCount: 3, maxCount: 6,  level: 27 },
            { itemId: 'runecraft_trips_craft_chaos_runes',  name: 'Chaos runes trips',  minCount: 3, maxCount: 6,  level: 35 },
            { itemId: 'runecraft_trips_craft_astral_runes', name: 'Astral runes trips', minCount: 3, maxCount: 6,  level: 40 },
            { itemId: 'runecraft_trips_craft_nature_runes', name: 'Nature runes trips', minCount: 3, maxCount: 6,  level: 44 },
            { itemId: 'runecraft_trips_craft_law_runes',    name: 'Law runes trips',    minCount: 3, maxCount: 6,  level: 54 },
            { itemId: 'runecraft_trips_craft_death_runes',  name: 'Death runes trips',  minCount: 3, maxCount: 6,  level: 65 },
            { itemId: 'runecraft_trips_craft_blood_runes',  name: 'Blood runes trips',  minCount: 3, maxCount: 6,  level: 77 },
            { itemId: 'runecraft_trips_craft_soul_runes',   name: 'Soul runes trips',   minCount: 3, maxCount: 6,  level: 90 },
            { itemId: 'runecraft_trips_craft_wrath_runes',  name: 'Wrath runes trips',  minCount: 3, maxCount: 6,  level: 95 }
        ];
    }
    
    // ==================== TASK GENERATION ====================
    
    generateTask() {
        // Get available runecrafting altars
        const availableAltars = this.getAvailableAltars();
        
        if (availableAltars.length === 0) {
            console.log('No runecrafting altars available at current level');
            return null;
        }
        
        // Get total essence available
        const essenceAvailable = this.getTotalEssenceAvailable();
        const essencePerTrip = 58; // Approximate max essence per trip at level 75+
        
        // Basic check - need at least enough for 1 trip
        if (essenceAvailable < essencePerTrip) {
            console.log(`Not enough rune essence for any runecrafting task (have ${essenceAvailable}, need at least ${essencePerTrip} for 1 trip)`);
            return null;
        }
        
        // Select an altar using weighted distribution
        const selectedAltar = this.selectWeightedAltar(availableAltars);
        if (!selectedAltar) {
            console.log('Failed to select altar for runecrafting');
            return null;
        }
        
        // Find node for this altar (no pathfinding needed)
        const altarNode = this.findNodeForAltar(selectedAltar.activityId);
        if (!altarNode) {
            console.log(`No node found for altar ${selectedAltar.activityId}`);
            return null;
        }
        
        // Determine desired number of trips (including RuneCred modifiers)
        const desiredTrips = this.determineTargetTrips(selectedAltar.activityId);
        
        // Calculate essence needed for this specific task
        const essenceNeeded = desiredTrips * essencePerTrip;
        
        // Check if we have enough essence for the rolled task
        if (essenceAvailable < essenceNeeded) {
            console.log(`Not enough essence for ${desiredTrips} trips of ${selectedAltar.activityId} (have ${essenceAvailable}, need ${essenceNeeded})`);
            return null;
        }
        
        // We have enough essence, proceed with this task
        const targetTrips = desiredTrips;
        
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
            
            // Simply add the altar - all altar nodes are reachable
            altars.push({
                activityId: activityId,
                requiredLevel: requiredLevel
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
        
        // DEFAULT: Equal weights if RuneCred not available
        return altars[Math.floor(Math.random() * altars.length)];
    }
    
    findNodeForAltar(activityId) {
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
        // Get trip counts from centralized data
        const virtualItemId = `runecraft_trips_${activityId}`;
        const skillData = this.getSkillDataForItem(virtualItemId);
        
        let minCount, maxCount;
        
        if (!skillData) {
            // Fallback if not found
            minCount = 3;
            maxCount = 8;
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
    
    // getAllPossibleTasksForUI now uses base class implementation
    // getBaseTaskCounts now uses base class implementation
    
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
