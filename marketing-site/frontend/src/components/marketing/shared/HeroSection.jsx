import React from 'react';

const HeroSection = ({
  badge,
  title,
  subtitle,
  description,
  primaryButton,
  secondaryButton,
  metrics,
  gradient = 'from-blue-600 to-purple-600'
}) => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pt-20 pb-16">
      <div className="max-w-7xl mx-auto text-center">
        {badge && (
          <div className="flex items-center justify-center mb-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${badge.bgColor} ${badge.textColor}`}>
              {badge.icon}
              <span className="font-semibold">{badge.text}</span>
            </div>
          </div>
        )}

        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
          {title && (
            <span className={`block text-transparent bg-clip-text bg-gradient-to-r ${gradient}`}>
              {title}
            </span>
          )}
          {subtitle && <span className="block">{subtitle}</span>}
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
          {description}
        </p>

        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto mb-10">
            {metrics.map((metric, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
                <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
                <div className="text-sm font-medium text-gray-700 mb-1">{metric.label}</div>
                <div className="text-xs text-gray-500">{metric.description}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {primaryButton && (
            <button
              onClick={primaryButton.onClick}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-xl flex items-center gap-2 justify-center ${primaryButton.className}`}
            >
              {primaryButton.text}
              {primaryButton.icon}
            </button>
          )}
          {secondaryButton && (
            <button
              onClick={secondaryButton.onClick}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-xl flex items-center gap-2 justify-center ${secondaryButton.className}`}
            >
              {secondaryButton.text}
              {secondaryButton.icon}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;