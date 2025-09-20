import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background group gpu-accelerated focus-ring-enhanced disabled:pointer-events-none transition-all duration-300 ease-smooth',
  {
    variants: {
      variant: {
        default:
          'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 border-blue-600 shadow-soft hover:shadow-medium micro-interaction',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft hover:shadow-medium micro-interaction hover:animate-wiggle',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-soft hover:shadow-medium micro-interaction',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft hover:shadow-medium micro-interaction',
        ghost: 'hover:bg-accent hover:text-accent-foreground micro-interaction',
        link: 'text-primary underline-offset-4 hover:underline transition-colors duration-200',
        gradient:
          'bg-gradient-to-r from-blue-600 to-blue-400 text-white hover:from-blue-700 hover:to-blue-500 disabled:opacity-100',
        'gradient-outline':
          'border-2 border-transparent bg-gradient-to-r from-sky-900 to-sky-400 bg-clip-padding text-white hover:opacity-90 shadow-glow hover:shadow-large hover-lift relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-sky-900 before:to-sky-400 before:rounded-lg before:-z-10',
        success:
          'bg-green-600 text-white hover:bg-green-700 shadow-soft hover:shadow-medium micro-interaction',
        warning:
          'bg-yellow-600 text-white hover:bg-yellow-700 shadow-soft hover:shadow-medium micro-interaction',
        ocean:
          'bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500 shadow-soft hover:shadow-medium micro-interaction',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        xl: 'h-14 rounded-lg px-10 text-lg',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
