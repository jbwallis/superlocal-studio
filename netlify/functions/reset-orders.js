const { getStore } = require('@netlify/blobs');

// This function resets the order counter so new orders can come in.
// Call it by visiting: https://yoursite.netlify.app/.netlify/functions/reset-orders?key=YOUR_RESET_KEY
// Set RESET_KEY in your Netlify environment variables.

exports.handler = async (event) => {
  const { key } = event.queryStringParameters || {};

  if (!key || key !== process.env.RESET_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const store = getStore('orders');
  await store.setJSON('count', { count: 0 });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Order count reset to 0. You are open for business!' }),
  };
};
