import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pb-16" style={{ background: '#1A1A2E' }}>
      <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-white/5 safe-top" style={{ background: '#1A1A2E' }}>
        <Link href="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </Link>
        <div>
          <h1 className="font-black text-white text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>Venue Privacy Policy</h1>
          <p className="text-xs text-white/40">Last updated June 4, 2026</p>
        </div>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto">
        <div className="rounded-xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-white/70 text-sm leading-relaxed">
            Revig for Venues is operated by Shot On Me LLC. This privacy policy explains what data we collect from venue operators, how we use it, and how we protect it.
          </p>
        </div>

        {[
          {
            title: '1. Who We Are',
            body: 'Shot On Me LLC operates the Revig platform, including the Revig for Venues portal. We are committed to protecting your privacy and handling your data responsibly.',
          },
          {
            title: '2. Information We Collect',
            body: '',
            subsections: [
              {
                title: 'Account Information',
                body: 'Name, email address, phone number, and password when you create your venue account.',
              },
              {
                title: 'Venue Information',
                body: 'Business name, address, city, category, operating hours, photos, and description.',
              },
              {
                title: 'Transaction Data',
                body: 'Redemption records, revenue totals, payout history, and Stripe Connect account details.',
              },
              {
                title: 'Usage Data',
                body: 'Dashboard interactions, feature usage patterns, login times, and device/browser information.',
              },
              {
                title: 'AI & Analytics Data',
                body: 'Sales patterns, deal performance metrics, and AI suggestion interaction history used to generate recommendations.',
              },
            ],
          },
          {
            title: '3. How We Use Your Data',
            body: 'We use your data to operate your venue dashboard, process payouts, generate AI deal suggestions, provide analytics, improve our platform, and communicate with you about your account. We do not sell your personal data to third parties.',
          },
          {
            title: '4. Sharing',
            body: 'We share data with the following service providers: Stripe (payment processing and payouts), Cloudinary (venue photo hosting), and our backend infrastructure providers. We may share anonymized, aggregated analytics for platform improvement. We will disclose data if required by law or to protect rights and safety.',
          },
          {
            title: '5. Venue Customer Data',
            body: 'When customers redeem gifts at your venue, you may see limited customer information (first name and transaction amount) on your dashboard. You may not collect, store, export, or use this customer data for any purpose outside of the Revig platform. Customer data displayed on your dashboard remains the property of Shot On Me LLC.',
          },
          {
            title: '6. Data Retention',
            body: 'We retain your account and transaction data for as long as your account is active. After account deletion, we retain anonymized transaction records for up to 3 years for legal and financial compliance. You may request deletion of your personal data at any time.',
          },
          {
            title: '7. Security',
            body: 'We use industry-standard security measures including encrypted connections (HTTPS), secure password hashing, and token-based authentication. Payment data is handled entirely by Stripe and is never stored on our servers.',
          },
          {
            title: '8. Your Rights',
            body: 'You may request access to, correction of, or deletion of your personal data at any time. To exercise these rights, email privacy@shotonme.com. We will respond within 30 days. You may also delete your account directly from the Settings page.',
          },
          {
            title: '9. Changes to This Policy',
            body: 'We may update this privacy policy from time to time. We will notify you of material changes via email or a notice on the platform. Continued use of the platform after changes constitutes acceptance of the updated policy.',
          },
          {
            title: '10. Contact',
            body: 'Questions about your privacy? Email privacy@shotonme.com.',
          },
        ].map(section => (
          <div key={section.title} className="mb-5">
            <h2 className="text-base font-bold text-white mb-2">{section.title}</h2>
            {section.body ? (
              <p className="text-white/60 text-sm leading-relaxed">{section.body}</p>
            ) : null}
            {'subsections' in section && section.subsections && (
              <div className="flex flex-col gap-4 mt-2">
                {section.subsections.map(sub => (
                  <div key={sub.title}>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: '#C8F135' }}>{sub.title}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{sub.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="mt-8 pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-xs text-white/25 text-center">
            &copy; 2026 Shot On Me LLC
          </p>
        </div>
      </div>
    </div>
  )
}
