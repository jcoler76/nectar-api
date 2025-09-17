import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow } from 'lucide-react';
import LegalLinks from './LegalLinks';

const Footer = () => {
  const navigate = useNavigate();
  return (
    <footer className="bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
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
              Automate, integrate, elevate — the modern platform that transforms how businesses operate and grow.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <button onClick={() => navigate('/features')}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  Features
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/integrations')}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  Integrations
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/security')}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  Security
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/api')}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  API
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <button onClick={() => {}}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  About
                </button>
              </li>
              <li>
                <button onClick={() => {}}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  Careers
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/contact')}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  Contact
                </button>
              </li>
              <li>
                <button onClick={() => {}}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  Blog
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-2 text-gray-600">
              <li>
                <button onClick={() => {}}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  Help Center
                </button>
              </li>
              <li>
                <button onClick={() => {}}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  Documentation
                </button>
              </li>
              <li>
                <button onClick={() => {}}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  Status
                </button>
              </li>
              <li>
                <button onClick={() => {}}
                        className="hover:text-gray-900 transition-colors text-left bg-transparent border-none cursor-pointer">
                  Community
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8 text-center space-y-2">
          <p className="text-gray-600">&copy; {new Date().getFullYear()} NectarStudio.ai. All rights reserved.</p>
          <div className="text-gray-600">
            <LegalLinks />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

