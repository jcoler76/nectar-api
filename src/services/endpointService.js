import api from './api';

export const getEndpoints = async () => {
  try {
    const response = await api.get('/api/developer-endpoints');
    const data = response.data;

    // Ensure we always return an array
    if (Array.isArray(data)) {
      return data;
    } else {
      console.error('Expected array from API but received:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    // Always return empty array on error to prevent .map() issues
    return [];
  }
};

export const createEndpoint = async endpointData => {
  try {
    const response = await api.post('/api/developer-endpoints', endpointData);
    return response.data;
  } catch (error) {
    console.error('Error creating endpoint:', error);
    throw (
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      'Error creating endpoint'
    );
  }
};

export const regenerateEndpointKey = async id => {
  try {
    const response = await api.post(`/api/developer-endpoints/${id}/regenerate-key`);
    return response.data;
  } catch (error) {
    console.error(`Error regenerating key for endpoint ${id}:`, error);
    throw error.response?.data?.message || 'Error regenerating key';
  }
};

export const deleteEndpoint = async id => {
  try {
    const response = await api.delete(`/api/developer-endpoints/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting endpoint ${id}:`, error);
    throw error.response?.data?.message || `Error deleting endpoint ${id}`;
  }
};
