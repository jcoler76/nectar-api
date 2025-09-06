import * as React from 'react';

import { cn } from '../../lib/utils';

const FormContainer = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('space-y-6 p-6 bg-gradient-card rounded-lg border shadow-medium', className)}
    {...props}
  />
));
FormContainer.displayName = 'FormContainer';

const FormSection = React.forwardRef(
  ({ className, title, description, children, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-4', className)} {...props}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
);
FormSection.displayName = 'FormSection';

const FormGrid = React.forwardRef(({ className, columns = 1, ...props }, ref) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div
      ref={ref}
      className={cn('grid gap-4', gridCols[columns] || gridCols[2], className)}
      {...props}
    />
  );
});
FormGrid.displayName = 'FormGrid';

const FormActions = React.forwardRef(({ className, align = 'right', ...props }, ref) => {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-6 border-t border-border/50',
        alignmentClasses[align],
        className
      )}
      {...props}
    />
  );
});
FormActions.displayName = 'FormActions';

const FormFieldGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-2', className)} {...props} />
));
FormFieldGroup.displayName = 'FormFieldGroup';

const FormRow = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-end gap-4', className)} {...props} />
));
FormRow.displayName = 'FormRow';

const FormHint = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-start gap-2 p-3 text-sm bg-muted/30 border border-border/50 rounded-lg',
      className
    )}
    {...props}
  >
    <div className="flex-1">{children}</div>
  </div>
));
FormHint.displayName = 'FormHint';

export { FormActions, FormContainer, FormFieldGroup, FormGrid, FormHint, FormRow, FormSection };
