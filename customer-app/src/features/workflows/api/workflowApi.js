import api from '../../../services/api'; // Correctly import the configured axios instance

// Get all workflows
export const getWorkflows = async () => {
  const { data } = await api.get('/api/workflows');
  return data;
};

// Get a single workflow by ID
export const getWorkflow = async id => {
  const { data } = await api.get(`/api/workflows/${id}`);
  return data;
};

// Create a new workflow
export const createWorkflow = async workflowData => {
  const { data } = await api.post('/api/workflows', workflowData);
  return data;
};

// Save/update a workflow
export const saveWorkflow = async (id, workflowData) => {
  const { data } = await api.put(`/api/workflows/${id}`, workflowData);
  return data;
};

// Delete a workflow
export const deleteWorkflow = async id => {
  const { data } = await api.delete(`/api/workflows/${id}`);
  return data;
};

// Test a workflow
export const testWorkflow = async (id, triggerData) => {
  const { data } = await api.post(`/api/workflows/${id}/test`, { triggerData });
  return data;
};

// Get workflow runs
export const getWorkflowRuns = async id => {
  const { data } = await api.get(`/api/workflows/${id}/runs`);
  return data;
};
