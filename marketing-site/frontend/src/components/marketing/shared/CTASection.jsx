import React from 'react';

const CTASection = ({
  title,
  description,
  primaryButton,
  secondaryButton,
  footerText,
  bgColor = 'bg-gray-900',
  titleColor = 'text-white',
  descriptionColor = 'text-gray-300',
  footerTextColor = 'text-gray-400'
}) => {
  return (
    <section className={`px-4 sm:px-6 lg:px-8 py-20 ${bgColor}`}>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${titleColor}`}>
          {title}
        </h2>
        <p className={`text-xl mb-10 ${descriptionColor}`}>
          {description}
        </p>
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
        {footerText && (
          <p className={`mt-6 ${footerTextColor}`}>
            {footerText}
          </p>
        )}
      </div>
    </section>
  );
};

export default CTASection;