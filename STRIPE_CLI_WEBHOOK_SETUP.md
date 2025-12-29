# Stripe CLI Webhook Setup (Easier than ngrok!)

## Why Stripe CLI is Better for Webhooks

✅ No account signup needed (uses your Stripe account)
✅ Automatically provides webhook signing secret
✅ Built specifically for Stripe webhook testing
✅ Works seamlessly with Stripe Dashboard

## Step 1: Login to Stripe CLI

```powershell
stripe login
```

This will:
- Open your browser
- Ask you to authorize Stripe CLI
- Automatically configure authentication

## Step 2: Start Webhook Forwarding

Make sure your backend is running on port 5000, then run:

```powershell
stripe listen --forward-to localhost:5000/api/payments/webhook
```

This will:
- Forward all Stripe webhooks to your local server
- Display a webhook signing secret (starts with `whsec_...`)
- Keep running until you stop it (Ctrl+C)

## Step 3: Copy the Webhook Signing Secret

When you run `stripe listen`, you'll see output like:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**Copy that `whsec_...` secret!**

## Step 4: Add to Backend .env

1. Open `backend/.env`
2. Add or update:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```
3. Restart your backend server

## Step 5: Configure in Stripe Dashboard

In the Stripe Dashboard webhook configuration:

**For Endpoint URL, you have two options:**

### Option A: Use Stripe CLI's Test Endpoint (Recommended)
When you run `stripe listen`, it also shows a test endpoint URL like:
```
https://hooks.stripe.com/...
```

Use this URL in the Stripe Dashboard.

### Option B: Use a Placeholder (for testing)
You can use:
```
https://example.com/api/payments/webhook
```

The webhooks will still be forwarded to your local server via Stripe CLI.

## Important Notes

- **Keep `stripe listen` running** while testing webhooks
- The webhook secret from `stripe listen` is what you need in `.env`
- Stripe CLI forwards webhooks automatically - no need to expose your local server
- You can test webhooks using: `stripe trigger payment_intent.succeeded`

## Quick Test

After setup, test a webhook:

```powershell
# In a new terminal (keep stripe listen running)
stripe trigger payment_intent.succeeded
```

This will send a test webhook to your local server!


