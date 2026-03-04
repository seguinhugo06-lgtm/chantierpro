# Analyse Stratégique & Prompt Claude Code — Simplification ChantierPro pour Solo Founder

## CONTEXTE

Tu es seul. 1 personne. 1h par jour max après le lancement. Pas d'équipe support. Pas de SAV téléphonique.

Ton app actuelle a **17 modules dans le sidebar**. C'est le niveau de complexité d'un ERP entreprise comme Sage Batigest (89€/mois/utilisateur). Mais toi tu n'as pas 15 développeurs et 10 personnes au support.

**Le problème n°1 n'est pas les features manquantes. C'est la complexité.**

---

## 1. DIAGNOSTIC : POURQUOI 17 MODULES, C'EST INTENABLE

### Sidebar actuelle (17 items) :
| # | Module | Verdict | Raison |
|---|--------|---------|--------|
| 1 | Accueil | ✅ GARDER | Dashboard essentiel |
| 2 | Devis & Factures | ✅ GARDER | Core business — la raison d'acheter l'app |
| 3 | Chantiers | ✅ GARDER | Suivi de chantier essentiel |
| 4 | Planning | ✅ GARDER | Agenda artisan indispensable |
| 5 | Clients | ✅ GARDER | Base clients = base du business |
| 6 | Catalogue | ✅ GARDER | Référentiel prix |
| 7 | **Ouvrages** | 🔀 FUSIONNER → Catalogue | Doublon fonctionnel avec Catalogue. Un "ouvrage" = un article composite |
| 8 | **Sous-Traitants** | 🔀 FUSIONNER → Clients | Un sous-traitant = un contact de type "Sous-traitant". Pas besoin d'un module séparé |
| 9 | **Commandes** | 🔀 FUSIONNER → Chantiers | Les commandes fournisseur sont liées à un chantier. Tab dans Chantiers |
| 10 | Trésorerie | ✅ GARDER (renommer "Finances") | Cash flow critique |
| 11 | **IA Devis** | 🔀 INTÉGRER → dans Devis | Pas un module séparé. C'est un bouton "Estimer par photo" dans le wizard devis |
| 12 | **Entretien** | ❌ RETIRER | Trop niche. <5% des artisans l'utiliseront. Ajoutable en V2 |
| 13 | **Signatures** | 🔀 INTÉGRER → Devis & Factures | La signature fait partie du workflow devis, pas un module séparé |
| 14 | **Export Compta** | 🔀 FUSIONNER → Finances | C'est un onglet dans Finances, pas une page |
| 15 | **Équipe** | 🔫 CACHER | Visible uniquement pour le plan Équipe. 80% des artisans sont seuls |
| 16 | **Administratif** | 🔀 FUSIONNER → Paramètres | Les échéances admin + conformité = onglets dans Paramètres |
| 17 | Paramètres | ✅ GARDER | Configuration |

### Résultat : de 17 à 7 modules

**Nouveau sidebar (7 items) :**
1. 🏠 **Accueil**
2. 📄 **Devis & Factures** (avec signatures et IA intégrés)
3. 🏗️ **Chantiers** (avec commandes/dépenses en onglet)
4. 👥 **Clients** (avec sous-traitants comme type)
5. 📅 **Planning**
6. 📦 **Catalogue** (avec ouvrages = "articles composites")
7. 💰 **Finances** (trésorerie + export compta)
—
⚙️ **Paramètres** (avec conformité/admin intégrés)

> **Pourquoi c'est mieux :** Un artisan ouvre l'app sur son téléphone entre deux chantiers. 7 items = il trouve tout en 1 seconde. 17 items = il scrolle, il se perd, il appelle le support (toi).

---

## 2. PRICING : OUBLIE LES 4 PLANS

### Le problème avec Découverte/Artisan/Pro/Entreprise :
- 4 plans = 4x plus de cas edge à gérer dans le code
- Un plan "Entreprise" à 119€ implique un support enterprise (que tu ne peux pas fournir)
- Chaque plan = une matrice de permissions qui va bugger
- Les artisans ne comprennent pas la différence entre "Artisan" et "Pro"

### Le marché dit quoi ?
| Concurrent | Prix | Positionnement |
|-----------|------|----------------|
| Synobat Solo | 12,50€/mois | Auto-entrepreneurs |
| Pennylane | 14€/mois | Facturation généraliste |
| EBP Bâtiment | 29,25€/mois | Artisans/TPE |
| Batappli | 35€/mois | Artisans mobiles |
| Obat | 50€/mois | TPE/PME BTP |
| Boby, Facture.net | Gratuit | Basique |

**Prix moyen du marché : ~15€/mois**

### Nouveau pricing : 2 plans seulement

**🆓 Gratuit (Découverte)**
- 3 devis par mois
- 5 clients max
- 1 chantier actif
- Pas de signature électronique
- Pas d'export comptable
- Watermark discret "Créé avec ChantierPro" sur les PDFs
- Objectif : faire découvrir, créer l'habitude, convertir

**⭐ Pro — 14,90€/mois HT** (ou 149€/an = 12,42€/mois)
- Devis & factures illimités
- Clients illimités
- Chantiers illimités
- Signature électronique
- Export comptable (CSV, FEC, Excel)
- IA Devis (3 analyses/mois)
- Catalogue complet
- Trésorerie
- Support email (48h)
- Sans engagement mensuel / -17% en annuel

### Pourquoi 14,90€ :
- **En dessous du prix moyen** (15€) → pas cher perçu
- **Prix "impulsion"** pour un artisan qui gagne 3000-5000€/mois
- **Aucun artisan n'appellera le support** pour 14,90€ — il enverra un email max
- **Tu n'as pas besoin de 10 000 clients**. 500 abonnés × 14,90€ = **7 450€/mois**. 1000 abonnés = **14 900€/mois**.
- **Pas de plan Entreprise** = pas d'attente enterprise = pas de SAV téléphonique

### Phase 2 (quand tu atteins 500+ abonnés) :
Tu peux ajouter un **plan Équipe à 29€/mois** qui débloque :
- Module Équipe (employés + pointage)
- Multi-utilisateurs (2 comptes)
- Export paie

**Mais PAS au lancement.** Lance avec 2 plans. Point.

---

## 3. OPÉRATIONS SOLO : LE PLAYBOOK 1H/JOUR

### Infrastructure "fire and forget" :

| Besoin | Outil | Coût | Maintenance |
|--------|-------|------|-------------|
| Hébergement | Vercel (gratuit/Pro 20$/mois) | 0-20$/mois | Zéro (auto-deploy git push) |
| Base de données | Supabase Free/Pro | 0-25$/mois | Zéro (backups auto) |
| Paiements | Stripe | 1,4% + 0,25€/txn | Zéro (webhooks auto) |
| Emails transactionnels | Resend | 0$/mois (3000/mois gratuit) | Zéro |
| Monitoring erreurs | Sentry (gratuit) | 0$/mois | 5 min/jour (vérifier alertes) |
| Analytics | Plausible (9€/mois) ou Umami (gratuit self-hosted) | 0-9$/mois | Zéro |
| Support | Crisp (gratuit) + FAQ in-app | 0$/mois | 15 min/jour |
| Status page | BetterUptime (gratuit) | 0$/mois | Zéro (alertes auto) |

**Coût total infrastructure : ~35-55€/mois**

### Planning hebdomadaire (5h/semaine) :

| Jour | Durée | Tâche |
|------|-------|-------|
| **Lundi** | 1h | Vérifier Sentry (erreurs). Répondre emails support urgents. |
| **Mardi** | 1h | Répondre emails support restants. Vérifier nouvelles inscriptions. |
| **Mercredi** | 1h | 1 post LinkedIn ou 1 article SEO court (marketing). |
| **Jeudi** | 1h | Fix 1-2 bugs remontés par les utilisateurs. |
| **Vendredi** | 1h | Review analytics (Plausible). Identifier les churns. Améliorer 1 chose. |
| **Weekend** | 0 | Rien. Le monitoring alerte si problème critique. |

### Réduire le support à quasi-zéro :

1. **FAQ in-app exhaustive** (pas un lien externe) — 30 questions les plus fréquentes avec recherche
2. **Onboarding guidé** — tooltips step-by-step au premier login qui couvrent 80% des questions
3. **Chatbot IA** (optionnel) — Crisp + base de connaissance, le bot répond avant toi
4. **Pas de téléphone. Jamais.** — Email uniquement, délai 48h annoncé clairement
5. **Page /aide** avec vidéos Loom de 2 min par fonctionnalité
6. **Messages in-app contextuels** — "💡 Astuce : cliquez ici pour..." quand l'utilisateur semble bloqué
7. **Formulaire feedback** au lieu de support — "Que souhaitez-vous améliorer ?" pas "J'ai un problème"

### Automatisations critiques :

- **Inscription** → Email de bienvenue auto (Resend) → Onboarding in-app auto
- **J-3 fin de trial** → Email de rappel auto
- **Fin de trial** → Email + upgrade prompt in-app auto
- **Paiement échoué** → Stripe envoie les relances automatiquement (3 tentatives)
- **Churn** → Email auto "On est triste de vous voir partir" + offre -20% pour revenir
- **Erreur critique** → Sentry alerte par email/SMS → tu fixes le lendemain

---

## 4. CE QU'IL FAUT VRAIMENT POUR LA COMMERCIALISATION

### Indispensable avant le lancement :
1. ✅ Page pricing simple (2 plans)
2. ✅ Stripe Checkout intégré
3. ✅ Feature gates (gratuit vs pro)
4. ✅ Mentions légales / CGV / CGU / RGPD
5. ✅ Onboarding guidé (first-time experience)
6. ✅ Page /aide avec FAQ
7. ✅ Sentry pour le monitoring
8. ✅ Emails transactionnels (bienvenue, trial, paiement)
9. ✅ Landing page avec CTA "Essai gratuit"
10. ✅ Les 7 modules core qui marchent parfaitement

### PAS indispensable au lancement (Phase 2+) :
- ❌ Module Équipe (attendre la demande)
- ❌ Module Entretien (trop niche)
- ❌ Multi-entreprise (0,1% des users)
- ❌ API publique (personne ne la demandera au début)
- ❌ Intégrations comptables (l'export CSV/FEC suffit)
- ❌ App mobile native (la PWA suffit)
- ❌ Notifications push
- ❌ Sync calendrier externe

---

## PROMPT CLAUDE CODE — PARTIE 1 : SIMPLIFICATION DES MODULES

```
Tu es un développeur senior React/TypeScript. Tu travailles sur ChantierPro, une app SaaS de gestion de chantier pour artisans BTP (React 18, Vite 5, Supabase, Zustand, Tailwind CSS).

CONTEXTE CRITIQUE : Le fondateur est SEUL. Il doit pouvoir maintenir l'app en 1h/jour. L'app actuelle a 17 modules dans le sidebar. C'est TROP. On simplifie à 7 modules.

## Objectif : Réorganiser le sidebar et fusionner les modules

### ÉTAPE 1 — Nouveau Sidebar (7 items + Paramètres)

Modifier le composant Sidebar (chercher dans src/components/Sidebar.jsx ou src/components/Layout.jsx) :

```jsx
const sidebarItems = [
  { icon: Home, label: 'Accueil', path: '/' },
  { icon: FileText, label: 'Devis & Factures', path: '/devis' },
  { icon: Building2, label: 'Chantiers', path: '/chantiers' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: Calendar, label: 'Planning', path: '/planning' },
  { icon: Package, label: 'Catalogue', path: '/catalogue' },
  { icon: Wallet, label: 'Finances', path: '/finances' },
];

// Séparateur visuel puis :
const bottomItems = [
  { icon: Settings, label: 'Paramètres', path: '/parametres' },
];
```

Retirer du sidebar :
- Ouvrages (fusionné dans Catalogue)
- Sous-Traitants (fusionné dans Clients)
- Commandes (fusionné dans Chantiers)
- Trésorerie (renommé "Finances")
- IA Devis (intégré dans le wizard Devis)
- Entretien (retiré complètement pour V1)
- Signatures (intégré dans Devis & Factures)
- Export Compta (onglet dans Finances)
- Équipe (caché, visible seulement si activé dans Paramètres)
- Administratif (fusionné dans Paramètres)

### ÉTAPE 2 — Fusionner Ouvrages dans Catalogue

Dans la page Catalogue, ajouter un toggle/tab :
- **Articles** (liste actuelle des articles simples)
- **Ouvrages** (les composites, déplacés depuis BibliothequeOuvrages)

Déplacer le contenu de `BibliothequeOuvrages.jsx` comme sous-composant de la page Catalogue. La route `/ouvrages` redirige vers `/catalogue?tab=ouvrages`.

### ÉTAPE 3 — Fusionner Sous-Traitants dans Clients

Dans la page Clients :
1. Ajouter un champ `type` aux contacts : "Client" (défaut) ou "Sous-traitant"
2. Ajouter un filtre en haut : "Tous | Clients | Sous-traitants"
3. Quand le type est "Sous-traitant", afficher les champs supplémentaires :
   - Corps de métier
   - SIRET
   - Conformité (RC Pro, URSSAF)
   - Note qualité
4. Déplacer la logique de `SousTraitantsModule.jsx` dans le composant Client
5. La route `/sous-traitants` redirige vers `/clients?type=sous-traitant`

### ÉTAPE 4 — Fusionner Commandes dans Chantiers

Dans la page détail d'un chantier, ajouter un onglet "Commandes" :
1. Liste des bons de commande fournisseur liés à ce chantier
2. Bouton "+ Nouvelle commande" (même formulaire que CommandesFournisseurs)
3. Déplacer la logique de `CommandesFournisseurs.jsx` comme sous-composant
4. La route `/commandes` redirige vers `/chantiers` avec un toast "Accédez aux commandes depuis la fiche d'un chantier"

### ÉTAPE 5 — Créer la page Finances (Trésorerie + Export)

Créer une nouvelle page `/finances` avec 3 onglets :
1. **Trésorerie** — Le contenu actuel de `TresorerieModule.jsx` (KPIs, graphique, flux)
2. **Export comptable** — Le contenu actuel de `ExportComptable.jsx`
3. **Rapports** — Résumé simple : CA mois, dépenses, marge, comparaison vs mois précédent

### ÉTAPE 6 — Intégrer Signatures dans Devis & Factures

Dans la page Devis & Factures :
1. Ajouter un onglet "Signatures" qui affiche le contenu de SignatureModule
2. Dans la fiche d'un devis envoyé, ajouter un bouton "Faire signer" directement
3. Le workflow devient : Brouillon → Envoyer → Faire signer → Facturer (tout sur la même page)
4. La route `/signatures` redirige vers `/devis?tab=signatures`

### ÉTAPE 7 — Intégrer IA Devis dans le wizard de création de Devis

Au lieu d'une page séparée :
1. Dans le wizard de création de devis, ajouter une option "📷 Estimer par photo (IA)"
2. L'utilisateur uploade une photo, l'IA génère les lignes du devis
3. Il peut ensuite modifier les lignes et continuer la création normalement
4. Supprimer la page séparée IA Devis
5. La route `/ia-devis` redirige vers `/devis/nouveau?mode=ia`

### ÉTAPE 8 — Fusionner Administratif dans Paramètres

Dans la page Paramètres, ajouter les onglets :
- **Conformité** (le contenu du tab Conformité de l'Administratif)
- **Échéances** (le calendrier admin + alertes TVA/DSN)

Les onglets Paramètres deviennent :
Identité | Légal | Assurances | Banque | Documents | Facture | Conformité | Échéances | Données

Réduire en regroupant :
- "Identité" + "Légal" + "Banque" → **"Mon entreprise"** (1 seul formulaire scrollable)
- "Assurances" + "Conformité" → **"Conformité"**
- "Documents" + "Facture" → **"Documents & Facturation"**
- "Données" reste tel quel

Résultat : 4 onglets au lieu de 10+ :
**Mon entreprise | Conformité | Documents & Facturation | Données**

### ÉTAPE 9 — Redirections

Créer des redirects pour les anciennes routes :
```javascript
{ path: '/ouvrages', redirect: '/catalogue?tab=ouvrages' },
{ path: '/sous-traitants', redirect: '/clients?type=sous-traitant' },
{ path: '/commandes', redirect: '/chantiers' },
{ path: '/tresorerie', redirect: '/finances' },
{ path: '/ia-devis', redirect: '/devis/nouveau?mode=ia' },
{ path: '/entretien', redirect: '/' },
{ path: '/signatures', redirect: '/devis?tab=signatures' },
{ path: '/export-compta', redirect: '/finances?tab=export' },
{ path: '/equipe', redirect: '/parametres' },
{ path: '/administratif', redirect: '/parametres?tab=conformite' },
```

### ÉTAPE 10 — Nettoyage

1. Supprimer les imports/routes des modules retirés
2. Garder les fichiers composants pour réutilisation mais retirer du routing
3. Vérifier qu'aucun lien interne ne pointe vers les anciennes routes
4. Mettre à jour le bouton "+ Nouveau" du header pour refléter les 7 modules
```

---

## PROMPT CLAUDE CODE — PARTIE 2 : SYSTÈME D'ABONNEMENT SIMPLIFIÉ

```
Tu es un développeur senior React/TypeScript. Tu travailles sur ChantierPro (React 18, Vite 5, Supabase, Zustand, Tailwind CSS).

CONTEXTE : Fondateur solo. On implémente un système d'abonnement ultra-simple : 2 plans seulement.

## Les 2 plans

### GRATUIT (Découverte)
Limites :
- 3 devis par mois (compteur reset le 1er du mois)
- 5 clients maximum
- 1 chantier actif maximum
- Pas de signature électronique
- Pas d'export comptable (CSV/FEC/Excel)
- Pas d'IA Devis
- Watermark "Créé avec ChantierPro" sur les PDFs générés
- Catalogue limité à 20 articles
- Pas d'accès Finances (trésorerie)

### PRO — 14,90€/mois HT (ou 149€/an)
Tout illimité :
- Devis & factures illimités
- Clients illimités
- Chantiers illimités
- Signature électronique
- Export comptable
- IA Devis (5 analyses/mois)
- Pas de watermark
- Catalogue illimité
- Trésorerie complète
- Support email (48h)

## ÉTAPE 1 — Table Supabase

```sql
-- Table des abonnements
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  billing_period TEXT CHECK (billing_period IN ('monthly', 'yearly')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_customer_id);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Table d'usage mensuel
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL, -- format: '2026-02'
  devis_count INTEGER DEFAULT 0,
  ia_analyses_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON usage_tracking FOR UPDATE USING (auth.uid() = user_id);

-- Fonction pour incrémenter l'usage
CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_field TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, month, devis_count, ia_analyses_count)
  VALUES (p_user_id, to_char(NOW(), 'YYYY-MM'),
    CASE WHEN p_field = 'devis' THEN 1 ELSE 0 END,
    CASE WHEN p_field = 'ia' THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    devis_count = CASE WHEN p_field = 'devis' THEN usage_tracking.devis_count + 1 ELSE usage_tracking.devis_count END,
    ia_analyses_count = CASE WHEN p_field = 'ia' THEN usage_tracking.ia_analyses_count + 1 ELSE usage_tracking.ia_analyses_count END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## ÉTAPE 2 — Zustand Store

Créer `src/stores/subscriptionStore.js` :

```javascript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const PLAN_LIMITS = {
  free: {
    devis_per_month: 3,
    clients_max: 5,
    chantiers_actifs_max: 1,
    catalogue_max: 20,
    ia_analyses_per_month: 0,
    has_signature: false,
    has_export_compta: false,
    has_tresorerie: false,
    has_watermark: true,
  },
  pro: {
    devis_per_month: Infinity,
    clients_max: Infinity,
    chantiers_actifs_max: Infinity,
    catalogue_max: Infinity,
    ia_analyses_per_month: 5,
    has_signature: true,
    has_export_compta: true,
    has_tresorerie: true,
    has_watermark: false,
  },
};

export const useSubscriptionStore = create((set, get) => ({
  plan: 'free',
  status: 'active',
  usage: { devis_count: 0, ia_analyses_count: 0 },
  limits: PLAN_LIMITS.free,
  loading: true,

  fetchSubscription: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const plan = sub?.plan || 'free';
    const month = new Date().toISOString().slice(0, 7);

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)
      .single();

    set({
      plan,
      status: sub?.status || 'active',
      usage: usage || { devis_count: 0, ia_analyses_count: 0 },
      limits: PLAN_LIMITS[plan],
      loading: false,
    });
  },

  canCreateDevis: () => {
    const { plan, usage, limits } = get();
    if (plan === 'pro') return true;
    return usage.devis_count < limits.devis_per_month;
  },

  canUseFeature: (feature) => {
    const { limits } = get();
    return limits[`has_${feature}`] === true;
  },

  canAddClient: async () => {
    const { plan, limits } = get();
    if (plan === 'pro') return true;
    const { count } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });
    return count < limits.clients_max;
  },

  getRemainingDevis: () => {
    const { plan, usage, limits } = get();
    if (plan === 'pro') return Infinity;
    return Math.max(0, limits.devis_per_month - usage.devis_count);
  },

  isPro: () => get().plan === 'pro',
}));
```

## ÉTAPE 3 — Feature Gate Component

Créer `src/components/FeatureGate.jsx` :

```jsx
// Composant wrapper qui vérifie l'accès
export function FeatureGate({ feature, children, fallback }) {
  const { canUseFeature, isPro } = useSubscriptionStore();

  if (isPro() || canUseFeature(feature)) {
    return children;
  }

  return fallback || <UpgradePrompt feature={feature} />;
}

// Composant d'upgrade contextuel
export function UpgradePrompt({ feature }) {
  const messages = {
    signature: {
      title: 'Signature électronique',
      description: 'Faites signer vos devis en ligne par vos clients.',
    },
    export_compta: {
      title: 'Export comptable',
      description: 'Exportez vos écritures au format FEC, CSV ou Excel.',
    },
    tresorerie: {
      title: 'Suivi de trésorerie',
      description: 'Visualisez votre trésorerie et anticipez vos charges.',
    },
    ia: {
      title: 'Estimation IA',
      description: 'Estimez un chantier à partir d\'une simple photo.',
    },
  };

  const msg = messages[feature] || { title: 'Fonctionnalité Pro', description: '' };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-orange-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{msg.title}</h3>
      <p className="text-gray-500 text-center max-w-md mb-6">{msg.description}</p>
      <a
        href="/tarifs"
        className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition"
      >
        Passer au plan Pro — 14,90€/mois
      </a>
      <p className="text-sm text-gray-400 mt-2">Essai gratuit 14 jours</p>
    </div>
  );
}
```

## ÉTAPE 4 — Quota Badge (compteur devis)

Créer `src/components/QuotaBadge.jsx` :

```jsx
export function QuotaBadge() {
  const { plan, getRemainingDevis } = useSubscriptionStore();
  if (plan === 'pro') return null;

  const remaining = getRemainingDevis();
  const color = remaining > 1 ? 'text-green-600 bg-green-50'
    : remaining === 1 ? 'text-orange-600 bg-orange-50'
    : 'text-red-600 bg-red-50';

  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${color}`}>
      {remaining}/3 devis ce mois
    </span>
  );
}
```

Afficher ce badge à côté du bouton "Nouveau devis" quand le plan est gratuit.

## ÉTAPE 5 — Page Tarifs

Créer `src/pages/Tarifs.jsx` (route publique `/tarifs`) :

Layout simple avec 2 colonnes :
- Colonne gauche : Plan Gratuit (fond gris clair, bordure grise)
- Colonne droite : Plan Pro (fond orange/blanc, bordure orange, badge "Recommandé")

Chaque colonne :
- Nom du plan
- Prix (0€ ou 14,90€/mois)
- Toggle mensuel/annuel (uniquement pour Pro)
- Liste de features avec ✓ ou ✗ (7-8 items)
- Bouton CTA

En dessous :
- FAQ (5 questions)
- CTA final "Commencez gratuitement"

IMPORTANT : PAS de plan Entreprise. PAS de plan intermédiaire. 2 plans. C'est tout.

## ÉTAPE 6 — Stripe Integration

Créer une Supabase Edge Function `supabase/functions/create-checkout/index.ts` :

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const { billing_period, user_id, email } = await req.json();

  const price_id = billing_period === 'yearly'
    ? Deno.env.get('STRIPE_PRICE_YEARLY')  // 149€/an
    : Deno.env.get('STRIPE_PRICE_MONTHLY'); // 14,90€/mois

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: price_id, quantity: 1 }],
    success_url: `${Deno.env.get('APP_URL')}/upgrade/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${Deno.env.get('APP_URL')}/tarifs`,
    metadata: { user_id },
    subscription_data: {
      trial_period_days: 14,
      metadata: { user_id },
    },
    tax_id_collection: { enabled: true },
    locale: 'fr',
  });

  return new Response(JSON.stringify({ url: session.url }));
});
```

Créer le webhook `supabase/functions/stripe-webhook/index.ts` pour gérer :
- `checkout.session.completed` → créer/update subscription
- `invoice.paid` → confirmer le paiement
- `invoice.payment_failed` → marquer past_due
- `customer.subscription.deleted` → marquer canceled, downgrade vers free

## ÉTAPE 7 — Banner Trial

Si l'utilisateur a un trial actif, afficher un banner fixe sous le header :

```jsx
function TrialBanner() {
  const { status, subscription } = useSubscriptionStore();
  if (status !== 'trialing') return null;

  const daysLeft = Math.ceil(
    (new Date(subscription.trial_ends_at) - new Date()) / 86400000
  );

  const bgColor = daysLeft > 3 ? 'bg-blue-50 text-blue-700'
    : daysLeft > 1 ? 'bg-orange-50 text-orange-700'
    : 'bg-red-50 text-red-700';

  return (
    <div className={`${bgColor} text-center py-2 text-sm font-medium`}>
      Essai gratuit · {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''} ·
      <a href="/tarifs" className="underline ml-1">Choisir un plan</a>
    </div>
  );
}
```
```

---

## PROMPT CLAUDE CODE — PARTIE 3 : AUTOMATISATION SUPPORT & LANCEMENT

```
Tu es un développeur senior React/TypeScript. Tu travailles sur ChantierPro (React 18, Vite 5, Supabase, Zustand, Tailwind CSS).

CONTEXTE : Fondateur solo, 1h/jour max. L'objectif est de rendre l'app auto-suffisante : zéro support humain dans 80% des cas.

## ÉTAPE 1 — Centre d'aide in-app

Créer `src/components/HelpCenter.jsx` accessible via l'icône "?" dans le header.

Quand on clique sur "?" → slide-in panel depuis la droite avec :

1. **Barre de recherche** en haut
2. **Questions fréquentes** (accordéon)
3. **Lien "Contacter le support"** (ouvre le formulaire email)

FAQ à inclure (30 questions minimum), exemples :

```
Catégorie: Devis & Factures
- Comment créer mon premier devis ?
- Comment ajouter un article à un devis ?
- Comment envoyer un devis par email ?
- Comment transformer un devis en facture ?
- Comment dupliquer un devis ?
- Quels taux de TVA s'appliquent en rénovation ?
- Comment numéroter mes factures ?

Catégorie: Clients
- Comment ajouter un client ?
- Comment ajouter un sous-traitant ?
- Comment retrouver un ancien client ?

Catégorie: Chantiers
- Comment créer un chantier ?
- Comment suivre les dépenses d'un chantier ?
- Comment voir l'avancement d'un chantier ?

Catégorie: Finances
- Comment voir ma trésorerie ?
- Comment exporter pour mon comptable ?
- Quel format d'export choisir (CSV, FEC, Excel) ?

Catégorie: Abonnement
- Comment passer au plan Pro ?
- Comment changer de moyen de paiement ?
- Comment annuler mon abonnement ?
- Quelles sont les limites du plan gratuit ?

Catégorie: Mon compte
- Comment modifier mes informations d'entreprise ?
- Comment changer mon logo ?
- Comment supprimer mon compte ?
```

Chaque réponse : 2-3 phrases + lien vers la page concernée dans l'app.

## ÉTAPE 2 — Onboarding guidé (première connexion)

Créer `src/components/OnboardingWizard.jsx`

Au premier login (vérifier un flag `onboarding_completed` dans le profil user), afficher un wizard overlay :

**Étape 1/4 — "Bienvenue sur ChantierPro ! 🏗️"**
- "Configurez votre entreprise en 2 minutes"
- Champs : Nom entreprise, SIRET (optionnel), Téléphone
- Bouton : "Suivant"

**Étape 2/4 — "Ajoutez votre premier client"**
- Formulaire rapide : Nom, Prénom, Téléphone (email optionnel)
- Bouton : "Ajouter" ou "Passer cette étape"

**Étape 3/4 — "Créez votre premier devis"**
- "Essayez de créer un devis de test !"
- Bouton qui ouvre le wizard devis pré-rempli avec le client de l'étape 2
- Ou "Je ferai ça plus tard"

**Étape 4/4 — "Vous êtes prêt !"**
- Récapitulatif : ✅ Entreprise configurée, ✅ Client ajouté, ✅ Premier devis créé
- "Vous avez 14 jours d'essai gratuit du plan Pro"
- Bouton : "Commencer"
- 3 liens rapides : "Ajouter plus de clients", "Voir le catalogue BTP", "Explorer les paramètres"

Marquer `onboarding_completed = true` dans Supabase à la fin.

## ÉTAPE 3 — Tooltips contextuels

Utiliser une lib légère (react-joyride ou custom) pour afficher des tooltips la première fois qu'un utilisateur visite une page :

- **Page Devis** : "Cliquez sur '+ Nouveau' pour créer votre premier devis" (flèche vers le bouton)
- **Page Clients** : "Vos clients apparaîtront ici. Cliquez sur '+ Nouveau' pour en ajouter un."
- **Page Chantiers** : "Créez un chantier pour suivre vos projets en cours."
- **Page Catalogue** : "Ajoutez vos articles et matériaux pour les réutiliser dans vos devis."

Chaque tooltip ne s'affiche qu'UNE fois (flag en localStorage).

## ÉTAPE 4 — Formulaire de contact (pas un chat en direct)

Dans le header, le "?" ouvre le centre d'aide. En bas du centre d'aide :

"Vous n'avez pas trouvé la réponse ?"
→ Bouton "Envoyer un message"
→ Formulaire : Sujet (dropdown), Message (textarea), Capture d'écran (upload optionnel)
→ Envoie un email à support@chantierpro.fr via Resend
→ Message de confirmation : "Merci ! Nous vous répondrons sous 48h."

PAS de chat en direct. PAS de chatbot. Un simple formulaire email.

## ÉTAPE 5 — Emails automatiques

Configurer Resend (ou similaire) avec ces templates :

### Email 1 — Bienvenue (à l'inscription)
```
Sujet: Bienvenue sur ChantierPro, {{prenom}} !
---
Bonjour {{prenom}},

Votre compte ChantierPro est prêt. Vous avez 14 jours d'essai gratuit.

Pour bien démarrer :
1. Complétez votre profil entreprise
2. Ajoutez votre premier client
3. Créez votre premier devis

→ Accéder à ChantierPro

À bientôt,
Hugo — Fondateur de ChantierPro
```

### Email 2 — J-3 avant fin d'essai
```
Sujet: Plus que 3 jours d'essai gratuit
---
Bonjour {{prenom}},

Votre essai gratuit se termine dans 3 jours.

Pour continuer à utiliser ChantierPro sans interruption,
choisissez le plan Pro à 14,90€/mois HT.

→ Choisir mon plan

Le plan gratuit reste disponible (3 devis/mois, 5 clients max).
```

### Email 3 — Essai terminé
```
Sujet: Votre essai est terminé
---
Votre essai de 14 jours est terminé. Vous êtes passé au plan Gratuit.

Limites du plan Gratuit :
- 3 devis par mois
- 5 clients maximum
- Pas de signature électronique

→ Passer au plan Pro (14,90€/mois)

Vos données sont conservées. Rien n'est perdu.
```

### Email 4 — Paiement réussi
```
Sujet: Confirmation de paiement — Plan Pro
---
Merci {{prenom}} ! Votre plan Pro est activé.

Montant : {{montant}}€ HT
Prochaine facturation : {{date}}

Votre facture est disponible dans Paramètres > Abonnement.
```

### Email 5 — Échec de paiement
```
Sujet: ⚠️ Problème avec votre paiement
---
Nous n'avons pas pu encaisser votre paiement.

→ Mettre à jour votre moyen de paiement

Si le problème persiste, répondez à cet email.
```

## ÉTAPE 6 — Landing Page

Créer `src/pages/Landing.jsx` (route `/` pour les visiteurs non connectés).

Structure :
1. **Hero** : "Créez vos devis BTP en 5 minutes" + sous-titre + CTA "Essai gratuit 14 jours" + screenshot de l'app
2. **Social proof** : "Utilisé par X artisans" (même si c'est 0, mettre "Rejoignez les artisans qui simplifient leur admin")
3. **3 features clés** : Devis en 2 clics | Suivi de chantier | Trésorerie en temps réel (avec illustrations)
4. **Pricing** (les 2 plans, inline)
5. **FAQ** (5 questions)
6. **CTA final** : "Commencez gratuitement — Aucune carte bancaire requise"
7. **Footer** : Liens légaux (CGV, CGU, Confidentialité, Mentions légales)

L'utilisateur connecté voit le Dashboard. Le visiteur voit la Landing Page.

## ÉTAPE 7 — Pages légales minimales

Créer 4 pages statiques :
- `/cgv` — Conditions Générales de Vente (template standard SaaS)
- `/cgu` — Conditions Générales d'Utilisation
- `/confidentialite` — Politique de Confidentialité (RGPD)
- `/mentions-legales` — Mentions légales

Contenu : textes juridiques standards. L'éditeur est "ChantierPro" (à compléter avec SIRET). Hébergeur : Vercel Inc. / Supabase Inc. Le contenu doit mentionner Stripe pour les paiements.

## ÉTAPE 8 — Monitoring minimal

### Sentry (erreurs frontend)
```bash
npm install @sentry/react
```

Initialiser dans `main.jsx` :
```javascript
import * as Sentry from '@sentry/react';
Sentry.init({ dsn: 'YOUR_SENTRY_DSN', environment: 'production' });
```

### Analytics (Plausible)
```html
<!-- Dans index.html -->
<script defer data-domain="chantierpro.fr" src="https://plausible.io/js/script.js"></script>
```

C'est tout. Pas besoin de plus de monitoring pour un solo founder.

## ÉTAPE 9 — Bannière cookies (RGPD)

Bannière simple au premier accès :

"ChantierPro utilise des cookies pour améliorer votre expérience."
[Accepter] [Refuser] [En savoir plus →]

Si refus : désactiver Plausible analytics. Les cookies Supabase (auth) sont nécessaires et ne nécessitent pas de consentement.

Stocker le choix en localStorage. Ne plus afficher après.
```

---

## RÉSUMÉ EXÉCUTIF

### Avant (complexe, intenable) :
- 17 modules, 4 plans de prix, support téléphonique implicite
- Coût mental : élevé
- Tickets support estimés : 10-20/jour
- Temps requis : 3-4h/jour minimum

### Après (simple, durable) :
- 7 modules, 2 plans de prix, email uniquement
- Coût mental : faible
- Tickets support estimés : 2-5/jour (grâce à la FAQ + onboarding)
- Temps requis : 1h/jour

### Objectifs de revenus :
| Mois | Utilisateurs gratuits | Abonnés Pro | MRR |
|------|----------------------|-------------|-----|
| M+1 | 50 | 5 | 75€ |
| M+3 | 200 | 30 | 447€ |
| M+6 | 500 | 100 | 1 490€ |
| M+12 | 1500 | 300 | 4 470€ |
| M+18 | 3000 | 500 | 7 450€ |
| M+24 | 5000 | 1000 | 14 900€ |

**Break-even estimé : M+6 (couvre les frais d'infra ~55€/mois)**
**Objectif confort : M+18 (7 450€/mois = revenu décent en solo)**
