import { Search, FileText, ExternalLink, Clock, Tag } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

const HelpSearch = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHistory, setSearchHistory] = useState(['API authentication', 'database connection', 'webhooks']);

  // This would normally come from your documentation API
  const searchableContent = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      category: 'Basics',
      snippet: 'Welcome to the Nectar API platform! This guide will help you get up and running quickly.',
      tags: ['basics', 'authentication', 'quickstart'],
      lastUpdated: '2024-01-15',
      type: 'documentation',
      url: '/help/docs/getting-started',
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      category: 'API',
      snippet: 'Complete reference for all Nectar API endpoints. Includes authentication, parameters, and examples.',
      tags: ['api', 'endpoints', 'reference', 'rest'],
      lastUpdated: '2024-01-10',
      type: 'documentation',
      url: '/help/docs/api-reference',
    },
    {
      id: 'auto-rest',
      title: 'Auto-REST Framework',
      category: 'Features',
      snippet: 'Automatically generate REST APIs from your database schemas with full CRUD operations.',
      tags: ['auto-rest', 'database', 'api-generation', 'framework'],
      lastUpdated: '2024-01-08',
      type: 'documentation',
      url: '/help/docs/auto-rest',
    },
    {
      id: 'integrations',
      title: 'Integrations',
      category: 'Features',
      snippet: 'Connect Nectar with your existing tools and services including databases, cloud services, and webhooks.',
      tags: ['integrations', 'webhooks', 'oauth', 'databases'],
      lastUpdated: '2024-01-05',
      type: 'documentation',
      url: '/help/docs/integrations',
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      category: 'Support',
      snippet: 'Common issues and solutions for authentication, connections, performance, and debugging.',
      tags: ['troubleshooting', 'errors', 'debugging', 'support'],
      lastUpdated: '2024-01-12',
      type: 'documentation',
      url: '/help/docs/troubleshooting',
    },
    // Example FAQ entries
    {
      id: 'faq-1',
      title: 'How do I generate an API key?',
      category: 'FAQ',
      snippet: 'Navigate to Settings > API Keys and click "Generate New Key". Make sure to copy and store it securely.',
      tags: ['api-key', 'authentication', 'settings'],
      lastUpdated: '2024-01-14',
      type: 'faq',
      url: '/help/faq#api-keys',
    },
    {
      id: 'faq-2',
      title: 'What databases are supported?',
      category: 'FAQ',
      snippet: 'We support PostgreSQL, MySQL, MongoDB, SQLite, and SQL Server. Cloud databases are also supported.',
      tags: ['databases', 'connections', 'supported'],
      lastUpdated: '2024-01-13',
      type: 'faq',
      url: '/help/faq#databases',
    },
  ];

  // Filter search results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const searchLower = searchTerm.toLowerCase();
    return searchableContent
      .filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.snippet.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.includes(searchLower))
      )
      .sort((a, b) => {
        // Prioritize title matches
        const aTitle = a.title.toLowerCase().includes(searchLower);
        const bTitle = b.title.toLowerCase().includes(searchLower);
        if (aTitle && !bTitle) return -1;
        if (!aTitle && bTitle) return 1;

        // Then by last updated
        return new Date(b.lastUpdated) - new Date(a.lastUpdated);
      });
  }, [searchTerm]);

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.trim() && !searchHistory.includes(term)) {
      setSearchHistory(prev => [term, ...prev.slice(0, 4)]);
    }
  };

  const highlightText = (text, searchTerm) => {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ?
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">{part}</mark> :
        part
    );
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'documentation':
        return FileText;
      case 'faq':
        return ExternalLink;
      default:
        return FileText;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Help & Documentation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for help topics, API endpoints, troubleshooting..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-12 text-lg"
              autoFocus
            />
          </div>

          {/* Search History */}
          {!searchTerm && searchHistory.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Recent searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((term, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchTerm(term)}
                    className="text-xs"
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchTerm && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchTerm}"
            </h2>
            {searchResults.length > 0 && (
              <Badge variant="outline">
                Found in {new Set(searchResults.map(r => r.category)).size} categories
              </Badge>
            )}
          </div>

          {searchResults.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms or browse our documentation categories
                </p>
                <div className="flex justify-center space-x-2">
                  <Button onClick={() => navigate('/help/docs')}>
                    Browse Documentation
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/help/api')}>
                    API Reference
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {searchResults.map((result) => {
                const Icon = getTypeIcon(result.type);
                return (
                  <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4" onClick={() => navigate(result.url)}>
                      <div className="flex items-start space-x-3">
                        <Icon className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-base">
                              {highlightText(result.title, searchTerm)}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {result.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {result.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {highlightText(result.snippet, searchTerm)}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Tag className="h-3 w-3" />
                              <span>{result.tags.slice(0, 3).join(', ')}</span>
                              {result.tags.length > 3 && <span>+{result.tags.length - 3} more</span>}
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Updated {new Date(result.lastUpdated).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Links */}
      {!searchTerm && (
        <Card>
          <CardHeader>
            <CardTitle>Popular Help Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => handleSearch('API authentication')}
              >
                <div className="text-left">
                  <div className="font-semibold">API Authentication</div>
                  <div className="text-sm text-muted-foreground">Learn how to authenticate with our API</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => handleSearch('database connection')}
              >
                <div className="text-left">
                  <div className="font-semibold">Database Connections</div>
                  <div className="text-sm text-muted-foreground">Connect your databases to Nectar</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => handleSearch('webhooks')}
              >
                <div className="text-left">
                  <div className="font-semibold">Webhooks</div>
                  <div className="text-sm text-muted-foreground">Set up real-time notifications</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => handleSearch('troubleshooting')}
              >
                <div className="text-left">
                  <div className="font-semibold">Troubleshooting</div>
                  <div className="text-sm text-muted-foreground">Common issues and solutions</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HelpSearch;