import { BOSS_DEFS } from './data/bosses.js';
import * as bossUI from './bossUI.js';

// Boss manager - data-driven and reusable
let active = null;
let attackIntervalId = null;
let specialTimerId = null;

function safeLog(...args) { console.log('[bossManager]', ...args); }

// Make functions globally available
window.bossManager = {
  startBossFight
};

export async function startBossFight(bossId, playerInstance) {
  if (active) {
    safeLog('A boss is already active');
    return;
  }
  const def = BOSS_DEFS[bossId];
  if (!def) {
    safeLog('Unknown boss', bossId);
    return;
  }

  // playerInstance fallback to global player
  const player = playerInstance || window.player;
  if (!player) {
    safeLog('No player object available');
    return;
  }

  // Pathfind player to lair coordinates if pathfinding exists
  try {
    if (window.pathfinding && typeof window.pathfinding.findPath === 'function' && player && player.position) {
      const path = window.pathfinding.findPath(player.position.x, player.position.y, def.lair.x, def.lair.y);
      if (path && path.length) {
        player.path = path;
        player.pathIndex = 0;
        player.segmentProgress = 0;
        player.targetPosition = { x: def.lair.x, y: def.lair.y };
        // wait until player arrives (simple poll)
        await waitForPlayerAt(player, def.lair.x, def.lair.y, 4000);
      } else {
        // fallback: teleport player if supported
        if ('position' in player) {
          player.position.x = def.lair.x; player.position.y = def.lair.y;
        }
      }
    }
  } catch (e) {
    safeLog('Pathing to lair failed', e);
  }

  // Initialize boss state
  active = {
    def,
    hp: def.maxHp,
    maxHp: def.maxHp,
    phase: 0,
    startedAt: Date.now(),
    lastLog: '',
    player
  };

  // Show UI
  bossUI.showBossModal(def);
  bossUI.updateBossHud(active);
  bossUI.setAttackHandler(() => playerAttack());

  // Start basic attack loop
  startAttackLoop();

  // start special timer
  startSpecialTimer();

  writeLog(`Engaged ${def.name}!`);
}

function startAttackLoop() {
  stopAttackLoop();
  if (!active) return;
  const interval = active.def.mechanics.basicAttackInterval || 1400;
  attackIntervalId = setInterval(() => {
    if (!active) return;
    if (active.stunned) return; // boss stunned skip attacks
    // boss deals damage to player
    const dmg = roll(ownerScaled(30, 60)); // base range; scales in ownerScaled
    applyDamageToPlayer(dmg);
    writeLog(`${active.def.name} hits you for ${dmg}`);
  }, interval);
}

function startSpecialTimer() {
  stopSpecialTimer();
  if (!active) return;
  const cooldown = active.def.mechanics.specialCooldown || 9000;
  specialTimerId = setTimeout(async function specialTick() {
    if (!active) return;
    // Telegraph visual + delay
    writeLog(`${active.def.name} prepares a special!`);
    // brief telegraph time
    const tele = active.def.mechanics.telegraphTime || 1100;
    await sleep(tele);
    // show grid minigame
    const phaseCfg = getCurrentPhaseConfig();
    if (!phaseCfg || !phaseCfg.gridConfig) {
      // no grid for this phase; apply a default special (big damage)
      applyDamageToPlayer(Math.floor(active.maxHp * 0.05));
      writeLog(`${active.def.name} used a surprise attack!`);
    } else {
      const res = await bossUI.showGrid(phaseCfg.gridConfig);
      if (res.success) {
        // success: stun boss and damage
        const extra = Math.max(1, Math.floor(active.maxHp * 0.08));
        damageBoss(extra);
        active.stunned = true;
        writeLog('You disrupted the special! Vorkath is stunned.');
        // stun duration small
        setTimeout(() => { active.stunned = false; }, 1500);
      } else {
        // failure: clickedGreen or timeout
        const largeDmg = Math.max(10, Math.floor(active.maxHp * 0.12));
        applyDamageToPlayer(largeDmg);
        writeLog('Special hit! You failed the puzzle.');
        // optionally spawn arena hazard - not implemented; UI can be extended
      }
    }
    // schedule next special if boss still alive
    if (active) specialTimerId = setTimeout(specialTick, cooldown);
  }, active.def.mechanics.specialCooldown || 9000);
}

function stopAttackLoop() {
  if (attackIntervalId) { clearInterval(attackIntervalId); attackIntervalId = null; }
}
function stopSpecialTimer() {
  if (specialTimerId) { clearTimeout(specialTimerId); specialTimerId = null; }
}

function getCurrentPhaseConfig() {
  if (!active) return null;
  const hpPct = (active.hp / active.maxHp) * 100;
  const phases = active.def.phases || [];
  for (let i = 0; i < phases.length; i++) {
    if (hpPct > phases[i].hpPercent) {
      return phases[0]; // still in first until cross threshold
    }
  }
  // find first phase where hpPct <= hpPercent
  for (let i = 0; i < phases.length; i++) {
    if (hpPct <= phases[i].hpPercent) return phases[i];
  }
  return phases[phases.length - 1] || null;
}

function damageBoss(amount) {
  if (!active) return;
  active.hp = Math.max(0, active.hp - amount);
  active.lastLog = `You hit ${active.def.name} for ${amount}`;
  bossUI.updateBossHud(active);
  checkBossDeath();
  checkPhaseChange();
}

function playerAttack() {
  if (!active) return;
  // Determine player damage by reading gear score UI element, fallback to small damage
  let gearScore = 0;
  const el = document.getElementById('gear-score-value');
  if (el) gearScore = Number(el.textContent) || 0;
  const base = Math.max(5, Math.round(gearScore * 0.12));
  const dmg = roll(base, base + 12);
  damageBoss(dmg);
}

function applyDamageToPlayer(damage) {
  const p = active?.player || window.player;
  if (!p) {
    safeLog('No player to apply damage to');
    return;
  }
  // try to call player.takeDamage if exists
  if (typeof p.takeDamage === 'function') {
    p.takeDamage(damage);
  } else if ('hp' in p) {
    p.hp = Math.max(0, (p.hp || 100) - damage);
    // if player.hp reached 0, handle death
    if (p.hp <= 0) {
      playerDied();
    }
  } else {
    // fallback: show message only
    if (window.showFloatingMessage) showFloatingMessage(`You take ${damage} damage`);
  }
}

function playerDied() {
  writeLog('You have died.');
  // Remove key from inventory per rules
  try {
    if (window.inventory) inventory.removeItem('vorkath_key', 1);
    // cleanup
  } catch (e) {}
  endFight(false);
}

function checkBossDeath() {
  if (!active) return;
  if (active.hp <= 0) {
    // reward coins
    try {
      if (window.inventory) inventory.addItem('coins', 100);
    } catch (e) {}
    writeLog(`${active.def.name} defeated! You received 100 coins.`);
    // consume key on success
    try { if (window.inventory) inventory.removeItem('vorkath_key', 1); } catch(e){}
    endFight(true);
  }
}

function checkPhaseChange() {
  if (!active) return;
  // find which phase index we're in based on hp
  const hpPct = (active.hp / active.maxHp) * 100;
  const phases = active.def.phases || [];
  let newPhase = 0;
  for (let i = 0; i < phases.length; i++) {
    if (hpPct <= (phases[i].hpPercent || 100)) {
      newPhase = i;
      break;
    }
  }
  if (newPhase !== active.phase) {
    active.phase = newPhase;
    active.lastLog = `Phase ${newPhase+1} started`;
    bossUI.updateBossHud(active);
  }
}

function endFight(victory) {
  stopAttackLoop();
  stopSpecialTimer();
  // Hide UI
  bossUI.hideBossModal();
  // cleanup
  active = null;
  // optionally more cleanup like removing NPC visuals if created
}

function writeLog(msg) {
  if (!active) return;
  active.lastLog = msg;
  bossUI.updateBossHud(active);
  try { if (window.showFloatingMessage) showFloatingMessage(msg, 2500); } catch(e){}
}

// helpers
function roll(min, max) {
  if (max === undefined) { max = min; min = 1; }
  const a = Math.floor(min);
  const b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function ownerScaled(...v) { // simple scaler placeholder in case we tune later
  return Math.max(1, v[0]);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function waitForPlayerAt(player, x, y, timeout = 4000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const int = setInterval(() => {
      const px = player.position?.x ?? (player.x ?? null);
      const py = player.position?.y ?? (player.y ?? null);
      if (px === null || py === null) {
        // no position info—stop waiting
        clearInterval(int); resolve();
      } else {
        if (Math.hypot(px - x, py - y) < 2) {
          clearInterval(int); resolve();
        } else if (Date.now() - start > timeout) {
          clearInterval(int); resolve();
        }
      }
    }, 150);
  });
}