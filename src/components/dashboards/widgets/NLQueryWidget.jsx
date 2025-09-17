import { Sparkles } from 'lucide-react';
import React, { useState } from 'react';

import NaturalLanguageQuery from '../../analytics/NaturalLanguageQuery';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

const NLQueryWidget = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const handleQuerySuccess = result => {
    setHasResults(true);
    // Could trigger notifications or other UI updates here
  };

  if (!isExpanded) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              AI Analytics
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(true)}>
              Open
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Ask questions about your data in natural language and get instant insights.
          </p>
          <div className="mt-3 space-y-1">
            <div className="text-xs text-muted-foreground">Try asking:</div>
            <div className="text-xs">• "Show me API usage trends"</div>
            <div className="text-xs">• "How many active users?"</div>
            <div className="text-xs">• "Top performing workflows"</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} col-span-full`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            AI Analytics
            {hasResults && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
            Minimize
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <NaturalLanguageQuery onQuerySuccess={handleQuerySuccess} />
      </CardContent>
    </Card>
  );
};

export default NLQueryWidget;
