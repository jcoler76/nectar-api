import React from 'react';
import { CheckCircle } from 'lucide-react';

const GradientSection = ({
  title,
  description,
  items,
  columns = 2,
  gradient = 'from-blue-600 to-purple-600',
  titleColor = 'text-white',
  descriptionColor = 'text-blue-100'
}) => {
  const gridCols = columns === 1 ? 'grid-cols-1' :
                   columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                   columns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
                   'grid-cols-1 md:grid-cols-2';

  return (
    <section className={`px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-r ${gradient}`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${titleColor}`}>
            {title}
          </h2>
          <p className={`text-xl max-w-3xl mx-auto ${descriptionColor}`}>
            {description}
          </p>
        </div>

        <div className={`grid ${gridCols} gap-8`}>
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20"
            >
              {item.badge && (
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${item.badge.bgColor} ${item.badge.textColor}`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {item.badge.text}
                </div>
              )}

              {item.icon && <div className="text-4xl mb-4">{item.icon}</div>}

              <h3 className="text-xl font-semibold text-white mb-4">{item.title}</h3>

              {item.description && (
                <p className={`mb-4 ${descriptionColor}`}>{item.description}</p>
              )}

              {item.status && (
                <div
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    item.status === 'Available'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {item.status === 'Available' && <CheckCircle className="w-3 h-3" />}
                  {item.status}
                </div>
              )}

              {item.items && (
                <ul className="space-y-3">
                  {item.items.map((subItem, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className={`text-sm ${descriptionColor}`}>{subItem}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GradientSection;