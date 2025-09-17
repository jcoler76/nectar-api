import React from 'react';

const PageContainer = ({
  children,
  bgColor = 'bg-gradient-to-br from-slate-50 to-blue-50'
}) => {
  return (
    <div className={`min-h-screen ${bgColor}`}>
      {children}
    </div>
  );
};

export default PageContainer;