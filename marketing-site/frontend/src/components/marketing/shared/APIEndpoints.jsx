import React from 'react';

const APIEndpoints = ({
  title,
  description,
  endpoints
}) => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {title}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {endpoints.map((endpoint, index) => (
            <div
              key={index}
              className="bg-gray-50 hover:bg-white p-6 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center gap-4 mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    endpoint.method === 'GET'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {endpoint.method}
                </span>
                <code className="text-gray-800 font-mono text-sm">{endpoint.endpoint}</code>
              </div>
              <p className="text-gray-600 text-sm">{endpoint.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default APIEndpoints;