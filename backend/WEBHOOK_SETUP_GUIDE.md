# Stripe Webhook Setup Guide

## Quick Setup Steps

### Step 1: Get Your Webhook URL

**For Local Development:**
You need to expose your local server to the internet. Use one of these options:

#### Option A: Use ngrok (Recommended)
1. Install ngrok: https://ngrok.com/download
2. Start your backend server: `cd backend && npm run dev`
3. In a new terminal, run: `ngrok http 5000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Your webhook URL will be: `https://abc123.ngrok.io/api/payments/webhook`

#### Option B: Use Stripe CLI (Alternative)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe listen --forward-to localhost:5000/api/payments/webhook`
3. This will give you a webhook signing secret automatically

**For Production:**
- Use your production domain: `https://your-domain.com/api/payments/webhook`

### Step 2: Configure Webhook in Stripe Dashboard

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/webhooks
2. **Click "Add endpoint"** (or "Create endpoint" in test mode)
3. **Select "Your account"** (already selected in your screenshot)
4. **Click "Continue →"**

### Step 3: Choose Destination Type

1. Select **"Webhook endpoint"** or **"Send events to a URL"**
2. Click **"Continue →"**

### Step 4: Configure Your Destination

1. **Endpoint URL**: Enter your webhook URL
   - Local: `https://your-ngrok-url.ngrok.io/api/payments/webhook`
   - Production: `https://your-domain.com/api/payments/webhook`

2. **Description** (optional): "Shot On Me Payment Webhooks"

3. **Select Events to Listen To**:
   
   **Required Events:**
   - ✅ `payment_intent.succeeded` - When user adds funds
   - ✅ `payment_intent.payment_failed` - When add funds fails
   - ✅ `transfer.paid` - When transfer to venue succeeds
   - ✅ `transfer.failed` - When transfer to venue fails
   - ✅ `issuing.authorization.request` ⭐ NEW - When virtual card is tapped
   - ✅ `issuing.authorization.updated` ⭐ NEW - When authorization is finalized

   **How to Select:**
   - Click "Select events"
   - Search for each event name
   - Check the box next to each event
   - Or use "Select all events" and then uncheck what you don't need

4. **API Version**: Leave as default (or select latest)

5. **Click "Add endpoint"**

### Step 5: Get Webhook Signing Secret

1. After creating the endpoint, click on it in the webhooks list
2. Find **"Signing secret"** section
3. Click **"Reveal"** or **"Click to reveal"**
4. Copy the secret (starts with `whsec_...`)

### Step 6: Add Secret to Backend

1. Open `backend/.env` file
2. Add or update:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```
3. Save the file
4. Restart your backend server

### Step 7: Test the Webhook

1. In Stripe Dashboard, go to your webhook endpoint
2. Click **"Send test webhook"**
3. Select an event type (e.g., `payment_intent.succeeded`)
4. Click **"Send test webhook"**
5. Check your backend logs to see if it was received

## Event Details

### `payment_intent.succeeded`
- **When**: User successfully adds funds via credit card
- **Action**: Updates user wallet balance (ledger)

### `payment_intent.payment_failed`
- **When**: User's credit card payment fails
- **Action**: Marks payment as failed

### `transfer.paid`
- **When**: Transfer from platform account to venue succeeds
- **Action**: Marks payment as succeeded

### `transfer.failed`
- **When**: Transfer from platform account to venue fails
- **Action**: Marks payment as failed, may refund user wallet

### `issuing.authorization.request` ⭐ NEW
- **When**: User taps their virtual card at a venue
- **Action**: 
  - Checks user wallet balance (ledger)
  - Approves or declines authorization
  - Creates Payment record

### `issuing.authorization.updated` ⭐ NEW
- **When**: Virtual card authorization is finalized
- **Action**:
  - Deducts from user wallet ledger
  - Updates Payment record status
  - Emits real-time wallet update

## Troubleshooting

### "Webhook signature verification failed"
- **Fix**: Make sure `STRIPE_WEBHOOK_SECRET` in `.env` matches the signing secret from Stripe Dashboard

### "Webhook not receiving events"
- **Check**: Is your server running and accessible?
- **Check**: Is the webhook URL correct?
- **Check**: Are the events selected in Stripe Dashboard?
- **Test**: Use "Send test webhook" in Stripe Dashboard

### "ngrok URL changes every time"
- **Fix**: Use ngrok's paid plan for static URLs, or update webhook URL in Stripe Dashboard each time

### "Events not being processed"
- **Check**: Backend logs for webhook errors
- **Check**: Webhook endpoint is returning 200 status
- **Check**: Events are enabled in Stripe Dashboard

## Production Checklist

- [ ] Webhook endpoint uses HTTPS
- [ ] Webhook signing secret is set in production environment variables
- [ ] All 6 required events are subscribed
- [ ] Webhook endpoint is tested and working
- [ ] Backend logs show webhook events being received
- [ ] Error handling is in place for webhook failures


