import { rpc, getClientIP, jsonResponse, badRequest } from './_supabase.js';

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 4096) reject(new Error('payload_too_large')); });
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
  const fp = (body.fingerprint || '').toString().trim();

  if (!driver || !/^[a-z0-9_-]{1,40}$/.test(driver)) return badRequest(res, 'invalid_driver_id');
  if (!fp || fp.length < 8 || fp.length > 128) return badRequest(res, 'invalid_fingerprint');

  const ip = getClientIP(req);
  const ua = (req.headers['user-agent'] || '').toString().slice(0, 240);

  const r = await rpc('spinwin_try_spin', {
    p_driver_id: driver,
    p_ip: ip,
    p_fingerprint: fp,
    p_user_agent: ua,
  });

  if (!r.ok) return jsonResponse(res, 502, { ok: false, error: 'upstream_error' });
  return jsonResponse(res, 200, r.data);
}
