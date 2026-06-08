// api/cp-manage.js — admin create / update control points.
// POST { action:'create', fields:{...} }            -> { cp }
// POST { action:'update', id, fields:{...} }         -> { cp }
// "Removing" a CP = update its Status to 'Removed' (soft delete keeps the chain intact).

import { create, update } from '../lib/airtable.js';
import { requireAdmin } from '../lib/auth.js';

function toNum(v) { return v === '' || v == null ? null : Number(v); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { action, id, fields } = req.body || {};
  const f = fields || {};

  if (action === 'create') {
    const cp = await create('CPs', {
      'Name': f.name || 'Control point',
      'Discipline': f.discipline || 'Hiking',
      'Status': f.status || 'Live',
      'Latitude': toNum(f.lat),
      'Longitude': toNum(f.lng),
      'Location description': f.location || '',
      'Difficulty': f.difficulty ? parseInt(f.difficulty, 10) : null,
      'Chain position': f.chain ? parseInt(f.chain, 10) : null,
      'City': f.city || '',
      'Family friendly': !!f.familyFriendly,
    });
    return res.status(200).json({ cp });
  }

  if (action === 'update') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const u = {};
    if (f.name !== undefined) u['Name'] = f.name;
    if (f.discipline !== undefined) u['Discipline'] = f.discipline;
    if (f.status !== undefined) u['Status'] = f.status;
    if (f.lat !== undefined) u['Latitude'] = toNum(f.lat);
    if (f.lng !== undefined) u['Longitude'] = toNum(f.lng);
    if (f.location !== undefined) u['Location description'] = f.location;
    if (f.difficulty !== undefined) u['Difficulty'] = f.difficulty ? parseInt(f.difficulty, 10) : null;
    if (f.chain !== undefined) u['Chain position'] = f.chain ? parseInt(f.chain, 10) : null;
    if (f.city !== undefined) u['City'] = f.city;
    if (f.familyFriendly !== undefined) u['Family friendly'] = !!f.familyFriendly;
    const cp = await update('CPs', id, u);
    return res.status(200).json({ cp });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
