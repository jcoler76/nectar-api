import { useState } from 'react';

// Type for valid form field values
export type FormFieldValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | FormFieldValue[]
  | { [key: string]: FormFieldValue };

// Generic form data type with better type safety
export type WizardFormData = Record<string, FormFieldValue>;

export interface UseWizardValidationReturn<T extends WizardFormData> {
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  validating: boolean;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  clearError: () => void;
  handleInputChange: <K extends keyof T>(field: K, value: T[K]) => T;
  validate: <R>(validationFn: () => Promise<R>) => Promise<R>;
}

export const useWizardValidation = <T extends WizardFormData>(
  initialData: T = {} as T
): UseWizardValidationReturn<T> => {
  const [formData, setFormData] = useState<T>(initialData);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = <K extends keyof T>(field: K, value: T[K]): T => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    return updatedData;
  };

  const validate = async <R>(validationFn: () => Promise<R>): Promise<R> => {
    setValidating(true);
    setError('');
    try {
      const result = await validationFn();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setValidating(false);
    }
  };

  const clearError = (): void => setError('');

  return {
    formData,
    setFormData,
    validating,
    error,
    setError,
    clearError,
    handleInputChange,
    validate,
  };
};
