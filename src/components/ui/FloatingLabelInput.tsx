import * as React from 'react';

import { cn } from '../../lib/utils';

export interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ className, type = 'text', label, error, required, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    const handleFocus = () => setFocused(true);
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    React.useEffect(() => {
      setHasValue(!!props.value || !!props.defaultValue);
    }, [props.value, props.defaultValue]);

    const isFloating = focused || hasValue;

    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            'flex h-12 w-full rounded-md border border-input bg-background px-3 pt-6 pb-2 text-sm',
            'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-transparent focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-ocean-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed',
            'disabled:opacity-50 transition-all duration-200',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          aria-label={label}
          aria-required={required}
          aria-invalid={!!error}
          {...props}
        />
        <label
          className={cn(
            'absolute left-3 text-sm text-muted-foreground transition-all duration-200 pointer-events-none',
            isFloating ? 'top-2 text-xs text-ocean-600' : 'top-1/2 -translate-y-1/2 text-sm'
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {error && (
          <p className="text-xs text-destructive mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';

export { FloatingLabelInput };
