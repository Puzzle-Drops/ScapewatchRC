import { showGridMinigame } from './gridMinigame.js';

// Minimal boss UI helper. Uses your existing modal pattern.
// Exposes: showBossModal(bossDef), hideBossModal(), showGrid(bossGridConfig) -> Promise
const bossModalId = 'boss-modal';
const bossGridOverlayId = 'boss-grid-overlay';
let currentAttackHandler = null;

export function showBossModal(bossDef) {
  const modal = document.getElementById(bossModalId);
  if (!modal) {
    console.warn('boss-modal element not found; please add the modal HTML to index.html (see instructions).');
    return;
  }
  modal.style.display = 'block';

  const nameEl = modal.querySelector('#boss-name');
  const levelEl = modal.querySelector('#boss-level');
  const portraitEl = modal.querySelector('#boss-portrait');
  const hpBar = modal.querySelector('#boss-hp-bar');
  const phaseLabel = modal.querySelector('#boss-phase-label');
  const logEl = modal.querySelector('#boss-log');

  if (nameEl) nameEl.textContent = bossDef.name || 'Boss';
  if (levelEl) levelEl.textContent = `Lvl ${bossDef.level || '?'}`;
  if (portraitEl && bossDef.portrait) portraitEl.src = bossDef.portrait;
  if (hpBar) hpBar.style.width = '100%';
  if (phaseLabel) phaseLabel.textContent = 'Phase 1';

  // Attack button
  const attackBtn = modal.querySelector('#boss-attack-btn');
  if (attackBtn) {
    attackBtn.disabled = false;
    attackBtn.onclick = () => {
      if (typeof currentAttackHandler === 'function') currentAttackHandler();
    };
  }

  // Close handler (should normally be disabled during combat)
  const closeX = modal.querySelector('#boss-close-x');
  if (closeX) closeX.onclick = () => {
    // allow closing only if not in combat; bossManager will hide modal when cleaned up
    modal.style.display = 'none';
  };
}

export function hideBossModal() {
  const modal = document.getElementById(bossModalId);
  if (modal) modal.style.display = 'none';
}

export function updateBossHud(bossState) {
  const modal = document.getElementById(bossModalId);
  if (!modal) return;
  const hpBar = modal.querySelector('#boss-hp-bar');
  if (hpBar && bossState) {
    const pct = Math.max(0, Math.round((bossState.hp / bossState.maxHp) * 100));
    hpBar.style.width = pct + '%';
  }
  const phaseLabel = modal.querySelector('#boss-phase-label');
  if (phaseLabel && bossState) phaseLabel.textContent = `Phase ${bossState.phase+1}`;
  const logEl = modal.querySelector('#boss-log');
  if (logEl && bossState.lastLog) {
    const p = document.createElement('div');
    p.textContent = bossState.lastLog;
    p.style.marginTop = '6px';
    p.style.color = '#ddd';
    logEl.appendChild(p);
    // cap log size
    while (logEl.children.length > 6) logEl.removeChild(logEl.children[0]);
  }
}

export function setAttackHandler(fn) {
  currentAttackHandler = fn;
}

// show grid via gridMinigame; returns promise
export function showGrid(gridConfig) {
  const modal = document.getElementById(bossModalId);
  const host = modal ? modal.querySelector('#boss-grid-overlay') || modal : document.body;
  if (!host) return Promise.resolve({ success: false, timeOut: true });
  // position overlay relative to modal
  host.style.position = 'relative';
  host.style.display = 'block';
  return showGridMinigame(gridConfig, host).then(result => {
    try { host.style.display = 'none'; } catch (e) {}
    return result;
  });
}