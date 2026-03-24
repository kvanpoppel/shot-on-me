export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-primary-400 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-500">Privacy Policy</h1>
          <p className="text-sm text-primary-400/80 mt-1">Last updated: March 24, 2026</p>
          <p className="text-sm mt-3">
            Shot On Me LLC ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, share, and protect your personal information when you use the Shot On Me
            application and services ("Service"). By using the Service, you agree to the practices described here.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">1. Information We Collect</h2>
          <p className="text-sm font-medium text-primary-400">a) Information You Provide</p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Name, email address, phone number, and password</li>
            <li>Profile picture and account preferences</li>
            <li>Payment information (processed and stored by Stripe — we do not store raw card numbers)</li>
            <li>Messages, posts, stories, and other content you create</li>
            <li>Agreements to Terms of Service and Privacy Policy (timestamp and version recorded)</li>
          </ul>
          <p className="text-sm font-medium text-primary-400 mt-3">b) Information Collected Automatically</p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Device type, operating system, and browser information</li>
            <li>IP address and approximate location (if permitted)</li>
            <li>Precise location (only when you grant permission, for check-ins and nearby features)</li>
            <li>Usage data: features accessed, time spent, interactions with venues and friends</li>
            <li>Transaction history and wallet activity</li>
          </ul>
          <p className="text-sm font-medium text-primary-400 mt-3">c) Information from Third Parties</p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Payment verification and fraud signals from Stripe</li>
            <li>SMS delivery status from Twilio</li>
            <li>Image storage metadata from Cloudinary</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">2. How We Use Your Information</h2>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>To create and manage your account</li>
            <li>To process payments and maintain your wallet balance</li>
            <li>To facilitate peer-to-peer transfers and venue payments</li>
            <li>To send verification codes (OTP) and payment notifications via SMS</li>
            <li>To personalize your experience, including promotions and venue recommendations</li>
            <li>To detect fraud, money laundering, and unauthorized account activity</li>
            <li>To comply with legal obligations, including AML and KYC requirements</li>
            <li>To operate gamification features (points, badges, leaderboards)</li>
            <li>To improve our platform through aggregated analytics</li>
            <li>To communicate service updates and promotional offers (you may opt out at any time)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">3. How We Share Your Information</h2>
          <p className="text-sm">We do not sell your personal information. We share data only as follows:</p>
          <ul className="text-sm list-disc pl-5 space-y-1 mt-2">
            <li><strong className="text-primary-400">Stripe</strong> — payment processing, virtual card issuance, and fraud prevention</li>
            <li><strong className="text-primary-400">Twilio</strong> — SMS notifications and OTP delivery</li>
            <li><strong className="text-primary-400">Cloudinary</strong> — image and media storage</li>
            <li><strong className="text-primary-400">Google Maps</strong> — location and venue map features</li>
            <li><strong className="text-primary-400">Other users</strong> — your name and profile picture are visible to friends and venues you interact with</li>
            <li><strong className="text-primary-400">Venues</strong> — check-in data and transaction amounts when you pay at a venue</li>
            <li><strong className="text-primary-400">Law enforcement</strong> — when required by law, court order, or to protect safety</li>
            <li><strong className="text-primary-400">Business transfers</strong> — in connection with a merger, acquisition, or sale of assets</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">4. Data Retention</h2>
          <p className="text-sm">
            We retain your account information for as long as your account is active. Transaction records are retained
            for a minimum of 5 years to comply with financial regulations. Audit logs are retained for 2 years.
            Pending payment records are deleted after 30 days if unclaimed. You may request deletion of your account
            at any time (see Section 7), subject to legal retention requirements.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">5. Cookies and Tracking</h2>
          <p className="text-sm">
            We use session cookies and HttpOnly cookies for authentication. We do not use third-party advertising
            cookies. We use limited analytics to understand how our platform is used in aggregate. You may disable
            cookies in your browser settings, but this may affect Service functionality.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">6. Children's Privacy (COPPA)</h2>
          <p className="text-sm">
            Shot On Me is not intended for users under 18 years of age. We do not knowingly collect personal
            information from minors. If we become aware that a minor has created an account, we will terminate the
            account and delete the associated data promptly. If you believe a minor is using our Service, contact
            us at privacy@shotonme.com.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">7. Your Rights and Choices</h2>
          <p className="text-sm">Depending on your location, you may have the right to:</p>
          <ul className="text-sm list-disc pl-5 space-y-1 mt-2">
            <li><strong className="text-primary-400">Access</strong> — request a copy of your personal data</li>
            <li><strong className="text-primary-400">Correction</strong> — update inaccurate information in your profile</li>
            <li><strong className="text-primary-400">Deletion</strong> — request deletion of your account and personal data (subject to legal retention requirements)</li>
            <li><strong className="text-primary-400">Opt-out</strong> — unsubscribe from marketing communications at any time</li>
            <li><strong className="text-primary-400">Portability</strong> — request a machine-readable copy of your data</li>
            <li><strong className="text-primary-400">Notification preferences</strong> — manage push and SMS notifications in-app</li>
          </ul>
          <p className="text-sm mt-2">
            California residents have additional rights under the California Consumer Privacy Act (CCPA), including
            the right to know what personal information is collected and the right to opt out of sale (we do not
            sell your data). To exercise any of these rights, contact us at{' '}
            <a href="mailto:privacy@shotonme.com" className="text-primary-500 underline">privacy@shotonme.com</a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">8. Security</h2>
          <p className="text-sm">
            We implement industry-standard security measures including encrypted data transmission (TLS), bcrypt
            password hashing, HttpOnly authentication cookies, and payment 2FA via one-time passcodes. Payment
            data is handled by Stripe and is never stored on our servers. Despite these measures, no system is
            completely secure. You are responsible for keeping your account credentials confidential.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">9. Third-Party Links</h2>
          <p className="text-sm">
            The Service may contain links to third-party websites or services. We are not responsible for the
            privacy practices of those third parties. We encourage you to review their privacy policies before
            providing any personal information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">10. Changes to This Policy</h2>
          <p className="text-sm">
            We may update this Privacy Policy periodically. We will notify you of material changes via email or
            in-app notification. The "Last updated" date at the top of this page reflects the most recent revision.
            Continued use of the Service after changes constitutes acceptance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">11. Contact Us</h2>
          <p className="text-sm">
            For privacy-related questions, requests, or complaints:
            <br /><a href="mailto:privacy@shotonme.com" className="text-primary-500 underline">privacy@shotonme.com</a>
            <br />Shot On Me LLC, Indianapolis, Indiana
          </p>
        </section>
      </div>
    </main>
  )
}
