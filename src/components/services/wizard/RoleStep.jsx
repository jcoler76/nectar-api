import { Loader2, Shield } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useWizardValidation } from '../../../hooks/useWizardValidation';
import { createRole } from '../../../services/roleService';
import BulkHttpVerbConfig from '../../roles/BulkHttpVerbConfig';
import BulkTableSelection from '../../roles/BulkTableSelection';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { StepCard, FormField } from '../../wizard/shared';

const RoleStep = ({ serviceData, data, onDataChange, onNext, setError }) => {
  const {
    formData,
    setFormData,
    validating: saving,
    error,
    handleInputChange,
    validate,
  } = useWizardValidation({
    name: data?.name || '',
    description: data?.description || '',
    isActive: data?.isActive !== undefined ? data.isActive : true,
    permissions: data?.permissions || [],
    serviceId: data?.serviceId || serviceData?.id || '',
  });

  const [selectedServiceId, setSelectedServiceId] = useState(
    () => data?.serviceId || serviceData?.id || ''
  );
  const [selectedTables, setSelectedTables] = useState(() => data?.selectedTables || []);
  const [bulkPermissions, setBulkPermissions] = useState(() => data?.permissions || []);

  useEffect(() => {
    setError(error || '');
  }, [error, setError]);

  useEffect(() => {
    if (serviceData?.id && !selectedServiceId) {
      setSelectedServiceId(serviceData.id);
    }
  }, [serviceData?.id, selectedServiceId]);

  useEffect(() => {
    setFormData(prev => {
      if (prev.serviceId === selectedServiceId) {
        return prev;
      }
      return { ...prev, serviceId: selectedServiceId };
    });
  }, [selectedServiceId, setFormData]);

  useEffect(() => {
    setFormData(prev => {
      if (prev.permissions === bulkPermissions) {
        return prev;
      }
      return { ...prev, permissions: bulkPermissions };
    });
  }, [bulkPermissions, setFormData]);

  useEffect(() => {
    onDataChange({
      ...formData,
      serviceId: selectedServiceId,
      permissions: bulkPermissions,
      selectedTables,
    });
  }, [formData, selectedServiceId, bulkPermissions, selectedTables, onDataChange]);

  const handleFieldChange = useCallback(
    (field, value) => {
      const updated = handleInputChange(field, value);
      onDataChange({
        ...updated,
        serviceId: selectedServiceId,
        permissions: bulkPermissions,
        selectedTables,
      });
    },
    [handleInputChange, onDataChange, selectedServiceId, bulkPermissions, selectedTables]
  );

  const handleTablesSelected = useCallback(
    (tables, serviceId) => {
      setSelectedTables(tables);
      if (serviceId && serviceId !== selectedServiceId) {
        setSelectedServiceId(serviceId);
      }
      if (tables.length === 0) {
        setBulkPermissions([]);
      }
      setError('');
    },
    [selectedServiceId, setError]
  );

  const handlePermissionsChange = useCallback(
    permissions => {
      setBulkPermissions(permissions);
      setError('');
    },
    [setError]
  );

  const handleRemoveTable = useCallback(tableName => {
    setSelectedTables(prev => prev.filter(table => table.name !== tableName));
  }, []);

  const handleSelectedServiceChange = useCallback(
    serviceId => {
      setSelectedServiceId(serviceId);
      setError('');
    },
    [setError]
  );

  const hasValidPermissions = useMemo(
    () => bulkPermissions.some(permission => Object.values(permission.actions || {}).some(Boolean)),
    [bulkPermissions]
  );

  const canProceed =
    Boolean(formData.name && formData.name.trim()) &&
    Boolean(selectedServiceId) &&
    selectedTables.length > 0 &&
    hasValidPermissions;

  const validateAndNext = async () => {
    await validate(async () => {
      if (!formData.name.trim()) {
        throw new Error('Role name is required.');
      }

      if (!selectedServiceId) {
        throw new Error('Please select a service.');
      }

      if (selectedTables.length === 0) {
        throw new Error('Please select at least one database object.');
      }

      if (bulkPermissions.length === 0) {
        throw new Error('Please configure permissions for the selected objects.');
      }

      if (!hasValidPermissions) {
        throw new Error('Select at least one HTTP method for the chosen objects.');
      }

      try {
        const roleData = {
          name: formData.name,
          description: formData.description,
          serviceId: selectedServiceId,
          permissions: bulkPermissions,
          isActive: formData.isActive,
        };

        const createdRole = await createRole(roleData);

        setFormData(prev => ({ ...prev, id: createdRole.id }));
        onDataChange({
          ...roleData,
          id: createdRole.id,
          selectedTables,
        });
        setError('');
        onNext();
      } catch (err) {
        console.error('Error creating role:', err);

        if (err.message?.includes('Token has expired') || err.message?.includes('Invalid token')) {
          throw new Error('Your session has expired. Please refresh the page and log in again.');
        } else if (
          err.message?.includes('User needs admin privileges') ||
          err.message?.includes('403')
        ) {
          throw new Error(
            'You do not have permission to create roles. Please contact your administrator.'
          );
        } else if (err.message?.includes('already exists')) {
          throw new Error('A role with this name already exists. Please choose a different name.');
        }

        throw new Error(
          err.message || 'Failed to create role. Please try again or contact support.'
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Role Configuration</h3>
        <p className="text-muted-foreground mb-6">
          Create a role that defines which API endpoints can be accessed and what operations are
          allowed.
        </p>
      </div>

      <StepCard
        title="Basic Information"
        description="Define the role name and description"
        icon={Shield}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Role Name" required htmlFor="roleName">
              <Input
                id="roleName"
                value={formData.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                placeholder="e.g., Customer Read Only"
                disabled={saving}
              />
            </FormField>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Checkbox
                  checked={formData.isActive}
                  onCheckedChange={checked => handleFieldChange('isActive', Boolean(checked))}
                  disabled={saving}
                />
                Active Role
              </Label>
              <p className="text-sm text-muted-foreground">
                Only active roles can be assigned to applications
              </p>
            </div>
          </div>

          <FormField label="Description" htmlFor="roleDescription">
            <Textarea
              id="roleDescription"
              value={formData.description}
              onChange={e => handleFieldChange('description', e.target.value)}
              placeholder="Describe what this role can access..."
              disabled={saving}
              rows={2}
            />
          </FormField>
        </div>
      </StepCard>

      <StepCard
        title="Select Database Objects"
        description="Choose the tables, views, or procedures that will be exposed as endpoints."
      >
        <BulkTableSelection
          onTablesSelected={handleTablesSelected}
          selectedService={selectedServiceId}
          setSelectedService={handleSelectedServiceChange}
        />
      </StepCard>

      <StepCard
        title="Configure Endpoint Methods"
        description="Configure HTTP methods for each selected object. These become the role's permissions."
      >
        <BulkHttpVerbConfig
          selectedTables={selectedTables}
          selectedService={selectedServiceId}
          onPermissionsChange={handlePermissionsChange}
          existingPermissions={bulkPermissions}
          onRemoveTable={handleRemoveTable}
        />
      </StepCard>

      <div className="flex justify-end pt-4">
        <Button onClick={validateAndNext} disabled={saving || !canProceed} variant="ocean">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Next: Create Application
        </Button>
      </div>
    </div>
  );
};

export default RoleStep;
