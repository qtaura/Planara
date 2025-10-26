import * as React from 'react';

/**
 * Accessibility utilities for enhanced UX
 */

// ARIA live region announcer
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  try {
    const safe = typeof message === 'string' ? message : String(message);
    const trimmed = (safe || '').trim();
    // Drop malformed or noisy messages
    if (!trimmed || trimmed === 'NaN[object Object]') return;

    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = trimmed;
    document.body.appendChild(announcer);
    setTimeout(() => {
      try { document.body.removeChild(announcer); } catch {}
    }, 1000);
  } catch {}
}

// Focus management utilities
export const focusUtils = {
  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');
    
    return Array.from(container.querySelectorAll(focusableSelectors));
  },

  /**
   * Focus the first focusable element in a container
   */
  focusFirst(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
      return true;
    }
    return false;
  },

  /**
   * Focus the last focusable element in a container
   */
  focusLast(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
      return true;
    }
    return false;
  },

  /**
   * Check if an element is currently visible and focusable
   */
  isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
  },
};

// Color contrast utilities
export const colorUtils = {
  /**
   * Calculate relative luminance of a color
   */
  getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
    const lum1 = this.getLuminance(...color1);
    const lum2 = this.getLuminance(...color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  },

  /**
   * Check if contrast ratio meets WCAG standards
   */
  meetsWCAG(ratio: number, level: 'AA' | 'AAA' = 'AA', size: 'normal' | 'large' = 'normal'): boolean {
    if (level === 'AAA') {
      return size === 'large' ? ratio >= 4.5 : ratio >= 7;
    }
    return size === 'large' ? ratio >= 3 : ratio >= 4.5;
  },
};

// Keyboard navigation helpers
export const keyboardUtils = {
  /**
   * Check if a key event matches expected keys
   */
  isKey(event: KeyboardEvent, ...keys: string[]): boolean {
    const key = event.key.toLowerCase();
    return keys.map(k => k.toLowerCase()).includes(key);
  },

  /**
   * Handle arrow key navigation within a list or grid
   */
  handleArrowNavigation(
    event: KeyboardEvent,
    currentIndex: number,
    itemCount: number,
    options: {
      loop?: boolean;
      horizontal?: boolean;
    } = {}
  ): number | null {
    const { loop = true, horizontal = false } = options;
    let nextIndex = currentIndex;

    if (horizontal) {
      if (event.key === 'ArrowRight') nextIndex = Math.min(itemCount - 1, currentIndex + 1);
      if (event.key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);
    } else {
      if (event.key === 'ArrowDown') nextIndex = Math.min(itemCount - 1, currentIndex + 1);
      if (event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
    }

    if (loop) {
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = itemCount - 1;
    }

    return nextIndex === currentIndex ? null : nextIndex;
  },
};

export function useAriaAnnouncer() {
  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    try {
      const safe = typeof message === 'string' ? message : String(message);
      const trimmed = (safe || '').trim();
      if (!trimmed || trimmed === 'NaN[object Object]') return;
      announceToScreenReader(trimmed, priority);
    } catch {}
  }, []);

  return { announce };
}

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  return prefersReducedMotion;
}

export function useHighContrast() {
  const [highContrast, setHighContrast] = React.useState(false);
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    setHighContrast(mediaQuery.matches);
    const handler = (event: MediaQueryListEvent) => setHighContrast(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  return highContrast;
}

export const ariaUtils = {
  getFormFieldAria(
    id: string,
    options: {
      required?: boolean;
      invalid?: boolean;
      describedBy?: string[];
      label?: string;
    } = {}
  ) {
    const { required, invalid, describedBy, label } = options;
    const ariaProps: Record<string, string | boolean> = {};
    if (required) ariaProps['aria-required'] = 'true';
    if (invalid) ariaProps['aria-invalid'] = 'true';
    if (describedBy && describedBy.length > 0) ariaProps['aria-describedby'] = describedBy.join(' ');
    if (label) ariaProps['aria-label'] = label;
    return ariaProps;
  },

  getListAria(
    options: {
      multiselectable?: boolean;
      orientation?: 'horizontal' | 'vertical';
      label?: string;
      labelledBy?: string;
    } = {}
  ) {
    const { multiselectable = false, orientation = 'vertical', label, labelledBy } = options;
    const ariaProps: Record<string, string | boolean> = {
      role: 'list',
      'aria-multiselectable': multiselectable ? 'true' : 'false',
      'aria-orientation': orientation,
    };
    if (label) ariaProps['aria-label'] = label;
    if (labelledBy) ariaProps['aria-labelledby'] = labelledBy;
    return ariaProps;
  },

  getListItemAria(
    options: {
      selected?: boolean;
      disabled?: boolean;
      index?: number;
      setSize?: number;
    } = {}
  ) {
    const { selected = false, disabled = false, index, setSize } = options;
    const ariaProps: Record<string, string | boolean> = {
      role: 'listitem',
      'aria-selected': selected ? 'true' : 'false',
      'aria-disabled': disabled ? 'true' : 'false',
    };
    if (typeof index === 'number') ariaProps['aria-posinset'] = String(index + 1);
    if (typeof setSize === 'number') ariaProps['aria-setsize'] = String(setSize);
    return ariaProps;
  },
};

export default {
  announceToScreenReader,
  focusUtils,
  colorUtils,
  keyboardUtils,
  ariaUtils,
};