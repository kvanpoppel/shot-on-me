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
          <h1 className="font-black text-white text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>Privacy Policy</h1>
          <p className="text-xs text-white/40">Last updated June 4, 2026</p>
        </div>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto prose prose-invert prose-sm">
        <div className="revig-card p-5 mb-4">
          <p className="text-white/70 text-sm leading-relaxed">
            Revig is a product of Shot On Me LLC. Your privacy matters to us. This policy explains what data we collect, why, and how we protect it.
          </p>
        </div>

        {[
          {
            title: '1. What We Collect',
            body: 'We collect your name, email, phone number, and payment information when you register. We collect transaction history, venue interactions, and location data (only when you opt in) to power the Revig experience.',
          },
          {
            title: '2. How We Use Your Data',
            body: 'Your data is used to process payments, match you with nearby venues, send Revig gifts, and personalize your experience. We do not sell your personal data to third parties.',
          },
          {
            title: '3. Payment Data',
            body: 'Payment processing is handled by Stripe. We do not store your full card number. Stripe\'s privacy policy applies to payment data handling.',
          },
          {
            title: '4. Location',
            body: 'Location is used only when you grant permission, to show nearby venues. You can revoke this permission at any time in your device settings.',
          },
          {
            title: '5. Sharing',
            body: 'We share data with Stripe (payments), Cloudinary (photos), and our backend infrastructure. We may share aggregated, anonymized analytics with venue partners.',
          },
          {
            title: '6. Your Rights',
            body: 'You may request deletion of your account and associated data at any time by emailing support@shotonme.com. We will comply within 30 days.',
          },
          {
            title: '7. Cookies',
            body: 'We use HttpOnly session cookies for authentication. We do not use third-party tracking cookies.',
          },
          {
            title: '8. Contact',
            body: 'Questions? Email privacy@shotonme.com.',
          },
        ].map(section => (
          <div key={section.title} className="mb-5">
            <h2 className="text-base font-bold text-white mb-2">{section.title}</h2>
            <p className="text-white/60 text-sm leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
