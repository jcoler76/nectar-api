import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Stepper } from '../ui/stepper';

import ApplicationStep from './wizard/ApplicationStep';
import CompletionStep from './wizard/CompletionStep';
import RoleStep from './wizard/RoleStep';
import SchemaStep from './wizard/SchemaStep';
import ServiceStep from './wizard/ServiceStep';

const EndpointWizard = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    service: null,
    role: null,
    application: null,
    apiKey: null,
  });
  const [error, setError] = useState('');

  const steps = [
    'Service Setup',
    'Schema Retrieval',
    'Role Creation',
    'Application Setup',
    'Complete',
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
      setError('');
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      setError('');
    }
  };

  const handleCancel = () => {
    navigate('/services');
  };

  const updateWizardData = stepData => {
    setWizardData(prev => ({ ...prev, ...stepData }));
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <ServiceStep
            data={wizardData.service}
            onDataChange={data => updateWizardData({ service: data })}
            onNext={handleNext}
            error={error}
            setError={setError}
          />
        );
      case 1:
        return (
          <SchemaStep
            serviceData={wizardData.service}
            onComplete={serviceData => {
              updateWizardData({ service: serviceData });
              handleNext();
            }}
            error={error}
            setError={setError}
          />
        );
      case 2:
        return (
          <RoleStep
            serviceData={wizardData.service}
            data={wizardData.role}
            onDataChange={data => updateWizardData({ role: data })}
            onNext={handleNext}
            error={error}
            setError={setError}
          />
        );
      case 3:
        return (
          <ApplicationStep
            roleData={wizardData.role}
            data={wizardData.application}
            onDataChange={data => updateWizardData({ application: data })}
            onComplete={result => {
              updateWizardData({
                application: result.application,
                apiKey: result.apiKey,
              });
              handleNext();
            }}
            error={error}
            setError={setError}
          />
        );
      case 4:
        return <CompletionStep wizardData={wizardData} onFinish={() => navigate('/services')} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Endpoint Wizard</h1>
          <p className="text-muted-foreground">
            Create a complete API endpoint with service, role, and application in just a few steps.
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <Stepper steps={steps} activeStep={activeStep} />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <Card className="mb-6">
          <CardContent className="p-6">{renderStepContent()}</CardContent>
        </Card>

        {/* Navigation Buttons */}
        {activeStep < steps.length - 1 && (
          <div className="flex justify-between">
            <div className="space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              {activeStep > 0 && activeStep !== 1 && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>

            {/* Next button handled by individual step components */}
          </div>
        )}
      </div>
    </div>
  );
};

export default EndpointWizard;
