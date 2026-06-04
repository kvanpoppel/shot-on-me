export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-primary-400 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-500">Owner Portal Privacy Policy</h1>
          <p className="text-sm text-primary-400/60 mt-1">Last updated: June 4, 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">1. Who We Are</h2>
          <p className="text-sm leading-relaxed">
            Shot On Me LLC operates the Owner Portal for platform administrators. This Privacy Policy explains
            how we collect, use, and protect information related to administrators and the administrative
            activity conducted through this portal. For privacy practices on the consumer app or venue portal,
            see their respective privacy policies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">2. Information We Collect</h2>
          <p className="text-sm leading-relaxed">We collect the following categories of administrator information:</p>
          <ul className="text-sm space-y-1.5 ml-4 mt-2 list-disc list-outside leading-relaxed">
            <li><strong className="text-white">Account information:</strong> Name, email address, and role assigned to your administrator account.</li>
            <li><strong className="text-white">Activity logs:</strong> Records of all administrative actions performed through the portal, including venue approvals, user management actions, configuration changes, and data access events.</li>
            <li><strong className="text-white">Session data:</strong> Login timestamps, IP addresses, browser/device information, and session duration when you use the portal.</li>
            <li><strong className="text-white">Administrative actions:</strong> Detailed logs of platform changes you make, including modifications to venues, users, transactions, disputes, and system settings.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">3. How We Use Your Information</h2>
          <ul className="text-sm space-y-1.5 ml-4 mt-2 list-disc list-outside leading-relaxed">
            <li>Authenticate and authorize your access to the Owner Portal.</li>
            <li>Maintain a complete audit trail of all administrative actions for compliance and accountability.</li>
            <li>Detect and prevent unauthorized access, fraud, and misuse of administrative privileges.</li>
            <li>Ensure platform integrity and investigate reported issues.</li>
            <li>Send security alerts and important platform notifications to your administrator email.</li>
            <li>Comply with legal obligations, including regulatory audits and law enforcement requests.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">4. Information Sharing</h2>
          <p className="text-sm leading-relaxed">We share administrator information only as follows:</p>
          <ul className="text-sm space-y-1.5 ml-4 mt-2 list-disc list-outside leading-relaxed">
            <li><strong className="text-white">Stripe:</strong> Payment processing infrastructure for platform financial operations. Stripe's privacy policy applies to data shared with them.</li>
            <li><strong className="text-white">Cloudinary:</strong> Media storage and delivery for platform content managed through the portal.</li>
            <li><strong className="text-white">Sentry:</strong> Error reporting and performance monitoring (no financial or user PII is included).</li>
            <li><strong className="text-white">Legal compliance:</strong> We may disclose administrator information and activity logs in response to valid legal process (subpoenas, court orders) or to protect the safety of users and the platform.</li>
            <li>We do not sell administrator data to advertisers or data brokers.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">5. Data Retention</h2>
          <p className="text-sm leading-relaxed">
            Administrator account data is retained for the duration of your active access plus 90 days after
            termination. Administrative activity logs and audit trails are retained for 7 years for compliance,
            accountability, and legal purposes. Session data is retained for 1 year. You may request deletion
            of non-audit data by contacting{' '}
            <a href="mailto:privacy@shotonme.com" className="text-primary-400 underline">privacy@shotonme.com</a>;
            audit logs are retained as required by law and Company policy regardless of deletion requests.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">6. Security</h2>
          <p className="text-sm leading-relaxed">
            We implement industry-standard security measures including TLS encryption in transit, bcrypt
            password hashing, JWT-based session authentication, and role-based access controls restricting
            portal access to authorized administrators. All administrative actions are logged with timestamps
            and actor identification for audit purposes. We perform regular security reviews and maintain
            incident response procedures.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">7. Changes to This Policy</h2>
          <p className="text-sm leading-relaxed">
            We may update this Privacy Policy from time to time. Material changes will be communicated via
            email to your administrator account at least 14 days before taking effect. Continued use of the
            portal after changes take effect constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">8. Contact</h2>
          <p className="text-sm leading-relaxed">
            For privacy questions or requests, contact us at{' '}
            <a href="mailto:privacy@shotonme.com" className="text-primary-400 underline">privacy@shotonme.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}
