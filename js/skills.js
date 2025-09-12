class SkillsManager {
    constructor() {
        this.skills = {};
        this.initializeSkills();
    }

    initializeSkills() {
        const skillsData = loadingManager.getData('skills');
        
        for (const [id, data] of Object.entries(skillsData)) {
            this.skills[id] = {
                id: id,
                name: data.name,
                category: data.category,
                level: 1,
                xp: 0,
                xpForNextLevel: getXpForLevel(2)
            };
        }

        // Hitpoints starts at level 10
        if (this.skills.hitpoints) {
            this.skills.hitpoints.level = 10;
            this.skills.hitpoints.xp = getXpForLevel(10);
            this.skills.hitpoints.xpForNextLevel = getXpForLevel(11);
        }
    }

    addXp(skillId, amount) {
    const skill = this.skills[skillId];
    if (!skill) {
        console.error(`Skill ${skillId} not found`);
        return;
    }

    // Cap at 200 million XP
    const maxXp = 200000000;
    const newXp = Math.min(skill.xp + amount, maxXp);
    const actualGained = newXp - skill.xp;
    
    skill.xp = newXp;
    
    // Trigger XP drop animation
    if (window.xpDropManager && actualGained > 0) {
        xpDropManager.addDrop(skillId, actualGained);
        
        // Check for XP milestones (10M, 20M, etc.)
        xpDropManager.checkXPMilestones(skillId, newXp);
    }
    
    // Check for level up
    const oldLevel = skill.level;
    skill.level = getLevelFromXp(skill.xp);
    
    if (skill.level !== oldLevel) {
        this.onLevelUp(skillId, skill.level);
        
        // Check total level milestones
        if (window.xpDropManager) {
            const totalLevel = this.getTotalLevel();
            xpDropManager.checkTotalLevel(totalLevel);
        }
    }

    // Only set xpForNextLevel if not at max XP
    if (skill.xp < maxXp) {
        skill.xpForNextLevel = getXpForLevel(skill.level + 1);
    } else {
        skill.xpForNextLevel = maxXp; // Already at max
    }
    
    // NEW: Update UI for this specific skill
    if (window.ui) {
        // Update the skill in skills panel if visible
        ui.updateSingleSkillUI(skillId);
        
        // Update total level display (always, since tooltip shows total XP)
        ui.updateTotalLevelDisplay();
        
        // Update combat level if this was a combat skill level up
        if (skill.level !== oldLevel) {
            const combatSkills = ['attack', 'strength', 'defence', 'hitpoints', 'prayer', 'ranged', 'magic'];
            if (combatSkills.includes(skillId)) {
                ui.updateCombatLevelDisplay();
            }
        }
        
        // Update floating task level progress if it's for this skill
        if (window.taskManager && taskManager.currentTask && 
            taskManager.currentTask.skill === skillId) {
            ui.updateFloatingTaskLevelProgress();
        }
    }
    
    // Check for trimmed max cape at 50M
    if (newXp >= 50000000 && window.xpDropManager) {
        xpDropManager.checkTrimmedMaxCape();
    }
    
    return actualGained; // Return actual XP gained (useful for tracking)
}

    onLevelUp(skillId, newLevel) {
    console.log(`Level up! ${this.skills[skillId].name} is now level ${newLevel}`);
    
    // Show level up celebration
    if (window.xpDropManager) {
        xpDropManager.showLevelUp(skillId, newLevel);
    }

    if (window.runeCreditManager) {
        runeCreditManager.updateSpeedBonuses();
    }
}

    getLevel(skillId) {
        return this.skills[skillId]?.level || 1;
    }

    getXp(skillId) {
        return this.skills[skillId]?.xp || 0;
    }

    getTotalLevel() {
        return Object.values(this.skills).reduce((sum, skill) => sum + skill.level, 0);
    }

    getCombatLevel() {
        // Simplified combat level calculation
        const attack = this.getLevel('attack');
        const strength = this.getLevel('strength');
        const defence = this.getLevel('defence');
        const hitpoints = this.getLevel('hitpoints');
        const prayer = this.getLevel('prayer');
        const ranged = this.getLevel('ranged');
        const magic = this.getLevel('magic');

        const base = 0.25 * (defence + hitpoints + Math.floor(prayer / 2));
        const melee = 0.325 * (attack + strength);
        const range = 0.325 * (Math.floor(ranged * 1.5));
        const mage = 0.325 * (Math.floor(magic * 1.5));

        return Math.floor(base + Math.max(melee, range, mage));
    }

    // Check if all skills have 50M XP (for trimmed max cape)
hasAllMaxXp() {
    for (const skill of Object.values(this.skills)) {
        if (skill.xp < 50000000) {
            return false;
        }
    }
    return true;
}

    getSkillsByCategory(category) {
        return Object.values(this.skills).filter(skill => skill.category === category);
    }

    canPerformActivity(activity) {
        const activityData = loadingManager.getData('activities')[activity];
        if (!activityData) return false;

        const requiredLevel = activityData.requiredLevel || 1;
        const skillLevel = this.getLevel(activityData.skill);

        return skillLevel >= requiredLevel;
    }

    getAllSkills() {
        return this.skills;
    }

        getSkill(skillId) {
        return this.skills[skillId] || null;
    }
    
}

// Make SkillsManager available globally
window.SkillsManager = SkillsManager;

