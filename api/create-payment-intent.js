function readJsonBody(req) {
  if (req && typeof req.body === 'object' && req.body) {
    return Promise.resolve(req.body);
  }

  return new Promise(function (resolve, reject) {
    var raw = '';
    req.on('data', function (chunk) {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', function () {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function toSafeString(value, maxLen) {
  var text = String(value || '').trim();
  if (!text) return '';
  return text.slice(0, maxLen || 255);
}

module.exports = async function createPaymentIntentHandler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (!req || req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  var secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    res.status(503).json({ error: 'Stripe is not configured on server' });
    return;
  }

  var Stripe = null;
  try {
    Stripe = require('stripe');
  } catch (error) {
    res.status(500).json({ error: 'Stripe SDK missing on server' });
    return;
  }

  try {
    var body = await readJsonBody(req);
    var amountCents = Number(body && body.amountCents);
    var currency = String(body && body.currency || 'usd').toLowerCase();
    var email = toSafeString(body && body.email, 120);
    var orderDraftId = toSafeString(body && body.orderDraftId, 64);
    var country = toSafeString(body && body.country, 80);
    var shippingLabel = toSafeString(body && body.shippingLabel, 120);
    var shippingService = toSafeString(body && body.shippingService, 40);

    if (!Number.isFinite(amountCents) || amountCents < 50 || amountCents > 25000000) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    if (!/^[a-z]{3}$/.test(currency)) {
      res.status(400).json({ error: 'Invalid currency' });
      return;
    }

    var stripe = Stripe(secretKey);
    var paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountCents),
      currency: currency,
      receipt_email: email || undefined,
      automatic_payment_methods: { enabled: true },
      description: 'Genesis Core Order',
      metadata: {
        orderDraftId: orderDraftId || '',
        destinationCountry: country || '',
        shippingLabel: shippingLabel || '',
        shippingService: shippingService || ''
      }
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    var message = error && error.message ? error.message : 'Unable to create payment intent';
    res.status(500).json({ error: message });
  }
};
