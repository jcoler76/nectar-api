import React from 'react';
import { useNavigate } from 'react-router-dom';

const LegalLinks = ({ className = '', separator = '|' }) => {
  const navigate = useNavigate();
  return (
    <span className={`text-gray-600 ${className}`}>
      <button
        onClick={() => navigate('/terms')}
        className="text-gray-600 hover:text-gray-900 underline bg-transparent border-none cursor-pointer mx-2"
      >
        Terms of Service
      </button>
      <span>{separator}</span>
      <button
        onClick={() => navigate('/privacy')}
        className="text-gray-600 hover:text-gray-900 underline bg-transparent border-none cursor-pointer mx-2"
      >
        Privacy Policy
      </button>
    </span>
  );
};

export default LegalLinks;

