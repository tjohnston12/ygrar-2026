// api/cps.js — list control points (for the map view and the proof picker).
// GET -> { cps: [...] }  (everything except Removed)

import { find } from '../lib/airtable.js';
import { allowCors } from '../lib/cors.js';

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const showAll = req.query && (req.query.all === '1' || req.query.all === 'true');
  const rows = await find('CPs', showAll ? {} : { filter: "NOT({Status}='Removed')" });
  const cps = rows.map((c) => ({
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
  }));
  return res.status(200).json({ cps });
}
