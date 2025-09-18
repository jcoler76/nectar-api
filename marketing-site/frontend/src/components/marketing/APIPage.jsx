import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Key,
  Zap,
  Shield,
  Globe,
  Book,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import {
  PageContainer,
  HeroSection,
  CodeExample,
  FeatureGrid,
  APIEndpoints,
  GradientSection,
  CTASection
} from './shared';

const APIPage = () => {
  const navigate = useNavigate();

  const codeExample = `// Connect your database and instantly create APIs
import { NectarAPI } from '@nectar/api-client';

const nectar = new NectarAPI({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Connect to your database (PostgreSQL, MySQL, MongoDB, etc.)
const database = await nectar.databases.connect({
  type: 'postgresql',
  connectionString: 'postgresql://user:pass@host:5432/db'
});

// Instantly generated REST endpoints are now available:
// GET  /api/users        - List all users
// POST /api/users        - Create new user
// GET  /api/users/:id    - Get user by ID
// PUT  /api/users/:id    - Update user
// DELETE /api/users/:id  - Delete user

// Use the auto-generated API immediately
const users = await fetch('/api/users').then(r => r.json());
console.log('Database API ready:', users);`;

  const apiFeatures = [
    {
      icon: <Zap className="w-12 h-12 text-yellow-600" />,
      title: 'Instant Database APIs',
      description:
        'Connect any database and automatically generate production-ready REST APIs in seconds. No coding, no configuration required.',
      details: [
        'PostgreSQL, MySQL, MongoDB support',
        'Auto-generated endpoints',
        'Real-time schema detection',
        'Built-in authentication',
        'Instant deployment',
      ],
    },
    {
      icon: <Shield className="w-12 h-12 text-green-600" />,
      title: 'Secure Authentication',
      description:
        'Multiple authentication methods including API keys, OAuth 2.0, and JWT tokens with granular permissions.',
      details: [
        'API key authentication',
        'OAuth 2.0 flow',
        'JWT token support',
        'Role-based access control',
        'Rate limiting protection',
      ],
    },
    {
      icon: <Globe className="w-12 h-12 text-blue-600" />,
      title: 'Global CDN',
      description:
        'Low-latency API access worldwide with 99.9% uptime SLA and automatic failover.',
      details: [
        '99.9% uptime SLA',
        'Global edge locations',
        'Automatic failover',
        'Load balancing',
        'DDoS protection',
      ],
    },
    {
      icon: <Book className="w-12 h-12 text-purple-600" />,
      title: 'Developer Tools',
      description:
        'Comprehensive SDKs, interactive documentation, and testing tools to accelerate development.',
      details: [
        'Interactive API explorer',
        'SDKs for popular languages',
        'Postman collections',
        'Code examples',
        'Testing sandbox',
      ],
    },
  ];

  const apiEndpoints = [
    {
      method: 'POST',
      endpoint: '/api/v1/workflows/execute',
      description: 'Execute a workflow with input data',
    },
    {
      method: 'GET',
      endpoint: '/api/v1/workflows/{id}/status',
      description: 'Get workflow execution status',
    },
    {
      method: 'GET',
      endpoint: '/api/v1/workflows',
      description: 'List all available workflows',
    },
    {
      method: 'POST',
      endpoint: '/api/v1/integrations/connect',
      description: 'Connect a new integration',
    },
    {
      method: 'GET',
      endpoint: '/api/v1/logs',
      description: 'Retrieve execution logs',
    },
    {
      method: 'POST',
      endpoint: '/api/v1/webhooks',
      description: 'Create webhook endpoints',
    },
  ];

  const sdkLanguages = [
    { name: 'JavaScript/Node.js', icon: '📦', status: 'Available' },
    { name: 'Python', icon: '🐍', status: 'Available' },
    { name: 'Java', icon: '☕', status: 'Available' },
    { name: 'PHP', icon: '🐘', status: 'Available' },
    { name: 'Ruby', icon: '💎', status: 'Available' },
    { name: 'Go', icon: '🚀', status: 'Available' },
    { name: '.NET/C#', icon: '🔷', status: 'Coming Soon' },
    { name: 'Rust', icon: '🦀', status: 'Coming Soon' },
  ];

  return (
    <PageContainer>
      <HeroSection
        badge={{
          icon: <Terminal className="w-5 h-5" />,
          text: 'Developer-First API',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800'
        }}
        title="Powerful API"
        subtitle="For Developers"
        description="Turn any database into a REST API instantly, or build custom integrations with our comprehensive API platform. Connect PostgreSQL, MySQL, MongoDB and more in seconds."
        primaryButton={{
          text: 'Get API Key',
          icon: <Key className="w-5 h-5" />,
          onClick: () => navigate('/free-signup'),
          className: 'bg-blue-600 hover:bg-blue-700 text-white'
        }}
        secondaryButton={{
          text: 'View Documentation',
          icon: <Book className="w-5 h-5" />,
          onClick: () => window.open('https://docs.nectrastudio.ai/api', '_blank'),
          className: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
        }}
        gradient="from-purple-600 to-blue-600"
      />

      <CodeExample
        title="Quick Start Example"
        code={codeExample}
        language="javascript"
      />

      <FeatureGrid
        title="Built for Developers"
        description="Everything you need to integrate NectarStudio.ai into your applications and workflows."
        features={apiFeatures}
        columns={2}
        bgColor="bg-white"
        sectionBg="bg-gradient-to-br from-slate-50 to-blue-50"
      />

      <APIEndpoints
        title="Core API Endpoints"
        description="Essential endpoints to get you started with the NectarStudio API."
        endpoints={apiEndpoints}
      />

      <GradientSection
        title="SDKs & Client Libraries"
        description="Use our official SDKs and client libraries to integrate faster in your favorite language."
        items={sdkLanguages}
        columns={4}
        gradient="from-purple-600 to-blue-600"
      />

      <CTASection
        title="Ready to Start Building?"
        description="Get your API key and start integrating NectarStudio.ai into your applications today. Full documentation and examples included."
        primaryButton={{
          text: 'Get API Key Free',
          icon: <ArrowRight className="w-5 h-5" />,
          onClick: () => navigate('/free-signup'),
          className: 'bg-blue-600 hover:bg-blue-700 text-white'
        }}
        secondaryButton={{
          text: 'View Documentation',
          onClick: () => window.open('https://docs.nectrastudio.ai/api', '_blank'),
          className: 'bg-white hover:bg-gray-100 text-gray-900'
        }}
        footerText="14-day free trial • Full API access • No credit card required"
      />
    </PageContainer>
  );
};

export default APIPage;