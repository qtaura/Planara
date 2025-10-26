import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigationOptions {
  /** Enable arrow key navigation */
  arrows?: boolean;
  /** Enable tab navigation */
  tab?: boolean;
  /** Enable enter/space activation */
  activation?: boolean;
  /** Enable escape to close/cancel */
  escape?: boolean;
  /** Custom key handlers */
  customKeys?: Record<string, (event: KeyboardEvent) => void>;
  /** Selector for focusable elements */
  focusableSelector?: string;
  /** Loop navigation (wrap around) */
  loop?: boolean;
  /** Skip disabled elements */
  skipDisabled?: boolean;
}

const DEFAULT_FOCUSABLE_SELECTOR = 
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), [role="button"]:not([disabled]), [role="menuitem"]:not([disabled])';

/**
 * Hook for implementing comprehensive keyboard navigation
 */
export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: KeyboardNavigationOptions = {}
) {
  const {
    arrows = true,
    tab = true,
    activation = true,
    escape = false,
    customKeys = {},
    focusableSelector = DEFAULT_FOCUSABLE_SELECTOR,
    loop = true,
    skipDisabled = true,
  } = options;

  const currentFocusIndex = useRef<number>(-1);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelector)
    ) as HTMLElement[];
    
    return skipDisabled 
      ? elements.filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-disabled'))
      : elements;
  }, [containerRef, focusableSelector, skipDisabled]);

  const focusElement = useCallback((index: number) => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    let targetIndex = index;
    if (loop) {
      targetIndex = ((index % elements.length) + elements.length) % elements.length;
    } else {
      targetIndex = Math.max(0, Math.min(index, elements.length - 1));
    }

    const element = elements[targetIndex];
    if (element) {
      element.focus();
      currentFocusIndex.current = targetIndex;
      
      // Scroll into view if needed
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [getFocusableElements, loop]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    // Update current focus index based on active element
    const activeElement = document.activeElement as HTMLElement;
    const activeIndex = elements.indexOf(activeElement);
    if (activeIndex !== -1) {
      currentFocusIndex.current = activeIndex;
    }

    // Handle custom keys first
    if (customKeys[event.key]) {
      customKeys[event.key](event);
      return;
    }

    // Arrow key navigation
    if (arrows && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || 
                   event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      
      const isVertical = event.key === 'ArrowDown' || event.key === 'ArrowUp';
      const isForward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      
      const nextIndex = isForward 
        ? currentFocusIndex.current + 1 
        : currentFocusIndex.current - 1;
      
      focusElement(nextIndex);
    }

    // Tab navigation (enhanced)
    if (tab && event.key === 'Tab') {
      event.preventDefault();
      const nextIndex = event.shiftKey 
        ? currentFocusIndex.current - 1 
        : currentFocusIndex.current + 1;
      focusElement(nextIndex);
    }

    // Enter/Space activation
    if (activation && (event.key === 'Enter' || event.key === ' ')) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && elements.includes(activeElement)) {
        // Don't prevent default for input elements
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
          event.preventDefault();
          activeElement.click();
        }
      }
    }

    // Escape handling
    if (escape && event.key === 'Escape') {
      event.preventDefault();
      // Blur current element or trigger custom escape handler
      if (document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      }
    }
  }, [getFocusableElements, arrows, tab, activation, escape, customKeys, focusElement]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, handleKeyDown]);

  return {
    focusElement,
    getFocusableElements,
    currentFocusIndex: currentFocusIndex.current,
  };
}

/**
 * Hook for managing focus trapping within a container
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(DEFAULT_FOCUSABLE_SELECTOR);
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when trap becomes active
    firstElement?.focus();

    container.addEventListener('keydown', handleTabKey);
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [containerRef, isActive]);
}

/**
 * Hook for announcing screen reader messages
 */
export function useScreenReaderAnnouncement() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return { announce };
}

/**
 * Utility for managing roving tabindex
 */
export function useRovingTabIndex(
  containerRef: React.RefObject<HTMLElement>,
  activeIndex: number = 0
) {
  useEffect(() => {
    if (!containerRef.current) return;

    const elements = containerRef.current.querySelectorAll('[role="menuitem"], [role="option"], [role="tab"]');
    
    elements.forEach((element, index) => {
      const htmlElement = element as HTMLElement;
      if (index === activeIndex) {
        htmlElement.setAttribute('tabindex', '0');
      } else {
        htmlElement.setAttribute('tabindex', '-1');
      }
    });
  }, [containerRef, activeIndex]);
}