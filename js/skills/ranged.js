class RangedSkill extends CombatSkill {
    constructor() {
        super('ranged', 'Ranged');
    }
    
    // Ranged skill uses all the default CombatSkill behavior
    // The main difference is it looks for activities with skill: 'ranged'
}

// Make RangedSkill available globally
window.RangedSkill = RangedSkill;
