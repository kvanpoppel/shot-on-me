# Indiana Money Transmitter License Application - Response Guide

**Analysis and Response Strategy for Regulatory Questions**

---

## OVERVIEW

These questions are from the **Indiana Money Transmitter License application**. They're designed to understand your business model, especially if you handle virtual currency. However, **your business is fiat currency only**, which simplifies many responses.

---

## KEY POINT: YOUR BUSINESS MODEL

**What You Do:**
- ✅ Fiat currency only (U.S. dollars)
- ✅ No virtual currency
- ✅ No loans
- ✅ No interest payments
- ✅ No native tokens
- ✅ Simple escrow model

**This means many questions don't apply, but you must state that clearly.**

---

## QUESTION-BY-QUESTION ANALYSIS

### QUESTION 1: Flow of Funds Diagram

**What They're Asking:**
- Detailed diagram showing how money moves through your system
- Whether customer funds are commingled or segregated
- Who controls the money at each stage
- Account structure and ownership

**Your Response Strategy:**

**a. Flow of Funds Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│                    FLOW OF FUNDS DIAGRAM                     │
│                    Shot On Me Platform                       │
└─────────────────────────────────────────────────────────────┘

1. USER ADDS FUNDS
   User → Credit/Debit Card (Stripe) → Shot On Me Escrow Account
   [Customer funds deposited into escrow account]

2. USER SENDS MONEY TO FRIEND
   User A Wallet → Database Entry → User B Wallet
   [NO MONEY MOVES - funds remain in escrow account]
   [Only database balances updated]

3. USER SPENDS AT VENUE
   User Wallet → Virtual Card (Stripe Issuing) → Venue Account
   [Money moves from escrow account to venue via Stripe]
```

**Detailed Explanation:**

**i. Identity of Person/Entity Directing Movement:**
- **Shot On Me LLC** (your company) directs all fund movements
- Automated system processes transactions based on user actions

**ii. Mechanism to Move Funds:**
- **Stripe Payment Processing:** For user funding (credit/debit cards)
- **Stripe Issuing:** For virtual card transactions at venues
- **Automated API:** Processes transactions based on user actions
- **Manual Review:** For large transactions or suspicious activity

**iii. Entities Through Which Funds Flow:**
- **Stripe, Inc.** (Payment Processor)
  - Address: 510 Townsend Street, San Francisco, CA 94103
  - Role: Processes card payments, issues virtual cards
- **Shot On Me Escrow Account** (Your Business Account)
  - Bank: [Your Bank Name]
  - Address: [Bank Address]
  - Account Type: Business Checking Account (Escrow)
  - Account Title: Shot On Me LLC Escrow Account
- **Venue Accounts** (Via Stripe Connect)
  - Processed through Stripe Connect
  - Funds transferred to venue's connected account

**iv. Account Structure and Reconciliation:**
- **Account Title:** Shot On Me LLC Escrow Account
- **Account Type:** Business Checking Account
- **Structure:** Single escrow account holding all customer funds
- **Reconciliation:** Daily reconciliation of:
  - Account balance vs. total user wallet balances
  - Transaction logs vs. account activity
  - Venue payouts vs. redemptions

**v. Ownership and Control:**
- **Individual Accounts/Wallets:** 
  - Users have virtual wallets (database entries, not actual accounts)
  - No individual bank accounts per user
  - All funds held in single escrow account
- **Assets Held:**
  - All customer funds held in Shot On Me LLC Escrow Account
  - Account owned and controlled by Shot On Me LLC
- **Private Keys/Addresses:**
  - Not applicable (fiat currency, not virtual currency)
  - No private keys or blockchain addresses

**vi. Liability for Funds:**
- **At All Stages:** Shot On Me LLC is liable for customer funds
- **During Escrow:** Shot On Me LLC holds funds in trust
- **During Transfer:** Shot On Me LLC facilitates transfer
- **At Venue:** Shot On Me LLC pays venue, then customer receives goods/services

**vii. Virtual Currency Valuation:**
- **Not Applicable:** Shot On Me does not handle virtual currency
- All transactions are in U.S. dollars (fiat currency)

**viii. Triggers for Additional Funds/Limitations:**
- **Additional Funds Required:** None
- **Limitation on Access:** 
  - Suspicious activity detected
  - Compliance review required
  - Account under investigation
  - Terms of Service violation
- **Unpegging of Stablecoin:** Not applicable (no virtual currency)

**ix. Flow of Funds During Triggers:**
- **Suspicious Activity:** Funds frozen in escrow, investigation conducted
- **Compliance Review:** Funds held in escrow pending review
- **Account Suspension:** Funds remain in escrow, access restricted
- **Resolution:** Funds released or refunded based on investigation outcome

---

### QUESTION 1b: Consumer Agreements

**What They're Asking:**
- Copies of all consumer agreements
- All versions and amendments
- Explanations of changes

**Your Response:**
- **Terms of Service** (to be drafted with attorney)
- **Privacy Policy** (to be drafted with attorney)
- **User Agreement** (to be drafted with attorney)
- **Venue Agreement** (separate, for venues)

**Note:** You'll need to draft these with your attorney. Include:
- Escrow structure disclosure
- No withdrawal policy (venue-only spending)
- Geographic restrictions (Indiana only)
- Transaction fees
- Refund policy
- Dispute resolution

---

### QUESTION 1c: Virtual Currency Custodians

**Your Response:**
- **Not Applicable:** Shot On Me does not handle virtual currency
- All transactions are in U.S. dollars (fiat currency)
- No virtual currency custodians used

---

### QUESTION 1d: Custodian Agreements

**Your Response:**
- **Not Applicable:** No virtual currency custodians

---

### QUESTION 1e: Advertisements

**What They're Asking:**
- Copies of all advertisements directed at Indiana consumers

**Your Response:**
- **Current Status:** No advertisements yet (pre-launch)
- **Future Advertisements:** Will comply with Indiana regulations
- **Types of Advertisements:**
  - Social media posts
  - Website content
  - Print materials
  - Radio/TV (if applicable)
- **Compliance:** All advertisements will:
  - Clearly state Indiana-only availability
  - Disclose transaction fees
  - Include required disclosures
  - Comply with Indiana regulations

---

### QUESTION 1f: Securities Regulator Communications

**Your Response:**
- **No Communications:** Shot On Me has not communicated with securities regulators
- **No Regulatory Actions:** No past or ongoing actions
- **No Civil Complaints:** No complaints filed
- **Reason:** Business model does not involve securities

---

### QUESTION 1g: Risk Mitigation Policies for Fiat Currency

**Your Response:**

**Policies in Place:**

1. **Segregation of Funds:**
   - Customer funds held in separate escrow account
   - Not commingled with operating funds
   - Daily reconciliation

2. **Reserve Requirements:**
   - Maintain reserves equal to total customer balances
   - Regular reserve audits
   - Compliance with state requirements

3. **Account Security:**
   - Multi-factor authentication
   - Encryption of data
   - Regular security audits
   - Fraud detection systems

4. **Transaction Monitoring:**
   - Real-time transaction monitoring
   - Suspicious activity detection
   - Automated alerts
   - Manual review for large transactions

5. **Compliance Program:**
   - AML/KYC procedures
   - Transaction limits
   - Record keeping
   - Regular compliance reviews

6. **Insurance:**
   - Cyber liability insurance
   - Errors & omissions insurance
   - Fidelity bond (if required)

---

### QUESTION 1h: Insolvency Risks and FDIC Insurance

**Your Response:**

**Assessed Insolvency Risks:**
- Low risk due to:
  - Escrow model (funds held separately)
  - Transaction-based revenue (ongoing income)
  - Low overhead (lean operations)
  - No debt or leverage

**Policies to Mitigate Risks:**
- Maintain adequate reserves
- Regular financial monitoring
- Conservative financial management
- No use of customer funds for operations
- Separate escrow account

**FDIC Insurance:**
- **Customer Funds:** Not FDIC insured
- **Disclosure:** Clearly stated in Terms of Service
- **Account Level:** Escrow account may be FDIC insured at account level (up to $250,000)
- **Per-User:** Not FDIC insured per user
- **Communication:** Clear disclosure to customers that funds are not FDIC insured per user

---

### QUESTION 1i: FDIC Insurance Statement

**Your Response:**

**Fiat Currency Storage:**
- Shot On Me stores fiat currency (U.S. dollars) on behalf of customers
- Funds held in Shot On Me LLC Escrow Account at [Bank Name]

**FDIC Insurance Coverage:**
- **Account Level:** Escrow account may be FDIC insured up to $250,000 per account
- **Per-User:** Customer funds are NOT FDIC insured per user
- **Disclosure:** Clearly communicated in Terms of Service
- **Risk:** If total customer funds exceed $250,000, excess funds are not FDIC insured

**Recommendation:** Consider multiple accounts or other protection mechanisms if funds exceed $250,000

---

### QUESTION 2: Loans with Virtual Currency Collateral

**Your Response:**
- **Not Applicable:** Shot On Me does not offer loans
- **No Virtual Currency:** Shot On Me does not handle virtual currency
- **No Collateral:** No loan products offered

---

### QUESTION 3: Interest-Bearing Products

**Your Response:**
- **Not Applicable:** Shot On Me does not offer interest-bearing products
- **No Interest Payments:** Customers do not earn interest on funds
- **No Deposits:** Funds are held in escrow, not deposited accounts
- **No Hypothecation:** Customer funds are not hypothecated or rehypothecated

---

### QUESTION 4: Native/Wrapped Tokens

**Your Response:**
- **Not Applicable:** Shot On Me does not offer native or wrapped tokens
- **No Tokens:** No token products or services
- **No Valuation:** No token valuation required
- **No Accounting:** No tokens in net worth calculation

---

### QUESTION 5: Off-Balance Sheet Items

**Your Response:**

**Current Status:** Pre-launch, no financial statements yet

**Once Operational:**
- **Off-Balance Sheet Items:** None anticipated
- **All Assets/Liabilities:** Will be recorded on balance sheet
- **Escrow Funds:** Will be recorded as liability (customer funds held in trust)
- **Reserves:** Will be recorded as assets

**Future Reporting:**
- Will provide audited financial statements
- Will disclose all off-balance sheet items (if any)
- Will comply with accounting standards

---

### QUESTION 6: Risk Assessment Document

**What They're Asking:**
- Comprehensive risk assessment
- How you'll mitigate each risk
- Must address: compliance, IT, AML, global, financial, legal risks

**Your Response Structure:**

**1. Compliance Risk:**
- **Risk:** Non-compliance with money transmitter regulations
- **Mitigation:**
  - Experienced legal counsel
  - Compliance program
  - Regular compliance reviews
  - Staff training
  - Regulatory monitoring

**2. IT Risk:**
- **Risk:** System failures, security breaches, data loss
- **Mitigation:**
  - Redundant systems
  - Regular backups
  - Security audits
  - Encryption
  - Monitoring and alerting
  - Incident response plan

**3. AML Risk:**
- **Risk:** Money laundering, terrorist financing
- **Mitigation:**
  - AML compliance program
  - KYC procedures
  - Transaction monitoring
  - Suspicious activity reporting
  - Staff training
  - Regular audits

**4. Global Risk:**
- **Risk:** Operating in multiple jurisdictions (future)
- **Mitigation:**
  - Start in Indiana only
  - Geographic restrictions
  - Location verification
  - State-by-state licensing
  - Compliance with each state's regulations

**5. Financial Risk:**
- **Risk:** Insolvency, insufficient reserves, fraud
- **Mitigation:**
  - Adequate reserves
  - Separate escrow account
  - Regular financial monitoring
  - Fraud detection
  - Insurance coverage
  - Conservative financial management

**6. Legal Risk:**
- **Risk:** Lawsuits, regulatory actions, disputes
- **Mitigation:**
  - Clear Terms of Service
  - Proper disclosures
  - Legal counsel
  - Dispute resolution procedures
  - Insurance coverage
  - Compliance with regulations

---

## SUMMARY: WHAT YOU NEED TO PREPARE

### Documents to Create:

1. **Flow of Funds Diagram** (visual + written explanation)
2. **Terms of Service** (with attorney)
3. **Privacy Policy** (with attorney)
4. **User Agreement** (with attorney)
5. **Risk Assessment Document** (comprehensive)
6. **Account Structure Documentation**
7. **Reconciliation Procedures**
8. **Compliance Program Documentation**

### Information to Gather:

1. **Bank Account Details:**
   - Bank name and address
   - Account number (may not need to disclose)
   - Account type and title
   - FDIC insurance status

2. **Stripe Information:**
   - Stripe account details
   - Stripe Issuing information
   - Stripe Connect setup

3. **Financial Information:**
   - Initial capital
   - Reserve requirements
   - Financial projections

4. **Compliance Information:**
   - AML/KYC procedures
   - Transaction monitoring procedures
   - Record keeping procedures

---

## RECOMMENDATIONS

### 1. Work with Attorney

**Critical:** These questions require legal expertise. Work with your attorney to:
- Draft proper responses
- Create required documents
- Ensure compliance
- Review all disclosures

### 2. Create Flow of Funds Diagram

**Visual Diagram:**
- Use flowchart software (Visio, Lucidchart, draw.io)
- Show all money movements
- Label all entities
- Include account details

**Written Explanation:**
- Detailed explanation of each step
- Who controls funds at each stage
- How funds are moved
- Account structure

### 3. Draft Required Documents

**With Attorney:**
- Terms of Service
- Privacy Policy
- User Agreement
- Venue Agreement

**Key Disclosures:**
- Escrow structure
- No withdrawal policy
- Geographic restrictions
- Transaction fees
- FDIC insurance status
- Risk disclosures

### 4. Create Risk Assessment Document

**Comprehensive Document:**
- Identify all risks
- Assess probability and impact
- Describe mitigation strategies
- Include policies and procedures

**Required Risks:**
- Compliance risk
- IT risk
- AML risk
- Global risk
- Financial risk
- Legal risk

### 5. Prepare Account Documentation

**Account Structure:**
- Bank name and address
- Account type and title
- FDIC insurance information
- Reconciliation procedures
- Reserve requirements

---

## KEY TAKEAWAYS

### What Applies to You:
- ✅ Flow of funds diagram (fiat currency)
- ✅ Consumer agreements
- ✅ Risk mitigation policies
- ✅ FDIC insurance disclosure
- ✅ Risk assessment document
- ✅ Account structure documentation

### What Doesn't Apply:
- ❌ Virtual currency custodians (you don't handle VC)
- ❌ Loans with VC collateral (you don't offer loans)
- ❌ Interest-bearing products (you don't offer interest)
- ❌ Native/wrapped tokens (you don't have tokens)
- ❌ Securities regulator communications (not applicable)

### Critical Points:
1. **Clearly state:** "Not applicable - fiat currency only"
2. **Be specific:** Provide detailed information where required
3. **Work with attorney:** These are legal documents
4. **Be transparent:** Full disclosure is required
5. **Document everything:** Keep records of all procedures

---

## NEXT STEPS

1. **Review with Attorney:** Go through each question with your attorney
2. **Create Flow Diagram:** Visual representation of money flow
3. **Draft Documents:** Terms of Service, Privacy Policy, etc.
4. **Risk Assessment:** Comprehensive risk document
5. **Gather Information:** Bank details, account structure, etc.
6. **Prepare Responses:** Answer each question thoroughly
7. **Review and Submit:** Final review before submission

---

*This guide helps you understand what's being asked. Work with your attorney to prepare the actual responses and documents.*

