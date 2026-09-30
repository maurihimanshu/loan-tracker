import React from 'react';
import { cn } from '../../utils/cn';

export interface PercentageInputProps {
  value: number; // e.g. 8.5 for 8.5%
  onChange: (val: number) => void;
  label?: string;
  error?: string;
  helperText?: string;
  step?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const PercentageInput: React.FC<PercentageInputProps> = ({
  value,
  onChange,
  label,
  error,
  helperText,
  step = '0.01',
  min = 0,
  max = 100,
  disabled = false,
  className,
  id,
}) => {
  const inputId = id || `pct-input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="number"
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          value={value === 0 ? '' : value}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onChange(isNaN(val) ? 0 : val);
          }}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-background pl-3 pr-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium select-none pointer-events-none">
          %
        </span>
      </div>
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

