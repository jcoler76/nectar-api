import React from 'react';
import { X } from 'lucide-react';
import DemoRequestForm from './DemoRequestForm';

const DemoRequestModal = ({ isOpen, onClose, source }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg mx-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Content */}
          <div className="p-6">
            <DemoRequestForm onClose={onClose} source={source} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoRequestModal;