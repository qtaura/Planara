import * as React from 'react';

/**
 * Accessibility utilities for enhanced UX
 */

// ARIA live region announcer
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;
  
  document.body.appendChild(announcer);
  
  // Clean up after announcement
  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
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
    return keys.includes(event.key);
  },

  /**
   * Handle arrow key navigation in a list
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
    
    let newIndex: number | null = null;
    
    if (horizontal) {
      if (event.key === 'ArrowLeft') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : (loop ? itemCount - 1 : currentIndex);
      } else if (event.key === 'ArrowRight') {
        newIndex = currentIndex < itemCount - 1 ? currentIndex + 1 : (loop ? 0 : currentIndex);
      }
    } else {
      if (event.key === 'ArrowUp') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : (loop ? itemCount - 1 : currentIndex);
      } else if (event.key === 'ArrowDown') {
        newIndex = currentIndex < itemCount - 1 ? currentIndex + 1 : (loop ? 0 : currentIndex);
      }
    }
    
    if (newIndex !== null && newIndex !== currentIndex) {
      event.preventDefault();
      return newIndex;
    }
    
    return null;
  },
};

// React hooks for accessibility
export function useAriaAnnouncer() {
  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority);
  }, []);
  
  return announce;
}

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
}

export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = React.useState(false);
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);
    
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersHighContrast;
}

// ARIA attributes helpers
export const ariaUtils = {
  /**
   * Generate ARIA attributes for form fields
   */
  getFormFieldAria(
    id: string,
    options: {
      required?: boolean;
      invalid?: boolean;
      describedBy?: string[];
      label?: string;
    } = {}
  ) {
    const { required, invalid, describedBy = [], label } = options;
    
    return {
      id,
      'aria-required': required ? 'true' : undefined,
      'aria-invalid': invalid ? 'true' : undefined,
      'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
      'aria-label': label,
    };
  },

  /**
   * Generate ARIA attributes for interactive lists
   */
  getListAria(
    options: {
      multiselectable?: boolean;
      orientation?: 'horizontal' | 'vertical';
      label?: string;
      labelledBy?: string;
    } = {}
  ) {
    const { multiselectable, orientation = 'vertical', label, labelledBy } = options;
    
    return {
      role: 'listbox',
      'aria-multiselectable': multiselectable ? 'true' : undefined,
      'aria-orientation': orientation,
      'aria-label': label,
      'aria-labelledby': labelledBy,
    };
  },

  /**
   * Generate ARIA attributes for list items
   */
  getListItemAria(
    options: {
      selected?: boolean;
      disabled?: boolean;
      index?: number;
      setSize?: number;
    } = {}
  ) {
    const { selected, disabled, index, setSize } = options;
    
    return {
      role: 'option',
      'aria-selected': selected ? 'true' : 'false',
      'aria-disabled': disabled ? 'true' : undefined,
      'aria-posinset': index !== undefined ? index + 1 : undefined,
      'aria-setsize': setSize,
    };
  },
};

export default {
  announceToScreenReader,
  focusUtils,
  colorUtils,
  keyboardUtils,
  ariaUtils,
};