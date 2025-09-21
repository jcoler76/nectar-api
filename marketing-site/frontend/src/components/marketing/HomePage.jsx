import {
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  BarChart3,
  Users,
  Workflow,
  Globe,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DemoRequestModal from './DemoRequestModal';

const HomePage = () => {
  const navigate = useNavigate();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const handleTryNow = () => {
    navigate('/pricing');
  };

  const handleWatchDemo = () => {
    setIsDemoModalOpen(true);
  };

  const features = [
    {
      icon: <Workflow className="w-8 h-8 text-blue-600" />,
      title: 'Visual Workflow Builder',
      description: 'Create complex business processes with our intuitive drag-and-drop interface',
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-green-600" />,
      title: 'AI-Powered Analytics',
      description: 'Get intelligent insights from your data with natural language queries',
    },
    {
      icon: <Shield className="w-8 h-8 text-purple-600" />,
      title: 'OWASP Top 10 Compliant',
      description:
        'Enterprise-grade security with 100% OWASP compliance, multi-tenant isolation, and advanced threat protection',
    },
    {
      icon: <Users className="w-8 h-8 text-orange-600" />,
      title: 'Team Collaboration',
      description: 'Work together seamlessly with role-based permissions and real-time updates',
    },
    {
      icon: <Globe className="w-8 h-8 text-teal-600" />,
      title: 'Instant API Creation',
      description: 'Turn any database into a REST API in seconds. PostgreSQL, MySQL, MongoDB, and more - no coding required',
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-600" />,
      title: 'Lightning Fast',
      description: 'Optimized performance with real-time processing and intelligent caching',
    },
  ];

  const benefits = [
    'Create APIs from any database in under 30 seconds',
    'Reduce manual work by up to 90%',
    'Improve team productivity instantly',
    'Scale operations without adding headcount',
    'Get insights from your data in seconds',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header provided by MarketingLayout */}

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* Background hero illustration */}
        <img
          src={process.env.PUBLIC_URL + '/hero-marketing.svg'}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        />
        {/* Soft overlay for readability on light artwork */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/20 to-white/40 z-0" />
        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Automate, Integrate, Elevate
            </span>
            <span className="block">Your Business Operations</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-10 max-w-4xl mx-auto leading-relaxed">
            Automate repetitive tasks, integrate all your tools seamlessly, and elevate your team's
            performance to new heights. The all-in-one platform that transforms how modern
            businesses operate.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleTryNow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-2 transition-all hover:scale-105 shadow-xl hover:shadow-2xl"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleWatchDemo}
              className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg border border-gray-200 transition-all hover:scale-105 shadow-lg"
            >
              Request Demo
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200/80 shadow-md">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">OWASP Top 10 Certified</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200/80 shadow-md">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Enterprise Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to
              <span className="text-blue-600"> Scale Your Business</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to streamline your operations and accelerate growth
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-50 hover:bg-white p-8 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <button
              onClick={handleTryNow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-2 mx-auto transition-all hover:scale-105 shadow-xl"
            >
              Try All Features Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
              Transform Your Operations in Days, Not Months
            </h2>
            <div className="space-y-6 text-left max-w-2xl mx-auto">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                  <p className="text-xl text-blue-100">{benefit}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <button
                onClick={handleTryNow}
                className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-2 mx-auto transition-all hover:scale-105 shadow-xl"
              >
                Get Started Today
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Supercharge Your Business?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Join thousands of companies already automating their workflows with Nectar
          </p>
          <button
            onClick={handleTryNow}
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-xl font-semibold text-xl flex items-center gap-3 mx-auto transition-all hover:scale-105 shadow-2xl"
          >
            Start Your Free Trial
            <ArrowRight className="w-6 h-6" />
          </button>
          <p className="text-gray-400 mt-6">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer provided by MarketingLayout */}

      {/* Demo Request Modal */}
      <DemoRequestModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        source="homepage"
      />
    </div>
  );
};

export default HomePage;
