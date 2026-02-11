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

function normalizeItems(items) {
  return (Array.isArray(items) ? items : [])
    .map(function (item) {
      var rawPrice = Number(item && item.price);
      var rawQuantity = Number(item && item.quantity);
      return {
        id: toSafeString(item && item.id, 64),
        name: toSafeString(item && item.name, 120),
        price: Number.isFinite(rawPrice) ? Math.max(0, rawPrice) : 0,
        quantity: Number.isFinite(rawQuantity) ? Math.max(0, rawQuantity) : 0
      };
    })
    .filter(function (item) {
      return item.id && item.quantity > 0;
    });
}

function toItemsDigest(items) {
  return items
    .map(function (item) {
      return item.id + ':' + item.quantity;
    })
    .join('|')
    .slice(0, 480);
}

function toItemsPreview(items) {
  return items
    .map(function (item) {
      var lineTotal = item.price * item.quantity;
      return item.name + ' x' + item.quantity + ' ($' + lineTotal.toFixed(2) + ')';
    })
    .join(' | ')
    .slice(0, 480);
}

function toMetadataAmount(value) {
  var amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return '';
  return amount.toFixed(2);
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
    var subtotal = Number(body && body.subtotal);
    var shippingAmount = Number(body && body.shippingAmount);
    var discount = Number(body && body.discount);
    var customerName = toSafeString(body && body.customerName, 120);
    var customerPhone = toSafeString(body && body.customerPhone, 40);
    var shippingAddress = body && typeof body.shippingAddress === 'object' ? body.shippingAddress : {};
    var shippingLine1 = toSafeString(shippingAddress.line1, 120);
    var shippingCity = toSafeString(shippingAddress.city, 80);
    var shippingState = toSafeString(shippingAddress.state, 80);
    var shippingPostalCode = toSafeString(shippingAddress.postalCode, 32);
    var shippingCountryCode = toSafeString(shippingAddress.country, 2).toUpperCase();
    var normalizedItems = normalizeItems(body && body.items);
    var itemDigest = toItemsDigest(normalizedItems);
    var itemPreview = toItemsPreview(normalizedItems);
    var itemCount = normalizedItems.reduce(function (sum, item) {
      return sum + item.quantity;
    }, 0);

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
      description: orderDraftId ? 'Genesis Core Order ' + orderDraftId : 'Genesis Core Order',
      metadata: {
        orderDraftId: orderDraftId || '',
        destinationCountry: country || '',
        shippingLabel: shippingLabel || '',
        shippingService: shippingService || '',
        subtotalUsd: toMetadataAmount(subtotal),
        shippingUsd: toMetadataAmount(shippingAmount),
        discountUsd: toMetadataAmount(discount),
        totalUsd: toMetadataAmount(amountCents / 100),
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        shippingPostalCode: shippingPostalCode || '',
        itemCount: String(itemCount || 0),
        itemDigest: itemDigest || '',
        itemPreview: itemPreview || '',
        preferredMethods: 'card,klarna,link,cashapp,amazon_pay'
      },
      shipping:
        customerName && shippingLine1 && shippingCountryCode
          ? {
              name: customerName,
              phone: customerPhone || undefined,
              address: {
                line1: shippingLine1,
                city: shippingCity || undefined,
                state: shippingState || undefined,
                postal_code: shippingPostalCode || undefined,
                country: shippingCountryCode
              }
            }
          : undefined
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
