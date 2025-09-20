import { cva } from 'class-variance-authority';

export const inputVariants = cva(
  'flex w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground placeholder:text-left gpu-accelerated disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 ease-smooth',
  {
    variants: {
      variant: {
        default:
          'border-input hover:border-ring/50 hover:shadow-soft focus-ring-enhanced focus-visible:shadow-glow micro-interaction',
        error:
          'border-destructive hover:border-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 bg-destructive/5 animate-wiggle',
        success:
          'border-green-500 hover:border-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 bg-green-50 hover:bg-green-50/80',
      },
      size: {
        default: 'h-11 sm:h-10',
        sm: 'h-9 px-2 text-xs',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
