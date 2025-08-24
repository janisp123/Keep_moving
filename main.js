// ====================================
// SECTION 1 (main.js): DOM References
// ====================================
const startBtn   = document.getElementById('startBtn');
const nameInput  = document.getElementById('nameInput');
const ageInput   = document.getElementById('ageInput');
const playerBox  = document.getElementById('player');
const ageHud     = document.getElementById('ageHud');
const ageYearsEl = document.getElementById('ageYears');


// ====================================
// SECTION 2 (main.js): Start Game Logic
// ====================================
startBtn.addEventListener('click', () => {
  const name = (nameInput.value || '').trim() || "Player";
  let startAge = parseInt(ageInput.value, 10);
  if (!Number.isFinite(startAge)) startAge = 10;
  startAge = Math.max(1, Math.min(120, startAge));

  playerBox.textContent = name;

  // Reveal HUD + game
  if (ageHud && ageHud.style.display === 'none') ageHud.style.display = 'block';
  const gameEl = document.getElementById('game');
  if (gameEl && gameEl.style.display === 'none') gameEl.style.display = 'block';

  // Hide pre-game UI
  const controlsEl = document.getElementById('controls');
  if (controlsEl) controlsEl.style.display = 'none';

  // Reset and start
  GameState.reset(name);
  GameState.ageYears = startAge;
  ageYearsEl.textContent = String(GameState.ageYears);

  // Initialize difficulty based on age
  Difficulty.applyForAge(GameState.ageYears);

  // Start timers + loop
  Difficulty.startAgeTimer(() => {
    // Each second = +1 year
    GameState.ageYears += 1;
    ageYearsEl.textContent = String(GameState.ageYears);
    Difficulty.applyForAge(GameState.ageYears);
  });

  startLoop();
  enableControls(); // enable movement keys only now
});

// Also allow pressing Enter in the name/age field to start
[nameInput, ageInput].forEach(inp=>{
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); startBtn.click(); }
  });
});





// ======================================
// SECTION 3 (main.js): Game State & Setup
// ======================================
const gameEl   = document.getElementById('game');
const deathBox = document.getElementById('death');
const kingBox  = document.getElementById('king');

const TRACK_MIN = 0;
const TRACK_MAX = 100;

// Baselines (Difficulty can scale these)
const DRIFT_BASE     = 6;   // baseline world drift toward death
let   NUDGE_FORWARD  = 1;   // will be set by Difficulty
let   NUDGE_BACK     = 2;   // will be set by Difficulty

let running   = false;
let lastTs    = 0;
let rafId     = 0;

// Keep the game hidden on load (in case HTML was cached)
if (gameEl) gameEl.style.display = 'none';

const GameState = {
  playerName: "Player",
  playerPos: 50,      // % along the track (0=Death, 100=King)
  reachedKing: false,
  dead: false,
  ageYears: 10,

  reset(name){
    this.playerName = name || "Player";
    this.playerPos = 50;
    this.reachedKing = false;
    this.dead = false;
    playerBox.textContent = this.playerName;
    render(); // snap to start
  }
};



// =======================================
// SECTION 4 (main.js): Input (Nudge Left/Right)
// =======================================
function nudgeRight(){
  if (!running || GameState.dead) return;
  GameState.playerPos = Math.min(TRACK_MAX, GameState.playerPos + NUDGE_FORWARD);
  render();
  detectAndApplyCollisions();
}

function nudgeLeft(){
  if (!running || GameState.dead) return;
  GameState.playerPos = Math.max(TRACK_MIN, GameState.playerPos - NUDGE_BACK);
  render();
  detectAndApplyCollisions();
}

// Attach movement controls only when game starts
function enableControls(){
  window.addEventListener('keydown', handleKeydown);
}

function disableControls(){
  window.removeEventListener('keydown', handleKeydown);
}

function handleKeydown(e){
  const code = e.code;
  if ((code === 'ArrowRight' || code === 'Space' || code === 'KeyD') && !e.repeat) {
    e.preventDefault();
    nudgeRight();
  } else if ((code === 'ArrowLeft' || code === 'KeyA') && !e.repeat) {
    e.preventDefault();
    nudgeLeft();
  }
}



// ======================================
// SECTION 5 (main.js): Loop & Rendering
// ======================================
function startLoop(){
  if (running) cancelAnimationFrame(rafId);
  running = true;
  lastTs = performance.now();
  rafId = requestAnimationFrame(tick);
}

function stopLoop(){
  running = false;
  cancelAnimationFrame(rafId);
  Difficulty.stopAgeTimer();
}

function tick(now){
  if (!running) return;
  const dt = Math.max(0, (now - lastTs) / 1000);
  lastTs = now;

  // Drift scales with age (via Difficulty)
  const ageDriftMult = Difficulty.getDriftMult();
  const drift = (GameState.reachedKing ? DRIFT_BASE / 2 : DRIFT_BASE) * ageDriftMult;
  GameState.playerPos = Math.max(TRACK_MIN, Math.min(TRACK_MAX, GameState.playerPos - drift * dt));

  // Update lifespan tracker
  if (window.LifeSpan) {
    LifeSpan.onTick(dt, { progress: GameState.playerPos, reachedKing: GameState.reachedKing });
    if (LifeSpan.shouldDie(GameState)) {
      GameState.dead = true;
      stopLoop();
      playerBox.textContent = `${GameState.playerName} ☠`;
      announceDeath();
      return; // stop loop immediately
    }
  }

  render();
  detectAndApplyCollisions(); // collisions based on actual box overlap

  if (running) rafId = requestAnimationFrame(tick);
}

function render(){
  // Fixed endpoints; player slides 0..100%
  deathBox.style.left  = `${TRACK_MIN}%`;   // anchored at left edge
  kingBox.style.left   = `${TRACK_MAX}%`;   // anchored at right edge
  playerBox.style.left = `${GameState.playerPos}%`;
}

// ======================================
// SECTION 6 (main.js): Collision Helpers
// ======================================
function rect(el){ return el.getBoundingClientRect(); }

// Simple horizontal overlap check with tiny tolerance
function overlapsHoriz(a, b){
  const pad = 1; // px tolerance
  return (a.right >= b.left - pad) && (a.left <= b.right + pad);
}

function detectAndApplyCollisions(){
  if (GameState.dead) return;

  const p = rect(playerBox);
  const d = rect(deathBox);
  const k = rect(kingBox);

  // Touching King → crown + slower drift (but game continues)
  if (!GameState.reachedKing && overlapsHoriz(p, k)) {
    GameState.reachedKing = true;
    playerBox.textContent = `${GameState.playerName} 👑`;
  }

  // Touching Death → immediate game over + announce
  if (overlapsHoriz(p, d)) {
    GameState.dead = true;
    stopLoop();
    playerBox.textContent = `${GameState.playerName} ☠`;
    announceDeath(); // <-- say: "You died at age X. You did/did not reach the king."
  }
}


// ======================================
// SECTION 7-1 (main.js): Problems Config & State
// ======================================
(function ProblemsModule(){
  // Static config
  const TAPS_TO_CLEAR = 10;   // taps to clear a pushing problem

  // Runtime state
  const problems = [];
  let problemCounter = 0;
  let lastUpdateTs = performance.now();

  // Guarded spawn scheduler (works even before Difficulty is defined)
  function rand(a,b){ return a + Math.random()*(b-a); }
  function getSpawnWindow(){
    if (window.Difficulty) {
      return Difficulty.getProblemSpawn();
    }
    // safe defaults until Difficulty is ready
    return { spawnMinSec: 6, spawnMaxSec: 10 };
  }
  function scheduleNextSpawn(){
    const { spawnMinSec, spawnMaxSec } = getSpawnWindow();
    return performance.now() + rand(spawnMinSec, spawnMaxSec) * 1000;
  }

  // Initialize AFTER we have the helpers
  let nextSpawnAt = scheduleNextSpawn();





// ======================================
// SECTION 7-2 (main.js): Spawning
// ======================================
  function createProblemEl(label){
    const el = document.createElement('div');
    el.className = 'box';
    const style = Difficulty.getProblemStyle();
    el.style.background    = style.bg;
    el.style.borderColor   = style.border;
    el.style.transform     = `translate(-50%, -50%) scale(${style.scale})`;
    el.style.pointerEvents = 'none';
    el.textContent = label;
    gameEl.appendChild(el);
    return el;
  }

  function spawnProblem(){
    problemCounter++;
    const el = createProblemEl(`Problem #${problemCounter}`);
    const startX = Math.max(TRACK_MIN, Math.min(TRACK_MAX, 96));
    const p = {
      id: problemCounter,
      el,
      x: startX,
      pushing: false,
      taps: 0,
      cleared: false,
      // Speed scales with age
      speedPctPerSec: Difficulty.getProblemSpeedPct()
    };
    problems.push(p);
    return p;
  }

  function removeProblem(p){
    p.cleared = true;
    if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
    const i = problems.indexOf(p);
    if (i !== -1) problems.splice(i, 1);
  }


// ======================================
// SECTION 7-3 (main.js): Updating & Effects
// ======================================
  // Invisible wall + safety band
  const PROBLEM_PUSH_FLOOR = 45; // problems can NEVER push you below this %
  const DANGER_BAND       = 12; // near death: problems pause and add no extra pull

  function extraDriftIfPushing(dtSeconds){
    // If we’re in the safety band or already below the floor, problems stop adding pull
    if (GameState.playerPos <= DANGER_BAND || GameState.playerPos <= PROBLEM_PUSH_FLOOR) return 0;

    const anyPushing = problems.some(p => p.pushing && !p.cleared);
    if (!anyPushing) return 0;

    // Base drift per second is age-scaled (same as in tick)
    const ageMult = window.Difficulty ? Difficulty.getDriftMult() : 1.0;
    const baseDriftPerSec = (GameState.reachedKing ? DRIFT_BASE / 2 : DRIFT_BASE) * ageMult;
    const baseThisFrame   = baseDriftPerSec * dtSeconds;

    // Problems intensify the pull; age phase controls strength
    const dragMult = window.Difficulty ? Difficulty.getProblemDragMult() : 1.0;
    return baseThisFrame * dragMult; // add on top of normal drift
  }

  function updateProblemsAndApplyEffects(){
    const now = performance.now();
    const dt = Math.max(0, (now - lastUpdateTs) / 1000);
    lastUpdateTs = now;

    // spawn using guarded scheduler
    if (now >= nextSpawnAt && running && !GameState.dead){
      spawnProblem();
      nextSpawnAt = scheduleNextSpawn();
    }

    const playerRect = rect(playerBox);

    for (const p of problems){
      if (p.cleared) continue;

      // Move left until collision
      if (!p.pushing){
        p.x = Math.max(TRACK_MIN, Math.min(TRACK_MAX, p.x - p.speedPctPerSec * dt));
        const probRect = rect(p.el);
        if (overlapsHoriz(playerRect, probRect)){
          p.pushing = true;
          // lock just in front of player; they can't pass each other
          p.x = GameState.playerPos + 2;
        }
      } else {
        // Stay locked just ahead of player
        p.x = GameState.playerPos + 2;
      }

      // Render problem
      p.el.style.left = `${p.x}%`;
      p.el.style.top  = playerBox.style.top || '50%';
      p.el.style.opacity   = p.pushing ? '1' : '0.8';
      p.el.style.boxShadow = p.pushing ? '0 0 16px rgba(255,208,138,0.45)' : 'none';
    }

    // Extra drift while any problem is pushing — but respect the invisible wall & danger band
    const extra = extraDriftIfPushing(dt);
    if (extra > 0 && running && !GameState.dead){
      const before = GameState.playerPos;
      let after = before - extra;

      // Invisible wall: problems cannot push you below PROBLEM_PUSH_FLOOR
      if (after < PROBLEM_PUSH_FLOOR) after = PROBLEM_PUSH_FLOOR;

      // Apply only if it actually moves us (and we’re not in the danger band)
      if (before > DANGER_BAND) {
        GameState.playerPos = Math.max(TRACK_MIN, after);
        playerBox.style.left = `${GameState.playerPos}%`;
      }

      // Death check still depends ONLY on normal drift/collisions; problems no longer finish you off
      const d = rect(deathBox);
      const pr = rect(playerBox);
      if (overlapsHoriz(pr, d)){
        GameState.dead = true;
        stopLoop();
        playerBox.textContent = `${GameState.playerName} ☠`;
        announceDeath(); // <-- age + reached king status
      }
    }

    // Prevent player from passing problems
    for (const p of problems){
      if (p.pushing && !p.cleared){
        if (GameState.playerPos >= p.x - 2){
          GameState.playerPos = p.x - 2;
          playerBox.style.left = `${GameState.playerPos}%`;
        }
      }
    }
  }

  const _render = render;
  render = function(){ _render(); };

  const _detect = detectAndApplyCollisions;
  detectAndApplyCollisions = function(){
    _detect();
    updateProblemsAndApplyEffects();
  };

// ======================================
// SECTION 7-4 (main.js): Input & Clearing
// ======================================
  const _handleKeydown = handleKeydown;
  handleKeydown = function(e){
    if (e.code === 'ArrowRight' || e.code === 'Space' || e.code === 'KeyD') {
      const pushing = problems.filter(p => p.pushing && !p.cleared);
      if (pushing.length){
        const px = GameState.playerPos;
        pushing.sort((a,b)=> Math.abs(a.x - px) - Math.abs(b.x - px));
        const t = pushing[0];
        t.taps++;
        t.el.style.transform = 'translate(-50%, -50%) scale(1.05)';
        setTimeout(()=>{ t.el.style.transform = 'translate(-50%, -50%)'; }, 70);

        if (t.taps >= TAPS_TO_CLEAR){
          removeProblem(t);
        }
      }
    }
    _handleKeydown(e);
  };


// ======================================
// SECTION 7-5 (main.js): Reset Hook
// ======================================
  const _reset = GameState.reset.bind(GameState);
  GameState.reset = function(name){
    while (problems.length) removeProblem(problems[0]);
    lastUpdateTs = performance.now();
    nextSpawnAt = scheduleNextSpawn();
    problemCounter = 0;
    _reset(name);
  };
})();

// ======================================
// SECTION 8 (main.js): Age & Difficulty System
// ======================================
window.Difficulty = (function(){
  let ageTimer = null;

  // Active difficulty snapshot
  let current = {
    driftMult: 1.0,
    nudgeForward: 1,
    nudgeBack: 2,
    // problems
    spawnMinSec: 6,
    spawnMaxSec: 10,
    speedPctPerSec: 14,
    dragMult: 0.5, // toned down
    style: { bg:'#777', border:'#aaa', scale:0.95 }
  };

  function phaseForAge(age){
    if (age >= 55)   return 'senior';
    if (age >= 20)   return 'adult';
    if (age >= 10)   return 'teen';
    return 'child';
  }

  function configForPhase(phase){
    switch(phase){
      case 'child':  return {
        driftMult: 0.55,
        nudgeForward: 0.8,
        nudgeBack: 1.6,
        spawnMinSec: 8,  spawnMaxSec: 13,
        speedPctPerSec: 10,
        dragMult: 0.3, // reduced
        style: { bg:'#666', border:'#9aa', scale:0.9 }
      };
      case 'teen':   return {
        driftMult: 0.9,
        nudgeForward: 1.2,
        nudgeBack: 2.4,
        spawnMinSec: 5,  spawnMaxSec: 9,
        speedPctPerSec: 13,
        dragMult: 0.6, // reduced
        style: { bg:'#c9a227', border:'#ffd76a', scale:1.0 }
      };
      case 'adult':  return {
        driftMult: 1.0,
        nudgeForward: 1.5,
        nudgeBack: 3.0,
        spawnMinSec: 3,  spawnMaxSec: 6,
        speedPctPerSec: 15,
        dragMult: 0.8, // reduced
        style: { bg:'#d4b43a', border:'#ffe083', scale:1.1 }
      };
      case 'senior': return {
        driftMult: 1.25,
        nudgeForward: 0.8,
        nudgeBack: 2.4,
        spawnMinSec: 2,  spawnMaxSec: 4,
        speedPctPerSec: 16,
        dragMult: 1.0, // reduced
        style: { bg:'#b22222', border:'#ff9a9a', scale:1.2 }
      };
    }
  }

  function applyForAge(age){
    const phase = phaseForAge(age);
    const cfg = configForPhase(phase);
    current = { ...cfg };
    NUDGE_FORWARD = cfg.nudgeForward;
    NUDGE_BACK    = cfg.nudgeBack;
  }

  function startAgeTimer(onTick){
    stopAgeTimer();
    ageTimer = setInterval(()=>{ try{ onTick(); }catch{} }, 1000);
  }
  function stopAgeTimer(){
    if (ageTimer){ clearInterval(ageTimer); ageTimer = null; }
  }

  function getDriftMult(){ return current.driftMult; }
  function getProblemSpawn(){ return { spawnMinSec: current.spawnMinSec, spawnMaxSec: current.spawnMaxSec }; }
  function getProblemSpeedPct(){ return current.speedPctPerSec; }
  function getProblemDragMult(){ return current.dragMult; }
  function getProblemStyle(){ return current.style; }

  return {
    applyForAge,
    startAgeTimer,
    stopAgeTimer,
    getDriftMult,
    getProblemSpawn,
    getProblemSpeedPct,
    getProblemDragMult,
    getProblemStyle
  };
})();

// ======================================
// SECTION 9 (main.js): Death Messaging
// ======================================
function announceDeath(){
  const reached = GameState.reachedKing;
  const age = GameState.ageYears;

  // Decide which zone player spent most time in (from LifeSpan time tracking)
  // Here we just use LifeSpan.debug() which has tGood/tBad, but extend later if you add per-zone tracking.
  let narrative = "";

  if (reached) {
    // 👑 Crown narrative (inspirational)
    narrative =
      "You risked it all. You pushed harder than most — physically, mentally, relentlessly. " +
      "Against the drag of time and the weight of problems, you reached the crown. " +
      "That choice set you apart: instead of drifting with the current, you aimed for more. " +
      "The crown gave you wealth, stability, and the means to provide the best healthcare for yourself and your family. " +
      "But more than that, it proved that striving changes everything — even though life still ends, the journey becomes extraordinary. " +
      "To live fully, you chose to go all in.";
  } else {
    // Pick narrative by majority zone lived in
    const dbg = LifeSpan.debug();
    const goodRatio = dbg.goodRatio;

    // Quick proxy for “majority zone”
    // If >0.7 good ratio = Stable/Climb/Throne zones; <0.3 = Danger/Effort zones
    if (goodRatio < 0.2) {
      narrative =
        "You spent most of your life in the danger band — struggling to survive day to day. " +
        "You lived with constant risk, little stability, and no safety net. Life expectancy was short, and death came early.";
    } else if (goodRatio < 0.45) {
      narrative =
        "You spent most of your life in the low-effort, low-success zone. " +
        "Resources were limited — healthcare, education, food quality all below average. " +
        "Statistically, lives here end sooner, and yours was no exception.";
    } else if (goodRatio < 0.65) {
      narrative =
        "You lived most of your life in the balanced middle. " +
        "Not without struggles, but with stability and access to opportunities. " +
        "Your lifespan matched the average, reflecting both the good and the bad.";
    } else if (goodRatio < 0.85) {
      narrative =
        "You spent most of your life striving above the norm. " +
        "Harder challenges came with greater risk, but also better rewards. " +
        "Your determination granted you longer years than most, though it came with constant effort.";
    } else {
      narrative =
        "You lived close to the King. Few reach this level — with privilege, power, or mastery. " +
        "Your life expectancy was extended beyond average, but still bounded by mortality. " +
        "Even kings fall before 122 years.";
    }
  }

  // Compose base message
  const msg = `You died at age ${age} ${reached ? "and you reached the king." : "and you did not reach the king."}`;

  // Reveal the Game Over card and fill text
  const card = document.getElementById('gameOverCard');
  const deathMsgEl = document.getElementById('deathMessage');
  if (card && deathMsgEl){
    deathMsgEl.innerHTML = `<p>${msg}</p><p>${narrative}</p>`;
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Lock controls after death
  disableControls();
}

// ===============================================
// SECTION 10 (main.js): Difficulty Tuning Config
// ===============================================
// All knobs live here. Tweak freely.
window.Tuning = {
  // Make it easy to stay/return to the center (50%).
  center: {
    enabled: true,
    centerPos: 50,     // where the "magnet" pulls you toward
    k: 14              // pull strength (~% track per second at full distance); higher = stronger center pull
  },

  // Make it hard to reach/hold the King (right side).
  kingWall: {
    startAt: 72,       // resistance begins after this position (0..100)
    curvePower: 2.1,   // how sharply resistance ramps up as you approach the king
    maxMult: 6,        // max resistance multiplier near 100 (effective rightward progress = progress / multiplier)
  },

  // Extra leftward pull as you near the King (in addition to existing drift).
  extraLeftPull: {
    enabled: true,
    rateAtEdge: 12     // additional % per second of left pull at 100; scales from startAt→100
  }
};
// =======================================================
// SECTION 11 (main.js): Movement & Loop Tuning Overlays
// =======================================================
(function TuningOverlays(){
  if (!window.Tuning) return;

  // -----------------------
  // Helpers (pure functions)
  // -----------------------
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }

  function kingWallMultiplier(pos){
    const cfg = Tuning.kingWall;
    if (!cfg) return 1;
    const start = cfg.startAt ?? 72;
    if (pos <= start) return 1;
    const t = clamp01((pos - start) / (100 - start));          // 0..1 across the final stretch
    return 1 + (cfg.maxMult - 1) * Math.pow(t, cfg.curvePower); // grows toward maxMult near 100
  }

  // -----------------------
  // Wrap nudgeRight to add resistance near the King
  // -----------------------
  const _nudgeRight = typeof nudgeRight === 'function' ? nudgeRight : null;
  if (_nudgeRight){
    window.nudgeRight = function(){
      if (!running || GameState.dead) return;
      const before = GameState.playerPos;
      _nudgeRight(); // perform the normal step
      const after = GameState.playerPos;

      // If we actually moved right, apply the resistance
      const delta = after - before;
      if (delta > 0){
        const mult = kingWallMultiplier(before); // resistance based on where you STARTED the push
        const effective = delta / (mult > 0 ? mult : 1);
        GameState.playerPos = before + effective;
        GameState.playerPos = Math.max(TRACK_MIN, Math.min(TRACK_MAX, GameState.playerPos));
        playerBox.style.left = `${GameState.playerPos}%`;
      }
    };
  }

  // -----------------------
  // Wrap tick to add center magnet + extra left pull near King
  // -----------------------
  const _tick = typeof tick === 'function' ? tick : null;
  if (_tick){
    let lastTuneTs = performance.now();

    window.tick = function(now){
      // Run the original loop first (drift, rendering, collisions, problems)
      _tick(now);

      if (!running || GameState.dead) { lastTuneTs = now; return; }

      const dt = Math.max(0, (now - lastTuneTs) / 1000);
      lastTuneTs = now;

      // 1) Center magnet — gentle pull toward centerPos
      const c = Tuning.center;
      if (c && c.enabled){
        const diff = (c.centerPos ?? 50) - GameState.playerPos; // positive if left of center, negative if right
        // Translate "k" (approx %/sec at full distance) into a frame adjustment
        const adjust = (c.k / 100) * diff * dt;
        GameState.playerPos += adjust;
      }

      // 2) Extra left pull near the King — scales from startAt → 100
      const ep = Tuning.extraLeftPull;
      const wall = Tuning.kingWall || { startAt: 72 };
      if (ep && ep.enabled){
        const start = wall.startAt ?? 72;
        if (GameState.playerPos > start){
          const t = clamp01((GameState.playerPos - start) / (100 - start)); // 0..1
          const pullPerSec = (ep.rateAtEdge ?? 12) * t; // %/sec
          GameState.playerPos -= pullPerSec * dt;
        }
      }

      // Clamp + reflect on screen + re-check collisions after tuning
      GameState.playerPos = Math.max(TRACK_MIN, Math.min(TRACK_MAX, GameState.playerPos));
      playerBox.style.left = `${GameState.playerPos}%`;

      // Collisions may become true after adjustments (e.g., pulled into Death)
      detectAndApplyCollisions();
    };
  }
})();

// ==================================================
// SECTION 12 (main.js): Lifespan & Death Expectancy
// ==================================================
// Goal:
// - You die at the *current average age of death* (tunable).
// - If you spent more time in the "good" part of life (>= MIDLINE),
//   your lifespan is longer; if you spent it in the "bad" part (< MIDLINE),
//   it is shorter.
// - Reaching the King grants a bonus, but MAX is capped at 122.
//
// This section is engine-agnostic. Call LifeSpan.onTick(dt, state) once per frame
// and use LifeSpan.shouldDie(state) to know when to end the run.

window.LifeSpan = (function(){
  // Tunables
  const MIDLINE = 50;          // progress >= MIDLINE counts as "good life"
  const BASE_LIFE = 75;        // "current average age of death" (years) — adjust if needed
  const MAX_LIFE  = 122;       // Jeanne Calment cap
  const MIN_LIFE  = 40;        // sanity floor
  const KING_BONUS_YEARS = 7;  // bonus for reaching the King (capped by MAX_LIFE)

  // Impact of life-balance on expectancy (years)
  const GOOD_MAX_BONUS = 10;   // if you lived mostly >= MIDLINE
  const BAD_MAX_PENALTY = -10; // if you lived mostly < MIDLINE

  // Internal accumulators (seconds)
  let tGood = 0;
  let tBad  = 0;

  // Utility
  const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));

  // Compute years delta from good:bad ratio
  function balanceDeltaYears(){
    const total = tGood + tBad;
    if (total <= 0) return 0;
    const goodRatio = tGood / total;      // 0..1
    // Map 0..1 => [-BAD_MAX, +GOOD_MAX]
    return BAD_MAX_PENALTY + (GOOD_MAX_BONUS - BAD_MAX_PENALTY) * goodRatio;
  }

  function expectedDeathAge(state){
    // Base + lifestyle + (king bonus if reached)
    const lifeDelta = balanceDeltaYears();
    const kingBonus = state?.reachedKing ? KING_BONUS_YEARS : 0;
    const exp = BASE_LIFE + lifeDelta + kingBonus;
    return clamp(exp, MIN_LIFE, MAX_LIFE);
  }

  return {
    // Call every frame/tick with dtSeconds and a state that includes progress (0..100)
    onTick(dtSeconds, state){
      const p = (state?.progress ?? 50);
      if (p >= MIDLINE) tGood += Math.max(0, dtSeconds || 0);
      else              tBad  += Math.max(0, dtSeconds || 0);
    },

    // Query the current expected lifespan in years
    getExpected(){ return { base: BASE_LIFE, expected: expectedDeathAge({ reachedKing:false }), max: MAX_LIFE }; },

    // Should the run end due to age?
    shouldDie(state){
      const ageYears = state?.ageYears ?? state?.age ?? 0;
      const reachedKing = !!state?.reachedKing;
      const exp = expectedDeathAge({ reachedKing });
      return ageYears >= exp;
    },

    // For UI/debug (optional)
    debug(){
      const total = tGood + tBad;
      const goodRatio = total>0 ? (tGood/total) : 0.5;
      return { tGood, tBad, goodRatio, GOOD_MAX_BONUS, BAD_MAX_PENALTY };
    }
  };
})();
// ========================================================
// SECTION 13 (main.js): Problem Push Guards (no killing)
// ========================================================
// Goal:
// - Problems *do not* directly kill the player.
// - Near death (danger band), problems stop pushing entirely.
// - Problems may block progress above midline, but cannot shove you below a floor.
// Use these helpers inside your problem/physics code.

window.ProblemGuards = (function(){
  // Tunables
  const MIDLINE = 50;
  const DANGER_BAND = 12;   // when progress < 12%, problems pause (no push)
  const PUSH_FLOOR  = 45;   // problems cannot push you below this % if you're above MIDLINE

  function problemsActiveAt(progress){
    // Pause problems in the danger band — only life drift can finish you.
    return progress >= DANGER_BAND;
  }

  function limitPushback(prevPos, nextPos){
    // If we started above MIDLINE and got pushed below the floor, clamp.
    if (prevPos >= MIDLINE && nextPos < PUSH_FLOOR) return PUSH_FLOOR;
    return nextPos;
  }

  return {
    problemsActiveAt,
    limitPushback,
    constants: { MIDLINE, DANGER_BAND, PUSH_FLOOR }
  };
})();
// ========================================================
// SECTION 14 (main.js): Effort Zone Safe-Band Tuning
// ========================================================
// Idea:
// - Create zones so player doesn’t always fall to death if not at exact middle.
// - 0–10%  : Danger band — only life drift kills, problems paused.
// - 10–40% : Effort zone — if player nudges sometimes, they can hold ground.
// - 40–60% : Stable zone — easiest area to hover in.
// - 60–80% : Climb zone — resistance and problems increase.
// - 80–100%: Throne zone — very hard, eventual collapse.
// This section adjusts drift and problem effects depending on zone.

window.Zones = (function(){
  const Z = {
    danger: { min: 0, max: 10 },
    effort: { min: 10, max: 40 },
    stable: { min: 40, max: 60 },
    climb:  { min: 60, max: 80 },
    throne: { min: 80, max: 100 }
  };

  // Drift multipliers (relative to Difficulty baseline)
  const DRIFT_MULTS = {
    danger: 1.0,
    effort: 1.0,
    stable: 0.6,
    climb:  1.2,
    throne: 2.0
  };

  // Problem multipliers (affect pushback / slowdown)
  const PROBLEM_FACTORS = {
    danger: 0.0, // problems paused
    effort: 0.5, // act as weight only
    stable: 0.3,
    climb:  1.0,
    throne: 1.5
  };

  function zoneForPos(pos){
    if (pos < Z.effort.min) return 'danger';
    if (pos < Z.stable.min) return 'effort';
    if (pos < Z.climb.min)  return 'stable';
    if (pos < Z.throne.min) return 'climb';
    return 'throne';
  }

  // Hooks for drift + problems
  function driftMult(baseMult, pos){
    const z = zoneForPos(pos);
    return baseMult * (DRIFT_MULTS[z] ?? 1.0);
  }

  function problemFactor(pos){
    const z = zoneForPos(pos);
    return PROBLEM_FACTORS[z] ?? 1.0;
  }

  return { zoneForPos, driftMult, problemFactor };
})();
// ========================================================
// SECTION 15 (main.js): King Buffs (easier life after crown)
// ========================================================
// Once you reach the King, you’ve proven yourself.
// Problems are still there, aging still drags you down,
// but the baseline is easier: fewer problems, slower push,
// stronger nudges, and it’s easier to hover above the middle.

(function KingBuffs(){
  // Multipliers applied when crowned
  const BUFFS = {
    dragMult: 0.5,           // problems drag only half as much
    spawnMult: 1.5,          // spawns take 1.5x longer (less frequent)
    speedMult: 0.7,          // problem speed slowed down
    centerBonus: 1.4,        // center magnet stronger
    nudgeForward: 3.0        // nudges feel 3× stronger after crown
  };

  // Wrap Difficulty getters so they respect crown
  const _getProblemDragMult = Difficulty.getProblemDragMult;
  Difficulty.getProblemDragMult = function(){
    const base = _getProblemDragMult();
    return GameState.reachedKing ? base * BUFFS.dragMult : base;
  };

  const _getProblemSpawn = Difficulty.getProblemSpawn;
  Difficulty.getProblemSpawn = function(){
    const base = _getProblemSpawn();
    if (!GameState.reachedKing) return base;
    return {
      spawnMinSec: base.spawnMinSec * BUFFS.spawnMult,
      spawnMaxSec: base.spawnMaxSec * BUFFS.spawnMult
    };
  };

  const _getProblemSpeedPct = Difficulty.getProblemSpeedPct;
  Difficulty.getProblemSpeedPct = function(){
    const base = _getProblemSpeedPct();
    return GameState.reachedKing ? base * BUFFS.speedMult : base;
  };

  // Boost center magnet if using Tuning.center
  if (window.Tuning && Tuning.center){
    const originalK = Tuning.center.k;
    Object.defineProperty(Tuning.center, "k", {
      get(){ return GameState.reachedKing ? originalK * BUFFS.centerBonus : originalK; }
    });
  }

  // Wrap nudgeRight so crowned players move further per tap
  const _nudgeRight = window.nudgeRight;
  window.nudgeRight = function(){
    if (!running || GameState.dead) return;
    const before = GameState.playerPos;
    _nudgeRight(); // perform the normal nudge using current Difficulty scaling
    if (GameState.reachedKing){
      const gained = GameState.playerPos - before;
      if (gained > 0){
        // Apply king bonus on top of normal movement
        GameState.playerPos = Math.min(TRACK_MAX, before + gained * BUFFS.nudgeForward);
        playerBox.style.left = `${GameState.playerPos}%`;
      }
    }
  };
})();
