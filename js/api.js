/* =========================================================
 *  api.js — Network layer with automatic DEMO MODE fallback
 * =========================================================
 *  When /api/driver returns an error (no Vercel, no Supabase),
 *  the module falls back to built-in mock data so the wheel
 *  can be tested locally by opening index.html or with any
 *  simple HTTP server (npx serve, python -m http.server, etc.)
 * ========================================================= */

// ── Mock data used in demo mode ──────────────────────────
const MOCK_DRIVER = {
  ok: true,
  display_name: 'Juliano',
  service: 'Lyft Premium XL',
  city: 'Bakersfield, CA',
  jackpot_enabled: true,
  branding: {
    primary: '#ff00bf',
    accent: '#11d3ff',
    thanks: 'Thank you for riding with me',
    tagline: 'Every ride deserves a reward',
  },
  prizes: [
    { label: 'Candy Bar',       tier: 'bronze'  },
    { label: 'Gum Pack',        tier: 'bronze'  },
    { label: 'Phone Charger',   tier: 'silver'  },
    { label: 'Snack Box',       tier: 'bronze'  },
    { label: 'Gift Card $5',    tier: 'silver'  },
    { label: 'Water Bottle',    tier: 'bronze'  },
    { label: 'Gift Card $10',   tier: 'gold'    },
    { label: 'Free Ride',       tier: 'jackpot' },
  ],
};

let _demoMode  = false;
let _demoPrizes = MOCK_DRIVER.prizes;

/** Is the app running without a real backend? */
export function isDemoMode() { return _demoMode; }

/** Let main.js pass the real prizes array for mock spins */
export function setDemoPrizes(prizes) { _demoPrizes = prizes; }

// ── Driver config ────────────────────────────────────────
export async function fetchDriver(id) {
  try {
    const r = await fetch(`/api/driver?id=${encodeURIComponent(id)}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!r.ok) throw new Error(`driver_${r.status}`);
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error('not_json_response');
    return await r.json();
  } catch (e) {
    console.warn('[SpinWin] API unavailable — switching to DEMO MODE ·', e.message);
    _demoMode = true;
    return { ...MOCK_DRIVER };
  }
}

// ── Spin ─────────────────────────────────────────────────
export async function postSpin(driverId, fingerprint) {
  // Try the real API first (unless we already know it's offline)
  if (!_demoMode) {
    try {
      const r = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId, fingerprint }),
        cache: 'no-store',
      });
      if (!r.ok) throw new Error(`spin_${r.status}`);
      return await r.json();
    } catch (e) {
      console.warn('[SpinWin] Spin API unavailable — demo spin ·', e.message);
      _demoMode = true;
    }
  }

  // ── Demo spin — weighted random pick ───────────────────
  await new Promise((r) => setTimeout(r, 60)); // tiny yield for smooth animation

  const prizes = _demoPrizes;
  const idx = Math.floor(Math.random() * prizes.length);
  const p = prizes[idx];
  return {
    ok: true,
    index: idx,
    tier: p.tier,
    label: p.label,
    won_at: new Date().toISOString(),
    replay: false,
  };
}

// ── Admin ────────────────────────────────────────────────
export async function postAdmin(payload) {
  if (_demoMode) {
    return { ok: true, total: 42, today: 7, breakdown: { bronze: 20, silver: 12, gold: 8, jackpot: 2 } };
  }
  const r = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`admin_${r.status}`);
  return await r.json();
}

// ── Fingerprint ──────────────────────────────────────────
const FP_KEY = 'spinwin_fp_v1';

function randomFP() {
  const bytes = new Uint8Array(16);
  (crypto || window.crypto).getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashString(s) {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function deviceSignature() {
  const nav = navigator;
  const screen = window.screen;
  const parts = [
    nav.userAgent || '',
    nav.language || '',
    (nav.languages || []).join(','),
    nav.platform || '',
    nav.hardwareConcurrency || 0,
    nav.deviceMemory || 0,
    nav.maxTouchPoints || 0,
    screen.width, screen.height, screen.colorDepth,
    new Date().getTimezoneOffset(),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  ].join('|');
  return await hashString(parts);
}

export async function getFingerprint() {
  let stable = null;
  try { stable = localStorage.getItem(FP_KEY); } catch {}
  if (stable && stable.length >= 32) return stable;

  let sig;
  try { sig = await deviceSignature(); }
  catch { sig = randomFP(); }

  const fp = sig.slice(0, 24) + randomFP().slice(0, 16);
  try { localStorage.setItem(FP_KEY, fp); } catch {}
  return fp;
}

// ── Result cache ─────────────────────────────────────────
const RESULT_KEY = (driverId) => `spinwin_result_${driverId}_v1`;

export function cacheResult(driverId, result) {
  if (_demoMode) return; // don't cache in demo — allow unlimited re-spins
  try { localStorage.setItem(RESULT_KEY(driverId), JSON.stringify(result)); } catch {}
}

export function readCachedResult(driverId) {
  if (_demoMode) return null; // always start fresh in demo
  try {
    const raw = localStorage.getItem(RESULT_KEY(driverId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
