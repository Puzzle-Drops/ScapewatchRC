// ===== EASY BOSS CONFIGURATION =====
// Change these values to customize your boss!

// Basic Boss Stats
const BOSS_NAME = 'Vorkath Prime';
const BOSS_MAX_HP = 3000;  // Boss health points
const BOSS_LEVEL = 200;    // Boss combat level
const BOSS_PORTRAIT = 'assets/bosses/vorkath.png'; // Boss image path

// Boss Location
const BOSS_LAIR_X = 1200;  // X coordinate where boss spawns
const BOSS_LAIR_Y = 850;   // Y coordinate where boss spawns

// Combat Mechanics (in milliseconds)
const BASIC_ATTACK_INTERVAL = 1400;  // How often boss attacks (ms)
const SPECIAL_COOLDOWN = 9000;       // Time between special attacks (ms)
const TELEGRAPH_TIME = 1100;         // Warning time before special (ms)

// Phase Configuration
// Boss changes behavior at different HP percentages
const PHASE_1_HP_PERCENT = 70;  // Phase 1 ends at 70% HP
const PHASE_2_HP_PERCENT = 35;  // Phase 2 ends at 35% HP

// Special Attack Damage (as percentage of boss max HP)
const SPECIAL_DAMAGE_PERCENT = 12;  // Special attack damage (12% of boss HP)

// Reward Configuration
const VICTORY_COINS = 100;  // Coins rewarded for defeating boss

// ===== ADVANCED CONFIGURATION =====
// You can modify these if you want to add more complex mechanics

export const BOSS_DEFS = {
  vorkath_prime: {
    // Basic Information
    id: 'vorkath_prime',
    name: BOSS_NAME,
    portrait: BOSS_PORTRAIT,
    maxHp: BOSS_MAX_HP,
    level: BOSS_LEVEL,

    // Location
    lair: { x: BOSS_LAIR_X, y: BOSS_LAIR_Y },
    arenaRadius: 180,

    // Combat Mechanics
    mechanics: {
      telegraphTime: TELEGRAPH_TIME,
      basicAttackInterval: BASIC_ATTACK_INTERVAL,
      specialCooldown: SPECIAL_COOLDOWN,
      enrageThresholdPct: 35,
      respawnSeconds: 600
    },

    // Combat Phases (change behavior at different HP levels)
    phases: [
      {
        hpPercent: PHASE_1_HP_PERCENT,
        gridConfig: { rows: 3, cols: 3, safeCount: 3, timeMs: 4000, trapDensity: 0.33 }
      },
      {
        hpPercent: PHASE_2_HP_PERCENT,
        gridConfig: { rows: 4, cols: 4, safeCount: 5, timeMs: 3500, trapDensity: 0.38 }
      },
      {
        hpPercent: 0,
        gridConfig: { rows: 5, cols: 5, safeCount: 8, timeMs: 3000, trapDensity: 0.45 }
      }
    ],

    // Rewards
    drops: [
      // Currently gives guaranteed coins reward from bossManager
    ],
    dynamicScaling: false,

    // Custom damage values (used by bossManager)
    specialDamagePercent: SPECIAL_DAMAGE_PERCENT,
    victoryCoins: VICTORY_COINS
  }
};
