# Testing Plan - Mobile Wallet Card System

## Overview
Comprehensive testing plan for virtual card system integration in both mobile app and venue portal.

---

## Backend API Testing

### 1. Virtual Cards API Tests

**Endpoint: `/api/virtual-cards/status`**
- [ ] Test: Get card status for user without card
- [ ] Test: Get card status for user with active card
- [ ] Test: Verify minimum balance check ($5)
- [ ] Test: Verify Stripe Issuing status check

**Endpoint: `/api/virtual-cards/create`**
- [ ] Test: Create card with sufficient balance (≥$5)
- [ ] Test: Reject card creation with insufficient balance (<$5)
- [ ] Test: Prevent duplicate card creation
- [ ] Test: Handle Stripe Issuing not enabled gracefully
- [ ] Test: Verify card data returned correctly

**Endpoint: `/api/virtual-cards/wallet-details/:id`**
- [ ] Test: Get wallet details for valid card
- [ ] Test: Reject access to other user's card
- [ ] Test: Verify card information accuracy

**Endpoint: `/api/virtual-cards/wallet-status/:id`**
- [ ] Test: Update Apple Wallet status
- [ ] Test: Update Google Pay status
- [ ] Test: Verify status persistence

**Endpoint: `/api/virtual-cards/deletion-warning/:id`**
- [ ] Test: Track deletion warnings
- [ ] Test: Verify 2-warning requirement

### 2. Tap-and-Pay API Tests

**Endpoint: `/api/tap-and-pay/process`**
- [ ] Test: Process valid transaction ($5-$500)
- [ ] Test: Reject transaction below minimum ($5)
- [ ] Test: Reject transaction above maximum ($500)
- [ ] Test: Reject transaction with insufficient balance
- [ ] Test: Reject transaction exceeding daily limit ($1,000)
- [ ] Test: Verify commission calculation (flat $0.50 <$20, 2.5% ≥$20)
- [ ] Test: Verify balance deduction
- [ ] Test: Verify venue receives correct amount
- [ ] Test: Verify payment record creation
- [ ] Test: Verify socket.io notification

**Endpoint: `/api/tap-and-pay/transactions`**
- [ ] Test: Get transaction history
- [ ] Test: Verify transaction filtering
- [ ] Test: Verify pagination

### 3. Commission Calculation Tests

- [ ] Test: $10 transaction → $0.50 commission
- [ ] Test: $19.99 transaction → $0.50 commission
- [ ] Test: $20 transaction → $0.50 commission (2.5% = $0.50)
- [ ] Test: $50 transaction → $1.25 commission (2.5%)
- [ ] Test: $100 transaction → $2.50 commission (2.5%)
- [ ] Test: Verify venue receives correct amount

---

## Mobile App Testing

### 1. Wallet Tab Integration

**Card Status Display**
- [ ] Test: Show "Add to Wallet" button when no card
- [ ] Test: Show card info when card exists
- [ ] Test: Display card last4, brand, expiration
- [ ] Test: Show wallet status (Apple/Google Pay)
- [ ] Test: Display minimum balance requirement

**Card Creation Flow**
- [ ] Test: Auto-opt-in prompt when balance ≥$5
- [ ] Test: Decline option works
- [ ] Test: Show error if balance <$5
- [ ] Test: Loading state during creation
- [ ] Test: Success notification
- [ ] Test: Error handling

**Card Management**
- [ ] Test: View card details
- [ ] Test: Delete card (with 2 warnings)
- [ ] Test: Re-add deleted card
- [ ] Test: Update wallet status

### 2. Payment Processing

**Tap-and-Pay Flow**
- [ ] Test: Select venue
- [ ] Test: Enter amount ($5-$500)
- [ ] Test: Validate amount limits
- [ ] Test: Process payment
- [ ] Test: Real-time balance update
- [ ] Test: Transaction confirmation
- [ ] Test: Error handling

**Transaction History**
- [ ] Test: Display tap-and-pay transactions
- [ ] Test: Show commission breakdown
- [ ] Test: Filter by transaction type
- [ ] Test: Real-time updates

### 3. Notifications

- [ ] Test: Card created notification
- [ ] Test: Payment processed notification
- [ ] Test: Low balance warning
- [ ] Test: Transaction receipt

---

## Venue Portal Testing

### 1. Payment Receipt

**Transaction Display**
- [ ] Test: Show tap-and-pay transactions
- [ ] Test: Display transaction amount
- [ ] Test: Show commission deducted
- [ ] Test: Display net amount received
- [ ] Test: Real-time transaction updates

**Earnings Dashboard**
- [ ] Test: Include tap-and-pay in earnings
- [ ] Test: Show commission breakdown
- [ ] Test: Update totals in real-time
- [ ] Test: Filter by payment type

### 2. Analytics

- [ ] Test: Tap-and-pay transaction count
- [ ] Test: Revenue from tap-and-pay
- [ ] Test: Average transaction amount
- [ ] Test: Transaction trends

### 3. Redemptions Page

- [ ] Test: Show tap-and-pay transactions
- [ ] Test: Filter by payment type
- [ ] Test: Export transaction data

---

## Integration Testing

### 1. End-to-End Flow

**Complete Payment Flow**
1. [ ] User receives payment → Balance updated
2. [ ] User creates virtual card (if balance ≥$5)
3. [ ] Card added to Apple Wallet/Google Pay
4. [ ] User taps to pay at venue
5. [ ] Payment processed
6. [ ] Balance deducted
7. [ ] Commission calculated
8. [ ] Venue receives payment
9. [ ] Transaction recorded
10. [ ] Notifications sent

### 2. Error Scenarios

- [ ] Insufficient balance
- [ ] Transaction limit exceeded
- [ ] Stripe Issuing not enabled
- [ ] Network errors
- [ ] Invalid venue
- [ ] Card not found

### 3. Edge Cases

- [ ] Multiple rapid transactions
- [ ] Transaction at limit boundary ($5, $500)
- [ ] Commission boundary ($20)
- [ ] Daily limit reached
- [ ] Card deleted during transaction
- [ ] Balance exactly $5

---

## Security Testing

- [ ] Authentication required for all endpoints
- [ ] Users can only access their own cards
- [ ] Transaction authorization
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Rate limiting

---

## Performance Testing

- [ ] Card creation response time (<2s)
- [ ] Payment processing time (<3s)
- [ ] Transaction history load time (<1s)
- [ ] Real-time update latency (<500ms)
- [ ] Concurrent transaction handling

---

## Test Execution

### Manual Testing
1. Start backend server
2. Start mobile app (localhost:3001)
3. Start venue portal (localhost:3000)
4. Follow test cases above

### Automated Testing
```bash
# Run backend API tests
node backend/tests/virtual-cards.test.js

# Run with test token
TEST_TOKEN=your_token node backend/tests/virtual-cards.test.js
```

### Test Data Setup
1. Create test user with balance ≥$5
2. Create test venue with Stripe Connect
3. Ensure Stripe Issuing is enabled (or test error handling)

---

## Known Issues & Limitations

1. **Stripe Issuing:** Requires approval (2-4 weeks)
   - Test error handling when not enabled
   - Provide clear user messaging

2. **Mobile Wallet:** Requires device testing
   - Apple Wallet: iOS device required
   - Google Pay: Android device required

3. **Real-time Updates:** Requires Socket.io connection
   - Test offline scenarios
   - Test reconnection

---

## Success Criteria

✅ All backend endpoints return correct responses
✅ Mobile app displays card status correctly
✅ Card creation flow works end-to-end
✅ Payment processing deducts correct amounts
✅ Commission calculated correctly
✅ Venue portal shows transactions
✅ Real-time updates work
✅ Error handling is graceful
✅ Security measures in place

---

## Next Steps After Testing

1. Fix any identified issues
2. Optimize performance
3. Add missing error handling
4. Improve user messaging
5. Deploy to staging
6. User acceptance testing
7. Production deployment

