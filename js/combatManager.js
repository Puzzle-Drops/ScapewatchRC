class CombatManager {
    constructor() {
        this.inCombat = false;
        this.currentMonster = null;
        this.monsterHp = 0;
        this.monsterMaxHp = 0;
        this.monsterPrayerPoints = 0;
        this.monsterMaxPrayer = 0;
        this.playerHp = 0;
        this.playerMaxHp = 0;
        this.prayerPoints = 0;
        this.maxPrayer = 0;
        this.combatStyle = 'melee';
        this.combatRoundTimer = 0;
        this.BASE_COMBAT_ROUND_DURATION = 2400; // 2.4 seconds total
        
        // Track current combat task if any
        this.currentTask = null;
        this.killsThisTrip = 0;
        
        // XP batching for combined drops
        this.xpBatch = {};
        
        // Death animation tracking
        this.monsterDying = false;
        this.playerDying = false;
        this.deathAnimationTimer = 0;
        this.DEATH_FADE_DURATION = 2400; // 2.4s fade out
        this.RESPAWN_WAIT_DURATION = 2400; // 2.4s wait after fade
        this.pendingMonsterRespawn = false;
        this.pendingPlayerRespawn = false;
        
        // UI Elements
        this.playerPanel = null;
        this.monsterPanel = null;
        this.uiCreated = false;
        
        // Combat phases
        this.combatPhase = 'player_attack'; // 'player_attack', 'monster_attack', 'eat_food'
        this.phaseTimer = 0;
        this.PHASE_DURATIONS = {
            player_attack: 1200,    // 1.2s
            monster_attack: 1200,   // 1.2s
            eat_food: 1200        // 1.2s
        };
        
        // Track if we need to eat this round
        this.shouldEatThisRound = false;
        this.foodToEat = null;
    }
    
    // Add XP to batch instead of directly to skills
    batchXp(skillId, amount) {
        if (!this.xpBatch[skillId]) {
            this.xpBatch[skillId] = 0;
        }
        this.xpBatch[skillId] += amount;
    }

    // Get combat activity progress for visual display
    getCombatActivityProgress() {
        if (!this.inCombat) return 0;
        
        // Only show progress during player attack phase
        if (this.combatPhase === 'player_attack') {
            return this.phaseTimer / this.getPhaseDuration('player_attack');
        }
        
        return 0; // No circle during other phases
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
    
    // Get phase duration with modifiers
    getPhaseDuration(phase) {
        let duration = this.PHASE_DURATIONS[phase];
        
        // Apply dev console action speed modifier
        if (window.devConsole && window.devConsole.speedModifiers) {
            duration = duration * window.devConsole.speedModifiers.actionDuration;
        }
        
        // Apply RuneCred speed bonuses
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
            prayer: activityData.prayer || 0,  // Add prayer stat (default 0)
            dropTable: activityData.dropTable || [],
            xpRewards: activityData.xpPerKill || {}
        };
        
        this.monsterHp = this.currentMonster.maxHp;
        this.monsterMaxHp = this.currentMonster.maxHp;
        
        // Set up monster prayer
        this.monsterMaxPrayer = this.currentMonster.prayer || 0;
        this.monsterPrayerPoints = this.monsterMaxPrayer;
        
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
        this.combatPhase = 'player_attack';
        this.phaseTimer = 0;
        
        // Create UI
        this.createCombatUI();
        
        console.log(`Starting combat with ${this.currentMonster.name}`);
        return true;
    }
    
    // Update combat (called from Player update loop)
    updateCombat(deltaTime) {
        if (!this.inCombat) return;
        
        // Handle death animations
        if (this.monsterDying || this.playerDying) {
            this.deathAnimationTimer += deltaTime;
            
            // Check if it's time to respawn
            if (this.deathAnimationTimer >= this.DEATH_FADE_DURATION + this.RESPAWN_WAIT_DURATION) {
                if (this.pendingMonsterRespawn) {
                    this.executeMonsterRespawn();
                }
                if (this.pendingPlayerRespawn) {
                    this.executePlayerRespawn();
                }
            }
            
            // Update UI even during death animations
            this.updateCombatUI();
            return; // Don't process normal combat during death animations
        }
        
        // Update phase timer
        this.phaseTimer += deltaTime;
        
        // Get current phase duration
        const phaseDuration = this.getPhaseDuration(this.combatPhase);
        
        // Check if phase is complete
        if (this.phaseTimer >= phaseDuration) {
            this.completePhase();
            this.phaseTimer = 0;
            this.nextPhase();
        }
        
        // Update UI
        this.updateCombatUI();
    }
    
    // Complete the current phase action
completePhase() {
    switch(this.combatPhase) {
        case 'player_attack':
            this.executePlayerAttack();
            
            // Check for monster death immediately after player attack
            if (this.monsterHp <= 0) {
                this.handleMonsterDeath();
                // Monster died, flush XP and exit early
                this.flushXpBatch();
                return; // Don't continue to next phase
            }
            
            // Monster survived, flush XP from the attack
            this.flushXpBatch();
            break;
            
        case 'monster_attack':
            this.executeMonsterAttack();
            break;
            
        case 'eat_food':
            this.executeEatFood();
            break;
    }
}
    
    // Move to next phase
    nextPhase() {
        switch(this.combatPhase) {
            case 'player_attack':
                // Monster death is now checked in completePhase()
                this.combatPhase = 'monster_attack';
                break;
                
            case 'monster_attack':
                // Check for player death
                if (this.playerHp <= 0) {
                    this.handlePlayerDeath();
                    return;
                }
                
                // Determine if we should eat
                this.checkShouldEat();
                
                // ALWAYS go to eat phase (even if not eating, for timing)
                this.combatPhase = 'eat_food';
                break;
                
            case 'eat_food':
                // Back to player attack
                this.combatPhase = 'player_attack';
                break;
        }
    }
    
    // Execute player attack
    executePlayerAttack() {
    // Consume blessing for ranged/magic attacks
    if (this.combatStyle === 'ranged' || this.combatStyle === 'magic') {
        const blessing = window.equipmentPanels && window.equipmentPanels[this.combatStyle] ? 
            window.equipmentPanels[this.combatStyle].blessing : null;
        
        if (blessing && blessing.itemId) {
            // Check if we have the blessing item in bank
            const bankCount = bank.getItemCount(blessing.itemId);
            if (bankCount > 0) {
                // Consume one blessing from bank
                bank.withdraw(blessing.itemId, 1);
                
                // Update the blessing count in equipment
                const newCount = bank.getItemCount(blessing.itemId);
                if (newCount <= 0) {
                    // No more blessings, remove from equipment
                    window.equipmentPanels[this.combatStyle].blessing = null;
                    console.log(`Ran out of ${blessing.name} blessings`);
                    
                    // Try to auto-equip new ammo from bank
                    if (window.bank) {
                        console.log('Scanning bank for new ammo to equip...');
                        bank.scanAndEquipBestItems();
                    }
                    
                    // Update equipment UI if open
                    if (window.ui && window.ui.currentPanel === 'equipment') {
                        window.ui.updateEquipment();
                    }
                }
            } else {
                // No blessings in bank, remove from equipment
                window.equipmentPanels[this.combatStyle].blessing = null;
                console.log(`No ${blessing.name} in bank for ${this.combatStyle} attack`);
                
                // Try to auto-equip new ammo from bank
                if (window.bank) {
                    console.log('Scanning bank for new ammo to equip...');
                    bank.scanAndEquipBestItems();
                }
                
                // Update equipment UI if open
                if (window.ui && window.ui.currentPanel === 'equipment') {
                    window.ui.updateEquipment();
                }
            }
        }
    }
    
    // Animate player attack
    this.animateAttack(this.playerPanel, 'player');
    
    // Use centralized accuracy calculation
    const hitChance = this.calculatePlayerAccuracy();
    const hit = Math.random() < hitChance;
    
    if (hit) {
        // Calculate damage using centralized max hit calculation
        const maxHit = this.calculatePlayerMaxHit();
        const rawDamage = Math.max(1, Math.floor(Math.random() * (maxHit + 1)));
        
        // Clamp damage to monster's remaining HP
        const actualDamage = Math.min(rawDamage, this.monsterHp);
        
        // Apply damage
        this.monsterHp = Math.max(0, this.monsterHp - actualDamage);
        console.log(`Player hits ${actualDamage} damage (${this.monsterHp}/${this.monsterMaxHp} HP)`);
        
        // Show hitsplat with actual damage dealt
        this.showHitsplat(this.monsterPanel, actualDamage);
        
        // Flash monster panel
        this.flashPanel(this.monsterPanel, 'damage');
        
        // Batch combat XP based on ACTUAL damage dealt (4 XP per damage)
        if (this.currentTask) {
            this.batchXp(this.currentTask.skill, actualDamage * 4);
        }
        
        // Batch Hitpoints XP based on ACTUAL damage (1.33 XP per damage)
        this.batchXp('hitpoints', Math.floor(actualDamage * 1.33));
    } else {
        console.log('Player misses');
        // Show miss hitsplat
        this.showHitsplat(this.monsterPanel, 0);
    }
    
    // Drain player prayer after attack
    if (this.prayerPoints > 0) {
        this.prayerPoints--;
    }
}
    
    // Execute monster attack
    executeMonsterAttack() {
        // Animate monster attack
        this.animateAttack(this.monsterPanel, 'monster');
        
        // Use centralized accuracy calculation
        const hitChance = this.calculateMonsterAccuracy();
        
        if (Math.random() < hitChance) {
            // Monster hits - use centralized max hit calculation
            const maxHit = this.calculateMonsterMaxHit();
            const rawDamage = Math.max(1, Math.floor(Math.random() * (maxHit + 1)));
            
            // Clamp damage to player's remaining HP
            const actualDamage = Math.min(rawDamage, this.playerHp);
            
            // Apply damage
            this.playerHp = Math.max(0, this.playerHp - actualDamage);
            console.log(`Monster hits ${actualDamage} damage (${this.playerHp}/${this.playerMaxHp} HP)`);
            
            // Show hitsplat with actual damage dealt
            this.showHitsplat(this.playerPanel, actualDamage);
            
            // Flash player panel
            this.flashPanel(this.playerPanel, 'damage');
        } else {
            console.log('Monster misses');
            // Show miss hitsplat
            this.showHitsplat(this.playerPanel, 0);
        }
        
        // Drain monster prayer after attack
        if (this.monsterPrayerPoints > 0) {
            this.monsterPrayerPoints--;
        }
    }
    
    // Check if we should eat
    checkShouldEat() {
        this.shouldEatThisRound = false;
        this.foodToEat = null;
        
        const missingHp = this.playerMaxHp - this.playerHp;
        if (missingHp <= 0) return;
        
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
        
        if (foods.length === 0) return;
        
        // Sort foods by heal amount (smallest first)
        foods.sort((a, b) => a.healAmount - b.healAmount);
        
        // First, try to find optimal food (smallest that heals without waste)
        let optimalFood = null;
        for (const food of foods) {
            if (food.healAmount <= missingHp) {
                optimalFood = food; // Keep updating to find the largest that still fits
            } else {
                break; // Foods are sorted, no point checking larger heals
            }
        }
        
        // If we found optimal food, use it
        if (optimalFood) {
            this.shouldEatThisRound = true;
            this.foodToEat = optimalFood;
            return;
        }
        
        // No optimal food found - check if we're in danger (below 50% HP)
        const hpPercent = this.playerHp / this.playerMaxHp;
        if (hpPercent < 0.5) {
            // We're in danger and have no perfect food - eat the smallest available to minimize waste
            if (foods.length > 0) {
                this.shouldEatThisRound = true;
                this.foodToEat = foods[0]; // Smallest food (already sorted)
                console.log(`Emergency eating: ${foods[0].itemId} (wastes ${foods[0].healAmount - missingHp} HP)`);
            }
        }
    }
    
    executeEatFood() {
        // Only eat if we have food to eat
        if (this.foodToEat) {
            // Animate eating
            this.animateEating(this.playerPanel, this.foodToEat.itemId);
            
            // Consume food from bank
            bank.withdraw(this.foodToEat.itemId, 1);
            this.playerHp = Math.min(this.playerMaxHp, this.playerHp + this.foodToEat.healAmount);
            console.log(`Ate ${this.foodToEat.itemId} from bank, healed ${this.foodToEat.healAmount} HP`);
            
            // Show heal splat
            this.showHealSplat(this.playerPanel, this.foodToEat.healAmount);
            
            // Reset
            this.shouldEatThisRound = false;
            this.foodToEat = null;
        }
        // Even if not eating, this phase takes 1.2s for consistent timing
    }
    
    // Handle monster death
    handleMonsterDeath() {
        console.log(`Defeated ${this.currentMonster.name}!`);
        
        // Start death animation
        this.monsterDying = true;
        this.deathAnimationTimer = 0;
        this.pendingMonsterRespawn = true;
        
        // Apply death animation to monster panel
        const monsterImage = this.monsterPanel?.querySelector('.combat-character-image');
        if (monsterImage) {
            monsterImage.classList.add('combat-death-animation');
        }
        
        // Batch kill XP
        if (this.currentMonster.xpRewards) {
            for (const [skill, xp] of Object.entries(this.currentMonster.xpRewards)) {
                this.batchXp(skill, xp);
            }
        }
        
        // Flush any remaining XP
        this.flushXpBatch();
        
        // Store loot to give after animation
        this.pendingLoot = this.rollLoot(this.currentMonster.dropTable);
        
        // Show loot animation after 1.2 seconds
        if (this.pendingLoot && this.pendingLoot.length > 0) {
            setTimeout(() => {
                this.showLootAnimation(this.pendingLoot);
            }, 1200);
        }
    }
    
    // Execute the actual monster respawn after animation
    executeMonsterRespawn() {
        console.log('Respawning monster after death animation');
        
        // Give loot
        if (this.pendingLoot) {
            for (const drop of this.pendingLoot) {
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
            this.pendingLoot = null;
        }
        
        // CRITICAL: Sync with current task from task manager (in case it changed)
if (window.taskManager && taskManager.currentTask && taskManager.currentTask.isCombatTask) {
    // Check if this is still the right task or if it changed
    if (this.currentTask !== taskManager.currentTask) {
        console.log('Combat task changed, updating reference');
        this.currentTask = taskManager.currentTask;
        // Initialize killsCompleted if not set
        if (!this.currentTask.killsCompleted) {
            this.currentTask.killsCompleted = 0;
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
        this.removeCombatUI();
    }
}
        
        // Track kills this trip
        this.killsThisTrip++;
        
        // Reset monster HP and prayer
        this.monsterHp = this.monsterMaxHp;
        this.monsterPrayerPoints = this.monsterMaxPrayer;
        
        // Remove death animation and add respawn animation
        const monsterImage = this.monsterPanel?.querySelector('.combat-character-image');
        if (monsterImage) {
            monsterImage.classList.remove('combat-death-animation');
            monsterImage.classList.add('combat-respawn-animation');
            
            // Add shake to container
            const imageSection = this.monsterPanel?.querySelector('.combat-image-section');
            if (imageSection) {
                imageSection.classList.add('respawn-shake');
            }
            
            // Remove animations after they complete
            setTimeout(() => {
                monsterImage.classList.remove('combat-respawn-animation');
                if (imageSection) {
                    imageSection.classList.remove('respawn-shake');
                }
            }, 600);
        }
        
        // Reset death state
        this.monsterDying = false;
        this.pendingMonsterRespawn = false;
        this.deathAnimationTimer = 0;
        
        // Reset combat phase to continue fighting
        this.combatPhase = 'player_attack';
        this.phaseTimer = 0;
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
        console.log('Player died! Starting death animation...');
        
        // Start death animation
        this.playerDying = true;
        this.deathAnimationTimer = 0;
        this.pendingPlayerRespawn = true;
        
        // Apply death animation to player panel
        const playerImage = this.playerPanel?.querySelector('.combat-character-image');
        if (playerImage) {
            playerImage.classList.add('combat-death-animation');
        }
    }
    
    // Execute the actual player respawn after animation
    executePlayerRespawn() {
        console.log('Respawning player at Lumbridge bank...');
        
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
        
        // Reset death state
        this.playerDying = false;
        this.pendingPlayerRespawn = false;
        this.deathAnimationTimer = 0;
        
        // Remove UI
        this.removeCombatUI();
    }
    
    // Stop combat
    stopCombat() {
        this.inCombat = false;
        this.currentMonster = null;
        this.currentTask = null;
        
        // Remove UI
        this.removeCombatUI();
        
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
    
    // Calculate monster combat level using same formula as player
    calculateMonsterCombatLevel() {
        if (!this.currentMonster) return 1;
        
        const attack = this.currentMonster.attack || 1;
        const strength = this.currentMonster.strength || 1;
        const defence = this.currentMonster.defence || 1;
        const hitpoints = this.currentMonster.maxHp || 10;
        const prayer = this.currentMonster.prayer || 0;
        
        // Using the same formula as player combat level calculation
        const base = 0.25 * (defence + hitpoints + Math.floor(prayer / 2));
        const melee = 0.325 * (attack + strength);
        // Monsters typically don't have ranged/magic, but if they did:
        // const range = 0.325 * (Math.floor(ranged * 1.5));
        // const mage = 0.325 * (Math.floor(magic * 1.5));
        
        return Math.floor(base + melee);
    }
    
    // ==================== COMBAT UI METHODS ====================
    
    createCombatUI() {
        if (this.uiCreated) return;
        
        // Create player panel (left side)
        this.playerPanel = this.createPanel('player', 510, 180);
        
        // Create monster panel (right side)
        this.monsterPanel = this.createPanel('monster', 1550, 180);
        
        // Add panels to game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(this.playerPanel);
            gameContainer.appendChild(this.monsterPanel);
        }
        
        this.uiCreated = true;
        
        // Initial update
        this.updateCombatUI();
        
        // Fade in animation
        setTimeout(() => {
            this.playerPanel.style.opacity = '1';
            this.monsterPanel.style.opacity = '1';
        }, 10);
    }
    
    createPanel(type, x, y) {
        const panel = document.createElement('div');
        panel.className = `combat-panel combat-panel-${type}`;
        panel.style.left = `${x}px`;
        panel.style.top = `${y}px`;
        
        // Create inner structure
        panel.innerHTML = `
            <div class="combat-panel-inner">
                <!-- Character Image -->
                <div class="combat-image-section">
                    <img class="combat-character-image" src="" alt="${type}">
                    <img class="combat-food-overlay" src="" alt="food" style="display: none;">
                </div>
                
                <!-- Name and Combat Level -->
                <div class="combat-name-section">
                    <div class="combat-name"></div>
                    <div class="combat-level">Combat Level: </div>
                </div>
                
                <!-- HP Bar -->
                <div class="combat-hp-section">
                    <div class="combat-hp-bar">
                        <div class="combat-hp-fill"></div>
                        <div class="combat-hp-text">0/0 HP</div>
                    </div>
                </div>
                
                <!-- Prayer Bar -->
                <div class="combat-prayer-section">
                    <div class="combat-prayer-bar">
                        <div class="combat-prayer-fill"></div>
                        <div class="combat-prayer-text">0/0 Prayer</div>
                    </div>
                </div>
                
                <!-- Combat Stats Grid -->
                <div class="combat-stats-grid">
                    <div class="combat-stat">
                        <img src="assets/skills/hitpoints.png" class="combat-stat-icon">
                        <span class="combat-stat-value" data-stat="hitpoints">1</span>
                    </div>
                    <div class="combat-stat">
                        <img src="assets/skills/prayer.png" class="combat-stat-icon">
                        <span class="combat-stat-value" data-stat="prayer">1</span>
                    </div>
                    <div class="combat-stat">
                        <img src="assets/skills/attack.png" class="combat-stat-icon">
                        <span class="combat-stat-value" data-stat="attack">1</span>
                    </div>
                    <div class="combat-stat">
                        <img src="assets/skills/magic.png" class="combat-stat-icon">
                        <span class="combat-stat-value" data-stat="magic">1</span>
                    </div>
                    <div class="combat-stat">
                        <img src="assets/skills/strength.png" class="combat-stat-icon">
                        <span class="combat-stat-value" data-stat="strength">1</span>
                    </div>
                    <div class="combat-stat">
                        <img src="assets/skills/ranged.png" class="combat-stat-icon">
                        <span class="combat-stat-value" data-stat="ranged">1</span>
                    </div>
                    <div class="combat-stat">
                        <img src="assets/skills/defence.png" class="combat-stat-icon">
                        <span class="combat-stat-value" data-stat="defence">1</span>
                    </div>
                    <div class="combat-stat">
                        <img src="assets/skills/slayer.png" class="combat-stat-icon">
                        <span class="combat-stat-value" data-stat="slayer">1</span>
                    </div>
                </div>
                
                <!-- Gear & Combat Info -->
                <div class="combat-info-section">
                    <div class="combat-gear-scores">
                        <div class="combat-gear-score gear-melee">
                            <span class="gear-icon">⚔️</span> Melee: <span class="gear-value">+0</span>
                        </div>
                        <div class="combat-gear-score gear-ranged">
                            <span class="gear-icon">🏹</span> Ranged: <span class="gear-value">+0</span>
                        </div>
                        <div class="combat-gear-score gear-magic">
                            <span class="gear-icon">✨</span> Magic: <span class="gear-value">+0</span>
                        </div>
                    </div>
                    <div class="combat-calculations">
                        <div class="combat-max-hit">Max Hit: <span class="max-hit-value">0</span></div>
                        <div class="combat-accuracy">Accuracy: <span class="accuracy-value">0%</span></div>
                    </div>
                </div>
            </div>
        `;
        
        return panel;
    }
    
    updateCombatUI() {
        if (!this.uiCreated || !this.inCombat) return;
        
        // Update player panel
        this.updatePlayerPanel();
        
        // Update monster panel
        this.updateMonsterPanel();
    }
    
    updatePlayerPanel() {
        if (!this.playerPanel) return;
        
        // Update image
        const img = this.playerPanel.querySelector('.combat-character-image');
        img.src = 'assets/combat/player1.png';
        
        // Update name and combat level
        const playerName = window.firebaseManager ? (firebaseManager.username || 'Player') : 'Player';
        const combatLevel = skills.getCombatLevel();
        
        this.playerPanel.querySelector('.combat-name').textContent = playerName;
        this.playerPanel.querySelector('.combat-level').textContent = `Combat Level: ${combatLevel}`;
        
        // Update HP bar (clamp percentage between 0 and 100)
        const hpPercent = Math.max(0, Math.min(100, (this.playerHp / this.playerMaxHp) * 100));
        const hpFill = this.playerPanel.querySelector('.combat-hp-fill');
        hpFill.style.width = `${hpPercent}%`;
        
        // Color based on HP percentage
        if (hpPercent > 50) {
            hpFill.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
        } else if (hpPercent > 25) {
            hpFill.style.background = 'linear-gradient(90deg, #f39c12, #f1c40f)';
        } else {
            hpFill.style.background = 'linear-gradient(90deg, #c0392b, #e74c3c)';
        }
        
        this.playerPanel.querySelector('.combat-hp-text').textContent = `${this.playerHp}/${this.playerMaxHp} HP`;
        
        // Update Prayer bar
        const prayerPercent = (this.prayerPoints / this.maxPrayer) * 100;
        const prayerFill = this.playerPanel.querySelector('.combat-prayer-fill');
        prayerFill.style.width = `${prayerPercent}%`;
        this.playerPanel.querySelector('.combat-prayer-text').textContent = `${this.prayerPoints}/${this.maxPrayer} Prayer`;
        
        // Update combat stats
        const stats = ['hitpoints', 'prayer', 'attack', 'magic', 'strength', 'ranged', 'defence', 'slayer'];
        stats.forEach(stat => {
            const statElement = this.playerPanel.querySelector(`[data-stat="${stat}"]`);
            if (statElement) {
                let level = skills.getLevel(stat);
                // Apply prayer bonus for combat stats
                if (this.prayerPoints > 0 && ['attack', 'strength', 'defence'].includes(stat)) {
                    level = Math.floor(level * 1.5);
                    statElement.classList.add('prayer-boosted');
                } else {
                    statElement.classList.remove('prayer-boosted');
                }
                statElement.textContent = level;
            }
        });
        
        // Update gear scores
        if (window.gearScores) {
            this.playerPanel.querySelector('.gear-melee .gear-value').textContent = `+${gearScores.melee || 0}`;
            this.playerPanel.querySelector('.gear-ranged .gear-value').textContent = `+${gearScores.ranged || 0}`;
            this.playerPanel.querySelector('.gear-magic .gear-value').textContent = `+${gearScores.magic || 0}`;
        }
        
        // Highlight current combat style
        this.playerPanel.querySelectorAll('.combat-gear-score').forEach(el => el.classList.remove('active-style'));
        this.playerPanel.querySelector(`.gear-${this.combatStyle}`).classList.add('active-style');
        
        // Calculate and update max hit
        const maxHit = this.calculatePlayerMaxHit();
        this.playerPanel.querySelector('.max-hit-value').textContent = maxHit;
        
        // Calculate and update accuracy vs monster
        const accuracy = this.calculatePlayerAccuracy();
        this.playerPanel.querySelector('.accuracy-value').textContent = `${Math.round(accuracy * 100)}%`;
    }
    
    updateMonsterPanel() {
        if (!this.monsterPanel || !this.currentMonster) return;
        
        // Update image
        const img = this.monsterPanel.querySelector('.combat-character-image');
        img.src = `assets/combat/${this.currentMonster.name}.png`;
        
        // Update name and combat level (using proper formula)
        const monsterName = this.currentMonster.name.charAt(0).toUpperCase() + this.currentMonster.name.slice(1);
        const monsterCombatLevel = this.calculateMonsterCombatLevel();
        
        this.monsterPanel.querySelector('.combat-name').textContent = monsterName;
        this.monsterPanel.querySelector('.combat-level').textContent = `Combat Level: ${monsterCombatLevel}`;
        
        // Update HP bar (clamp percentage between 0 and 100)
        const hpPercent = Math.max(0, Math.min(100, (this.monsterHp / this.monsterMaxHp) * 100));
        const hpFill = this.monsterPanel.querySelector('.combat-hp-fill');
        hpFill.style.width = `${hpPercent}%`;
        hpFill.style.background = 'linear-gradient(90deg, #c0392b, #e74c3c)';
        this.monsterPanel.querySelector('.combat-hp-text').textContent = `${this.monsterHp}/${this.monsterMaxHp} HP`;
        
        // Update Prayer bar for monster
        const monsterPrayerPercent = this.monsterMaxPrayer > 0 ? 
            (this.monsterPrayerPoints / this.monsterMaxPrayer) * 100 : 0;
        const monsterPrayerFill = this.monsterPanel.querySelector('.combat-prayer-fill');
        monsterPrayerFill.style.width = `${monsterPrayerPercent}%`;
        this.monsterPanel.querySelector('.combat-prayer-text').textContent = 
            `${this.monsterPrayerPoints}/${this.monsterMaxPrayer} Prayer`;
        
        // Update monster stats
        this.monsterPanel.querySelector('[data-stat="hitpoints"]').textContent = this.currentMonster.maxHp;
        this.monsterPanel.querySelector('[data-stat="prayer"]').textContent = this.currentMonster.prayer || 0;
        
        // Apply prayer boost visual to monster stats if prayer is active
        const monsterStatElements = ['attack', 'strength', 'defence'];
        monsterStatElements.forEach(stat => {
            const statElement = this.monsterPanel.querySelector(`[data-stat="${stat}"]`);
            if (statElement) {
                let level = this.currentMonster[stat] || 1;
                if (this.monsterPrayerPoints > 0) {
                    level = Math.floor(level * 1.5);
                    statElement.classList.add('prayer-boosted');
                } else {
                    statElement.classList.remove('prayer-boosted');
                }
                statElement.textContent = level;
            }
        });
        
        // Update non-combat stats
        this.monsterPanel.querySelector('[data-stat="magic"]').textContent = '1';
        this.monsterPanel.querySelector('[data-stat="ranged"]').textContent = '1';
        this.monsterPanel.querySelector('[data-stat="slayer"]').textContent = '1';
        
        // Monster doesn't have gear scores
        this.monsterPanel.querySelector('.gear-melee .gear-value').textContent = '+0';
        this.monsterPanel.querySelector('.gear-ranged .gear-value').textContent = '+0';
        this.monsterPanel.querySelector('.gear-magic .gear-value').textContent = '+0';
        
        // Calculate monster max hit using centralized function
        const monsterMaxHit = this.calculateMonsterMaxHit();
        this.monsterPanel.querySelector('.max-hit-value').textContent = monsterMaxHit;
        
        // Calculate monster accuracy vs player
        const monsterAccuracy = this.calculateMonsterAccuracy();
        this.monsterPanel.querySelector('.accuracy-value').textContent = `${Math.round(monsterAccuracy * 100)}%`;
    }
    
    // ==================== CENTRALIZED COMBAT CALCULATIONS ====================
    // These 4 methods are the ONLY place combat math should happen
    
    calculatePlayerMaxHit() {
    let strengthLevel, gearBonus;
    
    if (this.combatStyle === 'melee') {
        strengthLevel = skills.getLevel('strength');
        gearBonus = window.gearScores ? window.gearScores.melee : 0;
    } else if (this.combatStyle === 'ranged') {
        strengthLevel = skills.getLevel('ranged');
        gearBonus = window.gearScores ? window.gearScores.ranged : 0;
    } else {
        strengthLevel = skills.getLevel('magic');
        gearBonus = window.gearScores ? window.gearScores.magic : 0;
    }
    
    // Apply prayer bonus
    if (this.prayerPoints > 0) {
        strengthLevel = Math.floor(strengthLevel * 1.5);
    }

    let maxHit = Math.max(1, Math.ceil((strengthLevel + gearBonus + 4) / 4));
    
    // Apply penalty if using ranged/magic without blessing
    if (this.combatStyle === 'ranged' || this.combatStyle === 'magic') {
        const blessing = window.equipmentPanels && window.equipmentPanels[this.combatStyle] ? 
            window.equipmentPanels[this.combatStyle].blessing : null;
        if (!blessing) {
            maxHit = Math.floor(maxHit / 2);
        }
    }
    
    return maxHit;
}
    
    calculatePlayerAccuracy() {
    if (!this.currentMonster) return 0;
    
    let attackLevel, gearBonus;
    
    if (this.combatStyle === 'melee') {
        attackLevel = skills.getLevel('attack');
        gearBonus = window.gearScores ? window.gearScores.melee : 0;
    } else if (this.combatStyle === 'ranged') {
        attackLevel = skills.getLevel('ranged');
        gearBonus = window.gearScores ? window.gearScores.ranged : 0;
    } else {
        attackLevel = skills.getLevel('magic');
        gearBonus = window.gearScores ? window.gearScores.magic : 0;
    }
    
    // Apply prayer bonus
    if (this.prayerPoints > 0) {
        attackLevel = Math.floor(attackLevel * 1.5);
    }
    
    let hitChance = (attackLevel + gearBonus + 12) / (4 * (this.currentMonster.defence + 8));
    
    // Apply penalty if using ranged/magic without blessing
    if (this.combatStyle === 'ranged' || this.combatStyle === 'magic') {
        const blessing = window.equipmentPanels && window.equipmentPanels[this.combatStyle] ? 
            window.equipmentPanels[this.combatStyle].blessing : null;
        if (!blessing) {
            hitChance = hitChance / 2;
        }
    }
    
    return Math.max(0.05, Math.min(0.95, hitChance));
}
    
    calculateMonsterAccuracy() {
        let defenceLevel = skills.getLevel('defence');
        const defenceBonus = window.gearScores ? Math.floor(window.gearScores[this.combatStyle] / 10) : 0;
        
        // Apply prayer bonus to player defence
        if (this.prayerPoints > 0) {
            defenceLevel = Math.floor(defenceLevel * 1.5);
        }
        
        // Get monster attack (with prayer bonus if active)
        let monsterAttack = this.currentMonster.attack;
        if (this.monsterPrayerPoints > 0) {
            monsterAttack = Math.floor(monsterAttack * 1.5);
        }
        
        const hitChance = (monsterAttack + 12) / (4 * (defenceLevel + defenceBonus + 8));
        return Math.max(0.05, Math.min(0.95, hitChance));
    }
    
    calculateMonsterMaxHit() {
        if (!this.currentMonster) return 1;
        
        // Get monster strength (with prayer bonus if active)
        let monsterStrength = this.currentMonster.strength;
        if (this.monsterPrayerPoints > 0) {
            monsterStrength = Math.floor(monsterStrength * 1.5);
        }
        
        return Math.max(1, Math.ceil((monsterStrength + 4) / 4));
    }
    
    // Animation methods
    animateAttack(panel, type) {
    if (!panel) return;
    
    const characterImage = panel.querySelector('.combat-character-image');
    characterImage.classList.add('combat-attack-animation');
    setTimeout(() => {
        characterImage.classList.remove('combat-attack-animation');
    }, 300);
}
    
    animateEating(panel, foodId) {
        if (!panel) return;
        
        const foodOverlay = panel.querySelector('.combat-food-overlay');
        foodOverlay.src = `assets/items/${foodId}.png`;
        foodOverlay.style.display = 'block';
        foodOverlay.classList.add('combat-eat-animation');
        
        setTimeout(() => {
            foodOverlay.style.display = 'none';
            foodOverlay.classList.remove('combat-eat-animation');
        }, 800);
    }
    
    showHitsplat(panel, damage) {
        if (!panel) return;
        
        const hitsplat = document.createElement('div');
        hitsplat.className = damage > 0 ? 'combat-hitsplat' : 'combat-hitsplat-miss';
        hitsplat.textContent = damage > 0 ? damage : 'Miss';
        
        const imageSection = panel.querySelector('.combat-image-section');
        imageSection.appendChild(hitsplat);
        
        setTimeout(() => {
            hitsplat.remove();
        }, 1500);
    }
    
    showHealSplat(panel, amount) {
        if (!panel) return;
        
        const healsplat = document.createElement('div');
        healsplat.className = 'combat-healsplat';
        healsplat.textContent = `+${amount}`;
        
        const imageSection = panel.querySelector('.combat-image-section');
        imageSection.appendChild(healsplat);
        
        setTimeout(() => {
            healsplat.remove();
        }, 1500);
    }
    
    flashPanel(panel, type = 'damage') {
        if (!panel) return;
        
        panel.classList.add(`combat-panel-flash-${type}`);
        setTimeout(() => {
            panel.classList.remove(`combat-panel-flash-${type}`);
        }, 200);
    }
    
    removeCombatUI() {
        if (this.playerPanel) {
            // Fade out animation
            this.playerPanel.style.opacity = '0';
            setTimeout(() => {
                if (this.playerPanel && this.playerPanel.parentNode) {
                    this.playerPanel.parentNode.removeChild(this.playerPanel);
                }
                this.playerPanel = null;
            }, 300);
        }
        
        if (this.monsterPanel) {
            // Fade out animation
            this.monsterPanel.style.opacity = '0';
            setTimeout(() => {
                if (this.monsterPanel && this.monsterPanel.parentNode) {
                    this.monsterPanel.parentNode.removeChild(this.monsterPanel);
                }
                this.monsterPanel = null;
            }, 300);
        }
        
        this.uiCreated = false;
    }

    // Show loot animation
    showLootAnimation(loot) {
        if (!loot || loot.length === 0) return;
        if (!this.monsterPanel) return;
        
        // Create loot display container
        const lootContainer = document.createElement('div');
        lootContainer.className = 'combat-loot-display';
        
        // Add each loot item
        for (const drop of loot) {
            const itemElement = this.createLootItemElement(drop.itemId, drop.quantity);
            lootContainer.appendChild(itemElement);
        }
        
        // Add to monster's image section (like hitsplats)
        const imageSection = this.monsterPanel.querySelector('.combat-image-section');
        if (imageSection) {
            imageSection.appendChild(lootContainer);
        }
        
        // Start animation
        setTimeout(() => {
            lootContainer.classList.add('loot-animate');
        }, 10);
        
        // Remove after animation completes (3 seconds)
        setTimeout(() => {
            if (lootContainer.parentNode) {
                lootContainer.parentNode.removeChild(lootContainer);
            }
        }, 3000);
    }
    
    // Create individual loot item element
    createLootItemElement(itemId, quantity) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'loot-item';
        
        // Get item data
        const items = loadingManager.getData('items');
        const itemData = items[itemId];
        
        // Determine image source
        let imageSrc;
        if (itemId === 'coins') {
            // Use special coin images based on quantity
            const coinImage = window.ui ? ui.getCoinImage(quantity) : 'coins_1';
            imageSrc = `assets/items/${coinImage}.png`;
        } else {
            imageSrc = `assets/items/${itemId}.png`;
        }
        
        // Create image
        const img = document.createElement('img');
        img.src = imageSrc;
        img.alt = itemData ? itemData.name : itemId;
        itemDiv.appendChild(img);
        
        // Add quantity badge if more than 1
        if (quantity > 1) {
            const quantityBadge = document.createElement('div');
            quantityBadge.className = 'loot-quantity';
            quantityBadge.textContent = this.formatQuantity(quantity);
            itemDiv.appendChild(quantityBadge);
        }
        
        return itemDiv;
    }
    
    // Format quantity for display (K, M notation)
    formatQuantity(quantity) {
        if (quantity >= 1000000) {
            return Math.floor(quantity / 1000000) + 'M';
        } else if (quantity >= 10000) {
            return Math.floor(quantity / 1000) + 'K';
        }
        return quantity.toString();
    }
    
}

// Make CombatManager available globally
window.CombatManager = CombatManager;
