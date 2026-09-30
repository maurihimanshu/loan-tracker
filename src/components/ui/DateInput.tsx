import React from 'react';
import { cn } from '../../utils/cn';
import { formatDisplayDate, isValidLocalDate } from '../../domain/loan/dates';

export interface DateInputProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (val: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  label,
  error,
  helperText,
  min,
  max,
  disabled = false,
  className,
  id,
}) => {
  const inputId = id || `date-input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-foreground"
          >
            {label}
          </label>
        )}
        {value && isValidLocalDate(value) && (
          <span className="text-xs text-muted-foreground font-mono">
            {formatDisplayDate(value)}
          </span>
        )}
      </div>
      <input
        id={inputId}
        type="date"
        disabled={disabled}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
      />
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

