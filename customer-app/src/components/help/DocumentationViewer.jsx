import { Search, FileText, Folder, FolderOpen, ExternalLink } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

const DocumentationViewer = () => {
  const navigate = useNavigate();
  const { docId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
  const [isLoading, setIsLoading] = useState(false);

  // Mock documentation structure - in a real app, this would come from an API
  const documentationStructure = {
    'getting-started': {
      title: 'Getting Started',
      category: 'Basics',
      content: `# Getting Started

Welcome to the Nectar API platform! This guide will help you get up and running quickly.

## Quick Start

1. **Create an Account**: Sign up for your free account
2. **Generate API Keys**: Navigate to Settings > API Keys
3. **Make Your First Request**: Use our interactive API explorer

## Authentication

All API requests require authentication using your API key:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.nectar.com/v1/data
\`\`\`

## Next Steps

- [API Reference](/help/api)
- [SDK Documentation](/help/docs/sdks)
- [Examples](/help/docs/examples)
`,
      tags: ['basics', 'authentication', 'quickstart'],
    },
    'api-reference': {
      title: 'API Reference',
      category: 'API',
      content: `# API Reference

Complete reference for all Nectar API endpoints.

## Base URL
\`https://api.nectar.com/v1\`

## Authentication
Include your API key in the Authorization header:
\`Authorization: Bearer YOUR_API_KEY\`

## Endpoints

### GET /data
Retrieve data from your connected sources.

**Parameters:**
- \`limit\` (integer): Number of records to return (default: 100)
- \`offset\` (integer): Number of records to skip (default: 0)
- \`filter\` (string): Filter expression

**Response:**
\`\`\`json
{
  "data": [...],
  "meta": {
    "total": 1000,
    "limit": 100,
    "offset": 0
  }
}
\`\`\`

### POST /data
Create new data records.

### PUT /data/:id
Update existing data records.

### DELETE /data/:id
Delete data records.
`,
      tags: ['api', 'endpoints', 'reference', 'rest'],
    },
    'auto-rest': {
      title: 'Auto-REST Framework',
      category: 'Features',
      content: `# Auto-REST Framework

The Auto-REST framework automatically generates REST APIs from your database schemas.

## How It Works

1. **Connect Your Database**: Add your database connection
2. **Schema Discovery**: We automatically discover your tables and relationships
3. **API Generation**: RESTful endpoints are created automatically
4. **Customization**: Configure permissions, validation, and business logic

## Supported Databases

- PostgreSQL
- MySQL
- SQLite
- MongoDB
- SQL Server

## Generated Endpoints

For each table, we generate:
- \`GET /api/{table}\` - List records
- \`GET /api/{table}/{id}\` - Get single record
- \`POST /api/{table}\` - Create record
- \`PUT /api/{table}/{id}\` - Update record
- \`DELETE /api/{table}/{id}\` - Delete record

## Customization Options

- Field-level permissions
- Custom validation rules
- Business logic hooks
- Rate limiting
- Caching strategies
`,
      tags: ['auto-rest', 'database', 'api-generation', 'framework'],
    },
    'integrations': {
      title: 'Integrations',
      category: 'Features',
      content: `# Integrations

Connect Nectar with your existing tools and services.

## Supported Integrations

### Databases
- PostgreSQL
- MySQL
- MongoDB
- SQLite
- SQL Server

### Cloud Services
- AWS RDS
- Google Cloud SQL
- Azure Database

### Authentication
- OAuth 2.0
- SAML
- JWT
- API Keys

### Webhooks
Configure webhooks to receive real-time notifications:

\`\`\`json
{
  "url": "https://your-app.com/webhook",
  "events": ["data.created", "data.updated", "data.deleted"],
  "secret": "your-webhook-secret"
}
\`\`\`

## Setting Up Integrations

1. Navigate to Connections
2. Select your integration type
3. Provide connection details
4. Test the connection
5. Configure data sync settings
`,
      tags: ['integrations', 'webhooks', 'oauth', 'databases'],
    },
    'troubleshooting': {
      title: 'Troubleshooting',
      category: 'Support',
      content: `# Troubleshooting

Common issues and solutions.

## Authentication Issues

### Invalid API Key
- Verify your API key is correct
- Check if the key has expired
- Ensure proper formatting in headers

### Permission Denied
- Check your user role and permissions
- Verify endpoint access in your subscription plan

## Connection Issues

### Database Connection Failed
1. Verify connection parameters
2. Check firewall settings
3. Test connectivity from your network
4. Ensure database user has proper permissions

### Webhook Not Receiving Events
1. Verify webhook URL is accessible
2. Check SSL certificate validity
3. Review webhook secret configuration
4. Check webhook logs in dashboard

## Performance Issues

### Slow API Responses
- Review your query filters
- Consider adding database indexes
- Check rate limiting settings
- Monitor API usage dashboard

### Timeout Errors
- Increase request timeout
- Optimize database queries
- Consider pagination for large datasets

## Getting Help

If you're still experiencing issues:
1. Check our status page
2. Search existing support tickets
3. Contact support with error details
`,
      tags: ['troubleshooting', 'errors', 'debugging', 'support'],
    },
  };

  // Filter and search documents
  const filteredDocs = useMemo(() => {
    if (!searchTerm) return Object.entries(documentationStructure);

    const searchLower = searchTerm.toLowerCase();
    return Object.entries(documentationStructure).filter(([id, doc]) => {
      return (
        doc.title.toLowerCase().includes(searchLower) ||
        doc.content.toLowerCase().includes(searchLower) ||
        doc.category.toLowerCase().includes(searchLower) ||
        doc.tags.some(tag => tag.includes(searchLower))
      );
    });
  }, [searchTerm]);

  // Group documents by category
  const groupedDocs = useMemo(() => {
    const groups = {};
    filteredDocs.forEach(([id, doc]) => {
      if (!groups[doc.category]) {
        groups[doc.category] = [];
      }
      groups[doc.category].push([id, doc]);
    });
    return groups;
  }, [filteredDocs]);

  const handleDocSelect = (docId) => {
    setSelectedDoc(documentationStructure[docId]);
    navigate(`/help/docs/${docId}`);
  };

  const toggleFolder = (category) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedFolders(newExpanded);
  };

  // Load document if docId is in URL
  useEffect(() => {
    if (docId && documentationStructure[docId]) {
      setSelectedDoc(documentationStructure[docId]);
    }
  }, [docId]);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="p-4 h-[calc(100vh-8rem)] overflow-y-auto">
          {Object.entries(groupedDocs).map(([category, docs]) => (
            <div key={category} className="mb-4">
              <button
                onClick={() => toggleFolder(category)}
                className="flex items-center w-full text-left p-2 hover:bg-accent rounded-md"
              >
                {expandedFolders.has(category) ? (
                  <FolderOpen className="h-4 w-4 mr-2" />
                ) : (
                  <Folder className="h-4 w-4 mr-2" />
                )}
                <span className="font-medium">{category}</span>
                <Badge variant="secondary" className="ml-auto">
                  {docs.length}
                </Badge>
              </button>

              {expandedFolders.has(category) && (
                <div className="ml-6 mt-2 space-y-1">
                  {docs.map(([id, doc]) => (
                    <button
                      key={id}
                      onClick={() => handleDocSelect(id)}
                      className={cn(
                        'flex items-center w-full text-left p-2 rounded-md hover:bg-accent',
                        selectedDoc?.title === doc.title && 'bg-accent'
                      )}
                    >
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{doc.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredDocs.length === 0 && searchTerm && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No documentation found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedDoc ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedDoc.title}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{selectedDoc.category}</Badge>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedDoc.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {selectedDoc.content}
                </pre>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Select Documentation</h3>
              <p className="text-muted-foreground">
                Choose a document from the sidebar to view its contents
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentationViewer;