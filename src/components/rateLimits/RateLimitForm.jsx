import {
  Save,
  X,
  Plus,
  Trash2,
  Timer,
  Activity,
  Shield,
  Database,
  Globe,
  MessageSquare,
  Settings,
  Info,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useNotification } from '../../context/NotificationContext';
import { rateLimitApi } from '../../services/rateLimitApi';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  FormContainer,
  FormSection,
  FormGrid,
  FormFieldGroup,
  FormActions,
} from '../ui/form-layout';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

const RateLimitForm = ({ mode = 'create' }) => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [roles, setRoles] = useState([]);
  const [services, setServices] = useState([]);

  const typeIcons = {
    api: Globe,
    auth: Shield,
    upload: Database,
    graphql: Activity,
    websocket: MessageSquare,
    custom: Settings,
  };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      type: 'api',
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      prefix: '',
      message: 'Too many requests, please try again later.',
      keyStrategy: 'application',
      enabled: true,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      execEvenly: false,
      blockDurationMs: 0,
      customKeyGenerator: '',
      environmentOverrides: {
        development: { enabled: true },
        production: { enabled: true },
      },
      applicationLimits: [],
      roleLimits: [],
      componentLimits: [],
    },
  });

  const {
    fields: applicationLimitFields,
    append: appendApplicationLimit,
    remove: removeApplicationLimit,
  } = useFieldArray({
    control,
    name: 'applicationLimits',
  });

  const {
    fields: roleLimitFields,
    append: appendRoleLimit,
    remove: removeRoleLimit,
  } = useFieldArray({
    control,
    name: 'roleLimits',
  });

  const {
    fields: componentLimitFields,
    append: appendComponentLimit,
    remove: removeComponentLimit,
  } = useFieldArray({
    control,
    name: 'componentLimits',
  });

  const watchedType = watch('type');
  const watchedKeyStrategy = watch('keyStrategy');
  const watchedName = watch('name');

  // Auto-generate prefix when name changes
  useEffect(() => {
    if (watchedName && mode === 'create') {
      setValue('prefix', `rl:${watchedName}:`);
    }
  }, [watchedName, setValue, mode]);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [appsRes, rolesRes, servicesRes] = await Promise.all([
          rateLimitApi.getApplications(),
          rateLimitApi.getRoles(),
          rateLimitApi.getServices(),
        ]);

        // Extract arrays from nested response structure
        const apps = appsRes.data?.data || [];
        const roles = rolesRes.data?.data || [];
        const services = servicesRes.data?.data || [];

        setApplications(apps);
        setRoles(roles);
        setServices(services);

        // Load existing config for edit mode
        if (mode === 'edit' && id) {
          const configRes = await rateLimitApi.getConfig(id);
          const config = configRes.data;

          Object.keys(config).forEach(key => {
            if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt' && key !== '__v') {
              setValue(key, config[key]);
            }
          });
        }

        // Handle duplication
        const duplicateId = searchParams.get('duplicate');
        if (duplicateId && mode === 'create') {
          const configRes = await rateLimitApi.getConfig(duplicateId);
          const config = configRes.data;

          Object.keys(config).forEach(key => {
            if (
              key !== '_id' &&
              key !== 'name' &&
              key !== 'createdAt' &&
              key !== 'updatedAt' &&
              key !== '__v'
            ) {
              setValue(key, config[key]);
            }
          });

          setValue('name', `${config.name}_copy`);
          setValue('displayName', `${config.displayName} (Copy)`);
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
        // Initialize with empty arrays on error to prevent map errors
        setApplications([]);
        setRoles([]);
        setServices([]);
        showNotification('Failed to load form data', 'error');
      }
    };

    loadData();
  }, [mode, id, searchParams, setValue, showNotification]);

  const onSubmit = async data => {
    try {
      setLoading(true);

      if (mode === 'create') {
        await rateLimitApi.createConfig(data);
        showNotification('Rate limit configuration created successfully', 'success');
      } else {
        await rateLimitApi.updateConfig(id, {
          ...data,
          changeReason: `Updated via admin interface`,
        });
        showNotification('Rate limit configuration updated successfully', 'success');
      }

      navigate('/rate-limits');
    } catch (error) {
      showNotification(
        error.response?.data?.message || 'Failed to save rate limit configuration',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTimeOptions = [
    { value: 1000, label: '1 second' },
    { value: 5000, label: '5 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 5 * 60000, label: '5 minutes' },
    { value: 15 * 60000, label: '15 minutes' },
    { value: 30 * 60000, label: '30 minutes' },
    { value: 60 * 60000, label: '1 hour' },
    { value: 24 * 60 * 60000, label: '24 hours' },
  ];

  const keyStrategyOptions = [
    { value: 'application', label: 'Application', description: 'Rate limit per application' },
    { value: 'role', label: 'Role', description: 'Rate limit per role' },
    { value: 'component', label: 'Component', description: 'Rate limit per service/procedure' },
    { value: 'ip', label: 'IP Address', description: 'Rate limit per IP address' },
    { value: 'custom', label: 'Custom', description: 'Custom key generation function' },
  ];

  const TypeIcon = typeIcons[watchedType] || Timer;

  return (
    <FormContainer>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-blue-100 text-blue-800">
            <TypeIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {mode === 'create'
                ? 'Create Rate Limit Configuration'
                : 'Edit Rate Limit Configuration'}
            </h1>
            <p className="text-gray-600">
              {mode === 'create'
                ? 'Configure a new rate limiting rule for your API endpoints'
                : 'Modify the rate limiting configuration'}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/rate-limits')}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="limits">Custom Limits</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <FormSection title="Basic Configuration" description="Basic rate limiting settings">
              <FormGrid columns={2}>
                <FormFieldGroup>
                  <Label htmlFor="name">Configuration Name</Label>
                  <Input
                    id="name"
                    {...register('name', {
                      required: 'Name is required',
                      pattern: {
                        value: /^[a-z0-9-_]+$/,
                        message:
                          'Name must contain only lowercase letters, numbers, hyphens, and underscores',
                      },
                    })}
                    placeholder="e.g., api, auth, upload"
                  />
                  {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
                </FormFieldGroup>

                <FormFieldGroup>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    {...register('displayName', { required: 'Display name is required' })}
                    placeholder="e.g., General API Rate Limit"
                  />
                  {errors.displayName && (
                    <p className="text-sm text-red-600">{errors.displayName.message}</p>
                  )}
                </FormFieldGroup>

                <FormFieldGroup className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Describe what this rate limit protects..."
                    rows={3}
                  />
                </FormFieldGroup>

                <FormFieldGroup>
                  <Label htmlFor="type">Type</Label>
                  <Select value={watchedType} onValueChange={value => setValue('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="auth">Authentication</SelectItem>
                      <SelectItem value="upload">File Upload</SelectItem>
                      <SelectItem value="graphql">GraphQL</SelectItem>
                      <SelectItem value="websocket">WebSocket</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </FormFieldGroup>

                <FormFieldGroup>
                  <Label htmlFor="keyStrategy">Key Strategy</Label>
                  <Select
                    value={watchedKeyStrategy}
                    onValueChange={value => setValue('keyStrategy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {keyStrategyOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div>{option.label}</div>
                            <div className="text-xs text-gray-500">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormFieldGroup>

                <FormFieldGroup>
                  <Label htmlFor="max">Max Requests</Label>
                  <Input
                    id="max"
                    type="number"
                    min="1"
                    {...register('max', {
                      required: 'Max requests is required',
                      min: 1,
                    })}
                  />
                  {errors.max && <p className="text-sm text-red-600">{errors.max.message}</p>}
                </FormFieldGroup>

                <FormFieldGroup>
                  <Label htmlFor="windowMs">Time Window</Label>
                  <Select
                    value={watch('windowMs')?.toString()}
                    onValueChange={value => setValue('windowMs', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formatTimeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormFieldGroup>

                <FormFieldGroup className="col-span-2">
                  <Label htmlFor="message">Error Message</Label>
                  <Input
                    id="message"
                    {...register('message', { required: 'Error message is required' })}
                    placeholder="Message shown when rate limit is exceeded"
                  />
                  {errors.message && (
                    <p className="text-sm text-red-600">{errors.message.message}</p>
                  )}
                </FormFieldGroup>

                <FormFieldGroup className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enabled"
                      {...register('enabled')}
                      checked={watch('enabled')}
                      onCheckedChange={checked => setValue('enabled', checked)}
                    />
                    <Label htmlFor="enabled">Enable this rate limit configuration</Label>
                  </div>
                </FormFieldGroup>
              </FormGrid>
            </FormSection>
          </TabsContent>

          <TabsContent value="limits" className="space-y-6">
            <FormSection
              title="Custom Limits"
              description="Override default limits for specific applications, roles, or components"
            >
              {/* Application Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Application-Specific Limits
                  </CardTitle>
                  <CardDescription>
                    Set different rate limits for specific applications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {applicationLimitFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label>Application</Label>
                        <Select
                          value={watch(`applicationLimits.${index}.applicationId`)}
                          onValueChange={value =>
                            setValue(`applicationLimits.${index}.applicationId`, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select application" />
                          </SelectTrigger>
                          <SelectContent>
                            {(applications || []).map(app => (
                              <SelectItem key={app._id} value={app._id}>
                                {app.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32">
                        <Label>Max Requests</Label>
                        <Input
                          type="number"
                          min="1"
                          {...register(`applicationLimits.${index}.max`, {
                            required: true,
                            min: 1,
                          })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeApplicationLimit(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendApplicationLimit({ applicationId: '', max: 100 })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Application Limit
                  </Button>
                </CardContent>
              </Card>

              {/* Role Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role-Specific Limits
                  </CardTitle>
                  <CardDescription>Set different rate limits for specific roles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roleLimitFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label>Role</Label>
                        <Select
                          value={watch(`roleLimits.${index}.roleId`)}
                          onValueChange={value => setValue(`roleLimits.${index}.roleId`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {(roles || []).map(role => (
                              <SelectItem key={role._id} value={role._id}>
                                <div>
                                  <div>{role.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {role.serviceId?.name}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32">
                        <Label>Max Requests</Label>
                        <Input
                          type="number"
                          min="1"
                          {...register(`roleLimits.${index}.max`, { required: true, min: 1 })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRoleLimit(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendRoleLimit({ roleId: '', max: 100 })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Role Limit
                  </Button>
                </CardContent>
              </Card>

              {/* Component Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Component-Specific Limits
                  </CardTitle>
                  <CardDescription>Set rate limits for specific service procedures</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {componentLimitFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label>Service</Label>
                        <Select
                          value={watch(`componentLimits.${index}.serviceId`)}
                          onValueChange={value =>
                            setValue(`componentLimits.${index}.serviceId`, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            {(services || []).map(service => (
                              <SelectItem key={service._id} value={service._id}>
                                {service.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label>Procedure Name</Label>
                        <Input
                          {...register(`componentLimits.${index}.procedureName`, {
                            required: true,
                          })}
                          placeholder="e.g., uspGetCustomers"
                        />
                      </div>
                      <div className="w-32">
                        <Label>Max Requests</Label>
                        <Input
                          type="number"
                          min="1"
                          {...register(`componentLimits.${index}.max`, { required: true, min: 1 })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeComponentLimit(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendComponentLimit({ serviceId: '', procedureName: '', max: 10 })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Component Limit
                  </Button>
                </CardContent>
              </Card>
            </FormSection>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <FormSection title="Advanced Settings" description="Advanced rate limiting options">
              <FormGrid columns={2}>
                <FormFieldGroup>
                  <Label htmlFor="prefix">Redis Key Prefix</Label>
                  <Input
                    id="prefix"
                    {...register('prefix', { required: 'Redis key prefix is required' })}
                    placeholder="e.g., rl:api:"
                  />
                  {errors.prefix && <p className="text-sm text-red-600">{errors.prefix.message}</p>}
                </FormFieldGroup>

                <FormFieldGroup>
                  <Label htmlFor="blockDurationMs">Block Duration (ms)</Label>
                  <Input
                    id="blockDurationMs"
                    type="number"
                    min="0"
                    {...register('blockDurationMs', { min: 0 })}
                    placeholder="0 for no blocking"
                  />
                  <p className="text-xs text-gray-500">
                    Time to block requests after limit exceeded (0 = no blocking)
                  </p>
                </FormFieldGroup>

                {watchedKeyStrategy === 'custom' && (
                  <FormFieldGroup className="col-span-2">
                    <Label htmlFor="customKeyGenerator">Custom Key Generator Function</Label>
                    <Textarea
                      id="customKeyGenerator"
                      {...register('customKeyGenerator', {
                        required:
                          watchedKeyStrategy === 'custom'
                            ? 'Custom key generator is required'
                            : false,
                      })}
                      placeholder="(req) => 'custom:' + req.application?._id + ':' + req.ip"
                      rows={3}
                    />
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Return a string key based on the request object. Be careful with security
                        implications.
                      </AlertDescription>
                    </Alert>
                    {errors.customKeyGenerator && (
                      <p className="text-sm text-red-600">{errors.customKeyGenerator.message}</p>
                    )}
                  </FormFieldGroup>
                )}

                <FormFieldGroup className="col-span-2 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="skipSuccessfulRequests"
                      {...register('skipSuccessfulRequests')}
                      checked={watch('skipSuccessfulRequests')}
                      onCheckedChange={checked => setValue('skipSuccessfulRequests', checked)}
                    />
                    <Label htmlFor="skipSuccessfulRequests">
                      Skip successful requests from count
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="skipFailedRequests"
                      {...register('skipFailedRequests')}
                      checked={watch('skipFailedRequests')}
                      onCheckedChange={checked => setValue('skipFailedRequests', checked)}
                    />
                    <Label htmlFor="skipFailedRequests">Skip failed requests from count</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="execEvenly"
                      {...register('execEvenly')}
                      checked={watch('execEvenly')}
                      onCheckedChange={checked => setValue('execEvenly', checked)}
                    />
                    <Label htmlFor="execEvenly">
                      Distribute requests evenly across time window
                    </Label>
                  </div>
                </FormFieldGroup>
              </FormGrid>
            </FormSection>
          </TabsContent>

          <TabsContent value="environment" className="space-y-6">
            <FormSection
              title="Environment Overrides"
              description="Different settings for development and production"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Development Environment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Development Environment</CardTitle>
                    <CardDescription>Settings for development environment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        {...register('environmentOverrides.development.enabled')}
                        checked={watch('environmentOverrides.development.enabled')}
                        onCheckedChange={checked =>
                          setValue('environmentOverrides.development.enabled', checked)
                        }
                      />
                      <Label>Enabled in development</Label>
                    </div>
                    <div>
                      <Label>Max Requests Override</Label>
                      <Input
                        type="number"
                        min="1"
                        {...register('environmentOverrides.development.max')}
                        placeholder="Leave empty to use default"
                      />
                    </div>
                    <div>
                      <Label>Window Override (ms)</Label>
                      <Input
                        type="number"
                        min="1000"
                        {...register('environmentOverrides.development.windowMs')}
                        placeholder="Leave empty to use default"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Production Environment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Production Environment</CardTitle>
                    <CardDescription>Settings for production environment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        {...register('environmentOverrides.production.enabled')}
                        checked={watch('environmentOverrides.production.enabled')}
                        onCheckedChange={checked =>
                          setValue('environmentOverrides.production.enabled', checked)
                        }
                      />
                      <Label>Enabled in production</Label>
                    </div>
                    <div>
                      <Label>Max Requests Override</Label>
                      <Input
                        type="number"
                        min="1"
                        {...register('environmentOverrides.production.max')}
                        placeholder="Leave empty to use default"
                      />
                    </div>
                    <div>
                      <Label>Window Override (ms)</Label>
                      <Input
                        type="number"
                        min="1000"
                        {...register('environmentOverrides.production.windowMs')}
                        placeholder="Leave empty to use default"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </FormSection>
          </TabsContent>
        </Tabs>

        <FormActions align="right">
          <Button type="button" variant="outline" onClick={() => navigate('/rate-limits')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || loading}>
            <Save className="mr-2 h-4 w-4" />
            {mode === 'create' ? 'Create Configuration' : 'Update Configuration'}
          </Button>
        </FormActions>
      </form>
    </FormContainer>
  );
};

export default RateLimitForm;
