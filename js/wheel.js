const TIER_COLORS = {
  bronze:  { fill: '#5a3318', glow: '#d49364', label: '#ffd9b8' },
  silver:  { fill: '#3a4154', glow: '#d8dee9', label: '#ffffff' },
  gold:    { fill: '#6a4a00', glow: '#ffd166', label: '#fff5cf' },
  jackpot: { fill: '#ff00bf', glow: '#ffd166', label: '#ffffff' },
};

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderWheel(svgEl, prizes) {
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  svgEl.setAttribute('viewBox', '0 0 400 400');

  const defs = document.createElementNS(SVG_NS, 'defs');
  ['bronze','silver','gold','jackpot'].forEach((t) => {
    const grad = document.createElementNS(SVG_NS, 'radialGradient');
    grad.id = `g_${t}`;
    grad.setAttribute('cx', '50%');
    grad.setAttribute('cy', '50%');
    grad.setAttribute('r', '70%');
    const s1 = document.createElementNS(SVG_NS, 'stop');
    s1.setAttribute('offset', '0%');
    s1.setAttribute('stop-color', TIER_COLORS[t].glow);
    s1.setAttribute('stop-opacity', '0.9');
    const s2 = document.createElementNS(SVG_NS, 'stop');
    s2.setAttribute('offset', '100%');
    s2.setAttribute('stop-color', TIER_COLORS[t].fill);
    s2.setAttribute('stop-opacity', '1');
    grad.append(s1, s2);
    defs.append(grad);
  });
  svgEl.append(defs);

  const N = prizes.length;
  const seg = 360 / N;
  const cx = 200, cy = 200, r = 196;

  prizes.forEach((p, i) => {
    const startAng = -90 + i * seg;
    const endAng = startAng + seg;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', arcPath(cx, cy, r, startAng, endAng));
    path.setAttribute('fill', `url(#g_${p.tier})`);
    path.setAttribute('stroke', 'rgba(0,0,0,0.45)');
    path.setAttribute('stroke-width', '1.5');
    svgEl.appendChild(path);

    const midAng = (startAng + endAng) / 2;
    const labelR = r * 0.62;
    const lx = cx + labelR * Math.cos(deg2rad(midAng));
    const ly = cy + labelR * Math.sin(deg2rad(midAng));

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', lx);
    text.setAttribute('y', ly);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', TIER_COLORS[p.tier].label);
    text.setAttribute('font-family', 'Bebas Neue, Impact, sans-serif');
    text.setAttribute('font-size', N > 8 ? '14' : '17');
    text.setAttribute('letter-spacing', '1.2');
    text.setAttribute('transform', `rotate(${midAng + 90} ${lx} ${ly})`);
    text.textContent = (p.label || '').toUpperCase().slice(0, 18);
    svgEl.appendChild(text);

    const iconR = r * 0.86;
    const ix = cx + iconR * Math.cos(deg2rad(midAng));
    const iy = cy + iconR * Math.sin(deg2rad(midAng));
    const icon = document.createElementNS(SVG_NS, 'text');
    icon.setAttribute('x', ix);
    icon.setAttribute('y', iy);
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('dominant-baseline', 'middle');
    icon.setAttribute('fill', TIER_COLORS[p.tier].label);
    icon.setAttribute('font-size', '14');
    icon.setAttribute('font-weight', '700');
    icon.setAttribute('transform', `rotate(${midAng + 90} ${ix} ${iy})`);
    icon.textContent = tierStars(p.tier);
    svgEl.appendChild(icon);
  });

  const ring = document.createElementNS(SVG_NS, 'circle');
  ring.setAttribute('cx', cx);
  ring.setAttribute('cy', cy);
  ring.setAttribute('r', r);
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', 'rgba(255,255,255,0.18)');
  ring.setAttribute('stroke-width', '2');
  svgEl.appendChild(ring);
}

function tierStars(tier) {
  if (tier === 'bronze')  return '★';
  if (tier === 'silver')  return '★★';
  if (tier === 'gold')    return '★★★';
  if (tier === 'jackpot') return '🏆';
  return '';
}

function deg2rad(d) { return (d * Math.PI) / 180; }

function arcPath(cx, cy, r, startDeg, endDeg) {
  const start = polar(cx, cy, r, endDeg);
  const end   = polar(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', r, r, 0, large, 0, end.x, end.y,
    'Z'
  ].join(' ');
}
function polar(cx, cy, r, deg) {
  const rad = deg2rad(deg);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

let _currentRotation = 0;

export function spinTo(svgEl, totalSegments, segmentIndex, options = {}) {
  const baseRotations = options.rotations ?? 5;
  const segAng = 360 / totalSegments;
  const segCenterFromTop = segmentIndex * segAng;
  const jitter = (Math.random() - 0.5) * (segAng * 0.55);
  const targetMod = (360 - segCenterFromTop) + jitter;
  const currentMod = ((_currentRotation % 360) + 360) % 360;
  const delta = ((targetMod - currentMod) + 360) % 360;
  const finalRotation = _currentRotation + baseRotations * 360 + delta;
  _currentRotation = finalRotation;
  svgEl.style.transform = `rotate(${finalRotation}deg)`;
  return options.duration ?? 4600;
}

export function resetWheel(svgEl) {
  _currentRotation = 0;
  svgEl.style.transition = 'none';
  svgEl.style.transform = 'rotate(0deg)';
  void svgEl.getBoundingClientRect();
  svgEl.style.transition = '';
}
