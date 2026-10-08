---
paths:
  - "src/services/subscriptionsApi.js"
  - "src/stores/subscriptionStore.js"
  - "src/components/subscription/**"
  - "src/components/profil/PlanPage.jsx"
  - "src/components/payment/**"
  - "src/components/settings/PaymentConfigTab.jsx"
  - "src/lib/paymentUtils.js"
  - "supabase/functions/stripe-webhook/**"
  - "supabase/functions/subscription-billing/**"
  - "supabase/functions/create-invoice-payment/**"
---

# Abonnements et paiements

- Chaîne : `createCheckoutSession` → `subscription-billing` (Stripe Checkout, retour `?upgraded=true`) → `stripe-webhook` (écrit `subscriptions`) → `fetchSubscription` (relecture, attente de l'activation). Ne jamais se fier au 200 de Stripe : constater `subscriptions.plan`.
- Seuls le webhook et `subscription-billing` (clé de service) écrivent un plan payant. Aucune policy UPDATE utilisateur sur `subscriptions` (migration 073).
- Plans : `gratuit` / `artisan` / `equipe` ; noms affichés via `PLANS[id].name` ; plan par défaut `gratuit`. Tarif fondateur 9,90 / 19,90 € HT garanti tant que l'abonnement reste actif : **pas de prix barré** fictif.
- Offres testeurs : ligne sans `stripe_subscription_id` avec `current_period_end` → « Offert jusqu'au … », sans bouton Stripe ; fin gérée par `appliquerFinOffre` et la tâche nocturne (074).
- Paiement des factures par le client : **jamais de frais ajoutés** (C. mon. fin. L112-12), montant exact.
- Sorties vers Stripe : `ouvrirLienExterne(url, { memeOnglet: true })` (navigateur système dans l'app native ; pas de `window.open` après un `await`, bloqué par Safari).
- Stripe est en mode test : passage en live = décision et action d'Hugo (clé + secret de webhook ensemble).
- Apps iOS / Android : aucun bouton d'achat avant la décision D-13 (`docs/decisions.md`).
