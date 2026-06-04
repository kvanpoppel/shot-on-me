export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-primary-400 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-500">Owner Portal Terms of Service</h1>
          <p className="text-sm text-primary-400/60 mt-1">Last updated: June 4, 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed">
            By accessing the Shot On Me Owner Portal, you ("Administrator") agree to these Terms of Service
            ("Terms") and our Privacy Policy. These Terms govern your use of the Shot On Me LLC ("Company")
            administrative dashboard, including platform monitoring, venue approval, user management, analytics,
            and all other administrative functions. If you do not agree, do not use the portal.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">2. Administrator Responsibilities</h2>
          <p className="text-sm leading-relaxed">
            As a platform administrator, you are responsible for: (a) maintaining the accuracy and integrity of
            all platform data you create, modify, or approve; (b) using administrative privileges only for
            legitimate platform operations; (c) ensuring compliance with applicable local, state, and federal
            laws when approving venues, managing users, or configuring platform settings; (d) safeguarding your
            administrator credentials and immediately reporting any unauthorized access; and (e) acting in the
            best interest of the platform and its users at all times.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">3. Venue Approval Authority</h2>
          <p className="text-sm leading-relaxed">
            Administrators may approve, reject, suspend, or remove venue listings from the platform. Approval
            decisions must be made in good faith based on platform guidelines and applicable law. Shot On Me LLC
            is not liable for claims arising from venue approval or rejection decisions made by administrators.
            Administrators must document the basis for rejection or suspension of any venue and ensure consistent
            application of platform policies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">4. User Data Handling</h2>
          <p className="text-sm leading-relaxed">
            Administrators have access to user accounts, transaction records, and platform analytics. You must:
            (a) access user data only when necessary for legitimate administrative purposes; (b) never share,
            export, or disclose individually identifiable user data outside of the platform except as required
            by law; (c) comply with all applicable data protection regulations; and (d) report any data breach
            or unauthorized access immediately to the Company. Misuse of user data may result in immediate
            termination of administrator access and legal action.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">5. Confidentiality</h2>
          <p className="text-sm leading-relaxed">
            All platform data accessible through the Owner Portal — including revenue figures, user metrics,
            venue performance data, transaction volumes, AI insights, and system health information — is
            confidential and proprietary to Shot On Me LLC. You may not disclose, reproduce, or distribute
            this information to any third party without prior written consent from the Company. This obligation
            survives termination of your administrator access.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">6. Platform Integrity</h2>
          <p className="text-sm leading-relaxed">
            Administrators must not: (a) manipulate transaction records, analytics, or financial data;
            (b) create fictitious user accounts, venues, or transactions; (c) use administrative tools for
            personal benefit or to benefit any third party; (d) circumvent security controls, access controls,
            or audit logging; or (e) interfere with the normal operation of the platform. Violations may result
            in immediate suspension and legal action.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">7. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed">
            To the maximum extent permitted by law, Shot On Me LLC's total liability to you for any claim
            arising from use of the Owner Portal shall not exceed the total compensation paid to you by
            the Company in the 3 months preceding the claim, or $500, whichever is greater. Shot On Me LLC
            is not liable for lost revenue, lost profits, or indirect or consequential damages of any kind.
            The Company is not liable for decisions made by administrators using the portal tools.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">8. Account Suspension and Termination</h2>
          <p className="text-sm leading-relaxed">
            Shot On Me LLC may suspend or terminate your administrator access at any time for: (a) violation
            of these Terms; (b) misuse of administrative privileges; (c) unauthorized disclosure of confidential
            data; (d) any conduct that harms users, venues, or the platform; or (e) at the Company's discretion
            with reasonable notice. Upon termination, your access to all administrative tools and data ceases
            immediately. You must return or destroy any confidential information in your possession.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">9. Governing Law</h2>
          <p className="text-sm leading-relaxed">
            These Terms are governed by the laws of the State of Indiana, without regard to conflict of law
            principles. Disputes shall be resolved through binding arbitration in accordance with American
            Arbitration Association rules, except that either party may seek injunctive relief in any court
            of competent jurisdiction. To the extent court proceedings are permitted, the parties consent to
            exclusive jurisdiction in the courts of Marion County, Indiana.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-primary-500">10. Contact</h2>
          <p className="text-sm leading-relaxed">
            Questions about these Terms can be sent to{' '}
            <a href="mailto:legal@shotonme.com" className="text-primary-400 underline">legal@shotonme.com</a>.
          </p>
        </section>
      </div>
    </main>
  )
}
