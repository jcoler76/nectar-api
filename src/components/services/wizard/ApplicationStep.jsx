import { Loader2, Key, Smartphone } from 'lucide-react';
import { useEffect } from 'react';

import { useWizardValidation } from '../../../hooks/useWizardValidation';
import { createApplication } from '../../../services/applicationService';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { StepCard, FormField } from '../../wizard/shared';

const ApplicationStep = ({ roleData, data, onDataChange, onComplete, setError }) => {
  const {
    formData,
    validating: creating,
    error,
    handleInputChange,
    validate,
  } = useWizardValidation({
    name: data?.name || '',
    description: data?.description || '',
    customApiKey: data?.customApiKey || '',
    useCustomKey: data?.useCustomKey || false,
    isActive: data?.isActive !== undefined ? data.isActive : true,
  });

  // Sync errors with parent component
  useEffect(() => {
    if (error) {
      setError(error);
    }
  }, [error, setError]);

  const handleFieldChange = (field, value) => {
    const updatedData = handleInputChange(field, value);
    onDataChange(updatedData);
  };

  const generateRandomKey = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'mk_';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    handleFieldChange('customApiKey', result);
  };

  const validateAndCreate = async () => {
    await validate(async () => {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Application name is required.');
      }

      if (formData.useCustomKey && !formData.customApiKey.trim()) {
        throw new Error('Custom API key is required when enabled.');
      }

      try {
        // Prepare application data
        const applicationData = {
          name: formData.name,
          description: formData.description,
          defaultRole: roleData.id,
          isActive: formData.isActive,
        };

        // Add custom API key if provided
        if (formData.useCustomKey && formData.customApiKey) {
          applicationData.apiKey = formData.customApiKey;
        }

        // Create the application
        const result = await createApplication(applicationData);

        // Complete the wizard with the result
        onComplete({
          application: result.application,
          apiKey: result.apiKey,
        });
      } catch (err) {
        console.error('Error creating application:', err);
        throw new Error(err.response?.data?.message || 'Failed to create application');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Application Setup</h3>
        <p className="text-muted-foreground mb-6">
          Create an application that will use your API endpoints. This will generate the API key for
          authentication.
        </p>
      </div>

      {/* Application Information */}
      <StepCard
        title="Application Information"
        description="Define the application that will consume your API"
        icon={Smartphone}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Application Name" required htmlFor="appName">
              <Input
                id="appName"
                value={formData.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                placeholder="e.g., Customer Portal App"
                disabled={creating}
              />
            </FormField>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.isActive}
                  onCheckedChange={checked => handleFieldChange('isActive', checked)}
                  disabled={creating}
                />
                Active Application
              </Label>
              <p className="text-sm text-muted-foreground">
                Only active applications can make API calls
              </p>
            </div>
          </div>

          <FormField label="Description" htmlFor="appDescription">
            <Textarea
              id="appDescription"
              value={formData.description}
              onChange={e => handleFieldChange('description', e.target.value)}
              placeholder="Describe what this application will do..."
              disabled={creating}
              rows={2}
            />
          </FormField>
        </div>
      </StepCard>

      {/* API Key Configuration */}
      <StepCard
        title="API Key Configuration"
        description="Configure how the API key will be generated"
        icon={Key}
      >
        <div className="space-y-4">
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Checkbox
                checked={formData.useCustomKey}
                onCheckedChange={checked => handleFieldChange('useCustomKey', checked)}
                disabled={creating}
              />
              Use Custom API Key
            </Label>

            {formData.useCustomKey && (
              <FormField label="Custom API Key" htmlFor="customApiKey">
                <div className="flex gap-2">
                  <Input
                    id="customApiKey"
                    value={formData.customApiKey}
                    onChange={e => handleFieldChange('customApiKey', e.target.value)}
                    placeholder="Enter your custom API key..."
                    disabled={creating}
                  />
                  <Button onClick={generateRandomKey} variant="outline" disabled={creating}>
                    Generate
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  If not provided, a secure API key will be generated automatically.
                </p>
              </FormField>
            )}

            {!formData.useCustomKey && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  A secure API key will be automatically generated for this application. You&apos;ll
                  be able to copy it on the next step.
                </p>
              </div>
            )}
          </div>
        </div>
      </StepCard>

      {/* Role Assignment Summary */}
      <StepCard
        title="Role Assignment"
        description="This application will be assigned the following role"
      >
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{roleData.name}</p>
              {roleData.description && (
                <p className="text-sm text-muted-foreground">{roleData.description}</p>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {roleData.permissions?.length || 0} permissions
            </div>
          </div>
        </div>
      </StepCard>

      <div className="flex justify-end pt-4">
        <Button onClick={validateAndCreate} disabled={creating || !formData.name} variant="ocean">
          {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Create Application & Generate API Key
        </Button>
      </div>
    </div>
  );
};

export default ApplicationStep;
