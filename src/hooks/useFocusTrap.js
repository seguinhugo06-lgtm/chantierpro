import { useEffect, useRef } from 'react';

/**
 * useFocusTrap — Traps keyboard focus inside a modal / dialog.
 *
 * Usage:
 *   const trapRef = useFocusTrap(isOpen);
 *   <div ref={trapRef} ...>
 *
 * Features:
 * - Focuses the first interactive element when opened
 * - Tab / Shift+Tab cycle within the container
 * - Restores focus to the previously-focused element on close
 * - Locks body scroll while open
 *
 * @param {boolean} isOpen — whether the trap is active
 * @param {Object} [options]
 * @param {boolean} [options.lockScroll=true] — lock body scroll
 * @param {boolean} [options.restoreFocus=true] — restore focus on close
 * @returns {React.RefObject} — ref to attach to the modal container
 */
export default function useFocusTrap(isOpen, { lockScroll = true, restoreFocus = true } = {}) {
  const ref = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store current focus
    if (restoreFocus) {
      previousFocus.current = document.activeElement;
    }

    // Lock scroll
    if (lockScroll) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const container = ref.current;
    if (!container) return;

    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

    // Auto-focus first element
    requestAnimationFrame(() => {
      const first = container.querySelector(FOCUSABLE);
      if (first) first.focus();
      else container.focus();
    });

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const focusable = Array.from(container.querySelectorAll(FOCUSABLE));
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore scroll
      if (lockScroll) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }

      // Restore focus
      if (restoreFocus && previousFocus.current) {
        previousFocus.current.focus();
      }
    };
  }, [isOpen, lockScroll, restoreFocus]);

  return ref;
}
