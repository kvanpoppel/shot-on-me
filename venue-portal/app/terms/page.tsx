export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-primary-400 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-primary-500">Venue Portal Terms of Service</h1>
        <p className="text-sm text-primary-400/80">Last updated: February 14, 2026</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">1. Business Account Responsibility</h2>
          <p className="text-sm">
            Venue operators are responsible for the accuracy of venue information, promotion content, and staff access
            permissions managed through this portal.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">2. Promotions and Compliance</h2>
          <p className="text-sm">
            You are responsible for ensuring promotions comply with applicable laws and venue policies, including age
            restrictions and local requirements.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">3. Subscription and Billing</h2>
          <p className="text-sm">
            Subscription tiers determine available features. Billing terms and any plan changes apply based on your
            selected tier and effective date.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">4. Contact</h2>
          <p className="text-sm">Questions can be sent to venues@shotonme.com.</p>
        </section>
      </div>
    </main>
  )
}
