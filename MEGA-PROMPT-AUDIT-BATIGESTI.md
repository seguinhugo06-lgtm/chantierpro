# MEGA-PROMPT : Audit & Optimisation Complète de BatiGesti

> **Objectif** : Rendre BatiGesti compétitif face à Obat, Batappli, EBP Bâtiment et les leaders du marché BTP SaaS français. Ce prompt est structuré en phases pour Claude Code.

---

## PHASE 0 — CONTEXTE À DEMANDER À CLAUDE CODE AVANT DE DÉMARRER

Avant de lancer l'audit, demande à Claude Code de te fournir ces éléments pour comprendre l'app en profondeur :

```
Présente-moi l'architecture complète de BatiGesti :

1. **Structure fichiers** : `find src/ -name "*.jsx" -o -name "*.js" | head -80` + `ls supabase/migrations/` + `ls supabase/functions/`
2. **Navigation** : Dans App.jsx, montre-moi toutes les pages (setPage) et le mapping complet des routes
3. **Composant Landing** : Montre-moi le code complet du composant LandingPage (ou équivalent marketing)
4. **Système de plans** : Montre subscriptionStore.js — les limites par plan, le feature gating
5. **DataContext** : Montre le DataContext.jsx complet — comment sont gérés les CRUD et le mode demo
6. **Dark mode** : Comment isDark est propagé dans les composants ? Montre un exemple de composant bien fait vs un problématique
7. **PDF Generation** : Montre devisHtmlBuilder.js et pdfHtmlBuilder.js — comment sont générés les PDF de devis/factures
8. **Edge Functions** : Montre le code de devis-ia/index.ts et stripe-webhook/index.ts
9. **Dernières migrations SQL** : Montre les 5 dernières migrations dans supabase/migrations/
10. **Smoke tests** : Montre le contenu des smoke tests (npm run smoke)
```

---

## PHASE 1 — BUGS CRITIQUES SITE MARKETING (Landing Page)

### 1.1 Screenshot hero montre une page d'erreur
**Problème** : Dans la section "Devis & Factures professionnels", le screenshot de l'app montre littéralement la page d'erreur "Oups, quelque chose s'est mal passé" avec les boutons Réessayer/Recharger/Accueil. C'est DÉVASTATEUR pour la conversion.

```
Dans le composant LandingPage (ou le composant qui gère la page marketing) :
1. Identifie tous les screenshots/images utilisés pour illustrer les features
2. Remplace le screenshot de la section "Devis & Factures" par un screenshot propre montrant la page Devis avec des données de demo
3. Vérifie que TOUS les autres screenshots sont à jour et ne montrent pas d'erreurs
4. Si les screenshots sont des images statiques dans /public, régénère-les depuis le mode demo
```

### 1.2 Texte hero quasi-invisible (contraste catastrophique)
**Problème** : Le titre principal et le sous-titre sont en gris très clair sur fond blanc — presque illisibles. Le H1 "BatiGesti" et le texte "L'outil tout-en-un conçu par et pour les artisans du bâtiment" sont à peine visibles.

```
Dans le hero de la landing page :
1. Le titre H1 doit être en text-gray-900 (pas text-gray-300 ou opacity réduite)
2. Le sous-titre doit être en text-gray-600 minimum
3. Les boutons CTA doivent avoir un contraste WCAG AA minimum (4.5:1)
4. Applique la même correction aux sections "Tout ce dont un artisan a besoin" et "Et bien plus encore..." qui sont aussi trop pâles
```

### 1.3 Énormes espaces blancs entre les sections
**Problème** : Il y a des zones de 100vh+ complètement vides entre les sections de la landing page (entre les features et le pricing, entre les screenshots). Probablement des animations/transitions qui ne se déclenchent pas ou des composants qui ne rendent pas.

```
1. Identifie les sections avec des espaces vides massifs (probablement des composants lazy-loaded ou des animations intersection-observer qui ne triggèrent pas)
2. Vérifie que les animations d'apparition (fadeIn, slideUp etc.) ne laissent pas les éléments en opacity:0 si l'IntersectionObserver ne fonctionne pas
3. Ajoute un fallback : si les animations ne se déclenchent pas dans les 2s, force l'affichage
4. Réduis les paddings/margins excessifs entre sections (max py-20, pas py-40+)
```

### 1.4 Cartes de pricing invisibles/vides
**Problème** : La section Tarifs montre le titre "Des prix simples, sans surprise" et le toggle Mensuel/Annuel, mais les 3 cartes de prix sont des rectangles vides — aucun contenu visible.

```
1. Vérifie le rendu des PricingCards dans la landing page
2. Le texte des prix, noms de plans et features est probablement en couleur trop claire ou en opacity:0
3. Assure-toi que les données des plans (Gratuit/Artisan/Équipe) sont bien passées aux composants
4. Vérifie que le toggle Mensuel/Annuel met à jour correctement les prix affichés
```

### 1.5 Image hero cassée/placeholder
**Problème** : La zone droite du hero (censée montrer un mockup de l'app) affiche des formes floues/pastel qui ressemblent à des placeholders non remplacés.

```
1. Remplace le placeholder par un vrai mockup de l'app (screenshot du dashboard en mode demo)
2. Utilise un cadre device (laptop ou mobile mockup) pour un rendu pro
3. Ou crée un composant animé montrant les KPIs clés de l'app
```

---

## PHASE 2 — BUGS & UX ISSUES DANS L'APPLICATION

### 2.1 Dark mode — Incohérences visuelles
**Problème** : En dark mode, les cartes "Devis IA" et "Devis Express" sur le dashboard restent en orange vif sans adaptation. Le fond des cards KPI "À encaisser" / "Ce mois" ne s'adapte pas bien. Certains textes deviennent illisibles.

```
Audit complet du dark mode :
1. Parcours TOUS les composants dans src/components/
2. Pour chaque composant, vérifie que les backgrounds utilisent bien les variables isDark (cardBg, inputBg etc.) et pas des couleurs hardcodées
3. Les cartes gradient orange du dashboard doivent avoir une variante dark (orange plus sombre ou outline)
4. Vérifie les contrastes de texte sur fond sombre — minimum 4.5:1
5. Les badges/tags (Urgent, Envoyé, Brouillon etc.) doivent rester lisibles en dark mode
6. Les graphiques/charts doivent adapter leurs couleurs d'axes et légendes
```

### 2.2 Planning — Chantiers affichés même les weekends
**Problème** : Les chantiers "Extension maison Petit", "Rénovation appartement Dubois", "Ravalement façade Lambert" s'affichent TOUS LES JOURS y compris samedi et dimanche. Un artisan ne travaille pas le dimanche — c'est irréaliste et pollue le calendrier.

```
1. Dans le composant Planning.jsx, ajoute un filtrage jour ouvré pour les événements chantier
2. Les chantiers ne doivent s'afficher que du lundi au samedi par défaut (configurable dans Paramètres)
3. Ajoute un toggle "Afficher weekends" dans les filtres du planning
4. Permets de configurer les jours ouvrés par défaut dans Paramètres > Mon entreprise
```

### 2.3 Dashboard "Ce mois" — Toujours à 0€
**Problème** : La card "Ce mois" sur le dashboard affiche toujours "0€ — Pas de données" même avec des données demo existantes (devis signés, factures payées). C'est un mauvais signal pour un utilisateur qui découvre l'app.

```
1. Vérifie le calcul du CA mensuel dans le Dashboard
2. En mode demo, les données doivent inclure des paiements du mois en cours
3. Si aucune donnée du mois en cours n'existe, affiche les données du dernier mois avec une mention "Mois précédent"
4. Ne jamais afficher 0€ si des transactions existent dans les 30 derniers jours
```

### 2.4 Paramètres — Badge "10" notification permanent
**Problème** : Le menu "Paramètres" dans la sidebar affiche un badge rouge "10" permanent, qui ne s'efface jamais. C'est anxiogène et perd de son impact.

```
1. Le badge 10 correspond probablement au score de complétion du profil (7% complété = 10 items manquants)
2. Le badge doit se réduire quand l'utilisateur complète des champs
3. Utilise un badge orange/gris au lieu de rouge (moins anxiogène)
4. Ajoute un tooltip expliquant "10 informations à compléter"
```

### 2.5 Profil entreprise à 7% — Mauvaise première impression
**Problème** : En mode demo, le profil est à 7% de complétion avec l'avertissement "Profil incomplet — SIRET, Adresse, Forme juridique, Assurance décennale". Pour un utilisateur qui teste, ça donne l'impression d'une app non terminée.

```
1. En mode demo, pré-remplis le profil entreprise avec des données réalistes :
   - Nom: "BTP Rénovation Pro" (ou nom configurable)
   - SIRET: "123 456 789 00012"
   - Adresse complète
   - RC Pro et Décennale avec dates valides
   - Logo placeholder
2. Le profil demo doit être à 80%+ de complétion
3. Garde 2-3 champs vides pour montrer la fonctionnalité de complétion guidée
```

### 2.6 Messagerie vide en mode demo
**Problème** : La page Messagerie affiche "Aucun canal" — c'est une page morte qui ne démontre rien.

```
1. En mode demo, crée 2-3 canaux pré-remplis :
   - "#général" avec quelques messages d'équipe
   - "#chantier-lambert" lié au chantier en cours
   - Un DM avec un client
2. Ou masque la Messagerie dans le plan Gratuit (c'est une feature Équipe)
```

### 2.7 Devis en retard irréaliste (+56 jours)
**Problème** : Les données demo montrent "Marc Lefevre DEV-2026-00005 — Sans réponse depuis 56j". C'est irréaliste — un artisan ne laisse pas un devis sans réponse 56 jours.

```
1. Recalcule les dates des données demo par rapport à la date du jour
2. Les devis "en attente" doivent avoir 3-15 jours max
3. Les "urgents" 15-30 jours
4. Seul 1 devis "critique" à 30+ jours pour montrer la fonctionnalité de relance
```

---

## PHASE 3 — FEATURES MANQUANTES VS CONCURRENCE

### 3.1 Mentions légales BTP automatiques (Obat a ça)
```
Obat inclut automatiquement 19 mentions légales obligatoires sur chaque devis/facture BTP.
BatiGesti doit faire pareil :

1. Dans devisHtmlBuilder.js, ajoute un bloc "Mentions légales" au bas de chaque devis/facture PDF
2. Inclus automatiquement :
   - Assurance décennale (numéro + assureur) depuis les Paramètres
   - RC Pro (numéro + assureur)
   - Mention RGE si applicable
   - TVA réduite 5.5%/10% quand applicable (logement > 2 ans)
   - Délai de rétractation 14 jours
   - Pénalités de retard
   - Garantie de parfait achèvement
   - Mention SIRET, RCS, capital
3. Rends ces mentions configurables dans Paramètres > Documents > Mentions légales
4. Ajoute un assistant qui pré-remplit basé sur le type de travaux
```

### 3.2 Attestation TVA réduite (EBP a ça)
```
EBP Bâtiment génère automatiquement les attestations de TVA réduite (cerfa 13947 et 13948).
Implémente :

1. Quand un devis concerne un logement de plus de 2 ans
2. Propose automatiquement de générer l'attestation TVA (simplifiée ou normale)
3. Pré-remplit avec les données client et chantier
4. Génère un PDF conforme au cerfa
5. Lie l'attestation au devis correspondant
```

### 3.3 Facturation de situation / avancement (Batappli killer feature)
```
La facturation par situation est ESSENTIELLE en BTP (gros chantiers).
BatiGesti a des traces dans le code (situationUtils.js) mais ce n'est pas mis en avant.

1. Vérifie que la facturation de situation fonctionne correctement :
   - Création d'une situation à partir d'un devis accepté
   - Pourcentage d'avancement par ligne
   - Calcul automatique des montants HT/TVA/TTC cumulés et du reste à facturer
   - Génération PDF avec tableau récapitulatif des situations précédentes
2. Ajoute un bouton "Créer situation" bien visible sur les devis acceptés
3. Ajoute un dashboard de suivi d'avancement par chantier (% facturé vs budget)
4. Montre visuellement la progression (barre de progression sur la fiche chantier)
```

### 3.4 Intégration bibliothèque de prix BatiChiffrage
```
Obat, Médiabat et EBP intègrent BatiChiffrage (2000+ ouvrages chiffrés).
C'est un standard du marché — les artisans s'attendent à l'avoir.

1. Ajoute un bouton "Référentiel BTP" dans le Catalogue (il existe déjà dans l'UI mais vérifier qu'il fonctionne)
2. Si pas d'intégration BatiChiffrage : crée une bibliothèque interne avec les prix moyens par région
3. Permets d'importer des bibliothèques tierces (format CSV/Excel standard)
4. Lie les articles du référentiel au catalogue personnel de l'utilisateur
```

### 3.5 Rapprochement bancaire avancé
```
BatiGesti a un module Banque dans Finances mais les concurrents premium (EBP, Axonaut) vont plus loin :

1. Matching automatique : quand un virement arrive, propose le devis/facture correspondant
2. Détection intelligente des paiements partiels
3. Vue rapprochement : factures d'un côté, mouvements bancaires de l'autre, avec drag & drop
4. Export comptable FEC amélioré avec numéros de compte TVA
5. Intégration comptable : export vers Sage, QuickBooks, ou via API
```

### 3.6 Attestations et documents réglementaires
```
Les artisans BTP ont besoin de générer régulièrement :
1. Attestation de TVA réduite (5.5% et 10%)
2. PV de réception de chantier
3. Mise en demeure (le code existe dans miseEnDemeureBuilder.js — vérifier que c'est accessible)
4. PPSPS simplifié (Plan de sécurité)
5. Attestation de travaux pour l'assurance
6. Bon de commande fournisseur

Vérifie que ces documents sont accessibles et fonctionnels, sinon implémente-les.
```

### 3.7 Portail client
```
Le code mentionne "portal_client" en DB mais ce n'est pas visible dans l'app.
Les clients devraient pouvoir :

1. Voir et signer leur devis en ligne (lien unique)
2. Suivre l'avancement de leur chantier (photos, étapes)
3. Voir leurs factures et payer en ligne
4. Communiquer via un chat dédié
5. Télécharger leurs documents (attestations, PV)
```

### 3.8 Gestion des congés et absences
```
ProGBat gère les congés et BatiGesti non.
Pour le plan Équipe :

1. Calendrier des absences par employé
2. Types : congés payés, RTT, maladie, formation
3. Workflow de demande/validation
4. Impact automatique sur le planning chantier
5. Compteur de jours restants
```

---

## PHASE 4 — OPTIMISATIONS UX/UI

### 4.1 Onboarding guidé premier lancement
```
Actuellement, un nouvel utilisateur arrive sur un dashboard vide avec un profil à 7%.
Implémente un onboarding en 5 étapes :

1. "Bienvenue ! Configurons votre entreprise" → Formulaire simplifié (nom, métier, SIRET)
2. "Ajoutez votre premier client" → Quick add avec juste nom + téléphone
3. "Créez votre premier devis" → Wizard guidé avec le Devis Express
4. "Personnalisez votre catalogue" → Import ou sélection de templates par métier
5. "Invitez votre équipe" (si plan Équipe)

Chaque étape doit être skippable. Progress bar visible. Félicitations à la fin.
```

### 4.2 Empty states plus engageants
```
Les pages vides (Messagerie, Avis Google, etc.) montrent juste une icône et "Aucun X".
Remplace par des empty states engageants :

1. Illustration/lottie animation pertinente par page
2. Texte explicatif de la valeur de la feature
3. CTA principal pour créer le premier élément
4. Lien vers un tutoriel/aide si disponible
```

### 4.3 Données demo plus réalistes
```
Les données demo actuelles ont des incohérences (dates, montants, statuts).
Refonte complète :

1. Crée un scénario cohérent : "BTP Rénovation Pro" — entreprise de 4 personnes à Montpellier
2. 3 chantiers actifs réalistes avec des budgets BTP corrects (10k-50k€)
3. 2 prospects avec devis en attente
4. 2 chantiers terminés avec factures payées
5. Historique de CA réaliste sur 6 mois (croissance progressive)
6. Équipe : 1 chef, 2 ouvriers, 1 apprenti avec taux horaires réalistes
7. Catalogue : 20 articles typiques du corps de métier
8. Dates relatives à aujourd'hui (pas de dates fixes qui deviennent obsolètes)
```

### 4.4 Performance et loading states
```
1. Ajoute des skeletons/loading states sur toutes les pages pendant le chargement
2. Lazy-load les pages rarement visitées (Finances, Catalogue, Avis Google)
3. Précharge les pages les plus visitées (Dashboard, Devis, Chantiers)
4. Optimise les re-renders : mémoize les composants lourds (Planning, Analytics)
5. Mesure les Core Web Vitals et optimise LCP < 2.5s
```

---

## PHASE 5 — SEO & MARKETING SITE

### 5.1 SEO Technique
```
1. Vérifie que la landing page a :
   - <title> optimisé : "BatiGesti — Logiciel devis factures chantiers BTP | Gratuit"
   - <meta description> : "Créez vos devis en 2 minutes avec l'IA vocale. Suivi chantiers, facturation, trésorerie. Gratuit pour les artisans du bâtiment."
   - Open Graph tags pour le partage social
   - Schema.org structured data (SoftwareApplication)
   - Sitemap.xml
   - robots.txt
2. Chaque section de la landing doit avoir des balises sémantiques (h1, h2, h3)
3. Les images doivent avoir des alt-text descriptifs
4. Ajoute un blog (/blog) avec du contenu SEO : "Comment faire un devis BTP conforme", "Facturation électronique 2026 pour artisans", etc.
```

### 5.2 Conversion de la landing page
```
1. Ajoute une vidéo de démo de 60s en hero (ou GIF animé de l'app en action)
2. Ajoute un chat en direct / widget de contact
3. Ajoute des badges de confiance : "Conforme Factur-X 2026", "Données hébergées en France", "Support réactif"
4. Ajoute un compteur social proof animé (pas juste des stats statiques)
5. Simplifie le CTA : au lieu de "Essayer gratuitement", utilise "Créer mon premier devis gratuit"
6. Ajoute un bandeau de logos de certifications/partenaires
```

---

## PHASE 6 — QUALITÉ & TESTS

### 6.1 Audit qualité complet
```
npm run check  # Vérifie lint + build
npm run smoke  # Smoke tests

Puis :
1. Corrige TOUS les warnings ESLint restants
2. Vérifie que le build production passe sans erreurs
3. Ajoute des tests pour les calculs critiques :
   - Calcul TVA (5.5%, 10%, 20%)
   - Calcul TTC avec remise et acompte
   - Marge chantier (budget prévu vs dépenses réelles)
   - Conversion devis → facture → avoir
4. Teste le mode demo end-to-end : chaque page doit fonctionner sans Supabase
5. Vérifie que les Edge Functions ont des error handlers appropriés
```

### 6.2 Accessibilité
```
1. Audit WCAG AA : contraste texte, focus visible, navigation clavier
2. Ajoute aria-labels sur tous les boutons icônes
3. Vérifie que les modales sont accessibles (focus trap, escape pour fermer)
4. Les formulaires doivent avoir des labels associés
5. Le planning calendrier doit être navigable au clavier
```

---

## ORDRE DE PRIORITÉ RECOMMANDÉ

| Priorité | Action | Impact | Effort |
|----------|--------|--------|--------|
| P0 🔴 | Fix screenshots marketing (page d'erreur) | Conversion | 1h |
| P0 🔴 | Fix contraste texte landing page | Conversion | 30min |
| P0 🔴 | Fix espaces blancs landing page | Conversion | 1h |
| P0 🔴 | Fix cartes pricing invisibles | Conversion | 30min |
| P1 🟠 | Données demo réalistes + dates relatives | Rétention | 4h |
| P1 🟠 | Mentions légales BTP auto sur devis | Compliance | 3h |
| P1 🟠 | Onboarding guidé | Rétention | 4h |
| P1 🟠 | Fix "Ce mois 0€" dashboard | Crédibilité | 1h |
| P1 🟠 | Fix planning weekends | UX | 1h |
| P2 🟡 | Facturation de situation | Compétitivité | 8h |
| P2 🟡 | Attestations TVA réduite | Compliance | 4h |
| P2 🟡 | Portail client | Différenciation | 12h |
| P2 🟡 | Dark mode audit complet | Qualité | 4h |
| P2 🟡 | Empty states engageants | UX | 3h |
| P3 🔵 | SEO technique landing | Acquisition | 3h |
| P3 🔵 | Intégration bibliothèque prix | Compétitivité | 8h |
| P3 🔵 | Gestion congés | Feature | 6h |
| P3 🔵 | Rapprochement bancaire avancé | Feature | 8h |
| P3 🔵 | Blog SEO | Acquisition | Ongoing |

---

## COMMENT UTILISER CE PROMPT

Copie chaque **PHASE** individuellement dans Claude Code en commençant par la Phase 0 (contexte), puis Phase 1 (bugs critiques marketing), etc.

Pour chaque bloc de code, Claude Code doit :
1. Identifier le(s) fichier(s) concerné(s)
2. Montrer le code actuel
3. Proposer la correction
4. Appliquer et vérifier avec `npm run check`

**Commence toujours par `npm run check` pour vérifier l'état actuel du build avant toute modification.**
