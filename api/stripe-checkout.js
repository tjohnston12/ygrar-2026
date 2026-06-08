// api/stripe-checkout.js — create a Stripe Checkout session.
// Handles both registration ($5/racer; captain pays for the whole team in one go)
// and swag orders (with the 15% racer discount applied before it gets here).

import Stripe from 'stripe';
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
