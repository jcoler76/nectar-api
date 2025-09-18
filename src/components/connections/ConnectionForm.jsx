import { Tooltip } from '@mui/material';
import { Database, HelpCircle, Loader2, Lock, Play, User, Server } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
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
    category: 'Traditional',
  },
  {
    value: 'POSTGRESQL',
    label: 'PostgreSQL',
    defaultPort: 5432,
    icon: '🐘',
    description: 'PostgreSQL open-source relational database',
    category: 'Traditional',
  },
  {
    value: 'MYSQL',
    label: 'MySQL',
    defaultPort: 3306,
    icon: '🐬',
    description: 'MySQL/MariaDB relational database',
    category: 'Traditional',
  },
  {
    value: 'MONGODB',
    label: 'MongoDB',
    defaultPort: 27017,
    icon: '🍃',
    description: 'MongoDB NoSQL document database',
    category: 'Traditional',
  },
  {
    value: 'SQLITE',
    label: 'SQLite',
    defaultPort: null,
    icon: '💾',
    description: 'SQLite lightweight database (file-based)',
    category: 'Traditional',
  },
  {
    value: 'ORACLE',
    label: 'Oracle Database',
    defaultPort: 1521,
    icon: '🏛️',
    description: 'Oracle Database Enterprise',
    category: 'Traditional',
  },
  // AWS Cloud Databases
  {
    value: 'AWS_RDS_POSTGRESQL',
    label: 'AWS RDS PostgreSQL',
    defaultPort: 5432,
    icon: '🐘',
    description: 'Amazon RDS PostgreSQL managed database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  {
    value: 'AWS_RDS_MYSQL',
    label: 'AWS RDS MySQL',
    defaultPort: 3306,
    icon: '🐬',
    description: 'Amazon RDS MySQL managed database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  {
    value: 'AWS_RDS_MSSQL',
    label: 'AWS RDS SQL Server',
    defaultPort: 1433,
    icon: '🗄️',
    description: 'Amazon RDS SQL Server managed database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  {
    value: 'AWS_RDS_ORACLE',
    label: 'AWS RDS Oracle',
    defaultPort: 1521,
    icon: '🏛️',
    description: 'Amazon RDS Oracle managed database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  {
    value: 'AWS_AURORA_POSTGRESQL',
    label: 'AWS Aurora PostgreSQL',
    defaultPort: 5432,
    icon: '🌟',
    description: 'Amazon Aurora PostgreSQL-compatible database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  {
    value: 'AWS_AURORA_MYSQL',
    label: 'AWS Aurora MySQL',
    defaultPort: 3306,
    icon: '🌟',
    description: 'Amazon Aurora MySQL-compatible database',
    category: 'AWS',
    cloudProvider: 'AWS',
  },
  // Azure Cloud Databases
  {
    value: 'AZURE_SQL_DATABASE',
    label: 'Azure SQL Database',
    defaultPort: 1433,
    icon: '☁️',
    description: 'Microsoft Azure SQL Database',
    category: 'Azure',
    cloudProvider: 'Azure',
  },
  {
    value: 'AZURE_SQL_MANAGED_INSTANCE',
    label: 'Azure SQL Managed Instance',
    defaultPort: 1433,
    icon: '☁️',
    description: 'Azure SQL Managed Instance',
    category: 'Azure',
    cloudProvider: 'Azure',
  },
  {
    value: 'AZURE_POSTGRESQL',
    label: 'Azure Database for PostgreSQL',
    defaultPort: 5432,
    icon: '🐘',
    description: 'Azure managed PostgreSQL service',
    category: 'Azure',
    cloudProvider: 'Azure',
  },
  {
    value: 'AZURE_MYSQL',
    label: 'Azure Database for MySQL',
    defaultPort: 3306,
    icon: '🐬',
    description: 'Azure managed MySQL service',
    category: 'Azure',
    cloudProvider: 'Azure',
  },
  // Google Cloud Databases
  {
    value: 'GCP_CLOUD_SQL_POSTGRESQL',
    label: 'Google Cloud SQL PostgreSQL',
    defaultPort: 5432,
    icon: '🐘',
    description: 'Google Cloud SQL PostgreSQL',
    category: 'Google Cloud',
    cloudProvider: 'GCP',
  },
  {
    value: 'GCP_CLOUD_SQL_MYSQL',
    label: 'Google Cloud SQL MySQL',
    defaultPort: 3306,
    icon: '🐬',
    description: 'Google Cloud SQL MySQL',
    category: 'Google Cloud',
    cloudProvider: 'GCP',
  },
  {
    value: 'GCP_CLOUD_SQL_MSSQL',
    label: 'Google Cloud SQL Server',
    defaultPort: 1433,
    icon: '🗄️',
    description: 'Google Cloud SQL Server',
    category: 'Google Cloud',
    cloudProvider: 'GCP',
  },
  {
    value: 'GCP_SPANNER',
    label: 'Google Cloud Spanner',
    defaultPort: 443,
    icon: '🔧',
    description: 'Google Cloud Spanner globally distributed database',
    category: 'Google Cloud',
    cloudProvider: 'GCP',
  },
  // Analytics & Big Data
  {
    value: 'BIGQUERY',
    label: 'Google BigQuery',
    defaultPort: 443,
    icon: '📊',
    description: 'Google BigQuery data warehouse',
    category: 'Analytics',
    cloudProvider: 'GCP',
  },
  {
    value: 'SNOWFLAKE',
    label: 'Snowflake',
    defaultPort: 443,
    icon: '❄️',
    description: 'Snowflake cloud data platform',
    category: 'Analytics',
    cloudProvider: 'Snowflake',
  },
];

const ConnectionForm = ({ open, onClose, onSave, connection, onTestConnection }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    host: '',
    port: 1433,
    database: '',
    sslEnabled: false,
    failoverHost: '',
    username: '',
    password: '',
    // Cloud-specific fields
    region: '',
    endpoint: '',
    instanceConnectionName: '',
    accountId: '',
    warehouseName: '',
    authMethod: 'password',
    privateKey: '',
    passphrase: '',
    projectId: '',
    keyFile: '',
  });
  const [currentStep, setCurrentStep] = useState(1);
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
        // Cloud-specific fields
        region: connection.region || '',
        endpoint: connection.endpoint || '',
        instanceConnectionName: connection.instanceConnectionName || '',
        accountId: connection.accountId || '',
        warehouseName: connection.warehouseName || '',
        authMethod: connection.authMethod || 'password',
        privateKey: connection.privateKey || '',
        passphrase: connection.passphrase || '',
        projectId: connection.projectId || '',
        keyFile: connection.keyFile || '',
      });
      setCurrentStep(2); // Skip to step 2 for editing
    } else {
      setFormData({
        name: '',
        type: '',
        host: '',
        port: 1433,
        database: '',
        sslEnabled: false,
        failoverHost: '',
        username: '',
        password: '',
        // Cloud-specific fields
        region: '',
        endpoint: '',
        instanceConnectionName: '',
        accountId: '',
        warehouseName: '',
        authMethod: 'password',
        privateKey: '',
        passphrase: '',
        projectId: '',
        keyFile: '',
      });
      setCurrentStep(1); // Start at step 1 for new connections
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

    // Auto-advance to step 2 once database type is selected
    if (value && formData.name.trim()) {
      setCurrentStep(2);
    }
  };

  const canAdvanceToStep2 = formData.name.trim() && formData.type;

  const goToStep2 = () => {
    if (canAdvanceToStep2) {
      setCurrentStep(2);
    }
  };

  const goToStep1 = () => {
    setCurrentStep(1);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Connection Name and Database Type */}
      {currentStep === 1 && !connection && (
        <>
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
              <SelectContent className="max-h-[400px]">
                {/* Group database types by category */}
                {['Traditional', 'AWS', 'Azure', 'Google Cloud', 'Analytics'].map(category => {
                  const typesInCategory = DATABASE_TYPES.filter(
                    dbType => dbType.category === category
                  );
                  if (typesInCategory.length === 0) return null;

                  return (
                    <div key={category}>
                      {/* Category Header */}
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
                        {category === 'Traditional'
                          ? '🖥️ Traditional Databases'
                          : category === 'AWS'
                            ? '☁️ Amazon Web Services'
                            : category === 'Azure'
                              ? '🔷 Microsoft Azure'
                              : category === 'Google Cloud'
                                ? '🟦 Google Cloud Platform'
                                : category === 'Analytics'
                                  ? '📊 Analytics & Big Data'
                                  : category}
                      </div>
                      {/* Database options in this category */}
                      {typesInCategory.map(dbType => (
                        <SelectItem key={dbType.value} value={dbType.value}>
                          <div className="flex items-center gap-2">
                            <span>{dbType.icon}</span>
                            <div className="flex flex-col">
                              <span>{dbType.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {dbType.description}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Step 2: Connection Details or Edit Mode */}
      {(currentStep === 2 || connection) && (
        <>
          {/* Show connection name and type as readonly in step 2 */}
          {currentStep === 2 && !connection && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Connection: {formData.name}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{DATABASE_TYPES.find(t => t.value === formData.type)?.icon}</span>
                    <span>{DATABASE_TYPES.find(t => t.value === formData.type)?.label}</span>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={goToStep1}>
                  Edit
                </Button>
              </div>
            </div>
          )}

          {/* Connection Name - only show in edit mode */}
          {connection && (
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
          )}

          {/* Database Type - only show in edit mode */}
          {connection && (
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
                <SelectContent className="max-h-[400px]">
                  {/* Group database types by category */}
                  {['Traditional', 'AWS', 'Azure', 'Google Cloud', 'Analytics'].map(category => {
                    const typesInCategory = DATABASE_TYPES.filter(
                      dbType => dbType.category === category
                    );
                    if (typesInCategory.length === 0) return null;

                    return (
                      <div key={category}>
                        {/* Category Header */}
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
                          {category === 'Traditional'
                            ? '🖥️ Traditional Databases'
                            : category === 'AWS'
                              ? '☁️ Amazon Web Services'
                              : category === 'Azure'
                                ? '🔷 Microsoft Azure'
                                : category === 'Google Cloud'
                                  ? '🟦 Google Cloud Platform'
                                  : category === 'Analytics'
                                    ? '📊 Analytics & Big Data'
                                    : category}
                        </div>
                        {/* Database options in this category */}
                        {typesInCategory.map(dbType => (
                          <SelectItem key={dbType.value} value={dbType.value}>
                            <div className="flex items-center gap-2">
                              <span>{dbType.icon}</span>
                              <div className="flex flex-col">
                                <span>{dbType.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {dbType.description}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {/* Cloud-specific fields based on database type */}
          {(() => {
            const dbType = DATABASE_TYPES.find(t => t.value === formData.type);
            if (!dbType?.cloudProvider) return null;

            return (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600 font-medium">☁️ Cloud Configuration</span>
                  <Tooltip
                    title={`Configure ${dbType.cloudProvider}-specific settings for ${dbType.label}`}
                  >
                    <HelpCircle className="h-4 w-4 text-blue-500 cursor-help" />
                  </Tooltip>
                </div>

                {/* AWS-specific fields */}
                {dbType.cloudProvider === 'AWS' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="region">AWS Region</Label>
                        <Input
                          id="region"
                          name="region"
                          value={formData.region}
                          onChange={handleChange}
                          placeholder="us-east-1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endpoint">RDS Endpoint</Label>
                        <Input
                          id="endpoint"
                          name="endpoint"
                          value={formData.endpoint}
                          onChange={handleChange}
                          placeholder="mydb.cluster-xxx.us-east-1.rds.amazonaws.com"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Azure-specific fields */}
                {dbType.cloudProvider === 'Azure' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="endpoint">Azure SQL Server Name</Label>
                      <Input
                        id="endpoint"
                        name="endpoint"
                        value={formData.endpoint}
                        onChange={handleChange}
                        placeholder="myserver.database.windows.net"
                      />
                    </div>
                  </>
                )}

                {/* Google Cloud-specific fields */}
                {dbType.cloudProvider === 'GCP' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="projectId">Project ID</Label>
                        <Input
                          id="projectId"
                          name="projectId"
                          value={formData.projectId}
                          onChange={handleChange}
                          placeholder="my-gcp-project"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="region">Region</Label>
                        <Input
                          id="region"
                          name="region"
                          value={formData.region}
                          onChange={handleChange}
                          placeholder="us-central1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instanceConnectionName">Instance Connection Name</Label>
                      <Input
                        id="instanceConnectionName"
                        name="instanceConnectionName"
                        value={formData.instanceConnectionName}
                        onChange={handleChange}
                        placeholder="project:region:instance"
                      />
                    </div>
                  </>
                )}

                {/* Snowflake-specific fields */}
                {dbType.cloudProvider === 'Snowflake' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="accountId">Account Identifier</Label>
                        <Input
                          id="accountId"
                          name="accountId"
                          value={formData.accountId}
                          onChange={handleChange}
                          placeholder="xy12345.us-east-1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="warehouseName">Warehouse Name</Label>
                        <Input
                          id="warehouseName"
                          name="warehouseName"
                          value={formData.warehouseName}
                          onChange={handleChange}
                          placeholder="COMPUTE_WH"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Authentication Method</Label>
                      <Select
                        value={formData.authMethod}
                        onValueChange={value =>
                          setFormData(prev => ({ ...prev, authMethod: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="password">Username/Password</SelectItem>
                          <SelectItem value="keypair">Key Pair Authentication</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.authMethod === 'keypair' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="privateKey">Private Key</Label>
                          <Input
                            id="privateKey"
                            name="privateKey"
                            type="password"
                            value={formData.privateKey}
                            onChange={handleChange}
                            placeholder="-----BEGIN PRIVATE KEY-----..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="passphrase">Private Key Passphrase (optional)</Label>
                          <Input
                            id="passphrase"
                            name="passphrase"
                            type="password"
                            value={formData.passphrase}
                            onChange={handleChange}
                            placeholder="Enter passphrase if key is encrypted"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })()}

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
              <User
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: '#ff0000 !important', zIndex: 10 }}
              />
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
              <Lock
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                style={{ color: '#ff0000 !important', zIndex: 10 }}
              />
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
        </>
      )}

      <div className="flex justify-between pt-4">
        {/* Step 1 Footer */}
        {currentStep === 1 && !connection && (
          <div className="flex justify-between w-full">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={goToStep2} disabled={!canAdvanceToStep2}>
              Next: Configure Connection
            </Button>
          </div>
        )}

        {/* Step 2 Footer or Edit Mode Footer */}
        {(currentStep === 2 || connection) && (
          <>
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
              {currentStep === 2 && !connection && (
                <Button type="button" variant="outline" onClick={goToStep1} disabled={isSubmitting}>
                  Back
                </Button>
              )}
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
                  'Save Connection'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </form>
  );
};

export default ConnectionForm;
