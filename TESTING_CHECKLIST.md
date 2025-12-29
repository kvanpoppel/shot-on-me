# Testing Checklist - Quick Reference

## ✅ Backend API Tests

### Virtual Cards
- [ ] `GET /api/virtual-cards/status` - Returns card status
- [ ] `POST /api/virtual-cards/create` - Creates card (balance ≥$5)
- [ ] `POST /api/virtual-cards/create` - Rejects if balance <$5
- [ ] `DELETE /api/virtual-cards/:id` - Deactivates card
- [ ] Commission calculation: $10 → $0.50
- [ ] Commission calculation: $50 → $1.25

### Tap-and-Pay
- [ ] `POST /api/tap-and-pay/process` - Processes $5 transaction
- [ ] `POST /api/tap-and-pay/process` - Rejects <$5
- [ ] `POST /api/tap-and-pay/process` - Rejects >$500
- [ ] `POST /api/tap-and-pay/process` - Rejects if insufficient balance
- [ ] `GET /api/tap-and-pay/transactions` - Returns history

---

## 📱 Mobile App Tests

### Wallet Tab
- [ ] VirtualCardManager component displays
- [ ] Shows "Create Card" when no card exists
- [ ] Shows card info when card exists
- [ ] Card creation works (balance ≥$5)
- [ ] Card creation blocked (balance <$5)
- [ ] Delete card shows 2 warnings
- [ ] Balance updates after payment

### Payment Flow
- [ ] Can select venue
- [ ] Can enter amount
- [ ] Validates $5 minimum
- [ ] Validates $500 maximum
- [ ] Processes payment successfully
- [ ] Updates balance in real-time
- [ ] Shows transaction in history

---

## 🏢 Venue Portal Tests

### Redemptions Page
- [ ] Shows tap-and-pay transactions
- [ ] Displays transaction amount
- [ ] Shows commission deducted
- [ ] Shows net amount received
- [ ] Filters by payment type

### Earnings Dashboard
- [ ] Includes tap-and-pay in totals
- [ ] Shows commission breakdown
- [ ] Updates in real-time

---

## 🧪 Quick Test Commands

```bash
# Test backend (requires test user)
cd backend
node tests/virtual-cards.test.js

# Start backend
npm run dev

# Start mobile app
cd ../shot-on-me
npm run dev

# Start venue portal
cd ../venue-portal
npm run dev
```

---

## 🔍 Manual Test Steps

1. **Mobile App:**
   - Login to mobile app
   - Go to Wallet tab
   - Check VirtualCardManager appears
   - Try creating card (need $5+ balance)
   - View card details if created

2. **Venue Portal:**
   - Login as venue owner
   - Go to Redemptions page
   - Verify tap-and-pay transactions show
   - Check earnings dashboard

3. **End-to-End:**
   - User A sends $50 to User B
   - User B creates card (if balance ≥$5)
   - User B taps to pay at venue
   - Verify payment processed
   - Verify venue receives payment
   - Verify commission calculated

---

## ⚠️ Known Limitations

- Stripe Issuing must be enabled (may show error if not)
- Apple Wallet/Google Pay integration pending
- Real-time notifications need Socket.io connection
- Test with actual devices for wallet integration

---

## 🐛 Common Issues

1. **"Stripe Issuing not enabled"**
   - Expected if not set up yet
   - Test error handling

2. **"Minimum balance required"**
   - Add funds to test user
   - Need $5+ to create card

3. **"Card already exists"**
   - Delete existing card first
   - Or test with new user

---

## ✅ Success Criteria

- All API endpoints respond correctly
- Mobile app displays card manager
- Card creation works with sufficient balance
- Payment processing deducts correct amount
- Venue portal shows transactions
- Commission calculated correctly
- Error messages are clear

