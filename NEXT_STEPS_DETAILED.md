# Next Steps - Detailed Instructions

## Step 1: Restart Backend Server

### Option A: If backend is running in PowerShell
1. Go to the PowerShell window where the backend is running
2. Press `Ctrl+C` to stop the server
3. Run: `npm start` (or `npm run dev` if using nodemon)
4. Wait for "✅ Connected to MongoDB" message

### Option B: If you need to start it fresh
1. Open PowerShell
2. Navigate to backend directory:
   ```powershell
   cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend
   ```
3. Start the server:
   ```powershell
   npm start
   ```
4. Verify it's running - you should see:
   - "✅ Connected to MongoDB"
   - "🌐 Server running on port 5000"

---

## Step 2: Hard Refresh Frontend

1. Open your browser
2. Navigate to: `http://localhost:3001`
3. Press **`Ctrl + Shift + R`** (Windows) or **`Ctrl + F5`**
   - This clears the cache and reloads all JavaScript files
4. Open browser DevTools (F12) and check the Console tab
5. Look for:
   - ✅ No "LoadScript has been reloaded" warnings
   - ✅ No "Unsupported prop change on Elements" warnings
   - ✅ No errors related to Stripe Elements

---

## Step 3: Build Frontend to Verify No Errors

1. Open a **new** PowerShell window (keep backend running)
2. Navigate to frontend directory:
   ```powershell
   cd C:\Users\kvanpoppel\shot-on-me-venue-portal\shot-on-me
   ```
3. Run the build command:
   ```powershell
   npm run build
   ```
4. Wait for build to complete
5. Check the output:
   - ✅ **Success**: "Compiled successfully" or similar
   - ❌ **Error**: If you see errors, note them down

**Expected output:**
```
✓ Compiled successfully
```

---

## Step 4: Test Redeem Endpoint

### Prerequisites:
- Backend server must be running
- You need a valid JWT token (from logging into the app)
- You need a test payment ID or redemption code
- You need a test venue ID

### Get Your JWT Token:
1. Open the app at `http://localhost:3001`
2. Log in
3. Open browser DevTools (F12)
4. Go to **Application** tab → **Local Storage** → `http://localhost:3001`
5. Find `token` key and copy its value

### Get Test Payment ID:
1. In the app, go to Wallet tab
2. Look at payment history
3. Find a payment with status "pending" or "shot_sent"
4. Copy the payment ID (or use a redemption code if available)

### Get Test Venue ID:
1. In the app, go to Map tab
2. Click on any venue
3. The venue ID is in the URL or you can check browser DevTools Network tab

### Run the Test:

1. Open PowerShell
2. Navigate to backend directory:
   ```powershell
   cd C:\Users\kvanpoppel\shot-on-me-venue-portal\backend
   ```
3. Set environment variables (replace with your actual values):
   ```powershell
   $env:TEST_TOKEN="your_jwt_token_here"
   $env:TEST_PAYMENT_ID="payment_id_here"
   $env:TEST_VENUE_ID="venue_id_here"
   ```
   
   **OR** if you have a redemption code instead:
   ```powershell
   $env:TEST_TOKEN="your_jwt_token_here"
   $env:TEST_REDEMPTION_CODE="ABC123"
   $env:TEST_VENUE_ID="venue_id_here"
   ```

4. Run the test script:
   ```powershell
   node scripts/test-redeem-endpoint.js
   ```

5. Check the output:
   - ✅ **Success**: Should show "✅ Success!" with transfer ID
   - ✅ **Idempotency test**: Should show "✅ Idempotency working correctly!"
   - ❌ **Error**: If errors occur, note the error message

**Example successful output:**
```
🧪 Testing /api/payments/redeem endpoint

Configuration:
  API URL: http://localhost:5000/api
  Payment ID: 507f1f77bcf86cd799439011
  Venue ID: 507f191e810c19729de860ea
  Idempotency Key: test-1765771069214-ph9tfn74z

📤 Sending POST request to /api/payments/redeem...
✅ Success!
Response status: 200
Response data: {
  "success": true,
  "transferId": "tr_xxxxx",
  "paymentId": "507f1f77bcf86cd799439011",
  "message": "Payment redeemed successfully"
}

🔄 Testing idempotency (sending same request again)...
✅ Idempotency test result:
✅ Idempotency working correctly!
```

---

## Quick Verification Checklist

After completing all steps, verify:

- [ ] Backend server is running on port 5000
- [ ] Frontend loads without errors at localhost:3001
- [ ] No console warnings about LoadScript
- [ ] No console warnings about Stripe Elements
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Redeem endpoint test passes (if you have test data)

---

## Troubleshooting

### Backend won't start:
- Check if port 5000 is already in use
- Verify MongoDB connection string in `.env`
- Check for syntax errors in `backend/routes/payments.js`

### Frontend build fails:
- Run `npm install` in `shot-on-me` directory
- Check for TypeScript errors
- Verify all imports are correct

### Redeem test fails:
- Verify backend is running
- Check JWT token is valid (not expired)
- Verify payment ID exists and is in "pending" status
- Verify venue has Stripe Connect account connected
- Check backend console for error messages

---

## Need Help?

If you encounter issues:
1. Check backend console logs
2. Check browser DevTools Console
3. Check browser DevTools Network tab for failed requests
4. Share the error messages for assistance



