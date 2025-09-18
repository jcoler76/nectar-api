import React, { useState, useMemo } from 'react';
import { MapPin, Clock, DollarSign, Users, Rocket, Heart, Code, Globe, Search, Filter } from 'lucide-react';

const CareersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const openPositions = [
    {
      title: 'Senior Full-Stack Engineer',
      department: 'Engineering',
      location: 'Remote / Austin, TX',
      type: 'Full-time',
      salary: '$120k - $180k',
      description: 'Build and scale our core platform infrastructure with React, Node.js, and cloud technologies.',
      requirements: [
        '5+ years of full-stack development experience',
        'Expertise in React, Node.js, and PostgreSQL',
        'Experience with cloud platforms (AWS, Azure, GCP)',
        'Strong understanding of API design and microservices',
      ],
    },
    {
      title: 'DevOps Engineer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      salary: '$110k - $160k',
      description: 'Design and maintain our cloud infrastructure, CI/CD pipelines, and monitoring systems.',
      requirements: [
        '4+ years of DevOps/SRE experience',
        'Expertise in Docker, Kubernetes, and Infrastructure as Code',
        'Experience with monitoring tools (Grafana, Prometheus)',
        'Strong scripting skills (Python, Bash)',
      ],
    },
    {
      title: 'Product Manager',
      department: 'Product',
      location: 'Remote / San Francisco, CA',
      type: 'Full-time',
      salary: '$130k - $190k',
      description: 'Lead product strategy and roadmap for our automation platform and drive user experience.',
      requirements: [
        '4+ years of product management experience',
        'Experience with B2B SaaS products',
        'Strong analytical and data-driven mindset',
        'Excellent communication and stakeholder management skills',
      ],
    },
    {
      title: 'Enterprise Sales Manager',
      department: 'Sales',
      location: 'Remote / New York, NY',
      type: 'Full-time',
      salary: '$100k base + commission',
      description: 'Drive enterprise sales growth and build relationships with key accounts.',
      requirements: [
        '5+ years of enterprise B2B sales experience',
        'Experience selling technical products to IT decision makers',
        'Track record of exceeding sales quotas',
        'Strong presentation and negotiation skills',
      ],
    },
    {
      title: 'UI/UX Designer',
      department: 'Design',
      location: 'Remote',
      type: 'Full-time',
      salary: '$90k - $140k',
      description: 'Design intuitive user experiences for our platform and create beautiful, functional interfaces.',
      requirements: [
        '3+ years of UI/UX design experience',
        'Proficiency in Figma, Sketch, or similar tools',
        'Experience with design systems and component libraries',
        'Portfolio demonstrating B2B SaaS design experience',
      ],
    },
    {
      title: 'Customer Success Manager',
      department: 'Customer Success',
      location: 'Remote',
      type: 'Full-time',
      salary: '$70k - $110k',
      description: 'Ensure customer satisfaction, drive adoption, and help customers achieve their automation goals.',
      requirements: [
        '3+ years of customer success experience',
        'Technical background with ability to understand APIs',
        'Excellent communication and problem-solving skills',
        'Experience with SaaS platforms and workflow automation',
      ],
    },
    {
      title: 'Frontend Engineer',
      department: 'Engineering',
      location: 'Remote / Austin, TX',
      type: 'Full-time',
      salary: '$100k - $150k',
      description: 'Build responsive, accessible user interfaces and enhance the user experience of our platform.',
      requirements: [
        '3+ years of frontend development experience',
        'Expert knowledge of React, TypeScript, and modern CSS',
        'Experience with component libraries and design systems',
        'Understanding of web accessibility standards',
      ],
    },
    {
      title: 'Marketing Manager',
      department: 'Marketing',
      location: 'Remote / San Francisco, CA',
      type: 'Full-time',
      salary: '$80k - $120k',
      description: 'Drive growth through digital marketing campaigns, content strategy, and lead generation.',
      requirements: [
        '4+ years of B2B marketing experience',
        'Experience with marketing automation tools',
        'Strong analytical skills and data-driven approach',
        'Content creation and campaign management experience',
      ],
    },
    {
      title: 'Backend Engineer Intern',
      department: 'Engineering',
      location: 'Remote',
      type: 'Internship',
      salary: '$25 - $35/hour',
      description: 'Support backend development initiatives and learn from senior engineers.',
      requirements: [
        'Currently pursuing Computer Science degree',
        'Knowledge of Node.js, Python, or similar',
        'Understanding of databases and APIs',
        'Strong problem-solving skills',
      ],
    },
    {
      title: 'Data Analyst',
      department: 'Product',
      location: 'Remote / New York, NY',
      type: 'Contract',
      salary: '$60k - $90k',
      description: 'Analyze user behavior and platform metrics to drive product decisions.',
      requirements: [
        '2+ years of data analysis experience',
        'Proficiency in SQL and data visualization tools',
        'Experience with A/B testing and statistical analysis',
        'Strong communication skills',
      ],
    },
  ];

  const benefits = [
    {
      icon: <Heart className="h-8 w-8 text-red-500" />,
      title: 'Health & Wellness',
      description: 'Comprehensive health, dental, and vision insurance plus wellness stipend.',
    },
    {
      icon: <Globe className="h-8 w-8 text-blue-500" />,
      title: 'Remote-First Culture',
      description: 'Work from anywhere with flexible hours and collaboration tools.',
    },
    {
      icon: <Rocket className="h-8 w-8 text-purple-500" />,
      title: 'Professional Growth',
      description: 'Learning budget, conference attendance, and mentorship programs.',
    },
    {
      icon: <DollarSign className="h-8 w-8 text-green-500" />,
      title: 'Competitive Compensation',
      description: 'Market-rate salaries, equity packages, and performance bonuses.',
    },
    {
      icon: <Clock className="h-8 w-8 text-orange-500" />,
      title: 'Work-Life Balance',
      description: 'Unlimited PTO, flexible schedules, and mental health support.',
    },
    {
      icon: <Code className="h-8 w-8 text-indigo-500" />,
      title: 'Latest Technology',
      description: 'Work with cutting-edge tools and shape the future of automation.',
    },
  ];

  const companyValues = [
    {
      title: 'Innovation',
      description: 'We constantly push boundaries and embrace new technologies to solve complex problems.',
    },
    {
      title: 'Collaboration',
      description: 'We believe the best solutions come from diverse perspectives working together.',
    },
    {
      title: 'Customer Obsession',
      description: 'Every decision we make is centered around creating value for our customers.',
    },
    {
      title: 'Continuous Learning',
      description: 'We invest in our team\'s growth and encourage experimentation and learning.',
    },
  ];

  // Filter options
  const departments = ['all', ...new Set(openPositions.map(pos => pos.department))];
  const locations = ['all', ...new Set(openPositions.map(pos => pos.location.split(' / ')[0]))];
  const types = ['all', ...new Set(openPositions.map(pos => pos.type))];

  // Filtered positions
  const filteredPositions = useMemo(() => {
    return openPositions.filter(position => {
      const matchesSearch = position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          position.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = selectedDepartment === 'all' || position.department === selectedDepartment;
      const matchesLocation = selectedLocation === 'all' || position.location.includes(selectedLocation);
      const matchesType = selectedType === 'all' || position.type === selectedType;

      return matchesSearch && matchesDepartment && matchesLocation && matchesType;
    });
  }, [searchTerm, selectedDepartment, selectedLocation, selectedType, openPositions]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('all');
    setSelectedLocation('all');
    setSelectedType('all');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Join Our Mission
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-8">
              Help us transform how businesses build, deploy, and scale automation solutions.
              Join a team of passionate innovators building the future of enterprise automation.
            </p>
            <div className="flex justify-center space-x-8 text-sm text-gray-500">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">Remote-First</div>
                <div>Global Team</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">Fast Growth</div>
                <div>Expanding Team</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">Impact</div>
                <div>Shape the Future</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Join Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Work at NectarStudio.ai?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're not just building software – we're revolutionizing how businesses operate
              and helping companies worldwide achieve their automation goals.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Make a Real Impact
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    Work on products that directly impact thousands of businesses
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    Shape the architecture and direction of our platform
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    Collaborate with industry experts and thought leaders
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    Drive innovation in AI, automation, and enterprise software
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Our Values</h3>
              <div className="space-y-4">
                {companyValues.map((value, index) => (
                  <div key={index}>
                    <h4 className="font-semibold text-gray-900">{value.title}</h4>
                    <p className="text-sm text-gray-600">{value.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Benefits & Perks
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We believe in taking care of our team with comprehensive benefits
              and a supportive work environment.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  {benefit.icon}
                  <h3 className="text-xl font-semibold text-gray-900 ml-3">
                    {benefit.title}
                  </h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions Section with Search and Filters */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Open Positions
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join our growing team and help shape the future of business automation.
              All positions are open to remote candidates.
            </p>
          </div>

          {/* Search and Filter Controls */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search Bar */}
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search positions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Department Filter */}
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>

              {/* Location Filter */}
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {locations.map(location => (
                  <option key={location} value={location}>
                    {location === 'all' ? 'All Locations' : location}
                  </option>
                ))}
              </select>

              {/* Job Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {types.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Filters and Clear Button */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {filteredPositions.length} of {openPositions.length} positions
              </div>
              {(searchTerm || selectedDepartment !== 'all' || selectedLocation !== 'all' || selectedType !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Positions List */}
          <div className="space-y-8">
            {filteredPositions.length > 0 ? (
              filteredPositions.map((position, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {position.title}
                      </h3>
                      <div className="flex flex-wrap items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {position.department}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {position.location}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {position.type}
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {position.salary}
                        </div>
                      </div>
                    </div>
                    <button className="mt-4 lg:mt-0 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                      Apply Now
                    </button>
                  </div>
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    {position.description}
                  </p>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Key Requirements:</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {position.requirements.map((requirement, reqIndex) => (
                        <li key={reqIndex} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                          <span className="text-gray-600 text-sm">{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No positions found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your search criteria or filters.</p>
                <button
                  onClick={clearFilters}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Don't See Your Role Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Don't See Your Perfect Role?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            We're always looking for exceptional talent to join our team.
            If you're passionate about automation and innovation, we'd love to hear from you.
          </p>
          <button className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg">
            Send Us Your Resume
          </button>
        </div>
      </section>

      {/* Application Process Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Application Process
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We've designed our interview process to be transparent, respectful of your time,
              and focused on mutual fit.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Application</h3>
              <p className="text-gray-600 text-sm">
                Submit your resume and cover letter through our careers page.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone Screen</h3>
              <p className="text-gray-600 text-sm">
                Initial conversation with our recruiting team to discuss your background.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Technical Interview</h3>
              <p className="text-gray-600 text-sm">
                Technical discussion or coding exercise with team members.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Final Interview</h3>
              <p className="text-gray-600 text-sm">
                Meet with leadership and discuss culture fit and long-term goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Make an Impact?
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
            Join our mission to democratize enterprise automation and help businesses
            worldwide transform their operations.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              View Open Positions
            </button>
            <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Learn More About Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CareersPage;