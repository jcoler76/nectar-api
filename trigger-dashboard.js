const axios = require('axios');

async function triggerDashboard() {
  console.log('Triggering dashboard endpoint to see debug output...');

  try {
    const response = await axios.get('http://localhost:3001/api/dashboard/metrics?days=30', {
      headers: {
        'Authorization': 'Bearer fake-token-to-trigger-endpoint'
      }
    });
    console.log('Response received:', response.status);
  } catch (error) {
    console.log('Expected error (auth):', error.response?.status);
    console.log('Error message:', error.response?.data?.message || error.message);
  }

  console.log('Dashboard endpoint triggered. Check server logs for debug output.');
}

triggerDashboard();