const { getStore } = require('@netlify/blobs');

const ORDER_CAP = 3;

exports.handler = async () => {
  const store = getStore('orders');
  const countData = await store.get('count', { type: 'json' }).catch(() => null);
  const count = countData?.count ?? 0;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, closed: count >= ORDER_CAP }),
  };
};
