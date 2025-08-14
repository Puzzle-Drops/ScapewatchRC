class RuneCreditManager {
    constructor() {
        this.runecred = 500; // Starting amount
        this.totalTasksCompleted = 0;
        this.lastMilestone = 0;
        
        // Track RC spent per skill
        this.rcSpentPerSkill = {};
        
        // Track modification levels (-10 to +10) for each modifier
        this.maxModificationLevel = 10; // Can be adjusted in the future
        this.skillModLevels = {}; // skillId -> level (-10 to +10)
        this.taskModLevels = {}; // skillId -> { itemId -> level }
        this.nodeModLevels = {}; // skillId -> { nodeId -> level }
        this.quantityModLevels = {}; // skillId -> { itemId -> level }
        
        // Track total RC spent (for display/tracking purposes)
        this.rcPools = {
            skills: {}, // skillId -> amount spent
            tasks: {}, // skillId -> { itemId -> amount spent }
            nodes: {}, // skillId -> { nodeId -> amount spent }
            quantities: {} // skillId -> { itemId -> amount spent }
        };
        
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
        // Initialize all skills with default weight of 1.0
        const skillsData = loadingManager.getData('skills');
        if (skillsData) {
            for (const skillId of Object.keys(skillsData)) {
                this.skillModLevels[skillId] = 0;
                this.taskModLevels[skillId] = {};
                this.nodeModLevels[skillId] = {};
                this.quantityModLevels[skillId] = {};
                this.rcSpentPerSkill[skillId] = 0;
                
                // Initialize RC pools
                this.rcPools.skills[skillId] = 0;
                this.rcPools.tasks[skillId] = {};
                this.rcPools.nodes[skillId] = {};
                this.rcPools.quantities[skillId] = {};
                
                // Initialize speed bonuses
                this.speedBonuses.pets[skillId] = false;
                this.speedBonuses.shinyPets[skillId] = false;
                this.speedBonuses.skillCapes[skillId] = false;
                this.speedBonuses.trimmedCapes[skillId] = false;
            }
        }
        
        // Load saved data if exists
        this.loadData();
    }
    
    // Add RC when task completes
    onTaskComplete() {
        this.totalTasksCompleted++;
        this.runecred += 1; // 1 RC per task
        
        // Check for milestone bonuses
        const currentMilestone = Math.floor(this.totalTasksCompleted / 1000);
        if (currentMilestone > this.lastMilestone) {
            const milestonesGained = currentMilestone - this.lastMilestone;
            this.runecred += milestonesGained * 100; // 100 RC per 1000 tasks
            this.lastMilestone = currentMilestone;
            console.log(`Milestone reached! +${milestonesGained * 100} RuneCred`);
        }
        
        this.saveData();
        
        // Update UI if overlay is open
        if (window.skillCustomizationUI && window.skillCustomizationUI.isOpen) {
            window.skillCustomizationUI.updateRuneCred();
        }
    }
    
    // Modify skill weight level
    modifySkillWeight(skillId, increase) {
        const cost = 25;
        const currentLevel = this.skillModLevels[skillId] || 0;
        
        // Check if we can modify further
        if (increase && currentLevel >= this.maxModificationLevel) return false;
        if (!increase && currentLevel <= -this.maxModificationLevel) return false;
        
        // Check if we have enough RC
        if (this.runecred < cost) return false;
        
        // Update level
        const newLevel = increase ? currentLevel + 1 : currentLevel - 1;
        this.skillModLevels[skillId] = newLevel;
        
        // Spend RC
        this.runecred -= cost;
        this.rcPools.skills[skillId] = (this.rcPools.skills[skillId] || 0) + cost;
        this.rcSpentPerSkill[skillId] = (this.rcSpentPerSkill[skillId] || 0) + cost;
        
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
        const cost = 5;
        
        if (!this.taskModLevels[skillId]) this.taskModLevels[skillId] = {};
        const currentLevel = this.taskModLevels[skillId][itemId] || 0;
        
        // Check if we can modify further
        if (increase && currentLevel >= this.maxModificationLevel) return false;
        if (!increase && currentLevel <= -this.maxModificationLevel) return false;
        
        // Check if we have enough RC
        if (this.runecred < cost) return false;
        
        // Update level
        const newLevel = increase ? currentLevel + 1 : currentLevel - 1;
        this.taskModLevels[skillId][itemId] = newLevel;
        
        // Spend RC
        this.runecred -= cost;
        if (!this.rcPools.tasks[skillId]) this.rcPools.tasks[skillId] = {};
        this.rcPools.tasks[skillId][itemId] = (this.rcPools.tasks[skillId][itemId] || 0) + cost;
        this.rcSpentPerSkill[skillId] = (this.rcSpentPerSkill[skillId] || 0) + cost;
        
        this.saveData();
        return true;
    }
    
    // Modify node weight level
    modifyNodeWeight(skillId, nodeId, increase) {
        const cost = 5;
        
        if (!this.nodeModLevels[skillId]) this.nodeModLevels[skillId] = {};
        const currentLevel = this.nodeModLevels[skillId][nodeId] || 0;
        
        // Check if we can modify further
        if (increase && currentLevel >= this.maxModificationLevel) return false;
        if (!increase && currentLevel <= -this.maxModificationLevel) return false;
        
        // Check if we have enough RC
        if (this.runecred < cost) return false;
        
        // Update level
        const newLevel = increase ? currentLevel + 1 : currentLevel - 1;
        this.nodeModLevels[skillId][nodeId] = newLevel;
        
        // Spend RC
        this.runecred -= cost;
        if (!this.rcPools.nodes[skillId]) this.rcPools.nodes[skillId] = {};
        this.rcPools.nodes[skillId][nodeId] = (this.rcPools.nodes[skillId][nodeId] || 0) + cost;
        this.rcSpentPerSkill[skillId] = (this.rcSpentPerSkill[skillId] || 0) + cost;
        
        this.saveData();
        return true;
    }
    
    // Modify task quantity level
    modifyTaskQuantity(skillId, itemId, extend) {
        const cost = 5;
        
        if (!this.quantityModLevels[skillId]) this.quantityModLevels[skillId] = {};
        const currentLevel = this.quantityModLevels[skillId][itemId] || 0;
        
        // Check if we can modify further
        if (extend && currentLevel >= this.maxModificationLevel) return false;
        if (!extend && currentLevel <= -this.maxModificationLevel) return false;
        
        // Check if we have enough RC
        if (this.runecred < cost) return false;
        
        // Update level
        const newLevel = extend ? currentLevel + 1 : currentLevel - 1;
        this.quantityModLevels[skillId][itemId] = newLevel;
        
        // Spend RC
        this.runecred -= cost;
        if (!this.rcPools.quantities[skillId]) this.rcPools.quantities[skillId] = {};
        this.rcPools.quantities[skillId][itemId] = (this.rcPools.quantities[skillId][itemId] || 0) + cost;
        this.rcSpentPerSkill[skillId] = (this.rcSpentPerSkill[skillId] || 0) + cost;
        
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
        
        this.saveData();
    }
    
    // Save data to localStorage
    saveData() {
        const data = {
            runecred: this.runecred,
            totalTasksCompleted: this.totalTasksCompleted,
            lastMilestone: this.lastMilestone,
            rcSpentPerSkill: this.rcSpentPerSkill,
            skillModLevels: this.skillModLevels,
            taskModLevels: this.taskModLevels,
            nodeModLevels: this.nodeModLevels,
            quantityModLevels: this.quantityModLevels,
            rcPools: this.rcPools,
            speedBonuses: this.speedBonuses,
            maxModificationLevel: this.maxModificationLevel
        };
        
        try {
            localStorage.setItem('runecred_data', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save RuneCred data:', e);
        }
    }
    
    // Load data from localStorage
    loadData() {
        try {
            const saved = localStorage.getItem('runecred_data');
            if (saved) {
                const data = JSON.parse(saved);
                Object.assign(this, data);
            }
        } catch (e) {
            console.error('Failed to load RuneCred data:', e);
        }
    }
}

// Create global instance
window.runeCreditManager = new RuneCreditManager();
