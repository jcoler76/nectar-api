import { Activity, Database, Shield, Users } from 'lucide-react';
import React from 'react';

import { Card, CardContent } from '../ui/card';

const iconMap = {
  services: Database,
  apps: Activity,
  roles: Shield,
  api: Activity,
  applications: Users,
};

const MetricCardComponent = ({ title, value, icon, onClick }) => {
  const IconComponent = iconMap[icon] || Activity;

  return (
    <Card
      gradient
      className={`relative overflow-hidden card-interactive hover-glow group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        {/* Background Icon */}
        <div className="absolute top-2 right-2 opacity-10 transition-all duration-500 group-hover:opacity-20 group-hover:scale-110 group-hover:rotate-12">
          <IconComponent className="h-16 w-16 text-primary" />
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-2">
          <p className="text-sm font-medium text-muted-foreground transition-colors duration-300 group-hover:text-muted-foreground/80">
            {title}
          </p>
          <div className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-primary transition-all duration-300 group-hover:scale-110 group-hover:text-primary/90" />
            <p className="text-3xl font-bold text-foreground transition-all duration-300 group-hover:scale-105">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
        </div>

        {/* Enhanced Gradient Accent */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary opacity-60 transition-all duration-300 group-hover:h-2 group-hover:opacity-80" />

        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        </div>
      </CardContent>
    </Card>
  );
};

// Memoize MetricCard to prevent unnecessary re-renders
const MetricCard = React.memo(MetricCardComponent);

export default MetricCard;
