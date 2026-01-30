// Grid Minigame: green tiles are BAD (trap). Returns a Promise that resolves to:
// { success: true } on success,
// { success: false, clickedGreen: true } if player clicked a green tile,
// { success: false, timeOut: true } if time ran out
export function showGridMinigame(gridConfig, containerEl) {
  return new Promise((resolve) => {
    const cfg = Object.assign({ rows: 3, cols: 3, safeCount: 3, timeMs: 4000, trapDensity: 0.33 }, gridConfig || {});
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'grid-minigame-overlay';
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.pointerEvents = 'auto';
    overlay.style.zIndex = 9999;
    // containerEl should be positioned relative to host the overlay
    const host = containerEl || document.body;
    host.appendChild(overlay);

    // Inner panel
    const panel = document.createElement('div');
    panel.className = 'grid-panel';
    panel.style.background = 'rgba(20,20,30,0.95)';
    panel.style.padding = '12px';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';
    overlay.appendChild(panel);

    // Timer bar + info
    const infoLine = document.createElement('div');
    infoLine.style.color = '#fff';
    infoLine.style.marginBottom = '8px';
    infoLine.style.textAlign = 'center';
    infoLine.textContent = `Click ${cfg.safeCount} non-green tiles`;
    panel.appendChild(infoLine);

    // Grid container
    const gridEl = document.createElement('div');
    gridEl.style.display = 'grid';
    gridEl.style.gridTemplateColumns = `repeat(${cfg.cols}, 56px)`;
    gridEl.style.gridGap = '6px';
    gridEl.style.justifyContent = 'center';
    panel.appendChild(gridEl);

    const total = cfg.rows * cfg.cols;
    const trapCount = Math.min(total - cfg.safeCount, Math.round(total * cfg.trapDensity));
    // pick trap indices
    const indices = Array.from({ length: total }, (_, i) => i);
    shuffleArray(indices);
    const trapSet = new Set(indices.slice(0, trapCount));

    // Setup tiles
    const tiles = [];
    for (let i = 0; i < total; i++) {
      const tile = document.createElement('button');
      tile.className = 'grid-tile';
      tile.dataset.index = i;
      tile.style.width = '56px';
      tile.style.height = '56px';
      tile.style.border = '2px solid #333';
      tile.style.borderRadius = '6px';
      tile.style.background = '#222';
      tile.style.cursor = 'pointer';
      tile.style.outline = 'none';
      tile.style.position = 'relative';
      tile.style.boxSizing = 'border-box';
      tile.setAttribute('aria-label', `Tile ${i+1}`);
      gridEl.appendChild(tile);
      tiles.push(tile);
    }

    // State
    let safeClicked = 0;
    let isFinished = false;
    let timer = cfg.timeMs;
    // update timer UI
    const timerBarOuter = document.createElement('div');
    timerBarOuter.style.height = '8px';
    timerBarOuter.style.background = '#111';
    timerBarOuter.style.borderRadius = '4px';
    timerBarOuter.style.marginTop = '8px';
    timerBarOuter.style.overflow = 'hidden';
    panel.appendChild(timerBarOuter);
    const timerBar = document.createElement('div');
    timerBar.style.height = '100%';
    timerBar.style.width = '100%';
    timerBar.style.background = '#4caf50';
    timerBar.style.transition = 'width 0.1s linear';
    timerBarOuter.appendChild(timerBar);

    // Click handler
    function onTileClick(e) {
      if (isFinished) return;
      const idx = Number(e.currentTarget.dataset.index);
      // If trap, reveal green and finish with failure (clickedGreen)
      if (trapSet.has(idx)) {
        revealTrap(idx);
        finish({ success: false, clickedGreen: true });
        return;
      }
      // Safe tile clicked
      markSafe(idx);
      safeClicked++;
      if (safeClicked >= cfg.safeCount) {
        finish({ success: true });
      }
    }

    tiles.forEach(t => t.addEventListener('click', onTileClick));

    // Reveal functions
    function revealTrap(index) {
      const t = tiles[index];
      if (!t) return;
      t.style.background = '#26a69a'; // green = bad
      t.style.borderColor = '#115';
      t.textContent = '!';
      t.style.color = '#022';
      t.disabled = true;
    }
    function markSafe(index) {
      const t = tiles[index];
      if (!t) return;
      t.style.background = '#333';
      t.style.borderColor = '#666';
      t.textContent = '✓';
      t.style.color = '#ddd';
      t.disabled = true;
    }

    // timer loop
    const start = Date.now();
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - start;
      const remain = Math.max(0, cfg.timeMs - elapsed);
      const pct = (remain / cfg.timeMs) * 100;
      timerBar.style.width = pct + '%';
      if (remain <= 0 && !isFinished) {
        finish({ success: false, timeOut: true });
      }
    }, 80);

    function finish(result) {
      if (isFinished) return;
      isFinished = true;
      clearInterval(intervalId);
      // Remove handlers
      tiles.forEach(t => t.removeEventListener('click', onTileClick));
      // Reveal all traps for feedback
      trapSet.forEach(i => {
        const t = tiles[i];
        if (t && !t.disabled) revealTrap(i);
      });
      // short delay so player sees result
      setTimeout(() => {
        // teardown
        try { host.removeChild(overlay); } catch (e) {}
        resolve(result);
      }, 700);
    }

    // helpers
    function shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  });
}