'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';

interface TimeInput12hProps {
  value?: string; // Format: "11:59 PM"
  onChange?: (value: string) => void;
  label?: string;
  required?: boolean;
}

export function TimeInput12h({ value = '', onChange, label, required }: TimeInput12hProps) {
  // Parse initial value or set defaults
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: '12', minute: '00', period: 'PM' as 'AM' | 'PM' };

    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      return {
        hour: match[1],
        minute: match[2],
        period: match[3].toUpperCase() as 'AM' | 'PM',
      };
    }
    return { hour: '12', minute: '00', period: 'PM' as 'AM' | 'PM' };
  };

  const parsed = parseTime(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);

  // Update parent when time changes
  useEffect(() => {
    const formattedTime = `${hour}:${minute} ${period}`;
    if (formattedTime !== value) {
      onChange?.(formattedTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, minute, period]);

  // Generate hours 1-12
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

  // Generate minutes 00-59
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-xs font-bold">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <div className="flex gap-2 items-center">
        {/* Hour */}
        <div className="relative flex-1">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" size={16} />
          <Select value={hour} onValueChange={setHour}>
            <SelectTrigger className="pl-9">
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent>
              {hours.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-lg font-bold text-muted-foreground">:</span>

        {/* Minute */}
        <div className="flex-1">
          <Select value={minute} onValueChange={setMinute}>
            <SelectTrigger>
              <SelectValue placeholder="MM" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {minutes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* AM/PM */}
        <div className="w-20">
          <Select value={period} onValueChange={(v) => setPeriod(v as 'AM' | 'PM')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
