export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-primary-400 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-500">Venue Portal Privacy Policy</h1>
          <p className="text-sm text-primary-400/60 mt-1">Last updated: June 4, 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">1. Who We Are</h2>
          <p className="text-sm leading-relaxed">
            Shot On Me LLC operates the Venue Portal at venues.shotonme.com. This Privacy Policy explains how we
            collect, use, and protect information related to venue operators, their staff, and venue-level data
            processed through the portal. For user-facing privacy practices on the Shot On Me consumer app,
            see our main Privacy Policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">2. Information We Collect</h2>
          <p className="text-sm leading-relaxed">We collect the following categories of information:</p>
          <ul className="text-sm space-y-1.5 ml-4 mt-2 list-disc list-outside leading-relaxed">
            <li><strong className="text-white">Account information:</strong> Name, email, phone number, business name, and role of the venue operator and staff accounts.</li>
            <li><strong className="text-white">Venue data:</strong> Venue name, address, photos, category, hours, and descriptions you provide.</li>
            <li><strong className="text-white">Transaction data:</strong> Records of shots, gifts, and payments processed at your venue, including amounts, timestamps, and anonymized customer data.</li>
            <li><strong className="text-white">Analytics data:</strong> Aggregated foot traffic, engagement rates, promotion performance, and trend data derived from customer activity at your venue.</li>
            <li><strong className="text-white">Financial data:</strong> Bank account details for payouts (processed via Stripe), payout history, and fee records. We do not store full bank account numbers.</li>
            <li><strong className="text-white">Usage data:</strong> Pages visited, features used, session timestamps, and browser/device information when you use the portal.</li>
            <li><strong className="text-white">AI interaction data:</strong> Promotion inputs, AI suggestions generated, and automation settings you configure.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">3. How We Use Your Information</h2>
          <ul className="text-sm space-y-1.5 ml-4 mt-2 list-disc list-outside leading-relaxed">
            <li>Provide and operate the Venue Portal, including analytics dashboards and AI tools.</li>
            <li>Process payouts to your connected bank account via Stripe.</li>
            <li>Send transactional emails (payout confirmations, security alerts, billing receipts).</li>
            <li>Detect and prevent fraud, abuse, and unauthorized access.</li>
            <li>Improve platform features using aggregated, anonymized data.</li>
            <li>Comply with legal obligations, including tax reporting (1099 forms where applicable).</li>
            <li>Provide customer support and respond to your inquiries.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">4. Information Sharing</h2>
          <p className="text-sm leading-relaxed">We share venue operator information only as follows:</p>
          <ul className="text-sm space-y-1.5 ml-4 mt-2 list-disc list-outside leading-relaxed">
            <li><strong className="text-white">Stripe:</strong> Bank details and payout information for payment processing. Stripe's privacy policy applies to data shared with them.</li>
            <li><strong className="text-white">Cloudinary:</strong> Venue photos and media stored via Cloudinary CDN.</li>
            <li><strong className="text-white">Sentry:</strong> Error reporting data (no financial data is included).</li>
            <li><strong className="text-white">Legal compliance:</strong> We may disclose information in response to valid legal process (subpoenas, court orders) or to protect the safety of users and the platform.</li>
            <li>We do not sell venue operator data to advertisers or data brokers.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">5. Customer Data Visible to Venues</h2>
          <p className="text-sm leading-relaxed">
            The Venue Portal provides you with aggregated analytics about customer activity at your venue.
            Individual customer data (names, emails, payment details) is never directly exposed to venue
            operators. Analytics are presented in anonymized, aggregated form. Shot On Me acts as a data
            processor on behalf of users; venue operators do not have independent access to user PII.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">6. Data Retention</h2>
          <p className="text-sm leading-relaxed">
            Account and venue data is retained for the duration of your active account plus 90 days after
            termination. Transaction records are retained for 7 years for tax and accounting compliance.
            AI-generated promotion logs are retained for 2 years. You may request deletion of non-financial
            data by contacting privacy@shotonme.com; financial records are retained as required by law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">7. Security</h2>
          <p className="text-sm leading-relaxed">
            We implement industry-standard security measures including TLS encryption in transit, bcrypt
            password hashing, JWT-based session authentication, and access controls limiting portal data to
            authorized staff accounts. Financial data is handled exclusively through Stripe's PCI-compliant
            infrastructure. We perform regular security reviews and maintain incident response procedures.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">8. Your Rights</h2>
          <p className="text-sm leading-relaxed">
            Depending on your jurisdiction, you may have rights to access, correct, or delete your personal
            information; object to processing; or receive a copy of your data in a portable format. To exercise
            these rights, contact privacy@shotonme.com. We respond to all requests within 30 days.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">9. Changes to This Policy</h2>
          <p className="text-sm leading-relaxed">
            We may update this Privacy Policy from time to time. Material changes will be communicated via
            email to the account holder at least 14 days before taking effect. Continued use of the portal
            after changes take effect constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">10. Contact</h2>
          <p className="text-sm leading-relaxed">
            For privacy questions or requests, contact us at{' '}
            <a href="mailto:privacy@shotonme.com" className="text-primary-400 underline">privacy@shotonme.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}
