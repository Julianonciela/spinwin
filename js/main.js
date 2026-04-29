import { fetchDriver, postSpin, postAdmin, getFingerprint, cacheResult, readCachedResult } from './api.js';
import { renderWheel, spinTo, resetWheel } from './wheel.js';
import { celebrateByTier } from './effects.js';

const $ = (s, root = document) => root.querySelector(s);

const state = {
  driverId: 'juliano',
  driver: null,
  fingerprint: null,
  spinning: false,
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('active', el.id === id);
    if (el.id === id) {
      el.classList.remove('fade-in');
      void el.offsetWidth;
      el.classList.add('fade-in');
    }
  });
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function readDriverId() {
  const url = new URL(window.location.href);
  const d = (url.searchParams.get('driver') || 'juliano').toLowerCase().trim();
  return /^[a-z0-9_-]{1,40}$/.test(d) ? d : 'juliano';
}

function applyBranding(driver) {
  const b = driver.branding || {};
  if (b.primary) document.documentElement.style.setProperty('--primary', b.primary);
  if (b.accent)  document.documentElement.style.setProperty('--accent', b.accent);

  $('#brand-name').textContent = (driver.display_name || '—').toUpperCase();
  $('#brand-service').textContent = driver.service || 'Premium Ride';
  $('#thanks-line').innerHTML = `${b.thanks || 'Thank you for riding with me'} — <strong>${driver.display_name}</strong>`;
  $('#tagline').textContent = (b.tagline || 'Every ride deserves a reward').toUpperCase();
  $('#welcome-driver').textContent = driver.display_name || '';
  $('#footer-service').textContent = `${driver.service} · ${driver.city}`;
}

function renderResult(result, driver, replay = false) {
  const tier = result.tier;
  const label = result.label;
  $('#result-card').dataset.tier = tier;
  const tb = $('#tier-badge');
  tb.dataset.tier = tier;
  tb.textContent = tier === 'jackpot' ? '🏆 JACKPOT' : tier.toUpperCase();
  const pn = $('#prize-name');
  pn.dataset.tier = tier;
  pn.textContent = label;
  $('#replay-tag').style.display = replay ? '' : 'none';
  $('#driver-greeting').textContent = `${driver.branding?.thanks || 'Thank you for riding'} — ${driver.display_name}`;
  const t = result.won_at ? new Date(result.won_at) : new Date();
  $('#prize-meta').textContent = `WON · ${t.toLocaleString([], { hour: '2-digit', minute: '2-digit' })}`;

  showScreen('screen-result');
  setTimeout(() => celebrateByTier(tier), 280);
}

async function loadDriver() {
  const r = await fetchDriver(state.driverId);
  if (!r || !r.ok) throw new Error('driver_not_found');
  state.driver = r;
  applyBranding(r);
}

async function startSpinFlow() {
  if (state.spinning) return;
  state.spinning = true;

  resetWheel($('#wheel-svg'));
  showScreen('screen-wheel');
  $('#wheel-hint').textContent = 'GOOD LUCK…';

  let res;
  try {
    res = await postSpin(state.driverId, state.fingerprint);
  } catch (e) {
    state.spinning = false;
    showScreen('screen-home');
    toast('Connection issue. Try again.');
    return;
  }

  if (!res || !res.ok) {
    state.spinning = false;
    if (res?.error === 'driver_not_found') {
      toast('This driver is not active right now.');
    } else {
      toast('Spin failed. Try again.');
    }
    showScreen('screen-home');
    return;
  }

  const total = state.driver.prizes.length;
  const idx = Math.max(0, Math.min(total - 1, res.index));
  const duration = spinTo($('#wheel-svg'), total, idx);

  setTimeout(() => {
    cacheResult(state.driverId, {
      tier: res.tier, label: res.label, index: res.index,
      won_at: res.won_at || new Date().toISOString(),
    });
    renderResult(res, state.driver, !!res.replay);
    state.spinning = false;
  }, duration + 250);
}

function bindAdmin() {
  const overlay = $('#admin-overlay');
  let tapCount = 0;
  let tapTimer = null;

  $('#hidden-tap').addEventListener('click', () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 1500);
    if (tapCount >= 5) {
      tapCount = 0;
      overlay.classList.add('open');
    }
  });

  $('#admin-close').addEventListener('click', () => overlay.classList.remove('open'));

  $('#admin-stats-btn').addEventListener('click', async () => {
    const pin = $('#admin-pin').value.trim();
    if (!/^\d{4}$/.test(pin)) { toast('Enter 4-digit PIN'); return; }
    try {
      const r = await postAdmin({ driver_id: state.driverId, pin, action: 'stats' });
      if (!r.ok) { toast(r.error === 'invalid_pin' ? 'Wrong PIN' : 'Error'); return; }
      $('#stat-total').textContent = r.total || 0;
      $('#stat-today').textContent = r.today || 0;
      $('#stat-jack').textContent = r.breakdown?.jackpot || 0;
      $('#admin-stats-block').style.display = 'grid';
    } catch { toast('Network error'); }
  });

  $('#admin-toggle-jackpot').addEventListener('click', async () => {
    const pin = $('#admin-pin').value.trim();
    if (!/^\d{4}$/.test(pin)) { toast('Enter 4-digit PIN'); return; }
    const next = !state.driver.jackpot_enabled;
    try {
      const r = await postAdmin({ driver_id: state.driverId, pin, action: 'update', patch: { jackpot_enabled: next } });
      if (!r.ok) { toast(r.error === 'invalid_pin' ? 'Wrong PIN' : 'Error'); return; }
      state.driver.jackpot_enabled = next;
      toast(`Jackpot ${next ? 'ON' : 'OFF'}`);
    } catch { toast('Network error'); }
  });

  $('#admin-clear-local').addEventListener('click', () => {
    try { localStorage.clear(); } catch {}
    toast('Local cache cleared');
  });
}

async function init() {
  state.driverId = readDriverId();
  state.fingerprint = await getFingerprint();

  try {
    await loadDriver();
  } catch (e) {
    toast('Could not load driver config.');
    return;
  }

  renderWheel($('#wheel-svg'), state.driver.prizes);

  const cached = readCachedResult(state.driverId);
  if (cached && cached.tier && cached.label) {
    renderResult(cached, state.driver, true);
  } else {
    showScreen('screen-home');
  }

  $('#spin-cta').addEventListener('click', startSpinFlow);

  bindAdmin();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
