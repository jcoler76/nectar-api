import { AlertCircle, Loader2, Plus, RefreshCw, Shield, Trash2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useWizardValidation } from '../../../hooks/useWizardValidation';
import { createRole } from '../../../services/roleService';
import {
  clearServiceComponentsCache,
  getServiceComponents,
  refreshServiceSchema,
} from '../../../services/serviceService';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { StepCard, FormField, LoadingState, ActionBadge } from '../../wizard/shared';

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
  });
  const [serviceComponents, setServiceComponents] = useState([]);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [hasTriedRefresh, setHasTriedRefresh] = useState(false);
  const [componentSearch, setComponentSearch] = useState('');
  const [visibleItemsCount, setVisibleItemsCount] = useState(50);

  // Sync errors with parent component
  useEffect(() => {
    if (error) {
      setError(error);
    }
  }, [error, setError]);

  const [newComponent, setNewComponent] = useState({
    objectName: '',
    actions: {
      GET: false,
      POST: false,
      PUT: false,
      DELETE: false,
    },
  });

  // Memoize filtered and sorted components for better performance
  const processedComponents = useMemo(() => {
    if (!serviceComponents || serviceComponents.length === 0) return [];

    let filtered = serviceComponents
      .filter(component => component && component.name)
      .map(component => ({
        ...component,
        displayName: `${component.schema_name || 'dbo'}.${component.name}`,
        description: `${component.object_category || component.type_desc || component.type}`,
        sortKey: `${component.object_category || 'ZZZ'}_${component.name}`,
      }));

    // Apply search filter if search query exists
    if (componentSearch.trim()) {
      const searchLower = componentSearch.toLowerCase();
      filtered = filtered.filter(
        component =>
          component.name.toLowerCase().includes(searchLower) ||
          component.displayName.toLowerCase().includes(searchLower) ||
          component.description.toLowerCase().includes(searchLower)
      );
    }

    return filtered.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [serviceComponents, componentSearch]);

  const fetchServiceComponents = useCallback(
    async (forceRefresh = false) => {
      if (!serviceData?.id) return;

      setLoadingComponents(true);

      try {
        if (forceRefresh) {
          // Clear cache before fetching
          clearServiceComponentsCache(serviceData.id);
        }

        const components = await getServiceComponents(serviceData.id);

        // If no components returned and we haven't tried refresh yet, attempt schema refresh
        if ((!components || components.length === 0) && !hasTriedRefresh && !forceRefresh) {
          try {
            setError('Database schema is being analyzed. This may take a moment...');
            await refreshServiceSchema(serviceData.id);
            setHasTriedRefresh(true);

            // Wait a bit for the refresh to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Try fetching components again
            const refreshedComponents = await getServiceComponents(serviceData.id);
            setServiceComponents(refreshedComponents || []);
          } catch (refreshErr) {
            console.warn('Schema refresh attempt failed:', refreshErr);
            setServiceComponents([]);
            setError(
              'Database schema is still being analyzed. You can add components manually or try refreshing again.'
            );
          }
        } else {
          setServiceComponents(components || []);
        }

        // Clear any previous errors if we got components
        if (components && components.length > 0) {
          setError('');
        }
      } catch (err) {
        console.error('Error fetching service components:', err);

        // Enhanced error handling for different scenarios
        if (err.response?.status === 401) {
          setError('Your session has expired. Please refresh the page and log in again.');
        } else if (err.response?.status === 403) {
          setError(
            'You do not have permission to access this service. Please contact your administrator.'
          );
        } else if (err.response?.status === 404) {
          setError('Service not found. The service may have been deleted.');
        } else if (err.response?.status === 500) {
          setError('Server error while loading components. Please try again or contact support.');
        } else {
          setError(
            'Failed to load database components. You can add them manually or try refreshing.'
          );
        }
        setServiceComponents([]);
      } finally {
        setLoadingComponents(false);
      }
    },
    [serviceData?.id, hasTriedRefresh, setError]
  );

  useEffect(() => {
    if (serviceData?.id) {
      fetchServiceComponents();
    }
  }, [serviceData, fetchServiceComponents]);

  const handleFieldChange = (field, value) => {
    const updatedData = handleInputChange(field, value);
    onDataChange(updatedData);
  };

  const handleActionChange = (action, checked) => {
    setNewComponent(prev => ({
      ...prev,
      actions: {
        ...prev.actions,
        [action]: checked,
      },
    }));
  };

  const handleAddComponent = () => {
    if (!newComponent.objectName) {
      setError('Please select a component');
      return;
    }

    const hasActions = Object.values(newComponent.actions).some(v => v);
    if (!hasActions) {
      setError('Please select at least one method');
      return;
    }

    const newPermission = {
      serviceId: serviceData.id,
      objectName: newComponent.objectName,
      actions: { ...newComponent.actions },
    };

    const updatedPermissions = [...formData.permissions, newPermission];
    const updatedData = { ...formData, permissions: updatedPermissions };

    setFormData(updatedData);
    onDataChange(updatedData);

    // Reset form
    setNewComponent({
      objectName: '',
      actions: {
        GET: false,
        POST: false,
        PUT: false,
        DELETE: false,
      },
    });
    setError('');
  };

  const handleRemovePermission = index => {
    const updatedPermissions = formData.permissions.filter((_, i) => i !== index);
    const updatedData = { ...formData, permissions: updatedPermissions };
    setFormData(updatedData);
    onDataChange(updatedData);
  };

  const validateAndNext = async () => {
    await validate(async () => {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Role name is required.');
      }

      if (!formData.permissions || formData.permissions.length === 0) {
        throw new Error('At least one component permission is required.');
      }

      try {
        // Create the role
        const roleData = {
          name: formData.name,
          description: formData.description,
          serviceId: serviceData.id,
          permissions: formData.permissions,
          isActive: formData.isActive,
        };

        const createdRole = await createRole(roleData);

        // Update wizard data and proceed
        onDataChange({ ...formData, id: createdRole.id });
        onNext();
      } catch (err) {
        console.error('Error creating role:', err);

        // Enhanced error handling for role creation
        if (err.message.includes('Token has expired') || err.message.includes('Invalid token')) {
          throw new Error('Your session has expired. Please refresh the page and log in again.');
        } else if (
          err.message.includes('User needs admin privileges') ||
          err.message.includes('403')
        ) {
          throw new Error(
            'You do not have permission to create roles. Please contact your administrator.'
          );
        } else if (err.message.includes('already exists')) {
          throw new Error('A role with this name already exists. Please choose a different name.');
        } else {
          throw new Error(
            err.message || 'Failed to create role. Please try again or contact support.'
          );
        }
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

      {/* Basic Role Information */}
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
                  onCheckedChange={checked => handleFieldChange('isActive', checked)}
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

      {/* Component Permissions */}
      <StepCard
        title="Component Permissions"
        description="Select which database objects this role can access and what operations are allowed."
      >
        <div className="space-y-4">
          {/* Add New Permission */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Add Component Permission</h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Database Component *</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchServiceComponents(true)}
                    disabled={loadingComponents || saving}
                    className="h-8"
                  >
                    <RefreshCw
                      className={`h-3 w-3 mr-1 ${loadingComponents ? 'animate-spin' : ''}`}
                    />
                    Refresh
                  </Button>
                </div>
                <Select
                  value={newComponent.objectName}
                  onValueChange={value => {
                    setNewComponent(prev => ({ ...prev, objectName: value }));
                    setComponentSearch(''); // Clear search on selection
                  }}
                  disabled={loadingComponents || saving}
                  onOpenChange={open => {
                    if (!open) {
                      setComponentSearch(''); // Clear search when closing
                      setVisibleItemsCount(50); // Reset visible items
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingComponents
                          ? 'Loading components...'
                          : processedComponents.length === 0 && !componentSearch
                            ? 'No components found - click Refresh'
                            : processedComponents.length === 0 && componentSearch
                              ? 'No matches found'
                              : 'Select a component'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px] p-0">
                    {/* Search input */}
                    <div className="p-2 border-b sticky top-0 bg-background z-10">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search components..."
                          value={componentSearch}
                          onChange={e => {
                            setComponentSearch(e.target.value);
                            setVisibleItemsCount(50); // Reset visible items on search
                          }}
                          className="pl-8 h-9"
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => e.stopPropagation()}
                        />
                      </div>
                      {componentSearch && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Found {processedComponents.length} matches
                        </div>
                      )}
                    </div>

                    {/* Components list with virtualization */}
                    <div
                      className="overflow-y-auto max-h-[300px]"
                      onScroll={e => {
                        const { scrollTop, scrollHeight, clientHeight } = e.target;
                        // Load more items when near bottom
                        if (scrollHeight - scrollTop - clientHeight < 100) {
                          setVisibleItemsCount(prev =>
                            Math.min(prev + 50, processedComponents.length)
                          );
                        }
                      }}
                    >
                      {processedComponents.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          {componentSearch
                            ? 'No components match your search'
                            : 'No components available'}
                        </div>
                      ) : (
                        <>
                          {/* Group by type */}
                          {['PROCEDURE', 'TABLE', 'VIEW'].map(type => {
                            const typeComponents = processedComponents
                              .filter(c => c.object_category === type || c.description === type)
                              .slice(0, visibleItemsCount);

                            if (typeComponents.length === 0) return null;

                            return (
                              <div key={type}>
                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted sticky top-0">
                                  {type}S ({typeComponents.length})
                                </div>
                                {typeComponents.map((component, index) => (
                                  <SelectItem
                                    key={`${type}-${index}`}
                                    value={component.displayName}
                                    className="py-2"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{component.displayName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {component.description}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            );
                          })}

                          {visibleItemsCount < processedComponents.length && (
                            <div className="p-2 text-center text-xs text-muted-foreground">
                              Showing {visibleItemsCount} of {processedComponents.length} components
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </SelectContent>
                </Select>
                <LoadingState loading={loadingComponents} message="Loading components..." />
              </div>

              <div className="space-y-2">
                <Label>Allowed Methods *</Label>
                <div className="flex gap-4">
                  {Object.entries(newComponent.actions).map(([action, checked]) => (
                    <Label key={action} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={checked => handleActionChange(action, checked)}
                        disabled={saving}
                      />
                      <ActionBadge action={action} />
                    </Label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleAddComponent}
                variant="outline"
                size="sm"
                disabled={!newComponent.objectName || saving}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Permission
              </Button>
            </div>
          </div>

          {/* Current Permissions */}
          {formData.permissions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Current Permissions</h4>
              <div className="space-y-2">
                {formData.permissions.map((permission, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{permission.objectName}</p>
                      <div className="flex gap-1 mt-1">
                        {Object.entries(permission.actions)
                          .filter(([, allowed]) => allowed)
                          .map(([action]) => (
                            <ActionBadge key={action} action={action} />
                          ))}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemovePermission(index)}
                      variant="outline"
                      size="sm"
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show helpful message if no components available */}
          {!loadingComponents && processedComponents.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No database components found. This might happen if the database schema hasn&apos;t
                been analyzed yet. Try clicking the &quot;Refresh&quot; button to load the latest
                schema, or you can manually add component names.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </StepCard>

      <div className="flex justify-end pt-4">
        <Button
          onClick={validateAndNext}
          disabled={saving || !formData.name || formData.permissions.length === 0}
          variant="ocean"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Next: Create Application
        </Button>
      </div>
    </div>
  );
};

export default RoleStep;
