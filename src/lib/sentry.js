/**
 * sentry.js — Error monitoring initialization
 *
 * Initializes Sentry for production error tracking.
 * Only activates when VITE_SENTRY_DSN is set (production).
 * In demo/dev mode, errors are logged to console only.
 */
import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_PRODUCTION = import.meta.env.PROD && DSN;

/**
 * Initialize Sentry error tracking.
 * Call once in main.jsx before ReactDOM.render().
 */
export function initSentry() {
  if (!IS_PRODUCTION) {
    console.log('[Sentry] Disabled — no DSN configured (dev/demo mode)');
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE || 'production',
    release: `batigesti@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

    // Performance monitoring — sample 10% of transactions
    tracesSampleRate: 0.1,

    // Session replay — capture 1% of sessions, 100% of errors
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Filter noisy errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Network errors (handled by offline mode)
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      // Chunk loading (handled by stale chunk reloader)
      'ChunkLoadError',
      'Failed to fetch dynamically imported module',
      'Loading chunk',
      'Importing a module script failed',
      // Benign
      'ResizeObserver loop',
      'Non-Error exception captured',
      'Non-Error promise rejection captured',
    ],

    // Don't send errors from these URLs
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],

    beforeSend(event) {
      // Strip PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(bc => {
          if (bc.category === 'xhr' || bc.category === 'fetch') {
            // Remove auth tokens from URLs
            if (bc.data?.url) {
              bc.data.url = bc.data.url.replace(/apikey=[^&]+/, 'apikey=***');
              bc.data.url = bc.data.url.replace(/token=[^&]+/, 'token=***');
            }
          }
          return bc;
        });
      }
      return event;
    },
  });

  console.log('[Sentry] Initialized for production monitoring');
}

/**
 * Capture an exception manually.
 * Safe to call even when Sentry is not initialized.
 */
export function captureException(error, context) {
  if (IS_PRODUCTION) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }
  // Always log to console
  console.error('[Error]', error, context || '');
}

/**
 * Capture a message (info, warning, etc.).
 */
export function captureMessage(message, level = 'info') {
  if (IS_PRODUCTION) {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Set user context for Sentry.
 * Call on login, clear on logout.
 */
export function setUser(user) {
  if (IS_PRODUCTION) {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        // Don't send name — PII minimization
      });
    } else {
      Sentry.setUser(null);
    }
  }
}

/**
 * Add custom tags for filtering in Sentry dashboard.
 */
export function setTag(key, value) {
  if (IS_PRODUCTION) {
    Sentry.setTag(key, value);
  }
}

export default {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  setTag,
};
