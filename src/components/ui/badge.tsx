import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 ease-smooth focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-soft',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80 hover:shadow-medium',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-medium',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:shadow-medium',
        outline: 'text-foreground border-border hover:bg-accent hover:text-accent-foreground',
        success:
          'border-transparent bg-green-500 text-white hover:bg-green-500/80 hover:shadow-medium',
        warning:
          'border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80 hover:shadow-medium',
        info: 'border-transparent bg-blue-500 text-white hover:bg-blue-500/80 hover:shadow-medium',
        gradient:
          'border-transparent bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow',
        active:
          'border-transparent bg-ocean-100 text-ocean-800 border-ocean-200 hover:bg-ocean-200',
        inactive: 'border-transparent bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200',
        pending:
          'border-transparent bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
