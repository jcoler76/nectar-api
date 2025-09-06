import api from './api';

export const getSchemaInfo = async serviceId => {
  try {
    const response = await api.get(`/api/services/${serviceId}/schema`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching schema for service ${serviceId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch schema information');
  }
};

export const getTableDetails = async (serviceId, tableName) => {
  try {
    const response = await api.get(`/api/services/${serviceId}/schema/${tableName}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching table details for ${serviceId}/${tableName}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch table details');
  }
};
