import { Copy, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

export const ApiKeyDisplay = ({ apiKey, label = 'API Key', className = '' }) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="apiKey">{label}</Label>
      <div className="flex gap-2">
        <Input
          id="apiKey"
          type={showApiKey ? 'text' : 'password'}
          value={apiKey || ''}
          readOnly
          className="font-mono"
        />
        <Button variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={copyToClipboard}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      {copied && <p className="text-sm text-green-600">API key copied to clipboard!</p>}
    </div>
  );
};
