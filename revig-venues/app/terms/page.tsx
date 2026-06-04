import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen pb-16" style={{ background: '#1A1A2E' }}>
      <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-white/5 safe-top" style={{ background: '#1A1A2E' }}>
        <Link href="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </Link>
        <div>
          <h1 className="font-black text-white text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>Venue Terms of Service</h1>
          <p className="text-xs text-white/40">Last updated June 4, 2026</p>
        </div>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto">
        <div className="rounded-xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-white/70 text-sm leading-relaxed">
            These Terms of Service govern your use of the Revig for Venues platform, operated by Shot On Me LLC. By accessing or using the venue portal, you agree to be bound by these terms.
          </p>
        </div>

        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By creating a venue account or accessing the Revig for Venues dashboard, you confirm that you have the authority to bind your business to these terms and that you accept them in full. If you do not agree, do not use the platform.',
          },
          {
            title: '2. Venue Account Responsibility',
            body: 'You are responsible for maintaining the security of your account credentials. You must ensure that all information provided about your venue (name, address, hours, offerings) is accurate and up to date. You are responsible for all activity that occurs under your account, including actions taken by staff members you authorize.',
          },
          {
            title: '3. Promotions & Compliance',
            body: 'All deals and promotions you create through Revig must comply with applicable local, state, and federal laws. You are solely responsible for ensuring your promotions do not violate any regulations, including pricing laws, consumer protection statutes, and advertising standards. Revig is a non-alcohol platform; venues may not create promotions for alcoholic beverages or controlled substances.',
          },
          {
            title: '4. Subscription & Billing',
            body: 'Revig for Venues offers tiered subscription plans. Your subscription begins on the date of purchase and renews automatically at the end of each billing cycle. You authorize Shot On Me LLC to charge your payment method on file for all applicable fees. Subscription fees are non-refundable except where required by law.',
          },
          {
            title: '5. Cancellations & Refunds',
            body: 'You may cancel your subscription at any time through the Settings page. Upon cancellation, your subscription will remain active until the end of the current billing period. No partial refunds are issued for unused portions of a billing cycle. If you believe you were charged in error, contact venues@shotonme.com within 14 days.',
          },
          {
            title: '6. Payouts',
            body: 'Revenue earned through Revig redemptions at your venue is paid out via Stripe Connect. Payouts are subject to Stripe\'s processing times and policies. Shot On Me LLC is not responsible for delays caused by Stripe or your financial institution. You are responsible for providing accurate banking details for payouts.',
          },
          {
            title: '7. AI Features',
            body: 'Revig may provide AI-powered deal suggestions and analytics based on your venue\'s sales data. These suggestions are recommendations only and do not constitute business advice. You are under no obligation to accept AI suggestions. Shot On Me LLC is not liable for business outcomes resulting from AI-recommended promotions.',
          },
          {
            title: '8. Data & Analytics',
            body: 'Revig collects and processes transaction data, redemption metrics, and venue performance analytics to power your dashboard. By using the platform, you grant Shot On Me LLC a license to use anonymized, aggregated venue data for platform improvement and trend analysis. Individual customer data is handled in accordance with our Privacy Policy.',
          },
          {
            title: '9. Termination',
            body: 'Shot On Me LLC reserves the right to suspend or terminate your venue account at any time for violations of these terms, fraudulent activity, or abuse of the platform. You may also request account deletion at any time. Upon termination, any pending payouts will be processed according to Stripe\'s standard timeline.',
          },
          {
            title: '10. Governing Law',
            body: 'These terms are governed by and construed in accordance with the laws of the State of Indiana, USA, without regard to conflict of law principles. Any disputes arising from these terms shall be resolved in the courts of the State of Indiana.',
          },
          {
            title: '11. Contact',
            body: 'Questions about these terms? Email venues@shotonme.com.',
          },
        ].map(section => (
          <div key={section.title} className="mb-5">
            <h2 className="text-base font-bold text-white mb-2">{section.title}</h2>
            <p className="text-white/60 text-sm leading-relaxed">{section.body}</p>
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
