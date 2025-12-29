# Testing Steps - Latest Updates

## 🚀 Quick Start

### Prerequisites
- ✅ Backend running on port 5000
- ✅ Mobile app running on port 3001
- ✅ Venue portal running on port 3000
- ✅ Test user with balance ≥$5 (for card creation)
- ✅ Test venue with Stripe Connect enabled

---

## 📱 Mobile App Testing

### Step 1: Access Wallet Tab
1. Open http://localhost:3001
2. Login with test user
3. **Click "Wallet" in bottom navigation** (5th tab)
4. You should see:
   - VirtualCardManager component at the top
   - Wallet balance card
   - Add Funds button
   - Payment Methods button

### Step 2: Test Virtual Card Creation
**Scenario A: Sufficient Balance (≥$5)**
1. Ensure wallet balance is $5 or more
2. In Wallet tab, look for VirtualCardManager
3. Should show "Create Card" button
4. Click "Create Card"
5. **Expected:** Card created successfully (or error if Stripe Issuing not enabled)

**Scenario B: Insufficient Balance (<$5)**
1. If balance < $5, should show:
   - "Minimum balance required: $5.00"
   - Current balance
   - "Add funds to create your card"

### Step 3: Test Card Management (if card exists)
1. If card was created, should see:
   - Card info (last4, brand, expiration)
   - "Add to Apple Wallet" button
   - "Add to Google Pay" button
   - Delete (X) button
2. Test deletion:
   - Click X button
   - Should show first warning
   - Click "Continue"
   - Should show second warning
   - Click "Remove Card"
   - Card should be deactivated

### Step 4: Test Navigation
1. **Home Tab:** Click Home icon in header (top right)
2. **Feed Tab:** Click Feed in bottom nav
3. **Stories Tab:** Click Stories in bottom nav
4. **Venues Tab:** Click Venues in bottom nav
5. **Wallet Tab:** Click Wallet in bottom nav
6. **Send Shot Tab:** Click Send Shot in bottom nav

---

## 🏢 Venue Portal Testing

### Step 1: Access Redemptions Page
1. Open http://localhost:3000
2. Login as venue owner
3. Navigate to **Redemptions** page (from dashboard or menu)
4. You should see:
   - Redemption code input
   - Redemptions over time chart
   - Recent redemptions list

### Step 2: Verify Tap-and-Pay Transactions
1. If there are tap-and-pay transactions, they should show:
   - **Payment type badge:** "Tap & Pay" (blue badge)
   - **Transaction amount**
   - **Commission fee** (if applicable)
   - **Net amount received**
   - **Transaction status**
   - **Timestamp**

2. Compare with other payment types:
   - "Shot Redeemed" (primary badge)
   - "Transfer" (primary badge)
   - "Tap & Pay" (blue badge) ← NEW

### Step 3: Test Filtering
1. Redemptions should include:
   - `shot_redeemed` transactions
   - `transfer` transactions
   - `tap_and_pay` transactions ← NEW

---

## 🔧 Backend API Testing

### Step 1: Check API Endpoints
1. Open http://localhost:5000/api
2. Should see new endpoints:
   ```json
   {
     "endpoints": {
       ...
       "virtualCards": "/api/virtual-cards",
       "tapAndPay": "/api/tap-and-pay"
     }
   }
   ```

### Step 2: Test Virtual Cards API

**Check Card Status:**
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

**Create Card (if balance ≥$5):**
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

### Step 3: Test Tap-and-Pay API

**Process Payment:**
```bash
curl -X POST http://localhost:5000/api/tap-and-pay/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "venueId": "VENUE_ID",
    "amount": 25.00
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "payment": {
    "amount": 25.00,
    "commission": 0.50,
    "venueReceives": 24.50
  },
  "newBalance": 75.00
}
```

**Get Transactions:**
```bash
curl -X GET http://localhost:5000/api/tap-and-pay/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🧪 Automated Testing

### Run Backend Test Script
```bash
cd backend
node tests/virtual-cards.test.js
```

**Or with test token:**
```bash
TEST_TOKEN=your_token node tests/virtual-cards.test.js
```

---

## ✅ Test Checklist

### Mobile App
- [ ] Wallet tab appears in bottom navigation
- [ ] VirtualCardManager component displays
- [ ] Card creation works (balance ≥$5)
- [ ] Card creation blocked (balance <$5)
- [ ] Card deletion shows 2 warnings
- [ ] Home icon works in header
- [ ] All bottom nav tabs work

### Venue Portal
- [ ] Redemptions page loads
- [ ] Tap-and-pay transactions show (if any exist)
- [ ] Payment type badges display correctly
- [ ] Commission shown for tap-and-pay
- [ ] Net amount calculated correctly

### Backend
- [ ] `/api` endpoint shows new routes
- [ ] `/api/virtual-cards/status` works
- [ ] `/api/virtual-cards/create` works (or shows appropriate error)
- [ ] `/api/tap-and-pay/process` works
- [ ] Commission calculation correct

---

## 🐛 Common Issues & Solutions

### Issue 1: "Stripe Issuing not enabled"
**Solution:** This is expected if Stripe Issuing isn't set up yet. Test error handling works correctly.

### Issue 2: "Minimum balance required"
**Solution:** Add funds to test user wallet. Need $5+ to create card.

### Issue 3: No tap-and-pay transactions in venue portal
**Solution:** Transactions only show if they exist. Create a test transaction via API first.

### Issue 4: Wallet tab not visible
**Solution:** Restart mobile app. Should be 5th tab in bottom nav.

### Issue 5: Home icon not working
**Solution:** Restart mobile app. Should be in header (top right, before Messages).

---

## 📊 Expected Results

### Mobile App
- ✅ Wallet tab accessible from bottom nav
- ✅ VirtualCardManager shows card status
- ✅ Card creation flow works
- ✅ Error messages are clear
- ✅ Navigation works smoothly

### Venue Portal
- ✅ Redemptions page shows all payment types
- ✅ Tap-and-pay transactions display correctly
- ✅ Commission and net amounts shown
- ✅ Payment type badges work

### Backend
- ✅ All endpoints respond correctly
- ✅ Commission calculated correctly ($0.50 <$20, 2.5% ≥$20)
- ✅ Transaction limits enforced
- ✅ Error handling works

---

## 🎯 Priority Testing Order

1. **First:** Mobile app navigation (Wallet tab, Home icon)
2. **Second:** Backend API endpoints (check they exist and respond)
3. **Third:** Virtual card creation (if balance ≥$5)
4. **Fourth:** Venue portal transaction display
5. **Fifth:** End-to-end payment flow (if possible)

---

## 📝 Test Results Template

```
Date: ___________
Tester: ___________

Mobile App:
- Wallet Tab: [ ] Pass [ ] Fail
- VirtualCardManager: [ ] Pass [ ] Fail
- Card Creation: [ ] Pass [ ] Fail
- Navigation: [ ] Pass [ ] Fail

Venue Portal:
- Redemptions Page: [ ] Pass [ ] Fail
- Tap-and-Pay Display: [ ] Pass [ ] Fail
- Commission Display: [ ] Pass [ ] Fail

Backend:
- API Endpoints: [ ] Pass [ ] Fail
- Card Status: [ ] Pass [ ] Fail
- Payment Processing: [ ] Pass [ ] Fail

Issues Found:
1. ________________
2. ________________
3. ________________
```

---

## 🚀 Ready to Test!

Start with mobile app navigation, then move to backend API, then test the full flow.

