import { rpc, jsonResponse, badRequest } from './_supabase.js';

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 16384) reject(new Error('payload_too_large')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return badRequest(res, 'method_not_allowed');

  let body;
  try { body = await readBody(req); }
  catch (e) { return badRequest(res, e.message || 'bad_body'); }

  const driver = (body.driver_id || '').toString().trim().toLowerCase();
  const pin = (body.pin || '').toString();
  const action = (body.action || '').toString();

  if (!driver || !/^[a-z0-9_-]{1,40}$/.test(driver)) return badRequest(res, 'invalid_driver_id');
  if (!pin || !/^\d{4}$/.test(pin)) return badRequest(res, 'invalid_pin');

  if (action === 'stats') {
    const r = await rpc('spinwin_admin_stats', { p_driver_id: driver, p_pin: pin });
    if (!r.ok) return jsonResponse(res, 502, { ok: false, error: 'upstream_error' });
    return jsonResponse(res, 200, r.data);
  }

  if (action === 'update') {
    const patch = body.patch && typeof body.patch === 'object' ? body.patch : {};
    const r = await rpc('spinwin_admin_update', { p_driver_id: driver, p_pin: pin, p_patch: patch });
    if (!r.ok) return jsonResponse(res, 502, { ok: false, error: 'upstream_error' });
    return jsonResponse(res, 200, r.data);
  }

  return badRequest(res, 'unknown_action');
}
