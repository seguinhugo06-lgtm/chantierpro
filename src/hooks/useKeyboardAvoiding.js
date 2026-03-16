import { useEffect } from 'react';

/**
 * Hook to handle keyboard avoiding behavior on iOS
 * Automatically scrolls focused inputs into view when the virtual keyboard opens
 *
 * Usage:
 * function MyModal() {
 *   useKeyboardAvoiding();
 *   return <form>...</form>;
 * }
 */
export function useKeyboardAvoiding() {
  useEffect(() => {
    // Only apply on touch devices (mobile)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const handleFocus = (e) => {
      const target = e.target;

      // Only handle input elements
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        // Wait for the keyboard to open (iOS takes ~300ms)
        setTimeout(() => {
          // Check if element is still focused
          if (document.activeElement === target) {
            target.scrollIntoView({
              block: 'center',
              behavior: 'smooth'
            });
          }
        }, 350);
      }
    };

    // Also handle resize events (keyboard open/close)
    const handleResize = () => {
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.tagName === 'SELECT')
      ) {
        setTimeout(() => {
          activeElement.scrollIntoView({
            block: 'center',
            behavior: 'smooth'
          });
        }, 100);
      }
    };

    document.addEventListener('focusin', handleFocus);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
}

export default useKeyboardAvoiding;
