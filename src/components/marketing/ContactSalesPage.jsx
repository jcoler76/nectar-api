import { ArrowLeft, Mail, Phone, MessageCircle } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ContactSalesPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => navigate('/pricing')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" /> Back to Pricing
            </button>
          </div>
        </div>
      </nav>

      <section className="px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Contact Sales</h1>
          <p className="text-gray-600 mb-6">
            Tell us a bit about your needs and we\'ll reach out shortly.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-gray-700">
              <Mail className="w-5 h-5" /> sales@nectarstudio.ai
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Phone className="w-5 h-5" /> +1 (555) 555-1234
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <MessageCircle className="w-5 h-5" /> Or use the chat widget in the corner
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-900">
            For fast responses, open the chat and share your MSSQL use case. We\'ll capture your
            details and follow up.
          </div>
        </div>
      </section>
    </div>
  );
}
