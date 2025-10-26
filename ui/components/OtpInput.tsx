import React, { useEffect, useMemo, useRef } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({ length = 6, value, onChange, disabled, autoFocus }: OtpInputProps) {
  const inputs = useMemo(() => Array.from({ length }), [length]);
  const refs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (autoFocus && refs.current[0]) {
      refs.current[0].focus();
    }
  }, [autoFocus]);

  function setChar(idx: number, ch: string) {
    const digitsOnly = ch.replace(/\D/g, '');
    if (!digitsOnly) return;
    const chars = value.split('');
    // Ensure fixed length array
    while (chars.length < length) chars.push('');
    chars[idx] = digitsOnly[0] || '';
    const next = chars.join('').slice(0, length);
    onChange(next);
    if (digitsOnly && refs.current[idx + 1]) refs.current[idx + 1].focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    const next = text.slice(0, length);
    onChange(next);
    const targetIndex = Math.min(next.length, length - 1);
    if (refs.current[targetIndex]) refs.current[targetIndex].focus();
  }

  return (
    <div className="flex gap-2" role="group" aria-label={`Enter ${length}-digit verification code`}>
      {inputs.map((_, idx) => {
        const ch = value[idx] || '';
        return (
          <input
            key={idx}
            ref={(el) => {
              if (el) refs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={ch}
            disabled={disabled}
            onChange={(e) => setChar(idx, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                e.preventDefault();
                const chars = value.split('');
                while (chars.length < length) chars.push('');
                if (chars[idx]) {
                  chars[idx] = '';
                  onChange(chars.join(''));
                } else if (idx > 0) {
                  if (refs.current[idx - 1]) refs.current[idx - 1].focus();
                  chars[idx - 1] = '';
                  onChange(chars.join(''));
                }
              }
            }}
            onPaste={handlePaste}
            aria-label={`Digit ${idx + 1} of ${length}`}
            className="h-12 w-12 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-lg"
          />
        );
      })}
    </div>
  );
}