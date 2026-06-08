// api/roster.js — public participant roster + family stats.
// Privacy: adults are shown by full name + photo; children (minors) are returned
// by FIRST NAME ONLY and never with a photo.
// GET -> { racers:[{name, photo, team, captain, cities, kids:[firstName]}], stats:{...} }

import { find } from '../lib/airtable.js';
import { allowCors } from '../lib/cors.js';

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rows = await find('Racers', { filter: "{Registration status}='Active'" });
  const racers = rows
    .map((r) => {
      const kids = (r['Children'] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((n) => n.split(/\s+/)[0]); // first name only for minors
      return {
        name: r['Full name'] || '',
        photo: r['Profile photo URL'] || '',
        team: r['Team name'] || '',
        captain: (r['Type'] || '') === 'Team captain',
        cities: r['Cities'] || '',
        kids,
      };
    })
    .filter((x) => x.name);

  const teams = new Set(racers.filter((r) => r.team).map((r) => r.team));
  const juniors = racers.reduce((n, r) => n + r.kids.length, 0);
  const families = racers.filter((r) => r.kids.length).length;

  return res.status(200).json({
    racers,
    stats: { racers: racers.length, teams: teams.size, juniors, families },
  });
}
