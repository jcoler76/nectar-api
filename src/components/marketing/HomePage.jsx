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
import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  const handleTryNow = () => {
    navigate('/pricing');
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
      title: 'Enterprise Security',
      description: 'Bank-grade security with 2FA, encryption, and compliance features',
    },
    {
      icon: <Users className="w-8 h-8 text-orange-600" />,
      title: 'Team Collaboration',
      description: 'Work together seamlessly with role-based permissions and real-time updates',
    },
    {
      icon: <Globe className="w-8 h-8 text-teal-600" />,
      title: 'API Integrations',
      description: 'Connect with 100+ third-party services and build custom integrations',
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-600" />,
      title: 'Lightning Fast',
      description: 'Optimized performance with real-time processing and intelligent caching',
    },
  ];

  const benefits = [
    'Reduce manual work by up to 90%',
    'Improve team productivity instantly',
    'Scale operations without adding headcount',
    'Ensure compliance with automated workflows',
    'Get insights from your data in seconds',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Workflow className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center">
                <span className="text-xl font-bold text-gray-900">NectarStudio</span>
                <span className="text-xl font-bold text-blue-600">.ai</span>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </a>
              <button
                onClick={() => navigate('/pricing')}
                className="text-gray-600 hover:text-gray-900 transition-colors bg-transparent border-none cursor-pointer"
              >
                Pricing
              </button>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">
                About
              </a>
              <button
                onClick={() => navigate('/login')}
                className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={handleTryNow}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Try Now
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Automate Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Business Workflows
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
            Transform your business operations with intelligent automation, powerful analytics, and
            seamless integrations. Built for modern teams who demand efficiency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleTryNow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-2 transition-all hover:scale-105 shadow-xl hover:shadow-2xl"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg border border-gray-200 transition-all hover:scale-105 shadow-lg">
              Watch Demo
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
                Transform Your Operations in Days, Not Months
              </h2>
              <div className="space-y-6">
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
                  className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-2 transition-all hover:scale-105 shadow-xl"
                >
                  Get Started Today
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
              <div className="text-center">
                <div className="text-6xl font-bold text-white mb-2">90%</div>
                <div className="text-xl text-blue-100 mb-6">Time Savings</div>
                <div className="grid grid-cols-2 gap-6 mt-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">500+</div>
                    <div className="text-blue-100">Companies</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">10M+</div>
                    <div className="text-blue-100">Tasks Automated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">99.9%</div>
                    <div className="text-blue-100">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">24/7</div>
                    <div className="text-blue-100">Support</div>
                  </div>
                </div>
              </div>
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Workflow className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center">
                <span className="text-xl font-bold text-gray-900">NectarStudio</span>
                <span className="text-xl font-bold text-blue-600">.ai</span>
              </div>
              </div>
              <p className="text-gray-600">
                The modern workflow automation platform built for growing businesses.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    Integrations
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    Security
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    API
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    About
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    Careers
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    Contact
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    Blog
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    Help Center
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    Documentation
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    Status
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {}}
                    className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer"
                  >
                    Community
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-12 pt-8 text-center">
            <p className="text-gray-600">&copy; 2024 Nectar. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
