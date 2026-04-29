import { rpc, jsonResponse, badRequest } from './_supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return badRequest(res, 'method_not_allowed');
  const id = (req.query?.id || '').toString().trim().toLowerCase();
  if (!id || !/^[a-z0-9_-]{1,40}$/.test(id)) return badRequest(res, 'invalid_driver_id');

  const r = await rpc('spinwin_get_driver', { p_driver_id: id });
  if (!r.ok) return jsonResponse(res, 502, { ok: false, error: 'upstream_error' });
  return jsonResponse(res, 200, r.data);
}
