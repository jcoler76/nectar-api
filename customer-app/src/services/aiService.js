import api from './api';

export const generateResponse = async prompt => {
  try {
    const response = await api.post('/api/ai/generate', { prompt });
    return response.data;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error(error.response?.data?.message || 'Failed to generate AI response');
  }
};

// Add any other AI-related API calls here
