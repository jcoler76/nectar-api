import React from 'react';
import { CheckCircle } from 'lucide-react';

const FeatureGrid = ({
  title,
  description,
  features,
  columns = 2,
  bgColor = 'bg-white',
  sectionBg = 'bg-white'
}) => {
  const gridCols = columns === 1 ? 'grid-cols-1' :
                   columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                   'grid-cols-1 lg:grid-cols-2';

  return (
    <section className={`px-4 sm:px-6 lg:px-8 py-20 ${sectionBg}`}>
      <div className="max-w-7xl mx-auto">
        {(title || description) && (
          <div className="text-center mb-16">
            {title && (
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {description}
              </p>
            )}
          </div>
        )}

        <div className={`grid ${gridCols} gap-8`}>
          {features.map((feature, index) => (
            <div
              key={index}
              className={`${bgColor} hover:bg-white p-8 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300`}
            >
              {feature.badge && (
                <div className="flex items-center justify-between mb-6">
                  <div>{feature.icon}</div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${feature.badge.bgColor} ${feature.badge.textColor}`}>
                    {feature.badge.text}
                  </div>
                </div>
              )}

              {!feature.badge && feature.icon && (
                <div className="mb-6">{feature.icon}</div>
              )}

              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>

              {feature.details && (
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              )}

              {feature.tags && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {feature.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;