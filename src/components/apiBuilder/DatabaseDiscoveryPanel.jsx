import { CheckCircle, Database, Eye, Loader2, RefreshCw, Table, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const DatabaseDiscoveryPanel = ({ onApiGenerated }) => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [discoveredTables, setDiscoveredTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch available services on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      const data = await response.json();
      setServices(data.filter(service => service.isActive));
    } catch (err) {
      setError('Failed to load services: ' + err.message);
    }
  };

  const discoverTables = async () => {
    if (!selectedService) return;

    setLoading(true);
    setError('');
    setDiscoveredTables([]);
    setSelectedTables(new Set());

    try {
      const response = await fetch(`/api/v2/${selectedService}/_discover`, {
        headers: {
          'X-API-Key': localStorage.getItem('apiKey') || '',
        },
      });

      if (!response.ok) throw new Error('Failed to discover tables');

      const data = await response.json();
      setDiscoveredTables(data.data || []);
    } catch (err) {
      setError('Failed to discover tables: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelection = (tableName, checked) => {
    const newSelected = new Set(selectedTables);
    if (checked) {
      newSelected.add(tableName);
    } else {
      newSelected.delete(tableName);
    }
    setSelectedTables(newSelected);
  };

  const handleSelectAll = checked => {
    if (checked) {
      const availableTables = discoveredTables.filter(table => !table.isExposed);
      setSelectedTables(new Set(availableTables.map(table => table.name)));
    } else {
      setSelectedTables(new Set());
    }
  };

  const generateApis = async () => {
    if (selectedTables.size === 0) return;

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/v2/${selectedService}/_expose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': localStorage.getItem('apiKey') || '',
        },
        body: JSON.stringify({
          tables: Array.from(selectedTables),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate APIs');

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        setError(`Some APIs failed to generate: ${data.errors.join(', ')}`);
      }

      if (data.exposed && data.exposed.length > 0) {
        setSuccess(`Successfully generated ${data.exposed.length} APIs!`);
        // Refresh discovery to show updated exposed status
        await discoverTables();
        // Notify parent component
        if (onApiGenerated) {
          onApiGenerated(data.exposed);
        }
      }
    } catch (err) {
      setError('Failed to generate APIs: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const availableTables = discoveredTables.filter(table => !table.isExposed);
  const exposedTables = discoveredTables.filter(table => table.isExposed);
  const allAvailableSelected =
    availableTables.length > 0 && availableTables.every(table => selectedTables.has(table.name));

  return (
    <div className="space-y-6">
      {/* Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Select Database Service
          </CardTitle>
          <CardDescription>
            Choose a service to discover its database tables and views
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a database service..." />
              </SelectTrigger>
              <SelectContent>
                {services.map(service => (
                  <SelectItem key={service.id} value={service.name}>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      {service.label || service.name}
                      <span className="text-muted-foreground">({service.connection?.type})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={discoverTables}
              disabled={!selectedService || loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Discover Tables
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Discovered Tables */}
      {discoveredTables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              Discovered Tables ({discoveredTables.length})
            </CardTitle>
            <CardDescription>
              Select tables to auto-generate REST APIs. Already exposed tables are shown for
              reference.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bulk Actions */}
            {availableTables.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Checkbox checked={allAvailableSelected} onCheckedChange={handleSelectAll} />
                  <label className="text-sm font-medium">
                    Select all available tables ({availableTables.length})
                  </label>
                </div>
                <Button
                  onClick={generateApis}
                  disabled={selectedTables.size === 0 || generating}
                  className="flex items-center gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  Generate APIs ({selectedTables.size})
                </Button>
              </div>
            )}

            {/* Table List */}
            <div className="grid gap-3">
              {/* Available Tables */}
              {availableTables.map(table => (
                <div
                  key={table.name}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedTables.has(table.name)}
                      onCheckedChange={checked => handleTableSelection(table.name, checked)}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{table.name}</span>
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          {table.type}
                        </span>
                      </div>
                      {table.schema && (
                        <span className="text-sm text-muted-foreground">
                          Schema: {table.schema}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    → /api/v2/{selectedService}/_table/{table.suggestedPathSlug}
                  </div>
                </div>
              ))}

              {/* Already Exposed Tables */}
              {exposedTables.map(table => (
                <div
                  key={table.name}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{table.name}</span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          EXPOSED
                        </span>
                      </div>
                      {table.schema && (
                        <span className="text-sm text-muted-foreground">
                          Schema: {table.schema}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() =>
                      window.open(
                        `/api/v2/${selectedService}/_table/${table.suggestedPathSlug}`,
                        '_blank'
                      )
                    }
                  >
                    <Eye className="h-3 w-3" />
                    View API
                  </Button>
                </div>
              ))}
            </div>

            {discoveredTables.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  No tables discovered. Try selecting a different service or check your database
                  connection.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DatabaseDiscoveryPanel;
