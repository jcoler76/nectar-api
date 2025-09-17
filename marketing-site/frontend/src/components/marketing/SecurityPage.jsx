import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  Server,
  Award,
  Activity,
  Database,
} from 'lucide-react';
import {
  PageContainer,
  HeroSection,
  FeatureGrid,
  GradientSection,
  CTASection
} from './shared';

const SecurityPage = () => {
  const navigate = useNavigate();

  const securityMetrics = [
    { label: 'Security Score', value: '100%', description: 'OWASP Top 10 Compliance' },
    { label: 'Uptime SLA', value: '99.9%', description: 'High Availability Guarantee' },
    { label: 'Response Time', value: '<2min', description: 'Security Incident Response' },
    { label: 'Encryption', value: 'AES-256', description: 'Military-Grade Encryption' },
  ];

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
      title: 'OWASP Top 10',
      description: 'Complete protection against the most critical web application security risks',
      badge: {
        text: '100% Compliant',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      },
    },
    {
      title: 'Enterprise Standards',
      description: 'Security architecture following enterprise-grade standards and controls',
      badge: {
        text: 'Industry Best Practices',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      },
    },
    {
      title: 'GDPR Compliant',
      description: 'Built-in data protection and privacy controls for European compliance',
      badge: {
        text: 'Privacy-First Design',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800'
      },
    },
    {
      title: 'Enterprise Security',
      description: 'Enterprise-level security controls suitable for financial institutions',
      badge: {
        text: 'Bank-Grade Security',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800'
      },
    },
  ];

  return (
    <PageContainer>
      <HeroSection
        badge={{
          icon: <Shield className="w-5 h-5" />,
          text: '100% OWASP Top 10 Compliant',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800'
        }}
        title="Enterprise Security"
        subtitle="Built for Trust"
        description="NectarStudio.ai is built with security-first principles, achieving 100% OWASP Top 10 compliance and implementing enterprise-grade security controls that protect your data and operations."
        metrics={securityMetrics}
        primaryButton={{
          text: 'Start Secure Trial',
          onClick: () => navigate('/pricing'),
          className: 'bg-blue-600 hover:bg-blue-700 text-white'
        }}
        gradient="from-green-600 to-blue-600"
      />

      <FeatureGrid
        title="Comprehensive Security Architecture"
        description="Every layer of our platform is designed with security-first principles, implementing industry-leading controls and monitoring systems."
        features={securityFeatures}
        columns={2}
        bgColor="bg-gray-50"
        sectionBg="bg-white"
      />

      <GradientSection
        title="Industry Compliance Standards"
        description="We meet and exceed industry security standards to ensure your organization can trust us with your most critical data and operations."
        items={complianceStandards}
        columns={2}
        gradient="from-blue-600 to-purple-600"
      />

      <CTASection
        title="Ready for Enterprise-Grade Security?"
        description="Join organizations that trust NectarStudio.ai with their most sensitive data and critical operations."
        primaryButton={{
          text: 'Start Secure Trial',
          onClick: () => navigate('/pricing'),
          className: 'bg-blue-600 hover:bg-blue-700 text-white'
        }}
        secondaryButton={{
          text: 'Schedule Security Review',
          onClick: () => navigate('/contact'),
          className: 'bg-white hover:bg-gray-100 text-gray-900'
        }}
        footerText="14-day free trial • Enterprise security from day one • No credit card required"
      />
    </PageContainer>
  );
};

export default SecurityPage;