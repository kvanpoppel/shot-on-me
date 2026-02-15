export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-primary-400 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-primary-500">Venue Portal Privacy Policy</h1>
        <p className="text-sm text-primary-400/80">Last updated: February 14, 2026</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">1. Data Collected</h2>
          <p className="text-sm">
            We collect account, venue, transaction, and analytics data needed to provide portal functionality and
            optimize venue performance tools.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">2. Use of Data</h2>
          <p className="text-sm">
            Data is used to deliver reporting, AI recommendations, payment operations, fraud monitoring, and product
            support.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">3. Sharing and Security</h2>
          <p className="text-sm">
            We limit sharing to required service providers and implement safeguards for account and payment-related
            information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">4. Contact</h2>
          <p className="text-sm">Privacy requests can be sent to privacy@shotonme.com.</p>
        </section>
      </div>
    </main>
  )
}
