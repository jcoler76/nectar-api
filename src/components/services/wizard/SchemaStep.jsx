import { CheckCircle, Loader2, Database, Table, Eye, Settings } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

import {
  createService,
  refreshServiceSchema,
  getServiceComponents,
} from '../../../services/serviceService';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { ProgressIndicator } from '../../wizard/shared/ProgressIndicator';

const SchemaStep = ({ serviceData, onComplete, setError }) => {
  const [status, setStatus] = useState('initializing'); // initializing, creating, retrieving, complete, error
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [schemaStats, setSchemaStats] = useState(null);
  const hasRun = useRef(false);

  const createServiceAndRetrieveSchema = useCallback(async () => {
    try {
      setStatus('creating');
      setProgress(20);
      setStatusMessage('Creating service...');
      setError('');

      // Create the service only if we don't already have one
      let service;
      if (serviceData.id) {
        // Service already exists, skip creation
        service = serviceData;
        setProgress(40);
        setStatusMessage('Using existing service...');
      } else {
        // Create the service
        service = await createService(serviceData);
        setProgress(40);
        setStatusMessage('Service created successfully');
      }

      // Wait for schema retrieval (the backend does this automatically)
      setStatus('retrieving');
      setProgress(60);
      setStatusMessage('Retrieving database schema...');

      // Trigger schema refresh and wait for completion
      setStatusMessage('Initializing database schema analysis...');

      try {
        // First trigger the schema refresh
        await refreshServiceSchema(service.id);
      } catch (refreshError) {}

      // Poll for schema completion
      const pollForSchemaCompletion = async serviceId => {
        const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
        let attempts = 0;

        const poll = async () => {
          try {
            attempts++;
            setProgress(60 + attempts * 1.3); // Gradually increase progress

            // Try to get components to check if schema is ready
            try {
              const components = await getServiceComponents(serviceId);

              if (components && components.length > 0) {
                // Schema is ready!
                setProgress(95);
                setStatusMessage('Schema analysis complete! Processing results...');

                // Calculate schema statistics from actual data
                const tables = components.filter(
                  obj =>
                    obj.object_category === 'TABLE' ||
                    obj.type === 'TABLE' ||
                    obj.type_desc === 'USER_TABLE'
                );
                const views = components.filter(
                  obj => obj.object_category === 'VIEW' || obj.type === 'VIEW'
                );
                const procedures = components.filter(
                  obj =>
                    obj.object_category === 'PROCEDURE' ||
                    obj.type === 'PROCEDURE' ||
                    obj.type_desc === 'SQL_STORED_PROCEDURE'
                );

                setSchemaStats({
                  tables: tables.length,
                  views: views.length,
                  procedures: procedures.length,
                });

                setProgress(100);
                setStatusMessage('Schema retrieval complete');
                setStatus('complete');

                // Complete the step with updated service data
                onComplete({
                  ...service,
                  schemaRetrieved: true,
                  components: components,
                });
                return;
              }
            } catch (componentError) {}

            // Update status message based on progress
            if (attempts === 1) {
              setStatusMessage('Connecting to database...');
            } else if (attempts === 5) {
              setStatusMessage('Analyzing database structure...');
            } else if (attempts === 10) {
              setStatusMessage('Processing tables and views...');
            } else if (attempts === 15) {
              setStatusMessage('Processing stored procedures...');
            } else if (attempts === 20) {
              setStatusMessage('Finalizing schema analysis...');
            } else if (attempts === 25) {
              setStatusMessage(
                'This is taking longer than expected. Large databases may take a minute...'
              );
            }

            if (attempts < maxAttempts) {
              // Continue polling
              setTimeout(poll, 2000); // Poll every 2 seconds
            } else {
              // Timeout - but let's try one more schema refresh before giving up
              setStatusMessage('Schema analysis is taking longer than expected. Retrying...');
              try {
                await refreshServiceSchema(serviceId);
                // Give it 5 more attempts after retry
                if (attempts === maxAttempts) {
                  attempts = maxAttempts - 5;
                  setTimeout(poll, 3000);
                  return;
                }
              } catch (retryError) {
                throw new Error(
                  'Schema retrieval timed out. The database may be too large or there may be connection issues.'
                );
              }
            }
          } catch (err) {
            setStatus('error');
            setError('Failed to retrieve database schema: ' + err.message);
          }
        };

        poll();
      };

      await pollForSchemaCompletion(service.id);
    } catch (err) {
      console.error('Error creating service or retrieving schema:', err);
      setStatus('error');
      setError(err.message || 'Failed to create service and retrieve schema');
    }
  }, [serviceData, onComplete, setError]);

  useEffect(() => {
    if (serviceData && status === 'initializing' && !hasRun.current) {
      hasRun.current = true;
      createServiceAndRetrieveSchema();
    }
  }, [serviceData, status, createServiceAndRetrieveSchema]);

  const retry = () => {
    if (serviceData) {
      createServiceAndRetrieveSchema();
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'initializing':
      case 'creating':
      case 'retrieving':
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <Database className="h-8 w-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Processing Service Setup</h3>
              <p className="text-muted-foreground">{statusMessage}</p>
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{Math.round(progress)}% complete</p>
            </div>

            <ProgressIndicator
              steps={[
                { icon: CheckCircle, label: 'Create Service' },
                { icon: Database, label: 'Connect Database' },
                { icon: Settings, label: 'Retrieve Schema' },
              ]}
              currentStep={status === 'creating' ? 0 : status === 'retrieving' ? 1 : 2}
              progress={progress}
            />
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-green-700">
                Schema Retrieved Successfully!
              </h3>
              <p className="text-muted-foreground">
                Your service has been created and the database schema has been analyzed.
              </p>
            </div>

            {schemaStats && (
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Table className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{schemaStats.tables}</p>
                    <p className="text-sm text-muted-foreground">Tables</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Eye className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold">{schemaStats.views}</p>
                    <p className="text-sm text-muted-foreground">Views</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Settings className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold">{schemaStats.procedures}</p>
                    <p className="text-sm text-muted-foreground">Procedures</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              The wizard will now continue automatically...
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <Database className="h-8 w-8 text-red-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-red-700">Schema Retrieval Failed</h3>
              <p className="text-muted-foreground">
                There was an issue creating the service or retrieving the database schema.
              </p>
            </div>

            <div className="flex justify-center">
              <Button onClick={retry}>Try Again</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Schema Retrieval</h3>
        <p className="text-muted-foreground mb-6">
          We&apos;re creating your service and analyzing the database schema to prepare for API
          endpoint generation.
        </p>
      </div>

      {renderContent()}
    </div>
  );
};

export default SchemaStep;
