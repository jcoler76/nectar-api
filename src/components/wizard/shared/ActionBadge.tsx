import * as React from 'react';

import { Badge, type BadgeProps } from '../../ui/badge';

// HTTP action types
export type HttpAction = 'GET' | 'POST' | 'PUT' | 'DELETE';

const ACTION_COLORS: Record<HttpAction, string> = {
  GET: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  POST: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export interface ActionBadgeProps extends Omit<BadgeProps, 'children'> {
  action: HttpAction;
}

export const ActionBadge: React.FC<ActionBadgeProps> = ({ action, ...props }) => (
  <Badge
    variant="secondary"
    className={ACTION_COLORS[action] || 'bg-gray-100 text-gray-700'}
    {...props}
  >
    {action}
  </Badge>
);
