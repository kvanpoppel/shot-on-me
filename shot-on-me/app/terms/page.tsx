export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-primary-400 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-primary-500">Terms of Service</h1>
        <p className="text-sm text-primary-400/80">Last updated: February 14, 2026</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">1. Account Use</h2>
          <p className="text-sm">
            You agree to provide accurate account information and keep your credentials secure. You are responsible
            for activity on your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">2. Payments and Promotions</h2>
          <p className="text-sm">
            Transactions, redemptions, and promotions are subject to availability, applicable fees, and venue-specific
            conditions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">3. Acceptable Conduct</h2>
          <p className="text-sm">
            You may not misuse the service, attempt unauthorized access, or submit unlawful content. Violations may
            lead to account suspension.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">4. Contact</h2>
          <p className="text-sm">Questions about these terms can be sent to support@shotonme.com.</p>
        </section>
      </div>
    </main>
  )
}
