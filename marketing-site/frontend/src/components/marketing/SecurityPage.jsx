import {
  Shield,
  Users,
  Server,
  CheckCircle,
  ArrowLeft,
  Workflow,
  Award,
  Activity,
  Database,
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const SecurityPage = () => {
  const navigate = useNavigate();

  const securityFeatures = [
    {
      icon: <Award className="w-12 h-12 text-green-600" />,
      title: 'OWASP Top 10 Compliant',
      description:
        '100% compliance with OWASP Top 10 2021 security standards, protecting against the most critical web application risks.',
      details: [
        'SQL Injection Protection',
        'XSS Prevention',
        'Authentication Security',
        'Access Control',
        'Security Misconfiguration Prevention',
      ],
    },
    {
      icon: <Shield className="w-12 h-12 text-blue-600" />,
      title: 'Enterprise-Grade Authentication',
      description:
        'Multi-factor authentication, JWT tokens, and advanced session management with Redis-backed security.',
      details: [
        'Multi-Factor Authentication',
        'JWT Token Security',
        'Session Management',
        'Password Security',
        'Account Lockout Protection',
      ],
    },
    {
      icon: <Users className="w-12 h-12 text-purple-600" />,
      title: 'Advanced Authorization',
      description:
        'Role-based access control (RBAC) with multi-tenant isolation and resource-level permissions.',
      details: [
        'Role-Based Access Control',
        'Multi-Tenant Isolation',
        'Resource-Level Permissions',
        'Organization Boundaries',
        'API Key Management',
      ],
    },
    {
      icon: <Database className="w-12 h-12 text-orange-600" />,
      title: 'Data Protection & Privacy',
      description:
        'Comprehensive data sanitization, encryption at rest and in transit, and PII protection.',
      details: [
        'Data Encryption (AES-256)',
        'PII Sanitization',
        'Secure Data Transmission',
        'Audit Logging',
        'Data Retention Policies',
      ],
    },
    {
      icon: <Activity className="w-12 h-12 text-red-600" />,
      title: '24/7 Security Monitoring',
      description:
        'Real-time threat detection, comprehensive audit logging, and automated incident response.',
      details: [
        'Real-Time Monitoring',
        'Threat Detection',
        'Comprehensive Audit Logs',
        'Security Event Alerts',
        'Automated Response',
      ],
    },
    {
      icon: <Server className="w-12 h-12 text-teal-600" />,
      title: 'Infrastructure Security',
      description:
        'Rate limiting, DDoS protection, security headers, and hardened deployment configurations.',
      details: [
        'Rate Limiting & DDoS Protection',
        'Security Headers (HSTS, CSP)',
        'Secure Deployment',
        'Network Security',
        'Infrastructure Monitoring',
      ],
    },
  ];

  const complianceStandards = [
    {
      name: 'OWASP Top 10',
      status: '100% Compliant',
      description: 'Complete protection against the most critical web application security risks',
      color: 'green',
    },
    {
      name: 'Enterprise Standards',
      status: 'Industry Best Practices',
      description: 'Security architecture following enterprise-grade standards and controls',
      color: 'blue',
    },
    {
      name: 'GDPR Compliant',
      status: 'Privacy-First Design',
      description: 'Built-in data protection and privacy controls for European compliance',
      color: 'purple',
    },
    {
      name: 'Enterprise Security',
      status: 'Bank-Grade Security',
      description: 'Enterprise-level security controls suitable for financial institutions',
      color: 'orange',
    },
  ];

  const securityMetrics = [
    { label: 'Security Score', value: '100%', description: 'OWASP Top 10 Compliance' },
    { label: 'Uptime SLA', value: '99.9%', description: 'High Availability Guarantee' },
    { label: 'Response Time', value: '<2min', description: 'Security Incident Response' },
    { label: 'Encryption', value: 'AES-256', description: 'Military-Grade Encryption' },
  ];

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
                  <Workflow className="w-5 h-5 text-white" />
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
              <button
                onClick={() => navigate('/pricing')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
              <Shield className="w-5 h-5" />
              <span className="font-semibold">100% OWASP Top 10 Compliant</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
              Enterprise Security
            </span>
            <span className="block">Built for Trust</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
            NectarStudio.ai is built with security-first principles, achieving 100% OWASP Top 10
            compliance and implementing enterprise-grade security controls that protect your data
            and operations.
          </p>

          {/* Security Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto mb-10">
            {securityMetrics.map((metric, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
                <div className="text-sm font-medium text-gray-700 mb-1">{metric.label}</div>
                <div className="text-xs text-gray-500">{metric.description}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/pricing')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-xl"
          >
            Start Secure Trial
          </button>
        </div>
      </section>

      {/* Security Features */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Comprehensive Security Architecture
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every layer of our platform is designed with security-first principles, implementing
              industry-leading controls and monitoring systems.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {securityFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-50 hover:bg-white p-8 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300"
              >
                <div className="mb-6">{feature.icon}</div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Standards */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Industry Compliance Standards
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              We meet and exceed industry security standards to ensure your organization can trust
              us with your most critical data and operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {complianceStandards.map((standard, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20"
              >
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                    standard.color === 'green'
                      ? 'bg-green-100 text-green-800'
                      : standard.color === 'blue'
                        ? 'bg-blue-100 text-blue-800'
                        : standard.color === 'purple'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {standard.status}
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">{standard.name}</h3>
                <p className="text-blue-100">{standard.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready for Enterprise-Grade Security?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Join organizations that trust NectarStudio.ai with their most sensitive data and
            critical operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/pricing')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-xl"
            >
              Start Secure Trial
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="bg-white hover:bg-gray-100 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-xl"
            >
              Schedule Security Review
            </button>
          </div>
          <p className="text-gray-400 mt-6">
            14-day free trial • Enterprise security from day one • No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Workflow className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center">
                <span className="text-xl font-bold text-gray-900">NectarStudio</span>
                <span className="text-xl font-bold text-blue-600">.ai</span>
              </div>
            </div>
            <p className="text-gray-600 mb-8">
              Enterprise-grade security and compliance for modern businesses
            </p>
            <div className="border-t border-gray-200 pt-8">
              <p className="text-gray-600">
                &copy; 2024 Nectar. All rights reserved. Built with security first.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SecurityPage;
