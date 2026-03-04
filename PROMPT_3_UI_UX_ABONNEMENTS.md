# PROMPT 3/5 : UI/UX Système d'Abonnements ChantierPro

## Vue d'ensemble
Implémenter le système d'abonnements complet de ChantierPro avec:
- Page tarifs publique responsive
- Modal d'upgrade contextuel
- Indicateurs de fonctionnalités verrouillées
- Banners d'essai/upgrade
- Page de gestion d'abonnement
- Flux de checkout Stripe
- Système d'emails transactionnels

---

## PROMPT COMPLET POUR CLAUDE CODE

```
Tu es un développeur React/Vite expert. Ta mission: implémenter le système d'abonnements ChantierPro en React 18 + Vite 5 + Supabase + Zustand + Tailwind CSS.

## CONTEXTE PRODUIT

ChantierPro est une SaaS de gestion de chantiers pour artisans. Le modèle de pricing comprend:
- Découverte (gratuit, 14j trial)
- Artisan (29€/mois ou 290€/an)
- Pro (99€/mois ou 990€/an) — POPULAIRE
- Entreprise (custom)

Les limites par plan:
| Feature | Découverte | Artisan | Pro | Entreprise |
|---------|-----------|---------|-----|------------|
| Devis/mois | 3 | 20 | Illimités | Illimités |
| Clients | 5 | 20 | 50 | 500+ |
| Signatures | 0 | 5 | 20 | Illimités |
| IA Devis | Non | Non | Oui | Oui |
| Export FEC | Non | Non | Oui | Oui |
| Équipe | Non | Non | 5 users | 50+ users |
| Support | Email | Email | Prioritaire | Dédié |
| Stockage | 500 Mo | 2 Go | 10 Go | Custom |

## SECTION 1: PAGE PRICING (/tarifs)

### Architecture et Design

#### 1.1 Structure du Header
- Titre centré, grande typographie: "Choisissez votre plan"
- Sous-titre: "14 jours d'essai gratuit, sans engagement"
- Toggle Mensuel/Annuel horizontal avec switch + badge "Économisez 17%"
  - Badge visible seulement sur le bouton "Annuel" quand il est sélectionné
  - Couleur badge: bg-green-50 avec texte green-700

#### 1.2 Grille de Plans
Afficher 4 cartes de plans: Découverte, Artisan, Pro (surligné), Entreprise

**Design commun à toutes les cartes:**
```
- Rounded-xl (border-radius: 0.75rem)
- Border 2px
- Padding: px-6 py-8
- Transition hover: scale-105, shadow augmente
- Contient:
  - Badge plan (pill-shaped, couleur du plan)
  - Nom du plan (font-bold, text-lg)
  - Description cible (text-sm, text-gray-600)
  - Prix principal (text-3xl, font-bold, couleur plan)
  - Texte "HT par mois" ou "HT/an"
  - Saviez-vous: "Facturé annuellement: 990€" (si annuel, texte petit, gris)
  - Bouton CTA (w-full, py-2.5, rounded-lg)
  - Séparateur (border-t, my-6)
  - Liste features (ul, li, avec ✓ en vert ou ✗ en gris)
```

**Plan Découverte (gris):**
- Border: border-gray-200
- Badge: bg-gray-100, text-gray-700
- Prix: text-gray-900
- Bouton: bg-gray-100, text-gray-900, hover:bg-gray-200
- Features: max 8, certaines avec ✗

**Plan Artisan (bleu):**
- Border: border-blue-200
- Badge: bg-blue-50, text-blue-700
- Prix: text-blue-600
- Bouton: bg-blue-600, text-white, hover:bg-blue-700
- Features: 10, mix ✓ et ✗

**Plan Pro (orange) — PLAN POPULAIRE:**
- Border: border-orange-300, border-width-2 (plus épais)
- Box-shadow: 0 20px 25px -5px rgba(249, 115, 22, 0.1)
- Transform: scale-105 (légèrement plus grand)
- Badge "POPULAIRE":
  - Position: absolute, top-0, right-0
  - bg-orange-500, text-white
  - Rotated: -45deg, padding pour effet ribbon
- Badge plan: bg-orange-50, text-orange-700
- Prix: text-orange-600
- Bouton: bg-orange-500, text-white, hover:bg-orange-600
- Features: 12, mix ✓ (majoritaires) et ✗

**Plan Entreprise (violet):**
- Border: border-purple-200
- Badge: bg-purple-50, text-purple-700
- Prix: "Tarif personnalisé"
- Bouton: bg-purple-600, text-white, hover:bg-purple-700
- Features: max 8, surtout ✓
- CTA particulier: "Demander une démo" au lieu de "Essayer"

#### 1.3 Responsive Layout

**Desktop (1024px+):**
- Grid 4 colonnes: grid-cols-4, gap-6
- Les 4 plans visibles côte à côte
- Pro scaling appliqué

**Tablet (768px-1023px):**
- Grid 2x2: grid-cols-2, gap-4
- Plans équilibrés
- Pro au centre-haut (col-span-1)

**Mobile (< 768px):**
- Slider horizontal (Swiper ou Embla Carousel)
- Affiche 1 plan à la fois
- Plan Pro visible en PREMIER (slide index 0)
- Dots navigation en bas (4 dots, Pro active initialement)
- Snap: snap-x, scroll-smooth
- Chaque carte: w-full, min-w-full

#### 1.4 Sections complémentaires sous les plans

**Section FAQ (py-16, max-w-4xl):**
- Titre: "Questions fréquentes"
- 5 questions en accordion (Headless UI Disclosure):
  - "Puis-je changer de plan en cours de mois?"
  - "Puis-je annuler mon abonnement?"
  - "Quelle est la durée du trial?"
  - "Puis-je ajouter des utilisateurs?"
  - "Comment fonctionne la facturation?"
- Chaque question: chevron rotate au clic, contenu déplie avec transition

**Section Témoignages (py-16, bg-gray-50):**
- Titre: "Nos utilisateurs adorent ChantierPro"
- 3 cartes de témoignages (grid-cols-3, md:grid-cols-1):
  - Avatar (w-12 h-12, rounded-full, bg-gradient)
  - Nom + métier: "Martin Dubois · Électricien"
  - Étoiles (5 stars, text-yellow-400)
  - Texte citation (italic, text-gray-700)
  - Logo entreprise (w-24 h-8, grayscale)

**Section Logos Métiers (py-16):**
- Titre: "Ils nous font confiance"
- 6-8 logos (corps de métier: électriciens, plombiers, charpentiers, etc.)
- Layout: grid-cols-6, md:grid-cols-3, grayscale, hover:grayscale-0 avec transition

#### 1.5 CTA Final
- Section avant footer: bg-gradient-to-r from-orange-500 to-orange-600
- Contenu centré, padding py-12
- Titre: "Prêt à démarrer?"
- Texte: "Rejoignez 1000+ artisans qui font confiance à ChantierPro"
- Bouton: bg-white, text-orange-600, font-bold, hover:shadow-lg

### Route: `/tarifs` (publique, accessible sans login)

### Composants à créer:
- `PricingPage.tsx` — page principale
- `PricingCard.tsx` — carte plan individuelle
- `PricingToggle.tsx` — toggle mensuel/annuel
- `FAQSection.tsx` — section FAQ avec accordion
- `TestimonialsSection.tsx` — cartes témoignages
- `TrustedBySection.tsx` — logos métiers

### Stores Zustand à mettre à jour:
- `usePricingStore`:
  - `billingCycle: 'monthly' | 'annual'`
  - `setBillingCycle(cycle)`
  - Les prix doivent être recalculés dans le store

---

## SECTION 2: MODAL UPGRADE / PAYWALL

### 2.1 Quand afficher le modal

Le modal s'affiche automatiquement dans ces cas:
1. Utilisateur atteint limite de feature:
   - 4ème devis créé (Découverte limite à 3)
   - 6ème client ajouté (Découverte limite à 5)
   - 1ère tentative signature (Découverte interdit)
   - 1ère utilisation IA Devis (Pro only)
   - 1ère utilisation Export FEC (Pro only)
   - 1ère création équipe (Artisan+ ou Pro+)

2. Utilisateur clique sur bouton/feature verrouillée:
   - Boutton "Créer une signature" → paywall Signatures
   - Bouton "Générer avec IA" → paywall IA Devis
   - Onglet "Équipe" verrouillé → paywall Équipe

### 2.2 Architecture du Modal

**Structure générale:**
```
Modal container:
- Fixed, inset-0, bg-black/40, backdrop-blur-sm
- Animation: Slide-up (translateY de +100 à 0)
- Duration: 300ms ease-out

Modal card:
- Position: absolute, bottom-0, w-full, max-w-2xl, mx-auto
- Rounded-t-2xl, bg-white
- Padding: px-6 py-8
- Shadow: shadow-2xl
```

**Contenu:**

1. **Header (mb-6):**
   - Icône cadenas (icon-lg, text-orange-500)
   - Titre contextuel (text-2xl, font-bold):
     - Par défaut: "Vous avez atteint la limite de devis"
     - Signatures: "Signatures électroniques — Plan Pro"
     - IA Devis: "Générer des devis avec IA — Plan Pro"
     - Équipe: "Gestion d'équipe — Plan Artisan+"
   - Sous-titre (text-gray-600, text-sm)

2. **Comparaison visuelle (grid-cols-2, gap-6, my-8):**

   **Colonne 1 — Plan actuel:**
   ```
   - Titre: "Votre plan actuel"
   - Nom plan avec badge couleur (pill)
   - Prix affiché (si applicable)
   - Liste features actuelles (max 6):
     - Items inclus: ✓ en vert
     - Items manquants: ✗ en rouge
   - Bouton: "En savoir plus" (outline, couleur plan)
   ```

   **Colonne 2 — Plan recommandé:**
   ```
   - Titre: "Plan recommandé"
   - Nom plan avec badge "POPULAIRE" (si Pro)
   - Prix clair:
     - Format: "99€ HT par mois"
     - Ou: "82,50€ HT/mois (facturé 990€ annuellement)"
   - Badge économie (si annuel): "Économisez 17%" en vert
   - Liste features (les plus pertinentes pour le contexte):
     - Toutes avec ✓
   - Bouton principal: "Passer au plan {NomPlan}" (orange, full-width)
   ```

3. **Boutons action (mt-8):**
   - Primary: "Passer au plan Pro" (bg-orange-500, w-full, py-3, font-bold)
   - Secondary: "Voir tous les plans" (outline, border-orange-500, text-orange-500)
   - Tertiary (lien): "Plus tard" (text-gray-500, underline, hover:text-gray-700)

### 2.3 Variantes contextuelles

Le message s'adapte selon le trigger:

**Trigger: Limit Devis**
- Titre: "Limite de devis atteinte (3 par mois)"
- Sous-titre: "Passez à un plan supérieur pour créer plus de devis"
- Plan actuel: Découverte avec "3 devis/mois"
- Plan recommandé: Artisan avec "20 devis/mois"
- Highlight feature: "Devis illimités" en orange dans la liste

**Trigger: Signatures bloquées**
- Titre: "Signatures électroniques — Plan Pro requis"
- Sous-titre: "Signez directement vos devis et factures avec vos clients"
- Plan recommandé: Pro (plan minimum)
- Highlight feature: "20 signatures/mois" en orange

**Trigger: IA Devis bloquée**
- Titre: "Analyse IA — Débloquez en plan Pro"
- Sous-titre: "Générez des devis automatiquement à partir de photos et descriptions"
- Plan recommandé: Pro
- Highlight feature: "Analyse IA illimitée" en orange

**Trigger: Export FEC bloquée**
- Titre: "Export FEC — Plan Pro requis"
- Sous-titre: "Exportez vos données comptables au format FEC pour votre expert-comptable"
- Plan recommandé: Pro
- Highlight feature: "Export FEC illimité"

**Trigger: Équipe bloquée**
- Titre: "Gestion d'équipe — Plan Artisan+ requis"
- Sous-titre: "Invitez vos collaborateurs et gérez les permissions"
- Plan recommandé: Artisan (5 users) ou Pro (50 users)
- Highlight feature: "Jusqu'à 5 utilisateurs" (Artisan) ou "Jusqu'à 50 utilisateurs" (Pro)

### Composants à créer:
- `UpgradeModal.tsx` — modal principal
- `PlanComparison.tsx` — widget de comparaison 2 colonnes
- `UpgradeModalTrigger.tsx` — hook/composant pour trigger automatique

### Stores Zustand à mettre à jour:
- `useSubscriptionStore`:
  - `showUpgradeModal: boolean`
  - `upgradeModalContext: 'devis_limit' | 'signatures' | 'ia' | 'export' | 'team' | null`
  - `setUpgradeModal(show: boolean, context?: string)`
  - `currentPlan: Plan`
  - `recommendedPlan: Plan` (calculé selon context)

---

## SECTION 3: INDICATEURS DE VERROUILLAGE (FEATURE LOCKS)

### 3.1 Cadenas dans le Sidebar

**Placement:**
- À côté du texte des items: "Signatures", "IA Devis", "Export FEC", "Équipe"
- Visible seulement si la feature est verrouillée pour le plan actuel
- Position: inline-flex, ml-2, avec icon-sm (w-4 h-4)

**Styling:**
```
Icon cadenas:
- Color: text-red-500 (pour Découverte), text-orange-400 (pour Artisan)
- Hover: affiche tooltip "Débloquer en plan Pro"
- Cursor: pointer (clickable)
- Animation: scale-105 on hover
```

**Interaction:**
- Clic sur le cadenas → ouvre le modal upgrade avec contexte pertinent

### 3.2 Badges Compteur

Pour les features à quota (devis, factures, signatures, IA analyses):

**Placement:**
- À côté du bouton "Créer un devis" ou "Créer une facture"
- Format: "2/3" ou "5/10"
- Badge pill-shaped, inline-block, ml-2

**Styling par état:**
```
Couleur vert (< 70%):        bg-green-100, text-green-800
Couleur orange (70-99%):     bg-orange-100, text-orange-800
Couleur rouge (100% atteint): bg-red-100, text-red-800, font-bold

Texte: text-xs, font-semibold, px-2 py-0.5, rounded-full
```

**Interactivité:**
- Clic sur badge → tooltip "X utilisations restantes ce mois"
- À 100%: Clic → ouvre modal upgrade

### 3.3 Pages Verrouillées (Overlay)

Quand un module entier est verrouillé (ex: Équipe en plan Découverte):

**Structure:**
```
Conteneur parent: relative, overflow-hidden

Aperçu page:
- Complète (pas de cachage blur/grayscale), display:flex
- Opacity: 50% ou grayscale filter
- Pointer-events: none (non-cliquable)

Overlay centré:
- Position: absolute, inset-0
- Bg: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)
- Flex container, items-center, justify-center

Overlay card (z-50):
- Bg-white, rounded-xl, p-8, shadow-2xl
- Max-width: 400px
- Text-center
- Contient:
  - Icône cadenas géant (w-16 h-16, text-orange-500, mx-auto, mb-4)
  - Titre: "Équipe — Plan Artisan+"
  - Description: "Invitez vos collaborateurs et gérez les permissions de chacun"
  - Texte plan minimum: "Plan minimum: Artisan (5 utilisateurs)"
  - Bouton: "Débloquer en plan Pro" (bg-orange-500, w-full)
```

**Animation:**
- Fade-in au chargement (opacity 0→1, duration 300ms)
- Overlay card: scale-95→100, ease-out

### Composants à créer:
- `FeatureLockIcon.tsx` — cadenas cliquable
- `FeatureUsageBadge.tsx` — badge compteur
- `LockedFeatureOverlay.tsx` — overlay pour page verrouillée
- `LockedFeatureGate.tsx` — wrapper pour contrôle accès

### Stores Zustand à mettre à jour:
- `useUserStore`:
  - `currentPlan: Plan`
  - `planFeatures: FeatureAccess[]` (array des features actives)
  - `canAccessFeature(featureName): boolean`

---

## SECTION 4: BANNERS TRIAL / UPGRADE

### 4.1 Banner Trial (pendant essai gratuit)

**Placement:** Fixe, en haut de l'app, sous le header principal
**Position:** `sticky top-[80px] z-40` (ajuster top selon hauteur header)

**Design base (14 jours complets):**
```
Conteneur:
- Height: 56px, bg-blue-50, border-b border-blue-200
- Flexbox: items-center, justify-between, px-6
- Font: text-sm

Texte:
- "Essai gratuit · 14 jours restants · "
- Lien: "Choisir un plan" (text-blue-600, font-bold, hover:underline)

Bouton fermeture:
- Icon-xs (x), text-gray-500, cursor-pointer
- Hover: text-gray-700
- Animation: rotate 90deg on hover
```

**États selon jours restants:**

| Jours restants | Couleur | Message |
|---|---|---|
| 5+ jours | Bleu | "Essai gratuit · X jours restants · [Choisir un plan]" |
| 4-2 jours | Orange | "Plus que X jours d'essai gratuit · [Activer mon plan]" |
| 1 jour | Rouge | "Dernier jour d'essai · [Activez maintenant pour ne rien perdre]" |
| 0 jour (expiré) | Rouge + Important | "Votre essai est terminé · [Choisir un plan pour continuer]" |

**Comportement:**
- Dismissable pour 24h (localStorage: `dismissed_trial_banner` + timestamp)
- Banner réapparaît après 24h
- Au changement d'état (jour -3, -1, 0), banner se réaffiche même si dismissed

### 4.2 Banner Downgrade (après passage Découverte)

**Placement:** Identique au trial banner

**Design:**
```
Conteneur:
- Height: 56px, bg-gray-50, border-b border-gray-200
- Texte: "Plan Découverte actif · " + "Passez au plan Artisan pour déverrouiller toutes les fonctionnalités" + " [En savoir plus]"

Bouton fermeture:
- Présent, dismissable pour la session (pas 24h, juste session)
```

**Quand afficher:**
- Seulement si plan = "Découverte" ET NOT trial
- Affiché 1 fois par session au chargement
- Dismissable jusqu'à reload de page

### Composants à créer:
- `TrialBanner.tsx` — banner trial + downgrade
- `useTrialBannerLogic.ts` — hook gestion états, localStorage

### Stores Zustand à mettre à jour:
- `useSubscriptionStore`:
  - `trialDaysRemaining: number`
  - `trialExpiresAt: Date`
  - `planType: 'discovery' | 'artisan' | 'pro' | 'enterprise'`

---

## SECTION 5: PAGE MON ABONNEMENT (/parametres/abonnement)

### 5.1 Architecture générale

**Route:** `/parametres/abonnement` (nouvel onglet dans Paramètres)
**Permissions:** Authentifié seulement

**Layout:**
```
Max-width: 800px, mx-auto
Padding: py-8, px-6

Sections empilées verticalement:
1. En-tête Plan Actuel
2. Gestion Abonnement (boutons)
3. Usage Dashboard (barres)
4. Facturation (historique)
5. Danger Zone (annulation)
```

### 5.2 En-tête Plan Actuel

```
Card avec bg-gradient de la couleur du plan:
- Gradient: from-[plan-color]-50 to-[plan-color]-100
- Border: 2px, border-[plan-color]-300
- Rounded-xl, p-8

Contenu:
- Badge plan (pill): "Pro" ou "Artisan", couleur du plan
- Titre: "Vous êtes en plan Pro"
- Sous-titre: "Accès complet à toutes les fonctionnalités"
- Info renouvellement (text-sm, text-gray-700):
  "Prochaine facturation: 15 février 2025 · 990€ HT/an"
```

### 5.3 Boutons Gestion Abonnement

**Grid: grid-cols-2, gap-4, my-8**

```
Bouton 1 — "Changer de plan":
- Primary, bg-orange-500, text-white, w-full, py-3
- Icon: trending-up
- Action: Ouvre le modal pricing (section 2)

Bouton 2 — "Gérer les paiements":
- Secondary, outline, border-gray-300, w-full, py-3
- Icon: credit-card
- Action: Redirect vers Stripe Customer Portal (url depuis config)
- Target: _blank
```

### 5.4 Usage Dashboard

**Section: py-8, border-t border-gray-200**

**Titre:** "Utilisation ce mois" (text-lg, font-bold, mb-6)

**Grille: grid-cols-2, md:grid-cols-1, gap-6**

Pour chaque quota, créer une carte:

```
Card:
- Bg-gray-50, rounded-lg, p-4

Contenu:
- Titre (text-sm, font-semibold, text-gray-700): "Devis ce mois"
- Barre progression (w-full, h-2, bg-gray-300, rounded-full, my-3):
  - Bar interior: width % basée sur usage
  - Couleur:
    - Vert (< 70%): bg-green-500
    - Orange (70-99%): bg-orange-500
    - Rouge (100%): bg-red-500
  - Animation: smooth transition
- Statistiques (text-sm, font-bold):
  - "8/10" ou "50/50 ⚠️"
  - Icône ⚠️ si usage >= 100% ou très proche

Items à afficher:
1. Devis ce mois (utilisé/quota)
2. Factures ce mois (utilisé/quota)
3. Clients (utilisé/quota) — si limite existe
4. Signatures (utilisé/quota)
5. IA Analyses (utilisé/quota)
6. Stockage (utilisé/quota total) — ex: "650 Mo / 2 Go"
```

**Texte d'aide (text-xs, text-gray-500, mt-6):**
"Les quotas sont réinitialisés le 1er de chaque mois. L'essai gratuit ne compte pas les limites."

### 5.5 Historique Facturation

**Section: py-8, border-t border-gray-200**

**Titre:** "Factures" (text-lg, font-bold, mb-6)

**Table/List (responsive):**
```
Header (hidden md:flex):
- Date | Montant | Plan | Statut | Action

Rows (répétées):
- Date (text-sm): "15 janv. 2025"
- Montant (font-semibold): "990€ HT"
- Plan: "Pro (annuel)"
- Statut badge:
  - Payée: bg-green-100, text-green-800, "Payée"
  - Pending: bg-gray-100, text-gray-800, "En attente"
  - Failed: bg-red-100, text-red-800, "Échouée"
- Bouton: "Télécharger" (text-blue-600, icon-sm)

Mobile (< md):
- Stack vertical, border-b between rows
- Afficher: Date · Montant · Statut · [Télécharger]
```

**Bouton finale "Gérer l'historique complet":**
- Link vers Stripe Customer Portal
- text-blue-600, underline, hover:text-blue-700

### 5.6 Danger Zone — Annulation

**Section: py-8, border-t border-red-300, bg-red-50, rounded-lg, my-8**

```
Titre: "Zone de danger" (text-lg, font-bold, text-red-700, mb-4)
Texte: "L'annulation de votre abonnement est définitive. Vos données resteront accessibles en lecture seule pour 30 jours."

Bouton: "Annuler l'abonnement"
- bg-red-600, text-white, hover:bg-red-700
- Clic → modal confirmation:
  - Titre: "Êtes-vous sûr?"
  - Message: "Votre plan sera annulé et vous passerez en Découverte. Vos données resteront lisibles 30 jours. Vous pourrez remonter à tout moment."
  - Bouton annulation: "Non, garder mon plan"
  - Bouton confirmation: "Oui, annuler" (rouge)
  - API call: POST /api/subscription/cancel
  - Redirection: /parametres/abonnement avec toast success
```

### Composants à créer:
- `SubscriptionPage.tsx` — page principale
- `PlanHeader.tsx` — en-tête plan
- `UsageDashboard.tsx` — barres de progression
- `BillingHistory.tsx` — table factures
- `CancelSubscriptionModal.tsx` — modal confirmation annulation

### Routes API à implémenter:
- `GET /api/subscription/current` — plan actuel + usage
- `POST /api/subscription/update-plan` — changement de plan
- `POST /api/subscription/cancel` — annulation
- `GET /api/subscription/invoices` — historique factures (ou via Stripe)

---

## SECTION 6: CHECKOUT FLOW

### 6.1 Étapes du flux

**Étape 1: Sélection plan**
- Origine: Page tarifs (/tarifs) OU modal upgrade
- User clique sur "Essayer" ou "Passer au plan X"
- Redirected vers `/checkout?plan=pro&cycle=annual`

**Étape 2: Choix mensuel/annuel**
- URL query params: `plan` et `cycle`
- Page `/checkout` affiche:
  - Récapitulatif plan sélectionné (badge, nom, description)
  - Toggle Mensuel/Annuel (si applicable)
  - Prix affiché clairement
  - Tableau récapitulatif features principales
  - Bouton "Continuer vers le paiement" (orange)

**Étape 3: Redirection Stripe Checkout**
- Clic bouton → API call: `POST /api/stripe/create-checkout-session`
- Payload: `{ planId, billingCycle, successUrl, cancelUrl }`
- Retour: `{ sessionId, sessionUrl }`
- Redirection: `window.location = sessionUrl` (Stripe Checkout)

**Étape 4: Paiement Stripe**
- User remplit formulaire Stripe
- Paiement traité

**Étape 5: Retour sur l'app**
- Success URL: `/checkout/success?sessionId=xxx`
- Page de confirmation affichée (voir 6.3)
- Background: Webhook Stripe met à jour la BDD (souscription créée/modifiée)

### 6.2 Page Checkout

**Route:** `/checkout` (GET avec query params `plan` et `cycle`)
**Permissions:** Publique (pas besoin d'être logged in, mais user sera loggé après paiement)

```
Max-width: 600px, mx-auto, py-12, px-6

Header:
- Titre: "Passer au plan Pro"
- Sous-titre: "Étape 1 sur 2"
- Progress bar: 50% (2 étapes)

Card planification:
- Bg-white, rounded-xl, border-2 border-orange-300, p-8

Contenu:
- Récapitulatif plan (grid-cols-2):
  - Colonne 1:
    - Badge plan
    - Nom plan
    - Description courte
  - Colonne 2:
    - Toggle Mensuel/Annuel (si plan a les 2 options)
    - Prix affiché: "99€ HT par mois"
    - Sous-prix (si annuel): "Facturé 990€ annuellement"
    - Badge économie: "Économisez 17%" (si annuel sélectionné)

Features tableau:
- 6-8 features principales listées
- Checkmark ✓ en vert à côté
- Format: texte simple, pas de design complexe

Boutons:
- Principal: "Continuer vers le paiement" (bg-orange-500, w-full, py-3)
- Secondaire: "Voir d'autres plans" (link, text-orange-600)

CTA footer:
- "Essai gratuit de 14 jours · Sans engagement · Annulez à tout moment"
- Texte-xs, text-gray-600, centré
```

### 6.3 Page de Confirmation (/checkout/success)

**Route:** `/checkout/success?sessionId=xxx`
**Permissions:** Doit être authentifié (sinon redirect login + redirect back)

```
Full-screen background: bg-gradient-to-b from-green-50 to-white

Contenu centré (max-width 600px, mx-auto, py-12):

1. Animation Confetti:
   - Affichée 2-3 secondes au chargement
   - Library: react-confetti ou simple CSS animation

2. Icône Success:
   - Checkmark géant (w-20 h-20, text-green-500, mx-auto, mb-6)
   - Animation: scale-bounce au chargement

3. Titre:
   - "Bienvenue dans le plan Pro ! 🎉"
   - Text-3xl, font-bold, text-gray-900, mb-2

4. Sous-titre:
   - "Votre paiement a été approuvé"
   - Text-lg, text-gray-600, mb-8

5. Récapitulatif (card, bg-white, p-6, rounded-xl, my-8):
   - Ligne 1: Plan choisi: "Pro - Annuel"
   - Ligne 2: Prix: "990€ HT par an"
   - Ligne 3: Prochaine facturation: "15 février 2026"
   - Séparateur
   - Texte: "Confirmé par email à [user@email.com]"

6. Suggestions (my-12):
   - Titre: "Vos nouvelles fonctionnalités déverrouillées:"
   - 3 suggestions adaptées au plan sélectionné:
     * "✨ Créer des devis illimités"
     * "🖊️ Utiliser les signatures électroniques"
     * "🤖 Générer des devis avec IA"
   - Format: texte simple + emoji, une par ligne

7. Boutons:
   - Principal: "Explorer mes nouvelles fonctionnalités" (bg-orange-500, w-full)
     Action: redirect vers `/devis` (ou dashboard principal)
   - Secondaire: "Voir mes paramètres d'abonnement" (outline)
     Action: redirect vers `/parametres/abonnement`

8. FAQ rapide (text-xs, text-center, mt-12, text-gray-600):
   - "Questions? Consultez notre aide ou contactez support@chantierpro.com"
```

### Composants à créer:
- `CheckoutPage.tsx` — page sélection plan + paiement
- `CheckoutSuccess.tsx` — page de confirmation
- `CheckoutForm.tsx` — formulaire avec Stripe.js
- `useStripeCheckout.ts` — hook gestion checkout

### Routes API à implémenter:
- `POST /api/stripe/create-checkout-session` — créer session Stripe
- `GET /api/stripe/checkout-session/:sessionId` — récupérer statut session
- `POST /api/webhooks/stripe` — webhook Stripe (cf. section 8)

---

## SECTION 7: EMAILS TRANSACTIONNELS

### 7.1 Configuration Resend ou SendGrid

Utiliser **Resend** (ou SendGrid) pour envoyer les emails.
Configuration: Variables d'environnement `VITE_RESEND_API_KEY` et `VITE_EMAIL_FROM`

### 7.2 Templates d'emails

Tous les templates doivent inclure:
- Logo ChantierPro (top)
- Signature avec lien support + logo réseaux sociaux (bottom)
- Couleur accent: orange (#F97316)

**1. Bienvenue (Inscription)**
```
Sujet: "Bienvenue sur ChantierPro !"
Trigger: Création compte utilisateur
Contenu:
- "Bienvenue, [Prénom]!"
- Texte: "Vous avez 14 jours d'essai gratuit. Pas de carte bancaire requise."
- Bouton: "Accéder à ChantierPro" (orange, lien vers app)
- Footer: "Besoin d'aide? Consultez notre guide de démarrage"
```

**2. Début d'essai**
```
Sujet: "Commencez votre essai gratuit"
Trigger: User accepte conditions de trial
Contenu:
- "Votre essai a commencé!"
- "Vous avez 14 jours pour explorer ChantierPro sans limites"
- 3 suggestions rapides:
  * "Créer votre première devis"
  * "Configurer votre profil"
  * "Inviter un collaborateur"
- Bouton: "Démarrer maintenant" (orange)
```

**3. J-3 avant fin essai**
```
Sujet: "Plus que 3 jours pour activer votre plan 👋"
Trigger: Cron job (trial_expiry_date - 3 days)
Contenu:
- "Vous avez 3 jours avant la fin de votre essai gratuit"
- Raison: "Choisissez maintenant un plan pour continuer sans interruption"
- Table récapitulatif des 3 plans (Artisan / Pro / Entreprise):
  * Colonne: Plan | Prix | CTA
- Bouton principal: "Activer mon plan" (orange)
- Lien: "Plus tard, j'en parlerai plus" (light)
```

**4. J-1 avant fin essai**
```
Sujet: "Dernier jour pour activer votre plan 🔴"
Trigger: Cron job (trial_expiry_date - 1 day)
Contenu:
- "Dernier jour d'essai gratuit!"
- "Dans 24h, vous serez basculé en plan Découverte gratuit (3 devis/mois)"
- Message doux: "Ne manquez pas l'occasion de profiter des fonctionnalités Premium"
- Tableau plans (same as J-3)
- Bouton: "Activer maintenant" (rouge/urgent)
```

**5. Essai terminé**
```
Sujet: "Votre essai gratuit est terminé"
Trigger: trial_expiry_date reached
Contenu:
- "Merci d'avoir testé ChantierPro!"
- "Votre essai gratuit est terminé et vous êtes maintenant en plan Découverte"
- Plan Découverte limites expliquées doucement
- "Pour continuer avec plus de fonctionnalités:"
- Tableau plans
- Bouton: "Passer à un plan payant" (orange)
- Alternative: "Rester en Découverte" (light)
```

**6. Confirmation paiement**
```
Sujet: "Paiement reçu ✓ — Bienvenue en plan Pro"
Trigger: Webhook Stripe (charge.succeeded)
Contenu:
- "Paiement confirmé!"
- Tableau:
  * Plan: Pro
  * Montant: 990€ HT
  * Prochaine facturation: [date]
  * Reçu/Facture: [lien vers PDF]
- "Accédez maintenant à:"
  * "✓ Devis illimités"
  * "✓ Signatures électroniques"
  * "✓ Analyse IA"
- Bouton: "Accéder à l'app" (orange)
- Message banal: "Besoin d'aide? Consultez notre documentation ou contactez support"
```

**7. Échec paiement (1ère relance)**
```
Sujet: "Paiement échoué — Action requise"
Trigger: Webhook Stripe (charge.failed)
Contenu:
- "Paiement échoué"
- "Nous n'avons pas pu traiter votre paiement pour le plan Pro (990€)"
- Conseils:
  * "Vérifiez votre carte bancaire"
  * "Essayez avec une autre carte"
  * "Contactez votre banque"
- Bouton: "Réessayer le paiement" (orange, lien checkout)
- Alternative: "Retourner en plan Découverte" (light)
- Footer important: "Votre accès sera limité jusqu'à confirmation du paiement"
```

**8. Changement de plan (upgrade)**
```
Sujet: "Plan mis à jour — Bienvenue en plan Pro!"
Trigger: Webhook Stripe (subscription_updated)
Contenu:
- "Bienvenue!"
- "Vous avez mis à jour votre plan: Artisan → Pro"
- Tableau:
  * Ancien plan: Artisan (29€/mois)
  * Nouveau plan: Pro (99€/mois)
  * Différence facturée: [amount] HT
  * Prochaine facturation: [date]
- Nouvelles fonctionnalités:
  * "✨ Vous pouvez maintenant créer des devis illimités"
  * "🤖 Utilisez l'analyse IA"
  * "📊 Exportez en FEC"
- Bouton: "Explorer le pro" (orange)
```

**9. Changement de plan (downgrade)**
```
Sujet: "Plan mis à jour — Retour en plan Artisan"
Trigger: Webhook Stripe (subscription_updated)
Contenu:
- "Mise à jour confirmée"
- "Vous avez changé de plan: Pro → Artisan"
- Tableau:
  * Ancien plan: Pro (99€/mois)
  * Nouveau plan: Artisan (29€/mois)
  * Crédit appliqué: [amount] HT
  * Prochaine facturation: [date]
- Message doux: "Vous gardez tous vos devis et vos clients. Certaines fonctionnalités seront limitées."
- Bouton: "Consulter les limites" (light)
```

**10. Annulation confirmée**
```
Sujet: "Abonnement annulé"
Trigger: Webhook Stripe (customer.subscription.deleted)
Contenu:
- "Abonnement annulé"
- "Vous êtes maintenant en plan Découverte gratuit"
- Tableau:
  * Plan précédent: Pro
  * Date d'annulation: [date]
  * Accès aux données: 30 jours en lecture seule
- Message: "Vous pouvez toujours voir et exporter vos devis, factures et clients"
- Bouton: "Revenir en plan payant" (orange)
- Alternative: "Rester en Découverte" (text-only)
- Footer: "Nous serions ravis de vous revoir. Besoin d'aide? Contactez nous"
```

### 7.3 Routes API à implémenter

- `POST /api/emails/send` — endpoint générique (avec auth API key)
- Helper functions dans `/api/emails/templates`:
  - `sendWelcomeEmail(userId, email, firstName)`
  - `sendTrialStartedEmail(userId, email, firstName)`
  - `sendTrialReminderEmail(userId, email, daysLeft)`
  - `sendPaymentConfirmationEmail(userId, email, planName, amount, invoiceUrl)`
  - Etc. pour chaque template

### 7.4 Webhooks Stripe

Mettre en place un endpoint `/api/webhooks/stripe`:
```javascript
POST /api/webhooks/stripe
Headers: stripe-signature validation

Events à traiter:
- checkout.session.completed → créer subscription, envoyer confirmation
- invoice.payment_succeeded → envoyer reçu
- invoice.payment_failed → envoyer alerte, relance
- customer.subscription.updated → déterminer upgrade/downgrade, envoyer email
- customer.subscription.deleted → envoyer annulation confirmée
```

---

## SECTION 8: DESIGN SYSTEM

### 8.1 Couleurs par plan

```css
/* Découverte */
--plan-discovery-bg: #F3F4F6;      /* gray-100 */
--plan-discovery-border: #D1D5DB;  /* gray-300 */
--plan-discovery-text: #6B7280;    /* gray-500 */
--plan-discovery-primary: #4B5563; /* gray-700 */

/* Artisan */
--plan-artisan-bg: #DBEAFE;        /* blue-100 */
--plan-artisan-border: #93C5FD;    /* blue-400 */
--plan-artisan-text: #1E40AF;      /* blue-800 */
--plan-artisan-primary: #3B82F6;   /* blue-500 */

/* Pro (couleur principale app) */
--plan-pro-bg: #FED7AA;            /* orange-200 */
--plan-pro-border: #FB923C;        /* orange-400 */
--plan-pro-text: #EA580C;          /* orange-700 */
--plan-pro-primary: #F97316;       /* orange-500 */

/* Entreprise */
--plan-enterprise-bg: #E9D5FF;     /* purple-100 */
--plan-enterprise-border: #D8B4FE; /* purple-300 */
--plan-enterprise-text: #6D28D9;   /* purple-800 */
--plan-enterprise-primary: #8B5CF6; /* purple-500 */
```

### 8.2 Badges plans

**Utilisation partout où un plan est affiché:**
- Sidebar user badge
- Header notifications
- Mon Abonnement page
- Factures liste
- Modal confirmation

```
Classes Tailwind:
- Découverte: badge-gray (bg-gray-100, text-gray-700, border-gray-300)
- Artisan: badge-blue (bg-blue-100, text-blue-700, border-blue-300)
- Pro: badge-orange (bg-orange-100, text-orange-700, border-orange-300)
- Entreprise: badge-purple (bg-purple-100, text-purple-700, border-purple-300)

Structure:
<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border">
  • {planName}
</span>
```

### 8.3 Composants réutilisables

**PriceDisplay.tsx:**
```typescript
<PriceDisplay
  amount={99}
  currency="EUR"
  billingPeriod="monthly" // "monthly" | "annual"
  discountPercentage={17} // optionnel
  showHT={true}
/>
// Rendu: "99€ HT par mois" ou "82,50€ HT/mois (facturé 990€ annuellement)"
```

**PlanBadge.tsx:**
```typescript
<PlanBadge plan="pro" size="md" />
// Rendu: Pill-shaped badge avec couleur du plan
```

**FeatureList.tsx:**
```typescript
<FeatureList
  features={[
    { name: "Devis illimités", included: true },
    { name: "Signatures", included: false },
  ]}
/>
// Rendu: Liste avec ✓/✗
```

**QuotaBadge.tsx:**
```typescript
<QuotaBadge used={8} total={10} />
// Rendu: "8/10" avec couleur adaptée (vert/orange/rouge)
```

---

## SECTION 9: STRUCTURE DE FICHIERS À CRÉER

### Pages
```
src/pages/
├── PricingPage.tsx                 # /tarifs
├── CheckoutPage.tsx                # /checkout
├── CheckoutSuccess.tsx             # /checkout/success
└── SubscriptionPage.tsx            # /parametres/abonnement
```

### Composants
```
src/components/
├── subscription/
│   ├── PricingCard.tsx             # Carte plan individuelle
│   ├── PricingToggle.tsx           # Toggle mensuel/annuel
│   ├── FAQSection.tsx              # Section FAQ
│   ├── TestimonialsSection.tsx     # Témoignages
│   ├── TrustedBySection.tsx        # Logos métiers
│   ├── UpgradeModal.tsx            # Modal upgrade/paywall
│   ├── PlanComparison.tsx          # Comparaison 2 plans
│   ├── FeatureLockIcon.tsx         # Cadenas cliquable
│   ├── FeatureUsageBadge.tsx       # Badge compteur
│   ├── LockedFeatureOverlay.tsx    # Overlay feature verrouillée
│   ├── LockedFeatureGate.tsx       # Wrapper contrôle accès
│   ├── TrialBanner.tsx             # Banner essai/downgrade
│   ├── PlanHeader.tsx              # En-tête plan Mon Abonnement
│   ├── UsageDashboard.tsx          # Barres de progression
│   ├── BillingHistory.tsx          # Historique factures
│   └── CancelSubscriptionModal.tsx # Modal annulation
├── pricing/
│   ├── PriceDisplay.tsx            # Affichage prix réutilisable
│   └── PlanBadge.tsx               # Badge plan réutilisable
└── ui/
    ├── FeatureList.tsx             # Liste features ✓/✗
    └── QuotaBadge.tsx              # Badge quota
```

### Stores Zustand
```
src/stores/
├── useSubscriptionStore.ts         # État abonnement global
└── usePricingStore.ts              # État pricing (toggle)
```

### Hooks personnalisés
```
src/hooks/
├── useTrialBannerLogic.ts          # Logique banner trial
├── useFeatureLock.ts               # Vérifier accès features
├── useUpgradeModal.ts              # Contrôler modal upgrade
└── useStripeCheckout.ts            # Gestion flux checkout
```

### Services API
```
src/services/
├── subscriptionService.ts          # Calls vers /api/subscription/*
├── stripeService.ts                # Calls vers /api/stripe/*
└── emailService.ts                 # Calls vers /api/emails/*
```

### Utilitaires
```
src/utils/
├── planComparison.ts               # Logique comparaison plans
├── featureAccess.ts                # Matrice feature/plan
├── billingCalculation.ts           # Calculs prix, prorations
└── formatters.ts                   # Format prix, dates
```

### Styles Tailwind (optionnel)
```
src/styles/
└── subscription.css                # Styles custom (animations, etc.)
```

### API Routes Backend (Node/Express/NextJS)
```
api/
├── stripe/
│   ├── create-checkout-session.ts  # POST créer session
│   └── checkout-session.ts         # GET statut session
├── subscription/
│   ├── current.ts                  # GET plan actuel + usage
│   ├── update-plan.ts              # POST changer plan
│   ├── cancel.ts                   # POST annuler
│   └── invoices.ts                 # GET historique factures
├── emails/
│   └── send.ts                     # POST envoyer email
└── webhooks/
    └── stripe.ts                   # POST traiter événements Stripe
```

### Configuration
```
env.example:
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:5000/api
VITE_RESEND_API_KEY=re_...
VITE_EMAIL_FROM=noreply@chantierpro.com

Backend env:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## NOTES DE DÉVELOPPEMENT

### Authentication & Authorization
- Pages publiques (/tarifs, /checkout): accessibles sans login
- /checkout/success: requiert authentication (sinon redirect login avec retour)
- /parametres/abonnement: requiert authentication

### State Management (Zustand)
Structures principales:

```typescript
// useSubscriptionStore
interface SubscriptionState {
  currentPlan: Plan;
  trialDaysRemaining: number;
  trialExpiresAt: Date;
  planFeatures: FeatureAccess[];
  usageQuotas: QuotaUsage[];
  showUpgradeModal: boolean;
  upgradeModalContext: string;

  setUpgradeModal(show: boolean, context?: string);
  canAccessFeature(featureName: string): boolean;
  isFeatureLocked(featureName: string): boolean;
  getQuotaUsage(feature: string): QuotaUsage;
}

// usePricingStore
interface PricingState {
  billingCycle: 'monthly' | 'annual';
  setBillingCycle(cycle);
}
```

### Intégration Stripe
- Utiliser @stripe/react-stripe-js pour formulaire
- Créer session checkout via backend, rediriger vers Stripe Hosted Checkout
- Webhooks pour synchroniser BDD après paiement
- Customer Portal pour Stripe Billing (manage payments link)

### Intégration Supabase
- Table `subscriptions`:
  ```sql
  id, user_id, plan_id, status, trial_ends_at, current_period_end,
  stripe_customer_id, stripe_subscription_id, created_at, updated_at
  ```
- Table `usage_logs`:
  ```sql
  id, user_id, feature_name, usage_date, amount, created_at
  ```
- RLS policies: User ne peut lire que ses propres abonnements

### Performance & Caching
- Pricing data (plans, features) → cache statique ou Redis (ttl: 24h)
- User subscription data → Zustand + SWR/React Query avec revalidation
- Stripe Customer Portal URLs → cache 24h

### Accessibilité (WCAG 2.1)
- Modals: focus management, Escape key close
- Comparaison plans: utiliser <table> sémantique ou ARIA roles
- Couleurs: ratio contrast 4.5:1 minimum
- Forms: labels associés, validation messages

### Tests
- Unit tests: Composants de pricing, logique calcul prix
- Integration tests: Flux checkout (mock Stripe)
- E2E tests: Parcours complet user trial → upgrade → annulation

### SEO
- Page /tarifs: meta title, description, structured data (Schema.org)
- Header h1: "Choisissez votre plan"
- Schema: FAQPage, PriceCard
```

---

## CRITÈRES D'ACCEPTATION

✅ Page tarifs responsive, design mise en avant plan Pro
✅ Modal upgrade contextuel avec messages adaptés
✅ Indicateurs cadenas sur features verrouillées
✅ Banners trial dynamiques avec couleurs selon jours restants
✅ Page Mon Abonnement avec usage dashboard et historique
✅ Checkout Stripe complet avec page de confirmation
✅ Tous les emails transactionnels envoyés au bon moment
✅ Zustand stores correctement synchronisés
✅ Routes API sécurisées et testées
✅ Design système appliqué partout
✅ Aucun bug d'affichage responsive
✅ Animations fluides (transitions, confetti)

---

## PROCHAINES ÉTAPES
- Prompt 4: Logique métier (limites, quotas, feature flags)
- Prompt 5: Analytics, support, optimisations
```

---

## Fichiers à créer — Résumé

### Frontend (React/Vite)
**Pages:** 4 fichiers
**Composants:** 20+ fichiers
**Stores:** 2 fichiers
**Hooks:** 4 fichiers
**Services:** 3 fichiers
**Utilitaires:** 4 fichiers

### Backend API
**Routes:** 9 endpoints
**Webhooks:** 1 endpoint Stripe
**Services Email:** 8 templates + système envoi

### Configuration
**Variables env:** 5-6 clés

---

