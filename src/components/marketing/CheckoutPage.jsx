import { ArrowLeft, CheckCircle, CreditCard, Lock, Zap } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { getCaptchaToken } from '../../utils/captcha';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    company: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    zipCode: '',
    country: 'US'
  });
  const [errors, setErrors] = useState({});

  // Extract plan and billing from URL params
  const urlParams = new URLSearchParams(location.search);
  const planId = urlParams.get('plan');
  const billingCycle = urlParams.get('billing') || 'monthly';

  const plans = {
    starter: {
      name: 'Starter',
      monthlyPrice: 29,
      yearlyPrice: 290,
      description: 'Perfect for small teams getting started'
    },
    professional: {
      name: 'Professional',
      monthlyPrice: 79,
      yearlyPrice: 790,
      description: 'For growing teams that need more power'
    },
    enterprise: {
      name: 'Enterprise',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      description: 'For large organizations with complex needs'
    }
  };

  const selectedPlan = plans[planId];
  const price = billingCycle === 'monthly' ? selectedPlan?.monthlyPrice : Math.floor(selectedPlan?.yearlyPrice / 12);
  const totalPrice = billingCycle === 'yearly' ? selectedPlan?.yearlyPrice : selectedPlan?.monthlyPrice;

  useEffect(() => {
    if (!selectedPlan) {
      navigate('/pricing');
    }
  }, [selectedPlan, navigate]);

  // If Stripe Checkout is enabled, auto-redirect to Stripe from this page
  useEffect(() => {
    const useStripe = process.env.REACT_APP_USE_STRIPE_CHECKOUT === 'true';
    if (!useStripe) return;

    const doRedirect = async () => {
      try {
        setLoading(true);
        const priceMap = {
          starter: process.env.REACT_APP_STRIPE_PRICE_ID_STARTER,
          professional: process.env.REACT_APP_STRIPE_PRICE_ID_PROFESSIONAL,
          enterprise: process.env.REACT_APP_STRIPE_PRICE_ID_ENTERPRISE,
        };
        const priceId = priceMap[planId];
        if (!priceId) {
          console.error('Missing Stripe price ID for plan', planId);
          navigate('/pricing');
          return;
        }
        const captchaToken = await getCaptchaToken('checkout');
        const res = await fetch('/api/checkout/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId, trialDays: 14, captchaToken }),
        });
        const data = await res.json();
        if (data && data.url) {
          window.location.href = data.url;
        } else {
          console.error('Stripe session not returned, falling back to simulated checkout');
          setLoading(false);
        }
      } catch (e) {
        console.error('Stripe redirect error:', e);
        setLoading(false);
      }
    };

    doRedirect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, billingCycle]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format card number
    if (name === 'cardNumber') {
      formattedValue = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      if (formattedValue.length > 19) formattedValue = formattedValue.slice(0, 19);
    }

    // Format expiry date
    if (name === 'expiryDate') {
      formattedValue = value.replace(/\D/g, '').replace(/(.{2})/, '$1/');
      if (formattedValue.length > 5) formattedValue = formattedValue.slice(0, 5);
    }

    // Format CVV
    if (name === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email address';

    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    if (!formData.cardNumber) newErrors.cardNumber = 'Card number is required';
    else if (formData.cardNumber.replace(/\s/g, '').length < 16) newErrors.cardNumber = 'Invalid card number';

    if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
    else if (!/^\d{2}\/\d{2}$/.test(formData.expiryDate)) newErrors.expiryDate = 'Invalid expiry date';

    if (!formData.cvv) newErrors.cvv = 'CVV is required';
    else if (formData.cvv.length < 3) newErrors.cvv = 'Invalid CVV';

    if (!formData.zipCode) newErrors.zipCode = 'ZIP code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Simulate Stripe payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, you would integrate with Stripe here
      // Processing payment for: plan, billing, customer, amount

      // Simulate successful payment
      navigate('/checkout/success', { 
        state: { 
          plan: selectedPlan.name, 
          billing: billingCycle,
          amount: totalPrice 
        } 
      });
    } catch (error) {
      console.error('Payment failed:', error);
      setErrors({ submit: 'Payment processing failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPlan) {
    return null;
  }

  const useStripe = process.env.REACT_APP_USE_STRIPE_CHECKOUT === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/pricing')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Pricing
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center">
                <span className="text-xl font-bold text-gray-900">NectarStudio</span>
                <span className="text-xl font-bold text-blue-600">.ai</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 h-fit">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedPlan.name}</h3>
                  <p className="text-gray-600">{selectedPlan.description}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium text-gray-900">${price}/{billingCycle === 'monthly' ? 'mo' : 'mo'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Billing</span>
                  <span className="font-medium text-gray-900 capitalize">{billingCycle}</span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="flex justify-between text-green-600">
                    <span>Annual Discount</span>
                    <span className="font-medium">-${(selectedPlan.monthlyPrice * 12) - selectedPlan.yearlyPrice}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${totalPrice}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>14-day free trial included</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>24/7 customer support</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Lock className="w-5 h-5 text-green-600" />
                <span>Secure payment processing</span>
              </div>
            </div>
          </div>

          {/* Checkout Form or Stripe redirect notice */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-8">
              <CreditCard className="w-8 h-8 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Payment Details</h2>
            </div>

            {useStripe ? (
              <div className="space-y-6 text-center py-8">
                <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Redirecting to Secure Checkout</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  You’ll be redirected to our secure Stripe checkout to complete your purchase. This keeps your payment details safe and compliant.
                </p>
                <p className="text-sm text-gray-500">If you’re not redirected automatically, please check your network and try again.</p>
                {loading && (
                  <div className="flex items-center justify-center gap-3 text-gray-500">
                    <span className="animate-spin border-2 border-blue-600 border-t-transparent rounded-full w-5 h-5 inline-block" />
                    <span>Preparing checkout…</span>
                  </div>
                )}
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                      errors.email ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    placeholder="your@email.com"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                      errors.fullName ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    placeholder="John Doe"
                  />
                  {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    placeholder="Your Company Inc."
                  />
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Number *
                  </label>
                  <input
                    type="text"
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                      errors.cardNumber ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    placeholder="1234 5678 9012 3456"
                  />
                  {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date *
                    </label>
                    <input
                      type="text"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                        errors.expiryDate ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="MM/YY"
                    />
                    {errors.expiryDate && <p className="text-red-500 text-sm mt-1">{errors.expiryDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV *
                    </label>
                    <input
                      type="text"
                      name="cvv"
                      value={formData.cvv}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                        errors.cvv ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="123"
                    />
                    {errors.cvv && <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                      errors.zipCode ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    placeholder="12345"
                  />
                  {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                  </select>
                </div>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 text-sm">{errors.submit}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105'
                } text-white shadow-xl`}
              >
                {loading ? 'Processing...' : `Start Free Trial - $${totalPrice}`}
              </button>

              <div className="text-center text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Lock className="w-4 h-4" />
                  <span>Your payment information is secure and encrypted</span>
                </div>
                <p>
                  By clicking "Start Free Trial", you agree to our{' '}
                  <button type="button" className="text-blue-600 hover:underline">Terms of Service</button>{' '}
                  and <button type="button" className="text-blue-600 hover:underline">Privacy Policy</button>
                </p>
              </div>
            </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
