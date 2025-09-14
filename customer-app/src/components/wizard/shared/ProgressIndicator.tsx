import { type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { Card, CardContent } from '../../ui/card';

// Type assertions for JavaScript card components
const TypedCard = Card as React.ComponentType<
  React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }
>;
const TypedCardContent = CardContent as React.ComponentType<
  React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }
>;

export interface ProgressStep {
  icon: LucideIcon;
  label: string;
}

export interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep: number;
  progress: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  progress,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto">
    {steps.map((step, index) => {
      const isActive = index === currentStep;
      const isComplete = index < currentStep || (index === currentStep && progress >= 100);

      return (
        <TypedCard key={index} className={isActive ? 'border-primary' : ''}>
          <TypedCardContent className="p-4 text-center">
            <step.icon
              className={`h-6 w-6 mx-auto mb-2 ${
                isComplete ? 'text-green-500' : isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <p className="text-sm font-medium">{step.label}</p>
          </TypedCardContent>
        </TypedCard>
      );
    })}
  </div>
);
