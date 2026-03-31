const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getStore } = require('@netlify/blobs');

const ORDER_CAP = 3;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Check current order count before creating a payment intent
  const store = getStore('orders');
  const countData = await store.get('count', { type: 'json' }).catch(() => null);
  const count = countData?.count ?? 0;

  if (count >= ORDER_CAP) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Orders are currently closed while we catch up on existing builds. Check back soon!',
        closed: true,
      }),
    };
  }

  // Parse the amount sent from the frontend
  let amount;
  try {
    ({ amount } = JSON.parse(event.body));
    if (typeof amount !== 'number' || amount <= 0) throw new Error();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid amount.' }) };
  }

  // Create the Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
  });

  // Increment the counter — one slot reserved per payment intent created
  await store.setJSON('count', { count: count + 1 });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientSecret: paymentIntent.client_secret }),
  };
};
