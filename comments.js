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
    // Team captains pay for everyone in one transaction -> quantity = number of racers.
    const qty = Math.max(1, parseInt(quantity || '1', 10));
    line_items = [{
      price_data: {
        currency: 'cad',
        product_data: { name: 'YGTAR 2026 Registration' },
        unit_amount: parseInt(process.env.REGISTRATION_PRICE_CENTS || '500', 10),
      },
      quantity: qty,
    }];
    metadata.racerCount = String(qty);
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
