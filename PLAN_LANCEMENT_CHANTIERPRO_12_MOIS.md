# CHANTIERPRO - Plan de Lancement Stratégique

## Roadmap 12 Mois | Février 2026

**Hugo Seguin | Solo Founder**

---

## Table des Matières

1. [Executive Summary](#1-executive-summary)
2. [Stratégie de Pricing Intelligente](#2-stratégie-de-pricing-intelligente)
3. [Workflow Développement (Staging/Prod)](#3-workflow-développement)
4. [Gestion des Retours Clients](#4-gestion-des-retours-clients)
5. [Landing Page Strategy](#5-landing-page-strategy)
6. [Plan Marketing Low-Budget (100€/mois)](#6-plan-marketing-low-budget)
7. [Roadmap Mensuelle Détaillée (12 mois)](#7-roadmap-mensuelle-détaillée)
8. [KPIs et Métriques de Succès](#8-kpis-et-métriques-de-succès)
9. [Checklists et Templates](#9-checklists-et-templates)
10. [Ressources et Outils Recommandés](#10-ressources-et-outils-recommandés)

---

# 1. Executive Summary

## Contexte

ChantierPro est une application SaaS de gestion complète pour les professionnels du BTP : artisans, entreprises de construction, plombiers, électriciens, maçons. L'application est presque prête au lancement avec un MVP fonctionnel.

## Situation Actuelle

- **App quasi-finalisée** : React + Vite + Supabase + Stripe
- **Fonctionnalités** : Devis, Factures, Chantiers, Planning, Équipe, Stocks, CRM
- **PWA ready** : installable sur mobile
- **Budget marketing** : ~100€/mois
- **Équipe** : Solo founder

## Objectifs à 12 Mois

| Métrique | Objectif |
|----------|----------|
| **MRR (Mois 12)** | 3 000€ - 5 000€ |
| **Utilisateurs actifs** | 500+ comptes créés, 150+ payants |
| **Churn mensuel** | < 5% |
| **NPS** | > 40 (excellent) |

---

# 2. Stratégie de Pricing Intelligente

Le modèle freemium par features est idéal pour le BTP : les artisans veulent tester avant de payer, mais ont besoin de fonctionnalités avancées une fois convaincus.

## 2.1 Architecture des Plans

### 🆓 Plan GRATUIT - "Artisan Débutant"

**Objectif :** Acquisition et onboarding. Permettre de créer ses premiers devis rapidement.

| Fonctionnalité | Limite |
|----------------|--------|
| Devis/mois | 3 (avec watermark discret "Créé avec ChantierPro") |
| Chantiers actifs | 1 maximum |
| Clients | 5 enregistrés |
| Catalogue | 50 articles |
| Export PDF | Standard |
| Support | Communautaire uniquement |

### ⭐ Plan PRO - 19€/mois (ou 190€/an = 2 mois offerts)

**Objectif :** Artisan indépendant qui gère plusieurs chantiers.

| Fonctionnalité | Inclus |
|----------------|--------|
| Devis & factures | ✅ Illimités (sans watermark) |
| Chantiers actifs | 10 |
| Clients | Illimités |
| Catalogue | Complet + import Excel |
| Planning & calendrier | ✅ |
| Relances automatiques | ✅ Par email |
| Signature électronique | ✅ |
| Support | Email prioritaire (24-48h) |

### 🚀 Plan ENTREPRISE - 49€/mois (ou 490€/an)

**Objectif :** PME du BTP avec équipe et besoin de reporting.

| Fonctionnalité | Inclus |
|----------------|--------|
| Tout le plan PRO | ✅ |
| Chantiers | Illimités |
| Gestion d'équipe | 5 utilisateurs inclus (+5€/user supplémentaire) |
| Dashboard avancé | ✅ Analytics |
| Gestion des stocks | ✅ |
| Export comptable | Format compatible experts-comptables |
| Portail client | Suivi chantier en temps réel |
| Support | Prioritaire + onboarding personnalisé |

## 2.2 Stratégie de Conversion

| Trigger | Action | Message |
|---------|--------|---------|
| 3ème devis du mois | Modal upgrade | "Vous avez utilisé vos 3 devis gratuits. Passez Pro pour continuer !" |
| Clic sur feature Pro | Tooltip + CTA | "Cette fonctionnalité est disponible avec le plan Pro. Essayez 14 jours gratuit !" |
| 7 jours d'utilisation | Email personnalisé | "Vous avez créé X devis pour Y€. Passez Pro pour gérer vos chantiers !" |
| 14 jours inactif | Email réengagement | "Votre prochain devis vous attend ! 20% de réduction ce mois-ci." |

## 2.3 Pricing Psychology

- **Ancrage** : Afficher le plan Entreprise en premier pour que Pro semble abordable
- **Badge "Plus populaire"** sur le plan Pro
- **Économie annuelle visible** : "Économisez 38€/an"
- **Garantie** : Satisfait ou remboursé 30 jours
- **Prix psychologique** : 19€ (pas 20€)

---

# 3. Workflow Développement

En tant que solo founder, un workflow rigoureux est crucial pour éviter les bugs en production et maintenir la qualité.

## 3.1 Architecture Git (Environnements)

| Branche | Environnement | URL | Usage |
|---------|---------------|-----|-------|
| `main` | Production | chantierpro.fr | Clients réels |
| `staging` | Staging/Test | staging.chantierpro.fr | Tests avant déploiement |
| `develop` | Développement | localhost:5173 | Dev quotidien |
| `feature/*` | - | - | Nouvelles features |
| `hotfix/*` | - | - | Bugs urgents prod |

## 3.2 Flux de Déploiement

```
1. Développement sur feature/xxx → Push → Review locale
2. Merge dans develop → Tests automatiques
3. Merge dans staging → Déploiement auto sur staging.chantierpro.fr
4. Tests manuels sur staging (24-48h minimum)
5. Merge dans main → Déploiement production
```

## 3.3 Configuration Vercel Multi-Environnements

Créer **2 projets Vercel distincts** :

1. **chantierpro-prod** (branche `main`) → chantierpro.fr
2. **chantierpro-staging** (branche `staging`) → staging.chantierpro.fr

**Variables d'environnement différentes :**

| Env | Variables |
|-----|-----------|
| Staging | `SUPABASE_URL_STAGING`, `STRIPE_KEY_TEST` |
| Prod | `SUPABASE_URL_PROD`, `STRIPE_KEY_LIVE` |

## 3.4 Base de Données Séparées

Supabase : Créer **2 projets**

- **chantierpro-staging** : données de test, reset possible
- **chantierpro-prod** : données réelles, backups quotidiens

## 3.5 Routine de Déploiement (Checklist)

```
☐ Build local sans erreurs (npm run build)
☐ Tests des flux critiques sur staging
☐ Vérifier les erreurs Supabase/Stripe
☐ Test création devis + paiement (mode test)
☐ Vérifier responsive mobile
☐ Merge dans main seulement si tout OK
```

## 3.6 Scripts Utiles

Ajoute ces scripts dans ton `package.json` :

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy:staging": "git push origin staging",
    "deploy:prod": "git push origin main",
    "db:backup": "supabase db dump -f backup-$(date +%Y%m%d).sql"
  }
}
```

---

# 4. Gestion des Retours Clients

## 4.1 Canaux de Feedback

| Canal | Outil | Coût |
|-------|-------|------|
| Widget in-app | Canny.io (gratuit <100 votes) | 0€ |
| Email support | support@chantierpro.fr | 0€ |
| Chat live | Crisp (gratuit 2 agents) | 0€ |
| Bug reports | GitHub Issues (privé) | 0€ |
| NPS/Satisfaction | Tally.so (formulaires gratuits) | 0€ |

## 4.2 Processus de Traitement des Bugs

```
1. Réception du bug (email/chat/widget)
2. Reproduction sur staging
3. Création issue GitHub avec labels :
   - 🔴 critical : bloque l'utilisation
   - 🟠 high : impact majeur mais contournable
   - 🟡 medium : gênant mais pas bloquant
   - 🟢 low : cosmétique
4. Fix sur branche hotfix/* ou feature/*
5. Test sur staging
6. Déploiement + notification au client
```

## 4.3 SLA (Service Level Agreement)

| Priorité | Réponse | Résolution |
|----------|---------|------------|
| 🔴 Critical | < 2h (heures ouvrées) | < 24h |
| 🟠 High | < 24h | < 72h |
| 🟡 Medium | < 48h | < 1 semaine |
| 🟢 Low | < 72h | Prochain sprint |

## 4.4 Template Email Réponse Bug

```
Bonjour [Prénom],

Merci d'avoir signalé ce problème. Je confirme l'avoir reproduit et je travaille dessus.

📋 Ticket : #[NUMERO]
⏰ Résolution estimée : [DATE]

Je reviendrai vers vous dès que c'est corrigé.

Hugo
ChantierPro
```

## 4.5 Collecte Proactive de Feedback

- **Enquête NPS** : Envoyer 30 jours après inscription
- **Exit survey** : Quand quelqu'un annule son abonnement
- **Feature voting** : Via Canny.io pour prioriser la roadmap

---

# 5. Landing Page Strategy

## 5.1 Structure de la Landing Page

**URL :** chantierpro.fr (page publique, sans login)

### Section Hero (Above the fold)

```
📌 Headline : "Gérez vos chantiers, devis et factures en 10 minutes"
📌 Subheadline : "L'outil tout-en-un pour les artisans du BTP. Gratuit pour commencer."
📌 CTA principal : "Créer mon premier devis gratuit" (bouton vert vif)
📌 CTA secondaire : "Voir la démo" (lien discret)
📌 Visuel : Screenshot de l'app ou vidéo de 30 sec
```

### Section Problème/Solution

> "Vous perdez du temps avec Excel ? Vos devis sont éparpillés ?"

- Lister 3-4 pain points des artisans
- Montrer comment ChantierPro les résout

### Section Features (avec icônes)

| Icône | Feature |
|-------|---------|
| 📄 | Devis professionnels en 2 clics |
| 📱 | Accessible partout (PWA mobile) |
| 💶 | Suivi des paiements en temps réel |
| 📅 | Planning d'équipe partagé |
| 🔔 | Relances automatiques |

### Section Social Proof

- Témoignages (même avec des beta testeurs au début)
- Logos "Compatible avec" (Stripe, Supabase, etc.)
- Compteur : "X devis créés ce mois"

### Section Pricing

Afficher les 3 plans avec le CTA "Commencer gratuitement"

### Section FAQ

5-7 questions fréquentes (SEO friendly) :

1. Est-ce vraiment gratuit ?
2. Comment ChantierPro gère mes données ?
3. Puis-je importer mes anciens devis ?
4. L'app fonctionne-t-elle hors ligne ?
5. Comment annuler mon abonnement ?

### Footer avec CTA final

> "Prêt à simplifier votre gestion ? Essayez gratuitement"

## 5.2 Outils Recommandés

| Option | Avantage | Coût |
|--------|----------|------|
| Page dans l'app React (route /landing) | Cohérence, pas de maintenance double | 0€ |
| Framer | Rapide, templates pro | 0€ (subdomain) |
| Carrd.co | Simple et efficace | 5€/an |

## 5.3 SEO On-Page

- **Title** : "ChantierPro - Logiciel Devis & Gestion Chantier BTP Gratuit"
- **Meta description** : "Créez vos devis professionnels en 2 clics. Gestion de chantiers, factures et équipe pour artisans du bâtiment. Essai gratuit."
- **H1** : Unique, contient le mot-clé principal
- **Images** : Alt tags descriptifs
- **Vitesse** : Score Lighthouse > 90

---

# 6. Plan Marketing Low-Budget

Avec un budget limité, la stratégie repose sur le contenu organique, le SEO, et le bouche-à-oreille.

## 6.1 Répartition Budget Mensuel (100€)

| Poste | Budget | ROI attendu |
|-------|--------|-------------|
| Google Ads (test) | 50€/mois | 10-20 leads |
| Outils (domaine, email) | 30€/mois | - |
| Reserve tests/boost | 20€/mois | Variable |

## 6.2 Stratégies Gratuites à Haute Valeur

### 📈 SEO (Long terme - ROI très élevé)

**Actions :**
- Blog intégré : 2 articles/mois minimum
- Mots-clés cibles :
  - "logiciel devis BTP gratuit"
  - "gestion chantier artisan"
  - "facture auto-entrepreneur BTP"
  - "planning équipe chantier"
  - "devis plombier modèle gratuit"

**Template Article SEO :**
```
Titre : Comment [VERBE] [MOT-CLÉ] en [TEMPS/NOMBRE]
Intro : Problème + promesse
H2 : Pourquoi [PROBLÈME] ?
H2 : [NOMBRE] solutions pour [SOLUTION]
H2 : Comment ChantierPro peut vous aider
CTA : Essayez gratuitement
```

### 💼 LinkedIn (B2B Gold Mine)

**Actions :**
- 3 posts/semaine sur ton profil perso
- Thèmes : tips gestion BTP, témoignages, behind-the-scenes
- Engagement dans les groupes BTP/artisans

**Idées de posts :**
1. "5 erreurs qui font perdre de l'argent aux artisans sur leurs devis"
2. "J'ai créé une app pour les artisans, voici ce que j'ai appris"
3. "Comment un plombier a gagné 3h/semaine avec ChantierPro"
4. "La checklist avant de démarrer un chantier"
5. "Pourquoi 80% des artisans n'envoient pas leurs factures à temps"

### 🤝 Partenariats Stratégiques

| Partenaire | Approche |
|------------|----------|
| Comptables spécialisés BTP | Commission ou accès gratuit |
| Fournisseurs (Point.P, BigMat) | Co-marketing |
| Chambres des métiers | Référencement annuaire |
| Écoles/formations BTP | Licence gratuite étudiants |

### 🎁 Referral Program

> "Parrainez un artisan, gagnez 1 mois Pro gratuit"

- **Parrain** : 1 mois gratuit
- **Filleul** : 1 mois gratuit + onboarding personnalisé

## 6.3 Calendrier de Contenu (Template Mensuel)

| Semaine | Blog | LinkedIn | Email |
|---------|------|----------|-------|
| S1 | Article SEO | 3 posts (Lu/Me/Ve) | - |
| S2 | - | 3 posts | Newsletter tips |
| S3 | Tutorial/How-to | 3 posts | - |
| S4 | - | 3 posts + bilan | Récap mensuel |

## 6.4 Google Ads - Stratégie 50€/mois

**Campagne 1 : Search (30€)**
- Mots-clés : "logiciel devis BTP", "gestion chantier"
- Zone : France
- CPC cible : < 2€

**Campagne 2 : Remarketing (20€)**
- Cibler les visiteurs landing qui n'ont pas converti
- Banner simple avec offre

---

# 7. Roadmap Mensuelle Détaillée

## PHASE 1 : Préparation (Mois 1-2)

### 📅 MOIS 1 - Fondations

**Objectif :** Finaliser l'app et préparer le lancement

#### Semaine 1-2 : Setup technique

| Tâche | Priorité | Durée estimée |
|-------|----------|---------------|
| Créer environnement staging (Vercel + Supabase) | 🔴 Haute | 4h |
| Configurer Stripe en mode live | 🔴 Haute | 2h |
| Setup analytics (Plausible/PostHog) | 🟠 Moyenne | 2h |
| Implémenter limitations freemium | 🔴 Haute | 8h |

#### Semaine 3-4 : Landing page & branding

| Tâche | Priorité | Durée estimée |
|-------|----------|---------------|
| Créer la landing page | 🔴 Haute | 8h |
| Rédiger CGU, mentions légales, RGPD | 🔴 Haute | 4h |
| Créer assets marketing (screenshots HD) | 🟠 Moyenne | 3h |

**📦 Livrables :** App prête, landing live, environnements configurés
**💰 Budget :** ~50€ (domaine + outils)

---

### 📅 MOIS 2 - Soft Launch

**Objectif :** Premiers utilisateurs beta, feedback initial

#### Semaine 1-2 : Beta privée

| Tâche | Priorité | Durée estimée |
|-------|----------|---------------|
| Recruter 10-20 beta testeurs | 🔴 Haute | 6h |
| Offrir 3 mois Pro gratuit en échange de feedback | - | - |
| Setup widget feedback (Canny.io) | 🟠 Moyenne | 2h |

#### Semaine 3-4 : Itérations rapides

| Tâche | Priorité | Durée estimée |
|-------|----------|---------------|
| Corriger bugs critiques remontés | 🔴 Haute | Variable |
| Améliorer onboarding basé sur retours | 🟠 Moyenne | 6h |
| Collecter 5 témoignages | 🟠 Moyenne | 4h |

**📦 Livrables :** 10+ beta testeurs actifs, premiers témoignages
**📊 KPI :** NPS > 30, 0 bug critique

---

## PHASE 2 : Lancement (Mois 3-4)

### 📅 MOIS 3 - Launch Public 🚀

**Objectif :** Lancement officiel, premiers clients payants

#### Semaine 1 : Préparation launch

- [ ] Finaliser la page pricing
- [ ] Préparer les emails de lancement
- [ ] Créer le post LinkedIn d'annonce
- [ ] Préparer le post Product Hunt

#### Semaine 2 : LAUNCH DAY 🚀

**Jour J :**
1. Post Product Hunt (dimanche soir pour lundi matin)
2. Partage LinkedIn, Twitter, groupes Facebook BTP
3. Email à tous les contacts du secteur
4. Message perso aux beta testeurs pour qu'ils votent/commentent

#### Semaine 3-4 : Capitaliser sur le momentum

- Répondre à TOUS les commentaires/questions
- Publier un article "behind the scenes"
- Activer Google Ads (50€ de test)

**📦 Livrables :** 50+ inscriptions, 5+ clients payants
**📊 KPI :** Conversion trial→paid > 10%

---

### 📅 MOIS 4 - Consolidation

**Objectif :** Optimiser la conversion, réduire le churn

| Action | Détail |
|--------|--------|
| Analyser les données du mois 3 | Où sont les drop-offs ? |
| Identifier points de friction | Heatmaps Hotjar (gratuit) |
| Améliorer emails de conversion | A/B test sujets |
| Lancer programme parrainage | Implémenter dans l'app |
| Premier article SEO optimisé | 1500+ mots, mot-clé principal |

**📊 KPI :** MRR > 200€, Churn < 10%

---

## PHASE 3 : Croissance (Mois 5-8)

### 📅 MOIS 5-6 - Content Machine

| Action | Fréquence |
|--------|-----------|
| Publier articles SEO | 2/mois |
| Posts LinkedIn | 3/semaine |
| Créer templates devis gratuits (lead magnets) | 3 total |
| Contacter comptables/partenaires | 10/mois |
| Vidéos YouTube tutoriels (optionnel) | 1/mois |

**📊 KPI Mois 6 :** MRR > 500€, 100+ utilisateurs

---

### 📅 MOIS 7-8 - Optimisation

| Action | Détail |
|--------|--------|
| A/B test landing page | Headline, CTA, images |
| Optimiser Google Ads | Focus mots-clés gagnants |
| Ajouter 1-2 features demandées | Basé sur votes Canny |
| Interviews clients | Case studies |
| Premiers partenariats actifs | 2-3 comptables minimum |

**📊 KPI Mois 8 :** MRR > 1000€, CAC < 50€

---

## PHASE 4 : Scale (Mois 9-12)

### 📅 MOIS 9-10 - Expansion

| Action | Détail |
|--------|--------|
| Augmenter budget Ads | Si ROI positif |
| Nouveaux canaux | Podcasts BTP, salons virtuels |
| Offre annuelle | Réduction 2 mois |
| Intégration comptable | Si demandée (export FEC) |

**📊 KPI Mois 10 :** MRR > 2000€, 50+ clients payants

---

### 📅 MOIS 11-12 - Consolidation

| Action | Détail |
|--------|--------|
| Bilan annuel | Ajustement roadmap an 2 |
| Témoignages clients | 10+ sur le site |
| Préparer V2 | Features majeures |
| Explorer | App native ? Équipe ? Levée ? |

**📊 KPI Mois 12 :** MRR 3000-5000€, 100+ clients payants, NPS > 40

---

# 8. KPIs et Métriques de Succès

## 8.1 Métriques Business

| Métrique | Formule | Objectif Mois 12 |
|----------|---------|------------------|
| **MRR** | Revenus récurrents mensuels | 3000-5000€ |
| **CAC** | Coût acquisition / Nouveaux clients | < 50€ (idéal < 30€) |
| **LTV** | ARPU / Churn rate | > 200€ |
| **LTV/CAC** | - | > 3 |
| **Churn** | Clients perdus / Total clients | < 5% mensuel |
| **Conversion** | Free → Paid | > 5% (excellent > 10%) |

## 8.2 Métriques Produit

| Métrique | Cible |
|----------|-------|
| **DAU/MAU** | > 30% |
| **Time to first value** | < 5 min (1er devis) |
| **Feature adoption** | Tracking par feature |
| **NPS** | > 40 |
| **CSAT** | > 4/5 |

## 8.3 Métriques Marketing

| Métrique | Cible |
|----------|-------|
| **Trafic organique** | +20%/mois |
| **Taux rebond landing** | < 50% |
| **Conversion landing→signup** | > 5% |
| **Email open rate** | > 25% |
| **Email CTR** | > 3% |

## 8.4 Dashboard de Suivi (Template)

Créer dans Notion ou Google Sheets :

```
📊 DASHBOARD CHANTIERPRO - [MOIS]

💰 REVENUS
├── MRR : ____€
├── MRR Growth : +___%
├── Nouveaux clients payants : ___
└── Churn : ___%

👥 UTILISATEURS
├── Inscriptions totales : ___
├── Actifs (30j) : ___
├── Conversion Free→Paid : ___%
└── NPS : ___

📈 MARKETING
├── Visiteurs landing : ___
├── Sources : Organic __% | Paid __% | Direct __%
└── CAC : ___€

🐛 PRODUIT
├── Bugs ouverts : ___
├── Features demandées : ___
└── Uptime : ___%
```

---

# 9. Checklists et Templates

## 9.1 Checklist Pre-Launch

```
☐ Environnement staging configuré et fonctionnel
☐ Stripe en mode live avec tous les plans créés
☐ Analytics configurés (Plausible/PostHog)
☐ Landing page live avec pricing
☐ CGU, mentions légales, RGPD en place
☐ Email transactionnel configuré (Resend/Postmark)
☐ Widget de support (Crisp) installé
☐ 5+ témoignages beta testeurs collectés
☐ Tous les flux critiques testés (signup, devis, paiement)
☐ Screenshots HD pour marketing
☐ Post Product Hunt préparé (draft)
☐ Liste de contacts pour le launch day
```

## 9.2 Checklist Déploiement Hebdomadaire

```
☐ Review des issues GitHub (bugs, features)
☐ Build local sans erreurs
☐ Tests sur staging (création devis, paiement)
☐ Vérification responsive (mobile/tablet)
☐ Backup base de données prod
☐ Merge vers main si tout OK
☐ Vérification post-déploiement (5 min)
☐ Notification aux utilisateurs si changement majeur
```

## 9.3 Checklist Mensuelle Solo Founder

```
📊 DÉBUT DE MOIS
☐ Review KPIs du mois précédent
☐ Définir 3 objectifs prioritaires
☐ Planifier le contenu (blog, LinkedIn)
☐ Budget check

📈 MI-MOIS
☐ Check progression objectifs
☐ Répondre aux demandes support en attente
☐ Publier 1 article minimum
☐ Engagement LinkedIn

📋 FIN DE MOIS
☐ Bilan chiffré complet
☐ Envoyer newsletter récap
☐ Collecter témoignages si conversions
☐ Préparer mois suivant
```

## 9.4 Template Routine Quotidienne Solo Founder

### 🌅 Matin (1-2h)

- [ ] Vérifier métriques clés (MRR, inscriptions)
- [ ] Répondre emails/tickets support urgents
- [ ] Planifier les 3 priorités du jour

### ☀️ Journée (4-6h)

- [ ] Deep work : dev ou marketing (blocs de 2h)
- [ ] Pas de réseaux sociaux pendant les blocs
- [ ] 1 pause déjeuner obligatoire (45 min minimum)

### 🌙 Soir (30 min)

- [ ] Répondre aux commentaires LinkedIn/réseaux
- [ ] Planifier le contenu du lendemain
- [ ] Bilan rapide de la journée
- [ ] Déconnexion à 19h max (éviter burnout)

## 9.5 Template Email Sequences

### Email de Bienvenue (J+0)

```
Sujet : Bienvenue sur ChantierPro 🏗️

Bonjour [Prénom],

Tu viens de rejoindre ChantierPro, et je suis content de t'accueillir !

Voici comment démarrer en 3 minutes :
1️⃣ Crée ton premier client
2️⃣ Génère ton premier devis
3️⃣ Envoie-le par email directement depuis l'app

Une question ? Réponds à cet email, je te répondrai personnellement.

À très vite,
Hugo
Fondateur de ChantierPro
```

### Email J+3 (Activation)

```
Sujet : Ton premier devis t'attend ✨

Bonjour [Prénom],

J'ai vu que tu n'as pas encore créé de devis.

Savais-tu que tu peux le faire en moins de 2 minutes ?
→ [LIEN : Créer mon devis]

Si tu as besoin d'aide, voici un tuto rapide : [LIEN VIDÉO]

Hugo
```

### Email J+7 (Conversion)

```
Sujet : Tu as créé [X] devis pour [Y]€ 💰

Bonjour [Prénom],

En 7 jours, tu as :
✅ Créé [X] devis
✅ Pour un total de [Y]€

Tu utilises ChantierPro comme un pro !

Pour aller plus loin, passe au plan Pro :
✅ Devis illimités
✅ Relances automatiques
✅ Signature électronique

👉 Essayer Pro gratuitement 14 jours

Hugo
```

---

# 10. Ressources et Outils Recommandés

## 10.1 Stack Technique (Gratuit/Low-Cost)

| Besoin | Outil | Coût |
|--------|-------|------|
| Hébergement | Vercel | Gratuit (hobby) |
| Base de données | Supabase | Gratuit (500MB) |
| Paiements | Stripe | 1.4% + 0.25€/tx |
| Email transactionnel | Resend | Gratuit (3000/mois) |
| Analytics | Plausible / PostHog | Gratuit |
| Support/Chat | Crisp | Gratuit (2 agents) |
| Feedback | Canny.io | Gratuit (<100 votes) |
| Formulaires | Tally.so | Gratuit |
| Newsletter | Buttondown | Gratuit (<100 abos) |
| Domaine | OVH / Namecheap | ~12€/an |

## 10.2 Outils Marketing

| Besoin | Outil | Coût |
|--------|-------|------|
| Design | Canva Pro | 0€ (version gratuite OK) |
| Vidéo | Loom | Gratuit (25 vidéos) |
| Screenshots | CleanShot X | 29€ one-time |
| Social scheduling | Buffer | Gratuit (3 comptes) |
| SEO | Ubersuggest | Gratuit (3 recherches/jour) |
| Heatmaps | Hotjar | Gratuit (<35 sessions/jour) |

## 10.3 Ressources Apprentissage

| Type | Ressource |
|------|-----------|
| Communauté | Indie Hackers |
| Podcast | MicroConf talks |
| Newsletter | Lenny's Newsletter |
| Blog | Plausible Blog |
| Livre | "The Mom Test" (validation) |
| Livre | "Traction" (acquisition) |

## 10.4 Contacts Utiles Secteur BTP

| Organisation | Utilité |
|--------------|---------|
| Fédération Française du Bâtiment (FFB) | Réseau, crédibilité |
| Chambres des Métiers et de l'Artisanat | Référencement |
| CAPEB | Association artisans |
| Qualibat | Certification (partenariat) |
| Groupes Facebook/LinkedIn BTP | Communauté, feedback |

## 10.5 Templates Juridiques

Utilise ces services pour générer tes documents légaux :

- **CGU/CGV** : Captain Contrat (template gratuit)
- **Politique de confidentialité** : Iubenda (gratuit basique)
- **RGPD** : CNIL (guide officiel gratuit)

---

# Récapitulatif des Objectifs par Phase

| Phase | Mois | Objectif MRR | Objectif Utilisateurs |
|-------|------|--------------|----------------------|
| Préparation | 1-2 | 0€ | 10-20 beta |
| Lancement | 3-4 | 200€ | 50+ inscrits, 5+ payants |
| Croissance | 5-8 | 1000€ | 100+ inscrits, 30+ payants |
| Scale | 9-12 | 3000-5000€ | 500+ inscrits, 100+ payants |

---

## Prochaines Étapes Immédiates

### Cette semaine :

1. [ ] Créer le projet Supabase staging
2. [ ] Configurer Vercel multi-environnements
3. [ ] Implémenter les limitations freemium (compteur devis)
4. [ ] Acheter le domaine chantierpro.fr (si pas fait)

### La semaine prochaine :

1. [ ] Créer la landing page
2. [ ] Setup Stripe live mode
3. [ ] Installer Crisp + Canny
4. [ ] Recruter 5 premiers beta testeurs

---

> 💡 **Ce plan est un guide vivant.** Adapte-le en fonction de tes apprentissages et des retours utilisateurs. Le plus important : **shipper rapidement et itérer.**

---

*Bonne chance pour le lancement de ChantierPro !* 🚀

*Document généré le 2 février 2026*
