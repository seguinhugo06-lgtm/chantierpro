# Prompt pour Claude Code (Opus 4.7) — Refonte BatiGesti "Artisan Sharp"

> Colle ce prompt tel quel dans Claude Code à la racine du repo `/sessions/serene-blissful-mendel/mnt/chantierpro-app`. Le document `STRATEGIE-REPOSITIONNEMENT.md` (racine du repo) est la source de vérité stratégique et doit être lu en premier.

---

## RÔLE ET CONTEXTE

Tu es un senior full-stack engineer expert React/Vite/Tailwind/Supabase, spécialisé dans les refontes produit contrôlées sur SaaS en production payants. Tu vas exécuter une refonte majeure de BatiGesti (SaaS BTP, code dans ce repo) pour le recentrer sur le trio **devis → acompte → facture**, couper les features secondaires, refaire le menu/plans/pricing/landing, et préparer le produit à tourner en "app qui se gère toute seule" pour un fondateur solo.

**Avant toute action, lis intégralement et dans cet ordre :**

1. `STRATEGIE-REPOSITIONNEMENT.md` à la racine du repo — la stratégie complète. C'est la source de vérité. Toutes tes décisions doivent s'y référer.
2. `CLAUDE.md` à la racine — conventions projet (stack, architecture, dark mode, props, etc.).
3. `.claude/rules/*.md` — règles détaillées (code-style, supabase, components, subscriptions, testing, migrations, edge-functions).
4. Les derniers messages de commit `git log --oneline -30` pour comprendre la vélocité et les derniers changements.

Tu travailles en mode agentique long : c'est un chantier de plusieurs heures. Tu peux — et tu dois — découper, planifier, exécuter par phases, committer fréquemment, valider après chaque phase.

---

## CONTRAINTES CRITIQUES (ne jamais violer)

**Sécurité et continuité de service**

- L'app a des clients payants en production. Aucune migration destructive sur les tables utilisées en prod (clients, devis, factures, chantiers, organizations, subscriptions, users). Pour les tables à supprimer, utilise `DROP TABLE IF EXISTS` dans une migration numérotée, **et seulement pour les tables listées comme "à couper" dans la stratégie** (ci-dessous).
- Pour les colonnes inutilisées : ne les supprime pas dans cette PR. Ajoute-les à une liste `DEPRECATED_COLUMNS.md` à la racine pour un cleanup ultérieur. Suppression de colonnes = migration séparée, jamais dans cette PR.
- RLS (Row Level Security) : toute nouvelle table ou modif de table doit garder/ajouter le filtre `organization_id` + policies RLS. Zero exception.
- Plans Stripe : les plans existants (`gratuit`, `artisan`, `equipe`) ne sont pas renommés en DB pour ne pas casser les abonnements en cours. Les nouveaux plans (`solo`, `artisan`, `equipe`) sont introduits en **coexistence** avec les anciens via un mapping. Les utilisateurs sur `gratuit` restent sur `gratuit` tant qu'ils n'ont pas migré explicitement (voir section "Compatibilité Pricing" plus bas).

**Discipline de code**

- Build DOIT passer sans erreur : `npm run build`. Teste après chaque phase.
- Lint DOIT passer : `npm run lint`.
- Smoke tests : `npm run smoke` avant push final.
- `npm run check` (lint + build) obligatoire avant le dernier commit.
- Pre-push hook en place : respect des imports critiques, noms de tables, absence de secrets, build.
- Pas de dépendances ajoutées sans justification explicite. Préfère les libs déjà dans `package.json`.
- Pas de `console.log` résiduels ; erreurs captées via `captureException()` de `src/lib/sentry.js`.

**Conventions projet (rappel CLAUDE.md)**

- Pas de React Router : navigation via `setPage('nom')` dans `App.jsx`.
- Pas de classes Tailwind `dark:` : prop `isDark` + variables thème (`cardBg`, `inputBg`).
- Couleur accent via prop `couleur` (hex) en style inline.
- Icônes exclusivement `lucide-react`.
- DB mapping : `fromSupabase()` / `toSupabase()` dans `useSupabaseSync.js`.
- Edge Functions : toujours `corsHeaders` dans chaque réponse.
- Demo mode : `isDemo` → localStorage au lieu de Supabase (ne pas casser).
- Multi-tenant : `organization_id` partout + RLS.

---

## DÉCOUPAGE EN 6 PHASES AVEC CHECKPOINTS

Tu travailles en 6 phases. **Après chaque phase, tu commites, tu lances `npm run check`, et tu reportes un résumé avant de passer à la suivante.**

Branche dédiée : `git checkout -b refonte/artisan-sharp`

---

### PHASE 1 — Audit préalable et baseline (1-2h)

**Objectif** : cartographier le code exactement, établir une baseline mesurable, écrire la liste des fichiers à toucher.

1. Liste exhaustive des pages rendues dans `App.jsx` via `setPage`. Output : fichier `docs/pages-baseline.md` avec tableau {nom, fichier, plan mini requis, lignes de code, dernière modif}.
2. Liste des tables Supabase dans `supabase/migrations/*.sql`. Output : `docs/tables-baseline.md` {nom, RLS activé, colonnes sensibles, volume prod si connu}.
3. Liste des Edge Functions dans `supabase/functions/`. Output : `docs/edge-functions-baseline.md` {nom, trigger, intégrations externes utilisées}.
4. Liste des intégrations externes utilisées (Stripe, Yousign, SendGrid, Twilio, GoCardless, Anthropic, Google Reviews, Supabase Realtime). Output : dans `docs/integrations-baseline.md`.
5. Liste des hooks `use*` dans `src/hooks/`. Output : `docs/hooks-baseline.md`.
6. Mesure baseline : `npm run build` et note la taille du bundle principal (output size). Cible à la fin de la PR : **≥ 15% de réduction**.
7. Run `npm run lint` et `npm run smoke`. Note le nombre de warnings. Cible : ≤ baseline.

Commit : `chore(audit): baseline before sharp refactor`

---

### PHASE 2 — Coupes franches (features à retirer) (3-4h)

**Objectif** : retirer du produit toutes les features listées comme "à couper" dans la stratégie. Suppression douce des tables, retrait des routes, archive du code (ne supprime pas les fichiers, déplace-les dans `src/_archived/`).

**Modules à couper (liste exhaustive)** :

| Module | Stratégie | Notes |
|---|---|---|
| Geofencing GPS chantiers | Retirer du produit | Hooks `useGeofencing*`, composants GPS, colonnes `geofence_*` → colonnes laissées en DB (pas supprimées), hooks déplacés dans `_archived/` |
| Form builder custom | Retirer du produit | Page `FormulairesBuilder*`, tables `custom_forms*` → DROP TABLE IF EXISTS dans nouvelle migration |
| Contrats BTP modèles | Retirer du produit | Page `Contrats*`, table `contrats_modeles` → DROP |
| Carnet d'entretien 10 ans | Retirer du produit | Page `CarnetEntretien*`, table `carnet_entretien*` → DROP |
| Chat équipe temps réel | Retirer du produit | Page `Chat*`, tables `chat_messages*`, `chat_channels*` → DROP ; Supabase Realtime channel associé à retirer |
| Site vitrine client | Retirer du produit | Page `SiteVitrine*`, route publique associée, tables `site_vitrine*` → DROP |
| Avis Google sync | Retirer du produit | Page `AvisGoogle*`, Edge Function `sync-google-reviews`, intégration OAuth Google Reviews |
| Pipeline Kanban prospects | Retirer du produit | Page `PipelineKanban*` ou `Prospects*Kanban` ; données migrées vers statut simple sur clients ou devis |
| Commandes fournisseurs | Masquer (plan Équipe seul plus tard) | Ne pas supprimer la table ; retirer du menu Solo et Artisan, garder visible seulement si `plan === 'equipe'` |

**Procédure par module** :

1. Identifier les fichiers concernés via `grep` / `glob`.
2. Retirer les routes dans `App.jsx` (bloc de switch sur `page`).
3. Retirer les entrées de menu dans le composant de navigation (Sidebar/Nav).
4. Retirer les imports qui ne sont plus utilisés.
5. Retirer les hooks dédiés dans `src/hooks/` (déplacer dans `src/_archived/hooks/`).
6. Retirer les stores dédiés dans `src/stores/` (déplacer dans `_archived`).
7. Retirer les services dédiés dans `src/services/` (déplacer dans `_archived`).
8. Retirer l'Edge Function si elle n'a aucun autre consommateur : rendre `supabase/functions/<nom>/` inactive (renommer en `_archived_<nom>/`).
9. Rédiger une migration SQL numérotée (ex : `055_drop_archived_tables.sql`) qui contient tous les `DROP TABLE IF EXISTS` idempotents, avec commentaires explicatifs.
10. Vérifier qu'aucun import cassé ne subsiste : `npm run build` doit passer.
11. Grep final sur les noms de tables supprimées (`chat_messages`, `custom_forms`, etc.) : 0 occurrence dans le code actif.

**Cas particulier Realtime chat** : si le seul consommateur de Supabase Realtime était le chat, retire aussi la config Realtime. Sinon, garde.

**Cas particulier Twilio SMS** : laisse l'intégration Twilio mais ne l'expose que sur plans Artisan et Équipe (gate via `PAGE_FEATURE_MAP`).

**Cas particulier GoCardless** : laisse l'intégration, ne l'expose que sur plan Équipe.

Commit à la fin de la phase : `feat(cleanup): cut 9 modules hors du cœur devis-facture-acompte`

---

### PHASE 3 — Refonte du menu et du gating (2-3h)

**Objectif** : le plan Solo doit avoir un menu de 5 items maximum. Les autres plans voient plus.

**Menu Solo (5 items exactement)** :

1. Dashboard (pulse quotidienne)
2. Devis (et factures d'acompte et avoirs dans le même module, via onglets)
3. Factures (toutes les factures finalisées)
4. Clients
5. Paramètres

**Menu Artisan (ajoute à Solo)** : Planning simple, Catalogue, Équipe (pointage léger), Relances SMS.

**Menu Équipe (ajoute à Artisan)** : Trésorerie, Sous-traitants, Commandes fournisseurs, Analytique, Chantiers (avec Gantt, pointage équipe complet).

**Implémentation** :

1. Dans le composant de navigation principal, structure les items comme un array `MENU_ITEMS` typé :
   ```js
   const MENU_ITEMS = [
     { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, plans: ['solo', 'artisan', 'equipe', 'gratuit'] },
     { id: 'devis', label: 'Devis', icon: FileText, plans: [...] },
     // ...
   ]
   ```
2. Filtre `MENU_ITEMS.filter(i => i.plans.includes(userPlan))` au rendu.
3. Respecte la prop `isDark` et `couleur`.
4. Teste les 4 plans (gratuit, solo, artisan, equipe) en dev : `window.localStorage.setItem('demoPlan', 'solo')` et reload en mode démo.
5. Met à jour `PAGE_FEATURE_MAP` dans `App.jsx` pour coller à la nouvelle matrice :

| Page | Plan mini |
|---|---|
| dashboard | gratuit |
| devis | gratuit |
| factures | gratuit |
| clients | gratuit |
| settings | gratuit |
| signatures | solo |
| export_fec | solo |
| relances_auto | solo (email) / artisan (SMS) |
| ia_devis | gratuit (3/mois), solo (5/mois), artisan (20/mois), equipe (illimité) |
| catalogue | artisan |
| planning | artisan |
| equipe_pointage | artisan (3 users max) / equipe (illimité) |
| chantiers_gantt | equipe |
| tresorerie | equipe |
| sous_traitants | equipe |
| commandes_fournisseurs | equipe |
| analytique_premium | equipe |

6. Le gating déclenche l'affichage d'un modal "Upgrade" au clic sur une feature bloquée. Le modal reprend le pitch de la stratégie et renvoie vers `/pricing`.

Commit : `feat(menu): restructure navigation autour du trio devis-facture-acompte`

---

### PHASE 4 — Pricing, landing, onboarding (3-4h)

**Objectif** : mettre en ligne la nouvelle offre et la nouvelle landing conforme à la stratégie.

**4.1 — Plans DB et Stripe**

Créer une migration `056_new_plans_solo.sql` qui ajoute une ligne `solo` dans la table `plans` (ou équivalent) avec les caractéristiques suivantes, sans toucher aux autres lignes :

- id : `solo`
- prix_mensuel_ht : `24.00`
- prix_annuel_ht : `19.00` (par mois facturé annuellement, donc 228 €/an)
- limite_devis_mois : null (illimité)
- limite_clients : 20 (clients actifs, i.e. avec au moins un devis < 12 mois)
- limite_signature_mois : null (illimité)
- limite_ia_mois : 5
- limite_users : 1
- limite_storage_mo : 500
- features : `['email_relances', 'stripe_payment_link', 'factur_x_base', 'export_fec', 'templates_express_308']`

Mettre à jour `artisan` :
- prix_mensuel_ht : `39.00`, annuel : `34.00`
- limite_users : 3
- limite_ia_mois : 20
- features : tout Solo + `['sms_relances_100', 'planning_simple', 'catalogue', 'pointage_3_users', 'pipeline_kanban']`

Mettre à jour `equipe` :
- prix_mensuel_ht : `69.00`, annuel : `59.00`
- limite_users : 10
- features : tout Artisan + `['sms_illimites', 'tresorerie_12m', 'sous_traitants', 'commandes_fournisseurs', 'analytique_premium', 'gantt_complet']`

Mettre à jour Stripe côté Dashboard manuellement (tâche utilisateur, ne pas tenter via API sans clé). Créer un fichier `docs/STRIPE-TODO.md` qui liste précisément les produits et prix à créer/modifier côté Stripe (nom, montant, fréquence, price ID à récupérer et coller dans `.env`).

**4.2 — Transition du plan `gratuit` à l'essai 14 jours**

- Garder la valeur `gratuit` en DB pour les anciens comptes (compatibilité).
- Dans le signup flow, tout nouveau compte est créé en `plan: 'solo'` avec `trial_end: now() + 14 days`.
- Lors de l'expiration du trial sans paiement : downgrade automatique à `plan: 'gratuit'` avec ses limites historiques (5 devis/mois, 10 clients, 2 chantiers). Le gratuit devient un "free tier résiduel" pour ne pas perdre les comptes trial.
- Message d'onboarding qui explique : "14 jours d'essai sur le plan Solo. Sans CB. Après 14 jours, mode gratuit limité si pas de paiement."

**4.3 — Landing page refondue**

Fichier principal : `src/components/landing/LandingPage.jsx` et ses enfants.

Structure en 6 sections (exactement) :

1. **Hero** (`HeroSection.jsx`)
   - H1 : "Votre devis signé. Votre acompte encaissé. Avant le premier coup de marteau."
   - Sous-titre : "Le logiciel de devis-facture pour artisans qui veulent être payés en avance, pas en retard."
   - CTA principal : "Essai gratuit 14 jours — sans carte bancaire"
   - CTA secondaire : "Voir la démo en 90 secondes"
   - Visuel : mockup app avec devis → signature → lien Stripe → acompte reçu (carousel 4 étapes en autoplay)

2. **Les 3 promesses** (`PromessesSection.jsx` — créer ce composant)
   - 3 cartes : "Devis en 3 minutes" / "Acompte avant chantier" / "Zéro relance à faire"
   - Chaque carte : icône lucide-react + titre + 2 lignes de description + mini screenshot

3. **Démo moment de vérité** (`DemoGifSection.jsx` — créer)
   - Un gif/vidéo looping de 15s : création devis → envoi → signature → paiement → facture générée
   - Asset à placer dans `public/demo-pulse.gif` (placeholder pour l'instant : un SVG animé ou une capture statique avec annotation "gif à venir")

4. **Pour qui** (`PersonasSection.jsx`)
   - 3 personas : Pierre (plombier solo Bourges), Samira (peintre-décoratrice 2 ouvriers Lyon), Karim (maçonnerie 6 personnes Marseille)
   - Chaque persona : photo placeholder (avatar généré ou silhouette neutre), nom, métier, une phrase de gain ("BatiGesti m'a fait gagner 6 heures par semaine")
   - Note : pas de faux témoignages — mets un badge "exemples-types" et prévois un flag `REAL_TESTIMONIALS_AVAILABLE = false` dans la config pour swap plus tard

5. **Pricing** (`PricingSection.jsx`)
   - 3 colonnes : Solo / Artisan / Équipe
   - Prix TTC affichés en grand, HT en petit à côté (Solo 22,80 € TTC / 19 € HT en annuel)
   - Toggle "Mensuel / Annuel" (annuel remisé -20% environ)
   - Features listées : 5 max par plan, pas une liste infinie
   - Sous le tableau, comparatif ligne "BatiGesti vs Tolteck vs Obat" avec 4-5 lignes de vrais points différenciants (signature élec. incluse, acompte Stripe natif, relances auto, etc.)
   - CTA par plan : "Essayer Solo 14 jours" / "Essayer Artisan 14 jours" / "Parler à un humain"

6. **FAQ** (`FaqSection.jsx`)
   - 6 questions-clés, réponses de 2-3 lignes :
     - "Est-ce que Factur-X est inclus ?"
     - "Je peux importer mes clients depuis Excel/Tolteck/Obat ?"
     - "Si j'arrête, qu'est-ce qui arrive à mes données ?"
     - "Combien de temps pour tout configurer ?"
     - "Et si j'ai un bug un soir à 22h ?"
     - "Mon expert-comptable peut récupérer le FEC ?"
   - Composant accordéon simple, dark mode respecté

Retire les anciennes sections qui ne collent plus (ex : `FeatureShowcase.jsx` si redondant avec les 3 promesses — ou compacte-le pour ne garder que les 5 features clés).

**4.4 — Onboarding zero-touch**

Créer / refondre `src/components/onboarding/OnboardingWizard.jsx` (si déjà existant, simplifie ; sinon, crée).

4 étapes maximum, pas plus :

1. **SIRET** : champ unique, validation via API recherche-entreprises.api.gouv.fr (préremplit raison sociale, adresse, TVA). Fallback manuel si API HS.
2. **Métier** : sélecteur parmi 29 métiers (liste déjà présente dans les templates Express). Préselect basé sur le code NAF si récupéré du SIRET.
3. **Premier devis** : CTA "Créer mon premier devis maintenant" qui ouvre le wizard devis avec un template du métier choisi, pré-rempli avec "Client démo" et 2 lignes exemples. L'utilisateur modifie, envoie → on détecte qu'il a envoyé → coche l'étape.
4. **Stripe Connect** : bouton "Connecter pour recevoir mes acomptes" qui ouvre le flow Stripe Connect Express. Skip possible avec message "Vous pourrez connecter plus tard dans Paramètres".

Après les 4 étapes, écran de félicitations + lien vers la vidéo de 2 min (placeholder : `/onboarding-video.mp4`, à enregistrer plus tard).

E-mails transactionnels à ajouter / vérifier (via Edge Function `send-email` existante) :

- J+0 : bienvenue + lien vidéo 2 min
- J+2 sans premier devis créé : "Besoin d'aide pour votre premier devis ?" + Loom placeholder
- J+7 sans activité : "Une question ?"
- J+12 trial expire bientôt : "Plus que 2 jours. Souscrivez Solo à 19 €/mois"
- J+14 trial expiré : "Votre essai est fini. Vous êtes en mode gratuit limité. Upgrade à 19 €."

Commit : `feat(offer): new pricing Solo/Artisan/Equipe + landing refondue + onboarding zero-touch`

---

### PHASE 5 — Polissage du cœur (devis → acompte → facture) (4-6h)

**Objectif** : le flow critique doit être imbattable. Chaque seconde gagnée ici est un argument de vente.

**5.1 — Wizard devis ultra-rapide (3 écrans max)**

Écran 1 : choix du métier + choix du template.
- Grille de 308 templates groupés par métier.
- Barre de recherche en haut.
- Bouton "Créer sans template (vierge)".

Écran 2 : édition des lignes.
- Client (dropdown cherche + "créer client rapide" inline avec juste nom + email).
- Liste de lignes éditables (description, quantité, PU, TVA).
- Bouton "+ Ligne" et "Dupliquer la ligne précédente".
- Bloc acompte en bas, pas caché : case à cocher "Demander un acompte" + champ "% ou montant fixe" + date souhaitée.

Écran 3 : prévisualisation + envoi.
- Aperçu PDF embarqué.
- Options : "Envoyer par email" / "Envoyer par email + demander signature électronique" / "Télécharger PDF".
- Si acompte demandé : checkbox "Générer automatiquement la facture d'acompte avec lien de paiement Stripe à la signature du devis" (cochée par défaut).
- Bouton "Envoyer".

Chrono objectif : un artisan qui connaît son métier doit terminer un devis en **moins de 3 minutes** sur un template existant.

**5.2 — Flow signature + paiement en 1 bouton**

Quand le client clique sur le lien de signature Yousign :
1. Signe le devis.
2. Redirection vers lien Stripe de paiement de l'acompte (si acompte demandé).
3. Paiement effectué.
4. Webhook Stripe → marque la facture d'acompte comme payée + notifie l'artisan.
5. L'artisan reçoit un email + notification in-app : "✅ Devis signé et acompte de X€ reçu. Vous pouvez démarrer le chantier."

Edge Function `stripe-webhook` à adapter pour déclencher l'email + notif.
Edge Function `yousign-webhook` (si existe, sinon créer) à adapter pour générer le lien Stripe post-signature.

Si Yousign n'a pas de webhook configuré, poll manuel toutes les 5 min via un cron Edge Function. Privilégie webhook si possible.

**5.3 — Dashboard "Ma journée"**

Refondre la page dashboard (`src/components/Dashboard*.jsx`) pour afficher un seul écran :

- Titre : "Bonjour [Prénom]. Voici votre journée."
- 4 KPI en ligne : CA du mois / Devis à relancer / Factures impayées / Acomptes attendus cette semaine
- Section "À faire maintenant" (max 3 items) : devis en attente de signature depuis > 3 jours, factures impayées > 30j, acomptes non reçus dont la date est dépassée
- Section "Activité récente" (5 items max) : derniers événements (signature, paiement, devis envoyé)
- Section "Sparkline CA 12 mois" (existante, conserve)

Supprime les widgets secondaires (santé profil, stats avancées, KPI équipe...) du dashboard principal. Ces widgets vont sur des sous-pages dédiées accessibles via lien "Voir plus" ou dans Analytique (plan Équipe).

**5.4 — Relances auto : dashboard dédié**

Page `Relances` accessible depuis Paramètres (pas menu principal — car "0 à faire" est l'état normal).

Affiche :
- "Aujourd'hui, rien à faire. Tout tourne." (si 0 relance)
- Sinon : liste des devis/factures avec statut de relance (J+7 email envoyé, J+15 programmée, etc.)
- Templates d'email/SMS éditables
- Toggle ON/OFF des relances auto par devis/facture
- Stats : taux de paiement après relance 1 vs 2 vs 3

**5.5 — SEO long-tail : 29 pages métier**

Créer `src/components/landing/MetierPage.jsx` : un composant générique qui prend un slug métier en paramètre.

Lister les 29 métiers dans `src/config/metiers.js` :
```js
export const METIERS = [
  { slug: 'plombier', nom: 'plombier', titre: 'Logiciel de devis-facture pour plombier', ... },
  { slug: 'electricien', nom: 'électricien', ... },
  // 29 entrées
];
```

Chaque page : H1 spécifique, 3 promesses (les mêmes avec le nom du métier), screenshot d'un template du métier, CTA essai gratuit, lien de téléchargement d'un modèle de devis vierge (PDF/Word généré depuis le template Express).

Ajouter un `sitemap.xml` généré au build qui liste toutes ces pages + la landing + pricing + FAQ.

Ajouter meta OpenGraph/Twitter cards sur chaque page.

Commit : `feat(core): polish devis-acompte-facture flow + dashboard pulse + SEO metiers`

---

### PHASE 6 — Garde-fous, docs, PR (1-2h)

**Objectif** : merger proprement.

1. Exécute `npm run check` et `npm run smoke`. Résous les erreurs restantes.
2. Mesure finale : taille du bundle principal, nb de pages, nb de composants actifs (hors `_archived/`), nb de tables actives. Compare à la baseline. Note tout dans `docs/refonte-metrics.md`.
3. Mets à jour `CLAUDE.md` si des conventions ont changé.
4. Écris un `CHANGELOG-REFONTE.md` (racine) qui résume, pour un humain, toutes les coupes, les ajouts, les migrations DB, les points d'attention pour le déploiement.
5. Mets à jour le fichier `docs/STRIPE-TODO.md` avec les actions manuelles restantes côté dashboard Stripe.
6. Mets à jour `DEPRECATED_COLUMNS.md` avec la liste des colonnes à supprimer dans une PR ultérieure.
7. Mets à jour `.env.example` si des variables sont devenues obsolètes.
8. Crée la PR avec le template suivant :

```markdown
# Refonte "Artisan Sharp"

## Objectif
Recentrer BatiGesti sur le trio devis → acompte → facture. Couper 9 modules secondaires, refaire menu/plans/pricing/landing, préparer l'app à tourner en autonomie.

## Ce qui change
- 9 modules coupés (voir CHANGELOG-REFONTE.md)
- Menu Solo : 5 items
- 3 plans : Solo 19€ / Artisan 34€ / Équipe 59€ HT annuel
- Landing refondue (6 sections)
- Onboarding 4 étapes
- Flow signature + paiement acompte en 1 bouton
- 29 pages SEO métier

## Métriques
- Bundle : -X% (baseline → final)
- Pages actives : 40 → Y
- Tables actives : 43 → Z
- Edge Functions : 11 → W

## Actions manuelles post-merge
1. Voir docs/STRIPE-TODO.md (créer les nouveaux price IDs côté Stripe)
2. Enregistrer la vidéo d'onboarding 2 minutes
3. Remplacer les personas types par de vrais témoignages quand dispos (flag REAL_TESTIMONIALS_AVAILABLE)
4. Capturer le gif de démo (15s) et remplacer le placeholder
5. Migrer les clients actuellement sur plan gratuit vers l'info "essai 14j Solo" (campagne email)

## Risques
- Les clients actuellement sur plan gratuit voient leur UX changer : prévoir une comm proactive
- Table DROP : sauvegarde DB complète avant run de la migration 055
- Les utilisateurs Yousign en cours de signature au moment du déploiement : laisser le webhook ancien actif 24h le temps qu'ils finissent

## Test plan
- [ ] Build passe
- [ ] Lint passe
- [ ] Smoke tests passent
- [ ] Test E2E : inscription → onboarding 4 étapes → premier devis → signature → paiement acompte → facture auto
- [ ] Test des 3 plans (solo, artisan, equipe) en démo
- [ ] Test mobile (responsive landing + wizard devis)
- [ ] Test dark mode sur toutes les nouvelles pages
- [ ] Test migration DB sur base de dev (rollback testé)
```

9. Ouvre la PR via `gh pr create` (après autorisation utilisateur).
10. Reporte dans la PR les checkpoints exécutés (phases 1-6) et ce qui reste à faire manuellement.

**Dernier commit** : `chore(refonte): docs + changelog + PR`

---

## RAPPELS FINAUX

- Tu es autonome mais tu commites fréquemment (au moins 1 commit par phase, idéalement plus).
- Si tu rencontres une ambiguïté non résolue par la stratégie, choisis l'option qui **simplifie le produit** et documente ton choix dans `CHANGELOG-REFONTE.md`.
- Si une feature à couper a des dépendances inattendues (ex : la trésorerie utilise des données du chat — improbable mais possible), privilégie "masquer derrière un flag" plutôt que "supprimer cash", et documente.
- En cas de doute sérieux sur la sécurité ou la rétro-compatibilité, **arrête la phase, résume le risque, propose 2-3 options, attends la décision**.
- Tu n'implémentes pas de fonctionnalités qui ne sont pas dans ce prompt. Pas de scope creep.
- Le style du code suit scrupuleusement `CLAUDE.md` et `.claude/rules/`.
- Tu es un senior engineer : tu refuses les hacks, tu écris du code qu'un autre senior relit sans soupirer.

**Commence par lire `STRATEGIE-REPOSITIONNEMENT.md`, `CLAUDE.md`, `.claude/rules/*.md`. Puis fais ton audit préalable (phase 1) et reporte un plan d'exécution détaillé avant d'attaquer la phase 2.**
