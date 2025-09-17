import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Cloud,
  Zap,
  Mail,
  MessageSquare,
  CreditCard,
  BarChart3,
  Globe,
  CheckCircle,
  ArrowRight,
  Smartphone,
} from 'lucide-react';
import {
  PageContainer,
  HeroSection,
  IntegrationsGrid,
  FeatureGrid,
  CTASection
} from './shared';

const IntegrationsPage = () => {
  const navigate = useNavigate();

  const popularIntegrations = [
    { name: 'Salesforce', logo: '🏢', category: 'CRM' },
    { name: 'Slack', logo: '💬', category: 'Communication' },
    { name: 'Google Workspace', logo: '📧', category: 'Productivity' },
    { name: 'Shopify', logo: '🛍️', category: 'E-commerce' },
    { name: 'HubSpot', logo: '🎯', category: 'Marketing' },
    { name: 'Stripe', logo: '💳', category: 'Payments' },
    { name: 'AWS', logo: '☁️', category: 'Cloud' },
    { name: 'Microsoft 365', logo: '📄', category: 'Productivity' },
    { name: 'PostgreSQL', logo: '🗄️', category: 'Database' },
    { name: 'Zoom', logo: '📹', category: 'Communication' },
    { name: 'Mailchimp', logo: '🐵', category: 'Email Marketing' },
    { name: 'Jira', logo: '📋', category: 'Project Management' },
  ];

  const integrationCategories = [
    {
      icon: <Cloud className="w-12 h-12 text-blue-600" />,
      title: 'Cloud Platforms',
      description: 'Connect to major cloud providers and services',
      badge: {
        text: 'Popular',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      },
      tags: ['AWS', 'Azure', 'Google Cloud', 'Salesforce', 'HubSpot', 'Shopify'],
    },
    {
      icon: <Database className="w-12 h-12 text-green-600" />,
      title: 'Databases',
      description: 'Sync data across all your database systems',
      badge: {
        text: 'Core',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      },
      tags: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB'],
    },
    {
      icon: <Mail className="w-12 h-12 text-red-600" />,
      title: 'Email & Marketing',
      description: 'Automate your email campaigns and marketing workflows',
      badge: {
        text: 'Essential',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      },
      tags: ['Gmail', 'Outlook', 'Mailchimp', 'SendGrid', 'Constant Contact', 'Campaign Monitor'],
    },
    {
      icon: <MessageSquare className="w-12 h-12 text-purple-600" />,
      title: 'Communication',
      description: 'Streamline team communication and notifications',
      badge: {
        text: 'Popular',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      },
      tags: ['Slack', 'Discord', 'Microsoft Teams', 'Zoom', 'Telegram', 'WhatsApp'],
    },
    {
      icon: <CreditCard className="w-12 h-12 text-orange-600" />,
      title: 'Payment Systems',
      description: 'Process payments and manage financial workflows',
      badge: {
        text: 'Major',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      },
      tags: ['Stripe', 'PayPal', 'Square', 'Braintree', 'Razorpay', 'Adyen'],
    },
    {
      icon: <BarChart3 className="w-12 h-12 text-teal-600" />,
      title: 'Analytics & BI',
      description: 'Transform data into actionable insights',
      badge: {
        text: 'Leading',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      },
      tags: ['Google Analytics', 'Mixpanel', 'Amplitude', 'Tableau', 'Power BI', 'Looker'],
    },
  ];

  const integrationFeatures = [
    {
      title: 'Pre-built Connectors',
      description: 'Ready-to-use integrations with popular services and growing platform library',
      icon: <Zap className="w-8 h-8 text-yellow-600" />,
    },
    {
      title: 'Custom API Integration',
      description: 'Connect to any REST or GraphQL API with our flexible integration builder',
      icon: <Globe className="w-8 h-8 text-blue-600" />,
    },
    {
      title: 'Real-time Sync',
      description: 'Keep data synchronized across all your systems with real-time updates',
      icon: <Database className="w-8 h-8 text-green-600" />,
    },
    {
      title: 'Webhook Support',
      description: 'Trigger workflows instantly with incoming webhooks from any service',
      icon: <Smartphone className="w-8 h-8 text-purple-600" />,
    },
  ];

  return (
    <PageContainer>
      <HeroSection
        badge={{
          icon: <CheckCircle className="w-5 h-5" />,
          text: 'Growing Integration Library',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800'
        }}
        title="Connect Everything"
        subtitle="In One Platform"
        description="Seamlessly integrate with popular services and platforms through our growing library of native connectors plus powerful custom API integration tools."
        primaryButton={{
          text: 'Explore Integrations',
          onClick: () => navigate('/free-signup'),
          className: 'bg-blue-600 hover:bg-blue-700 text-white'
        }}
        gradient="from-green-600 to-blue-600"
      />

      <IntegrationsGrid
        title="Popular Integrations"
        description="Connect with the tools you already use"
        integrations={popularIntegrations}
        columns={6}
      />

      <FeatureGrid
        title="Integration Categories"
        description="Choose from hundreds of pre-built integrations across every category you need."
        features={integrationCategories}
        columns={3}
        bgColor="bg-white"
        sectionBg="bg-gradient-to-br from-slate-50 to-blue-50"
      />

      <FeatureGrid
        title="Built for Seamless Integration"
        description="Our integration platform is designed to make connecting your tools as simple as possible."
        features={integrationFeatures}
        columns={2}
        bgColor="bg-white"
        sectionBg="bg-white"
      />

      <CTASection
        title="Need a Custom Integration?"
        description="Don't see the integration you need? Our team can build custom connectors for any API or service within 48 hours."
        primaryButton={{
          text: 'Request Integration',
          icon: <ArrowRight className="w-5 h-5" />,
          onClick: () => navigate('/contact'),
          className: 'bg-white hover:bg-gray-100 text-gray-900'
        }}
        secondaryButton={{
          text: 'Start Free Trial',
          onClick: () => navigate('/free-signup'),
          className: 'bg-blue-700 hover:bg-blue-800 text-white border border-blue-500'
        }}
        footerText="Custom integrations included in Enterprise plans"
        bgColor="bg-gradient-to-r from-blue-600 to-purple-600"
        titleColor="text-white"
        descriptionColor="text-blue-100"
        footerTextColor="text-blue-100"
      />
    </PageContainer>
  );
};

export default IntegrationsPage;