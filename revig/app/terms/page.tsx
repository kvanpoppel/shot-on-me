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
          <h1 className="font-black text-white text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>Terms of Service</h1>
          <p className="text-xs text-white/40">Last updated June 4, 2026</p>
        </div>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto">
        <div className="revig-card p-5 mb-4">
          <p className="text-white/70 text-sm leading-relaxed">
            By using Revig, you agree to these terms. Revig is operated by Shot On Me LLC These terms govern your use of the Revig platform and services.
          </p>
        </div>

        {[
          {
            title: '1. Eligibility',
            body: 'You must be 13 years or older to use Revig. By creating an account, you confirm you meet this requirement. Users under 18 may not add funds or send gifts.',
          },
          {
            title: '2. Revig Gifts',
            body: 'Revig gifts are digital credits transferred between users, redeemable at participating venues. Gifts are non-refundable once sent. Revig is not responsible for venue closures or unavailability.',
          },
          {
            title: '3. Wallet & Payments',
            body: 'Funds added to your Revig wallet are processed by Stripe. Wallet balances are non-transferable to bank accounts except via approved payout methods. Shot On Me reserves the right to freeze accounts suspected of fraud.',
          },
          {
            title: '4. Refunds & Cancellations',
            body: '',
            subsections: [
              {
                title: '4a. Wallet Deposits',
                body: 'Funds added to your Revig wallet are generally non-refundable. If you believe a charge was made in error, contact support@shotonme.com within 7 days of the transaction. Refunds are issued at our discretion and only for verified errors (e.g., duplicate charges, technical failures during payment processing).',
              },
              {
                title: '4b. Sent Revig Gifts',
                body: 'Once a Revig gift has been sent and accepted by the recipient, it cannot be reversed or refunded. If a gift was sent to the wrong person due to a system error, contact us immediately. Gifts sent to incorrect recipients by user error are not eligible for refund.',
              },
              {
                title: '4c. Unredeemed Wallet Balance',
                body: 'If you close your account with a remaining wallet balance, you may request a refund of unused funds within 30 days of account closure. Accounts dormant for 12 or more months may be subject to an inactivity fee of up to $5/month, as permitted by applicable law. Contact support@shotonme.com to initiate a balance refund.',
              },
            ],
          },
          {
            title: '5. Prohibited Use',
            body: 'You may not use Revig to purchase alcohol, controlled substances, or any product prohibited by law. Venues listed on Revig are non-alcohol establishments. Misuse may result in account termination.',
          },
          {
            title: '6. Venue Partners',
            body: 'Venue listings are provided for informational purposes. Revig does not guarantee hours, pricing, or availability. Disputes with venues must be resolved directly with the venue owner.',
          },
          {
            title: '7. Intellectual Property',
            body: 'The Revig name, logo, and all content are owned by Shot On Me LLC You may not use our branding without written permission.',
          },
          {
            title: '8. Termination',
            body: 'We reserve the right to suspend or terminate accounts that violate these terms, engage in fraud, or abuse the platform.',
          },
          {
            title: '9. Governing Law',
            body: 'These terms are governed by the laws of the State of Indiana, USA.',
          },
          {
            title: '10. Contact',
            body: 'Questions? Email legal@shotonme.com.',
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
      </div>
    </div>
  )
}
