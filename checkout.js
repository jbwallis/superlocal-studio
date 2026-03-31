// ---- Config ----
// Update PRICE_CENTS if you change your price (price in cents, so $450 = 45000)
const PRICE_CENTS = 45000;
const PRICE_DISPLAY = '$450';

// Your Stripe publishable key — safe to put here (this is the PUBLIC key)
// Replace this with your actual key from https://dashboard.stripe.com/apikeys
const STRIPE_PUBLISHABLE_KEY = 'pk_test_REPLACE_WITH_YOUR_PUBLISHABLE_KEY';

// ---- State ----
let stripe = null;
let elements = null;

// ---- Check order availability on page load ----
document.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch('/.netlify/functions/check-orders');
  const data = await res.json();

  if (data.closed) {
    document.getElementById('orders-closed-banner').style.display = 'block';
    document.getElementById('buy-btn').disabled = true;
    document.getElementById('buy-btn').textContent = 'Orders closed';
  }
});

// ---- Open checkout modal ----
async function startCheckout() {
  const btn = document.getElementById('buy-btn');
  btn.disabled = true;
  btn.textContent = 'Loading…';

  // Initialize Stripe
  stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

  // Ask our serverless function to create a PaymentIntent
  let clientSecret;
  try {
    const res = await fetch('/.netlify/functions/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: PRICE_CENTS }),
    });
    const data = await res.json();

    if (!res.ok) {
      // Orders closed or other error from the server
      showBuyError(data.error || 'Something went wrong. Please try again.');
      resetBuyButton();
      return;
    }

    clientSecret = data.clientSecret;
  } catch {
    showBuyError('Network error. Please check your connection and try again.');
    resetBuyButton();
    return;
  }

  // Mount Stripe Payment Element
  elements = stripe.elements({ clientSecret, appearance: stripeAppearance() });
  const paymentElement = elements.create('payment');
  paymentElement.mount('#payment-element');

  // Show modal
  document.getElementById('checkout-overlay').style.display = 'flex';
  resetBuyButton();
}

// ---- Submit payment ----
async function submitPayment() {
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Processing…';
  hidePaymentError();

  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: window.location.origin + '/success.html',
    },
  });

  // If we get here, payment failed (success redirects away)
  if (error) {
    showPaymentError(error.message);
    btn.disabled = false;
    btn.textContent = 'Pay ' + PRICE_DISPLAY;
  }
}

// ---- Close modal ----
function closeCheckout() {
  document.getElementById('checkout-overlay').style.display = 'none';
  document.getElementById('payment-element').innerHTML = '';
  hidePaymentError();
  elements = null;
}

// ---- Helpers ----
function resetBuyButton() {
  const btn = document.getElementById('buy-btn');
  btn.disabled = false;
  btn.textContent = 'Order now';
}

function showBuyError(msg) {
  const banner = document.getElementById('orders-closed-banner');
  banner.textContent = msg;
  banner.style.display = 'block';
}

function showPaymentError(msg) {
  const el = document.getElementById('payment-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function hidePaymentError() {
  document.getElementById('payment-error').style.display = 'none';
}

function stripeAppearance() {
  return {
    theme: 'flat',
    variables: {
      colorPrimary: '#c8a97e',
      colorBackground: '#f7f4ef',
      colorText: '#3b2f2f',
      colorDanger: '#c0392b',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '0px',
    },
  };
}
