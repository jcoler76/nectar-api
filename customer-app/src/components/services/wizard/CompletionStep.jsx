import { CheckCircle, FileText, Key, Database, Shield, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { StepCard, ActionBadge, ApiKeyDisplay } from '../../wizard/shared';

const CompletionStep = ({ wizardData, onFinish }) => {
  const navigate = useNavigate();
  const { service, role, application, apiKey } = wizardData;

  // Debug log to check application data structure

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-green-700">Endpoint Wizard Complete!</h3>
          <p className="text-muted-foreground mt-2">
            Your API endpoint has been successfully created and is ready to use.
          </p>
        </div>
      </div>

      {/* API Key Display */}
      <StepCard
        title="Your API Key"
        description="Copy this API key now - you won't be able to see it again!"
        icon={Key}
        className="border-green-200 dark:border-green-800"
      >
        <ApiKeyDisplay apiKey={apiKey} className="space-y-4" />
      </StepCard>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Service Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              Service Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{service?.name}</p>
              <p className="text-sm text-muted-foreground">{service?.database}</p>
              {service?.description && (
                <p className="text-xs text-muted-foreground">{service.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Role Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              Role Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{role?.name}</p>
              <p className="text-sm text-muted-foreground">
                {role?.permissions?.length || 0} permissions
              </p>
              {role?.description && (
                <p className="text-xs text-muted-foreground">{role.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Application Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4" />
              Application Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">
                {application?.name ||
                  application?.application?.name ||
                  role?.name?.replace(' Role', ' App') ||
                  'Application'}
              </p>
              <p className="text-sm text-muted-foreground">
                {(application?.isActive !== undefined ? application.isActive : true)
                  ? 'Active'
                  : 'Inactive'}
              </p>
              {(application?.description || application?.application?.description) && (
                <p className="text-xs text-muted-foreground">
                  {application?.description || application?.application?.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Detail */}
      {role?.permissions && role.permissions.length > 0 && (
        <StepCard
          title="API Endpoints Available"
          description="These endpoints are now accessible with your API key"
        >
          <div className="space-y-3">
            {role.permissions.map((permission, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{permission.objectName}</p>
                </div>
                <div className="flex gap-1">
                  {Object.entries(permission.actions)
                    .filter(([, allowed]) => allowed)
                    .map(([action]) => (
                      <ActionBadge key={action} action={action} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </StepCard>
      )}

      {/* Next Steps */}
      <StepCard
        title="Next Steps"
        description="Here's what you can do now that your endpoint is ready"
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">Read the API Documentation</p>
              <p className="text-sm text-muted-foreground">
                Learn how to make requests to your new endpoints
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Test Your API Key</p>
              <p className="text-sm text-muted-foreground">
                Make a test request to verify everything is working
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-purple-500 mt-0.5" />
            <div>
              <p className="font-medium">Manage Permissions</p>
              <p className="text-sm text-muted-foreground">
                You can modify role permissions anytime from the Roles page
              </p>
            </div>
          </div>
        </div>
      </StepCard>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" onClick={() => navigate('/documentation')}>
          <FileText className="h-4 w-4 mr-2" />
          View Documentation
        </Button>
        <Button onClick={onFinish}>Go to Services</Button>
      </div>
    </div>
  );
};

export default CompletionStep;
