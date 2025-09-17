import { Send, Sparkles, Clock, Database, TrendingUp } from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';

import QueryResultsViz from './QueryResultsViz';

const NaturalLanguageQuery = ({ onQuerySuccess }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);

  const suggestedQueries = [
    'Show me API usage trends for the last 7 days',
    'How many active users do we have?',
    'What are the top performing workflows?',
    'Show me error rates by service',
    'Display subscription usage metrics',
  ];

  const handleSubmit = useCallback(
    async e => {
      e.preventDefault();
      if (!query.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/nl-query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ query: query.trim() }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Query failed');
        }

        if (data.success) {
          const queryResult = data.data;
          setResult(queryResult);

          // Add to history
          const historyItem = {
            id: Date.now(),
            query: query.trim(),
            timestamp: new Date(),
            result: queryResult,
          };
          setQueryHistory(prev => [historyItem, ...prev.slice(0, 4)]); // Keep last 5

          // Clear input
          setQuery('');

          // Notify parent if callback provided
          if (onQuerySuccess) {
            onQuerySuccess(queryResult);
          }
        } else {
          throw new Error(data.error || 'Query processing failed');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [query, isLoading, onQuerySuccess]
  );

  const handleSuggestionClick = useCallback(suggestion => {
    setQuery(suggestion);
  }, []);

  const handleHistoryClick = useCallback(historyItem => {
    setResult(historyItem.result);
  }, []);

  return (
    <div className="space-y-6">
      {/* Query Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Natural Language Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask a question about your data... (e.g., 'Show me top users')"
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!query.trim() || isLoading} className="px-4">
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Suggested Queries */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query History */}
      {queryHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              Recent Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {queryHistory.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleHistoryClick(item)}
                >
                  <span className="text-sm truncate flex-1">{item.query}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                <span className="text-sm text-muted-foreground">Processing your query...</span>
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {result && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Query Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Query Info */}
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="font-medium">Original Query:</span>
                <span className="text-sm">{result.nlQuery}</span>
              </div>
              {result.explanation && (
                <p className="text-sm text-muted-foreground">{result.explanation}</p>
              )}
            </div>

            {/* Generated Query Display */}
            {result.generatedQuery && (
              <details className="border rounded-lg">
                <summary className="p-3 cursor-pointer hover:bg-muted">
                  <span className="font-medium">Generated Query ({result.queryType})</span>
                </summary>
                <div className="p-3 border-t bg-gray-50">
                  <pre className="text-sm font-mono overflow-x-auto">{result.generatedQuery}</pre>
                </div>
              </details>
            )}

            {/* Execution Error */}
            {result.executionError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Query generated but execution failed: {result.executionError}
                </AlertDescription>
              </Alert>
            )}

            {/* Results Visualization */}
            {result.actualResult && (
              <QueryResultsViz
                data={result.actualResult}
                visualization={result.visualization}
                query={result.nlQuery}
              />
            )}

            {/* Sample Result when no actual data */}
            {!result.actualResult && result.sampleResult && (
              <div className="space-y-2">
                <p className="font-medium">Expected Result Format:</p>
                <pre className="text-sm bg-gray-50 p-3 rounded border overflow-x-auto">
                  {JSON.stringify(result.sampleResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NaturalLanguageQuery;
