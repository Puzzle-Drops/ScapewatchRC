class RuneCreditManager {
    constructor() {
        // TOGGLE THIS FLAG TO ENABLE/DISABLE SAVING AND LOADING
        this.enablePersistence = false; // Set to true to enable localStorage save/load
        
        // Three-tier credit system
        this.skillCredits = {}; // skillId -> amount (start at 10)
        this.skillCred = 0; // total level (calculated dynamically)
        this.runeCred = 5; // Universal currency (start at 5)
        
        // Track Skill Cred spent separately
        this.skillCredSpent = 0; // Track how much Skill Cred has been spent
        
        // Track total tasks completed
        this.totalTasksCompleted = 0;
        this.tasksPerSkill = {}; // skillId -> count
        
        // Track modification levels (-10 to +10) for each modifier
        this.maxModificationLevel = 10;
        this.skillModLevels = {}; // skillId -> level (-10 to +10)
        this.taskModLevels = {}; // skillId -> { itemId -> level }
        this.nodeModLevels = {}; // skillId -> { nodeId -> level }
        this.quantityModLevels = {}; // skillId -> { itemId -> level }
        
        // Track total credits spent per skill (for display)
        this.creditsSpentPerSkill = {}; // skillId -> amount spent
        
        // Speed bonuses - UPDATED STRUCTURE
        this.speedBonuses = {
            pets: {}, // skillId -> true/false (has at least one pet)
            shinyPets: {}, // skillId -> true/false (has at least one shiny pet)
            skillCapes: {}, // skillId -> true/false
            trimmedCapes: {}, // skillId -> true/false (50M XP in that skill)
            maxCape: false, // All skills 99
            trimmedMaxCape: false // All skills 50M XP
        };
        
        // Pet tracking - Track multiple pets
        this.petCounts = {}; // skillId -> { regular: count, shiny: count }
        this.totalPetsObtained = 0; // Total pets ever obtained
        this.totalShinyPetsObtained = 0; // Total shiny pets ever obtained
        
        this.initialize();
    }
    
    initialize() {
        // Initialize all skills with default credits and tracking
        const skillsData = loadingManager.getData('skills');
        if (skillsData) {
            for (const skillId of Object.keys(skillsData)) {
                // Each skill starts with 10 credits
                this.skillCredits[skillId] = 10;
                this.tasksPerSkill[skillId] = 0;
                this.creditsSpentPerSkill[skillId] = 0;
                
                // Initialize modification levels
                this.skillModLevels[skillId] = 0;
                this.taskModLevels[skillId] = {};
                this.nodeModLevels[skillId] = {};
                this.quantityModLevels[skillId] = {};
                
                // Initialize speed bonuses
                this.speedBonuses.pets[skillId] = false;
                this.speedBonuses.shinyPets[skillId] = false;
                this.speedBonuses.skillCapes[skillId] = false;
                this.speedBonuses.trimmedCapes[skillId] = false;
                
                // Initialize pet counts
                this.petCounts[skillId] = { regular: 0, shiny: 0 };
            }
        }
        
        // Calculate initial Skill Cred
        this.updateSkillCred();
        
        // Load saved data if exists AND persistence is enabled
        if (this.enablePersistence) {
            this.loadData();
        }
    }
    
    // Update Skill Cred based on total level
    updateSkillCred() {
        if (window.skills) {
            const totalLevel = skills.getTotalLevel();
            this.skillCred = totalLevel;
        } else {
            this.skillCred = 0;
        }
    }
    
    // Get credits for a specific skill
    getSkillCredits(skillId) {
        return this.skillCredits[skillId] || 0;
    }
    
    // Get available Skill Cred (total - spent)
    getAvailableSkillCred() {
        return this.skillCred - this.skillCredSpent;
    }
    
    // Get formatted name for a skill's credits
    getSkillCredName(skillId) {
        const skillsData = loadingManager.getData('skills');
        if (skillsData && skillsData[skillId]) {
            return `${skillsData[skillId].name} Cred`;
        }
        return `${skillId} Cred`;
    }
    
    // Add credits when task completes
    onTaskComplete(task) {
        this.totalTasksCompleted++;
        
        // Add 1 Rune Cred for any task
        this.runeCred += 1;
        
        // Add 1 skill-specific credit if we have task info
        if (task && task.skill) {
            if (this.skillCredits[task.skill] !== undefined) {
                this.skillCredits[task.skill] += 1;
                this.tasksPerSkill[task.skill] = (this.tasksPerSkill[task.skill] || 0) + 1;
                console.log(`+1 ${this.getSkillCredName(task.skill)} (now ${this.skillCredits[task.skill]})`);
            }
            
            // Check for pet drop (1/1000 chance)
            this.rollForPet(task.skill);
        }
        
        console.log(`+1 Rune Cred (now ${this.runeCred})`);
        
        // Update Skill Cred in case levels changed
        this.updateSkillCred();
        
        this.saveData();
        
        // Update UI if overlay is open
        if (window.skillCustomizationUI && window.skillCustomizationUI.isOpen) {
            window.skillCustomizationUI.updateCredits();
        }
    }
    
    // Roll for pet drop when completing a task
    rollForPet(skillId) {
        // 1/1000 chance for pet
        const petRoll = Math.random();
        if (petRoll < 1/1000) {
            // We got a pet! Now check if it's shiny (1/10 chance)
const shinyRoll = Math.random();
const isShiny = shinyRoll < 1/10;

// Get skill name for display
const skillsData = loadingManager.getData('skills');
const skillName = skillsData[skillId] ? skillsData[skillId].name : skillId;

// Initialize pet counts if needed
if (!this.petCounts[skillId]) {
    this.petCounts[skillId] = { regular: 0, shiny: 0 };
}

if (isShiny) {
    this.petCounts[skillId].shiny++;
    this.totalShinyPetsObtained++;
    this.totalPetsObtained++;
    
    // Set speed bonus flag
    this.speedBonuses.shinyPets[skillId] = true;
    
    console.log(`🌟✨ SHINY PET DROP! ✨🌟 You received a SHINY ${skillName} pet! (Pet #${this.petCounts[skillId].regular + this.petCounts[skillId].shiny} for ${skillName})`);
    
    // Show pet celebration
    if (window.xpDropManager) {
        xpDropManager.showPetObtained(skillId, true);
    }
} else {
    this.petCounts[skillId].regular++;
    this.totalPetsObtained++;
    
    // Set speed bonus flag
    this.speedBonuses.pets[skillId] = true;
    
    console.log(`🎉 PET DROP! 🎉 You received a ${skillName} pet! (Pet #${this.petCounts[skillId].regular + this.petCounts[skillId].shiny} for ${skillName})`);
    
    // Show pet celebration
    if (window.xpDropManager) {
        xpDropManager.showPetObtained(skillId, false);
    }
}
            
            // Save immediately
            this.saveData();
            
            // Update UI if skill customization is open
            if (window.skillCustomizationUI && window.skillCustomizationUI.isOpen) {
                window.skillCustomizationUI.render();
            }
        }
    }
    
    // Get pet statistics for a skill
    getPetStats(skillId) {
        if (!this.petCounts[skillId]) {
            return { regular: 0, shiny: 0, total: 0 };
        }
        
        const counts = this.petCounts[skillId];
        return {
            regular: counts.regular,
            shiny: counts.shiny,
            total: counts.regular + counts.shiny
        };
    }
    
    // Get global pet statistics
    getGlobalPetStats() {
        return {
            total: this.totalPetsObtained,
            shiny: this.totalShinyPetsObtained,
            regular: this.totalPetsObtained - this.totalShinyPetsObtained
        };
    }
    
    // Check if player has a specific unlock
    hasUnlock(skillId, unlockType) {
        switch (unlockType) {
            case 'pet':
                return this.speedBonuses.pets[skillId] || false;
            case 'shinyPet':
                return this.speedBonuses.shinyPets[skillId] || false;
            case 'skillCape':
                return this.speedBonuses.skillCapes[skillId] || false;
            case 'trimmedCape':
                return this.speedBonuses.trimmedCapes[skillId] || false;
            case 'maxCape':
                return this.speedBonuses.maxCape || false;
            case 'trimmedMaxCape':
                return this.speedBonuses.trimmedMaxCape || false;
            default:
                return false;
        }
    }
    
    // Modify skill weight level
    // NEW PARAMETER: useSkillCred - if true, use Skill Cred instead of skill-specific credits
    modifySkillWeight(skillId, increase, useSkillCred = false) {
        const baseCost = 25;
        const currentLevel = this.skillModLevels[skillId] || 0;
        
        // Check if we can modify further
        if (increase && currentLevel >= this.maxModificationLevel) return false;
        if (!increase && currentLevel <= -this.maxModificationLevel) return false;
        
        // Calculate new level
        const newLevel = increase ? currentLevel + 1 : currentLevel - 1;
        
        // Determine if we're moving away from or toward 0
        const movingAwayFromZero = Math.abs(newLevel) > Math.abs(currentLevel);
        
        if (movingAwayFromZero) {
            // Moving away from 0 - charge based on exponential cost
            const cost = baseCost * Math.pow(2, Math.abs(newLevel) - 1);
            
            if (useSkillCred) {
                // Use Skill Cred for global customization
                const availableSkillCred = this.getAvailableSkillCred();
                if (availableSkillCred < cost) return false;
                
                // Update level
                this.skillModLevels[skillId] = newLevel;
                
                // Spend Skill Cred
                this.skillCredSpent += cost;
            } else {
                // Use skill-specific credits for individual customization
                if (this.skillCredits[skillId] < cost) return false;
                
                // Update level
                this.skillModLevels[skillId] = newLevel;
                
                // Spend skill-specific credits
                this.skillCredits[skillId] -= cost;
                this.creditsSpentPerSkill[skillId] = (this.creditsSpentPerSkill[skillId] || 0) + cost;
            }
        } else {
            // Moving toward 0 - refund based on exponential cost
            const refund = baseCost * Math.pow(2, Math.abs(currentLevel) - 1);
            
            // Update level
            this.skillModLevels[skillId] = newLevel;
            
            if (useSkillCred) {
                // Refund Skill Cred
                this.skillCredSpent = Math.max(0, this.skillCredSpent - refund);
            } else {
                // Refund skill-specific credits
                this.skillCredits[skillId] += refund;
                this.creditsSpentPerSkill[skillId] = Math.max(0, (this.creditsSpentPerSkill[skillId] || 0) - refund);
            }
        }
        
        this.saveData();
        return true;
    }
    
    // Get the actual weight multiplier for a skill
    getSkillWeight(skillId) {
        const level = this.skillModLevels[skillId] || 0;
        if (level === 0) return 1.0;
        return level > 0 ? Math.pow(1.25, level) : Math.pow(0.8, Math.abs(level));
    }
    
    // Modify task weight level
    modifyTaskWeight(skillId, itemId, increase) {
        const baseCost = 5;
        
        if (!this.taskModLevels[skillId]) this.taskModLevels[skillId] = {};
        const currentLevel = this.taskModLevels[skillId][itemId] || 0;
        
        // Check if we can modify further
        if (increase && currentLevel >= this.maxModificationLevel) return false;
        if (!increase && currentLevel <= -this.maxModificationLevel) return false;
        
        // Calculate new level
        const newLevel = increase ? currentLevel + 1 : currentLevel - 1;
        
        // Determine if we're moving away from or toward 0
        const movingAwayFromZero = Math.abs(newLevel) > Math.abs(currentLevel);
        
        if (movingAwayFromZero) {
            // Moving away from 0 - charge based on exponential cost
            const cost = baseCost * Math.pow(2, Math.abs(newLevel) - 1);
            
            // Check if we have enough skill-specific credits
            if (this.skillCredits[skillId] < cost) return false;
            
            // Update level
            this.taskModLevels[skillId][itemId] = newLevel;
            
            // Spend skill-specific credits
            this.skillCredits[skillId] -= cost;
            this.creditsSpentPerSkill[skillId] = (this.creditsSpentPerSkill[skillId] || 0) + cost;
        } else {
            // Moving toward 0 - refund based on exponential cost
            const refund = baseCost * Math.pow(2, Math.abs(currentLevel) - 1);
            
            // Update level
            this.taskModLevels[skillId][itemId] = newLevel;
            
            // Refund skill-specific credits
            this.skillCredits[skillId] += refund;
            this.creditsSpentPerSkill[skillId] = Math.max(0, (this.creditsSpentPerSkill[skillId] || 0) - refund);
        }
        
        this.saveData();
        return true;
    }
    
    // Modify node weight level
    modifyNodeWeight(skillId, nodeId, increase) {
        const baseCost = 5;
        
        if (!this.nodeModLevels[skillId]) this.nodeModLevels[skillId] = {};
        const currentLevel = this.nodeModLevels[skillId][nodeId] || 0;
        
        // Check if we can modify further
        if (increase && currentLevel >= this.maxModificationLevel) return false;
        if (!increase && currentLevel <= -this.maxModificationLevel) return false;
        
        // Calculate new level
        const newLevel = increase ? currentLevel + 1 : currentLevel - 1;
        
        // Determine if we're moving away from or toward 0
        const movingAwayFromZero = Math.abs(newLevel) > Math.abs(currentLevel);
        
        if (movingAwayFromZero) {
            // Moving away from 0 - charge based on exponential cost
            const cost = baseCost * Math.pow(2, Math.abs(newLevel) - 1);
            
            // Check if we have enough skill-specific credits
            if (this.skillCredits[skillId] < cost) return false;
            
            // Update level
            this.nodeModLevels[skillId][nodeId] = newLevel;
            
            // Spend skill-specific credits
            this.skillCredits[skillId] -= cost;
            this.creditsSpentPerSkill[skillId] = (this.creditsSpentPerSkill[skillId] || 0) + cost;
        } else {
            // Moving toward 0 - refund based on exponential cost
            const refund = baseCost * Math.pow(2, Math.abs(currentLevel) - 1);
            
            // Update level
            this.nodeModLevels[skillId][nodeId] = newLevel;
            
            // Refund skill-specific credits
            this.skillCredits[skillId] += refund;
            this.creditsSpentPerSkill[skillId] = Math.max(0, (this.creditsSpentPerSkill[skillId] || 0) - refund);
        }
        
        this.saveData();
        return true;
    }
    
    // Modify task quantity level
    modifyTaskQuantity(skillId, itemId, extend) {
        const baseCost = 5;
        
        if (!this.quantityModLevels[skillId]) this.quantityModLevels[skillId] = {};
        const currentLevel = this.quantityModLevels[skillId][itemId] || 0;
        
        // Check if we can modify further
        if (extend && currentLevel >= this.maxModificationLevel) return false;
        if (!extend && currentLevel <= -this.maxModificationLevel) return false;
        
        // Calculate new level
        const newLevel = extend ? currentLevel + 1 : currentLevel - 1;
        
        // Determine if we're moving away from or toward 0
        const movingAwayFromZero = Math.abs(newLevel) > Math.abs(currentLevel);
        
        if (movingAwayFromZero) {
            // Moving away from 0 - charge based on exponential cost
            const cost = baseCost * Math.pow(2, Math.abs(newLevel) - 1);
            
            // Check if we have enough skill-specific credits
            if (this.skillCredits[skillId] < cost) return false;
            
            // Update level
            this.quantityModLevels[skillId][itemId] = newLevel;
            
            // Spend skill-specific credits
            this.skillCredits[skillId] -= cost;
            this.creditsSpentPerSkill[skillId] = (this.creditsSpentPerSkill[skillId] || 0) + cost;
        } else {
            // Moving toward 0 - refund based on exponential cost
            const refund = baseCost * Math.pow(2, Math.abs(currentLevel) - 1);
            
            // Update level
            this.quantityModLevels[skillId][itemId] = newLevel;
            
            // Refund skill-specific credits
            this.skillCredits[skillId] += refund;
            this.creditsSpentPerSkill[skillId] = Math.max(0, (this.creditsSpentPerSkill[skillId] || 0) - refund);
        }
        
        this.saveData();
        return true;
    }
    
    // Get weighted skill for task generation
    getWeightedSkill(availableSkills) {
        // Only apply weights if we have modified weights
        const hasModifiedWeights = Object.values(this.skillModLevels).some(level => level !== 0);
        
        if (hasModifiedWeights) {
            const weightedSkills = [];
            let totalWeight = 0;
            
            for (const skill of availableSkills) {
                const weight = this.getSkillWeight(skill.id);
                totalWeight += weight;
                weightedSkills.push({ skill, weight: totalWeight });
            }
            
            const random = Math.random() * totalWeight;
            for (const weighted of weightedSkills) {
                if (random < weighted.weight) {
                    return weighted.skill;
                }
            }
        }
        
        // Default: equal weights (existing behavior)
        return availableSkills[Math.floor(Math.random() * availableSkills.length)];
    }
    
    // Get task weight for an item within a skill
    getTaskWeight(skillId, itemId) {
        if (!this.taskModLevels[skillId]) return 1.0;
        const level = this.taskModLevels[skillId][itemId] || 0;
        if (level === 0) return 1.0;
        return level > 0 ? Math.pow(1.25, level) : Math.pow(0.8, Math.abs(level));
    }
    
    // Get node weight for a skill
    getNodeWeight(skillId, nodeId) {
        if (!this.nodeModLevels[skillId]) return 1.0;
        const level = this.nodeModLevels[skillId][nodeId] || 0;
        if (level === 0) return 1.0;
        return level > 0 ? Math.pow(1.25, level) : Math.pow(0.8, Math.abs(level));
    }
    
    // Get quantity modifier for a task
    getQuantityModifier(skillId, itemId) {
        if (!this.quantityModLevels[skillId]) return 1.0;
        const level = this.quantityModLevels[skillId][itemId] || 0;
        if (level === 0) return 1.0;
        return level > 0 ? Math.pow(1.25, level) : Math.pow(0.8, Math.abs(level));
    }
    
    // Calculate total speed bonus for a skill - UPDATED WITH ALL 6 BONUSES
    getSkillSpeedBonus(skillId) {
        let bonus = 0;
        
        // Pet bonuses (both can be active if you have both)
        if (this.speedBonuses.pets[skillId]) {
            bonus += 0.05; // 5% for regular pet
        }
        if (this.speedBonuses.shinyPets[skillId]) {
            bonus += 0.10; // 10% for shiny pet (stacks with regular)
        }
        
        // Skill cape bonus
        if (this.speedBonuses.skillCapes[skillId]) {
            bonus += 0.05; // 5% for skill cape
        }
        
        // Trimmed skill cape bonus (50M XP in that skill)
        if (this.speedBonuses.trimmedCapes[skillId]) {
            bonus += 0.10; // 10% for trimmed cape
        }
        
        // Max cape bonus (all skills 99)
        if (this.speedBonuses.maxCape) {
            bonus += 0.05; // 5% global
        }
        
        // Trimmed max cape bonus (all skills 50M XP)
        if (this.speedBonuses.trimmedMaxCape) {
            bonus += 0.10; // 10% global
        }
        
        // Total possible: 5% + 10% + 5% + 10% + 5% + 10% = 45%
        // No cap needed since max is reasonable
        return bonus;
    }
    
    // Update speed bonuses based on current levels - UPDATED
    updateSpeedBonuses() {
        if (!window.skills) return;
        
        let allMaxed = true; // For regular max cape (all 99s)
        let allTrimmed = true; // For trimmed max cape (all 50M XP)
        
        // Check for skill capes (99) and trimmed capes (50M XP)
        for (const [skillId, skill] of Object.entries(skills.skills)) {
            // Skill cape at 99
            if (skill.level >= 99) {
                this.speedBonuses.skillCapes[skillId] = true;
            } else {
                allMaxed = false;
            }
            
            // Trimmed cape at 50M XP
            if (skill.xp >= 50000000) {
                this.speedBonuses.trimmedCapes[skillId] = true;
            } else {
                allTrimmed = false;
            }
        }
        
        // Update max cape status
        this.speedBonuses.maxCape = allMaxed;
        
        // Update trimmed max cape status
        this.speedBonuses.trimmedMaxCape = allTrimmed;
        
        // Update Skill Cred
        this.updateSkillCred();
        
        this.saveData();
    }
    
    // Save data to localStorage
    saveData() {
        // ONLY SAVE IF PERSISTENCE IS ENABLED
        if (!this.enablePersistence) {
            console.log('Credit persistence disabled - not saving');
            return;
        }
        
        const data = {
            skillCredits: this.skillCredits,
            skillCredSpent: this.skillCredSpent,
            runeCred: this.runeCred,
            totalTasksCompleted: this.totalTasksCompleted,
            tasksPerSkill: this.tasksPerSkill,
            creditsSpentPerSkill: this.creditsSpentPerSkill,
            skillModLevels: this.skillModLevels,
            taskModLevels: this.taskModLevels,
            nodeModLevels: this.nodeModLevels,
            quantityModLevels: this.quantityModLevels,
            speedBonuses: this.speedBonuses,
            maxModificationLevel: this.maxModificationLevel,
            // Pet tracking data
            petCounts: this.petCounts,
            totalPetsObtained: this.totalPetsObtained,
            totalShinyPetsObtained: this.totalShinyPetsObtained
        };
        
        try {
            localStorage.setItem('credits_data', JSON.stringify(data));
            console.log('Credits data saved');
        } catch (e) {
            console.error('Failed to save credits data:', e);
        }
    }
    
    // Load data from localStorage
    loadData() {
        // ONLY LOAD IF PERSISTENCE IS ENABLED
        if (!this.enablePersistence) {
            console.log('Credit persistence disabled - not loading');
            return;
        }
        
        try {
            const saved = localStorage.getItem('credits_data');
            if (saved) {
                const data = JSON.parse(saved);
                
                // Load all the saved data
                this.skillCredits = data.skillCredits || {};
                this.skillCredSpent = data.skillCredSpent || 0;
                this.runeCred = data.runeCred || 5;
                this.totalTasksCompleted = data.totalTasksCompleted || 0;
                this.tasksPerSkill = data.tasksPerSkill || {};
                this.creditsSpentPerSkill = data.creditsSpentPerSkill || {};
                this.skillModLevels = data.skillModLevels || {};
                this.taskModLevels = data.taskModLevels || {};
                this.nodeModLevels = data.nodeModLevels || {};
                this.quantityModLevels = data.quantityModLevels || {};
                this.speedBonuses = data.speedBonuses || {
                    pets: {},
                    shinyPets: {},
                    skillCapes: {},
                    trimmedCapes: {},
                    maxCape: false,
                    trimmedMaxCape: false
                };
                
                // Ensure trimmedMaxCape exists (for backwards compatibility)
                if (this.speedBonuses.trimmedMaxCape === undefined) {
                    this.speedBonuses.trimmedMaxCape = false;
                }
                
                this.maxModificationLevel = data.maxModificationLevel || 10;
                
                // Load pet tracking data
                this.petCounts = data.petCounts || {};
                this.totalPetsObtained = data.totalPetsObtained || 0;
                this.totalShinyPetsObtained = data.totalShinyPetsObtained || 0;
                
                console.log('Credits data loaded');
            }
        } catch (e) {
            console.error('Failed to load credits data:', e);
        }
        
        // Always update Skill Cred after loading
        this.updateSkillCred();
        this.updateSpeedBonuses();
    }
    
    // Toggle persistence on/off
    togglePersistence(enable) {
        this.enablePersistence = enable;
        console.log(`Credit persistence ${enable ? 'enabled' : 'disabled'}`);
        
        if (enable) {
            // If enabling, save current state
            this.saveData();
        }
    }
}

// Make RuneCreditManager available globally
window.RuneCreditManager = RuneCreditManager;
