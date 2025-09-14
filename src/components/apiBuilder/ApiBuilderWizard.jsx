import { ArrowLeft, ArrowRight, CheckCircle, Database, Sparkles } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Stepper } from '../ui/stepper';

import DatabaseDiscoveryPanel from './DatabaseDiscoveryPanel';
import GeneratedApiExplorer from './GeneratedApiExplorer';

const ApiBuilderWizard = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedApis, setGeneratedApis] = useState([]);
  const [selectedService, setSelectedService] = useState('');

  const steps = [
    {
      title: 'Welcome',
      description: 'Get started with instant API generation',
      icon: Sparkles,
    },
    {
      title: 'Discover Tables',
      description: 'Connect and discover database tables',
      icon: Database,
    },
    {
      title: 'Generated APIs',
      description: 'Test and explore your new APIs',
      icon: CheckCircle,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleApiGenerated = apis => {
    setGeneratedApis(apis);
    setCurrentStep(2); // Jump to final step
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card className="mx-auto max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to API Builder</CardTitle>
              <CardDescription className="text-lg">
                Generate production-ready REST APIs from your database in under 5 minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-green-800">✨ Zero-Code API Generation</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect your database and instantly generate secure REST endpoints
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-blue-800">🔍 Auto-Discovery</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically discovers all tables, views, and their schemas
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold text-purple-800">🚀 Instant Testing</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Built-in API explorer for immediate testing and documentation
                  </p>
                </div>
              </div>

              <div className="pt-4 text-center">
                <Button onClick={handleNext} size="lg" className="px-8">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <div className="max-w-6xl mx-auto">
            <DatabaseDiscoveryPanel
              onApiGenerated={handleApiGenerated}
              onServiceSelected={setSelectedService}
            />
          </div>
        );

      case 2:
        return (
          <div className="max-w-6xl mx-auto">
            <GeneratedApiExplorer apis={generatedApis} serviceName={selectedService} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">API Builder</h1>
          <p className="text-muted-foreground mt-2">
            Transform your database into a powerful REST API
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="mb-8">
          <Stepper steps={steps.map(step => step?.title || 'Step')} activeStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="mb-8">{renderStepContent()}</div>

        {/* Navigation */}
        {currentStep !== 0 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                onClick={() => {
                  // Reset wizard or redirect to main API management
                  setCurrentStep(0);
                  setGeneratedApis([]);
                }}
                className="flex items-center gap-2"
              >
                Start Over
                <Sparkles className="h-4 w-4" />
              </Button>
            ) : currentStep === 1 ? null : ( // Hide next button on discovery step - let the component handle navigation
              <Button
                onClick={handleNext}
                disabled={currentStep === steps.length - 1}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiBuilderWizard;
