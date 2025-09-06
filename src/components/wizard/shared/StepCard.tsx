import { type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

// Type assertions for JavaScript card components
const TypedCard = Card as React.ComponentType<
  React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }
>;
const TypedCardHeader = CardHeader as React.ComponentType<
  React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }
>;
const TypedCardTitle = CardTitle as React.ComponentType<
  React.HTMLAttributes<HTMLHeadingElement> & { children: React.ReactNode }
>;
const TypedCardDescription = CardDescription as React.ComponentType<
  React.HTMLAttributes<HTMLParagraphElement> & { children: React.ReactNode }
>;
const TypedCardContent = CardContent as React.ComponentType<
  React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }
>;

export interface StepCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

export const StepCard: React.FC<StepCardProps> = ({
  title,
  description,
  icon: Icon,
  children,
  ...props
}) => (
  <TypedCard {...props}>
    <TypedCardHeader>
      <TypedCardTitle className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5" />}
        {title}
      </TypedCardTitle>
      {description && <TypedCardDescription>{description}</TypedCardDescription>}
    </TypedCardHeader>
    <TypedCardContent>{children}</TypedCardContent>
  </TypedCard>
);
