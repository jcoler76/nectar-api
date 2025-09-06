import { cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/utils';

const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground transition-all duration-300 ease-smooth disabled:cursor-not-allowed disabled:opacity-50 resize-none',
  {
    variants: {
      variant: {
        default:
          'border-input hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:shadow-glow',
        error:
          'border-destructive hover:border-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 bg-destructive/5',
        success:
          'border-green-500 hover:border-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 bg-green-50',
      },
      size: {
        default: 'min-h-[80px]',
        sm: 'min-h-[60px] px-2 py-1 text-xs',
        lg: 'min-h-[120px] px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Textarea = React.forwardRef(({ className, variant, size, error, ...props }, ref) => {
  const textareaVariant = error ? 'error' : variant;

  return (
    <textarea
      className={cn(textareaVariants({ variant: textareaVariant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
