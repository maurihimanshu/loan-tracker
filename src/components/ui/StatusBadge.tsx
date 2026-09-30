import React from 'react';
import { Badge } from './Badge';
import { CheckCircle2, Clock, Calendar, XCircle, AlertCircle } from 'lucide-react';

export type FinancialStatus =
  | 'ACTUAL'
  | 'PLANNED'
  | 'PROJECTED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'OVERRIDDEN';

interface StatusBadgeProps {
  status: FinancialStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  switch (status) {
    case 'ACTUAL':
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
          Actual
        </Badge>
      );
    case 'PLANNED':
      return (
        <Badge variant="info" className={className}>
          <Calendar className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />
          Planned
        </Badge>
      );
    case 'PROJECTED':
      return (
        <Badge variant="secondary" className={className}>
          <Clock className="w-3 h-3 mr-1 text-slate-500" />
          Projected
        </Badge>
      );
    case 'CLOSED':
      return (
        <Badge variant="default" className={className}>
          <CheckCircle2 className="w-3 h-3 mr-1 text-primary" />
          Closed
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="w-3 h-3 mr-1 text-destructive" />
          Cancelled
        </Badge>
      );
    case 'OVERRIDDEN':
      return (
        <Badge variant="warning" className={className}>
          <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
          Overridden
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

