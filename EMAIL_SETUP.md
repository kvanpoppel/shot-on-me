# Email Service Setup Guide

## Overview
The application uses **Nodemailer** to send password reset emails. You need to configure SMTP credentials to enable email sending.

## Quick Setup Options

### Option 1: Gmail (Easiest for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character app password

3. **Add to `backend/.env`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   FRONTEND_URL=http://localhost:3000
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Sign up** at [SendGrid.com](https://sendgrid.com/) (free tier: 100 emails/day)
2. **Create an API Key:**
   - Dashboard → Settings → API Keys
   - Create API Key with "Full Access"
   - Copy the API key

3. **Add to `backend/.env`:**
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key
   FRONTEND_URL=http://localhost:3000
   ```

### Option 3: Mailgun (Production Alternative)

1. **Sign up** at [Mailgun.com](https://www.mailgun.com/) (free tier: 5,000 emails/month)
2. **Get SMTP credentials** from Dashboard → Sending → SMTP credentials
3. **Add to `backend/.env`:**
   ```env
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-mailgun-smtp-username
   SMTP_PASS=your-mailgun-smtp-password
   FRONTEND_URL=http://localhost:3000
   ```

### Option 4: AWS SES (Enterprise)

1. **Set up AWS SES** in your AWS account
2. **Verify your email** or domain
3. **Get SMTP credentials** from AWS SES Console
4. **Add to `backend/.env`:**
   ```env
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-aws-ses-smtp-username
   SMTP_PASS=your-aws-ses-smtp-password
   FRONTEND_URL=http://localhost:3000
   ```

## Environment Variables

Add these to your `backend/.env` file:

```env
# Email Configuration (choose one option above)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password-or-app-password

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000
# OR for venue portal:
VENUE_PORTAL_URL=http://localhost:3000
```

**Alternative variable names** (also supported):
- `EMAIL_USER` instead of `SMTP_USER`
- `EMAIL_PASS` or `EMAIL_APP_PASSWORD` instead of `SMTP_PASS`

## Testing Email Service

### Method 1: Test via Forgot Password
1. Start your backend server
2. Go to the login page
3. Click "Forgot password?"
4. Enter your email
5. Check your inbox (and spam folder)

### Method 2: Check Server Logs
When you request a password reset, check the backend console:
- ✅ `Email service initialized` - Service is ready
- ✅ `Password reset email sent: [messageId]` - Email was sent successfully
- ⚠️ `Email service not configured` - Need to add credentials
- ❌ `Failed to send password reset email` - Check your credentials

## Troubleshooting

### "Email service not configured"
- **Solution:** Add `SMTP_USER` and `SMTP_PASS` to `backend/.env`
- Restart your backend server

### "Invalid login" or "Authentication failed"
- **Gmail:** Make sure you're using an **App Password**, not your regular password
- **SendGrid:** Verify your API key is correct
- **Other services:** Double-check username and password

### Emails going to spam
- **Gmail:** Mark the email as "Not Spam"
- **Production:** Set up SPF/DKIM records for your domain
- **SendGrid/Mailgun:** Verify your domain

### Emails not arriving
1. Check spam/junk folder
2. Verify email address is correct
3. Check server logs for errors
4. Test SMTP connection manually

## Development Mode

In development mode (`NODE_ENV=development`), the reset token is also returned in the API response for testing purposes. This allows you to test password reset even if email isn't configured.

## Production Checklist

- [ ] Use a production email service (SendGrid, Mailgun, or AWS SES)
- [ ] Set `FRONTEND_URL` to your production domain
- [ ] Verify your sending domain
- [ ] Set up SPF/DKIM records
- [ ] Test email delivery
- [ ] Monitor email bounce rates

## Security Notes

- **Never commit** `.env` files to git
- Use **App Passwords** for Gmail (not your main password)
- Rotate API keys regularly
- Use environment-specific credentials


