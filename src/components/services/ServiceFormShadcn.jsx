import { HelpCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Tooltip } from '@mui/material';

import { getConnectionDatabases, getConnections } from '../../services/connectionService';
import { createService, updateService, refreshServiceSchema } from '../../services/serviceService';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

const ServiceFormShadcn = ({ service, onServiceSubmitted, onCancel }) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    label: service?.label || '',
    description: service?.description || '',
    connectionId: service?.connectionId || '',
    database: service?.database || '',
  });
  const [connections, setConnections] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadingDatabases, setLoadingDatabases] = useState(false);

  useEffect(() => {
    const fetchConnections = async () => {
      setLoadingConnections(true);
      try {
        const fetchedConnections = await getConnections();
        setConnections(fetchedConnections);
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching connections:', err);
        if (err.message && err.message.includes('401')) {
          setError('Authentication required. Please log in to access connections.');
        } else {
          setError('Failed to load connections. Please try again.');
        }
      } finally {
        setLoadingConnections(false);
      }
    };
    fetchConnections();
  }, []);

  // Load databases for existing service when editing
  useEffect(() => {
    const loadDatabasesForExistingService = async () => {
      // Only run for existing services that have a connectionId
      if (service && formData.connectionId) {
        setLoadingDatabases(true);
        try {
          const databaseList = await getConnectionDatabases(formData.connectionId);
          setDatabases(databaseList);
        } catch (err) {
          console.error('Error fetching databases for existing service:', err);
          setError('Failed to load databases for this connection.');
        } finally {
          setLoadingDatabases(false);
        }
      }
    };

    loadDatabasesForExistingService();
  }, [service, formData.connectionId]);

  const handleConnectionChange = async connectionId => {
    setFormData(prev => ({
      ...prev,
      connectionId,
      database: '', // Reset database on new connection
    }));
    setDatabases([]);

    if (!connectionId) {
      return;
    }

    setLoadingDatabases(true);
    setError('');
    try {
      const databaseList = await getConnectionDatabases(connectionId);
      setDatabases(databaseList);
    } catch (err) {
      setError('Failed to fetch databases for this connection.');
    } finally {
      setLoadingDatabases(false);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (service) {
        await updateService(service._id, formData);
        onServiceSubmitted();
      } else {
        // Create the service first
        const createdService = await createService(formData);

        // Automatically refresh schema for the newly created service
        try {
          setSuccess('Service created successfully. Refreshing schema...');
          const schemaResult = await refreshServiceSchema(createdService._id);
          setSuccess(
            `Service created and schema refreshed: ${schemaResult.objectCount.total} objects found (${schemaResult.objectCount.tables} tables, ${schemaResult.objectCount.views} views, ${schemaResult.objectCount.procedures} procedures)`
          );
        } catch (schemaError) {
          console.warn('Schema refresh failed after service creation:', schemaError);
          setSuccess(
            'Service created successfully, but schema refresh failed. You can manually refresh the schema later.'
          );
        }

        onServiceSubmitted();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="name">Service Name *</Label>
          <Tooltip title="Unique identifier for this service. Used in API endpoints and must contain only letters, numbers, and underscores. Cannot be changed after creation.">
            <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
          </Tooltip>
        </div>
        <Input
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., customer_db, inventory_service"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="label">Label</Label>
          <Tooltip title="Optional human-readable display name for better organization. This appears in the UI to help identify the service more easily.">
            <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
          </Tooltip>
        </div>
        <Input
          id="label"
          name="label"
          value={formData.label}
          onChange={handleChange}
          placeholder="e.g., Customer Database, Inventory Management"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="description">Description</Label>
          <Tooltip title="Detailed explanation of what this service does and what data it provides. This helps team members understand the service purpose and usage.">
            <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
          </Tooltip>
        </div>
        <Textarea
          id="description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., Provides access to customer data including profiles, orders, and preferences"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="connection">Connection *</Label>
          <Tooltip title="Select the database connection this service will use. The connection defines the server, credentials, and connection settings.">
            <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
          </Tooltip>
        </div>
        <Select
          value={formData.connectionId}
          onValueChange={handleConnectionChange}
          disabled={loadingConnections}
        >
          <SelectTrigger id="connection">
            <SelectValue
              placeholder={loadingConnections ? 'Loading connections...' : 'Select a connection'}
            />
          </SelectTrigger>
          <SelectContent>
            {connections.map(c => (
              <SelectItem key={c._id} value={c._id}>
                {c.name} ({c.host})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="database">Database *</Label>
          <Tooltip title="Select the specific database from the chosen connection. The service will provide access to this database's tables, views, and procedures.">
            <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
          </Tooltip>
        </div>
        <Select
          value={formData.database}
          onValueChange={value => setFormData(prev => ({ ...prev, database: value }))}
          disabled={!formData.connectionId || loadingDatabases}
        >
          <SelectTrigger id="database">
            <SelectValue
              placeholder={loadingDatabases ? 'Loading databases...' : 'Select a database'}
            />
          </SelectTrigger>
          <SelectContent>
            {databases.map(db => (
              <SelectItem key={db} value={db}>
                {db}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving || !formData.connectionId || !formData.database || !formData.name}
          className="w-full sm:w-auto"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? 'Saving...' : 'Save Service'}
        </Button>
      </div>
    </form>
  );
};

export default ServiceFormShadcn;
