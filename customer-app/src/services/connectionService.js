import api from './api';

export const getConnections = async () => {
  try {
    const response = await api.get('/api/connections');
    return response.data;
  } catch (error) {
    console.error('Error fetching connections:', error);
    throw error.response?.data?.message || 'Error fetching connections';
  }
};

export const getConnection = async id => {
  try {
    const response = await api.get(`/api/connections/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching connection ${id}:`, error);
    throw error.response?.data?.message || `Error fetching connection ${id}`;
  }
};

export const createConnection = async connectionData => {
  try {
    const response = await api.post('/api/connections', connectionData);
    return response.data;
  } catch (error) {
    console.error('Error creating connection:', error);
    throw error.response?.data?.message || 'Error creating connection';
  }
};

export const updateConnection = async (id, connectionData) => {
  try {
    const response = await api.put(`/api/connections/${id}`, connectionData);
    return response.data;
  } catch (error) {
    console.error(`Error updating connection ${id}:`, error);
    throw error.response?.data?.message || `Error updating connection ${id}`;
  }
};

export const deleteConnection = async (id, force = false) => {
  try {
    const response = await api.delete(`/api/connections/${id}`, {
      params: { force },
    });
    return {
      ...response.data,
      success: true,
    };
  } catch (error) {
    // Check if error is due to dependencies
    if (error.response?.data?.message?.includes('dependent records')) {
      // Extract dependency information from error message
      const match = error.response.data.message.match(/\(([^)]+)\)/g);
      const dependencies = match ? match[0].slice(1, -1) : 'dependent records';
      const serviceNames = match && match[1] ? match[1].slice(1, -1) : '';

      return {
        success: false,
        hasDependencies: true,
        dependencies,
        serviceNames,
        message: error.response.data.message,
        error: error.response.data.message,
      };
    }

    console.error(`Error deleting connection ${id}:`, error);
    // Throw the entire error object to preserve status codes
    throw error;
  }
};

export const testConnection = async id => {
  try {
    const response = await api.post(`/api/connections/${id}/test`);
    return response.data;
  } catch (error) {
    console.error(`Error testing connection ${id}:`, error);
    throw error.response?.data?.message || `Error testing connection ${id}`;
  }
};

export const testConnectionDetails = async connectionData => {
  try {
    const response = await api.post('/api/connections/test', connectionData);
    return response.data;
  } catch (error) {
    console.error('Error testing connection details:', error);
    const errorMessage = error.response?.data?.error || 'Connection test failed';
    throw new Error(errorMessage);
  }
};

export const refreshConnectionDatabases = async id => {
  try {
    const response = await api.post(`/api/connections/${id}/refresh-databases`);
    return response.data;
  } catch (error) {
    console.error(`Error refreshing databases for connection ${id}:`, error);
    throw error.response?.data?.message || `Error refreshing databases for connection ${id}`;
  }
};

export const getConnectionDatabases = async id => {
  try {
    const response = await api.get(`/api/connections/${id}/databases`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching databases for connection ${id}:`, error);
    throw error.response?.data?.message || `Error fetching databases for connection ${id}`;
  }
};

export const getConnectionSchema = async (connectionId, database) => {
  try {
    const response = await api.post(`/api/connections/${connectionId}/table-columns`, { database });
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching schema for connection ${connectionId}, database ${database}:`,
      error
    );
    throw error.response?.data?.message || `Error fetching schema`;
  }
};
