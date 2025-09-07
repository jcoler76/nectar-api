import { CheckCircle, ArrowRight, Mail, Calendar, CreditCard } from 'lucide-react';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const CheckoutSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { plan, billing, amount } = location.state || {};

  const handleContinue = () => {
    // In a real app, this would redirect to the dashboard or onboarding
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Nectar!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Your free trial has started successfully. You now have access to all {plan} features.
          </p>

          {/* Order Details */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">Order Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <CreditCard className="w-4 h-4" />
                  <span>Plan</span>
                </div>
                <span className="font-medium text-gray-900">{plan}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Billing</span>
                </div>
                <span className="font-medium text-gray-900 capitalize">{billing}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <span>Amount</span>
                </div>
                <span className="font-medium text-gray-900">${amount}</span>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-4 text-center">What happens next?</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Check your email</p>
                  <p className="text-gray-600 text-sm">We've sent you a welcome email with your account details</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Set up your workspace</p>
                  <p className="text-gray-600 text-sm">Complete the onboarding process to get started</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Start automating</p>
                  <p className="text-gray-600 text-sm">Create your first workflow and see the magic happen</p>
                </div>
              </div>
            </div>
          </div>

          {/* Free Trial Info */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">14-Day Free Trial Active</span>
            </div>
            <p className="text-green-700 text-sm">
              Your trial ends on {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}. 
              You can cancel anytime before then to avoid charges.
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-xl mb-6"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Support Info */}
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-2">Need help getting started?</p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <a href="#" className="text-blue-600 hover:underline flex items-center gap-1">
                <Mail className="w-4 h-4" />
                Contact Support
              </a>
              <span className="text-gray-400">•</span>
              <a href="#" className="text-blue-600 hover:underline">
                Help Center
              </a>
              <span className="text-gray-400">•</span>
              <a href="#" className="text-blue-600 hover:underline">
                Documentation
              </a>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Questions? Email us at{' '}
            <a href="mailto:support@nectar.com" className="text-blue-600 hover:underline">
              support@nectar.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;