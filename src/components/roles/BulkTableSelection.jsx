import {
  CheckCircle,
  Database,
  Eye,
  Loader2,
  RefreshCw,
  Table,
  Code,
  Grid,
  Search,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import api from '../../services/api';
import { getServices } from '../../services/serviceService';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const BulkTableSelection = ({ onTablesSelected, selectedService, setSelectedService }) => {
  const [services, setServices] = useState([]);
  const [discoveredObjects, setDiscoveredObjects] = useState({
    tables: [],
    views: [],
    procedures: [],
  });
  const [selectedObjects, setSelectedObjects] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('tables');
  const [searchTerms, setSearchTerms] = useState({
    tables: '',
    views: '',
    procedures: '',
  });

  // Fetch available services on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  // Auto-discover schema when service is prefilled in edit mode
  useEffect(() => {
    // Only run if we have a selected service, services are loaded, and no objects discovered yet
    if (selectedService && services.length > 0 && discoveredObjects.tables.length === 0) {
      console.log('🔍 Auto-discovering schema for prefilled service:', selectedService);
      discoverTables(selectedService);
    }
  }, [selectedService, services.length]);

  const fetchServices = async () => {
    try {
      const data = await getServices();
      setServices(data.filter(service => service.isActive));
    } catch (err) {
      setError('Failed to load services: ' + err.message);
    }
  };

  const discoverTables = async (serviceId = null) => {
    const targetServiceId = serviceId || selectedService;
    console.log('🔍 discoverTables called with:', { serviceId, selectedService, targetServiceId });
    console.log(
      '🔍 Available services:',
      services.map(s => ({ id: s.id, name: s.name }))
    );

    if (!targetServiceId) {
      setError('Please select a service first');
      return;
    }

    // Find the service name from the ID since the discover endpoint expects service name
    const service = services.find(s => s.id === targetServiceId);
    console.log('🔍 Found service:', service);

    if (!service) {
      console.error('❌ Service not found in services array:', {
        targetServiceId,
        availableServices: services,
      });
      setError('Selected service not found');
      return;
    }

    setLoading(true);
    setError('');
    setDiscoveredObjects({
      tables: [],
      views: [],
      procedures: [],
    });
    setSelectedObjects(new Set());

    try {
      const response = await api.get(`/api/v2/${service.name}/_discover`);
      const data = response.data.data || {};

      setDiscoveredObjects({
        tables: data.tables || [],
        views: data.views || [],
        procedures: data.procedures || [],
      });

      const totalObjects =
        (data.tables?.length || 0) + (data.views?.length || 0) + (data.procedures?.length || 0);
      if (totalObjects === 0) {
        setError(
          'No database objects found for this service. Make sure the service has been properly configured with database schema information.'
        );
      }
    } catch (err) {
      setError(
        'Failed to discover database objects: ' +
          (err.response?.data?.error?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleObjectSelection = (objectName, checked) => {
    const newSelected = new Set(selectedObjects);
    if (checked) {
      newSelected.add(objectName);
    } else {
      newSelected.delete(objectName);
    }
    setSelectedObjects(newSelected);

    // Get all selected objects from all tabs
    const allObjects = [
      ...discoveredObjects.tables,
      ...discoveredObjects.views,
      ...discoveredObjects.procedures,
    ];
    const selectedObjectData = allObjects.filter(obj => newSelected.has(obj.name));
    onTablesSelected(selectedObjectData, selectedService);
  };

  const handleSelectAllInTab = (checked, objectType) => {
    const objectsInTab = discoveredObjects[objectType] || [];
    const availableObjects = objectsInTab.filter(obj => !obj.isExposed);

    const newSelected = new Set(selectedObjects);

    if (checked) {
      // Add all available objects in this tab
      availableObjects.forEach(obj => newSelected.add(obj.name));
    } else {
      // Remove all objects in this tab
      objectsInTab.forEach(obj => newSelected.delete(obj.name));
    }

    setSelectedObjects(newSelected);

    // Get all selected objects from all tabs
    const allObjects = [
      ...discoveredObjects.tables,
      ...discoveredObjects.views,
      ...discoveredObjects.procedures,
    ];
    const selectedObjectData = allObjects.filter(obj => newSelected.has(obj.name));
    onTablesSelected(selectedObjectData, selectedService);
  };

  const handleServiceChange = async serviceId => {
    setSelectedService(serviceId);
    setDiscoveredObjects({
      tables: [],
      views: [],
      procedures: [],
    });
    setSelectedObjects(new Set());
    onTablesSelected([], serviceId);

    // Automatically discover schema when service is selected
    if (serviceId) {
      await discoverTables(serviceId);
    }
  };

  // Helper function to get icon for object type
  const getObjectIcon = type => {
    switch (type.toLowerCase()) {
      case 'table':
        return Table;
      case 'view':
        return Grid;
      case 'procedure':
        return Code;
      default:
        return Database;
    }
  };

  // Helper function to render object list for a specific type
  const renderObjectList = (objects, objectType) => {
    const searchTerm = searchTerms[objectType] || '';

    // Sort objects alphabetically by name
    const sortedObjects = [...objects].sort((a, b) => a.name.localeCompare(b.name));

    // Filter by search term
    const filteredObjects = sortedObjects.filter(obj =>
      obj.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const availableObjects = filteredObjects.filter(obj => !obj.isExposed);
    const exposedObjects = filteredObjects.filter(obj => obj.isExposed);
    const Icon = getObjectIcon(objectType);

    const allAvailableSelected =
      availableObjects.length > 0 && availableObjects.every(obj => selectedObjects.has(obj.name));

    return (
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${objectType}...`}
            value={searchTerm}
            onChange={e => setSearchTerms(prev => ({ ...prev, [objectType]: e.target.value }))}
            className="pl-8"
          />
        </div>

        {/* Results summary */}
        {searchTerm && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredObjects.length} of {objects.length} {objectType}
          </div>
        )}

        {/* Bulk Actions for this tab */}
        {availableObjects.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allAvailableSelected}
                onCheckedChange={checked => handleSelectAllInTab(checked, objectType)}
              />
              <label className="text-sm font-medium">
                Select all available {objectType} ({availableObjects.length})
              </label>
            </div>
            <div className="text-sm text-muted-foreground">
              {objects.filter(obj => selectedObjects.has(obj.name)).length} selected
            </div>
          </div>
        )}

        {/* Object List */}
        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {/* Available Objects */}
          {availableObjects.map(obj => (
            <div
              key={obj.name}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedObjects.has(obj.name)}
                  onCheckedChange={checked => handleObjectSelection(obj.name, checked)}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{obj.name}</span>
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      {obj.type}
                    </span>
                  </div>
                  {obj.schema && (
                    <span className="text-sm text-muted-foreground">Schema: {obj.schema}</span>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                → /api/v2/{services.find(s => s.id === selectedService)?.name || 'service'}/_table/
                {obj.suggestedPathSlug || obj.name}
              </div>
            </div>
          ))}

          {/* Already Exposed Objects */}
          {exposedObjects.map(obj => (
            <div
              key={obj.name}
              className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{obj.name}</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      EXPOSED
                    </span>
                  </div>
                  {obj.schema && (
                    <span className="text-sm text-muted-foreground">Schema: {obj.schema}</span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() =>
                  window.open(
                    `/api/v2/${services.find(s => s.id === selectedService)?.name || 'service'}/_table/${obj.suggestedPathSlug || obj.name}`,
                    '_blank'
                  )
                }
              >
                <Eye className="h-3 w-3" />
                View API
              </Button>
            </div>
          ))}

          {objects.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No {objectType} found for this service.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalObjects =
    discoveredObjects.tables.length +
    discoveredObjects.views.length +
    discoveredObjects.procedures.length;

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
            Choose a service to discover database objects for API generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedService} onValueChange={handleServiceChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a database service..." />
              </SelectTrigger>
              <SelectContent>
                {services.map(service => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      {service.name}
                      {service.label && service.label !== service.name && (
                        <span className="text-muted-foreground">({service.label})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={discoverTables}
              disabled={!selectedService || loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Discover Schema
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Discovered Objects */}
      {totalObjects > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Discovered Database Objects ({totalObjects})
            </CardTitle>
            <CardDescription>
              Select database objects to include in this role. Selected objects will be accessible
              via API endpoints. Objects are organized by type: Tables, Views, and Stored
              Procedures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tables" className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  Tables ({discoveredObjects.tables.length})
                </TabsTrigger>
                <TabsTrigger value="views" className="flex items-center gap-2">
                  <Grid className="h-4 w-4" />
                  Views ({discoveredObjects.views.length})
                </TabsTrigger>
                <TabsTrigger value="procedures" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Procedures ({discoveredObjects.procedures.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tables" className="mt-4">
                {renderObjectList(discoveredObjects.tables, 'tables')}
              </TabsContent>

              <TabsContent value="views" className="mt-4">
                {renderObjectList(discoveredObjects.views, 'views')}
              </TabsContent>

              <TabsContent value="procedures" className="mt-4">
                {renderObjectList(discoveredObjects.procedures, 'procedures')}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {totalObjects === 0 && !loading && selectedService && (
        <Card>
          <CardContent className="text-center py-8">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              No database objects discovered. Try selecting a different service or check your
              database connection.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkTableSelection;
