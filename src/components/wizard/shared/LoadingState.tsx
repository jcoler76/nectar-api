import { Loader2, type LucideIcon } from 'lucide-react';
import * as React from 'react';

export interface LoadingStateProps {
  loading: boolean;
  message: string;
  icon?: LucideIcon;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  loading,
  message,
  icon: Icon = Loader2,
  className = '',
}) =>
  loading ? (
    <div className={`flex items-center text-sm text-muted-foreground ${className}`}>
      <Icon className="h-3 w-3 animate-spin mr-1" />
      {message}
    </div>
  ) : null;
