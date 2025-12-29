# Installing ngrok on Windows

## Quick Install (Recommended)

### Option 1: Using Chocolatey (if you have it)
```powershell
choco install ngrok
```

### Option 2: Using Scoop (if you have it)
```powershell
scoop install ngrok
```

### Option 3: Manual Download (Most Reliable)

1. **Download ngrok:**
   - Go to: https://ngrok.com/download
   - Download the Windows version (ZIP file)

2. **Extract and Install:**
   - Extract the ZIP file
   - You'll get `ngrok.exe`
   - Move it to a permanent location (e.g., `C:\ngrok\ngrok.exe`)

3. **Add to PATH (Optional but Recommended):**
   - Right-click "This PC" → Properties → Advanced system settings
   - Click "Environment Variables"
   - Under "System variables", find "Path" and click "Edit"
   - Click "New" and add the folder where ngrok.exe is located (e.g., `C:\ngrok`)
   - Click OK on all dialogs
   - Restart PowerShell

4. **Verify Installation:**
   ```powershell
   ngrok version
   ```

## Alternative: Use Stripe CLI Instead

If you don't want to install ngrok, you can use Stripe CLI which has built-in webhook forwarding:

1. **Install Stripe CLI:**
   - Download from: https://stripe.com/docs/stripe-cli
   - Or use: `winget install stripe.stripe-cli`

2. **Login to Stripe:**
   ```powershell
   stripe login
   ```

3. **Forward Webhooks:**
   ```powershell
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```
   
   This will:
   - Give you a webhook signing secret automatically
   - Forward webhooks to your local server
   - Display the webhook secret (starts with `whsec_...`)

4. **Use the signing secret:**
   - Copy the `whsec_...` secret shown
   - Add to `backend/.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`
   - In Stripe Dashboard, you can use: `https://hooks.stripe.com/...` (Stripe CLI provides this)

## For Now: Use a Test URL

If you just want to test the webhook setup without ngrok, you can:

1. **Use a placeholder URL temporarily:**
   ```
   https://example.com/api/payments/webhook
   ```

2. **Or use Stripe's test webhook URL:**
   - Stripe CLI provides a test endpoint
   - Or use a service like webhook.site for testing

## Recommended: Stripe CLI

For webhook testing, Stripe CLI is actually easier because:
- ✅ No need to expose your local server
- ✅ Automatically provides webhook signing secret
- ✅ Built specifically for Stripe webhook testing
- ✅ Works seamlessly with Stripe Dashboard


