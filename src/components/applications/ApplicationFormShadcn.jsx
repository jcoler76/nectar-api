import { AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

import { createApplication, updateApplication } from '../../services/applicationService';
import { getRoles } from '../../services/roleService';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';

const ApplicationFormShadcn = ({ application, onSubmitted, onCancel }) => {
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
  const [editApiKey, setEditApiKey] = useState(false);

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

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = { ...formData };

      // For new applications: include API key only if custom key is enabled
      // For existing applications: include API key only if edit is enabled and key is provided
      if (application) {
        if (!editApiKey || !submitData.apiKey) {
          delete submitData.apiKey;
        }
      } else {
        if (!useCustomApiKey || !submitData.apiKey) {
          delete submitData.apiKey;
        }
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
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{application ? 'Edit Application' : 'Create New Application'}</DialogTitle>
        <DialogDescription>
          {application
            ? 'Update the application details below.'
            : 'Fill in the details to create a new application.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Application Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            required
            placeholder="Enter application name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="Enter application description"
            rows={3}
          />
        </div>

        {!application && (
          <div className="flex items-center space-x-2">
            <Switch
              id="use-custom-key"
              checked={useCustomApiKey}
              onCheckedChange={checked => {
                setUseCustomApiKey(checked);
                if (!checked) {
                  handleChange('apiKey', '');
                }
              }}
            />
            <Label htmlFor="use-custom-key" className="cursor-pointer">
              Specify custom API key
            </Label>
          </div>
        )}

        {application && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-api-key"
              checked={editApiKey}
              onCheckedChange={checked => {
                setEditApiKey(checked);
                if (!checked) {
                  handleChange('apiKey', '');
                }
              }}
            />
            <Label htmlFor="edit-api-key" className="cursor-pointer">
              Update API key
            </Label>
          </div>
        )}

        {(useCustomApiKey || editApiKey) && (
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              value={formData.apiKey}
              onChange={e => handleChange('apiKey', e.target.value)}
              placeholder="e.g., mapi_your_custom_key_here"
            />
            <p className="text-sm text-muted-foreground">
              {application
                ? 'Enter a new API key value. Leave blank to keep the current key unchanged.'
                : 'Enter a custom API key or leave blank to auto-generate.'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="default-role">Default Role *</Label>
          <Select
            value={formData.defaultRole}
            onValueChange={value => handleChange('defaultRole', value)}
            required
          >
            <SelectTrigger id="default-role">
              <SelectValue placeholder="Select a default role" />
            </SelectTrigger>
            <SelectContent>
              {roles
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is-active"
            checked={formData.isActive}
            onCheckedChange={checked => handleChange('isActive', checked)}
          />
          <Label htmlFor="is-active" className="cursor-pointer">
            Active
          </Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {application ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default ApplicationFormShadcn;
