# Testing Guide - Mobile Wallet Card System

## Quick Start Testing

### Prerequisites
1. Backend server running on port 5000
2. Mobile app running on port 3001
3. Venue portal running on port 3000
4. Test user with balance ≥$5 (for card creation)
5. Test venue with Stripe Connect enabled

---

## 🧪 Backend API Testing

### Run Automated Tests
```bash
cd backend
node tests/virtual-cards.test.js
```

### Manual API Testing

**1. Check Card Status**
```bash
curl -X GET http://localhost:5000/api/virtual-cards/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "hasCard": false,
  "canCreate": true,
  "balance": 10.00,
  "minimumRequired": 5.00,
  "issuingEnabled": true
}
```

**2. Create Virtual Card**
```bash
curl -X POST http://localhost:5000/api/virtual-cards/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Virtual card created successfully",
  "card": {
    "id": "...",
    "last4": "1234",
    "brand": "visa",
    "status": "active"
  }
}
```

**3. Test Commission Calculation**
- $10 transaction → $0.50 commission
- $50 transaction → $1.25 commission (2.5%)
- $100 transaction → $2.50 commission (2.5%)

---

## 📱 Mobile App Testing

### Test Card Creation Flow

1. **Login to Mobile App**
   - Go to http://localhost:3001
   - Login with test user

2. **Navigate to Wallet Tab**
   - Click "Wallet" in bottom navigation
   - Scroll to see VirtualCardManager component

3. **Test Scenarios:**

   **Scenario A: No Card, Sufficient Balance (≥$5)**
   - Should show "Create Card" button
   - Click "Create Card"
   - Should create card successfully
   - Should show card details

   **Scenario B: No Card, Insufficient Balance (<$5)**
   - Should show "Minimum balance required" message
   - Should show current balance
   - Should not allow card creation

   **Scenario C: Card Exists**
   - Should show card info (last4, brand, expiration)
   - Should show wallet status (Apple/Google Pay)
   - Should show "Add to Wallet" buttons

4. **Test Card Deletion**
   - Click X button on card
   - Should show first warning
   - Click "Continue"
   - Should show second warning
   - Click "Remove Card"
   - Card should be deactivated

---

## 🏢 Venue Portal Testing

### Test Transaction Display

1. **Login to Venue Portal**
   - Go to http://localhost:3000
   - Login as venue owner

2. **Navigate to Redemptions Page**
   - Click "Redemptions" in dashboard
   - Should show all payment types including tap-and-pay

3. **Verify Transaction Display**
   - Tap-and-pay transactions should show:
     - Payment type badge ("Tap & Pay")
     - Transaction amount
     - Commission fee (if applicable)
     - Net amount received
     - Transaction status
     - Timestamp

4. **Test Filtering**
   - Transactions should include:
     - `shot_redeemed`
     - `transfer`
     - `tap_and_pay` (NEW)

---

## 🔄 End-to-End Testing

### Complete Payment Flow

**Step 1: User Receives Payment**
1. User A sends $50 to User B
2. User B's balance updates to $50
3. User B receives notification

**Step 2: Card Creation**
1. User B opens Wallet tab
2. Sees "Create Card" option (balance ≥$5)
3. Clicks "Create Card"
4. Card created successfully
5. Card details displayed

**Step 3: Payment at Venue**
1. User B is at venue
2. Taps phone to pay $30
3. Payment processed
4. Balance deducted ($50 → $20)
5. Commission calculated ($0.50 for <$20)
6. Venue receives $29.50

**Step 4: Venue Portal**
1. Venue owner checks Redemptions page
2. Sees tap-and-pay transaction
3. Shows $30 amount
4. Shows $0.50 commission
5. Shows $29.50 net received

---

## 🐛 Common Issues & Solutions

### Issue 1: "Stripe Issuing not enabled"
**Solution:** 
- This is expected if Stripe Issuing isn't set up yet
- Test error handling works correctly
- User sees clear message

### Issue 2: "Minimum balance required"
**Solution:**
- Add funds to test user wallet
- Need $5+ to create card
- Test with different balance amounts

### Issue 3: "Card already exists"
**Solution:**
- Delete existing card first
- Or test with new user account
- Check card status endpoint

### Issue 4: Payment fails
**Solution:**
- Check venue has Stripe Connect enabled
- Verify user has sufficient balance
- Check transaction limits
- Review backend logs

---

## ✅ Test Checklist

### Backend
- [ ] Card status endpoint works
- [ ] Card creation works (balance ≥$5)
- [ ] Card creation blocked (balance <$5)
- [ ] Commission calculation correct
- [ ] Transaction limits enforced
- [ ] Payment processing works
- [ ] Balance updates correctly

### Mobile App
- [ ] VirtualCardManager displays
- [ ] Card creation flow works
- [ ] Card deletion with 2 warnings
- [ ] Error messages clear
- [ ] Balance validation works
- [ ] Real-time updates work

### Venue Portal
- [ ] Tap-and-pay transactions show
- [ ] Commission displayed correctly
- [ ] Net amount shown
- [ ] Payment type badge works
- [ ] Filtering works

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________

Backend API:
- Card Status: [ ] Pass [ ] Fail
- Card Creation: [ ] Pass [ ] Fail
- Commission Calc: [ ] Pass [ ] Fail
- Payment Processing: [ ] Pass [ ] Fail

Mobile App:
- Card Manager Display: [ ] Pass [ ] Fail
- Card Creation: [ ] Pass [ ] Fail
- Card Deletion: [ ] Pass [ ] Fail

Venue Portal:
- Transaction Display: [ ] Pass [ ] Fail
- Commission Display: [ ] Pass [ ] Fail

Issues Found:
1. ________________
2. ________________
3. ________________
```

---

## 🚀 Next Steps After Testing

1. Fix any identified bugs
2. Optimize performance
3. Improve error messages
4. Add missing features
5. Deploy to staging
6. User acceptance testing

