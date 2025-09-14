import { ArrowLeft, CheckCircle, User, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FreeSignupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    company: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
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
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters';

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Simulate account creation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real app, you would create the account here
      // Account creation logic would go here

      // Simulate successful account creation
      navigate('/checkout/success', {
        state: {
          plan: 'Free',
          billing: 'free',
          amount: 0,
        },
      });
    } catch (error) {
      console.error('Account creation failed:', error);
      setErrors({ submit: 'Account creation failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const freePlanFeatures = [
    '1 database connection',
    '1 service endpoint',
    '1 user role',
    'Up to 5 workflow components',
    '500 API calls/month',
    'Community support',
    'Basic templates',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
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
          {/* Plan Summary */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 h-fit">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Free Plan Summary</h2>

            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Free Plan</h3>
                  <p className="text-gray-600">Perfect for individuals and small projects</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-green-600 mb-2">$0</div>
                  <div className="text-gray-600">Forever Free</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                Everything included:
              </h4>
              <ul className="space-y-3">
                {freePlanFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-6">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">No Credit Card Required</span>
                </div>
                <p className="text-green-700 text-sm">
                  Start using <strong>NectarStudio.ai</strong> immediately. Upgrade to a paid plan
                  anytime to unlock more AI-powered features.
                </p>
              </div>
            </div>
          </div>

          {/* Signup Form */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-8">
              <User className="w-8 h-8 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">Create Your Free Account</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    errors.email ? 'border-red-500' : 'border-gray-300 focus:border-green-500'
                  } focus:outline-none focus:ring-2 focus:ring-green-500/20`}
                  placeholder="your@email.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                    errors.fullName ? 'border-red-500' : 'border-gray-300 focus:border-green-500'
                  } focus:outline-none focus:ring-2 focus:ring-green-500/20`}
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-colors"
                  placeholder="Your Company Inc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                    errors.password ? 'border-red-500' : 'border-gray-300 focus:border-green-500'
                  } focus:outline-none focus:ring-2 focus:ring-green-500/20`}
                  placeholder="At least 8 characters"
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                    errors.confirmPassword
                      ? 'border-red-500'
                      : 'border-gray-300 focus:border-green-500'
                  } focus:outline-none focus:ring-2 focus:ring-green-500/20`}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
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
                    : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 hover:scale-105'
                } text-white shadow-xl`}
              >
                {loading ? 'Creating Account...' : 'Create Free Account'}
              </button>

              <div className="text-center text-sm text-gray-500">
                <p>
                  By creating an account, you agree to our{' '}
                  <button type="button" className="text-green-600 hover:underline">
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button type="button" className="text-green-600 hover:underline">
                    Privacy Policy
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeSignupPage;
