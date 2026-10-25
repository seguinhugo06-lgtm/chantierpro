/**
 * analytics.js — événements de produit (inscription, premier devis, plan…).
 *
 * INERTE depuis le 25 oct. 2026 : aucun outil de mesure n'est chargé (le script Plausible a été retiré de index.html le
 * 16 mars 2026, commit 227534e3) et le bandeau de consentement a été retiré avec lui (relecture juriste du 25 oct.,
 * option A : pas de bandeau tant qu'aucun traceur facultatif n'existe). Ces événements suivent un parcours d'achat :
 * ils demandent le consentement de l'utilisateur (loi 78-17, art. 82). Avant d'en réactiver un, remettre le bandeau
 * (historique : src/components/CookieConsent.jsx au commit 319c95b4) et l'outil dans la politique de confidentialité —
 * tâche « bandeau-traceurs » de docs/feuille-de-route.md. Les appels restent en place.
 */
function track() {
  // Rien n'est lu ni écrit sur l'appareil, rien n'est envoyé.
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
