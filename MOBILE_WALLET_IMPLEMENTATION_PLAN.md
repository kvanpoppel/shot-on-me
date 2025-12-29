# Mobile Wallet Card Implementation Plan

## Executive Summary

**Recommended Approach:**
1. **Regulatory:** Use Stripe's licensed infrastructure (fastest, most compliant)
2. **Commission:** Hybrid model - $0.50 flat for <$20, 2.5% for ≥$20
3. **Transaction Limits:** $5 minimum, $500 maximum, $1,000 daily limit
4. **Refund Policy:** 30-day window with venue approval
5. **Timeline:** Accelerated 3-month implementation

---

## 1. Regulatory Approach - RECOMMENDED

### ✅ Use Stripe's Licensed Infrastructure

**Why This Is Smartest:**
- **Fastest to Market:** No 3-6 month license application process
- **Compliance Built-In:** Stripe handles all regulatory requirements
- **Lower Risk:** Operating under Stripe's established licenses
- **Cost Effective:** No $200k+ bonds or application fees upfront
- **Scalable:** Works nationwide without state-by-state licensing

**How It Works:**
- You operate as a "platform" using Stripe Connect + Stripe Issuing
- Stripe holds the money transmitter licenses
- You handle user experience and business logic
- Stripe handles compliance, reporting, and regulatory requirements

**Requirements:**
- Business registration (LLC/Corp)
- Terms of Service and Privacy Policy
- Stripe Issuing approval (2-4 weeks)
- KYC/AML compliance (Stripe Identity)

**Action Items:**
1. Apply for Stripe Issuing immediately
2. Complete business verification
3. Legal review of terms (with your counsel)
4. Set up Stripe Identity for KYC

---

## 2. Commission Structure - RECOMMENDED

### ✅ Hybrid Model: $0.50 Flat (<$20) + 2.5% (≥$20)

**Structure:**
```
Transaction < $20:  $0.50 flat fee
Transaction ≥ $20:  2.5% of transaction amount
```

**Examples:**
- $10 transaction → You keep $0.50, Venue gets $9.50
- $50 transaction → You keep $1.25, Venue gets $48.75
- $100 transaction → You keep $2.50, Venue gets $97.50

**Why This Is Best:**
- **Fair for Small Transactions:** $0.50 is reasonable for $5-$19.99
- **Scales with Large Transactions:** 2.5% is competitive industry standard
- **Predictable Revenue:** You know minimum per transaction
- **Venue-Friendly:** Lower percentage than credit cards (2.9%+)

**Additional Revenue:**
- Float interest on funds in your account
- Potential premium features (faster payouts, analytics)

**Implementation:**
- Calculate fee at transaction time
- Deduct from payment to venue
- Track in transaction records
- Show fee breakdown in venue portal

---

## 3. Transaction Limits - CONFIRMED

### ✅ $5 Minimum, $500 Maximum, $1,000 Daily

**Limits:**
- **Minimum Transaction:** $5.00
- **Maximum Single Transaction:** $500.00
- **Daily Spending Limit:** $1,000.00
- **Weekly Spending Limit:** $5,000.00
- **Monthly Spending Limit:** $10,000.00

**Enforcement:**
- Check at card creation (must have $5+ balance)
- Validate at transaction time
- Show clear error messages
- Allow limit increases with KYC verification

**User Experience:**
- Clear messaging: "Minimum $5 required"
- Real-time balance updates
- Transaction history
- Spending limit warnings

---

## 4. Refund Policy - CONFIRMED

### ✅ 30-Day Window with Venue Approval

**Policy:**
- **Full Refunds:** Within 30 days of transaction
- **Venue Approval Required:** Venue must approve refund
- **Dispute Window:** 7 days to dispute transaction
- **Processing Time:** 3-5 business days
- **Refund Method:** Funds returned to user's wallet

**Refund Flow:**
1. User requests refund from transaction
2. Venue receives notification
3. Venue approves/denies
4. If approved: Refund processed
5. Funds returned to user's wallet
6. Card balance updated

**Dispute Resolution:**
- User can dispute within 7 days
- You review case
- If valid: Refund processed
- If invalid: Case closed

**Implementation:**
- Refund request UI in app
- Venue approval in portal
- Automated refund processing
- Transaction status tracking

---

## 5. Accelerated Timeline - 3 MONTHS

### Month 1: Foundation & Compliance (Weeks 1-4)
**Week 1:**
- Apply for Stripe Issuing
- Set up Apple/Google developer accounts
- Legal review (terms, privacy policy)
- KYC/AML system selection

**Week 2:**
- Stripe Issuing integration (API setup)
- Database schema for cards
- Security infrastructure
- Age verification system

**Week 3:**
- Card creation backend
- Wallet balance sync
- Transaction processing logic
- Commission calculation

**Week 4:**
- Testing card creation
- Security testing
- Compliance verification
- Documentation

### Month 2: Mobile Wallet Integration (Weeks 5-8)
**Week 5:**
- Apple Wallet (PassKit) integration
- Card addition flow
- Auto opt-in with decline
- Testing on iOS devices

**Week 6:**
- Google Pay API integration
- Card addition flow
- Cross-platform testing
- Error handling

**Week 7:**
- Card deletion warnings (2 warnings)
- Re-add card functionality
- Balance sync testing
- UI/UX refinements

**Week 8:**
- Notification system (SMS/push)
- Transaction notifications
- Card ready notifications
- Testing notifications

### Month 3: Venue Integration & Launch (Weeks 9-12)
**Week 9:**
- Venue payment processing
- Tap-and-pay flow
- Commission deduction
- Real-time dashboard

**Week 10:**
- Refund system
- Dispute resolution
- Transaction limits enforcement
- Testing payment flow

**Week 11:**
- Beta testing with select venues
- Performance optimization
- Security audit
- Bug fixes

**Week 12:**
- Soft launch
- Monitor transactions
- Gather feedback
- Full launch preparation

---

## Technical Architecture

### System Components

1. **Stripe Issuing API**
   - Virtual card creation
   - Card management
   - Balance updates
   - Transaction processing

2. **Apple Wallet (PassKit)**
   - Card pass creation
   - Automatic addition
   - Update notifications
   - Deletion handling

3. **Google Pay API**
   - Card token creation
   - Automatic addition
   - Balance updates
   - Transaction handling

4. **Backend Services**
   - Card creation endpoint
   - Balance sync service
   - Transaction processor
   - Commission calculator
   - Refund handler

5. **Database Schema**
   - User cards table
   - Transaction records
   - Refund requests
   - Commission tracking

---

## Security & Compliance

### Required Features

1. **KYC/AML**
   - Stripe Identity integration
   - Age verification (18+)
   - ID verification
   - Address verification

2. **Security**
   - Biometric authentication
   - Transaction PIN
   - Fraud detection
   - Rate limiting
   - Encryption (TLS 1.3, AES-256)

3. **Compliance**
   - Terms of Service
   - Privacy Policy
   - User agreements
   - Transaction logging
   - Audit trails

---

## Next Steps

1. **Immediate (This Week):**
   - Apply for Stripe Issuing
   - Set up developer accounts
   - Begin legal review

2. **Week 2:**
   - Start Stripe Issuing integration
   - Design database schema
   - Begin card creation backend

3. **Week 3-4:**
   - Complete backend
   - Start mobile wallet integration
   - Testing

---

## Success Metrics

- Card creation success rate: >95%
- Transaction success rate: >99%
- User adoption: Track card creation rate
- Venue adoption: Track connected venues
- Transaction volume: Track daily/weekly/monthly

---

## Risk Mitigation

1. **Stripe Issuing Approval:**
   - Apply early (can take 2-4 weeks)
   - Have backup plan if delayed

2. **Regulatory Changes:**
   - Monitor state regulations
   - Maintain legal counsel
   - Update terms as needed

3. **Technical Issues:**
   - Comprehensive testing
   - Beta program
   - Rollback plan

4. **User Adoption:**
   - Clear onboarding
   - Educational content
   - Support system

---

## Budget Summary

**One-Time Costs:**
- Apple Developer: $99/year
- Google Play: $25 one-time
- Legal Review: $5,000-$15,000
- Development: Custom quote

**Ongoing Costs:**
- Stripe Processing: 2.9% + $0.30 per transaction
- Stripe Issuing: $0.10 per card + $0.05 per transaction
- KYC/AML: $0.50-$1.50 per user
- SMS: ~$0.0075 per message
- Email: Free tier available

---

**Status:** Ready for Implementation
**Timeline:** 3 Months (Accelerated)
**Priority:** HIGH

