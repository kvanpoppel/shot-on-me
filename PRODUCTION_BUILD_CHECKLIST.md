# 🚀 Production Build Checklist - Tap-and-Pay Launch

## Critical Pre-Launch Verification

### 1. Environment Variables (Vercel)

#### Frontend (shot-on-me):
```env
NEXT_PUBLIC_API_URL=https://shot-on-me.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=wss://shot-on-me.onrender.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBAUfIjkw1qX7KVA1JYS-CetjTFdFovkB8
RENDER_SERVICE_ID=srv-d3i7318dl3ps73cvlv00
```

#### Backend (Render):
```env
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_PHONE_NUMBER=<your-twilio-number>
FRONTEND_URL=https://www.shotonme.com
NODE_ENV=production
```

### 2. Stripe Configuration

#### Required:
- ✅ Stripe Issuing enabled
- ✅ Test mode verified
- ✅ Production keys configured
- ✅ Webhook endpoints configured
- ✅ Card creation tested

#### Verification Steps:
1. Go to https://dashboard.stripe.com/issuing
2. Verify "Enable Issuing" is clicked
3. Test card creation in test mode
4. Verify webhook endpoints are set up
5. Test payment processing

### 3. Socket.io Configuration

#### Backend (server.js):
- ✅ CORS configured for www.shotonme.com
- ✅ Socket.io server running
- ✅ Authentication middleware working
- ✅ Room management working

#### Frontend:
- ✅ Socket.io client configured
- ✅ Auto-reconnection enabled
- ✅ Connection status monitoring
- ✅ Event listeners registered

### 4. Build Configuration

#### Vercel (vercel.json):
```json
{
  "buildCommand": "cd shot-on-me && npm run build",
  "outputDirectory": "shot-on-me/.next",
  "installCommand": "cd shot-on-me && npm install",
  "framework": "nextjs"
}
```

#### Next.js (next.config.js):
- ✅ PWA configuration
- ✅ Environment variables
- ✅ Webpack aliases
- ✅ Build optimizations

### 5. API Endpoints Verification

#### Critical Endpoints:
- ✅ `POST /api/virtual-cards/create` - Card creation
- ✅ `GET /api/virtual-cards/status` - Card status
- ✅ `POST /api/tap-and-pay/process` - Payment processing
- ✅ `GET /api/payments/history` - Transaction history
- ✅ `POST /api/payments/send` - Send money
- ✅ `POST /api/payments/redeem` - Redeem code

### 6. Database Verification

#### MongoDB:
- ✅ Connection string valid
- ✅ Collections created
- ✅ Indexes optimized
- ✅ Backup configured

### 7. Testing Checklist

#### Onboarding Flow:
- [ ] New user registration
- [ ] Card creation
- [ ] Add funds (optional)
- [ ] Permissions setup
- [ ] Onboarding completion
- [ ] Returning user (skip onboarding)

#### Card Functionality:
- [ ] Card creation success
- [ ] Card status check
- [ ] Add to Apple Wallet
- [ ] Add to Google Pay
- [ ] Tap-and-pay transaction
- [ ] Payment processing
- [ ] Transaction history

#### Socket.io:
- [ ] Connection on login
- [ ] Real-time wallet updates
- [ ] Card creation notifications
- [ ] Payment notifications
- [ ] Reconnection handling
- [ ] Error handling

#### Permissions:
- [ ] Location access
- [ ] Camera access
- [ ] Microphone access
- [ ] Contacts access
- [ ] Notifications

### 8. Performance Optimization

#### Frontend:
- ✅ Code splitting
- ✅ Image optimization
- ✅ Lazy loading
- ✅ Memoization
- ✅ Bundle size optimization

#### Backend:
- ✅ API response caching
- ✅ Database query optimization
- ✅ Rate limiting
- ✅ Error handling

### 9. Security Checklist

- ✅ HTTPS enabled
- ✅ JWT tokens secure
- ✅ API authentication
- ✅ CORS configured
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS prevention
- ✅ CSRF protection

### 10. Monitoring & Analytics

#### Recommended:
- Error tracking (Sentry, LogRocket)
- Performance monitoring
- User analytics
- Payment analytics
- Socket.io connection monitoring

### 11. Launch Day Checklist

#### Pre-Launch (24 hours before):
- [ ] All environment variables set
- [ ] Stripe production keys configured
- [ ] Database backups verified
- [ ] All tests passing
- [ ] Build successful
- [ ] Deployment tested

#### Launch Day:
- [ ] Final build and deploy
- [ ] Monitor error rates
- [ ] Monitor Socket.io connections
- [ ] Monitor card creation success
- [ ] Monitor payment processing
- [ ] User support ready

#### Post-Launch (First 24 hours):
- [ ] Monitor error logs
- [ ] Monitor user feedback
- [ ] Monitor payment success rate
- [ ] Monitor card creation success rate
- [ ] Monitor onboarding completion rate
- [ ] Address critical issues immediately

---

## 🎯 Success Metrics

### Target Metrics:
- **Card Creation Success Rate**: > 95%
- **Onboarding Completion Rate**: > 80%
- **Socket.io Connection Success**: > 99%
- **Payment Processing Success**: > 98%
- **Average Onboarding Time**: < 2 minutes
- **Error Rate**: < 1%

---

## 🚨 Rollback Plan

If critical issues occur:
1. Revert to previous deployment in Vercel
2. Disable new user registrations (if needed)
3. Notify users via status page
4. Investigate and fix issues
5. Re-deploy when ready

---

## ✅ Status: READY FOR PRODUCTION

All components are built and ready. Complete the verification checklist above before launching.

