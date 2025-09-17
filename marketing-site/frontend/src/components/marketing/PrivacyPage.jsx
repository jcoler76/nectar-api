import React from 'react';

const PrivacyPage = () => {
  return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8 bg-white rounded-2xl p-8 border border-gray-200">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Overview</h2>
            <p className="text-gray-700 mb-3">
              At Nectar Studio, we are committed to protecting your privacy and maintaining the confidentiality
              of your personal information. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our Backend-as-a-Service (BaaS) platform and related services.
            </p>
            <p className="text-gray-700">
              This policy applies to all users of our services, including registered users, trial users, and
              website visitors. By using our services, you consent to the data practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-2">2.1 Personal Information</h3>
            <p className="text-gray-700 mb-3">We collect personal information that you voluntarily provide, including:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Name, email address, and contact information</li>
              <li>Account credentials and authentication data</li>
              <li>Billing and payment information</li>
              <li>Company information and business details</li>
              <li>Communications and support requests</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">2.2 Technical Information</h3>
            <p className="text-gray-700 mb-3">We automatically collect technical information, including:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>API usage metrics and performance data</li>
              <li>Log files and error reports</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">2.3 Customer Data</h3>
            <p className="text-gray-700">
              As a BaaS provider, we may process data that you store, upload, or transmit through our platform
              ("Customer Data"). We act as a data processor for such information and handle it according to
              your instructions and applicable data processing agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-3">We use your information for the following purposes:</p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">3.1 Service Provision</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Providing and maintaining our BaaS platform</li>
              <li>Processing transactions and billing</li>
              <li>Managing user accounts and authentication</li>
              <li>Delivering customer support and technical assistance</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">3.2 Service Improvement</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Analyzing usage patterns to improve our services</li>
              <li>Developing new features and functionality</li>
              <li>Monitoring system performance and security</li>
              <li>Conducting research and analytics</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">3.3 Communication</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Sending service-related notifications and updates</li>
              <li>Providing marketing communications (with consent)</li>
              <li>Responding to inquiries and support requests</li>
              <li>Delivering security alerts and system notifications</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">3.4 Legal Compliance</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Complying with applicable laws and regulations</li>
              <li>Responding to legal requests and court orders</li>
              <li>Protecting our rights and preventing fraud</li>
              <li>Enforcing our terms of service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
            <p className="text-gray-700 mb-3">
              We do not sell, rent, or trade your personal information. We may share your information in the following circumstances:
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">4.1 Service Providers</h3>
            <p className="text-gray-700 mb-3">
              We may share information with trusted third-party service providers who assist us in operating our platform, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Cloud hosting and infrastructure providers</li>
              <li>Payment processors and billing services</li>
              <li>Analytics and monitoring services</li>
              <li>Customer support platforms</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">4.2 Legal Requirements</h3>
            <p className="text-gray-700 mb-3">We may disclose information when required by law or to:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Comply with legal obligations or court orders</li>
              <li>Protect the rights, property, or safety of our users</li>
              <li>Investigate potential violations of our terms</li>
              <li>Respond to government requests</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">4.3 Business Transfers</h3>
            <p className="text-gray-700">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred
              as part of the transaction. We will notify you of any such change and the choices you may have.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 mb-3">
              We implement comprehensive security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Encryption of data in transit and at rest using industry-standard protocols</li>
              <li>Multi-factor authentication and access controls</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Secure data centers with physical and logical security controls</li>
              <li>Employee training on data protection and security practices</li>
              <li>Incident response procedures for security breaches</li>
            </ul>
            <p className="text-gray-700">
              While we strive to protect your information, no method of transmission over the internet
              or electronic storage is completely secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 mb-3">
              We retain your personal information for as long as necessary to provide our services and fulfill
              the purposes outlined in this policy. Specific retention periods include:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Account information: Retained while your account is active and for 3 years after closure</li>
              <li>Billing records: Retained for 7 years for tax and accounting purposes</li>
              <li>Usage logs: Retained for 1 year for security and performance monitoring</li>
              <li>Customer Data: Deleted according to your instructions or upon account termination</li>
            </ul>
            <p className="text-gray-700">
              You may request deletion of your personal information, subject to legal and contractual obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Your Privacy Rights</h2>
            <p className="text-gray-700 mb-3">
              Depending on your location, you may have the following privacy rights:
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">7.1 General Rights</h3>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Access: Request a copy of your personal information</li>
              <li>Correction: Request correction of inaccurate or incomplete data</li>
              <li>Deletion: Request deletion of your personal information</li>
              <li>Portability: Request transfer of your data to another service</li>
              <li>Objection: Object to certain processing activities</li>
              <li>Restriction: Request limitation of processing in certain circumstances</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-2">7.2 GDPR Rights (EU Residents)</h3>
            <p className="text-gray-700 mb-3">
              If you are located in the European Union, you have additional rights under the GDPR, including
              the right to lodge a complaint with your local data protection authority.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-2">7.3 CCPA Rights (California Residents)</h3>
            <p className="text-gray-700 mb-3">
              California residents have additional rights under the CCPA, including the right to opt-out of
              the sale of personal information (which we do not engage in).
            </p>

            <p className="text-gray-700">
              To exercise your rights, please contact us using the information provided in the Contact section.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 mb-3">
              We use cookies and similar technologies to enhance your experience and collect usage information:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Essential cookies: Required for basic site functionality</li>
              <li>Analytics cookies: Help us understand how users interact with our services</li>
              <li>Preference cookies: Remember your settings and preferences</li>
              <li>Marketing cookies: Used to deliver relevant advertisements (with consent)</li>
            </ul>
            <p className="text-gray-700">
              You can control cookie settings through your browser preferences or our cookie consent manager.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p className="text-gray-700 mb-3">
              We may transfer your information to countries outside your jurisdiction for processing and storage.
              When we do so, we ensure appropriate safeguards are in place, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Standard contractual clauses approved by regulatory authorities</li>
              <li>Adequacy decisions by relevant data protection authorities</li>
              <li>Binding corporate rules and certification schemes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-700">
              Our services are not intended for children under 13 years of age. We do not knowingly collect
              personal information from children under 13. If we become aware that we have collected personal
              information from a child under 13, we will take steps to delete such information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-700 mb-3">
              We may update this Privacy Policy from time to time to reflect changes in our practices or
              applicable laws. When we make changes, we will:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Update the "Last updated" date at the top of this policy</li>
              <li>Notify you of material changes via email or platform notification</li>
              <li>Provide at least 30 days' notice for significant changes</li>
              <li>Obtain your consent where required by law</li>
            </ul>
            <p className="text-gray-700">
              Your continued use of our services after changes become effective constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
            <p className="text-gray-700 mb-3">
              If you have questions about this Privacy Policy or our privacy practices, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-2"><strong>Email:</strong> privacy@nectarstudio.ai</p>
              <p className="text-gray-700 mb-2"><strong>Data Protection Officer:</strong> dpo@nectarstudio.ai</p>
              <p className="text-gray-700 mb-2"><strong>Address:</strong> Nectar Studio Privacy Team</p>
              <p className="text-gray-700">
                We will respond to your inquiry within 30 days or as required by applicable law.
              </p>
            </div>
          </section>
        </div>
      </main>
  );
};

export default PrivacyPage;
