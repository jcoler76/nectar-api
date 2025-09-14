import { Plus, Trash2, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { createRole, updateRole, getServiceSchema } from '../../services/roleService';
import { getServices } from '../../services/serviceService';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Stepper } from '../ui/stepper';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';

const steps = ['Basic Information', 'Component Permissions'];

const CreateRole = ({ mode = 'create', existingRole = null }) => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [role, setRole] = useState({
    name: '',
    description: '',
    serviceId: '',
    permissions: [],
    isActive: true,
  });
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [components, setComponents] = useState({
    tables: [],
    views: [],
    procedures: [],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newComponent, setNewComponent] = useState({
    serviceId: '',
    objectName: '',
    actions: {
      GET: false,
      POST: false,
      PUT: false,
      PATCH: false,
      DELETE: false,
    },
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleItems, setVisibleItems] = useState(50);
  const [sortedComponents, setSortedComponents] = useState([]);

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (existingRole) {
      setRole({
        name: existingRole.name,
        description: existingRole.description,
        serviceId: existingRole.serviceId,
        permissions: existingRole.permissions || [],
        isActive: existingRole.isActive ?? true,
      });
      form.reset({
        name: existingRole.name,
        description: existingRole.description,
        isActive: existingRole.isActive ?? true,
      });
      setSelectedService(existingRole.serviceId);
      if (existingRole.serviceId) {
        fetchServiceComponents(existingRole.serviceId);
      }
    }
    fetchServices();
  }, [existingRole, form]);

  useEffect(() => {
    const sorted = [
      ...components.procedures.map(p => ({
        ...p,
        type: 'Procedure',
        uniqueId: `proc-${p.name}`,
        path: `/proc/${p.name}`,
      })),
      ...components.tables.map(t => ({
        ...t,
        type: 'Table',
        uniqueId: `table-${t.name}`,
        path: `/table/${t.name}`,
      })),
      ...components.views.map(v => ({
        ...v,
        type: 'View',
        uniqueId: `view-${v.name}`,
        path: `/view/${v.name}`,
      })),
    ];
    setSortedComponents(sorted);
  }, [components]);

  const fetchServices = async () => {
    try {
      const data = await getServices();
      setServices(data);
    } catch (err) {
      setError('Failed to fetch services');
    }
  };

  const fetchServiceComponents = async serviceId => {
    try {
      setLoading(true);
      const schema = await getServiceSchema(serviceId);

      setComponents({
        tables: schema.tables || [],
        views: schema.views || [],
        procedures: schema.procedures || [],
      });
    } catch (err) {
      console.error('Error fetching components:', err);
      setError('Failed to fetch service components');
      setComponents({ tables: [], views: [], procedures: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      const formData = form.getValues();
      if (!formData.name) {
        setError('Please enter a role name');
        return;
      }

      // Clear error when proceeding with valid data
      setError('');

      setRole(prev => ({
        ...prev,
        name: formData.name,
        description: formData.description,
        isActive: formData.isActive,
      }));

      if (mode === 'edit' && activeStep === 0) {
        try {
          if (
            formData.name !== existingRole.name ||
            formData.description !== existingRole.description
          ) {
            const updatedRole = {
              ...existingRole,
              name: formData.name,
              description: formData.description,
              serviceId: existingRole.serviceId,
              permissions: existingRole.permissions,
              isActive: formData.isActive,
            };

            const result = await updateRole(existingRole.id, updatedRole);

            setRole(prev => ({
              ...prev,
              ...result,
            }));
          }
        } catch (err) {
          console.error('Error updating role:', err);
          setError('Failed to update role');
          return;
        }
      }
    }

    setActiveStep(prevStep => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      if (!role.name) {
        setError('Role name is required');
        return;
      }

      const roleData = {
        name: role.name,
        description: role.description,
        serviceId: selectedService || role.serviceId,
        permissions: role.permissions || [],
        isActive: role.isActive,
      };

      if (!roleData.serviceId) {
        setError('Service ID is required');
        return;
      }

      if (!roleData.permissions || roleData.permissions.length === 0) {
        setError('At least one component permission is required');
        return;
      }

      if (mode === 'edit') {
        await updateRole(existingRole.id, roleData);
      } else {
        await createRole(roleData);
      }

      navigate('/roles');
    } catch (err) {
      console.error('Role save error:', err);
      setError(err.response?.data?.message || 'Failed to save role');
    }
  };

  const handleServiceChange = async serviceId => {
    setSelectedService(serviceId);
    setNewComponent(prev => ({ ...prev, serviceId }));
    setRole(prev => ({
      ...prev,
      serviceId: serviceId,
    }));
    await fetchServiceComponents(serviceId);
  };

  const handleComponentSelect = selectedValue => {
    if (selectedValue && selectedValue !== 'search') {
      const cleanedPath = selectedValue.replace(/\/proc\/[^.]+\./, '/proc/');

      setNewComponent(prev => ({
        ...prev,
        objectName: cleanedPath,
        originalPath: selectedValue,
      }));
    }
  };

  const handleAddComponent = () => {
    if (!newComponent.serviceId) {
      setError('Please select a service');
      return;
    }

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
      serviceId: newComponent.serviceId,
      objectName: newComponent.objectName,
      actions: { ...newComponent.actions },
    };

    setRole(prev => ({
      ...prev,
      permissions: [...(prev.permissions || []), newPermission],
    }));

    setNewComponent({
      serviceId: selectedService,
      objectName: '',
      actions: {
        GET: false,
        POST: false,
        PUT: false,
        PATCH: false,
        DELETE: false,
      },
    });

    setError('');
  };

  const handleDeleteComponent = index => {
    setRole(prev => ({
      ...prev,
      permissions: prev.permissions.filter((_, i) => i !== index),
    }));
  };

  const handleCancel = () => {
    navigate('/roles');
  };

  const filteredComponents = sortedComponents
    .filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, visibleItems);

  const renderBasicInfo = () => (
    <div className="space-y-4">
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter role name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Enter role description" rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Active</FormLabel>
              </FormItem>
            )}
          />
        </div>
      </Form>
    </div>
  );

  const renderComponentPermissions = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Add Component</span>
            <Button variant="ghost" size="icon" onClick={handleAddComponent}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Service</Label>
              <Select value={newComponent.serviceId} onValueChange={handleServiceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Component</Label>
              <div className="relative">
                <Select
                  value={newComponent.originalPath || ''}
                  onValueChange={handleComponentSelect}
                  disabled={!newComponent.serviceId || loading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loading ? 'Loading components...' : 'Select a component'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="sticky top-0 p-2 bg-background border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search components..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="pl-8"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div
                      className="max-h-[300px] overflow-auto"
                      onScroll={e => {
                        const { scrollTop, clientHeight, scrollHeight } = e.target;
                        if (scrollHeight - scrollTop <= clientHeight * 1.5) {
                          setVisibleItems(prev => prev + 50);
                        }
                      }}
                    >
                      {filteredComponents.map(obj => {
                        if (!obj.name) return null;
                        return (
                          <SelectItem key={obj.uniqueId} value={obj.path}>
                            <div className="flex flex-col">
                              <span>{obj.name}</span>
                              <span className="text-xs text-muted-foreground">{obj.type}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Methods</Label>
              <div className="space-y-2 border rounded-md p-3">
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(method => (
                  <div key={method} className="flex items-center space-x-2">
                    <Checkbox
                      id={method}
                      checked={newComponent.actions[method]}
                      onCheckedChange={checked => {
                        setNewComponent(prev => ({
                          ...prev,
                          actions: {
                            ...prev.actions,
                            [method]: checked,
                          },
                        }));
                      }}
                    />
                    <Label htmlFor={method} className="text-sm font-normal cursor-pointer">
                      {method}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="w-[50px]">Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {role.permissions.map((permission, index) => (
                <TableRow key={`${permission.serviceId}-${permission.objectName}`}>
                  <TableCell>{services.find(s => s.id === permission.serviceId)?.name}</TableCell>
                  <TableCell>{permission.objectName}</TableCell>
                  <TableCell>
                    {Object.entries(permission.actions)
                      .filter(([, enabled]) => enabled)
                      .map(([method]) => method)
                      .join(', ')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteComponent(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Stepper steps={steps} activeStep={activeStep} className="mb-8" />

      <Card>
        <CardContent className="pt-6">
          {activeStep === 0 ? renderBasicInfo() : renderComponentPermissions()}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row justify-end mt-6 gap-2">
        <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
            Back
          </Button>
        )}
        {activeStep === steps.length - 1 ? (
          <Button onClick={handleSubmit} variant="ocean" className="w-full sm:w-auto">
            {mode === 'edit' ? 'Update' : 'Create'} Role
          </Button>
        ) : (
          <Button onClick={handleNext} variant="ocean" className="w-full sm:w-auto">
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreateRole;
