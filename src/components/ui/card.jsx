import * as React from 'react';

import { cn } from '../../lib/utils';

const Card = React.forwardRef(({ className, gradient = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border text-card-foreground shadow-medium transition-all duration-300 ease-smooth',
      gradient ? 'bg-gradient-card' : 'bg-card',
      'hover:shadow-large',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  // eslint-disable-next-line jsx-a11y/heading-has-content
  <h3
    ref={ref}
    className={cn('text-2xl font-semibold leading-none tracking-tight text-ocean-800', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
