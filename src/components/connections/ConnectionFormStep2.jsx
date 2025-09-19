import { Tooltip } from '@mui/material';
import { Database, HelpCircle, Lock, Server, User } from 'lucide-react';

import { getDatabaseType } from '../../constants/databaseTypes';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

import ConnectionFormStep1 from './ConnectionFormStep1';
import CloudConfiguration from './cloud/CloudConfiguration';

const ConnectionFormStep2 = ({
  formData,
  handleChange,
  handleDatabaseTypeChange,
  updateFormData,
  connection,
  currentStep,
  goToStep1,
}) => {
  return (
    <>
      {/* Show connection name and type as readonly in step 2 */}
      {currentStep === 2 && !connection && (
        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Connection: {formData.name}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{getDatabaseType(formData.type)?.icon}</span>
                <span>{getDatabaseType(formData.type)?.label}</span>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={goToStep1}>
              Edit
            </Button>
          </div>
        </div>
      )}

      {/* Connection Name and Database Type - only show in edit mode */}
      {connection && (
        <ConnectionFormStep1
          formData={formData}
          handleChange={handleChange}
          handleDatabaseTypeChange={handleDatabaseTypeChange}
        />
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
          onCheckedChange={checked => updateFormData({ sslEnabled: checked })}
        />
        <Label htmlFor="sslEnabled" className="text-sm font-normal">
          Enable SSL/TLS Connection
        </Label>
        <Tooltip title="Enable encrypted connection to the database server. Recommended for production environments and required for many cloud databases.">
          <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
        </Tooltip>
      </div>

      {/* Cloud Configuration */}
      <CloudConfiguration
        formData={formData}
        handleChange={handleChange}
        updateFormData={updateFormData}
      />

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
  );
};

export default ConnectionFormStep2;
