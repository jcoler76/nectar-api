import { Tooltip } from '@mui/material';
import { Loader2, Play } from 'lucide-react';

import { useConnectionForm } from '../../hooks/useConnectionForm';
import { useFormSteps } from '../../hooks/useFormSteps';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';

import ConnectionFormStep1 from './ConnectionFormStep1';
import ConnectionFormStep2 from './ConnectionFormStep2';

const ConnectionForm = ({ open, onClose, onSave, connection, onTestConnection }) => {
  const {
    formData,
    isSubmitting,
    isTesting,
    error,
    setIsSubmitting,
    setIsTesting,
    setError,
    handleChange,
    handleDatabaseTypeChange,
    updateFormData,
  } = useConnectionForm(connection, open);

  const { currentStep, canAdvanceToStep2, goToStep2, goToStep1 } = useFormSteps(
    connection,
    formData
  );

  // Auto-advance to step 2 once database type is selected
  const handleDatabaseTypeChangeWithAdvance = value => {
    handleDatabaseTypeChange(value);
    if (value && formData.name.trim()) {
      goToStep2();
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Filter out empty password string only for updates
      const dataToSave = { ...formData };
      if (connection && !dataToSave.password) {
        // Only delete password for updates when it's empty
        delete dataToSave.password;
      }

      await onSave(dataToSave);
    } catch (err) {
      setError(err.message || 'Failed to save connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setError('');

    try {
      await onTestConnection(formData);
    } catch (err) {
      setError(err.message || 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Connection Name and Database Type */}
      {currentStep === 1 && !connection && (
        <ConnectionFormStep1
          formData={formData}
          handleChange={handleChange}
          handleDatabaseTypeChange={handleDatabaseTypeChangeWithAdvance}
        />
      )}

      {/* Step 2: Connection Details or Edit Mode */}
      {(currentStep === 2 || connection) && (
        <ConnectionFormStep2
          formData={formData}
          handleChange={handleChange}
          handleDatabaseTypeChange={handleDatabaseTypeChange}
          updateFormData={updateFormData}
          connection={connection}
          currentStep={currentStep}
          goToStep1={goToStep1}
        />
      )}

      <div className="flex justify-between pt-4">
        {/* Step 1 Footer */}
        {currentStep === 1 && !connection && (
          <div className="flex justify-between w-full">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={goToStep2} disabled={!canAdvanceToStep2}>
              Next: Configure Connection
            </Button>
          </div>
        )}

        {/* Step 2 Footer or Edit Mode Footer */}
        {(currentStep === 2 || connection) && (
          <>
            <Tooltip title="Verify that the connection settings are correct and the database server is accessible with the provided credentials">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={isTesting || isSubmitting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </Tooltip>

            <div className="flex gap-2">
              {currentStep === 2 && !connection && (
                <Button type="button" variant="outline" onClick={goToStep1} disabled={isSubmitting}>
                  Back
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isTesting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Connection'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </form>
  );
};

export default ConnectionForm;
