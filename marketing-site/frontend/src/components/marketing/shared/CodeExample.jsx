import React, { useState } from 'react';
import { Code, Copy, CheckCircle } from 'lucide-react';

const CodeExample = ({
  title,
  code,
  language = 'javascript'
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-12 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-2xl p-8 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Code className="w-6 h-6 text-blue-400" />
              <span className="text-blue-400 font-semibold">{title}</span>
            </div>
            <button
              onClick={() => copyToClipboard(code)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg transition-colors"
            >
              {copiedCode ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiedCode ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="text-gray-300 text-sm leading-relaxed overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};

export default CodeExample;