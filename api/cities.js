// api/cities.js — active cities in the series (for the registration picker).
// GET -> { cities: [{ id, name }] }

import { find } from '../lib/airtable.js';
import { allowCors } from '../lib/cors.js';

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rows = await find('Cities', { filter: '{Active}', sort: [{ field: 'Name', direction: 'asc' }] });
  const cities = rows.map((r) => ({ id: r.id, name: r.Name || '' })).filter((c) => c.name);
  return res.status(200).json({ cities });
}
