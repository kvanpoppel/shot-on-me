export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-primary-400 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-primary-500">Privacy Policy</h1>
        <p className="text-sm text-primary-400/80">Last updated: February 14, 2026</p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">1. Information We Collect</h2>
          <p className="text-sm">
            We collect account details, transaction activity, and usage telemetry necessary to operate and improve the
            platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">2. How We Use Information</h2>
          <p className="text-sm">
            Data is used for authentication, payments, personalization, customer support, fraud prevention, and service
            analytics.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">3. Data Sharing</h2>
          <p className="text-sm">
            We share data only with trusted service providers and only as needed to process payments, deliver features,
            and comply with legal obligations.
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
