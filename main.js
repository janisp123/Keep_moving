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
  if (code === 'ArrowRight' || code === 'Space' || code === 'KeyD') {
    e.preventDefault();
    nudgeRight();
  } else if (code === 'ArrowLeft' || code === 'KeyA') {
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
  function extraDriftIfPushing(dtSeconds){
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

    // Extra drift while any problem is pushing
    const extra = extraDriftIfPushing(dt);
    if (extra > 0 && running && !GameState.dead){
      GameState.playerPos = Math.max(TRACK_MIN, GameState.playerPos - extra);
      playerBox.style.left = `${GameState.playerPos}%`;

      // Death check
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
    dragMult: 1.0,
    style: { bg:'#777', border:'#aaa', scale:0.95 }
  };

  function phaseForAge(age){
    if (age >= 40)   return 'senior';
    if (age >= 16)   return 'adult';
    if (age >= 10)   return 'teen';
    return 'child';
  }

  function configForPhase(phase){
    // You described:
    // 1–9: slow life, rare small grey problems, slow clicks; unlikely to die
    // 10–15: faster, yellow problems, you can move faster, more problems
    // 16–39: full speed, fastest movement, more problems
    // 40+: slower movement, red problems, stronger drag & more often
    switch(phase){
      case 'child':  return {
        driftMult: 0.55,
        nudgeForward: 0.8,
        nudgeBack: 1.6,
        spawnMinSec: 8,  spawnMaxSec: 13,
        speedPctPerSec: 10,
        dragMult: 0.6,
        style: { bg:'#666', border:'#9aa', scale:0.9 }
      };
      case 'teen':   return {
        driftMult: 0.9,
        nudgeForward: 1.2,
        nudgeBack: 2.4,
        spawnMinSec: 5,  spawnMaxSec: 9,
        speedPctPerSec: 13,
        dragMult: 0.9,
        style: { bg:'#c9a227', border:'#ffd76a', scale:1.0 } // yellow
      };
      case 'adult':  return {
        driftMult: 1.0,
        nudgeForward: 1.5,
        nudgeBack: 3.0,
        spawnMinSec: 3,  spawnMaxSec: 6,
        speedPctPerSec: 15,
        dragMult: 1.1,
        style: { bg:'#d4b43a', border:'#ffe083', scale:1.1 } // stronger yellow
      };
      case 'senior': return {
        driftMult: 1.25,
        nudgeForward: 0.8,
        nudgeBack: 2.4,
        spawnMinSec: 2,  spawnMaxSec: 4,
        speedPctPerSec: 16,
        dragMult: 1.5,
        style: { bg:'#b22222', border:'#ff9a9a', scale:1.2 } // red
      };
    }
  }

  function applyForAge(age){
    const phase = phaseForAge(age);
    const cfg = configForPhase(phase);
    current = { ...cfg };
    // Push into globals used by input
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

  // Public getters used by other sections
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
  // Compose message
  const reached = GameState.reachedKing ? 'and you reached the king.' : 'and you did not reach the king.';
  const msg = `You died at age ${GameState.ageYears} ${reached}`;

  // Reveal the Game Over card and fill text
  const card = document.getElementById('gameOverCard');
  const deathMsgEl = document.getElementById('deathMessage');
  if (card && deathMsgEl){
    deathMsgEl.textContent = msg;
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Lock controls after death
  disableControls();
}

