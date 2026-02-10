module.exports = function stripeConfigHandler(req, res) {
  var publishableKey = String(process.env.STRIPE_PUBLISHABLE_KEY || '').trim();
  var secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({
    publishableKey: publishableKey || null,
    configured: Boolean(publishableKey && secretKey)
  });
};
