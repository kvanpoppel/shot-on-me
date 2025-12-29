# Tap-and-Pay / Redeem Flow Implementation

## Overview

This document describes the robust, atomic, and idempotent implementation of the `/api/payments/redeem` endpoint for tap-and-pay transactions and redemption codes.

## Key Features

### 1. **Atomicity**
- Uses MongoDB transactions to ensure wallet deduction and payment record updates happen atomically
- Prevents partial state updates (e.g., wallet deducted but payment not recorded)

### 2. **Idempotency**
- Supports `idempotencyKey` parameter to prevent duplicate processing
- Uses `findOneAndUpdate` with status check to prevent race conditions
- Returns existing result if same `idempotencyKey` is used

### 3. **Race Condition Prevention**
- Uses `findOneAndUpdate` to atomically transition payment status from `pending` → `processing`
- Only one request can successfully transition the status, preventing double-processing

### 4. **Webhook Reconciliation**
- Handles `transfer.paid` events to confirm successful transfers
- Handles `transfer.failed` events to mark payments as failed
- Updates payment records based on Stripe webhook events

## API Endpoint

### POST `/api/payments/redeem`

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "paymentId": "string (optional)",
  "redemptionCode": "string (optional)",
  "venueId": "string (required for venue redemption)",
  "idempotencyKey": "string (optional, recommended)"
}
```

**Response (Success):**
```json
{
  "success": true,
  "transferId": "tr_xxxxx",
  "paymentId": "payment_id",
  "newBalance": 100.50,
  "message": "Payment redeemed successfully"
}
```

**Response (Idempotent - Already Processed):**
```json
{
  "success": true,
  "transferId": "tr_xxxxx",
  "paymentId": "payment_id",
  "idempotent": true,
  "message": "Payment already processed"
}
```

**Response (Conflict - Already Processing):**
```json
{
  "error": "Payment already processed",
  "status": "processing",
  "paymentId": "payment_id",
  "transferId": "tr_xxxxx"
}
```

## Payment Model Updates

### New Fields

1. **`idempotencyKey`** (String, indexed, sparse)
   - Used to prevent duplicate processing
   - Indexed for fast lookups

2. **`currency`** (String, default: 'usd')
   - Currency for the payment amount

## Transaction Flow

### For Tap-and-Pay (`tap_and_pay` type):

1. User initiates payment at venue
2. Frontend calls `/api/payments/redeem` with `paymentId` and `venueId`
3. Backend:
   - Validates payment exists and is in `pending` status
   - Checks idempotency key (if provided)
   - Atomically transitions status: `pending` → `processing`
   - Validates user wallet balance
   - Starts MongoDB transaction
   - Deducts from user wallet
   - Creates Stripe transfer to venue
   - Updates payment record
   - Commits transaction
4. Webhook confirms transfer success/failure
5. Socket.io events notify user and venue

### For Redemption Codes (`shot_sent` type):

1. User receives redemption code via SMS
2. User presents code at venue
3. Venue calls `/api/payments/redeem` with `redemptionCode` and `venueId`
4. Backend:
   - Finds payment by redemption code
   - Validates payment is not already redeemed
   - Atomically transitions status: `pending` → `processing`
   - Creates Stripe transfer (money already in escrow)
   - Updates payment record
   - Commits transaction
5. Webhook confirms transfer success/failure

## Webhook Events

### `transfer.paid`

When a transfer to a venue succeeds:
- Updates payment status to `succeeded`
- Emits socket event to venue
- Logs success

### `transfer.failed`

When a transfer to a venue fails:
- Updates payment status to `failed`
- Records failure reason in metadata
- Logs critical error (especially if wallet was deducted)
- **TODO:** Consider automatic wallet refund for `tap_and_pay` failures

## Error Handling

### Insufficient Balance (402)
```json
{
  "error": "Insufficient wallet balance",
  "balance": 50.00,
  "required": 100.00
}
```

### Payment Not Found (404)
```json
{
  "error": "Payment not found",
  "message": "Invalid payment ID or redemption code"
}
```

### Venue Not Connected (400)
```json
{
  "error": "Venue not connected",
  "message": "Venue has not connected their Stripe account"
}
```

### Already Processed (409)
```json
{
  "error": "Payment already processed",
  "status": "processing",
  "paymentId": "payment_id"
}
```

## Testing

### Manual Test Script

```bash
# Set environment variables
export TEST_TOKEN="your_jwt_token"
export TEST_PAYMENT_ID="payment_id"
export TEST_VENUE_ID="venue_id"
export TEST_REDEMPTION_CODE="ABC123"

# Run test
node backend/scripts/test-redeem-endpoint.js
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/payments/redeem \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "payment_id",
    "venueId": "venue_id",
    "idempotencyKey": "unique-key-123"
  }'
```

## Safety & Monitoring

### Logging

- All wallet deductions are logged with user ID and new balance
- All Stripe transfers are logged with transfer ID
- All errors are logged with full context
- Critical errors (wallet deducted but transfer failed) are logged with `CRITICAL` prefix

### Reconciliation

- Webhook events ensure payment records match Stripe state
- Failed transfers are marked in payment metadata
- Manual intervention may be required for edge cases

### Recommendations

1. **Monitor** for `CRITICAL` log messages
2. **Set up alerts** for failed transfers after wallet deduction
3. **Regular reconciliation** between MongoDB payments and Stripe transfers
4. **Consider** automatic wallet refunds for `tap_and_pay` failures

## Files Modified

1. `backend/models/Payment.js` - Added `idempotencyKey` and `currency` fields
2. `backend/routes/payments.js` - Rewrote `/redeem` endpoint with atomicity and idempotency
3. `backend/routes/payments.js` - Enhanced webhook handler for `transfer.paid` and `transfer.failed`

## Next Steps

1. ✅ Implement atomic redeem endpoint
2. ✅ Add idempotency support
3. ✅ Enhance webhook handlers
4. ⏳ Add automatic wallet refunds for failed transfers
5. ⏳ Add admin dashboard for reconciliation
6. ⏳ Add comprehensive integration tests



