class RuneCreditManager {
    constructor() {
        // TOGGLE THIS FLAG TO ENABLE/DISABLE SAVING AND LOADING
        this.enablePersistence = false; // Set to true to enable localStorage save/load
        
        // Three-tier credit system
        this.skillCredits = {}; // skillId -> amount (start at 10)
        this.skillCred = 0; // 100 + total level (calculated dynamically)
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
        
        // Speed bonuses
        this.speedBonuses = {
            pets: {}, // skillId -> true/false
            shinyPets: {}, // skillId -> true/false
            skillCapes: {}, // skillId -> true/false
            trimmedCapes: {}, // skillId -> true/false
            maxCape: false
        };
        
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
            this.skillCred = 100 + totalLevel;
        } else {
            this.skillCred = 100;
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
            // Moving away from 0 - charge based on new level's absolute value
            const cost = baseCost * Math.abs(newLevel);
            
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
            // Moving toward 0 - refund based on current level's absolute value
            const refund = baseCost * Math.abs(currentLevel);
            
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
        return level > 0 ? Math.pow(1.5, level) : Math.pow(0.5, Math.abs(level));
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
            // Moving away from 0 - charge based on new level's absolute value
            const cost = baseCost * Math.abs(newLevel);
            
            // Check if we have enough skill-specific credits
            if (this.skillCredits[skillId] < cost) return false;
            
            // Update level
            this.taskModLevels[skillId][itemId] = newLevel;
            
            // Spend skill-specific credits
            this.skillCredits[skillId] -= cost;
            this.creditsSpentPerSkill[skillId] = (this.creditsSpentPerSkill[skillId] || 0) + cost;
        } else {
            // Moving toward 0 - refund based on current level's absolute value
            const refund = baseCost * Math.abs(currentLevel);
            
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
            // Moving away from 0 - charge based on new level's absolute value
            const cost = baseCost * Math.abs(newLevel);
            
            // Check if we have enough skill-specific credits
            if (this.skillCredits[skillId] < cost) return false;
            
            // Update level
            this.nodeModLevels[skillId][nodeId] = newLevel;
            
            // Spend skill-specific credits
            this.skillCredits[skillId] -= cost;
            this.creditsSpentPerSkill[skillId] = (this.creditsSpentPerSkill[skillId] || 0) + cost;
        } else {
            // Moving toward 0 - refund based on current level's absolute value
            const refund = baseCost * Math.abs(currentLevel);
            
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
            // Moving away from 0 - charge based on new level's absolute value
            const cost = baseCost * Math.abs(newLevel);
            
            // Check if we have enough skill-specific credits
            if (this.skillCredits[skillId] < cost) return false;
            
            // Update level
            this.quantityModLevels[skillId][itemId] = newLevel;
            
            // Spend skill-specific credits
            this.skillCredits[skillId] -= cost;
            this.creditsSpentPerSkill[skillId] = (this.creditsSpentPerSkill[skillId] || 0) + cost;
        } else {
            // Moving toward 0 - refund based on current level's absolute value
            const refund = baseCost * Math.abs(currentLevel);
            
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
        return level > 0 ? Math.pow(1.5, level) : Math.pow(0.5, Math.abs(level));
    }
    
    // Get node weight for a skill
    getNodeWeight(skillId, nodeId) {
        if (!this.nodeModLevels[skillId]) return 1.0;
        const level = this.nodeModLevels[skillId][nodeId] || 0;
        if (level === 0) return 1.0;
        return level > 0 ? Math.pow(1.5, level) : Math.pow(0.5, Math.abs(level));
    }
    
    // Get quantity modifier for a task
    getQuantityModifier(skillId, itemId) {
        if (!this.quantityModLevels[skillId]) return 1.0;
        const level = this.quantityModLevels[skillId][itemId] || 0;
        if (level === 0) return 1.0;
        return level > 0 ? Math.pow(1.5, level) : Math.pow(0.5, Math.abs(level));
    }
    
    // Calculate total speed bonus for a skill
    getSkillSpeedBonus(skillId) {
        let bonus = 0;
        
        // Pet bonuses (only one can be active)
        if (this.speedBonuses.shinyPets[skillId]) {
            bonus += 0.10; // 10% for shiny
        } else if (this.speedBonuses.pets[skillId]) {
            bonus += 0.05; // 5% for regular
        }
        
        // Cape bonuses (only one can be active)
        if (this.speedBonuses.trimmedCapes[skillId]) {
            bonus += 0.10; // 10% for trimmed
        } else if (this.speedBonuses.skillCapes[skillId]) {
            bonus += 0.05; // 5% for regular
        }
        
        // Max cape bonus (global)
        if (this.speedBonuses.maxCape) {
            bonus += 0.05; // 5% global
        }
        
        // Cap at 25%
        return Math.min(bonus, 0.25);
    }
    
    // Update speed bonuses based on current levels
    updateSpeedBonuses() {
        if (!window.skills) return;
        
        // Check for skill capes (99) and trimmed capes (200M XP)
        for (const [skillId, skill] of Object.entries(skills.skills)) {
            // Skill cape at 99
            if (skill.level >= 99) {
                this.speedBonuses.skillCapes[skillId] = true;
            }
            
            // Trimmed cape at 200M XP
            if (skill.xp >= 200000000) {
                this.speedBonuses.trimmedCapes[skillId] = true;
            }
        }
        
        // Check for max cape (all 99s)
        let allMaxed = true;
        for (const skill of Object.values(skills.skills)) {
            if (skill.level < 99) {
                allMaxed = false;
                break;
            }
        }
        this.speedBonuses.maxCape = allMaxed;
        
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
            maxModificationLevel: this.maxModificationLevel
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
                    maxCape: false
                };
                this.maxModificationLevel = data.maxModificationLevel || 10;
                
                console.log('Credits data loaded');
            }
        } catch (e) {
            console.error('Failed to load credits data:', e);
        }
        
        // Always update Skill Cred after loading
        this.updateSkillCred();
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
