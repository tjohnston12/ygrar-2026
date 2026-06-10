// api/cps.js — list control points for the map / proof picker / gallery picker.
//
// CPs are GATED by the viewer's registered cities:
//   - cities the viewer is registered in     -> full CP detail (shown on the map)
//   - cities the viewer is NOT registered in  -> hidden; only a per-city count is returned
//   - CPs with no city set are visible to everyone
//   - logged-out visitors are registered in nothing -> they get counts only
//
// Admin view (?all=1 with an admin token) is ungated and returns everything.

import { find, findOne, esc } from '../lib/airtable.js';
import { verifyToken, requireAdmin } from '../lib/auth.js';
import { allowCors } from '../lib/cors.js';

function shape(c) {
  return {
    id: c.id,
    name: c.Name || 'Control point',
    discipline: c.Discipline || 'Other',
    status: c.Status || 'Live',
    lat: c.Latitude,
    lng: c.Longitude,
    difficulty: c.Difficulty || null,
    location: c['Location description'] || '',
    chain: c['Chain position'] || null,
    city: c.City || '',
    familyFriendly: !!c['Family friendly'],
    flagged: !!c.Flagged,
    flagCount: c['Flag count'] || 0,
    placedByTeam: c['Placed by team'] || '',
    photoUrl: c['Photo URL'] || '',
  };
}

function parseCities(str) {
  return String(str || '').split(',').map((s) => s.trim()).filter(Boolean);
}

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // --- Admin view: everything, ungated ---
  const showAll = req.query && (req.query.all === '1' || req.query.all === 'true');
  if (showAll) {
    const admin = requireAdmin(req, res);
    if (!admin) return; // 401 / 403 already sent
    const rows = await find('CPs', {});
    return res.status(200).json({ cps: rows.map(shape), unlocked: null, locked: [] });
  }

  // --- Who's asking? (token is optional) ---
  const viewer = verifyToken(req);
  const unlocked = new Set();
  if (viewer && viewer.id) {
    const me = await findOne('Racers', `RECORD_ID()='${esc(viewer.id)}'`);
    if (me) parseCities(me.Cities).forEach((c) => unlocked.add(c));
  }

  const rows = await find('CPs', { filter: "NOT({Status}='Removed')" });

  const cps = [];
  const lockedCounts = {}; // city -> count of LIVE CPs the viewer can't see yet
  for (const c of rows) {
    const city = c.City || '';
    const open = city === '' || unlocked.has(city);
    if (open) {
      cps.push(shape(c));
    } else if ((c.Status || 'Live') === 'Live') {
      lockedCounts[city] = (lockedCounts[city] || 0) + 1;
    }
  }

  const locked = Object.keys(lockedCounts)
    .sort()
    .map((city) => ({ city, count: lockedCounts[city] }));

  return res.status(200).json({
    cps,
    unlocked: [...unlocked].sort(),
    locked,
  });
}
