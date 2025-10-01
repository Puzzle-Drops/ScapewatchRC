class StrengthSkill extends CombatSkill {
    constructor() {
        super('strength', 'Strength');
    }
    
    // Strength skill uses all the default CombatSkill behavior
    // The main difference is it looks for activities with skill: 'strength'
}

// Make StrengthSkill available globally
window.StrengthSkill = StrengthSkill;
