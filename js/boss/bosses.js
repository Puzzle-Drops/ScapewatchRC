export const BOSS_DEFS = {
  vorkath_prime: {
    id: 'vorkath_prime',
    name: 'Vorkath Prime',
    portrait: 'assets/bosses/vorkath.png', // replace with your Vorkath picture path
    maxHp: 3000,
    level: 200,
    lair: { x: 1200, y: 850 },      // world coords (used for pathing)
    arenaRadius: 180,
    mechanics: {
      telegraphTime: 1100,                  // ms before grid appears
      basicAttackInterval: 1400,            // ms between normal boss attacks
      specialCooldown: 9000,                // ms between special attempts
      enrageThresholdPct: 35,               // percent => enrage phase
      respawnSeconds: 600
    },
    phases: [
      { hpPercent: 70, gridConfig: { rows: 3, cols: 3, safeCount: 3, timeMs: 4000, trapDensity: 0.33 } },
      { hpPercent: 35, gridConfig: { rows: 4, cols: 4, safeCount: 5, timeMs: 3500, trapDensity: 0.38 } },
      { hpPercent: 0,  gridConfig: { rows: 5, cols: 5, safeCount: 8, timeMs: 3000, trapDensity: 0.45 } }
    ],
    drops: [
      // For now we give a guaranteed coins reward from bossManager (100 coins)
    ],
    dynamicScaling: false
  }
};