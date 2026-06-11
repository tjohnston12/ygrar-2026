// api/potw-post.js — Photo of the Week as a Facebook-ready post, for a Zapier
// "Webhooks by Zapier (GET)" step feeding "Facebook Pages — Create Page Post".
// Returns the winning photo's image URL + a caption, so it posts as a real photo.
//
// Voting resets every Monday, so by default we announce the week that JUST ENDED.
//   GET /api/potw-post              -> last week's winner (Monday announcement)
//   GET /api/potw-post?week=current -> this week's running leader
//   GET /api/potw-post?week=2026-W25
// Response: { week, winner, photoUrl, message, generatedAt }

import { find, findOne, esc } from '../lib/airtable.js';
import { allowCors } from '../lib/cors.js';

const SITE = 'https://yourchoicear.com';

function isoWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return date.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = (req.query && req.query.week) ? String(req.query.week) : '';
  let week;
  if (/^\d{4}-W\d{2}$/.test(q)) week = q;
  else if (q === 'current') week = isoWeek();
  else week = isoWeek(new Date(Date.now() - 7 * 86400000)); // the week that just ended

  const dateLabel = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Halifax', month: 'long', day: 'numeric',
  }).format(new Date());

  // Tally the week's votes.
  const votes = await find('Votes', { filter: `{Week}='${esc(week)}'` });
  const counts = {};
  votes.forEach((v) => { const id = v['Photo ID']; if (id) counts[id] = (counts[id] || 0) + 1; });
  let winnerId = null, max = 0;
  for (const [id, n] of Object.entries(counts)) { if (n > max) { max = n; winnerId = id; } }

  const noWinner = (msg) => res.status(200).json({ week, winner: null, photoUrl: '', message: msg, generatedAt: new Date().toISOString() });

  if (!winnerId) {
    return noWinner(
      `📸 Photo of the Week — ${dateLabel}\n\n` +
      `No votes were cast last week, so the crown is still up for grabs! ` +
      `Share your best shot from the trail, the water, or the climb and rally some votes.\n\n` +
      `Add yours and vote 👉 ${SITE}/gallery.html\n#YourChoiceAR #ExploreNB #PhotoOfTheWeek`);
  }

  const photo = await findOne('Photos', `RECORD_ID()='${esc(winnerId)}'`);
  if (!photo || !photo['Photo URL']) {
    return noWinner(
      `📸 Photo of the Week — ${dateLabel}\n\n` +
      `We have a winner this week — see it and all the entries in the gallery 👉 ${SITE}/gallery.html\n` +
      `#YourChoiceAR #ExploreNB #PhotoOfTheWeek`);
  }

  let who = 'a YCAR racer';
  const racerId = (photo['Racer'] || [])[0];
  if (racerId) {
    const r = await findOne('Racers', `RECORD_ID()='${esc(racerId)}'`);
    if (r && r['Full name']) who = r['Full name'];
  }

  const caption = (photo['Caption'] || '').trim();
  const disc = (photo['Discipline'] || '').trim();
  const junior = !!photo['Junior'];

  const lines = [
    `📸 Photo of the Week — ${dateLabel}`,
    '',
    `Congratulations to ${who}${junior ? ' (Junior Explorer! 🧭)' : ''} for this week's winning shot` +
      `${disc ? ` — ${disc.toLowerCase()}` : ''}, with ${max} vote${max === 1 ? '' : 's'}! 🏆`,
  ];
  if (caption) lines.push('', `\u201C${caption}\u201D`);
  lines.push('', `See all the entries and vote for next week 👉 ${SITE}/gallery.html`, '#YourChoiceAR #ExploreNB #PhotoOfTheWeek');

  return res.status(200).json({
    week,
    winner: { name: who, votes: max, caption, discipline: disc, junior },
    photoUrl: photo['Photo URL'],
    message: lines.join('\n'),
    generatedAt: new Date().toISOString(),
  });
}
