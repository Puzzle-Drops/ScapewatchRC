class AttackSkill extends CombatSkill {
    constructor() {
        super('attack', 'Attack');
    }
    
    // Attack skill uses all the default CombatSkill behavior
    // The main difference is it looks for activities with skill: 'attack'
}

// Make AttackSkill available globally
window.AttackSkill = AttackSkill;
