import { CheckCircle, Copy, ExternalLink, Eye, FileText, Play, Send, Zap } from 'lucide-react';
import React, { useState } from 'react';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

import RealtimeApiDemo from './RealtimeApiDemo';

const GeneratedApiExplorer = ({ apis, serviceName }) => {
  const [selectedApi, setSelectedApi] = useState(apis?.[0] || null);
  const [testResponse, setTestResponse] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testMethod, setTestMethod] = useState('GET');
  const [testUrl, setTestUrl] = useState('');
  const [testBody, setTestBody] = useState('');
  const [queryParams, setQueryParams] = useState('');

  React.useEffect(() => {
    if (selectedApi) {
      setTestUrl(selectedApi.endpoint);
    }
  }, [selectedApi]);

  const handleApiTest = async () => {
    if (!testUrl) return;

    setTestLoading(true);
    setTestResponse('');

    try {
      const url = queryParams ? `${testUrl}?${queryParams}` : testUrl;
      const options = {
        method: testMethod,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': localStorage.getItem('apiKey') || '',
        },
      };

      if (testMethod !== 'GET' && testBody) {
        options.body = testBody;
      }

      const response = await fetch(url, options);
      const data = await response.json();

      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setTestResponse(`Error: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleCopyUrl = url => {
    navigator.clipboard.writeText(url);
  };

  const generateCurlCommand = () => {
    if (!testUrl) return '';

    const url = queryParams ? `${testUrl}?${queryParams}` : testUrl;
    let curl = `curl -X ${testMethod} "${url}"`;
    curl += ` -H "X-API-Key: YOUR_API_KEY"`;
    curl += ` -H "Content-Type: application/json"`;

    if (testMethod !== 'GET' && testBody) {
      curl += ` -d '${testBody}'`;
    }

    return curl;
  };

  if (!apis || apis.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No APIs Generated Yet</h3>
            <p className="text-muted-foreground">
              Go back to the previous step to generate some APIs first.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          🎉 Successfully generated {apis.length} REST API{apis.length > 1 ? 's' : ''}! Your APIs
          are now live and ready to use.
        </AlertDescription>
      </Alert>

      {/* API Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Explore Your Generated APIs
          </CardTitle>
          <CardDescription>Test and explore your newly created REST endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Select API to explore:</Label>
              <Select
                value={selectedApi?.id?.toString() || ''}
                onValueChange={value => {
                  const api = apis.find(a => a.id?.toString() === value);
                  setSelectedApi(api);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an API..." />
                </SelectTrigger>
                <SelectContent>
                  {apis.map(api => (
                    <SelectItem key={api.id} value={api.id?.toString()}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {api.name}
                        <span className="text-muted-foreground">({api.pathSlug})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* API Overview */}
            {selectedApi && (
              <div className="grid gap-3 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{selectedApi.name}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyUrl(selectedApi.endpoint)}
                    className="flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy URL
                  </Button>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Base Endpoint:</span>
                  <code className="ml-2 px-2 py-1 bg-background rounded text-xs">
                    {selectedApi.endpoint}
                  </code>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Available Operations:</span>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-mono">
                        GET
                      </span>
                      <code className="text-xs">{selectedApi.endpoint}</code>
                      <span className="text-muted-foreground text-xs">- List records</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-mono">
                        GET
                      </span>
                      <code className="text-xs">{selectedApi.endpoint}/&#123;id&#125;</code>
                      <span className="text-muted-foreground text-xs">- Get single record</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-mono">
                        GET
                      </span>
                      <code className="text-xs">{selectedApi.endpoint}/_count</code>
                      <span className="text-muted-foreground text-xs">- Get total count</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-mono">
                        GET
                      </span>
                      <code className="text-xs">{selectedApi.endpoint}/_schema</code>
                      <span className="text-muted-foreground text-xs">- Get table schema</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Testing Interface */}
      {selectedApi && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Test & Explore APIs
            </CardTitle>
            <CardDescription>
              Try out your API with different parameters and explore real-time capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="test" className="space-y-4">
              <TabsList>
                <TabsTrigger value="test">API Tester</TabsTrigger>
                <TabsTrigger value="realtime">
                  <Zap className="h-4 w-4 mr-1" />
                  Real-time Demo
                </TabsTrigger>
                <TabsTrigger value="curl">cURL Command</TabsTrigger>
                <TabsTrigger value="docs">Quick Docs</TabsTrigger>
              </TabsList>

              <TabsContent value="test" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <Select value={testMethod} onValueChange={setTestMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Endpoint</Label>
                      <Input
                        value={testUrl}
                        onChange={e => setTestUrl(e.target.value)}
                        placeholder="API endpoint URL..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Query Parameters (optional)</Label>
                    <Input
                      value={queryParams}
                      onChange={e => setQueryParams(e.target.value)}
                      placeholder="page=1&pageSize=10&fields=id,name&filter=status:active"
                    />
                    <div className="text-xs text-muted-foreground">
                      Example: page=1&pageSize=10&fields=id,name&filter=status:active
                    </div>
                  </div>

                  {testMethod !== 'GET' && (
                    <div className="space-y-2">
                      <Label>Request Body (JSON)</Label>
                      <Textarea
                        value={testBody}
                        onChange={e => setTestBody(e.target.value)}
                        placeholder='{"key": "value"}'
                        rows={4}
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleApiTest}
                    disabled={testLoading || !testUrl}
                    className="flex items-center gap-2"
                  >
                    {testLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Request
                      </>
                    )}
                  </Button>

                  {testResponse && (
                    <div className="space-y-2">
                      <Label>Response</Label>
                      <Textarea
                        value={testResponse}
                        readOnly
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="realtime" className="space-y-4">
                <RealtimeApiDemo apis={apis} serviceName={serviceName} />
              </TabsContent>

              <TabsContent value="curl" className="space-y-4">
                <div className="space-y-2">
                  <Label>cURL Command</Label>
                  <div className="relative">
                    <Textarea
                      value={generateCurlCommand()}
                      readOnly
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => navigator.clipboard.writeText(generateCurlCommand())}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="docs" className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <h4>Available Query Parameters</h4>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <code>page</code> - Page number for pagination (default: 1)
                    </li>
                    <li>
                      <code>pageSize</code> - Records per page (default: 25, max: 200)
                    </li>
                    <li>
                      <code>fields</code> - Comma-separated list of fields to include
                    </li>
                    <li>
                      <code>sort</code> - Sort field and direction (e.g., "name:asc",
                      "created_at:desc")
                    </li>
                    <li>
                      <code>filter</code> - Filter conditions (e.g., "status:active", "age:&gt;18")
                    </li>
                  </ul>

                  <h4>Response Format</h4>
                  <pre className="text-xs bg-muted p-3 rounded">
                    {`{
  "data": [...],
  "page": 1,
  "pageSize": 25,
  "total": 100,
  "hasNext": true
}`}
                  </pre>

                  <h4>Authentication</h4>
                  <p className="text-sm">
                    Include your API key in the <code>X-API-Key</code> header for all requests.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              variant="outline"
              className="flex items-center gap-2 p-4 h-auto"
              onClick={() => window.open('/api/documentation', '_blank')}
            >
              <FileText className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">View Full Documentation</div>
                <div className="text-sm text-muted-foreground">
                  Complete API reference and guides
                </div>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2 p-4 h-auto"
              onClick={() => window.location.reload()}
            >
              <Play className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Generate More APIs</div>
                <div className="text-sm text-muted-foreground">Discover and expose more tables</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneratedApiExplorer;
