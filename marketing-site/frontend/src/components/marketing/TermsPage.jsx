import React from 'react';

const TermsPage = () => {
  return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="space-y-8 bg-white rounded-2xl p-8 border border-gray-200">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 mb-3">
              These Terms of Service ("Terms") govern your use of Nectar Studio's Backend-as-a-Service (BaaS)
              platform and related services ("Service") operated by Nectar Studio ("we," "us," or "our").
            </p>
            <p className="text-gray-700 mb-3">
              By accessing or using our Service, you agree to be bound by these Terms. If you disagree with
              any part of these terms, then you may not access the Service. These Terms apply to all visitors,
              users, and others who access or use the Service.
            </p>
            <p className="text-gray-700">
              If you are entering into these Terms on behalf of a company or other legal entity, you represent
              that you have the authority to bind such entity to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-3">
              Nectar Studio provides a Backend-as-a-Service platform that offers:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Database management and API services</li>
              <li>User authentication and authorization</li>
              <li>File storage and content delivery</li>
              <li>Real-time data synchronization</li>
              <li>Analytics and monitoring tools</li>
              <li>Custom backend logic and workflows</li>
            </ul>
            <p className="text-gray-700">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time
              with reasonable notice to users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">3.1 Account Creation</h3>
            <p className="text-gray-700 mb-3">
              To access certain features of the Service, you must create an account. When you create an account,
              you must provide information that is accurate, complete, and current at all times.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">3.2 Account Security</h3>
            <p className="text-gray-700 mb-3">
              You are responsible for safeguarding your account credentials and for all activities that occur
              under your account. You must:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Use strong, unique passwords</li>
              <li>Enable two-factor authentication when available</li>
              <li>Keep your login credentials confidential</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">3.3 Account Responsibility</h3>
            <p className="text-gray-700">
              You are responsible for all content and activity in your account. We are not liable for any
              loss or damage arising from your failure to comply with these security obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Acceptable Use Policy</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">4.1 Permitted Use</h3>
            <p className="text-gray-700 mb-3">
              You may use our Service for lawful business and personal purposes in accordance with these Terms.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">4.2 Prohibited Activities</h3>
            <p className="text-gray-700 mb-3">You agree not to engage in any of the following prohibited activities:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Violating any applicable laws or regulations</li>
              <li>Infringing on intellectual property rights</li>
              <li>Transmitting malicious code, viruses, or harmful content</li>
              <li>Attempting to gain unauthorized access to our systems</li>
              <li>Interfering with or disrupting the Service or servers</li>
              <li>Using the Service for spam, phishing, or fraudulent activities</li>
              <li>Reverse engineering or attempting to extract source code</li>
              <li>Reselling or redistributing the Service without authorization</li>
              <li>Mining cryptocurrency or conducting excessive resource consumption</li>
              <li>Storing or transmitting illegal, harmful, or offensive content</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">4.3 Content Guidelines</h3>
            <p className="text-gray-700 mb-3">
              You are responsible for all content you upload, store, or transmit through the Service. Content must not:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Violate any third-party rights</li>
              <li>Contain illegal, harmful, or offensive material</li>
              <li>Include personal information without consent</li>
              <li>Violate privacy or data protection laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Service Availability and Support</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">5.1 Service Level</h3>
            <p className="text-gray-700 mb-3">
              We strive to maintain high availability of our Service but do not guarantee uninterrupted access.
              We may experience downtime for maintenance, updates, or unforeseen circumstances.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">5.2 Support</h3>
            <p className="text-gray-700 mb-3">
              We provide technical support according to your subscription plan. Support may include:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Email support for all plans</li>
              <li>Priority support for premium plans</li>
              <li>Documentation and knowledge base access</li>
              <li>Community forums and resources</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">5.3 Maintenance</h3>
            <p className="text-gray-700">
              We may perform scheduled maintenance with advance notice. Emergency maintenance may be performed
              without prior notice when necessary for security or system integrity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Billing and Payment</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">6.1 Subscription Plans</h3>
            <p className="text-gray-700 mb-3">
              We offer various subscription plans with different features and usage limits. Pricing is
              available on our website and may be updated from time to time.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">6.2 Payment Terms</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Subscription fees are billed in advance on a monthly or annual basis</li>
              <li>Usage-based charges are billed monthly in arrears</li>
              <li>All fees are non-refundable unless otherwise specified</li>
              <li>Prices are exclusive of applicable taxes</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">6.3 Late Payment</h3>
            <p className="text-gray-700 mb-3">
              If payment is not received within 30 days of the due date, we may suspend or terminate your
              access to the Service. Additional charges may apply for account restoration.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">6.4 Price Changes</h3>
            <p className="text-gray-700">
              We may change our pricing with 30 days' notice. Existing subscriptions will be honored at
              the current rate until renewal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Data and Privacy</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">7.1 Your Data</h3>
            <p className="text-gray-700 mb-3">
              You retain all rights to data you upload to our Service ("Customer Data"). We act as a data
              processor and handle your data according to our Privacy Policy and applicable data processing agreements.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">7.2 Data Security</h3>
            <p className="text-gray-700 mb-3">
              We implement industry-standard security measures to protect your data, including encryption,
              access controls, and regular security audits.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">7.3 Data Backup and Recovery</h3>
            <p className="text-gray-700 mb-3">
              We perform regular backups of Customer Data, but you are responsible for maintaining your own
              backup copies. We offer data export tools to facilitate this.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">7.4 Data Deletion</h3>
            <p className="text-gray-700">
              Upon account termination, we will delete your Customer Data within 30 days, unless legally
              required to retain it longer or unless you have requested data export.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">8.1 Our Intellectual Property</h3>
            <p className="text-gray-700 mb-3">
              The Service and its original content, features, and functionality are owned by Nectar Studio
              and are protected by intellectual property laws. You may not copy, modify, or distribute our code,
              trademarks, or other proprietary materials.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">8.2 Your Intellectual Property</h3>
            <p className="text-gray-700 mb-3">
              You retain ownership of your applications, content, and data. By using our Service, you grant
              us a limited license to host, process, and transmit your content as necessary to provide the Service.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">8.3 Feedback</h3>
            <p className="text-gray-700">
              If you provide feedback or suggestions about our Service, we may use such feedback without
              any obligation to compensate you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Termination</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">9.1 Termination by You</h3>
            <p className="text-gray-700 mb-3">
              You may terminate your account at any time by following the cancellation process in your
              account settings or by contacting our support team.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">9.2 Termination by Us</h3>
            <p className="text-gray-700 mb-3">
              We may terminate or suspend your access immediately, with or without notice, for any reason,
              including:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Breach of these Terms</li>
              <li>Non-payment of fees</li>
              <li>Violation of our Acceptable Use Policy</li>
              <li>Fraudulent or illegal activity</li>
              <li>Extended inactivity</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">9.3 Effect of Termination</h3>
            <p className="text-gray-700">
              Upon termination, your right to use the Service ceases immediately. We will provide reasonable
              access to export your data for up to 30 days after termination, subject to payment of any outstanding fees.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Disclaimers and Limitations</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">10.1 Service Disclaimers</h3>
            <p className="text-gray-700 mb-3">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM
              ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR
              A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">10.2 Limitation of Liability</h3>
            <p className="text-gray-700 mb-3">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NECTAR STUDIO SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
            </p>
            <p className="text-gray-700 mb-3">
              OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATING TO THE SERVICE SHALL NOT EXCEED
              THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">10.3 Indemnification</h3>
            <p className="text-gray-700">
              You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from
              your use of the Service, violation of these Terms, or infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Dispute Resolution</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">11.1 Governing Law</h3>
            <p className="text-gray-700 mb-3">
              These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction],
              without regard to its conflict of law provisions.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">11.2 Arbitration</h3>
            <p className="text-gray-700 mb-3">
              Any disputes arising from these Terms or the Service shall be resolved through binding arbitration
              rather than in court, except for claims of intellectual property infringement.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">11.3 Class Action Waiver</h3>
            <p className="text-gray-700">
              You agree that any arbitration or legal proceeding shall be conducted on an individual basis
              and not as part of a class action or collective proceeding.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. General Provisions</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">12.1 Entire Agreement</h3>
            <p className="text-gray-700 mb-3">
              These Terms, together with our Privacy Policy and any other legal notices, constitute the
              entire agreement between you and Nectar Studio regarding the Service.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">12.2 Severability</h3>
            <p className="text-gray-700 mb-3">
              If any provision of these Terms is held to be invalid or unenforceable, the remaining
              provisions shall continue in full force and effect.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">12.3 Assignment</h3>
            <p className="text-gray-700 mb-3">
              You may not assign or transfer these Terms without our written consent. We may assign these
              Terms at any time without notice.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">12.4 Force Majeure</h3>
            <p className="text-gray-700">
              We shall not be liable for any delay or failure to perform resulting from causes beyond our
              reasonable control, including natural disasters, war, terrorism, or government actions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Changes to Terms</h2>
            <p className="text-gray-700 mb-3">
              We reserve the right to modify these Terms at any time. When we make changes, we will:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Update the "Last updated" date at the top of these Terms</li>
              <li>Notify you of material changes via email or platform notification</li>
              <li>Provide at least 30 days' notice for significant changes</li>
              <li>Allow you to terminate your account if you disagree with the changes</li>
            </ul>
            <p className="text-gray-700">
              Your continued use of the Service after changes become effective constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
            <p className="text-gray-700 mb-3">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-2"><strong>Email:</strong> legal@nectarstudio.ai</p>
              <p className="text-gray-700 mb-2"><strong>Support:</strong> support@nectarstudio.ai</p>
              <p className="text-gray-700 mb-2"><strong>Legal Department:</strong> Nectar Studio Legal Team</p>
              <p className="text-gray-700">
                We will respond to your inquiry within 5 business days.
              </p>
            </div>
          </section>
        </div>
      </main>
  );
};

export default TermsPage;
