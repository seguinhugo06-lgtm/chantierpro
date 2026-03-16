/**
 * Sentry — Module centralisé de monitoring d'erreurs.
 *
 * • En production (VITE_SENTRY_DSN configuré) : initialise @sentry/react
 * • En dev / sans DSN : fallback silencieux (console.error)
 *
 * Usage :
 *   import { captureException, captureMessage } from '../lib/sentry';
 *   captureException(error, { context: 'devisIA.transcribe' });
 */

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_PROD = import.meta.env.PROD;
let initialized = false;

// ── Initialisation (appelée une seule fois dans main.jsx) ─────────────
export function initSentry() {
  if (initialized || !DSN || !IS_PROD) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.VITE_ENV || 'production',
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.2,
    // Ne pas capturer les erreurs de réseau courantes
    beforeSend(event) {
      const msg = event?.exception?.values?.[0]?.value || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        return null;
      }
      return event;
    },
  });

  initialized = true;
}

// ── API publique ──────────────────────────────────────────────────────

/**
 * Capture une exception avec contexte optionnel.
 * @param {Error|string} error
 * @param {{ context?: string, extra?: object }} options
 */
export function captureException(error, options = {}) {
  const { context, extra } = options;

  if (DSN && IS_PROD && initialized) {
    Sentry.withScope((scope) => {
      if (context) scope.setTag('context', context);
      if (extra) scope.setExtras(extra);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    });
  } else {
    // eslint-disable-next-line no-console
    console.error(`[Sentry:${context || 'unknown'}]`, error);
  }
}

/**
 * Capture un message (warning / info).
 * @param {string} message
 * @param {'info'|'warning'|'error'} level
 */
export function captureMessage(message, level = 'info') {
  if (DSN && IS_PROD && initialized) {
    Sentry.captureMessage(message, level);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[Sentry:${level}]`, message);
  }
}

/**
 * Définit l'utilisateur pour les rapports Sentry.
 * @param {{ id: string, email?: string }} user
 */
export function setUser(user) {
  if (DSN && IS_PROD && initialized) {
    Sentry.setUser(user ? { id: user.id, email: user.email } : null);
  }
}

/**
 * Error boundary React — wrapping de Sentry.ErrorBoundary.
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;
