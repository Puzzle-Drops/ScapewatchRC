class RuneCreditManager {
    constructor() {
        this.runecred = 500; // Starting amount
        this.totalTasksCompleted = 0;
        this.lastMilestone = 0;
        
        // Track RC spent per skill
        this.rcSpentPerSkill = {};
        
        // Weight modifiers for skills, tasks, and nodes
        this.skillWeights = {}; // skillId -> multiplier (0.5 or 1.5)
        this.taskWeights = {}; // skillId -> { itemId -> multiplier }
        this.nodeWeights = {}; // skillId -> { nodeId -> multiplier }
        this.taskQuantityModifiers = {}; // skillId -> { itemId -> modifier }
        
        // Track RC pools for each modifier
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
                this.skillWeights[skillId] = 1.0;
                this.taskWeights[skillId] = {};
                this.nodeWeights[skillId] = {};
                this.taskQuantityModifiers[skillId] = {};
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
    
    // Modify skill weight
    modifySkillWeight(skillId, increase) {
        const cost = 25;
        if (this.runecred < cost) return false;
        
        const currentWeight = this.skillWeights[skillId] || 1.0;
        const newWeight = increase ? 1.5 : 0.5;
        
        // If already at this weight, revert to 1.0
        if (currentWeight === newWeight) {
            this.skillWeights[skillId] = 1.0;
            // Refund the RC
            this.runecred += this.rcPools.skills[skillId] || 0;
            this.rcPools.skills[skillId] = 0;
            this.rcSpentPerSkill[skillId] -= cost;
        } else {
            // Apply new weight
            this.runecred -= cost;
            this.skillWeights[skillId] = newWeight;
            this.rcPools.skills[skillId] = (this.rcPools.skills[skillId] || 0) + cost;
            this.rcSpentPerSkill[skillId] = (this.rcSpentPerSkill[skillId] || 0) + cost;
        }
        
        this.saveData();
        return true;
    }
    
    // Modify task weight within a skill
    modifyTaskWeight(skillId, itemId, increase) {
        const cost = 5;
        if (this.runecred < cost) return false;
        
        if (!this.taskWeights[skillId]) this.taskWeights[skillId] = {};
        const currentWeight = this.taskWeights[skillId][itemId] || 1.0;
        const newWeight = increase ? 1.5 : 0.5;
        
        // If already at this weight, revert to 1.0
        if (currentWeight === newWeight) {
            this.taskWeights[skillId][itemId] = 1.0;
            // Refund the RC
            if (this.rcPools.tasks[skillId] && this.rcPools.tasks[skillId][itemId]) {
                this.runecred += this.rcPools.tasks[skillId][itemId];
                this.rcSpentPerSkill[skillId] -= this.rcPools.tasks[skillId][itemId];
                this.rcPools.tasks[skillId][itemId] = 0;
            }
        } else {
            // Apply new weight
            this.runecred -= cost;
            this.taskWeights[skillId][itemId] = newWeight;
            if (!this.rcPools.tasks[skillId]) this.rcPools.tasks[skillId] = {};
            this.rcPools.tasks[skillId][itemId] = (this.rcPools.tasks[skillId][itemId] || 0) + cost;
            this.rcSpentPerSkill[skillId] = (this.rcSpentPerSkill[skillId] || 0) + cost;
        }
        
        this.saveData();
        return true;
    }
    
    // Modify node weight for a skill
    modifyNodeWeight(skillId, nodeId, increase) {
        const cost = 5;
        if (this.runecred < cost) return false;
        
        if (!this.nodeWeights[skillId]) this.nodeWeights[skillId] = {};
        const currentWeight = this.nodeWeights[skillId][nodeId] || 1.0;
        const newWeight = increase ? 1.5 : 0.5;
        
        // If already at this weight, revert to 1.0
        if (currentWeight === newWeight) {
            this.nodeWeights[skillId][nodeId] = 1.0;
            // Refund the RC
            if (this.rcPools.nodes[skillId] && this.rcPools.nodes[skillId][nodeId]) {
                this.runecred += this.rcPools.nodes[skillId][nodeId];
                this.rcSpentPerSkill[skillId] -= this.rcPools.nodes[skillId][nodeId];
                this.rcPools.nodes[skillId][nodeId] = 0;
            }
        } else {
            // Apply new weight
            this.runecred -= cost;
            this.nodeWeights[skillId][nodeId] = newWeight;
            if (!this.rcPools.nodes[skillId]) this.rcPools.nodes[skillId] = {};
            this.rcPools.nodes[skillId][nodeId] = (this.rcPools.nodes[skillId][nodeId] || 0) + cost;
            this.rcSpentPerSkill[skillId] = (this.rcSpentPerSkill[skillId] || 0) + cost;
        }
        
        this.saveData();
        return true;
    }
    
    // Modify task quantity range
    modifyTaskQuantity(skillId, itemId, extend) {
        const cost = 5;
        if (this.runecred < cost) return false;
        
        if (!this.taskQuantityModifiers[skillId]) this.taskQuantityModifiers[skillId] = {};
        const currentModifier = this.taskQuantityModifiers[skillId][itemId] || 1.0;
        const newModifier = extend ? 1.5 : 0.5;
        
        // If already at this modifier, revert to 1.0
        if (currentModifier === newModifier) {
            this.taskQuantityModifiers[skillId][itemId] = 1.0;
            // Refund the RC
            if (this.rcPools.quantities[skillId] && this.rcPools.quantities[skillId][itemId]) {
                this.runecred += this.rcPools.quantities[skillId][itemId];
                this.rcSpentPerSkill[skillId] -= this.rcPools.quantities[skillId][itemId];
                this.rcPools.quantities[skillId][itemId] = 0;
            }
        } else {
            // Apply new modifier
            this.runecred -= cost;
            this.taskQuantityModifiers[skillId][itemId] = newModifier;
            if (!this.rcPools.quantities[skillId]) this.rcPools.quantities[skillId] = {};
            this.rcPools.quantities[skillId][itemId] = (this.rcPools.quantities[skillId][itemId] || 0) + cost;
            this.rcSpentPerSkill[skillId] = (this.rcSpentPerSkill[skillId] || 0) + cost;
        }
        
        this.saveData();
        return true;
    }
    
    // In runecred.js, update getWeightedSkill
getWeightedSkill(availableSkills) {
    // Only apply weights if we have modified weights
    const hasModifiedWeights = Object.values(this.skillWeights).some(w => w !== 1.0);
    
    if (hasModifiedWeights) {
        const weightedSkills = [];
        let totalWeight = 0;
        
        for (const skill of availableSkills) {
            const weight = this.skillWeights[skill.id] || 1.0;
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
        if (!this.taskWeights[skillId]) return 1.0;
        return this.taskWeights[skillId][itemId] || 1.0;
    }
    
    // Get node weight for a skill
    getNodeWeight(skillId, nodeId) {
        if (!this.nodeWeights[skillId]) return 1.0;
        return this.nodeWeights[skillId][nodeId] || 1.0;
    }
    
    // Get quantity modifier for a task
    getQuantityModifier(skillId, itemId) {
        if (!this.taskQuantityModifiers[skillId]) return 1.0;
        return this.taskQuantityModifiers[skillId][itemId] || 1.0;
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
            skillWeights: this.skillWeights,
            taskWeights: this.taskWeights,
            nodeWeights: this.nodeWeights,
            taskQuantityModifiers: this.taskQuantityModifiers,
            rcPools: this.rcPools,
            speedBonuses: this.speedBonuses
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
