import { ChevronRight, Home } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Breadcrumbs = ({ customBreadcrumbs }) => {
  const location = useLocation();

  // Default breadcrumb mapping
  const breadcrumbMap = {
    '/': 'Home',
    '/home': 'Home',
    '/pricing': 'Pricing',
    '/security': 'Security',
    '/contact': 'Contact Sales',
    '/free-signup': 'Free Signup',
    '/privacy': 'Privacy Policy',
    '/checkout': 'Checkout',
    '/checkout/success': 'Success',
  };

  // Use custom breadcrumbs if provided, otherwise generate from path
  const getBreadcrumbs = () => {
    if (customBreadcrumbs) return customBreadcrumbs;

    const paths = location.pathname.split('/').filter(path => path);
    const breadcrumbs = [{ label: 'Home', path: '/' }];

    let currentPath = '';
    paths.forEach(path => {
      currentPath += `/${path}`;
      const label = breadcrumbMap[currentPath] || path.charAt(0).toUpperCase() + path.slice(1);
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Don't show breadcrumbs on home page
  if (location.pathname === '/' || location.pathname === '/home') {
    return null;
  }

  // Generate structured data for breadcrumbs
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      item: `https://nectarstudio.ai${crumb.path}`,
    })),
  };

  return (
    <>
      {/* Structured Data */}
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="flex items-center space-x-2 py-3 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.path} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 mx-2" aria-hidden="true" />
                )}
                {index === 0 && <Home className="w-4 h-4 text-gray-500 mr-1" aria-hidden="true" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900 font-medium" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  );
};

export default Breadcrumbs;
