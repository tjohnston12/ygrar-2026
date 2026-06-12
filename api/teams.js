// api/teams.js — distinct existing team names, for the "join a team" picker on
// the registration page. Returns names only (no personal data), across racers of
// any status, so a teammate can join a team the moment its captain has registered.
// GET -> { teams: ["Trail Blazers", ...] }

import { find } from '../lib/airtable.js';
import { allowCors } from '../lib/cors.js';

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Exclude auto-created family units (Type='Family') — those aren't joinable.
  const rows = await find('Racers', { filter: "AND(NOT({Team name}=''), NOT({Type}='Family'))" });
  const teams = [...new Set(rows.map((r) => (r['Team name'] || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  return res.status(200).json({ teams });
}
