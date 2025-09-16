import React from 'react';

const Copyright = ({ className = 'text-gray-600', additionalText = '' }) => {
  const currentYear = new Date().getFullYear();

  return (
    <p className={className}>
      &copy; {currentYear} NectarStudio.ai. All rights reserved.
      {additionalText && ` ${additionalText}`}
    </p>
  );
};

export default Copyright;
