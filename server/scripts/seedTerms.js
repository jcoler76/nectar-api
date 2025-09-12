/**
 * Script to seed initial Terms and Conditions
 * Run with: node server/scripts/seedTerms.js
 */

const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();

const initialTermsContent = `
<h2>1. Acceptance of Terms</h2>
<p>By accessing and using this service, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>

<h2>2. Use License</h2>
<p>Permission is granted to temporarily use this service for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
<ul>
  <li>modify or copy the materials;</li>
  <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
  <li>attempt to decompile or reverse engineer any software contained in this service;</li>
  <li>remove any copyright or other proprietary notations from the materials.</li>
</ul>

<h2>3. Data Privacy and Security</h2>
<p>We are committed to protecting your data and privacy. All data transmitted through our service is encrypted and stored securely. We do not sell or share your personal information with third parties without your explicit consent, except as required by law.</p>

<h2>4. Service Availability</h2>
<p>While we strive to maintain high availability, we do not guarantee uninterrupted access to the service. We reserve the right to modify, suspend, or discontinue the service at any time without notice.</p>

<h2>5. User Responsibilities</h2>
<p>You are responsible for:</p>
<ul>
  <li>Maintaining the confidentiality of your account credentials</li>
  <li>All activities that occur under your account</li>
  <li>Ensuring your use of the service complies with all applicable laws and regulations</li>
  <li>Not using the service for any illegal or unauthorized purpose</li>
</ul>

<h2>6. Intellectual Property</h2>
<p>The service and its original content, features, and functionality are and will remain the exclusive property of the company and its licensors. The service is protected by copyright, trademark, and other laws.</p>

<h2>7. Limitation of Liability</h2>
<p>In no event shall our company, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>

<h2>8. Indemnification</h2>
<p>You agree to defend, indemnify, and hold harmless the company and its licensee and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees).</p>

<h2>9. Termination</h2>
<p>We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.</p>

<h2>10. Governing Law</h2>
<p>These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.</p>

<h2>11. Changes to Terms</h2>
<p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.</p>

<h2>12. Contact Information</h2>
<p>If you have any questions about these Terms and Conditions, please contact us through the support channels provided in the application.</p>

<p><strong>Last Updated: ${new Date().toLocaleDateString()}</strong></p>
`;

async function seedTerms() {
  try {
    console.log('🌱 Seeding Terms and Conditions...');

    // Check if terms already exist
    const existingTerms = await prisma.termsAndConditions.findFirst();

    if (existingTerms) {
      console.log('✅ Terms and Conditions already exist. Skipping seed.');
      return;
    }

    // Create initial terms
    const terms = await prisma.termsAndConditions.create({
      data: {
        version: '1.0.0',
        content: initialTermsContent,
        summary:
          'Initial Terms and Conditions for the platform. These terms govern the use of our service and establish the legal agreement between users and the platform.',
        effectiveDate: new Date(),
        isActive: true,
      },
    });

    console.log('✅ Terms and Conditions created successfully!');
    console.log(`   Version: ${terms.version}`);
    console.log(`   Effective Date: ${terms.effectiveDate}`);
    console.log(`   ID: ${terms.id}`);
  } catch (error) {
    console.error('❌ Error seeding Terms and Conditions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedTerms();
