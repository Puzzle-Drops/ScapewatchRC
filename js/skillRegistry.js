class SkillRegistry {
    constructor() {
        this.skills = {};
        this.initialized = false;
    }
    
    async initialize() {
        // Register all skills
        this.register(new WoodcuttingSkill());
        this.register(new MiningSkill());
        this.register(new FishingSkill());
        this.register(new CookingSkill());
        this.register(new AgilitySkill());
        this.register(new SailingSkill());
        this.register(new FiremakingSkill());
        this.register(new ThievingSkill());
        this.register(new RunecraftingSkill());
        this.register(new SmithingSkill());
        this.register(new FletchingSkill());
        this.register(new CraftingSkill());
        this.register(new ConstructionSkill());
        this.register(new HerbloreSkill());
        this.register(new FarmingSkill());
        this.register(new HunterSkill());
        this.register(new AttackSkill());
        this.register(new StrengthSkill());
        this.register(new DefenceSkill());
        this.register(new MagicSkill());
        this.register(new RangedSkill());
        
        this.initialized = true;
        console.log('Skill registry initialized with', Object.keys(this.skills).length, 'skills');
    }
    
    register(skill) {
        this.skills[skill.id] = skill;
        console.log(`Registered skill: ${skill.name}`);
    }
    
    getSkill(skillId) {
        return this.skills[skillId] || null;
    }
    
    getSkillForActivity(activityId) {
    const activities = loadingManager.getData('activities');
    const activity = activities[activityId];
    if (!activity) return null;
    
    // For combat activities, we need to determine which skill to use
    if (activity.skill === 'combat') {
        // If we have a current combat task, use its skill
        if (window.ai && window.ai.currentTask && window.ai.currentTask.isCombatTask) {
            return this.getSkill(window.ai.currentTask.skill);
        }
        // Default to null - let combat manager handle it
        return null;
    }
    
    return this.getSkill(activity.skill);
}
    
    getAllSkills() {
        return Object.values(this.skills);
    }
    
    // Check if an item should be banked
    shouldBankItem(itemId) {
        // Check all skills to see if any don't want this item banked
        for (const skill of this.getAllSkills()) {
            if (!skill.shouldBankItem(itemId)) {
                return false;
            }
        }
        return true;
    }
    
    // Save skill states
    saveStates() {
        const states = {};
        for (const [id, skill] of Object.entries(this.skills)) {
            if (skill.saveState) {
                states[id] = skill.saveState();
            }
        }
        return states;
    }
    
    // Load skill states
    loadStates(states) {
        for (const [id, state] of Object.entries(states)) {
            if (this.skills[id] && this.skills[id].loadState) {
                this.skills[id].loadState(state);
            }
        }
    }
}

// Create global instance
window.skillRegistry = new SkillRegistry();
