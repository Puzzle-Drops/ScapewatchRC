class CombatManager {
    constructor() {
        this.inCombat = false;
        this.currentMonster = null;
        this.monsterHp = 0;
        this.monsterMaxHp = 0;
        this.playerHp = 0;
        this.playerMaxHp = 0;
        this.prayerPoints = 0;
        this.maxPrayer = 0;
        this.combatStyle = 'melee';
        this.ateThisCycle = false;
        this.combatRoundTimer = 0;
        this.BASE_COMBAT_ROUND_DURATION = 2400; // 2.4 seconds
        
        // Track current combat task if any
        this.currentTask = null;
        this.killsThisTrip = 0;
        
        // XP batching for combined drops
        this.xpBatch = {};
    }
    
    // Add XP to batch instead of directly to skills
    batchXp(skillId, amount) {
        if (!this.xpBatch[skillId]) {
            this.xpBatch[skillId] = 0;
        }
        this.xpBatch[skillId] += amount;
    }
    
    // Send batched XP to skills and create combined drop
    flushXpBatch() {
        if (Object.keys(this.xpBatch).length === 0) return;
        
        // Award XP to skills (this updates levels but doesn't create drops)
        const actualGains = {};
        for (const [skillId, amount] of Object.entries(this.xpBatch)) {
            const actualGained = skills.addXp(skillId, amount, true); // true = suppress individual drops
            if (actualGained > 0) {
                actualGains[skillId] = actualGained;
            }
        }
        
        // Create combined XP drop
        if (window.xpDropManager && Object.keys(actualGains).length > 0) {
            xpDropManager.addCombinedDrop(actualGains);
        }
        
        // Clear batch
        this.xpBatch = {};
    }

    // Get the actual combat round duration with all modifiers applied
    getCombatRoundDuration() {
        let duration = this.BASE_COMBAT_ROUND_DURATION;
        
        // Apply dev console action speed modifier
        if (window.devConsole && window.devConsole.speedModifiers) {
            duration = duration * window.devConsole.speedModifiers.actionDuration;
        }
        
        // Apply RuneCred speed bonuses based on current task skill
        if (window.runeCreditManager && this.currentTask && this.currentTask.skill) {
            const speedBonus = runeCreditManager.getSkillSpeedBonus(this.currentTask.skill);
            duration = duration / (1 + speedBonus);
        }
        
        return duration;
    }
    
    // Start combat with a monster
    startCombat(activityId, task = null) {
        const activityData = loadingManager.getData('activities')[activityId];
        if (!activityData || !activityData.monsterName) {
            console.error('Invalid combat activity:', activityId);
            return false;
        }
        
        // Set up monster
        this.currentMonster = {
            name: activityData.monsterName,
            attack: activityData.attack || 1,
            strength: activityData.strength || 1,
            defence: activityData.defence || 1,
            maxHp: activityData.hitpoints || 10,
            dropTable: activityData.dropTable || [],
            xpRewards: activityData.xpPerKill || {}
        };
        
        this.monsterHp = this.currentMonster.maxHp;
        this.monsterMaxHp = this.currentMonster.maxHp;
        
        // Set up player
        this.playerMaxHp = skills.getLevel('hitpoints');
        this.playerHp = this.playerMaxHp; // Start at full HP
        
        // Set up prayer
        this.maxPrayer = skills.getLevel('prayer');
        this.prayerPoints = this.maxPrayer;
        
        // Determine combat style from task
        if (task) {
            this.combatStyle = task.combatStyle || 'melee';
            this.currentTask = task;
        }
        
        // Reset combat state
        this.inCombat = true;
        this.killsThisTrip = 0;
        this.combatRoundTimer = 0;
        this.ateThisCycle = false;
        
        console.log(`Starting combat with ${this.currentMonster.name}`);
        return true;
    }
    
    // Update combat (called from Player update loop)
    updateCombat(deltaTime) {
        if (!this.inCombat) return;
        
        // Update combat round timer
        this.combatRoundTimer += deltaTime;
        
        // Get the current round duration with all modifiers
        const roundDuration = this.getCombatRoundDuration();
        
        // Check if it's time for a combat round
        if (this.combatRoundTimer >= roundDuration) {
            this.combatRoundTimer = 0;
            this.processCombatRound();
        }
    }
    
    // Process one round of combat
    processCombatRound() {
        // Reset eating flag
        this.ateThisCycle = false;
        
        // Player attacks monster
        this.playerAttack();
        
        // If monster is still alive, it attacks back
        if (this.monsterHp > 0) {
            this.monsterAttack();
        }
        
        // Check if should eat (once per cycle)
        if (!this.ateThisCycle && this.playerHp < this.playerMaxHp) {
            this.smartEatFromBank();
        }
        
        // Drain prayer if active
        if (this.prayerPoints > 0) {
            this.prayerPoints--;
        }
        
        // Check for death
        if (this.monsterHp <= 0) {
            this.handleMonsterDeath();
        } else if (this.playerHp <= 0) {
            this.handlePlayerDeath();
        }
        
        // Flush XP batch to create combined drop
        this.flushXpBatch();
    }
    
    // Player attacks monster
    playerAttack() {
        // Determine attack and strength values based on combat style
        let attackLevel, strengthLevel, gearBonus;
        
        if (this.combatStyle === 'melee') {
            attackLevel = skills.getLevel('attack');
            strengthLevel = skills.getLevel('strength');
            gearBonus = window.gearScores ? window.gearScores.melee : 0;
        } else if (this.combatStyle === 'ranged') {
            attackLevel = skills.getLevel('ranged');
            strengthLevel = skills.getLevel('ranged');
            gearBonus = window.gearScores ? window.gearScores.ranged : 0;
        } else { // magic
            attackLevel = skills.getLevel('magic');
            strengthLevel = skills.getLevel('magic');
            gearBonus = window.gearScores ? window.gearScores.magic : 0;
        }
        
        // Apply prayer bonus (1.5x rounded down)
        if (this.prayerPoints > 0) {
            attackLevel = Math.floor(attackLevel * 1.5);
            strengthLevel = Math.floor(strengthLevel * 1.5);
        }
        
        // Calculate hit chance
        const hitChance = (attackLevel + gearBonus + 8) / (2 * (this.currentMonster.defence + 8));
        const hit = Math.random() < Math.max(0.05, Math.min(0.95, hitChance));
        
        if (hit) {
            // Calculate damage
            const maxHit = Math.ceil((strengthLevel + gearBonus + 1) / 2);
            const damage = Math.floor(Math.random() * (maxHit + 1));
            
            // Apply damage
            this.monsterHp -= damage;
            console.log(`Player hits ${damage} damage (${this.monsterHp}/${this.monsterMaxHp} HP)`);
            
            // Batch combat XP (4 XP per damage)
            if (this.currentTask) {
                this.batchXp(this.currentTask.skill, damage * 4);
            }
            
            // Batch Hitpoints XP (1.33 XP per damage)
            this.batchXp('hitpoints', Math.floor(damage * 1.33));
        } else {
            console.log('Player misses');
        }
    }
    
    // Monster attacks player
    monsterAttack() {
        // Get player's defence level and bonus
        let defenceLevel = skills.getLevel('defence');
        const defenceBonus = window.gearScores ? window.gearScores[this.combatStyle] : 0;
        
        // Apply prayer bonus to defence
        if (this.prayerPoints > 0) {
            defenceLevel = Math.floor(defenceLevel * 1.5);
        }
        
        // Calculate monster hit chance
        const hitChance = (this.currentMonster.attack + 8) / (2 * (defenceLevel + defenceBonus + 8));
        
        if (Math.random() < Math.max(0.05, Math.min(0.95, hitChance))) {
            // Monster hits
            const maxHit = Math.ceil((this.currentMonster.strength + 1) / 2);
            const damage = Math.floor(Math.random() * (maxHit + 1));
            
            this.playerHp -= damage;
            console.log(`Monster hits ${damage} damage (${this.playerHp}/${this.playerMaxHp} HP)`);
        } else {
            console.log('Monster misses');
        }
    }
    
    // Smart food consumption from bank
    smartEatFromBank() {
        const missingHp = this.playerMaxHp - this.playerHp;
        if (missingHp <= 0) return false;
        
        // Get all food from bank
        const items = loadingManager.getData('items');
        const foods = [];
        
        for (const [itemId, quantity] of Object.entries(bank.items)) {
            const itemData = items[itemId];
            if (itemData && itemData.category === 'food' && itemData.healAmount && quantity > 0) {
                foods.push({
                    itemId: itemId,
                    healAmount: itemData.healAmount,
                    quantity: quantity
                });
            }
        }
        
        if (foods.length === 0) {
            console.log('No food in bank!');
            return false;
        }
        
        // Sort foods by heal amount (smallest first)
        foods.sort((a, b) => a.healAmount - b.healAmount);
        
        // Find optimal food (smallest that heals without waste)
        let optimalFood = null;
        
        for (const food of foods) {
            if (food.healAmount <= missingHp) {
                optimalFood = food;
            } else {
                break; // Foods are sorted, no point checking larger heals
            }
        }
        
        // If we found optimal food, eat it
        if (optimalFood) {
            bank.withdraw(optimalFood.itemId, 1);
            this.playerHp = Math.min(this.playerMaxHp, this.playerHp + optimalFood.healAmount);
            this.ateThisCycle = true;
            console.log(`Ate ${optimalFood.itemId} from bank, healed ${optimalFood.healAmount} HP`);
            return true;
        }
        
        // No optimal food found (all foods would overheal)
        console.log('No suitable food (all would waste healing)');
        return false;
    }
    
    // Handle monster death
    handleMonsterDeath() {
        console.log(`Defeated ${this.currentMonster.name}!`);
        
        // Batch kill XP
        if (this.currentMonster.xpRewards) {
            for (const [skill, xp] of Object.entries(this.currentMonster.xpRewards)) {
                this.batchXp(skill, xp);
            }
        }
        
        // Roll for loot
        const loot = this.rollLoot(this.currentMonster.dropTable);
        
        // Add loot to inventory/bank
        for (const drop of loot) {
            const added = inventory.addItem(drop.itemId, drop.quantity);
            if (added < drop.quantity) {
                // Inventory full, rest goes to bank
                bank.deposit(drop.itemId, drop.quantity - added);
                console.log(`Inventory full, banking ${drop.quantity - added} ${drop.itemId}`);
                
                // Should probably bank at this point
                if (window.player) {
                    player.stopActivity();
                }
                if (window.ai) {
                    ai.decisionCooldown = 0;
                }
            }
        }
        
        // Update combat task progress
        if (this.currentTask) {
            this.currentTask.killsCompleted = (this.currentTask.killsCompleted || 0) + 1;
            const progress = this.currentTask.killsCompleted / this.currentTask.targetCount;
            
            console.log(`Combat progress: ${this.currentTask.killsCompleted}/${this.currentTask.targetCount} kills`);
            
            if (window.taskManager) {
                taskManager.setTaskProgress(this.currentTask, progress);
            }
            
            // Check if task is complete
            if (progress >= 1) {
                console.log('Combat task completed! Restoring HP and Prayer');
                // Restore full HP and prayer on task completion
                this.playerHp = this.playerMaxHp;
                this.prayerPoints = this.maxPrayer;
            }
        }
        
        // Track kills this trip
        this.killsThisTrip++;
        
        // Respawn monster
        this.monsterHp = this.monsterMaxHp;
    }
    
    // Roll loot from drop table
    rollLoot(dropTable) {
        const loot = [];
        
        for (const drop of dropTable) {
            if (Math.random() <= drop.chance) {
                let quantity = drop.quantity;
                
                // Handle range quantities like "3-15"
                if (typeof quantity === 'string' && quantity.includes('-')) {
                    const [min, max] = quantity.split('-').map(Number);
                    quantity = min + Math.floor(Math.random() * (max - min + 1));
                }
                
                loot.push({
                    itemId: drop.itemId,
                    quantity: quantity
                });
                
                console.log(`Loot: ${quantity} ${drop.itemId}`);
            }
        }
        
        return loot;
    }
    
    // Handle player death
    handlePlayerDeath() {
        console.log('Player died! Teleporting to Lumbridge bank...');
        
        // Stop combat
        this.inCombat = false;
        this.currentMonster = null;
        
        // Teleport to Lumbridge
        if (window.player) {
            const lumbridgeBank = nodes.getNode('lumbridge_bank');
            if (lumbridgeBank) {
                player.position = { x: lumbridgeBank.position.x, y: lumbridgeBank.position.y };
                player.currentNode = 'lumbridge_bank';
            }
            
            player.stopActivity();
        }
        
        // Reset HP and prayer to full on death
        this.playerHp = this.playerMaxHp;
        this.prayerPoints = this.maxPrayer;
        console.log('HP and Prayer restored to full after death');
        
        // Skip current combat task
        if (window.taskManager && this.currentTask) {
            taskManager.skipCurrentTask();
        }
        
        // Clear task reference
        this.currentTask = null;
        
        // Notify AI
        if (window.ai) {
            ai.currentTask = null;
            ai.decisionCooldown = 0;
        }
    }
    
    // Stop combat
    stopCombat() {
        this.inCombat = false;
        this.currentMonster = null;
        this.currentTask = null;
        console.log('Combat stopped');
    }
    
    // Get combat status for UI
    getCombatStatus() {
        if (!this.inCombat) return null;
        
        return {
            monsterName: this.currentMonster ? this.currentMonster.name : 'Unknown',
            monsterHp: this.monsterHp,
            monsterMaxHp: this.monsterMaxHp,
            playerHp: this.playerHp,
            playerMaxHp: this.playerMaxHp,
            prayerPoints: this.prayerPoints,
            maxPrayer: this.maxPrayer,
            combatStyle: this.combatStyle,
            killsThisTrip: this.killsThisTrip
        };
    }
}

// Make CombatManager available globally
window.CombatManager = CombatManager;
