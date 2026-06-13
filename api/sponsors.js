// api/sponsors.js — public list of active sponsors for the Sponsors page + widgets.
// GET -> { sponsors: [{name, tier, logo, website, blurb}] }

import { find } from '../lib/airtable.js';
import { allowCors } from '../lib/cors.js';

const ORDER = { Title: 0, Gold: 1, Silver: 2, Community: 3 };

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rows = await find('Sponsors', { filter: '{Active}' });
  const sponsors = rows
    .map((r) => ({
      name: r.Name || r['Sponsor name'] || '',
      tier: r.Tier || 'Community',
      logo: r['Logo URL'] || r['Logo Url'] || r.Logo || '',
      website: r.Website || r['Website URL'] || r['Web site'] || r.URL || r.Url || r.Site || r.Link || '',
      blurb: r.Blurb || r.Description || '',
    }))
    .sort((a, b) => (ORDER[a.tier] ?? 9) - (ORDER[b.tier] ?? 9));

  return res.status(200).json({ sponsors });
}
