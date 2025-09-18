import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Workflow,
  Zap,
  Code,
  Users,
  BarChart3,
  Puzzle,
  ArrowRight,
} from 'lucide-react';
import {
  PageContainer,
  HeroSection,
  FeatureGrid,
  GradientSection,
  CTASection
} from './shared';

const FeaturesPage = () => {
  const navigate = useNavigate();

  const coreFeatures = [
    {
      icon: <Workflow className="w-12 h-12 text-blue-600" />,
      title: 'Drag & Drop Workflow Builder',
      description:
        'Create complex business automation workflows with our intuitive visual builder. No coding required.',
      details: [
        'Visual workflow designer',
        'Pre-built templates',
        'Conditional logic',
        'Error handling',
        'Version control',
      ],
    },
    {
      icon: <Zap className="w-12 h-12 text-yellow-600" />,
      title: 'Lightning-Fast Execution',
      description:
        'Execute workflows at scale with millisecond response times and automatic optimization.',
      details: [
        'Sub-second execution',
        'Auto-scaling infrastructure',
        'Real-time monitoring',
        'Performance analytics',
        'Load balancing',
      ],
    },
    {
      icon: <Puzzle className="w-12 h-12 text-green-600" />,
      title: 'Flexible Integrations',
      description:
        'Connect to any service with our growing library of native integrations plus powerful custom API connectors.',
      details: [
        'Native platform integrations',
        'REST & GraphQL APIs',
        'Database connectors',
        'Webhook endpoints',
        'Custom integration builder',
      ],
    },
    {
      icon: <Code className="w-12 h-12 text-purple-600" />,
      title: 'Code-First Flexibility',
      description:
        'Drop into code when you need custom logic, with full JavaScript/Python support and debugging tools.',
      details: [
        'JavaScript & Python runtime',
        'NPM package support',
        'Built-in debugging',
        'Version control integration',
        'Testing framework',
      ],
    },
    {
      icon: <Users className="w-12 h-12 text-orange-600" />,
      title: 'Team Collaboration',
      description:
        'Built for teams with role-based access, shared libraries, and collaborative editing features.',
      details: [
        'Role-based permissions',
        'Shared component libraries',
        'Real-time collaboration',
        'Team workspaces',
        'Audit trails',
      ],
    },
    {
      icon: <BarChart3 className="w-12 h-12 text-red-600" />,
      title: 'Advanced Analytics',
      description:
        'Monitor performance, track usage, and optimize workflows with comprehensive analytics and insights.',
      details: [
        'Real-time dashboards',
        'Performance metrics',
        'Usage analytics',
        'Custom reports',
        'Alerting system',
      ],
    },
    {
      icon: <Code className="w-12 h-12 text-indigo-600" />,
      title: 'Instant Database APIs',
      description:
        'Turn any database into a production-ready REST API in seconds. PostgreSQL, MySQL, MongoDB and more - zero configuration required.',
      details: [
        'Auto-generated REST endpoints',
        'Real-time schema detection',
        'Built-in authentication & security',
        'PostgreSQL, MySQL, MongoDB support',
        'Instant deployment',
      ],
    },
  ];

  const platformCapabilities = [
    {
      title: 'Workflow Engine',
      items: [
        'Visual workflow designer',
        'Conditional branching',
        'Loops and iterations',
        'Error handling',
        'Parallel execution',
        'Scheduled triggers',
      ],
    },
    {
      title: 'Integration Hub',
      items: [
        'Instant database-to-API conversion',
        'Native platform connectors',
        'REST API integration',
        'GraphQL support',
        'Database connections',
        'Real-time webhooks',
      ],
    },
    {
      title: 'Development Tools',
      items: [
        'Built-in code editor',
        'Debugging tools',
        'Version control',
        'Testing framework',
        'Package management',
        'Deployment pipelines',
      ],
    },
    {
      title: 'Enterprise Features',
      items: [
        'SSO integration',
        'Role-based access',
        'Audit logging',
        'Compliance tools',
        'High availability',
        '24/7 monitoring',
      ],
    },
  ];

  return (
    <PageContainer>
      <HeroSection
        badge={{
          icon: <Workflow className="w-5 h-5" />,
          text: 'Enterprise-Grade Platform',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800'
        }}
        title="Powerful Features"
        subtitle="Built for Scale"
        description="Everything you need to build, deploy, and scale business automation workflows. From simple integrations to complex enterprise processes."
        primaryButton={{
          text: 'Start Building Today',
          onClick: () => navigate('/pricing'),
          className: 'bg-blue-600 hover:bg-blue-700 text-white'
        }}
        gradient="from-blue-600 to-purple-600"
      />

      <FeatureGrid
        title="Core Platform Features"
        description="Built with enterprise-grade reliability and developer-friendly tools that scale with your business."
        features={coreFeatures}
        columns={2}
        bgColor="bg-gray-50"
        sectionBg="bg-white"
      />

      <GradientSection
        title="Complete Platform Capabilities"
        description="Everything you need to build powerful automation workflows, from simple integrations to complex enterprise processes."
        items={platformCapabilities}
        columns={4}
        gradient="from-blue-600 to-purple-600"
      />

      <CTASection
        title="Ready to Build Something Amazing?"
        description="Join thousands of developers and businesses who trust NectarStudio.ai to power their automation workflows."
        primaryButton={{
          text: 'Start Free Trial',
          icon: <ArrowRight className="w-5 h-5" />,
          onClick: () => navigate('/free-signup'),
          className: 'bg-blue-600 hover:bg-blue-700 text-white'
        }}
        secondaryButton={{
          text: 'Schedule Demo',
          onClick: () => navigate('/contact'),
          className: 'bg-white hover:bg-gray-100 text-gray-900'
        }}
        footerText="14-day free trial • Full feature access • No credit card required"
      />
    </PageContainer>
  );
};

export default FeaturesPage;