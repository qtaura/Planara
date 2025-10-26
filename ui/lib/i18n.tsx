import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = string; // e.g., 'en-US', 'fr-FR', 'ar', 'he'

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  formatDate: (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const rtlLocales = new Set(['ar', 'fa', 'he', 'ur']);

function toDate(input: Date | number | string): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  return new Date(String(input));
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      return localStorage.getItem('app_locale') || navigator.language || 'en-US';
    } catch {
      return navigator.language || 'en-US';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_locale', locale);
    } catch {}
  }, [locale]);

  // Apply document language and direction based on locale
  useEffect(() => {
    const lang = locale.split('-')[0];
    document.documentElement.lang = lang;
    const isRtl = rtlLocales.has(lang);
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    return {
      locale,
      setLocale,
      formatDate(date, options) {
        try {
          const d = toDate(date);
          return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            ...options,
          }).format(d);
        } catch {
          return String(date);
        }
      },
      formatTime(date, options) {
        try {
          const d = toDate(date);
          return new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
            second: undefined,
            hour12: undefined,
            ...options,
          }).format(d);
        } catch {
          return String(date);
        }
      },
      formatNumber(value, options) {
        try {
          return new Intl.NumberFormat(locale, options).format(value);
        } catch {
          return String(value);
        }
      },
      formatCurrency(value, currency = 'USD', options) {
        try {
          return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            ...options,
          }).format(value);
        } catch {
          return String(value);
        }
      },
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

export function useFormatters() {
  const { formatDate, formatTime, formatNumber, formatCurrency } = useLocale();
  return { formatDate, formatTime, formatNumber, formatCurrency };
}
