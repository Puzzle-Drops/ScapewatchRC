class TestScenario {
    constructor() {
        this.enabled = true; // Set to false to disable test scenario
    }

    run() {
        if (!this.enabled) {
            console.log('Test scenario disabled');
            return;
        }

        console.log('Running test scenario...');

        // Set player starting position
        //this.setPlayerPosition();

        // Set skill levels (each on its own line for easy modification)
        this.setSkillLevels();
        
        // Set pets for skills
        //this.setPets();
        
        // Set capes/speed bonuses
        //this.setCapes();
        
        // Set currency/credits
        //this.setCredits();

        // Add items to bank
        this.populateBank();

        // Add some items to inventory for testing
        //this.populateInventory();

        // Set up specific test tasks
        //this.setupTestTasks();

        // Add bait and feathers for fishing activities that need them
        bank.deposit('fishing_bait', 1000000);
        bank.deposit('feather', 1000000);
        
        // Add runecrafting supplies
        bank.deposit('rune_essence', 1000000);
        bank.deposit('small_pouch', 1);
        bank.deposit('medium_pouch', 1);
        bank.deposit('large_pouch', 1);
        bank.deposit('giant_pouch', 1);

        console.log('Test scenario complete!');
    }

    setPlayerPosition() {
        // Start at Lumbridge Bank for easy access
        player.position.x = 4361;
        player.position.y = 1903;
        player.currentNode = 'lumbridge_bank';
        
        // Update camera to match
        if (window.map) {
            map.camera.x = player.position.x;
            map.camera.y = player.position.y;
        }
    }

    setSkillLevels() {
        // Each skill on its own line for easy modification
        this.setSkillLevel('attack', 90);
        this.setSkillLevel('strength', 90);
        this.setSkillLevel('defence', 90);
        this.setSkillLevel('hitpoints', 90);
        this.setSkillLevel('ranged', 90);
        this.setSkillLevel('magic', 90);
        this.setSkillLevel('prayer', 90);
        this.setSkillLevel('woodcutting', 90);
        this.setSkillLevel('mining', 90);
        this.setSkillLevel('fishing', 90);
        this.setSkillLevel('cooking', 90);
        this.setSkillLevel('crafting', 90);
        this.setSkillLevel('smithing', 90);
        this.setSkillLevel('agility', 90);
        this.setSkillLevel('thieving', 90);
        this.setSkillLevel('runecraft', 90);
        this.setSkillLevel('hunter', 90);
        this.setSkillLevel('farming', 90);
        this.setSkillLevel('slayer', 90);
        this.setSkillLevel('herblore', 90);
        this.setSkillLevel('fletching', 90);
        this.setSkillLevel('construction', 90);
        this.setSkillLevel('firemaking', 90);

        // Force UI update after setting all levels
        if (window.ui) {
            window.ui.updateSkillsList();
        }
        
        // Update speed bonuses based on new levels
        if (window.runeCreditManager) {
            runeCreditManager.updateSpeedBonuses();
        }
    }

    setSkillLevel(skillId, level) {
        const targetXp = getXpForLevel(level);
        const skill = skills.skills[skillId];
        if (skill) {
            skill.xp = targetXp;
            skill.level = level;
            skill.xpForNextLevel = getXpForLevel(level + 1);
            console.log(`Set ${skillId} to level ${level}`);
        }
    }
    
    // ==================== NEW PET MANAGEMENT ====================
    
    setPets() {
        // Give pets to specific skills
        // Each line can be easily commented/uncommented
        this.givePet('woodcutting', 1, false);  // 1 regular woodcutting pet
        this.givePet('woodcutting', 1, true);   // 1 shiny woodcutting pet
        this.givePet('mining', 2, false);       // 2 regular mining pets
        this.givePet('fishing', 1, false);      // 1 regular fishing pet
        this.givePet('agility', 1, true);       // 1 shiny agility pet
        
        console.log('Pets configured');
    }
    
    // Give a specific number of pets (regular or shiny) to a skill
    givePet(skillId, count = 1, isShiny = false) {
        if (!window.runeCreditManager) {
            console.error('RuneCreditManager not initialized');
            return;
        }
        
        // Initialize pet counts if needed
        if (!runeCreditManager.petCounts[skillId]) {
            runeCreditManager.petCounts[skillId] = { regular: 0, shiny: 0 };
        }
        
        if (isShiny) {
            runeCreditManager.petCounts[skillId].shiny += count;
            runeCreditManager.totalShinyPetsObtained += count;
            runeCreditManager.totalPetsObtained += count;
            runeCreditManager.speedBonuses.shinyPets[skillId] = true;
            console.log(`Gave ${count} shiny ${skillId} pet(s)`);
        } else {
            runeCreditManager.petCounts[skillId].regular += count;
            runeCreditManager.totalPetsObtained += count;
            runeCreditManager.speedBonuses.pets[skillId] = true;
            console.log(`Gave ${count} regular ${skillId} pet(s)`);
        }
        
        // Save changes
        runeCreditManager.saveData();
    }
    
    // Give all skills a pet (regular and/or shiny)
    giveAllPets(regular = true, shiny = false) {
        const skillsData = loadingManager.getData('skills');
        for (const skillId of Object.keys(skillsData)) {
            if (regular) this.givePet(skillId, 1, false);
            if (shiny) this.givePet(skillId, 1, true);
        }
        console.log(`Gave all skills pets (regular: ${regular}, shiny: ${shiny})`);
    }
    
    // Clear all pets
    clearAllPets() {
        if (!window.runeCreditManager) return;
        
        const skillsData = loadingManager.getData('skills');
        for (const skillId of Object.keys(skillsData)) {
            runeCreditManager.petCounts[skillId] = { regular: 0, shiny: 0 };
            runeCreditManager.speedBonuses.pets[skillId] = false;
            runeCreditManager.speedBonuses.shinyPets[skillId] = false;
        }
        
        runeCreditManager.totalPetsObtained = 0;
        runeCreditManager.totalShinyPetsObtained = 0;
        runeCreditManager.saveData();
        
        console.log('Cleared all pets');
    }
    
    // ==================== NEW CAPE MANAGEMENT ====================
    
    setCapes() {
        // Set specific capes/speed bonuses
        // Each line can be easily commented/uncommented
        this.giveSkillCape('woodcutting');
        this.giveSkillCape('mining');
        this.giveTrimmedCape('fishing');
        // this.giveMaxCape();
        // this.giveTrimmedMaxCape();
        
        console.log('Capes configured');
    }
    
    // Give a skill cape (99+ in skill)
    giveSkillCape(skillId) {
        if (!window.runeCreditManager) return;
        
        // Set skill to 99 if not already
        if (skills.getLevel(skillId) < 99) {
            this.setSkillLevel(skillId, 99);
        }
        
        runeCreditManager.speedBonuses.skillCapes[skillId] = true;
        runeCreditManager.saveData();
        console.log(`Gave ${skillId} skill cape`);
    }
    
    // Give a trimmed skill cape (200M XP in skill)
    giveTrimmedCape(skillId) {
        if (!window.runeCreditManager) return;
        
        // Set skill to 200M XP
        const skill = skills.skills[skillId];
        if (skill) {
            skill.xp = 200000000;
            skill.level = 99;
            skill.xpForNextLevel = 200000000;
        }
        
        runeCreditManager.speedBonuses.skillCapes[skillId] = true;
        runeCreditManager.speedBonuses.trimmedCapes[skillId] = true;
        runeCreditManager.saveData();
        console.log(`Gave ${skillId} trimmed cape (200M XP)`);
    }
    
    // Give max cape (all skills 99)
    giveMaxCape() {
        this.maxAllSkills();
        
        if (window.runeCreditManager) {
            runeCreditManager.speedBonuses.maxCape = true;
            
            // Also set all skill capes
            const skillsData = loadingManager.getData('skills');
            for (const skillId of Object.keys(skillsData)) {
                runeCreditManager.speedBonuses.skillCapes[skillId] = true;
            }
            
            runeCreditManager.saveData();
        }
        
        console.log('Gave max cape (all skills 99)');
    }
    
    // Give trimmed max cape (all skills 200M XP)
    giveTrimmedMaxCape() {
        const skillsData = loadingManager.getData('skills');
        
        for (const skillId of Object.keys(skillsData)) {
            const skill = skills.skills[skillId];
            if (skill) {
                skill.xp = 200000000;
                skill.level = 99;
                skill.xpForNextLevel = 200000000;
            }
        }
        
        if (window.runeCreditManager) {
            runeCreditManager.speedBonuses.maxCape = true;
            runeCreditManager.speedBonuses.trimmedMaxCape = true;
            
            // Also set all skill capes and trimmed capes
            for (const skillId of Object.keys(skillsData)) {
                runeCreditManager.speedBonuses.skillCapes[skillId] = true;
                runeCreditManager.speedBonuses.trimmedCapes[skillId] = true;
            }
            
            runeCreditManager.saveData();
        }
        
        console.log('Gave trimmed max cape (all skills 200M XP)');
    }
    
    // ==================== NEW CREDIT MANAGEMENT ====================
    
    setCredits() {
        // Set various credit types
        // Each line can be easily commented/uncommented
        this.setRuneCred(100);
        this.setSkillCredSpent(50);  // How much Skill Cred has been spent
        this.setSkillCredits('woodcutting', 50);
        this.setSkillCredits('mining', 30);
        this.setSkillCredits('fishing', 25);
        
        console.log('Credits configured');
    }
    
    // Set Rune Cred amount
    setRuneCred(amount) {
        if (!window.runeCreditManager) return;
        
        runeCreditManager.runeCred = amount;
        runeCreditManager.saveData();
        console.log(`Set Rune Cred to ${amount}`);
    }
    
    // Set how much Skill Cred has been spent (affects available Skill Cred)
    setSkillCredSpent(amount) {
        if (!window.runeCreditManager) return;
        
        runeCreditManager.skillCredSpent = amount;
        runeCreditManager.saveData();
        
        const available = runeCreditManager.getAvailableSkillCred();
        const total = runeCreditManager.skillCred;
        console.log(`Set Skill Cred spent to ${amount} (${available}/${total} available)`);
    }
    
    // Set skill-specific credits for a skill
    setSkillCredits(skillId, amount) {
        if (!window.runeCreditManager) return;
        
        runeCreditManager.skillCredits[skillId] = amount;
        runeCreditManager.saveData();
        console.log(`Set ${skillId} credits to ${amount}`);
    }
    
    // Give credits to all skills
    giveAllSkillCredits(amount) {
        if (!window.runeCreditManager) return;
        
        const skillsData = loadingManager.getData('skills');
        for (const skillId of Object.keys(skillsData)) {
            runeCreditManager.skillCredits[skillId] = amount;
        }
        
        runeCreditManager.saveData();
        console.log(`Set all skill credits to ${amount}`);
    }
    
    // Simulate completing tasks to earn credits
    simulateTaskCompletions(count = 10, skillId = null) {
        if (!window.runeCreditManager) return;
        
        for (let i = 0; i < count; i++) {
            const task = skillId ? { skill: skillId } : {};
            runeCreditManager.onTaskComplete(task);
        }
        
        console.log(`Simulated ${count} task completions${skillId ? ` for ${skillId}` : ''}`);
    }
    
    // ==================== EXISTING METHODS ====================

    populateBank() {
    const allItems = loadingManager.getData('items');
    
    bank.deposit('coins', 9999000);
    
    let count = 0;
    let skipped = 0;
    
    // Add 1000 of each item to bank (except noted items)
    for (const [itemId, itemData] of Object.entries(allItems)) {
        // Skip noted items - they shouldn't be in the bank directly
        if (itemData.category === 'note') {
            skipped++;
            continue;
        }
        bank.deposit(itemId, 1000);
        count++;
    }
    
    console.log(`Added 1000 of each item to bank (${count} items, skipped ${skipped} noted items)`);
}

    populateInventory() {
        // Add some common items to inventory for testing
        inventory.addItem('coins', 5);
        inventory.addItem('raw_shrimps', 26);
        
        console.log('Added test items to inventory');
    }

    setupTestTasks() {
        // Clear existing tasks first
        if (window.taskManager) {
            taskManager.clearTasks();
            
            // Task 1: Hunt Birds (Current Task)
            const huntBirdsTask = {
                skill: 'hunter',
                itemId: 'hunter_birds',
                targetCount: 20,
                nodeId: 'test_hunter',
                activityId: 'hunt_birds',
                description: 'Hunt 20 birds at Test Hunter',
                startingCount: 0,
                progress: 0,
                isHuntingTask: true,
                successfulCatches: 0
            };

            // Task 2: Hunt Butterflies (Next Task)
            const huntButterfliesTask = {
                skill: 'hunter',
                itemId: 'hunter_butterflies',
                targetCount: 20,
                nodeId: 'test_hunter',
                activityId: 'hunt_butterflies',
                description: 'Hunt 20 butterflies at Test Hunter',
                startingCount: 0,
                progress: 0,
                isHuntingTask: true,
                successfulCatches: 0
            };
            
            // Task 3: Hunt Kebbits
            const huntKebbitsTask = {
                skill: 'hunter',
                itemId: 'hunter_kebbits',
                targetCount: 20,
                nodeId: 'test_hunter',
                activityId: 'hunt_kebbits',
                description: 'Hunt 20 kebbits at Test Hunter',
                startingCount: 0,
                progress: 0,
                isHuntingTask: true,
                successfulCatches: 0
            };
            
            // Task 4: Hunt Chinchompas
            const huntChinchompasTask = {
                skill: 'hunter',
                itemId: 'chinchompa',
                targetCount: 20,
                nodeId: 'test_hunter',
                activityId: 'hunt_chinchompas',
                description: 'Hunt 20 chinchompas at Test Hunter',
                startingCount: 0,
                progress: 0,
                isHuntingTask: true,
                successfulCatches: 0
            };
            
            // Task 5: Hunt Moths
            const huntMothsTask = {
                skill: 'hunter',
                itemId: 'hunter_moths',
                targetCount: 20,
                nodeId: 'test_hunter',
                activityId: 'hunt_moths',
                description: 'Hunt 20 moths at Test Hunter',
                startingCount: 0,
                progress: 0,
                isHuntingTask: true,
                successfulCatches: 0
            };
            
            // Task 6: Hunt Salamanders
            const huntSalamandersTask = {
                skill: 'hunter',
                itemId: 'hunter_salamanders',
                targetCount: 20,
                nodeId: 'test_hunter',
                activityId: 'hunt_salamanders',
                description: 'Hunt 20 salamanders at Test Hunter',
                startingCount: 0,
                progress: 0,
                isHuntingTask: true,
                successfulCatches: 0
            };
            
            // Task 7: Hunt Herbiboars
            const huntHerbiboarsTask = {
                skill: 'hunter',
                itemId: 'hunter_herbiboars',
                targetCount: 5,
                nodeId: 'test_hunter',
                activityId: 'hunt_herbiboars',
                description: 'Hunt 5 herbiboars at Test Hunter',
                startingCount: 0,
                progress: 0,
                isHuntingTask: true,
                successfulCatches: 0
            };
            
            // Note: We only have 7 task slots (current, next, and 5 regular)
            // So we'll put birdhouse in the regular tasks
            const huntBirdhouseTask = {
                skill: 'hunter',
                itemId: 'hunter_birdhouse',
                targetCount: 2,
                nodeId: 'test_hunter',
                activityId: 'hunt_birdhouse',
                description: 'Check 2 birdhouses at Test Hunter',
                startingCount: 0,
                progress: 0,
                isHuntingTask: true,
                successfulCatches: 0
            };
            
            // Set up the task structure
            taskManager.currentTask = huntBirdsTask;
            taskManager.nextTask = huntButterfliesTask;
            taskManager.tasks = [
                huntKebbitsTask, 
                huntChinchompasTask, 
                huntMothsTask, 
                huntSalamandersTask, 
                huntHerbiboarsTask
            ];
            
            // Note: If you want to include birdhouse, you could replace one of the tasks
            // or wait for one to complete and it will generate naturally
            
            console.log('Set up hunter test tasks:');
            console.log('Current:', huntBirdsTask.description);
            console.log('Next:', huntButterfliesTask.description);
            taskManager.tasks.forEach((task, index) => {
                console.log(`Task ${index + 1}:`, task.description);
            });
            
            // Update UI to show the new tasks
            if (window.ui) {
                window.ui.updateTasks();
            }
            
            // Notify AI to start working on the current task
            if (window.ai) {
                window.ai.currentTask = null;
                window.ai.decisionCooldown = 0;
            }
        }
    }

    getCurrentItemCount(itemId) {
        let count = 0;
        
        if (window.inventory) {
            count += inventory.getItemCount(itemId);
        }
        
        if (window.bank) {
            count += bank.getItemCount(itemId);
        }
        
        return count;
    }

    // ==================== UTILITY METHODS ====================
    
    giveAllItems(quantity = 100) {
    const allItems = loadingManager.getData('items');
    let count = 0;
    let skipped = 0;
    
    for (const [itemId, itemData] of Object.entries(allItems)) {
        // Skip noted items
        if (itemData.category === 'note') {
            skipped++;
            continue;
        }
        bank.deposit(itemId, quantity);
        count++;
    }
    
    console.log(`Added ${quantity} of each item to bank (${count} items, skipped ${skipped} noted items)`);
}

    maxAllSkills() {
        for (const skillId of Object.keys(skills.skills)) {
            this.setSkillLevel(skillId, 99);
        }
        console.log('Set all skills to level 99');
        
        // Update speed bonuses
        if (window.runeCreditManager) {
            runeCreditManager.updateSpeedBonuses();
        }
    }

    resetPlayer() {
        // Reset to default position
        player.position.x = 4395;
        player.position.y = 1882;
        player.currentNode = 'lumbridge_bank';
        player.stopActivity();
        player.path = [];
        player.pathIndex = 0;
        player.targetPosition = null;
        player.targetNode = null;
        
        console.log('Reset player to Lumbridge bank');
    }

    // Method to quickly set up fishing -> cooking test
    setupFishingCookingTest() {
        // Clear bank and inventory first
        inventory.clear();
        
        // Give player some raw shrimps to start cooking task testing
        bank.deposit('raw_shrimps', 100);
        
        // Give bait for other fishing activities
        bank.deposit('fishing_bait', 1000);
        bank.deposit('feather', 1000);
        
        // Set up the specific test tasks
        this.setupTestTasks();
        
        console.log('Set up fishing -> cooking test scenario');
    }

    // Method to test task completion
    completeCurrentTask() {
        if (window.taskManager && taskManager.currentTask) {
            // For gathering tasks, add items to complete
            if (!taskManager.currentTask.isCookingTask && !taskManager.currentTask.isRunecraftingTask) {
                const needed = taskManager.currentTask.targetCount;
                bank.deposit(taskManager.currentTask.itemId, needed);
                taskManager.updateTaskProgress(taskManager.currentTask);
            } else if (taskManager.currentTask.isCookingTask) {
                // For cooking tasks, set the consumption counter
                taskManager.currentTask.rawFoodConsumed = taskManager.currentTask.targetCount;
                taskManager.setTaskProgress(taskManager.currentTask, 1);
            } else if (taskManager.currentTask.isRunecraftingTask) {
                // For runecrafting tasks, set trips completed
                taskManager.currentTask.tripsCompleted = taskManager.currentTask.targetCount;
                taskManager.setTaskProgress(taskManager.currentTask, 1);
            }
            
            console.log('Completed current task:', taskManager.currentTask.description);
        }
    }
    
    // ==================== DEBUG HELPERS ====================
    
    // Show current RuneCred state
    showCreditStatus() {
        if (!window.runeCreditManager) {
            console.log('RuneCreditManager not initialized');
            return;
        }
        
        console.log('=== CREDIT STATUS ===');
        console.log(`Rune Cred: ${runeCreditManager.runeCred}`);
        console.log(`Skill Cred: ${runeCreditManager.getAvailableSkillCred()}/${runeCreditManager.skillCred}`);
        console.log(`Tasks Completed: ${runeCreditManager.totalTasksCompleted}`);
        
        // Show skill-specific credits
        console.log('\n=== SKILL CREDITS ===');
        const skillsData = loadingManager.getData('skills');
        for (const skillId of Object.keys(skillsData)) {
            const credits = runeCreditManager.getSkillCredits(skillId);
            if (credits > 10) { // Only show if more than starting amount
                console.log(`${skillId}: ${credits}`);
            }
        }
        
        // Show pets
        const petStats = runeCreditManager.getGlobalPetStats();
        if (petStats.total > 0) {
            console.log(`\n=== PETS ===`);
            console.log(`Total: ${petStats.total} (${petStats.regular} regular, ${petStats.shiny} shiny)`);
        }
        
        // Show speed bonuses
        console.log('\n=== SPEED BONUSES ===');
        if (runeCreditManager.speedBonuses.maxCape) console.log('Max Cape: Active');
        if (runeCreditManager.speedBonuses.trimmedMaxCape) console.log('Trimmed Max Cape: Active');
    }
    
    // Enable credit persistence
    enableCreditPersistence() {
        if (window.runeCreditManager) {
            runeCreditManager.togglePersistence(true);
            console.log('Credit persistence enabled - data will be saved to localStorage');
        }
    }
    
    // Disable credit persistence
    disableCreditPersistence() {
        if (window.runeCreditManager) {
            runeCreditManager.togglePersistence(false);
            console.log('Credit persistence disabled - data will not be saved');
        }
    }
}

// Create global instance
window.testScenario = new TestScenario();
