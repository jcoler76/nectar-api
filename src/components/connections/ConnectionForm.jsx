import { Tooltip } from '@mui/material';
import { Database, HelpCircle, Loader2, Lock, Play, User, Server } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// Database type configurations
const DATABASE_TYPES = [
  {
    value: 'MSSQL',
    label: 'Microsoft SQL Server',
    defaultPort: 1433,
    icon: '🗄️',
    description: 'Microsoft SQL Server database',
  },
  {
    value: 'POSTGRESQL',
    label: 'PostgreSQL',
    defaultPort: 5432,
    icon: '🐘',
    description: 'PostgreSQL open-source relational database',
  },
  {
    value: 'MYSQL',
    label: 'MySQL',
    defaultPort: 3306,
    icon: '🐬',
    description: 'MySQL/MariaDB relational database',
  },
  {
    value: 'MONGODB',
    label: 'MongoDB',
    defaultPort: 27017,
    icon: '🍃',
    description: 'MongoDB NoSQL document database',
  },
];

const ConnectionForm = ({ open, onClose, onSave, connection, onTestConnection }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'MSSQL',
    host: '',
    port: 1433,
    database: '',
    sslEnabled: false,
    failoverHost: '',
    username: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name || '',
        type: connection.type || 'MSSQL',
        host: connection.host || '',
        port: connection.port || 1433,
        database: connection.database || '',
        sslEnabled: connection.sslEnabled || false,
        failoverHost: connection.failoverHost || '',
        username: connection.username || '',
        password: '', // Always keep password empty for security
      });
    } else {
      setFormData({
        name: '',
        type: 'MSSQL',
        host: '',
        port: 1433,
        database: '',
        sslEnabled: false,
        failoverHost: '',
        username: '',
        password: '',
      });
    }
    setError('');
    setIsSubmitting(false);
    setIsTesting(false);
  }, [connection, open]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'port' ? parseInt(value, 10) : value,
    }));
  };

  const handleDatabaseTypeChange = value => {
    const dbType = DATABASE_TYPES.find(type => type.value === value);
    setFormData(prev => ({
      ...prev,
      type: value,
      port: dbType?.defaultPort || 1433,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Filter out empty password string only for updates
      const dataToSave = { ...formData };
      if (connection && !dataToSave.password) {
        // Only delete password for updates when it's empty
        delete dataToSave.password;
      }

      await onSave(dataToSave);
    } catch (err) {
      setError(err.message || 'Failed to save connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setError('');

    try {
      await onTestConnection(formData);
    } catch (err) {
      setError(err.message || 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {connection ? 'Edit Connection' : 'Add New Connection'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Connection Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="name">Connection Name *</Label>
              <Tooltip title="Unique identifier for this connection. Use descriptive names like 'prod-customer-db' or 'staging-inventory'. Cannot be changed after creation.">
                <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
              </Tooltip>
            </div>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., prod-customer-db, staging-inventory"
            />
          </div>

          {/* Database Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Database Type *</Label>
              <Tooltip title="Select your database system type. This determines the connection protocol and default port. Each type has different features and capabilities.">
                <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
              </Tooltip>
            </div>
            <Select value={formData.type} onValueChange={handleDatabaseTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select database type">
                  {formData.type && (
                    <div className="flex items-center gap-2">
                      <span>{DATABASE_TYPES.find(t => t.value === formData.type)?.icon}</span>
                      <span>{DATABASE_TYPES.find(t => t.value === formData.type)?.label}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DATABASE_TYPES.map(dbType => (
                  <SelectItem key={dbType.value} value={dbType.value}>
                    <div className="flex items-center gap-2">
                      <span>{dbType.icon}</span>
                      <div className="flex flex-col">
                        <span>{dbType.label}</span>
                        <span className="text-xs text-muted-foreground">{dbType.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Host and Port */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="host">Host *</Label>
                <Tooltip title="Database server address. Can be localhost, IP address (192.168.1.100), or fully qualified domain name (db.company.com).">
                  <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
                </Tooltip>
              </div>
              <div className="relative">
                <Database className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="host"
                  name="host"
                  value={formData.host}
                  onChange={handleChange}
                  required
                  placeholder="localhost or IP address"
                />
              </div>
            </div>
            <div className="w-24 space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="port">Port *</Label>
                <Tooltip title="Database server port number. Default ports are automatically set based on database type but can be customized.">
                  <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
                </Tooltip>
              </div>
              <Input
                id="port"
                name="port"
                type="number"
                value={formData.port}
                onChange={handleChange}
                required
                placeholder="1433"
              />
            </div>
          </div>

          {/* Database Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="database">Database Name</Label>
              <Tooltip title="Optional specific database name for the initial connection. If left empty, default database will be used. You can access other databases through services.">
                <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
              </Tooltip>
            </div>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="database"
                name="database"
                value={formData.database}
                onChange={handleChange}
                placeholder={
                  formData.type === 'POSTGRESQL'
                    ? 'postgres (default)'
                    : formData.type === 'MYSQL'
                      ? 'Database name'
                      : formData.type === 'MONGODB'
                        ? 'admin (default)'
                        : 'Database name'
                }
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.type === 'POSTGRESQL'
                ? 'Optional - defaults to "postgres" if not specified'
                : formData.type === 'MYSQL'
                  ? 'Optional - specify target database name'
                  : formData.type === 'MONGODB'
                    ? 'Optional - defaults to "admin" for authentication'
                    : 'Optional - specify target database name'}
            </p>
          </div>

          {/* SSL Enabled */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sslEnabled"
              checked={formData.sslEnabled}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, sslEnabled: checked }))}
            />
            <Label htmlFor="sslEnabled" className="text-sm font-normal">
              Enable SSL/TLS Connection
            </Label>
            <Tooltip title="Enable encrypted connection to the database server. Recommended for production environments and required for many cloud databases.">
              <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
            </Tooltip>
          </div>

          {/* Failover Host */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="failoverHost">Failover Host</Label>
              <Tooltip title="Optional backup database server for automatic failover. If primary host becomes unavailable, connections will attempt to use this host.">
                <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
              </Tooltip>
            </div>
            <Input
              id="failoverHost"
              name="failoverHost"
              value={formData.failoverHost}
              onChange={handleChange}
              placeholder="Optional failover host"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="username">
                Username {formData.type === 'MONGODB' ? '(optional)' : '*'}
              </Label>
              <Tooltip title="Database login username. Required for most databases. MongoDB can use anonymous connections in some configurations.">
                <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
              </Tooltip>
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required={formData.type !== 'MONGODB'}
                placeholder={
                  formData.type === 'MONGODB' ? 'Optional for authentication' : 'Database username'
                }
                className="pl-10"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="password">
                Password {!connection && formData.type !== 'MONGODB' ? '*' : '(optional)'}
              </Label>
              <Tooltip title="Database login password. Leave empty when editing to keep existing password unchanged. Required for new connections (except some MongoDB setups).">
                <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
              </Tooltip>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required={!connection && formData.type !== 'MONGODB'}
                placeholder={
                  connection
                    ? 'Leave blank to keep current password'
                    : formData.type === 'MONGODB'
                      ? 'Optional for authentication'
                      : 'Database password'
                }
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {connection ? 'Leave blank to keep current password' : 'Required for new connections'}
            </p>
          </div>

          <DialogFooter className="flex justify-between pt-4">
            <Tooltip title="Verify that the connection settings are correct and the database server is accessible with the provided credentials">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || isSubmitting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </Tooltip>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isTesting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionForm;
