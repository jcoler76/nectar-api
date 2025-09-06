import * as React from 'react';

import { Label } from '../../ui/label';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  children,
  className = '',
  htmlFor,
}) => (
  <div className={`space-y-2 ${className}`}>
    <Label htmlFor={htmlFor || label}>
      {label} {required && '*'}
    </Label>
    {children}
  </div>
);
