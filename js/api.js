export async function fetchDriver(id) {
  const r = await fetch(`/api/driver?id=${encodeURIComponent(id)}`, { method: 'GET', cache: 'no-store' });
  if (!r.ok) throw new Error(`driver_${r.status}`);
  return r.json();
}

export async function postSpin(driverId, fingerprint) {
  const r = await fetch('/api/spin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driver_id: driverId, fingerprint }),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`spin_${r.status}`);
  return r.json();
}

export async function postAdmin(payload) {
  const r = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`admin_${r.status}`);
  return r.json();
}

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

const RESULT_KEY = (driverId) => `spinwin_result_${driverId}_v1`;

export function cacheResult(driverId, result) {
  try { localStorage.setItem(RESULT_KEY(driverId), JSON.stringify(result)); } catch {}
}
export function readCachedResult(driverId) {
  try {
    const raw = localStorage.getItem(RESULT_KEY(driverId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
