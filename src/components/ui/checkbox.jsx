import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ease-smooth',
      checked
        ? 'bg-ocean-500 border-ocean-500 text-white shadow-soft hover:bg-ocean-600 hover:border-ocean-600'
        : 'bg-background border-gray-300 hover:bg-muted/50 hover:border-ocean-500',
      className
    )}
    onClick={() => onCheckedChange?.(!checked)}
    {...props}
  >
    {checked && <Check className="h-3 w-3 text-current" />}
  </button>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
