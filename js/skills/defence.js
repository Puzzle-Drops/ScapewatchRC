class DefenceSkill extends CombatSkill {
    constructor() {
        super('defence', 'Defence');
    }
    
    // Defence skill uses all the default CombatSkill behavior
    // The main difference is it looks for activities with skill: 'defence'
}

// Make DefenceSkill available globally
window.DefenceSkill = DefenceSkill;
