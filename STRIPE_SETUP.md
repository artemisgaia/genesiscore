# Stripe Setup (Test Mode)

## 1) Install dependency

```bash
npm install
```

## 2) Configure environment variables

Copy `.env.example` to `.env.local` (or your deploy platform env settings) and set:

- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`

Use Stripe **test** keys first.

## 3) Run with API support

This project uses `api/*.js` serverless routes (`/api/stripe-config`, `/api/create-payment-intent`).

- Local (Vercel): `vercel dev`
- Deploy: Vercel/compatible serverless host with Node 18+

## 4) Test checkout

On `checkout.html`:

- Fill shipping/contact fields
- Enter card: `4242 4242 4242 4242`
- Use any future expiry/CVC/ZIP

If payment succeeds, order is written to local order history and redirected to order confirmation.

## Notes

- Amount is based on validated checkout summary (subtotal + shipping + tax).
- For production hardening, move final pricing validation fully server-side using authoritative catalog/shipping logic.
