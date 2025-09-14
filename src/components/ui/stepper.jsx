import { Check } from 'lucide-react';

import { cn } from '../../lib/utils';

const Stepper = ({ steps, activeStep, className }) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isCompleted = index < activeStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex items-center relative">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                    isCompleted && 'bg-ocean-600 border-ocean-600 text-white',
                    isActive && 'border-ocean-600 text-ocean-700',
                    !isCompleted && !isActive && 'border-muted-foreground text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div
                  className={cn(
                    'ml-2 max-w-[150px]',
                    isActive && 'text-foreground',
                    !isActive && 'text-muted-foreground'
                  )}
                >
                  <p className="text-sm font-medium truncate">
                    {typeof step === 'string' ? step : step.title || 'Step'}
                  </p>
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-[2px] mx-4 transition-colors',
                    isCompleted ? 'bg-ocean-600' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { Stepper };
