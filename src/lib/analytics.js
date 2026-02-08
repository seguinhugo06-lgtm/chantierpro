/**
 * analytics.js — Lightweight event tracking for ChantierPro
 *
 * Uses Plausible Analytics (privacy-first, no cookies).
 * Events are only sent if the user accepted analytics cookies.
 * Falls back to no-op if Plausible is not loaded.
 */
import { getCookieConsent } from '../components/CookieConsent';

function track(eventName, props) {
  try {
    const consent = getCookieConsent();
    if (!consent?.analytics) return;
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible(eventName, props ? { props } : undefined);
    }
  } catch { /* silent */ }
}

const analytics = {
  // Acquisition
  signup: () => track('Signup'),
  login: () => track('Login'),
  trialStarted: () => track('Trial Started'),

  // Activation
  firstDevis: () => track('First Devis Created'),
  firstDevisSent: () => track('First Devis Sent'),
  firstFacture: () => track('First Facture Created'),
  firstClient: () => track('First Client Added'),
  onboardingCompleted: () => track('Onboarding Completed'),

  // Revenue
  planUpgrade: (plan) => track('Plan Upgraded', { plan }),
  checkoutStarted: (plan) => track('Checkout Started', { plan }),
  subscriptionCanceled: () => track('Subscription Canceled'),

  // Engagement
  featureUsed: (feature) => track('Feature Used', { feature }),
  pdfDownloaded: (type) => track('PDF Downloaded', { type }),
  emailSent: (type) => track('Email Sent', { type }),
  importCompleted: (type, count) => track('Import Completed', { type, count: String(count) }),

  // Pages
  pageView: (page) => track('Page View', { page }),
};

export default analytics;
