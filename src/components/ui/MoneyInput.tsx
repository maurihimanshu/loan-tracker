import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { parseFinancialInput } from '../../domain/loan/money';

export interface MoneyInputProps {
  value: number; // Value in Rupees
  onChange: (val: number) => void;
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  label,
  error,
  helperText,
  placeholder = '0',
  disabled = false,
  className,
  id,
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
      if (value > 0) {
        // Format with commas according to Indian Numbering System
        setDisplayValue(
          new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 2,
          }).format(value),
        );
      } else if (value === 0) {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    const parsed = parseFinancialInput(raw);
    onChange(parsed);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value > 0) {
      setDisplayValue(value.toString());
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (value > 0) {
      setDisplayValue(
        new Intl.NumberFormat('en-IN', {
          maximumFractionDigits: 2,
        }).format(value),
      );
    } else {
      setDisplayValue('');
    }
  };

  const inputId = id || `money-input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium select-none pointer-events-none">
          ₹
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
        />
      </div>
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

