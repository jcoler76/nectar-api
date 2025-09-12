import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useWizardValidation } from '../../../hooks/useWizardValidation';
import { getConnectionDatabases, getConnections } from '../../../services/connectionService';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { FormField, LoadingState } from '../../wizard/shared';

const ServiceStep = ({ data, onDataChange, onNext, setError }) => {
  const { formData, setFormData, validating, error, handleInputChange, validate } =
    useWizardValidation({
      name: data?.name || '',
      label: data?.label || '',
      description: data?.description || '',
      connectionId: data?.connectionId || '',
      database: data?.database || '',
    });
  const [connections, setConnections] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadingDatabases, setLoadingDatabases] = useState(false);

  // Sync errors with parent component
  useEffect(() => {
    if (error) {
      setError(error);
    }
  }, [error, setError]);

  useEffect(() => {
    const fetchConnections = async () => {
      setLoadingConnections(true);
      try {
        const fetchedConnections = await getConnections();
        // Filter to only show active connections for service creation
        const activeConnections = fetchedConnections.filter(connection => connection.isActive);
        setConnections(activeConnections);
        setError('');
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
  }, [setError]);

  const handleConnectionChange = async connectionId => {
    const updatedData = {
      ...formData,
      connectionId,
      database: '', // Reset database when connection changes
    };
    setFormData(updatedData);
    onDataChange(updatedData);
    setDatabases([]);

    if (connectionId) {
      setLoadingDatabases(true);
      try {
        const fetchedDatabases = await getConnectionDatabases(connectionId);
        setDatabases(fetchedDatabases);
        setError('');
      } catch (err) {
        console.error('Error fetching databases:', err);
        setError('Failed to load databases for this connection.');
      } finally {
        setLoadingDatabases(false);
      }
    }
  };

  const handleFieldChange = (field, value) => {
    // For service name, convert to lowercase and remove spaces
    if (field === 'name') {
      value = value.toLowerCase().replace(/\s+/g, '-');
    }
    const updatedData = handleInputChange(field, value);
    onDataChange(updatedData);
  };

  const validateAndNext = async () => {
    await validate(async () => {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Service name is required.');
      }
      if (!formData.connectionId) {
        throw new Error('Please select a connection.');
      }
      if (!formData.database) {
        throw new Error('Please select a database.');
      }

      // Update parent with validated data
      onDataChange(formData);
      onNext();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Service Configuration</h3>
        <p className="text-muted-foreground mb-6">
          Configure the basic settings for your new service endpoint.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Service Name" required htmlFor="name">
          <Input
            id="name"
            value={formData.name}
            onChange={e => handleFieldChange('name', e.target.value)}
            placeholder="e.g., Customer API"
            disabled={validating}
          />
        </FormField>

        <FormField label="Label" htmlFor="label">
          <Input
            id="label"
            value={formData.label}
            onChange={e => handleFieldChange('label', e.target.value)}
            placeholder="e.g., Customer Management"
            disabled={validating}
          />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="description">
        <Textarea
          id="description"
          value={formData.description}
          onChange={e => handleFieldChange('description', e.target.value)}
          placeholder="Describe what this service will provide..."
          disabled={validating}
          rows={3}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Connection" required htmlFor="connection">
          <Select
            value={formData.connectionId}
            onValueChange={handleConnectionChange}
            disabled={loadingConnections || validating}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={loadingConnections ? 'Loading connections...' : 'Select a connection'}
              />
            </SelectTrigger>
            <SelectContent>
              {connections.map(connection => (
                <SelectItem key={connection._id} value={connection._id}>
                  {connection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <LoadingState
            loading={loadingConnections}
            message="Loading connections..."
            className="mt-1"
          />
        </FormField>

        <FormField label="Database" required htmlFor="database">
          <Select
            value={formData.database}
            onValueChange={value => handleFieldChange('database', value)}
            disabled={!formData.connectionId || loadingDatabases || validating}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !formData.connectionId
                    ? 'Select a connection first'
                    : loadingDatabases
                      ? 'Loading databases...'
                      : 'Select a database'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {databases.map(database => (
                <SelectItem key={database} value={database}>
                  {database}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <LoadingState
            loading={loadingDatabases}
            message="Loading databases..."
            className="mt-1"
          />
        </FormField>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={validateAndNext}
          disabled={validating || !formData.name || !formData.connectionId || !formData.database}
          variant="ocean"
        >
          {validating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Next: Retrieve Schema
        </Button>
      </div>
    </div>
  );
};

export default ServiceStep;
