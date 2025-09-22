import { Mail, MessageCircle } from 'lucide-react';
import React from 'react';

export default function ContactSalesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header provided by MarketingLayout */}

      <section className="px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Contact Sales</h1>
          <p className="text-gray-600 mb-6">
            Tell us a bit about your needs and we'll reach out shortly.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-gray-700">
              <Mail className="w-5 h-5" /> sales@nectarstudio.ai
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <MessageCircle className="w-5 h-5" /> Or use the chat widget in the corner
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900">
            For fast responses, open the chat and share your use case. We'll capture your
            details and follow up.
          </div>
        </div>
      </section>
      {/* Footer provided by MarketingLayout */}
    </div>
  );
}
