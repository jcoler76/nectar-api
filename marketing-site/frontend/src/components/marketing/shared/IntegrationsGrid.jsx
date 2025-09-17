import React from 'react';

const IntegrationsGrid = ({
  title,
  description,
  integrations,
  columns = 6
}) => {
  const gridCols = columns === 4 ? 'grid-cols-2 md:grid-cols-4' :
                   columns === 6 ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6' :
                   'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-12 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>

        <div className={`grid ${gridCols} gap-6`}>
          {integrations.map((integration, index) => (
            <div
              key={index}
              className="bg-gray-50 hover:bg-white p-6 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 text-center"
            >
              <div className="text-4xl mb-3">{integration.logo}</div>
              <div className="font-semibold text-gray-900 text-sm mb-1">{integration.name}</div>
              <div className="text-xs text-gray-500">{integration.category}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IntegrationsGrid;