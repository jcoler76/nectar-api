import { Check, ArrowLeft, Zap, Crown, Building2, Star } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getCaptchaToken } from '../../utils/captcha';

const PricingPage = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');

  const handleSelectPlan = async planId => {
    if (planId === 'free') {
      navigate('/free-signup');
      return;
    }

    if (planId === 'enterprise') {
      // Enterprise is contact-only
      window.location.href = 'mailto:sales@nectarstudio.ai?subject=Enterprise%20Plan%20Inquiry';
      return;
    }

    const useStripe = process.env.REACT_APP_USE_STRIPE_CHECKOUT === 'true';
    if (!useStripe) {
      navigate(`/checkout?plan=${planId}&billing=${billingCycle}`);
      return;
    }

    const priceMap = {
      // Keep plan IDs stable; map to Stripe prices for self-serve plans only
      starter: process.env.REACT_APP_STRIPE_PRICE_ID_STARTER,
      professional: process.env.REACT_APP_STRIPE_PRICE_ID_PROFESSIONAL,
    };

    const priceId = priceMap[planId];
    if (!priceId) {
      console.error('Missing Stripe price ID for plan', planId);
      navigate(`/checkout?plan=${planId}&billing=${billingCycle}`);
      return;
    }

    try {
      // Get an invisible CAPTCHA token if configured (non-intrusive)
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
        navigate(`/checkout?plan=${planId}&billing=${billingCycle}`);
      }
    } catch (e) {
      console.error('Checkout session error', e);
      navigate(`/checkout?plan=${planId}&billing=${billingCycle}`);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: <Zap className="w-8 h-8" />,
      description: 'Great for trying NectarStudio.ai on a small project',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        '1 datasource',
        '50k API calls/month',
        'NL→API generator (limited)',
        'BYO LLM key (optional)',
        'OpenAPI docs & basic hooks',
        'Community support',
      ],
      limitations: ['Learning tier with limited capacity'],
      popular: false,
      color: 'green',
    },
    {
      id: 'starter',
      name: 'Team',
      icon: <Zap className="w-8 h-8" />,
      description: 'For small teams launching production APIs',
      monthlyPrice: 99,
      yearlyPrice: 990,
      features: [
        'Up to 5 team members',
        '3 datasources',
        '1M API calls/month',
        '🔐 Enterprise-grade security',
        'API keys, quotas, audit logs',
        'OpenAPI developer portal',
        'Pre/post request hooks',
        'Email support',
      ],
      limitations: ['No SSO/SAML', 'No on‑prem'],
      popular: false,
      color: 'blue',
    },
    {
      id: 'professional',
      name: 'Business',
      icon: <Crown className="w-8 h-8" />,
      description: 'For growing teams with governance needs',
      monthlyPrice: 399,
      yearlyPrice: 3990,
      features: [
        'Up to 25 team members',
        '10 datasources',
        '5M API calls/month',
        '🛡️ OWASP Top 10 compliant security',
        'Advanced RBAC/ABAC & masking',
        'Staging environments',
        'Workflow Copilot',
        'Priority support',
      ],
      limitations: ['SSO/SAML & on‑prem in Enterprise'],
      popular: true,
      color: 'purple',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: <Building2 className="w-8 h-8" />,
      description: 'Custom pricing with advanced security and deployment options',
      monthlyPrice: null,
      yearlyPrice: null,
      features: [
        'Unlimited team members (fair use)',
        'Unlimited datasources (fair use)',
        '🏆 100% OWASP Top 10 compliance',
        '🔒 Advanced threat protection',
        'SSO/SAML/SCIM',
        'On‑prem & private LLMs',
        'VPC peering & SOC 2 addendum',
        'HA SLAs & dedicated support',
        'Migration assistance (DreamFactory → Nectar)',
      ],
      limitations: [],
      popular: false,
      color: 'emerald',
    },
  ];

  const getPrice = plan => {
    if (plan.id === 'enterprise' || plan.monthlyPrice == null || plan.yearlyPrice == null)
      return null;
    return billingCycle === 'monthly' ? plan.monthlyPrice : Math.floor(plan.yearlyPrice / 12);
  };

  const getSavings = plan => {
    const monthlyCost = plan.monthlyPrice * 12;
    const yearlyCost = plan.yearlyPrice;
    return Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Home
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center">
                  <span className="text-xl font-bold text-gray-900">NectarStudio</span>
                  <span className="text-xl font-bold text-blue-600">.ai</span>
                </div>
              </div>
              <button
                onClick={() => window.location.href = `${process.env.REACT_APP_CUSTOMER_APP_URL}/login`}
                className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Choose Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Perfect Plan
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Start with a 14-day free trial. No credit card required. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span
              className={`font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <div className="flex items-center gap-2">
              <span
                className={`font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}
              >
                Yearly
              </span>
              {billingCycle === 'yearly' && (
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                  Save up to 20%
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-8 transition-all duration-300 hover:scale-105 ${
                  plan.popular
                    ? 'border-purple-500 shadow-2xl shadow-purple-500/25'
                    : 'border-gray-200 hover:border-gray-300 shadow-xl hover:shadow-2xl'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-${plan.color}-500 to-${plan.color}-600 text-white mb-4`}
                  >
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>

                  <div className="mb-6">
                    {plan.id !== 'enterprise' ? (
                      <>
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-5xl font-bold text-gray-900">
                            ${getPrice(plan)}
                          </span>
                          <span className="text-gray-600">
                            /{billingCycle === 'monthly' ? 'mo' : 'mo'}
                          </span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <div className="text-sm text-green-600 font-medium mt-2">
                            Save {getSavings(plan)}% annually
                          </div>
                        )}
                        {billingCycle === 'monthly' && (
                          <div className="text-sm text-gray-500 mt-2">Billed monthly</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-4xl font-bold text-gray-900">Contact Us</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-2">Custom annual pricing</div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all hover:scale-105 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg'
                        : `bg-${plan.color}-600 hover:bg-${plan.color}-700 text-white`
                    }`}
                  >
                    {plan.id === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'}
                  </button>
                  {plan.id !== 'enterprise' ? (
                    <p className="text-xs text-gray-500 mt-3">
                      14-day free trial, then $
                      {billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}/
                      {billingCycle === 'monthly' ? 'month' : 'year'}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-3">Tailored pricing and SLAs</p>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                    Everything included:
                  </h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 text-${plan.color}-600 flex-shrink-0 mt-0.5`} />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Add-ons */}
          <div className="mt-16">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add-ons</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Usage Overage</h3>
                  <p className="text-gray-600 text-sm">
                    $3–$5 per additional 1M API calls per month.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Extra Datasources</h3>
                  <p className="text-gray-600 text-sm">
                    Team: $10/mo each · Business: $25/mo each.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Managed LLM Usage</h3>
                  <p className="text-gray-600 text-sm">
                    Optional pass‑through billing + 15% fee, or use your own key for no surcharge.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">MSSQL Migration Package</h3>
                  <p className="text-gray-600 text-sm">
                    One‑time fixed fee; included with Enterprise onboarding.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-12">Frequently Asked Questions</h2>
              <div className="grid gap-8 text-left">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
                  <p className="text-gray-600">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect
                    immediately, and you'll be prorated for the difference.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    What payment methods do you accept?
                  </h3>
                  <p className="text-gray-600">
                    We accept all major credit cards (Visa, Mastercard, American Express) and bank
                    transfers for Enterprise plans. All payments are processed securely through
                    Stripe.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Do you support BYO LLM keys?</h3>
                  <p className="text-gray-600">
                    Yes. Bring your own OpenAI/Anthropic/Azure keys for no surcharge. If you prefer
                    managed LLM billing, we pass through costs with a small fee.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">How do overages work?</h3>
                  <p className="text-gray-600">
                    If you exceed your included API calls, additional usage is billed in blocks
                    (e.g., $3–$5 per extra 1M calls). You can set alerts and caps in settings.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Is on‑prem supported?</h3>
                  <p className="text-gray-600">
                    Yes, Enterprise supports on‑prem deployment, private LLMs, and VPC peering.
                    Contact sales to discuss requirements and timelines.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Is there a setup fee?</h3>
                  <p className="text-gray-600">
                    No setup fees. No hidden charges. You only pay for your chosen plan, and you can
                    cancel anytime without penalties.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Do you offer discounts for nonprofits?
                  </h3>
                  <p className="text-gray-600">
                    Yes! We offer special pricing for qualified nonprofits, educational
                    institutions, and startups. Contact our sales team for more information.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Sales CTA */}
          <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Need a custom solution?</h2>
            <p className="text-xl text-blue-100 mb-6">
              Our Enterprise plan can be customized to fit your specific requirements.
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
