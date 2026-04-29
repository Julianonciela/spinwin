let canvas, ctx, dpr = 1;
let particles = [];
let running = false;
let rafId = null;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.getElementById('fx-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize, { passive: true });
}

function resize() {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}

function rand(min, max) { return Math.random() * (max - min) + min; }

function loop() {
  if (!running) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const grav = 0.18 * dpr;
  const drag = 0.992;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += grav;
    p.vx *= drag;
    p.vy *= drag;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.spin;
    p.life -= 1;
    if (p.life <= 0 || p.y > canvas.height + 40 * dpr) {
      particles.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const alpha = Math.min(1, p.life / 30);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.shape === 'rect') {
      ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
    } else if (p.shape === 'star') {
      drawStar(ctx, 0, 0, 5, p.size, p.size * 0.45);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (particles.length === 0) {
    running = false;
    cancelAnimationFrame(rafId);
    rafId = null;
    return;
  }
  rafId = requestAnimationFrame(loop);
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = (Math.PI / 2) * 3;
  let x = cx, y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerR;
    y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}

function start() {
  if (rafId) return;
  running = true;
  rafId = requestAnimationFrame(loop);
}

const PALETTES = {
  bronze: ['#d49364', '#b97044', '#ffd9b8', '#ffffff'],
  silver: ['#d8dee9', '#a8b0c4', '#ffffff', '#7d859b'],
  gold:   ['#ffd166', '#ffb700', '#fff5cf', '#ffffff'],
  jackpot:['#ff00bf', '#ffd166', '#11d3ff', '#ffffff', '#a45dff'],
};

function burst({ x, y, count, palette, shape = 'rect', power = 1 }) {
  ensureCanvas();
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(2, 9) * power * dpr;
    particles.push({
      x: x * dpr, y: y * dpr,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(2, 6) * power * dpr,
      size: rand(2, 5) * dpr,
      rot: rand(0, Math.PI * 2),
      spin: rand(-0.3, 0.3),
      color: palette[Math.floor(Math.random() * palette.length)],
      life: rand(80, 140),
      shape,
    });
  }
  start();
}

export function celebrateBronze() {
  const cx = window.innerWidth / 2, cy = window.innerHeight * 0.45;
  burst({ x: cx, y: cy, count: 50,  palette: PALETTES.bronze, shape: 'circle', power: 0.7 });
}

export function celebrateSilver() {
  const cx = window.innerWidth / 2, cy = window.innerHeight * 0.45;
  burst({ x: cx, y: cy, count: 100, palette: PALETTES.silver, shape: 'rect', power: 0.95 });
  setTimeout(() => burst({ x: cx, y: cy, count: 60, palette: PALETTES.silver, shape: 'circle', power: 0.6 }), 200);
}

export function celebrateGold() {
  const cx = window.innerWidth / 2, cy = window.innerHeight * 0.45;
  burst({ x: cx, y: cy, count: 180, palette: PALETTES.gold, shape: 'rect', power: 1.2 });
  setTimeout(() => burst({ x: cx, y: cy, count: 80, palette: PALETTES.gold, shape: 'star', power: 0.9 }), 250);
  setTimeout(() => burst({ x: cx, y: cy, count: 80, palette: PALETTES.gold, shape: 'circle', power: 0.6 }), 500);
}

export function celebrateJackpot() {
  const w = window.innerWidth, h = window.innerHeight;
  const points = [
    { x: w * 0.25, y: h * 0.35 },
    { x: w * 0.75, y: h * 0.35 },
    { x: w * 0.5,  y: h * 0.25 },
    { x: w * 0.5,  y: h * 0.55 },
  ];
  points.forEach((pt, i) => {
    setTimeout(() => burst({ ...pt, count: 140, palette: PALETTES.jackpot, shape: 'star', power: 1.4 }), i * 350);
    setTimeout(() => burst({ ...pt, count: 70,  palette: PALETTES.jackpot, shape: 'rect', power: 1.0 }), i * 350 + 150);
  });
  setTimeout(() => burst({ x: w / 2, y: h * 0.4, count: 220, palette: PALETTES.jackpot, shape: 'rect', power: 1.6 }), 1500);
}

export function celebrateByTier(tier) {
  if (tier === 'bronze')  return celebrateBronze();
  if (tier === 'silver')  return celebrateSilver();
  if (tier === 'gold')    return celebrateGold();
  if (tier === 'jackpot') return celebrateJackpot();
  return celebrateBronze();
}
