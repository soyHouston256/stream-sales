'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';

interface TimeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  className?: string;
}

export function TimeInput({ value = '', onChange, required, className }: TimeInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert 24h time to 12h format for display
  useEffect(() => {
    if (value) {
      const formatted = convertTo12Hour(value);
      setDisplayValue(formatted);
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const convertTo12Hour = (time24: string): string => {
    if (!time24) return '';

    // Handle both "HH:MM" and "HH:MM AM/PM" formats
    const match = time24.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return time24;

    let hours = parseInt(match[1]);
    const minutes = match[2];
    const existingPeriod = match[3]?.toUpperCase();

    // If already has AM/PM, return as is
    if (existingPeriod) {
      return `${hours.toString().padStart(2, '0')}:${minutes} ${existingPeriod}`;
    }

    // Convert from 24h to 12h
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${hours.toString().padStart(2, '0')}:${minutes} ${period}`;
  };

  const convertTo24Hour = (time12: string): string => {
    const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return time12;

    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.toUpperCase();

    // Remove any non-digit, non-colon, non-AM/PM characters
    input = input.replace(/[^0-9:APM\s]/g, '');

    // Auto-format as user types
    if (input.length === 2 && !input.includes(':')) {
      input = input + ':';
    }

    setDisplayValue(input);

    // Try to parse and validate the time
    const match = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3]?.toUpperCase();

      // Validate hours and minutes
      if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
        if (period) {
          // Complete time with AM/PM
          const formatted = `${hours.toString().padStart(2, '0')}:${match[2]} ${period}`;
          setDisplayValue(formatted);

          // Convert to 24h format for the value prop
          const time24 = convertTo24Hour(formatted);
          onChange?.(time24);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow special keys
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }

    const input = e.currentTarget.value;
    const cursorPos = e.currentTarget.selectionStart || 0;

    // Auto-add AM/PM shortcuts
    if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'p') {
      e.preventDefault();
      const match = input.match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        const period = e.key.toUpperCase() === 'A' ? 'AM' : 'PM';
        const formatted = `${match[1].padStart(2, '0')}:${match[2]} ${period}`;
        setDisplayValue(formatted);

        const time24 = convertTo24Hour(formatted);
        onChange?.(time24);
      }
      return;
    }

    // Only allow numbers and colon
    if (!/[0-9:]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);

    // Try to auto-complete if we have HH:MM
    const match = displayValue.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);

      if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
        // Default to PM if no period specified
        const formatted = `${match[1].padStart(2, '0')}:${match[2]} PM`;
        setDisplayValue(formatted);

        const time24 = convertTo24Hour(formatted);
        onChange?.(time24);
      }
    }
  };

  return (
    <div className="relative">
      <Clock
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
        size={18}
      />
      <Input
        ref={inputRef}
        type="text"
        className={`pl-10 ${className || ''}`}
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder="12:00 PM"
        required={required}
        maxLength={8}
      />
      <Clock
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        size={18}
      />
      {isFocused && (
        <div className="absolute top-full left-0 mt-1 text-xs text-muted-foreground bg-popover border rounded-md px-2 py-1 shadow-md z-20">
          Formato: HH:MM AM/PM (ej: 02:30 PM)
        </div>
      )}
    </div>
  );
}
