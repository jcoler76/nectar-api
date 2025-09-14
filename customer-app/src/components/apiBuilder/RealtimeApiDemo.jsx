import { Activity, Database, Settings, Wifi, WifiOff, Zap } from 'lucide-react';
import React, { useState } from 'react';

import { useRealtimeData, useRealtimeList } from '../../hooks/useRealtimeData'; // eslint-disable-line no-unused-vars
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const RealtimeApiDemo = ({ apis, serviceName }) => {
  const [selectedApi, setSelectedApi] = useState(apis?.[0] || null);
  const [demoMode, setDemoMode] = useState('polling'); // 'polling' or 'triggers'
  const [isEnabled, setIsEnabled] = useState(false);

  // Real-time data hook
  const { data, isConnected, isLoading, error, realtimeEnabled, connectionMethod, refetch } =
    useRealtimeData(selectedApi?.endpoint, {
      filters: { pageSize: 10 },
      enableDatabaseTriggers: demoMode === 'triggers',
      enabled: isEnabled && selectedApi !== null,
    });

  const handleStartDemo = () => {
    if (!selectedApi) return;
    setIsEnabled(true);
  };

  const handleStopDemo = () => {
    setIsEnabled(false);
  };

  if (!apis || apis.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No APIs Available</h3>
            <p className="text-muted-foreground">
              Generate some APIs first to see real-time capabilities in action.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Real-time API Demo
          </CardTitle>
          <CardDescription>
            Experience live data synchronization with your generated APIs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select API to demonstrate:</label>
              <Select
                value={selectedApi?.id?.toString() || ''}
                onValueChange={value => {
                  const api = apis.find(a => a.id?.toString() === value);
                  setSelectedApi(api);
                  setIsEnabled(false); // Reset demo when changing API
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an API..." />
                </SelectTrigger>
                <SelectContent>
                  {apis.map(api => (
                    <SelectItem key={api.id} value={api.id?.toString()}>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        {api.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Real-time method:</label>
              <Select value={demoMode} onValueChange={setDemoMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="polling">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Polling (Default - Safe)
                    </div>
                  </SelectItem>
                  <SelectItem value="triggers">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Database Triggers (Advanced)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Demo Controls */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {connectionMethod && (
                  <span className="text-xs bg-secondary px-2 py-1 rounded">{connectionMethod}</span>
                )}
              </div>

              {selectedApi && (
                <div className="text-sm text-muted-foreground">{selectedApi.endpoint}</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={refetch} variant="outline" size="sm" disabled={!selectedApi}>
                Refresh
              </Button>
              {!isEnabled ? (
                <Button
                  onClick={handleStartDemo}
                  disabled={!selectedApi}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Start Real-time
                </Button>
              ) : (
                <Button
                  onClick={handleStopDemo}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  Stop Demo
                </Button>
              )}
            </div>
          </div>

          {/* Method Explanation */}
          {demoMode === 'triggers' && (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                <strong>Database Triggers Mode:</strong> This creates database triggers on your
                client's database for instant updates. Only use this if you have explicit permission
                to modify the client's database schema.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Demo Content */}
      {selectedApi && (
        <Tabs defaultValue="data" className="space-y-4">
          <TabsList>
            <TabsTrigger value="data">Live Data</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="code">Integration Code</TabsTrigger>
          </TabsList>

          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Live Data Stream</span>
                  <div className="flex items-center gap-2">
                    {realtimeEnabled && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs text-green-600">LIVE</span>
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground">{data.length} records</span>
                  </div>
                </CardTitle>
                <CardDescription>
                  Data updates automatically when changes occur in the database
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>Error: {error}</AlertDescription>
                  </Alert>
                ) : isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="ml-2">Loading data...</span>
                  </div>
                ) : data.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No data available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                      {data.map((record, index) => (
                        <div
                          key={record.id || index}
                          className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              {record.id ? `ID: ${record.id}` : `Record ${index + 1}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Object.keys(record).length} fields
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(record, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Activity</CardTitle>
                <CardDescription>Monitor connection status and data updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                    <span>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className={`w-2 h-2 rounded-full ${realtimeEnabled ? 'bg-blue-500' : 'bg-gray-400'}`}
                    />
                    <span>Real-time Updates: {realtimeEnabled ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Method: {connectionMethod || 'None'}</span>
                  </div>
                  {selectedApi && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>Endpoint: {selectedApi.endpoint}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="code">
            <Card>
              <CardHeader>
                <CardTitle>Integration Code</CardTitle>
                <CardDescription>
                  Copy this code to integrate real-time data into your application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">React Hook Usage:</h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {`import { useRealtimeList } from './hooks/useRealtimeData';

function MyComponent() {
  const { data, isConnected, isLoading, error } = useRealtimeList(
    '${selectedApi?.endpoint || '/api/v2/service/_table/entity'}',
    { pageSize: 10, sort: 'id:desc' }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Live' : '🔴 Offline'}</div>
      {data.map(item => (
        <div key={item.id}>{JSON.stringify(item)}</div>
      ))}
    </div>
  );
}`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Advanced Usage (Database Triggers):
                    </h4>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {`import { useAdvancedRealtimeList } from './hooks/useRealtimeData';

// Only use if client explicitly allows database modifications
function AdvancedComponent() {
  const { data, isConnected, connectionMethod } = useAdvancedRealtimeList(
    '${selectedApi?.endpoint || '/api/v2/service/_table/entity'}',
    { pageSize: 50 }
  );

  return (
    <div>
      <div>Method: {connectionMethod}</div>
      <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
      {/* Your component content */}
    </div>
  );
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default RealtimeApiDemo;
