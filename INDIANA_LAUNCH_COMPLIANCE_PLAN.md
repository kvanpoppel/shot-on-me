# Indiana Launch - Security, Compliance & Legal Structure

**Comprehensive Plan for Indiana-Only Launch with State Restrictions**

---

## Executive Summary

This document addresses:
1. **Geographic restrictions** - Preventing out-of-state users from using the platform
2. **Venue approval process** - Managing venue applications with state compliance
3. **Escrow account structure** - Legal implications of holding funds in business account
4. **Security measures** - Protecting against unauthorized transactions
5. **Compliance framework** - Operating legally in Indiana only

---

## 1. GEOGRAPHIC RESTRICTIONS - PREVENTING OUT-OF-STATE USERS

### The Legal Requirement

**CRITICAL:** If you only have an Indiana money transmitter license, you **CANNOT** legally:
- Accept payments from users in other states
- Process transactions for users in other states
- Allow venues in other states to accept payments

**Operating outside your licensed state = Fines, shutdown, potential criminal penalties**

### Technical Implementation Strategy

#### A. User Registration Restrictions

**1. Phone Number Verification**
- Verify phone number area code matches Indiana (317, 463, 765, 812, 930)
- Block registration if area code is not Indiana
- **Limitation:** Users can have out-of-state area codes but live in Indiana
- **Solution:** Combine with location verification

**2. Location-Based Verification (Recommended)**
- **On Registration:** Require GPS location check
- **Verify:** User's location is within Indiana state boundaries
- **Store:** User's registered location in database
- **Flag:** Users who register outside Indiana

**3. IP Address Verification**
- Check user's IP address on registration
- Verify IP geolocation matches Indiana
- **Limitation:** VPNs can bypass this
- **Solution:** Use as additional check, not primary

**4. Address Verification (KYC)**
- Require users to provide Indiana address
- Verify address using USPS or address validation service
- Store verified address in user profile
- **Best Practice:** Required for larger transactions

#### B. Transaction Restrictions

**1. Pre-Transaction Location Check**
- Before allowing money transfer, verify user's current location
- Check GPS coordinates are within Indiana
- Block transaction if user is outside Indiana
- **User Experience:** "This service is only available in Indiana"

**2. Recipient Location Verification**
- Verify recipient's location before allowing transfer
- Both sender and recipient must be in Indiana
- Block cross-state transfers

**3. Virtual Card Geographic Restrictions**
- Configure Stripe Issuing to restrict card usage to Indiana merchants
- Set merchant location restrictions
- Cards decline if used outside Indiana
- **Technical:** Stripe allows merchant location restrictions

#### C. Ongoing Monitoring

**1. Location Tracking**
- Periodically verify user's location (with consent)
- Flag users who consistently access from outside Indiana
- Review flagged accounts manually
- Suspend accounts that violate terms

**2. Transaction Pattern Analysis**
- Monitor for suspicious patterns
- Flag transactions that suggest out-of-state usage
- Review large transactions manually
- Implement fraud detection

**3. User Self-Reporting**
- Terms of Service: Users must notify if they move out of state
- Require address updates
- Suspend accounts of users who move

### Recommended Implementation

**Multi-Layer Approach:**

1. **Registration:** Phone area code + GPS location + IP address
2. **Each Transaction:** GPS location check (with user consent)
3. **Virtual Card:** Stripe merchant location restrictions
4. **Ongoing:** Periodic location verification + transaction monitoring

**User Experience:**
- Clear messaging: "Shot On Me is currently only available in Indiana"
- Explain why: "We're expanding to more states soon!"
- Provide waitlist for other states

---

## 2. VENUE APPROVAL PROCESS - STATE COMPLIANCE

### Current Venue Onboarding

**What You Need:**
- Application form for venues
- Approval workflow
- Notification system for you (as owner)
- State compliance checks
- Ability to approve/reject based on state regulations

### Recommended Venue Application Process

#### A. Application Form (Venue Portal)

**Required Information:**
1. **Business Information**
   - Business name
   - Legal entity name
   - Business type (LLC, Corp, Sole Proprietorship)
   - EIN or SSN
   - Business address (must be in Indiana)
   - Phone number
   - Email

2. **Location Verification**
   - Physical address
   - GPS coordinates
   - Verify address is in Indiana
   - Business license number (if required by Indiana)

3. **Business Details**
   - Type of venue (bar, restaurant, club, etc.)
   - Operating hours
   - Capacity
   - Years in business
   - Website/social media

4. **Financial Information**
   - Bank account information (for payouts)
   - Tax ID
   - Stripe account (if they have one)

5. **Compliance Documents**
   - Business license (upload)
   - Tax certificate (upload)
   - Proof of address (utility bill, lease, etc.)
   - Owner/manager identification

6. **Terms Acceptance**
   - Venue agreement
   - Commission structure acceptance
   - Terms of service
   - Privacy policy

#### B. Approval Workflow

**Step 1: Application Submission**
- Venue fills out application form
- System validates required fields
- System checks: Is address in Indiana?
- If out of state: Auto-reject with message "Currently only accepting Indiana venues"

**Step 2: Automatic Checks**
- Verify business address is in Indiana (geocoding)
- Check business license validity (if Indiana requires)
- Validate business information
- Run basic compliance checks

**Step 3: Owner Notification**
- **Email notification** to you when new application submitted
- Include: Venue name, location, business type, application status
- Link to review application in owner portal

**Step 4: Manual Review (Your Approval)**
- You review application in owner portal
- Check compliance with Indiana regulations
- Verify business legitimacy
- Review documents
- Approve or reject

**Step 5: Onboarding**
- If approved: Send welcome email
- Set up Stripe Connect account (if needed)
- Create venue profile
- Provide access to venue portal
- If rejected: Send rejection email with reason

#### C. Owner Portal - Application Management

**Dashboard Features:**
- **Pending Applications** - List of venues awaiting approval
- **Approved Venues** - Active venues
- **Rejected Venues** - Previously rejected (with reasons)
- **Application Details** - Full application view
- **Quick Actions** - Approve/Reject buttons
- **Filters** - By status, location, business type

**Notification System:**
- **Email Alerts** - When new application submitted
- **In-App Notifications** - In owner portal dashboard
- **SMS Alerts** (optional) - For urgent approvals

#### D. State Compliance Checks

**Indiana-Specific Requirements:**
1. **Business License** - Verify venue has valid Indiana business license
2. **Tax Registration** - Verify venue is registered with Indiana Department of Revenue
3. **Alcohol License** (if applicable) - Verify valid alcohol permit
4. **Health Permit** (if applicable) - For restaurants/food service
5. **Location Verification** - Confirm physical address is in Indiana

**Automated Checks:**
- Address geocoding (verify Indiana location)
- Business license lookup (if Indiana provides API)
- Tax ID validation
- Document verification

**Manual Review Required:**
- Business legitimacy
- Compliance with venue agreement
- Risk assessment
- Final approval decision

---

## 3. ESCROW ACCOUNT STRUCTURE - LEGAL IMPLICATIONS

### Your Proposed Structure

**How It Works:**
1. Users fund their wallets (money goes to your business account)
2. Users transfer money to each other (funds stay in your account)
3. Funds are held in escrow until redemption
4. When redeemed at venue, money transfers from your account to venue

**This is exactly the escrow model described in your business plan!**

### Legal Structure Analysis

#### A. Is This Legal? ✅ YES (with proper setup)

**Why It's Legal:**
- You're acting as an intermediary (money transmitter)
- Funds are held in escrow (common practice)
- Users agree to terms (no withdrawal to bank)
- You have Indiana money transmitter license (covers this)

**Legal Requirements:**
1. **Money Transmitter License** - Required (Indiana)
2. **Escrow Account** - Can use business account OR separate escrow account
3. **Terms of Service** - Must disclose escrow structure
4. **User Consent** - Users must agree to terms
5. **Record Keeping** - Track all transactions
6. **AML/KYC Compliance** - Required for money transmission

#### B. Account Structure Options

**Option 1: Single Business Account (Simpler)**
- All funds in one business checking account
- Track user balances in database
- Easier to manage
- **Risk:** Mixing operating funds with escrow funds
- **Legal:** Generally acceptable if properly tracked

**Option 2: Separate Escrow Account (Recommended)**
- Business operating account (for your expenses)
- Escrow account (for user funds only)
- Clear separation of funds
- **Benefit:** Easier to demonstrate compliance
- **Benefit:** Protects user funds if business has issues
- **Legal:** Preferred by regulators

**Recommendation:** Start with separate escrow account if possible

#### C. Legal Implications

**1. Fiduciary Duty**
- You have a duty to protect user funds
- Must maintain adequate reserves
- Cannot use escrow funds for business operations
- Must reconcile accounts regularly

**2. Regulatory Requirements**
- **FinCEN Registration** - Required (Money Services Business)
- **AML Program** - Required (Anti-Money Laundering)
- **KYC Requirements** - Know Your Customer (verify users)
- **Transaction Reporting** - Suspicious Activity Reports (SARs)
- **Record Keeping** - 5 years minimum

**3. Insurance Requirements**
- **Cyber Liability** - Protect against data breaches
- **Errors & Omissions** - Protect against mistakes
- **Fidelity Bond** - Protect against employee fraud
- **D&O Insurance** - If you have investors

**4. Tax Implications**
- Escrow funds are NOT your income (until redeemed)
- You pay taxes on transaction fees and commissions
- Must track escrow funds separately for tax purposes
- May need to file 1099 forms for venues

**5. Bankruptcy Protection**
- If you go bankrupt, escrow funds should be protected
- Separate escrow account helps protect user funds
- Users may have claims to their escrow balances

#### D. Compliance Best Practices

**1. Account Reconciliation**
- Daily reconciliation of escrow account
- Match database balances to account balance
- Investigate discrepancies immediately
- Maintain audit trail

**2. Reserve Requirements**
- Maintain reserves equal to user balances
- Cannot use escrow funds for operations
- Regular reserve audits
- Compliance reporting

**3. User Transparency**
- Clear disclosure of escrow structure
- Show user balances in app
- Provide transaction history
- Explain redemption process

**4. Record Keeping**
- All transactions recorded
- User identification documents
- Compliance reports
- Audit trail maintained

---

## 4. SECURITY MEASURES - PROTECTING AGAINST UNAUTHORIZED TRANSACTIONS

### Multi-Layer Security Approach

#### A. User Authentication

**1. Account Security**
- Strong password requirements
- Two-factor authentication (2FA) - Recommended
- Email verification
- Phone verification (SMS)
- Biometric authentication (mobile devices)

**2. Session Management**
- Secure session tokens
- Session timeout
- Device tracking
- Login notifications

**3. Identity Verification (KYC)**
- Verify user identity for larger transactions
- Document verification (driver's license, etc.)
- Address verification
- Phone number verification

#### B. Transaction Security

**1. Pre-Transaction Checks**
- Verify user location (Indiana only)
- Check account balance
- Verify recipient exists and is in Indiana
- Transaction limits (daily/monthly)

**2. Fraud Detection**
- Pattern analysis (unusual transactions)
- Velocity checks (too many transactions)
- Amount checks (unusually large)
- Location checks (sudden location change)

**3. Transaction Limits**
- **Unverified Users:** $500/day, $2,000/month
- **Verified Users:** Higher limits (set based on KYC)
- **Large Transactions:** Manual review required
- **Suspicious Activity:** Auto-flag for review

#### C. Geographic Restrictions

**1. Registration Restrictions**
- Block out-of-state registrations
- Verify location on signup
- Store user's registered location

**2. Transaction Restrictions**
- Verify location before each transaction
- Block cross-state transfers
- Restrict virtual card usage to Indiana

**3. Ongoing Monitoring**
- Track user locations
- Flag location changes
- Review flagged accounts
- Suspend violating accounts

#### D. Virtual Card Security

**1. Card Restrictions (Stripe Issuing)**
- Merchant location restrictions (Indiana only)
- Merchant category restrictions (venues only)
- Spending limits (wallet balance)
- Transaction monitoring

**2. Card Controls**
- Real-time authorization
- Fraud detection
- Suspicious transaction blocking
- Card freeze capability

---

## 5. COMPLIANCE FRAMEWORK - INDIANA OPERATIONS

### Indiana Money Transmitter License

**Requirements:**
- Application fee: ~$1,000-$5,000
- Net worth: ~$100,000 minimum
- Surety bond: ~$50,000-$500,000
- Background checks
- Business plan
- Compliance program

**Timeline:** 3-6 months for approval

### Ongoing Compliance

**1. Reporting Requirements**
- Annual reports to Indiana
- Transaction reporting (if required)
- Compliance audits
- License renewals

**2. AML/KYC Program**
- Written AML policy
- Customer identification
- Transaction monitoring
- Suspicious activity reporting

**3. Record Keeping**
- All transactions (5 years minimum)
- User identification documents
- Compliance reports
- Audit trail

**4. Regular Audits**
- Internal compliance reviews
- External audits (if required)
- Regulatory examinations
- Security audits

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Pre-Launch (Months 1-3)

**Legal/Compliance:**
- [ ] Form LLC in Indiana
- [ ] Apply for Indiana money transmitter license
- [ ] Set up escrow account (separate from operating)
- [ ] Draft Terms of Service (include escrow disclosure)
- [ ] Draft Privacy Policy
- [ ] Implement AML/KYC program
- [ ] Get basic insurance

**Technical:**
- [ ] Implement location verification (registration)
- [ ] Implement location checks (transactions)
- [ ] Set up virtual card restrictions (Indiana only)
- [ ] Build venue application form
- [ ] Build owner portal (application management)
- [ ] Set up notification system
- [ ] Implement fraud detection

### Phase 2: Launch (Month 4)

**Soft Launch:**
- [ ] Launch in Indiana only
- [ ] Onboard first 10-20 venues (manually)
- [ ] Invite first 100-500 users (friends, family)
- [ ] Monitor transactions closely
- [ ] Review all applications manually

**Compliance:**
- [ ] Daily account reconciliation
- [ ] Transaction monitoring
- [ ] Location verification checks
- [ ] Fraud detection monitoring

### Phase 3: Scale (Months 5-12)

**As Revenue Grows:**
- [ ] Automate more processes
- [ ] Add more venues (with approval process)
- [ ] Scale user base
- [ ] Enhance security measures
- [ ] Prepare for additional states

---

## 7. KEY LEGAL CONSIDERATIONS

### What You MUST Do

1. **Get Indiana Money Transmitter License** - Cannot operate without it
2. **Separate Escrow Account** - Recommended (protects users and you)
3. **Clear Terms of Service** - Disclose escrow structure, no withdrawal policy
4. **AML/KYC Program** - Required by FinCEN
5. **Location Restrictions** - Enforce Indiana-only usage
6. **Venue Approval Process** - Only approve Indiana venues
7. **Record Keeping** - Maintain all transaction records
8. **Insurance** - Protect against breaches and errors

### What You CANNOT Do

1. **Accept Out-of-State Users** - Without additional state licenses
2. **Accept Out-of-State Venues** - Without additional state licenses
3. **Use Escrow Funds for Operations** - Must keep separate
4. **Skip AML/KYC** - Required by law
5. **Operate Without License** - Criminal penalties

### Risk Mitigation

**If You Make a Mistake:**
- **Out-of-state user slips through:** 
  - Refund transaction
  - Suspend account
  - Review and fix security gap
  - Document incident

- **Out-of-state venue approved:**
  - Revoke approval immediately
  - Refund any transactions
  - Review approval process
  - Document incident

**Best Practice:** Have attorney review your compliance program before launch

---

## 8. RECOMMENDED NEXT STEPS

### Immediate (This Week)

1. **Consult Indiana Attorney** - Understand state-specific requirements
2. **Research Indiana License** - Get exact costs and requirements
3. **Design Venue Application** - Plan the form and workflow
4. **Plan Location Verification** - Technical approach

### Short-Term (This Month)

1. **Form LLC** - Indiana entity
2. **Apply for License** - Start application process
3. **Set Up Escrow Account** - Separate from operating
4. **Draft Legal Documents** - ToS, Privacy Policy, Venue Agreement

### Medium-Term (Months 1-3)

1. **Build Compliance Features** - Location checks, venue approval
2. **Implement Security** - Fraud detection, transaction limits
3. **Test System** - Ensure restrictions work
4. **Prepare for Launch** - Final compliance review

---

## 9. SUMMARY

### Your Questions Answered

**Q: How to secure against external users attempting money transfers?**
**A:** Multi-layer approach:
- Location verification on registration
- Location check before each transaction
- Virtual card restrictions (Indiana merchants only)
- Ongoing monitoring and flagging

**Q: Venue approval process with notifications?**
**A:** Yes, implement:
- Application form in venue portal
- Email notifications to you
- Owner portal for review/approval
- State compliance checks (Indiana only)

**Q: Escrow account structure legal?**
**A:** Yes, with proper setup:
- Separate escrow account (recommended)
- Indiana money transmitter license
- Clear Terms of Service
- AML/KYC compliance
- Proper record keeping

### The Bottom Line

**Your structure is legally sound IF:**
1. ✅ You get Indiana money transmitter license
2. ✅ You enforce Indiana-only restrictions
3. ✅ You maintain separate escrow account
4. ✅ You implement proper compliance (AML/KYC)
5. ✅ You have clear legal documents

**You can absolutely launch in Indiana with this structure!**

The key is implementing the geographic restrictions properly and maintaining compliance. Your escrow model is standard practice for money transmitters.

---

*This plan assumes you will implement the technical features described. Consult with your attorney before launching to ensure full compliance with Indiana regulations.*



