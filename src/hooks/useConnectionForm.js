import { useEffect, useState } from 'react';

import { getDatabaseType } from '../constants/databaseTypes';

export const useConnectionForm = (connection, open) => {
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
    const dbType = getDatabaseType(value);
    setFormData(prev => ({
      ...prev,
      type: value,
      port: dbType?.defaultPort || 1433,
    }));
  };

  const updateFormData = updates => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return {
    formData,
    isSubmitting,
    isTesting,
    error,
    setIsSubmitting,
    setIsTesting,
    setError,
    handleChange,
    handleDatabaseTypeChange,
    updateFormData,
  };
};
