# Stripe Events to Select for Webhook

## Required Events (Select These 6)

When setting up your webhook endpoint in Stripe Dashboard, you need to select these specific events:

### 1. Payment Intent Events (2 events)
- ✅ **`payment_intent.succeeded`** - When user successfully adds funds via credit card
- ✅ **`payment_intent.payment_failed`** - When user's credit card payment fails

### 2. Transfer Events (2 events)
- ✅ **`transfer.paid`** - When transfer from platform account to venue succeeds
- ✅ **`transfer.failed`** - When transfer from platform account to venue fails

### 3. Issuing Events (2 events) ⭐ NEW
- ✅ **`issuing.authorization.request`** - When user taps their virtual card at a venue
- ✅ **`issuing.authorization.updated`** - When virtual card authorization is finalized

## How to Find Them in Stripe Dashboard

### Option 1: Search Bar (Easiest)
1. Click in the search box: **"Find event by name or description..."**
2. Type each event name exactly as shown above
3. Check the box next to each event when it appears
4. The "Selected events" tab will show your count increasing

### Option 2: Browse Categories
1. Scroll down and expand these categories:
   - **"Payment Intent"** category → Find `payment_intent.succeeded` and `payment_intent.payment_failed`
   - **"Transfer"** category → Find `transfer.paid` and `transfer.failed`
   - **"Issuing"** category → Find `issuing.authorization.request` and `issuing.authorization.updated`

2. Check the box next to each event

## Quick Search Terms

Copy and paste these into the search bar one at a time:
```
payment_intent.succeeded
payment_intent.payment_failed
transfer.paid
transfer.failed
issuing.authorization.request
issuing.authorization.updated
```

## Verification

After selecting all 6 events:
1. Click the **"Selected events"** tab at the top
2. You should see all 6 events listed
3. Verify they match the list above

## Important Notes

- ⚠️ **DO NOT** select "Select all" - this will subscribe to hundreds of events you don't need
- ✅ Only select the 6 events listed above
- ✅ Event names are case-sensitive - use exact names shown
- ✅ The "Selected events" tab shows your count (should be 6)

## After Selection

Once you've selected all 6 events:
1. Click **"Continue →"** button (bottom right)
2. You'll proceed to "Choose destination type" step
3. Then configure your webhook URL


