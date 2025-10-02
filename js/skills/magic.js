class MagicSkill extends CombatSkill {
    constructor() {
        super('magic', 'Magic');
    }
    
    // Magic skill uses all the default CombatSkill behavior
    // The main difference is it looks for activities with skill: 'magic'
}

// Make MagicSkill available globally
window.MagicSkill = MagicSkill;
