import { CheckCircle, ArrowRight, Mail, Calendar, CreditCard } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const CheckoutSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { plan: statePlan, billing: stateBilling, amount: stateAmount } = location.state || {};
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const fetchSession = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/checkout/session/${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        setSessionData(data);
      } catch (e) {
        console.error('Failed to load session details:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [location.search]);

  const handleContinue = () => {
    // Redirect to customer app login
    window.location.href = `${process.env.REACT_APP_CUSTOMER_APP_URL}/login`;
  };

  const handleManageBilling = () => {
    // Redirect to customer app billing
    window.location.href = `${process.env.REACT_APP_CUSTOMER_APP_URL}/billing`;
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to NectarStudio.ai!</h1>
          <p className="text-lg text-gray-600 mb-8">
            {loading
              ? 'Confirming your subscription...'
              : sessionData?.payment_status === 'paid' || sessionData?.status === 'complete'
                ? 'Your subscription is active. You now have access to all features.'
                : 'We are processing your subscription. You will receive an email shortly.'}
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
                <span className="font-medium text-gray-900">{statePlan || 'Selected Plan'}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Billing</span>
                </div>
                <span className="font-medium text-gray-900 capitalize">
                  {stateBilling || 'monthly'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <span>Amount</span>
                </div>
                <span className="font-medium text-gray-900">
                  {sessionData?.amount_total
                    ? `$${(sessionData.amount_total / 100).toFixed(2)}`
                    : stateAmount
                      ? `$${stateAmount}`
                      : '—'}
                </span>
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
                  <p className="font-medium text-gray-900">Check your email immediately</p>
                  <p className="text-gray-600 text-sm">
                    We've sent a welcome email with a verification link to{' '}
                    <strong>{sessionData?.customer_email || 'your email address'}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Verify & set your password</p>
                  <p className="text-gray-600 text-sm">
                    Click the verification link to activate your account and create your password
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Start building workflows</p>
                  <p className="text-gray-600 text-sm">
                    Access your dashboard and create your first automation
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Email Verification Required */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-2 text-amber-800 mb-2">
              <Mail className="w-5 h-5" />
              <span className="font-semibold">Email Verification Required</span>
            </div>
            <p className="text-amber-700 text-sm">
              Please check your email at{' '}
              <strong>{sessionData?.customer_email || 'your email address'}</strong> and click the
              verification link to complete your account setup. The link expires in 24 hours.
            </p>
          </div>

          {/* Free Trial Info */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Subscription Active</span>
            </div>
            <p className="text-green-700 text-sm">
              Your subscription is ready! After verifying your email, you'll have immediate access
              to all features.
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

          <button
            onClick={handleManageBilling}
            className="w-full border border-gray-300 text-gray-800 py-3 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all hover:bg-gray-50"
          >
            Manage Billing
          </button>

          {/* Support Info */}
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-2">Need help getting started?</p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <button
                onClick={() => (window.location.href = 'mailto:support@nectar.com')}
                className="text-blue-600 hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </button>
              <span className="text-gray-400">•</span>
              <button
                onClick={() => {}}
                className="text-blue-600 hover:underline bg-transparent border-none cursor-pointer"
              >
                Help Center
              </button>
              <span className="text-gray-400">•</span>
              <button
                onClick={() => {}}
                className="text-blue-600 hover:underline bg-transparent border-none cursor-pointer"
              >
                Documentation
              </button>
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
