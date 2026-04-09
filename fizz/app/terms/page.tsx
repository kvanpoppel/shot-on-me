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
          <p className="text-xs text-white/40">Last updated April 9, 2026</p>
        </div>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto">
        <div className="fizz-card p-5 mb-4">
          <p className="text-white/70 text-sm leading-relaxed">
            By using Fizz, you agree to these terms. Fizz is operated by Shot On Me, Inc. These terms govern your use of the Fizz platform and services.
          </p>
        </div>

        {[
          {
            title: '1. Eligibility',
            body: 'You must be 13 years or older to use Fizz. By creating an account, you confirm you meet this requirement. Users under 18 may not add funds or send gifts.',
          },
          {
            title: '2. Fizz Gifts',
            body: 'Fizz gifts are digital credits transferred between users, redeemable at participating venues. Gifts are non-refundable once sent. Fizz is not responsible for venue closures or unavailability.',
          },
          {
            title: '3. Wallet & Payments',
            body: 'Funds added to your Fizz wallet are processed by Stripe. Wallet balances are non-transferable to bank accounts except via approved payout methods. Shot On Me reserves the right to freeze accounts suspected of fraud.',
          },
          {
            title: '4. Prohibited Use',
            body: 'You may not use Fizz to purchase alcohol, controlled substances, or any product prohibited by law. Venues listed on Fizz are non-alcohol establishments. Misuse may result in account termination.',
          },
          {
            title: '5. Venue Partners',
            body: 'Venue listings are provided for informational purposes. Fizz does not guarantee hours, pricing, or availability. Disputes with venues must be resolved directly with the venue owner.',
          },
          {
            title: '6. Intellectual Property',
            body: 'The Fizz name, logo, and all content are owned by Shot On Me, Inc. You may not use our branding without written permission.',
          },
          {
            title: '7. Termination',
            body: 'We reserve the right to suspend or terminate accounts that violate these terms, engage in fraud, or abuse the platform.',
          },
          {
            title: '8. Governing Law',
            body: 'These terms are governed by the laws of the State of Indiana, USA.',
          },
          {
            title: '9. Contact',
            body: 'Questions? Email legal@shotonme.com.',
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
