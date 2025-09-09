import {
  Box,
  TextField,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Switch,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { createApplication, updateApplication } from '../../services/applicationService';
import { getRoles } from '../../services/roleService';

const ApplicationForm = ({ application, onSubmitted, onCancel }) => {
  const [formData, setFormData] = useState({
    name: application?.name || '',
    description: application?.description || '',
    apiKey: application?.apiKey || '',
    defaultRole: application?.defaultRole?.id || '',
    isActive: application?.isActive ?? true,
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useCustomApiKey, setUseCustomApiKey] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await getRoles();
        setRoles(data);
      } catch (err) {
        setError('Failed to fetch roles');
      }
    };
    fetchRoles();
  }, []);

  const handleChange = e => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'isActive' ? checked : value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = { ...formData };
      if (!useCustomApiKey || !submitData.apiKey) {
        delete submitData.apiKey;
      }

      if (application) {
        await updateApplication(application.id, submitData);
      } else {
        await createApplication(submitData);
      }
      onSubmitted();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>{application ? 'Edit Application' : 'Create New Application'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          margin="dense"
          label="Application Name"
          name="name"
          fullWidth
          required
          value={formData.name}
          onChange={handleChange}
        />

        <TextField
          margin="dense"
          label="Description"
          name="description"
          fullWidth
          multiline
          rows={3}
          value={formData.description}
          onChange={handleChange}
        />

        {!application && (
          <Box sx={{ mt: 2, mb: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={useCustomApiKey}
                  onChange={e => {
                    setUseCustomApiKey(e.target.checked);
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, apiKey: '' }));
                    }
                  }}
                />
              }
              label="Specify custom API key"
            />
          </Box>
        )}

        {(useCustomApiKey || application) && (
          <TextField
            margin="dense"
            label="API Key"
            name="apiKey"
            fullWidth
            value={formData.apiKey}
            onChange={handleChange}
            helperText={
              useCustomApiKey
                ? 'Enter a custom API key or leave blank to auto-generate.'
                : 'API key cannot be changed after creation.'
            }
            disabled={!!application}
            placeholder={useCustomApiKey ? 'e.g., mapi_your_custom_key_here' : ''}
          />
        )}

        <TextField
          select
          margin="dense"
          label="Default Role"
          name="defaultRole"
          fullWidth
          required
          value={formData.defaultRole}
          onChange={handleChange}
        >
          {roles.map(role => (
            <MenuItem key={role.id} value={role.id}>
              {role.name}
            </MenuItem>
          ))}
        </TextField>

        <FormControlLabel
          control={<Checkbox checked={formData.isActive} onChange={handleChange} name="isActive" />}
          label="Active"
          sx={{ mt: 2 }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {application ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default ApplicationForm;
