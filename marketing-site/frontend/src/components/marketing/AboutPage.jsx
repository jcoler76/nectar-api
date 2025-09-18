import React from 'react';
import { Users, Target, Award, Globe, Zap, Heart } from 'lucide-react';

const AboutPage = () => {
  const teamMembers = [
    {
      name: 'Jestin Coler',
      role: 'Founder & CEO',
      bio: 'Visionary entrepreneur with extensive experience in enterprise automation and API development.',
      image: '/api/placeholder/150/150',
    },
    {
      name: 'Engineering Team',
      role: 'Core Development',
      bio: 'World-class engineers building the future of business automation.',
      image: '/api/placeholder/150/150',
    },
    {
      name: 'Product Team',
      role: 'Product Strategy',
      bio: 'User-focused product experts ensuring every feature delivers real value.',
      image: '/api/placeholder/150/150',
    },
  ];

  const milestones = [
    {
      year: '2023',
      title: 'Company Founded',
      description: 'NectarStudio.ai was founded with a vision to democratize enterprise automation.',
    },
    {
      year: '2024',
      title: 'Platform Launch',
      description: 'Launched our comprehensive BaaS platform with advanced workflow automation.',
    },
    {
      year: '2024',
      title: 'Enterprise Growth',
      description: 'Expanded to serve enterprise clients with mission-critical automation needs.',
    },
    {
      year: '2025',
      title: 'AI Integration',
      description: 'Integrated advanced AI capabilities for intelligent business process automation.',
    },
  ];

  const values = [
    {
      icon: <Zap className="h-8 w-8 text-blue-600" />,
      title: 'Innovation First',
      description: 'We push the boundaries of what\'s possible in business automation technology.',
    },
    {
      icon: <Heart className="h-8 w-8 text-red-600" />,
      title: 'Customer Success',
      description: 'Your success is our success. We build tools that truly transform businesses.',
    },
    {
      icon: <Globe className="h-8 w-8 text-green-600" />,
      title: 'Global Impact',
      description: 'Making enterprise-grade automation accessible to businesses worldwide.',
    },
    {
      icon: <Award className="h-8 w-8 text-purple-600" />,
      title: 'Excellence',
      description: 'We maintain the highest standards in security, performance, and reliability.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              About NectarStudio.ai
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-8">
              We're transforming how businesses build, deploy, and scale automation solutions
              with our comprehensive Backend-as-a-Service platform.
            </p>
            <div className="flex justify-center space-x-8 text-sm text-gray-500">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">500+</div>
                <div>Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">10M+</div>
                <div>API Calls/Month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">99.9%</div>
                <div>Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                We believe every business should have access to enterprise-grade automation
                capabilities without the complexity and cost traditionally associated with such systems.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                NectarStudio.ai democratizes advanced backend services, workflow automation,
                and AI-powered business intelligence, enabling companies of all sizes to
                compete and thrive in the digital economy.
              </p>
              <div className="flex items-center space-x-4">
                <Target className="h-12 w-12 text-blue-600" />
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Our Goal</h3>
                  <p className="text-gray-600">
                    Eliminate the barriers between great ideas and successful implementations.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Why We Exist</h3>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    Traditional backend development is too slow and expensive
                  </p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    Business automation should be accessible to everyone
                  </p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    AI and automation are the future of competitive advantage
                  </p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    Security and compliance shouldn't be afterthoughts
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Core Values
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide everything we do and every decision we make.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  {value.icon}
                  <h3 className="text-xl font-semibold text-gray-900 ml-3">
                    {value.title}
                  </h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Journey
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From a vision to transform business automation to a platform trusted by companies worldwide.
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-px h-full w-0.5 bg-gray-200"></div>
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`relative flex items-center ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <div className={`w-full max-w-sm ${index % 2 === 0 ? 'pr-8' : 'pl-8'}`}>
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="text-sm font-semibold text-blue-600 mb-1">
                        {milestone.year}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-gray-600">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-600 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The passionate individuals building the future of business automation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-white rounded-xl p-8 text-center shadow-sm">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {member.name}
                </h3>
                <p className="text-blue-600 font-medium mb-3">
                  {member.role}
                </p>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
            Join hundreds of companies already using NectarStudio.ai to automate
            their operations and accelerate growth.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              Start Free Trial
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;