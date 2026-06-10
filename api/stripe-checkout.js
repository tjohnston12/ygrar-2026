// api/stripe-checkout.js — create a Stripe Checkout session.
// Handles both registration ($5/racer; captain pays for the whole team in one go)
// and swag orders (with the 15% racer discount applied before it gets here).

import Stripe from 'stripe';
import { verifyToken } from '../lib/auth.js';
import { find, findOne, esc } from '../lib/airtable.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { kind, racerId, quantity, items, successUrl, cancelUrl } = req.body || {};

  let line_items;
  let metadata = { kind, racerId: racerId || '' };

  if (kind === 'registration') {
    // Family-friendly: adults $20 (first city incl.), youth under 16 $5 (first city incl.),
    // and $5 per ADDITIONAL city for everyone. Captain pays for all in one transaction.
    const adults = Math.max(0, parseInt(req.body.adults != null ? req.body.adults : (quantity || 1), 10) || 0);
    const kids = Math.max(0, parseInt(req.body.kids || '0', 10) || 0);
    const total = Math.max(1, adults + kids);
    const cityCount = Math.max(0, parseInt(req.body.cityCount || '0', 10));
    const extra = Math.max(0, cityCount - 1);
    line_items = [];
    if (adults > 0) line_items.push({
      price_data: { currency: 'cad', product_data: { name: 'YCAR 2026 — Adult registration' },
        unit_amount: parseInt(process.env.REGISTRATION_PRICE_CENTS || '2000', 10) },
      quantity: adults,
    });
    if (kids > 0) line_items.push({
      price_data: { currency: 'cad', product_data: { name: 'YCAR 2026 — Youth registration (under 16)' },
        unit_amount: parseInt(process.env.YOUTH_PRICE_CENTS || '500', 10) },
      quantity: kids,
    });
    if (extra > 0) line_items.push({
      price_data: { currency: 'cad', product_data: { name: `Additional city fee (${extra} extra ${extra === 1 ? 'city' : 'cities'})` },
        unit_amount: parseInt(process.env.CITY_PRICE_CENTS || '500', 10) },
      quantity: total * extra,
    });
    metadata.racerCount = String(total);
    metadata.adults = String(adults);
    metadata.kids = String(kids);
    metadata.cityCount = String(cityCount);
  } else if (kind === 'add-cities') {
    // A logged-in, already-registered racer adds one or more cities at $5 each.
    // The cities are credited to their account by the Stripe webhook once paid.
    const viewer = verifyToken(req);
    if (!viewer || !viewer.id) return res.status(401).json({ error: 'Please log in to add cities.' });

    const me = await findOne('Racers', `RECORD_ID()='${esc(viewer.id)}'`);
    if (!me) return res.status(404).json({ error: 'Racer not found' });

    const owned = new Set(String(me.Cities || '').split(',').map((s) => s.trim()).filter(Boolean));
    const active = await find('Cities', { filter: '{Active}' });
    const valid = new Set(active.map((c) => (c.Name || '').trim()).filter(Boolean));

    const requested = [...new Set((req.body.cities || []).map((c) => String(c).trim()).filter(Boolean))]
      .filter((c) => valid.has(c) && !owned.has(c));

    if (!requested.length) return res.status(400).json({ error: 'No new valid cities to add.' });

    line_items = [{
      price_data: {
        currency: 'cad',
        product_data: { name: `YCAR 2026 — Add ${requested.length === 1 ? 'city' : 'cities'}: ${requested.join(', ')}` },
        unit_amount: parseInt(process.env.CITY_PRICE_CENTS || '500', 10),
      },
      quantity: requested.length,
    }];
    metadata = { kind: 'add-cities', racerId: me.id, cities: requested.join('|') };
  } else if (kind === 'swag') {
    // items: [{ name, amountCents, quantity }]
    line_items = (items || []).map((it) => ({
      price_data: {
        currency: 'cad',
        product_data: { name: it.name },
        unit_amount: it.amountCents,
      },
      quantity: it.quantity || 1,
    }));
  } else {
    return res.status(400).json({ error: 'Unknown checkout kind' });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    metadata,
    success_url: successUrl || 'https://yourdomain.com/?paid=1',
    cancel_url: cancelUrl || 'https://yourdomain.com/?canceled=1',
  });

  return res.status(200).json({ url: session.url });
}
