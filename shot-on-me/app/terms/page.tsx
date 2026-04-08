export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-primary-400 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-500">Terms of Service</h1>
          <p className="text-sm text-primary-400/80 mt-1">Last updated: March 24, 2026</p>
          <p className="text-sm mt-3">
            Please read these Terms of Service ("Terms") carefully before using the Shot On Me mobile application and
            related services ("Service") operated by Shot On Me LLC ("Company," "we," "us," or "our"). By creating an
            account or using the Service, you agree to be bound by these Terms.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">1. Eligibility</h2>
          <p className="text-sm">
            You must be at least 18 years of age and a resident of the United States to use Shot On Me. By using the
            Service, you represent and warrant that you meet these requirements. Accounts created on behalf of minors
            will be terminated immediately.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">2. Account Registration</h2>
          <p className="text-sm">
            You agree to provide accurate, current, and complete information when creating an account. You are
            responsible for maintaining the security of your account credentials and for all activity that occurs under
            your account. You must notify us immediately at support@shotonme.com of any unauthorized use. We reserve
            the right to suspend or terminate accounts that contain false or misleading information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">3. Payment Services</h2>
          <p className="text-sm">
            Shot On Me enables peer-to-peer money transfers and venue payments through a digital wallet. Payment
            processing is facilitated by Stripe, Inc. By using our payment features, you also agree to{' '}
            <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">Stripe's Terms of Service</a>.
          </p>
          <ul className="text-sm list-disc pl-5 space-y-1 mt-2">
            <li>Maximum single transaction: $500.00</li>
            <li>Platform fees: $0.25 flat for transactions under $20; 1% for transactions of $20 or more</li>
            <li>Wallet funds are stored as a balance — they are not a bank account and are not FDIC insured</li>
            <li>Payments are generally processed immediately but may be subject to review delays</li>
            <li>All transactions are final unless a refund is requested within 24 hours of the transaction</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-primary-500">4. Refund Policy</h2>
          <p className="text-sm">
            We want every transaction on Shot On Me to be fair and transparent. Please read this Refund Policy
            carefully before sending or receiving payments.
          </p>

          <h3 className="text-sm font-semibold text-primary-400">4a. Wallet-to-Wallet Payments</h3>
          <p className="text-sm">
            Payments sent between Shot On Me wallets may be eligible for a refund if requested within <strong>24 hours</strong> of
            the transaction, provided the recipient has sufficient wallet balance to cover the reversal. After 24 hours,
            wallet-to-wallet payments are final.
          </p>
          <p className="text-sm">
            To request a refund: go to <em>Wallet → Transaction History</em>, select the payment, and tap <em>Request Refund</em>.
            You may also email <a href="mailto:support@shotonme.com" className="text-primary-500 underline">support@shotonme.com</a> with your
            transaction ID and the reason for your request. Refund requests are reviewed within 1–2 business days.
          </p>

          <h3 className="text-sm font-semibold text-primary-400">4b. Tap-and-Pay Venue Transactions</h3>
          <p className="text-sm">
            Payments processed at a venue terminal via Tap-and-Pay are <strong>final and non-refundable</strong> once
            the transaction is confirmed. If you believe a venue transaction was unauthorized or erroneous, contact us
            within 7 days at <a href="mailto:support@shotonme.com" className="text-primary-500 underline">support@shotonme.com</a>. We
            will investigate and, if the transaction is found to be in error, issue a credit to your Shot On Me wallet.
          </p>

          <h3 className="text-sm font-semibold text-primary-400">4c. Wallet Top-Ups (Credit / Debit Card Charges)</h3>
          <p className="text-sm">
            Funds added to your Shot On Me wallet via credit or debit card are processed by Stripe, Inc. and are
            generally <strong>non-refundable</strong> to the original card once credited to your wallet. If you believe
            a card charge was unauthorized, contact us immediately at{' '}
            <a href="mailto:support@shotonme.com" className="text-primary-500 underline">support@shotonme.com</a> and we will work
            with Stripe to investigate. Fraudulent charge claims may also be raised directly with your card issuer.
          </p>

          <h3 className="text-sm font-semibold text-primary-400">4d. Pending Payments — Automatic Refund</h3>
          <p className="text-sm">
            Payments sent to a phone number or email not yet registered on Shot On Me are held as pending for up to
            30 days. If the recipient does not register within 30 days, the full amount is automatically refunded to the
            sender's Shot On Me wallet with no action required.
          </p>

          <h3 className="text-sm font-semibold text-primary-400">4e. Account Termination</h3>
          <p className="text-sm">
            If your account is terminated by you or by Shot On Me for any reason, your remaining wallet balance will
            be refunded to a verified payment method on file within 5–10 business days, subject to any outstanding
            holds, unresolved disputes, or legal requirements.
          </p>

          <h3 className="text-sm font-semibold text-primary-400">4f. Platform Fees</h3>
          <p className="text-sm">
            Platform service fees charged on transactions are <strong>non-refundable</strong>, including in cases where
            the underlying payment is refunded.
          </p>

          <h3 className="text-sm font-semibold text-primary-400">4g. Disputes</h3>
          <p className="text-sm">
            If you have a dispute regarding a transaction, contact us at{' '}
            <a href="mailto:support@shotonme.com" className="text-primary-500 underline">support@shotonme.com</a>{' '}
            within 30 days of the transaction date. Include your name, account email, transaction ID, amount, and a
            description of the issue. We will respond within 5 business days. Unresolved disputes are subject to the
            arbitration provisions in Section 13.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">5. Pending Payments</h2>
          <p className="text-sm">
            Payments sent to a phone number not yet registered on Shot On Me will be held as a pending payment for up
            to 30 days. If the recipient does not register within 30 days, the full amount will be automatically
            refunded to the sender's wallet. We are not responsible for delays in recipient registration.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">6. Virtual Card</h2>
          <p className="text-sm">
            Shot On Me may issue a virtual Visa or Mastercard ("Virtual Card") through Stripe Issuing for eligible
            users. The Virtual Card is linked to your Shot On Me wallet balance. Use of the Virtual Card is subject to
            applicable spending limits and to{' '}
            <a href="https://stripe.com/issuing/card-holder-agreement" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">Stripe's Cardholder Agreement</a>.
            The Virtual Card is not a credit card. You may only spend what is available in your wallet.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">7. Money Transmission Disclosure</h2>
          <p className="text-sm">
            Shot On Me is not a bank and does not hold a money transmitter license. Payment processing and money
            movement services are provided by Stripe Payments Company, a licensed money transmitter. Funds held in
            your Shot On Me wallet are stored through Stripe and are subject to Stripe's terms. Shot On Me does not
            guarantee the availability of funds in the event of Stripe service disruption.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">8. Prohibited Uses</h2>
          <p className="text-sm">You agree not to use Shot On Me to:</p>
          <ul className="text-sm list-disc pl-5 space-y-1 mt-2">
            <li>Engage in money laundering, fraud, or any illegal financial activity</li>
            <li>Send payments for illegal goods or services</li>
            <li>Violate any applicable laws, including anti-money laundering (AML) and know-your-customer (KYC) regulations</li>
            <li>Attempt to circumvent transaction limits or security measures</li>
            <li>Use another person's account without authorization</li>
            <li>Reverse engineer, scrape, or otherwise misuse our platform</li>
          </ul>
          <p className="text-sm mt-2">
            We reserve the right to freeze or terminate accounts and report suspicious activity to applicable
            authorities, including FinCEN, as required by law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">9. Venue Promotions</h2>
          <p className="text-sm">
            Promotions offered by venues through Shot On Me are provided by the venue and not by Shot On Me LLC.
            We make no representations regarding the accuracy, availability, or quality of any venue promotion.
            Venues are solely responsible for honoring their promotions. Disputes regarding promotions should be
            directed to the venue.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">10. Intellectual Property</h2>
          <p className="text-sm">
            All content, trademarks, logos, and software comprising Shot On Me are owned by Shot On Me LLC or its
            licensors. You are granted a limited, non-exclusive, non-transferable license to use the Service for
            personal, non-commercial purposes. You may not reproduce, distribute, or create derivative works without
            our express written permission.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">11. Limitation of Liability</h2>
          <p className="text-sm">
            To the maximum extent permitted by applicable law, Shot On Me LLC shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages, including but not limited to loss of funds,
            data, or profits, arising out of or related to your use of the Service. Our total liability to you for
            any claim shall not exceed the amount you paid to us in the 12 months preceding the claim.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">12. Disclaimer of Warranties</h2>
          <p className="text-sm">
            The Service is provided "as is" and "as available" without warranties of any kind, either express or
            implied. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or
            harmful components.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">13. Dispute Resolution & Arbitration</h2>
          <p className="text-sm">
            Any dispute arising from these Terms or your use of the Service shall be resolved by binding arbitration
            administered by the American Arbitration Association under its Consumer Arbitration Rules, rather than
            in court, except that either party may seek injunctive relief in court for infringement of intellectual
            property rights. <strong className="text-primary-500">YOU WAIVE YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.</strong>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">14. Governing Law</h2>
          <p className="text-sm">
            These Terms shall be governed by the laws of the State of Indiana, without regard to its conflict of law
            principles. To the extent court proceedings are permitted, the parties consent to exclusive jurisdiction
            in the courts of Marion County, Indiana.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">15. Termination</h2>
          <p className="text-sm">
            We may suspend or terminate your account at any time for violation of these Terms or for any other reason
            at our sole discretion. Upon termination, your wallet balance will be refunded to a verified payment
            method on file, subject to any outstanding obligations or legal holds.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">16. Electronic Consent (E-Sign)</h2>
          <p className="text-sm">
            By creating an account, you consent to receive communications from us electronically, including via
            email and SMS. You agree that electronic agreements, notices, and records satisfy any legal requirement
            that such communications be in writing.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">17. Changes to Terms</h2>
          <p className="text-sm">
            We reserve the right to update these Terms at any time. We will notify you of material changes via
            email or in-app notification. Continued use of the Service after changes constitutes acceptance of the
            revised Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">18. Contact</h2>
          <p className="text-sm">
            For questions about these Terms, contact us at:{' '}
            <a href="mailto:legal@shotonme.com" className="text-primary-500 underline">legal@shotonme.com</a>
            <br />Shot On Me LLC, Indianapolis, Indiana
          </p>
        </section>
      </div>
    </main>
  )
}
