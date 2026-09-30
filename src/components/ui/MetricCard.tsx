import React from 'react';
import { Card, CardContent } from './Card';
import { HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface MetricCardProps {
  title: string;
  value: string;
  secondary?: string;
  tooltip?: string;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'info' | 'default';
  };
  icon?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  secondary,
  tooltip,
  badge,
  icon,
  className,
}) => {
  const badgeClasses = {
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    default: 'bg-primary/10 text-primary',
  };

  return (
    <Card className={cn('hover:border-primary/40 transition-colors', className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {title}
            </span>
            {tooltip && (
              <span
                className="cursor-help text-muted-foreground/70 hover:text-foreground transition-colors"
                title={tooltip}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          {icon && (
            <div className="text-muted-foreground/60 shrink-0">
              {icon}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            {value}
          </div>
        </div>

        {(secondary || badge) && (
          <div className="mt-2 flex items-center space-x-2 text-xs">
            {badge && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[11px] font-semibold',
                  badgeClasses[badge.variant ?? 'default'],
                )}
              >
                {badge.text}
              </span>
            )}
            {secondary && (
              <span className="text-muted-foreground truncate">{secondary}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

