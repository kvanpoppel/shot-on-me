export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-primary-400 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-500">Venue Portal Terms of Service</h1>
          <p className="text-sm text-primary-400/60 mt-1">Last updated: April 12, 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed">
            By creating a venue account on Shot On Me, you ("Venue Operator") agree to these Terms of Service
            ("Terms") and our Privacy Policy. These Terms govern your use of the Shot On Me Venue Portal,
            including all analytics, AI automation, promotion management, and payout features. If you do not
            agree, do not use the portal.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">2. Business Account Responsibility</h2>
          <p className="text-sm leading-relaxed">
            You are solely responsible for (a) the accuracy of all venue information, photos, and descriptions
            displayed on the platform; (b) all promotions created, scheduled, or broadcast through the portal;
            (c) access permissions granted to staff accounts; and (d) compliance with applicable local, state,
            and federal laws, including laws governing promotions, discounts, and alcohol service where applicable.
            Shot On Me reserves the right to remove or modify content that violates these Terms or applicable law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">3. Promotions and Compliance</h2>
          <p className="text-sm leading-relaxed">
            All promotions broadcast through Shot On Me must be truthful, non-discriminatory, and compliant with
            applicable law. You may not create promotions that: (a) offer alcohol to minors; (b) violate local
            regulations on discounting, happy hours, or price advertising; (c) mislead consumers about terms,
            availability, or value; or (d) infringe the intellectual property rights of third parties.
            Shot On Me is not liable for promotions you create. You indemnify Shot On Me against claims arising
            from your promotional content.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">4. Subscription and Billing</h2>
          <p className="text-sm leading-relaxed">
            The Venue Portal is offered on subscription tiers (Free, Starter, Pro, Enterprise) that determine
            available features, analytics depth, and AI automation capabilities. Billing is processed monthly
            or annually depending on the plan selected. All charges are non-refundable except as set out in
            Section 5 below.
          </p>
          <p className="text-sm leading-relaxed">
            Shot On Me reserves the right to change pricing with 30 days' written notice to the email on file.
            Continued use of the portal after a price change constitutes acceptance of the new pricing.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">5. Cancellations and Refunds</h2>
          <p className="text-sm leading-relaxed">
            <strong className="text-white">Cancellation:</strong> You may cancel your subscription at any time
            from the Settings page. Cancellation takes effect at the end of the current billing period; you
            retain access to paid features through that date.
          </p>
          <p className="text-sm leading-relaxed mt-2">
            <strong className="text-white">Refunds:</strong> Monthly subscription fees are non-refundable once
            charged. Annual subscriptions may be refunded on a pro-rata basis (less any discounts applied at
            purchase) within 14 days of the annual renewal date if requested in writing at venues@shotonme.com.
            No refunds are issued for partial months or for downgrades mid-cycle.
          </p>
          <p className="text-sm leading-relaxed mt-2">
            <strong className="text-white">Payout fees:</strong> Platform service fees deducted from customer
            transactions (shots, gifts) are non-refundable once a transaction is completed, except in cases of
            verified fraud or system error.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">6. Payouts</h2>
          <p className="text-sm leading-relaxed">
            Funds collected via Shot On Me transactions at your venue are disbursed to your connected bank
            account according to your payout schedule (standard: weekly). A platform service fee is deducted
            before disbursement at the rate shown in your account dashboard. You are responsible for providing
            accurate bank and tax information. Shot On Me is not liable for delays caused by incorrect banking
            details or third-party payment processor issues.
          </p>
          <p className="text-sm leading-relaxed mt-2">
            Payouts may be paused if: (a) your account is flagged for fraud review; (b) there is a pending
            dispute or chargeback; or (c) your venue account is suspended. Shot On Me will notify you promptly
            of any payout hold and its reason.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">7. AI Features and Automation</h2>
          <p className="text-sm leading-relaxed">
            The Venue Portal includes AI-generated analytics summaries, promotion suggestions, and automated
            scheduling features. AI outputs are advisory only — you are responsible for reviewing and approving
            all AI-suggested promotions before they go live. Shot On Me makes no warranty that AI-generated
            recommendations will increase revenue, foot traffic, or engagement. You retain full control over
            whether automated promotions are enabled in your account settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">8. Data and Analytics</h2>
          <p className="text-sm leading-relaxed">
            Shot On Me collects transaction, check-in, engagement, and demographic data from user activity at
            your venue. This data is used to power your analytics dashboard and improve platform features.
            Aggregated, anonymized data may be used for product research. We do not sell individually
            identifiable user data to third parties. See our Privacy Policy for full details.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">9. Account Suspension and Termination</h2>
          <p className="text-sm leading-relaxed">
            Shot On Me may suspend or terminate your venue account for: (a) repeated violation of these Terms;
            (b) fraudulent activity; (c) creation of harmful or illegal promotions; (d) non-payment; or (e)
            any conduct that harms users or the Shot On Me platform. You will receive written notice except
            where immediate suspension is required to protect users or the platform. Upon termination, your
            data is retained for 90 days before deletion, and any pending payouts will be disbursed after a
            30-day hold for dispute resolution.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">10. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed">
            To the maximum extent permitted by law, Shot On Me's total liability to you for any claim arising
            from use of the Venue Portal shall not exceed the total subscription fees paid by you in the 3
            months preceding the claim. Shot On Me is not liable for lost revenue, lost profits, or indirect
            or consequential damages of any kind.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">11. Governing Law</h2>
          <p className="text-sm leading-relaxed">
            These Terms are governed by the laws of the State of Delaware, without regard to conflict of law
            principles. Disputes shall be resolved through binding arbitration in accordance with JAMS rules,
            except that either party may seek injunctive relief in any court of competent jurisdiction.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">12. Contact</h2>
          <p className="text-sm leading-relaxed">
            Questions about these Terms can be sent to{' '}
            <a href="mailto:venues@shotonme.com" className="text-primary-400 underline">venues@shotonme.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}
