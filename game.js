/* ============================================================
   SNAKE // NEON  —  game.js
   Developed by Niyal Rahaman
   ============================================================ */

// ============================================================
// CANVAS SETUP & RESPONSIVE SIZING
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const COLS = 20;
const ROWS = 20;
let CELL   = 20;

function resizeCanvas() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const isLandMobile = W > H && H < 480;
  const isDesktop    = W >= 600 && H >= 680;

  let availW, availH;

  if (isLandMobile) {
    const dpadW = Math.min(155, W * 0.34) + 20;
    availW = W - dpadW - 40;
    availH = H - 12;
  } else if (isDesktop) {
    availW = Math.min(W - 40, 520);
    availH = H - 170;
  } else {
    // Portrait mobile — leave room for title + stats + dpad + footer
    availW = W - 16;
    availH = H - 310;
  }

  const size = Math.max(COLS, Math.floor(Math.min(availW, availH) / COLS) * COLS);
  CELL = size / COLS;

  canvas.width  = size;
  canvas.height = size;
}

resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
  draw();
});

// ============================================================
// DOM REFERENCES
// ============================================================
const overlay      = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlaySub   = document.getElementById('overlaySub');
const startBtn     = document.getElementById('startBtn');
const scoreDisplay = document.getElementById('scoreDisplay');
const bestDisplay  = document.getElementById('bestDisplay');
const levelDisplay = document.getElementById('levelDisplay');

// ============================================================
// GAME STATE VARIABLES
// ============================================================
let snake, dir, nextDir, food, specialFood;
let score, level, frame;
let gameLoop, animId;
let running = false;
let paused  = false;
let particles = [];

let best = parseInt(localStorage.getItem('snakeBest') || '0');
bestDisplay.textContent = String(best).padStart(4, '0');

// ============================================================
// PARTICLE CLASS
// ============================================================
class Particle {
  constructor(x, y, color) {
    this.x     = x;
    this.y     = y;
    this.vx    = (Math.random() - 0.5) * 5;
    this.vy    = (Math.random() - 0.5) * 5;
    this.color = color;
    this.size  = Math.random() * 4 + 2;
    this.life  = 1;
  }

  update() {
    this.x  += this.vx;
    this.y  += this.vy;
    this.vy += 0.12;
    this.life -= 0.045;
  }

  draw(c) {
    c.save();
    c.globalAlpha  = Math.max(0, this.life);
    c.fillStyle    = this.color;
    c.shadowBlur   = 8;
    c.shadowColor  = this.color;
    c.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    c.restore();
  }
}

function spawnParticles(col, row, color, count = 14) {
  const cx = col * CELL + CELL / 2;
  const cy = row * CELL + CELL / 2;
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(cx, cy, color));
  }
}

// ============================================================
// GAME INIT
// ============================================================
function initGame() {
  snake      = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir        = { x: 1, y: 0 };
  nextDir    = { x: 1, y: 0 };
  score      = 0;
  level      = 1;
  frame      = 0;
  particles  = [];
  specialFood = null;
  placeFood();
  updateHUD();
}

function getSpeed() {
  return Math.max(55, 145 - (level - 1) * 13);
}

function placeFood() {
  let p;
  do {
    p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };
  } while (snake.some(s => s.x === p.x && s.y === p.y));
  food = p;
  food.pulse = 0;
}

function placeSpecial() {
  if (specialFood) return;
  let p;
  do {
    p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };
  } while (
    snake.some(s => s.x === p.x && s.y === p.y) ||
    (food && p.x === food.x && p.y === food.y)
  );
  specialFood = p;
  specialFood.life  = 200;
  specialFood.pulse = 0;
}

function updateHUD() {
  scoreDisplay.textContent = String(score).padStart(4, '0');
  levelDisplay.textContent = String(level).padStart(2, '0');
}

function popStat(id) {
  const el = document.getElementById(id);
  el.classList.remove('pop');
  void el.offsetWidth; // force reflow
  el.classList.add('pop');
}

// ============================================================
// GAME STEP (called by interval)
// ============================================================
function step() {
  dir = { ...nextDir };

  const head = {
    x: (snake[0].x + dir.x + COLS) % COLS,
    y: (snake[0].y + dir.y + ROWS) % ROWS
  };

  // Self-collision → game over
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);
  let grew = false;

  // Eat normal food
  if (head.x === food.x && head.y === food.y) {
    grew   = true;
    score += level * 10;
    spawnParticles(food.x, food.y, '#00ff88', 16);
    popStat('scoreDisplay');
    placeFood();

    const newLevel = Math.floor(score / 100) + 1;
    if (newLevel > level) {
      level = newLevel;
      popStat('levelDisplay');
      restartLoop(); // speed up
    }

    if (score % 50 === 0) placeSpecial();
    updateHUD();
  }

  // Eat special food
  if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
    grew   = true;
    score += level * 30;
    spawnParticles(specialFood.x, specialFood.y, '#ffd60a', 26);
    popStat('scoreDisplay');
    specialFood = null;
    updateHUD();
  }

  if (!grew) snake.pop();

  // Special food timer
  if (specialFood) {
    specialFood.life--;
    if (specialFood.life <= 0) specialFood = null;
  }

  frame++;
}

// ============================================================
// GAME OVER
// ============================================================
function gameOver() {
  running = false;
  clearInterval(gameLoop);
  spawnParticles(snake[0].x, snake[0].y, '#ff2d55', 32);

  if (score > best) {
    best = score;
    localStorage.setItem('snakeBest', best);
    bestDisplay.textContent = String(best).padStart(4, '0');
  }

  setTimeout(() => {
    overlayTitle.textContent = 'GAME OVER';
    overlaySub.innerHTML =
      `Score <span style="color:var(--neon-green)">${String(score).padStart(4, '0')}</span>` +
      ` &nbsp; Best <span style="color:var(--neon-cyan)">${String(best).padStart(4, '0')}</span>` +
      `<br><br>The neon serpent falls.`;
    startBtn.textContent = 'RETRY';
    overlay.classList.remove('hidden');
  }, 600);
}

// ============================================================
// DRAW (called every animation frame)
// ============================================================
function draw() {
  if (!CELL) return;

  // Clear
  ctx.fillStyle = '#010810';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Inner grid lines
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.04)';
  ctx.lineWidth   = 0.5;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, canvas.height);
    ctx.stroke();
  }
  for (let j = 0; j <= ROWS; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * CELL);
    ctx.lineTo(canvas.width, j * CELL);
    ctx.stroke();
  }

  // Particles
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => { p.update(); p.draw(ctx); });

  // Normal food (glowing circle)
  if (food) {
    food.pulse = (food.pulse || 0) + 0.08;
    const fp = Math.abs(Math.sin(food.pulse));
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;
    const fr = CELL * 0.3 + fp * 2.5;

    ctx.save();
    ctx.shadowBlur  = 18 + fp * 14;
    ctx.shadowColor = '#00ff88';
    ctx.fillStyle   = '#00ff88';
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle  = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(fx, fy, fr * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Special food (golden diamond with countdown ring)
  if (specialFood) {
    specialFood.pulse = (specialFood.pulse || 0) + 0.13;
    const sp      = Math.abs(Math.sin(specialFood.pulse));
    const sx      = specialFood.x * CELL + CELL / 2;
    const sy      = specialFood.y * CELL + CELL / 2;
    const sr      = CELL * 0.34 + sp * 3.5;
    const urgency = specialFood.life / 200;

    ctx.save();
    ctx.shadowBlur  = 22 + sp * 18;
    ctx.shadowColor = '#ffd60a';

    // Countdown arc
    ctx.strokeStyle = `rgba(255, 214, 10, ${0.4 + sp * 0.4})`;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, sr + 5, 0, Math.PI * 2 * urgency);
    ctx.stroke();

    // Diamond body
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.moveTo(sx, sy - sr);
    ctx.lineTo(sx + sr, sy);
    ctx.lineTo(sx, sy + sr);
    ctx.lineTo(sx - sr, sy);
    ctx.closePath();
    ctx.fill();

    // Center highlight
    ctx.fillStyle  = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Snake body segments
  snake.forEach((seg, i) => {
    const t      = i / snake.length;
    const isHead = i === 0;
    const x      = seg.x * CELL;
    const y      = seg.y * CELL;
    const pad    = isHead ? 1 : 2;
    const size   = CELL - pad * 2;

    ctx.save();

    if (isHead) {
      ctx.shadowBlur  = 20;
      ctx.shadowColor = '#00ff88';
      ctx.fillStyle   = '#00ff88';
    } else {
      const alpha = 0.85 - t * 0.35;
      ctx.shadowBlur  = 12 - t * 8;
      ctx.shadowColor = `rgba(0, 255, 136, ${alpha})`;
      const grad = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
      grad.addColorStop(0, `rgba(0, 255, 136, ${alpha})`);
      grad.addColorStop(1, `rgba(0, 160, 80, ${alpha * 0.7})`);
      ctx.fillStyle = grad;
    }

    roundRect(ctx, x + pad, y + pad, size, size, isHead ? 4 : 3);
    ctx.fill();

    // Eyes on head
    if (isHead) {
      ctx.fillStyle  = '#010810';
      ctx.shadowBlur = 0;
      const es  = 3;
      const ex1 = x + CELL / 2 - 4 + dir.x * 5;
      const ey1 = y + CELL / 2 - 4 + dir.y * 5;
      const ex2 = x + CELL / 2 + 4 + dir.x * 5;
      const ey2 = y + CELL / 2 + 4 + dir.y * 5;

      if (Math.abs(dir.x) > Math.abs(dir.y)) {
        ctx.fillRect(ex1 - es / 2, ey1 - es / 2, es, es);
        ctx.fillRect(ex2 - es / 2, ey2 - es / 2, es, es);
      } else {
        ctx.fillRect(ey1 - es / 2, ex1 - es / 2, es, es);
        ctx.fillRect(ey2 - es / 2, ex2 - es / 2, es, es);
      }
    }

    ctx.restore();
  });

  // Pause screen overlay
  if (paused && running) {
    ctx.save();
    ctx.fillStyle = 'rgba(1, 8, 16, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font      = `900 ${Math.round(CELL * 1.1)}px Orbitron, monospace`;
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'center';
    ctx.shadowBlur   = 20;
    ctx.shadowColor  = '#00ff88';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);

    ctx.font      = `${Math.round(CELL * 0.52)}px Share Tech Mono, monospace`;
    ctx.fillStyle = 'rgba(0, 255, 136, 0.5)';
    ctx.shadowBlur = 0;
    ctx.fillText('tap ❚❚ or press P to resume', canvas.width / 2, canvas.height / 2 + CELL);
    ctx.restore();
  }
}

// Helper: draw a rounded rectangle path
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

// ============================================================
// GAME LOOP MANAGEMENT
// ============================================================
function renderLoop() {
  draw();
  animId = requestAnimationFrame(renderLoop);
}

function restartLoop() {
  clearInterval(gameLoop);
  gameLoop = setInterval(() => {
    if (!paused) step();
  }, getSpeed());
}

function startGame() {
  overlay.classList.add('hidden');
  initGame();
  running = true;
  paused  = false;
  restartLoop();
  if (!animId) renderLoop();
}

startBtn.addEventListener('click', startGame);

// ============================================================
// KEYBOARD CONTROLS
// ============================================================
document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowUp':
    case 'w': case 'W':
      if (dir.y !== 1)  nextDir = { x: 0, y: -1 };
      e.preventDefault();
      break;

    case 'ArrowDown':
    case 's': case 'S':
      if (dir.y !== -1) nextDir = { x: 0, y: 1 };
      e.preventDefault();
      break;

    case 'ArrowLeft':
    case 'a': case 'A':
      if (dir.x !== 1)  nextDir = { x: -1, y: 0 };
      e.preventDefault();
      break;

    case 'ArrowRight':
    case 'd': case 'D':
      if (dir.x !== -1) nextDir = { x: 1, y: 0 };
      e.preventDefault();
      break;

    case 'p': case 'P':
      if (running) paused = !paused;
      break;

    case ' ':
      if (!running) startGame();
      e.preventDefault();
      break;
  }
});

// ============================================================
// D-PAD BUTTON CONTROLS
// ============================================================
function dBtn(id, fn) {
  const el = document.getElementById(id);
  const go = e => {
    e.preventDefault();
    fn();
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 120);
  };
  el.addEventListener('touchstart', go, { passive: false });
  el.addEventListener('mousedown',  go);
}

dBtn('btnUp',    () => { if (dir.y !== 1)  nextDir = { x: 0,  y: -1 }; });
dBtn('btnDown',  () => { if (dir.y !== -1) nextDir = { x: 0,  y:  1 }; });
dBtn('btnLeft',  () => { if (dir.x !== 1)  nextDir = { x: -1, y:  0 }; });
dBtn('btnRight', () => { if (dir.x !== -1) nextDir = { x: 1,  y:  0 }; });
dBtn('btnPause', () => { if (running) paused = !paused; });

// ============================================================
// SWIPE / TOUCH ON CANVAS
// ============================================================
let touchStartX = null;
let touchStartY = null;
const MIN_SWIPE = 22;

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  if (touchStartX === null) return;

  const dx  = e.changedTouches[0].clientX - touchStartX;
  const dy  = e.changedTouches[0].clientY - touchStartY;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  // Tap (no swipe) → toggle pause
  if (adx < MIN_SWIPE && ady < MIN_SWIPE) {
    if (running) paused = !paused;
    touchStartX = null;
    return;
  }

  // Swipe direction
  if (adx > ady) {
    if (dx > 0 && dir.x !== -1) nextDir = { x: 1,  y: 0 };
    else if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 };
  } else {
    if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y:  1 };
    else if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 };
  }

  touchStartX = null;
}, { passive: false });

canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

// ============================================================
// BOOT — draw initial frame and start render loop
// ============================================================
draw();
renderLoop();
