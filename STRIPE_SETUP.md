# 💳 Stripe Integration Setup Guide

## ✅ What's Been Integrated

The backend now has full Stripe integration for:
- ✅ Secure credit card tokenization (using Stripe Payment Methods)
- ✅ Adding funds to wallet via Stripe charges
- ✅ Managing saved payment methods
- ✅ Creating Stripe customers automatically
- ✅ Processing payments with proper error handling

## 📋 Setup Instructions

### Step 1: Get Your Stripe API Keys

1. **Sign up for Stripe** (if you haven't already):
   - Go to [https://stripe.com/](https://stripe.com/)
   - Create a free account

2. **Get your API keys**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/)
   - Click **"Developers"** → **"API keys"**
   - Copy your **Publishable key** (starts with `pk_test_` for test mode)
   - Copy your **Secret key** (starts with `sk_test_` for test mode)
   - **Important**: Use test keys for development, production keys for live mode

### Step 2: Add Keys to Backend `.env` File

Open `backend/.env` and add these lines:

```env
# Stripe - Payment Processing
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

**Example:**
```env
STRIPE_SECRET_KEY=sk_test_51AbCdEf1234567890GhIjKlMnOpQrStUvWxYz
STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEf1234567890GhIjKlMnOpQrStUvWxYz
```

### Step 3: Restart Your Backend

After adding the keys, restart your backend server:

```powershell
# Stop the backend (Ctrl+C)
# Then restart:
cd backend
npm start
# or
npm run dev
```

## 🧪 Testing with Stripe Test Cards

Stripe provides test card numbers you can use without real charges:

### Success Cards:
- **Visa**: `4242 4242 4242 4242`
- **Mastercard**: `5555 5555 5555 4444`
- **American Express**: `3782 822463 10005`

### Test Details:
- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

### Declined Cards:
- **Card declined**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`

See full list: [Stripe Test Cards](https://stripe.com/docs/testing#cards)

## 📡 API Endpoints

### 1. Add Credit Card
**POST** `/api/payments/cards`

```json
{
  "cardNumber": "4242 4242 4242 4242",
  "expiry": "12/34",
  "cvc": "123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Credit card added successfully",
  "card": {
    "id": "pm_1234567890",
    "last4": "4242",
    "expiry": "12/34",
    "brand": "visa"
  }
}
```

### 2. Add Funds to Wallet
**POST** `/api/payments/add-funds`

**Option A: Using saved payment method:**
```json
{
  "amount": 50.00,
  "paymentMethodId": "pm_1234567890"
}
```

**Option B: Using new card details:**
```json
{
  "amount": 50.00,
  "cardNumber": "4242 4242 4242 4242",
  "expiry": "12/34",
  "cvc": "123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully added $50.00 to wallet",
  "wallet": {
    "balance": 50.00,
    "pendingBalance": 0
  },
  "paymentIntent": {
    "id": "pi_1234567890",
    "amount": 50.00,
    "status": "succeeded"
  }
}
```

### 3. Get Saved Payment Methods
**GET** `/api/payments/cards`

**Response:**
```json
{
  "paymentMethods": [
    {
      "id": "pm_1234567890",
      "type": "card",
      "last4": "4242",
      "expiry": "12/34",
      "masked": "**** **** **** 4242",
      "brand": "visa",
      "addedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 4. Delete Payment Method
**DELETE** `/api/payments/cards/:paymentMethodId`

**Response:**
```json
{
  "success": true,
  "message": "Payment method removed"
}
```

## 🔒 Security Features

- ✅ Cards are **never stored** on your server
- ✅ All card data is tokenized through Stripe
- ✅ Stripe handles PCI compliance
- ✅ Payment methods are securely attached to Stripe customers
- ✅ Failed payments are properly handled

## ⚠️ Important Notes

1. **Test Mode**: Make sure you're using test keys (`sk_test_` and `pk_test_`) during development
2. **Production**: Switch to live keys (`sk_live_` and `pk_live_`) when going live
3. **Webhooks**: For production, set up Stripe webhooks to handle payment status updates
4. **Error Handling**: The integration includes proper error handling for declined cards

## 🚀 What Works Without Stripe

The app will still function without Stripe configured:
- Users can send payments using wallet balance
- Payment codes and redemption still work
- Credit cards can be "added" but won't be tokenized (basic storage only)
- Adding funds to wallet will be disabled (shows error message)

## 📚 Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Payment Methods](https://stripe.com/docs/payments/payment-methods)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Dashboard](https://dashboard.stripe.com/)

## ✅ Verification

After setup, test the integration:

1. Add a test card using the `/api/payments/cards` endpoint
2. Add funds using `/api/payments/add-funds` endpoint
3. Check your Stripe Dashboard → **Payments** to see the test payment
4. Verify the user's wallet balance increased

If everything works, you'll see test payments in your Stripe Dashboard! 🎉

