import { useState } from 'react';

export const useFormSteps = (connection, formData) => {
  const [currentStep, setCurrentStep] = useState(connection ? 2 : 1);

  const canAdvanceToStep2 = formData.name.trim() && formData.type;

  const goToStep2 = () => {
    if (canAdvanceToStep2) {
      setCurrentStep(2);
    }
  };

  const goToStep1 = () => {
    setCurrentStep(1);
  };

  return {
    currentStep,
    canAdvanceToStep2,
    goToStep2,
    goToStep1,
  };
};
