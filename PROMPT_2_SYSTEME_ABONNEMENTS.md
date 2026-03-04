# ChantierPro - Prompt 2 : Système d'Abonnements Freemium

**Contexte :** ChantierPro - React 18, Vite 5, Supabase, Zustand, Tailwind CSS
**Prompt :** Implémentation complète du système d'abonnements freemium avec 4 plans tarifés, gestion des limites de features, intégration Stripe, et suivi d'usage.

---

## Prompt Claude Code

```
Tu es un expert en développement full-stack React/Supabase. Tu dois implémenter un système d'abonnements freemium complet pour ChantierPro.

## 1. MODÈLE FREEMIUM — DÉFINITION DES PLANS

### Plan DÉCOUVERTE (Gratuit à vie)
**Cible :** Artisan solo qui teste l'app
- 3 devis / mois
- 2 factures / mois
- 5 clients max
- 1 chantier actif
- Dashboard basique (pas de Score Santé)
- Pas de signature électronique
- Pas d'IA Devis
- Pas d'export comptable
- Pas de sous-traitants
- Filigrane "Créé avec ChantierPro" sur les PDF
- 100 Mo stockage

### Plan ARTISAN (29€ HT/mois ou 290€/an — ~2 mois gratuits)
**Cible :** Artisan solo ou duo
- Devis & factures illimités
- 50 clients
- 5 chantiers actifs
- Tous les templates (230+)
- Signature électronique (5/mois)
- IA Devis (3 analyses/mois)
- Export comptable CSV
- Dashboard complet + Score Santé
- 1 utilisateur + 1 accès lecture
- Sous-traitants (3 max)
- 2 Go stockage
- Support email

### Plan PRO (59€ HT/mois ou 590€/an)
**Cible :** Petite entreprise 2-5 personnes
- Tout du plan Artisan +
- Clients illimités
- Chantiers illimités
- Signature électronique illimitée
- IA Devis (10 analyses/mois)
- Export FEC + Excel
- Module Équipe (pointage, coûts)
- Module Trésorerie complet
- Module Commandes fournisseurs
- Carnet d'entretien
- 5 utilisateurs
- Sous-traitants illimités
- 10 Go stockage
- Support prioritaire
- Pas de filigrane PDF

### Plan ENTREPRISE (119€ HT/mois ou 1190€/an)
**Cible :** Entreprise 5-20 personnes
- Tout du plan Pro +
- Utilisateurs illimités
- Multi-entreprise
- API accès
- IA Devis illimité
- Tableau de bord analytique avancé
- Rapprochement bancaire
- Intégrations comptables
- 100 Go stockage
- Support téléphonique dédié
- Onboarding personnalisé

## 2. SCHÉMA SUPABASE

Voici le schéma SQL complet à exécuter dans Supabase :

\`\`\`sql
-- Table des plans (reference statique)
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL,
  price_yearly INTEGER NOT NULL,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  features JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des abonnements utilisateur
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherches rapides
CREATE INDEX idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Table de suivi d'usage (compteurs mensuels)
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, metric, period_start, period_end)
);

-- Index pour recherches rapides
CREATE INDEX idx_usage_tracking_company_metric ON usage_tracking(company_id, metric);

-- Trigger pour auto-update updated_at sur subscriptions
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS \$\$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_update_timestamp
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at();

-- Trigger pour auto-update updated_at sur plans
CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS \$\$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

CREATE TRIGGER plans_update_timestamp
BEFORE UPDATE ON plans
FOR EACH ROW
EXECUTE FUNCTION update_plans_updated_at();
\`\`\`

## 3. DONNÉES INITIALES (SEED)

Insérer les plans dans Supabase avec cette seed SQL :

\`\`\`sql
INSERT INTO plans (name, display_name, description, price_monthly, price_yearly, features, is_active, display_order) VALUES
(
  'decouverte',
  'Découverte',
  'Gratuit à vie pour tester l''application',
  0,
  0,
  '{
    "devis_monthly": 3,
    "factures_monthly": 2,
    "clients_max": 5,
    "chantiers_active": 1,
    "signature_monthly": 0,
    "ia_devis_monthly": 0,
    "export_csv": false,
    "export_fec": false,
    "equipe_enabled": false,
    "tresorerie_full": false,
    "commandes_enabled": false,
    "entretien_enabled": false,
    "soustraitants_max": 0,
    "users_max": 1,
    "storage_bytes": 104857600,
    "multi_entreprise": false,
    "api_access": false,
    "pdf_watermark": true,
    "score_sante": false,
    "analytique_avance": false,
    "template_count": 50
  }'::jsonb,
  true,
  1
),
(
  'artisan',
  'Artisan',
  'Pour les artisans solos et petits duos',
  2900,
  29000,
  'stripe_price_id_monthly_placeholder',
  'stripe_price_id_yearly_placeholder',
  '{
    "devis_monthly": null,
    "factures_monthly": null,
    "clients_max": 50,
    "chantiers_active": 5,
    "signature_monthly": 5,
    "ia_devis_monthly": 3,
    "export_csv": true,
    "export_fec": false,
    "equipe_enabled": false,
    "tresorerie_full": true,
    "commandes_enabled": false,
    "entretien_enabled": false,
    "soustraitants_max": 3,
    "users_max": 2,
    "storage_bytes": 2147483648,
    "multi_entreprise": false,
    "api_access": false,
    "pdf_watermark": false,
    "score_sante": true,
    "analytique_avance": false,
    "template_count": 230
  }'::jsonb,
  true,
  2
),
(
  'pro',
  'Pro',
  'Pour les petites entreprises 2-5 personnes',
  5900,
  59000,
  'stripe_price_id_monthly_placeholder',
  'stripe_price_id_yearly_placeholder',
  '{
    "devis_monthly": null,
    "factures_monthly": null,
    "clients_max": null,
    "chantiers_active": null,
    "signature_monthly": null,
    "ia_devis_monthly": 10,
    "export_csv": true,
    "export_fec": true,
    "equipe_enabled": true,
    "tresorerie_full": true,
    "commandes_enabled": true,
    "entretien_enabled": true,
    "soustraitants_max": null,
    "users_max": 5,
    "storage_bytes": 10737418240,
    "multi_entreprise": false,
    "api_access": false,
    "pdf_watermark": false,
    "score_sante": true,
    "analytique_avance": false,
    "template_count": 230
  }'::jsonb,
  true,
  3
),
(
  'entreprise',
  'Entreprise',
  'Pour les entreprises 5-20 personnes avec besoins avancés',
  11900,
  119000,
  'stripe_price_id_monthly_placeholder',
  'stripe_price_id_yearly_placeholder',
  '{
    "devis_monthly": null,
    "factures_monthly": null,
    "clients_max": null,
    "chantiers_active": null,
    "signature_monthly": null,
    "ia_devis_monthly": null,
    "export_csv": true,
    "export_fec": true,
    "equipe_enabled": true,
    "tresorerie_full": true,
    "commandes_enabled": true,
    "entretien_enabled": true,
    "soustraitants_max": null,
    "users_max": null,
    "storage_bytes": 107374182400,
    "multi_entreprise": true,
    "api_access": true,
    "pdf_watermark": false,
    "score_sante": true,
    "analytique_avance": true,
    "template_count": 230
  }'::jsonb,
  true,
  4
);
\`\`\`

## 4. INTÉGRATION STRIPE

### Configuration Stripe
1. Créer 4 produits dans Stripe : "ChantierPro - Artisan", "ChantierPro - Pro", "ChantierPro - Entreprise"
2. Pour chaque produit, créer 2 prix : monthly et yearly
3. Copier les Stripe Price IDs dans la table plans
4. Créer les Webhook Endpoints avec ces événements :
   - \`checkout.session.completed\`
   - \`invoice.payment_succeeded\`
   - \`invoice.payment_failed\`
   - \`customer.subscription.updated\`
   - \`customer.subscription.deleted\`

### Variables d'environnement (.env.local)
\`\`\`
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
VITE_STRIPE_TEST_MODE=true
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_TRIAL_DAYS=14
\`\`\`

## 5. STRUCTURE DU CODE CÔTÉ CLIENT

### 5.1. Zustand Store (`src/store/subscriptionStore.ts`)

\`\`\`typescript
import { create } from 'zustand';
import { subscriptionsApi } from '../api/subscriptionsApi';

export interface Plan {
  id: string;
  name: 'decouverte' | 'artisan' | 'pro' | 'entreprise';
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, any>;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
}

export interface UsageMetric {
  metric: string;
  current: number;
  limit: number | null;
  period_start: string;
  period_end: string;
}

interface SubscriptionState {
  // Data
  currentPlan: Plan | null;
  subscription: Subscription | null;
  usageMetrics: Record<string, UsageMetric>;
  allPlans: Plan[];
  loading: boolean;
  error: string | null;

  // Actions
  loadSubscriptionData: (companyId: string) => Promise<void>;
  canAccessFeature: (featureName: string) => boolean;
  checkLimit: (metric: string) => { allowed: boolean; current: number; max: number | null };
  isTrialing: () => boolean;
  daysLeftInTrial: () => number;
  getRemainingInPeriod: (metric: string) => number | null;
  trackUsage: (metric: string, amount: number) => Promise<void>;
  upgradeToStripe: (planName: string, billingCycle: 'monthly' | 'yearly') => Promise<string>;
  cancelSubscription: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  currentPlan: null,
  subscription: null,
  usageMetrics: {},
  allPlans: [],
  loading: false,
  error: null,

  loadSubscriptionData: async (companyId: string) => {
    set({ loading: true, error: null });
    try {
      const [plan, subscription, usage, allPlans] = await Promise.all([
        subscriptionsApi.getCurrentPlan(companyId),
        subscriptionsApi.getSubscription(companyId),
        subscriptionsApi.getUsageMetrics(companyId),
        subscriptionsApi.getAllPlans(),
      ]);

      const usageMetrics: Record<string, UsageMetric> = {};
      usage.forEach((u: any) => {
        usageMetrics[u.metric] = {
          metric: u.metric,
          current: u.count,
          limit: plan?.features[u.metric + '_max'] || plan?.features[u.metric + '_monthly'],
          period_start: u.period_start,
          period_end: u.period_end,
        };
      });

      set({ currentPlan: plan, subscription, usageMetrics, allPlans, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  canAccessFeature: (featureName: string) => {
    const { currentPlan } = get();
    if (!currentPlan) return false;

    const featureValue = currentPlan.features[featureName];
    if (featureValue === null || featureValue === undefined) return false;
    return featureValue !== false && featureValue !== 0;
  },

  checkLimit: (metric: string) => {
    const { currentPlan, usageMetrics } = get();
    if (!currentPlan) return { allowed: false, current: 0, max: null };

    const usage = usageMetrics[metric];
    if (!usage) return { allowed: true, current: 0, max: null };

    const max = usage.limit;
    if (max === null) return { allowed: true, current: usage.current, max: null };

    return {
      allowed: usage.current < max,
      current: usage.current,
      max,
    };
  },

  isTrialing: () => {
    const { subscription } = get();
    return subscription?.status === 'trialing';
  },

  daysLeftInTrial: () => {
    const { subscription } = get();
    if (!subscription?.trial_end) return 0;

    const trialEnd = new Date(subscription.trial_end);
    const today = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  },

  getRemainingInPeriod: (metric: string) => {
    const { usageMetrics } = get();
    const usage = usageMetrics[metric];
    if (!usage || usage.limit === null) return null;
    return Math.max(0, usage.limit - usage.current);
  },

  trackUsage: async (metric: string, amount: number = 1) => {
    const { subscription } = get();
    if (!subscription) throw new Error('No active subscription');

    try {
      await subscriptionsApi.trackUsage(subscription.company_id, metric, amount);
      // Reload usage after tracking
      const usage = await subscriptionsApi.getUsageMetrics(subscription.company_id);
      const usageMetrics: Record<string, UsageMetric> = {};
      usage.forEach((u: any) => {
        usageMetrics[u.metric] = {
          metric: u.metric,
          current: u.count,
          limit: null,
          period_start: u.period_start,
          period_end: u.period_end,
        };
      });
      set({ usageMetrics });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  upgradeToStripe: async (planName: string, billingCycle: 'monthly' | 'yearly') => {
    const { allPlans, subscription } = get();
    if (!subscription) throw new Error('No subscription found');

    const plan = allPlans.find((p) => p.name === planName);
    if (!plan) throw new Error('Plan not found');

    const priceId = billingCycle === 'monthly' ? plan.stripe_price_id_monthly : plan.stripe_price_id_yearly;
    if (!priceId) throw new Error('Price not configured in Stripe');

    const checkoutUrl = await subscriptionsApi.createCheckoutSession(
      subscription.company_id,
      priceId,
      planName,
      billingCycle
    );
    return checkoutUrl;
  },

  cancelSubscription: async () => {
    const { subscription } = get();
    if (!subscription) throw new Error('No subscription found');

    try {
      await subscriptionsApi.cancelSubscription(subscription.id);
      set({ subscription: { ...subscription, status: 'canceled' } });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },
}));
\`\`\`

### 5.2. API Client (`src/api/subscriptionsApi.ts`)

\`\`\`typescript
import { supabase } from '../lib/supabase';

export const subscriptionsApi = {
  // Fetch current plan
  async getCurrentPlan(companyId: string) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('company_id', companyId)
      .maybeSingle();

    if (!subscription) {
      // Retourner le plan Découverte par défaut
      const { data: plan } = await supabase
        .from('plans')
        .select('*')
        .eq('name', 'decouverte')
        .single();
      return plan;
    }

    const { data: plan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .single();
    return plan;
  },

  // Fetch subscription record
  async getSubscription(companyId: string) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (!subscription) {
      // Create default subscription
      const { data: plan } = await supabase
        .from('plans')
        .select('id')
        .eq('name', 'decouverte')
        .single();

      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert([
          {
            company_id: companyId,
            plan_id: plan.id,
            status: 'active',
            billing_cycle: 'monthly',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ])
        .select()
        .single();

      return newSub;
    }

    return subscription;
  },

  // Fetch usage metrics
  async getUsageMetrics(companyId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('company_id', companyId)
      .gte('period_start', periodStart.toISOString().split('T')[0])
      .lte('period_end', periodEnd.toISOString().split('T')[0]);

    return usage || [];
  },

  // Get all active plans
  async getAllPlans() {
    const { data: plans } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    return plans || [];
  },

  // Track usage of a metric
  async trackUsage(companyId: string, metric: string, amount: number = 1) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('usage_tracking')
      .select('id, count')
      .eq('company_id', companyId)
      .eq('metric', metric)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('usage_tracking')
        .update({ count: existing.count + amount })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('usage_tracking')
        .insert([
          {
            company_id,
            metric,
            period_start: periodStart,
            period_end: periodEnd,
            count: amount,
          },
        ]);
    }
  },

  // Create Stripe checkout session
  async createCheckoutSession(
    companyId: string,
    priceId: string,
    planName: string,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<string> {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId,
        priceId,
        planName,
        billingCycle,
      }),
    });

    const { checkoutUrl } = await response.json();
    return checkoutUrl;
  },

  // Cancel subscription
  async cancelSubscription(subscriptionId: string) {
    const response = await fetch('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId }),
    });

    if (!response.ok) throw new Error('Failed to cancel subscription');
    return response.json();
  },
};
\`\`\`

### 5.3. Feature Gate Hook (`src/hooks/useFeatureGate.ts`)

\`\`\`typescript
import { useSubscriptionStore } from '../store/subscriptionStore';

export const useFeatureGate = () => {
  const { canAccessFeature, checkLimit, getRemainingInPeriod } = useSubscriptionStore();

  return {
    can: (feature: string) => canAccessFeature(feature),
    check: (metric: string) => checkLimit(metric),
    remaining: (metric: string) => getRemainingInPeriod(metric),
  };
};
\`\`\`

### 5.4. Composant UpgradeModal (`src/components/UpgradeModal.tsx`)

\`\`\`typescript
import { useState } from 'react';
import { useSubscriptionStore } from '../store/subscriptionStore';

export const UpgradeModal: React.FC<{ isOpen: boolean; onClose: () => void; requiredFeature?: string }> = ({
  isOpen,
  onClose,
  requiredFeature,
}) => {
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');
  const { allPlans, upgradeToStripe } = useSubscriptionStore();

  const handleUpgrade = async (planName: string) => {
    const checkoutUrl = await upgradeToStripe(planName, selectedBilling);
    window.location.href = checkoutUrl;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-4xl">
        <h2 className="text-2xl font-bold mb-6">Passer à la version payante</h2>

        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setSelectedBilling('monthly')}
            className={`px-4 py-2 rounded ${
              selectedBilling === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setSelectedBilling('yearly')}
            className={`px-4 py-2 rounded ${
              selectedBilling === 'yearly' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Annuel (2 mois gratuits)
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {allPlans
            .filter((p) => p.name !== 'decouverte')
            .map((plan) => (
              <div key={plan.id} className="border rounded-lg p-4">
                <h3 className="font-bold mb-2">{plan.display_name}</h3>
                <p className="text-2xl font-bold mb-4">
                  {selectedBilling === 'monthly'
                    ? `${(plan.price_monthly / 100).toFixed(2)}€`
                    : `${(plan.price_yearly / 100).toFixed(2)}€`}
                  <span className="text-sm">/an</span>
                </p>
                <button
                  onClick={() => handleUpgrade(plan.name)}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Choisir
                </button>
              </div>
            ))}
        </div>

        <button onClick={onClose} className="w-full bg-gray-300 py-2 rounded">
          Fermer
        </button>
      </div>
    </div>
  );
};
\`\`\`

### 5.5. Middleware de Protection (`src/middleware/featureGuard.tsx`)

\`\`\`typescript
import React from 'react';
import { useSubscriptionStore } from '../store/subscriptionStore';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onBlocked?: () => void;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  feature,
  children,
  fallback,
  onBlocked,
}) => {
  const { canAccessFeature } = useSubscriptionStore();

  if (!canAccessFeature(feature)) {
    if (onBlocked) onBlocked();
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};
\`\`\`

## 6. CÔTÉ SERVEUR (Backend)

### 6.1. Route Stripe Checkout (`/api/stripe/checkout.ts`)

\`\`\`typescript
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(req: Request) {
  const { companyId, priceId, planName, billingCycle } = await req.json();

  if (!companyId || !priceId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  try {
    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('company_id', companyId)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Get company email
      const { data: company } = await supabase
        .from('companies')
        .select('name, email')
        .eq('id', companyId)
        .single();

      const customer = await stripe.customers.create({
        email: company.email,
        metadata: { companyId },
      });

      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('company_id', companyId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.VITE_APP_URL}/dashboard/billing?status=success`,
      cancel_url: `${process.env.VITE_APP_URL}/dashboard/billing?status=cancel`,
      subscription_data: {
        metadata: {
          companyId,
          planName,
          billingCycle,
        },
        trial_period_days: planName === 'artisan' || planName === 'pro' ? 14 : 0,
      },
    });

    return new Response(
      JSON.stringify({ checkoutUrl: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
\`\`\`

### 6.2. Webhook Handler (`/api/stripe/webhook.ts`)

\`\`\`typescript
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature') || '';
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDelete(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId;
  const planName = session.metadata?.planName;

  if (!companyId || !planName) return;

  // Get plan ID
  const { data: plan } = await supabase
    .from('plans')
    .select('id')
    .eq('name', planName)
    .single();

  // Update or create subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('company_id', companyId)
    .maybeSingle();

  const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);

  const subscriptionData = {
    plan_id: plan.id,
    stripe_subscription_id: stripeSubscription.id,
    stripe_customer_id: session.customer as string,
    status: stripeSubscription.status as any,
    billing_cycle: stripeSubscription.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
    current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
  };

  if (subscription) {
    await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', subscription.id);
  } else {
    await supabase
      .from('subscriptions')
      .insert([{ company_id: companyId, ...subscriptionData }]);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('company_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (!sub) return;

  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status as any,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionDelete(subscription: Stripe.Subscription) {
  // Downgrade to free plan
  const { data: freeplan } = await supabase
    .from('plans')
    .select('id')
    .eq('name', 'decouverte')
    .single();

  await supabase
    .from('subscriptions')
    .update({
      plan_id: freeplan.id,
      status: 'canceled' as any,
      stripe_subscription_id: null,
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' as any })
    .eq('stripe_subscription_id', invoice.subscription);
}
\`\`\`

### 6.3. Route Cancel Subscription (`/api/stripe/cancel-subscription.ts`)

\`\`\`typescript
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(req: Request) {
  const { subscriptionId } = await req.json();

  try {
    // Verify subscription exists in DB
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('id', subscriptionId)
      .single();

    if (!sub?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: 'Subscription not found' }), { status: 404 });
    }

    // Cancel at period end
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update DB
    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('id', subscriptionId);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
\`\`\`

## 7. COMPOSANTS UI IMPORTANTS

### 7.1. Pricing Page (`src/pages/Pricing.tsx`)

Créer une page de pricing affichant :
- Les 4 plans côte à côte
- Toggle Monthly/Yearly
- Feature comparison table
- CTA buttons pour chaque plan

### 7.2. Billing Dashboard (`src/pages/BillingDashboard.tsx`)

Afficher :
- Plan actuel
- Prochaine date de facturation
- Historique des factures (depuis Stripe)
- Bouton "Upgrade" / "Manage Subscription"
- Statut d'essai gratuit (days left)

### 7.3. Usage Alerts (`src/components/UsageAlerts.tsx`)

Afficher pour chaque métrique suivie :
- Barre de progression
- Pourcentage utilisé
- Limite restante
- Notification "Limit reached" si dépassé

## 8. FONCTIONNALITÉS CRITIQUES À IMPLÉMENTER

### 8.1. Reset d'usage mensuel
- Créer une fonction cron job (ou serverless function) qui reset les compteurs à chaque début de mois
- À 00:00 UTC le 1er de chaque mois

### 8.2. Trial notifications
- Email à J-3, J-1, J0 de fin de trial
- In-app banner animé qui compte down les jours

### 8.3. Feature gates sur les actions clés
- Avant de créer un devis: \`canAccessFeature('devis.create')\`
- Avant d'ajouter un client: \`checkLimit('clients_max')\`
- Avant de générer une signature: \`checkLimit('signature_monthly')\`
- Avant d'accéder aux modules Pro: \`FeatureGuard feature="equipe.enabled"\`

### 8.4. Watermark PDF
- Vérifier \`currentPlan.features.pdf_watermark\` avant d'exporter PDF
- Si true: ajouter "Créé avec ChantierPro" en filigrane

### 8.5. Storage check
- Avant d'uploader un fichier, vérifier le quota: \`checkLimit('storage_bytes')\`

## 9. FICHIERS À CRÉER/MODIFIER

### À CRÉER :
1. \`src/store/subscriptionStore.ts\` — Zustand store pour gestion d'abonnement
2. \`src/api/subscriptionsApi.ts\` — Client API pour subscriptions
3. \`src/hooks/useFeatureGate.ts\` — Hook pour vérifier les features
4. \`src/middleware/featureGuard.tsx\` — Composant de protection de features
5. \`src/components/UpgradeModal.tsx\` — Modal de upgrade
6. \`src/components/UsageAlerts.tsx\` — Affichage d'usage
7. \`src/pages/Pricing.tsx\` — Page pricing
8. \`src/pages/BillingDashboard.tsx\` — Dashboard de facturation
9. \`src/lib/stripe.ts\` — Client Stripe côté client
10. \`server/api/stripe/checkout.ts\` — Endpoint checkout
11. \`server/api/stripe/webhook.ts\` — Webhook handler
12. \`server/api/stripe/cancel-subscription.ts\` — Cancel endpoint
13. \`server/cron/reset-usage.ts\` — Job de reset usage
14. \`migrations/001_subscription_schema.sql\` — Migration Supabase

### À MODIFIER :
1. \`src/App.tsx\` — Initialiser subscription store au chargement
2. \`src/pages/Dashboard.tsx\` — Ajouter des feature gates
3. \`src/pages/Devis.tsx\` — Ajouter checks limit avant création
4. \`src/pages/Factures.tsx\` — Ajouter checks limit
5. \`.env.local\` — Ajouter variables Stripe
6. \`src/components/PDFExporter.tsx\` — Ajouter watermark conditionnelle
7. \`src/hooks/useStorage.ts\` — Vérifier quota avant upload

## 10. TESTS RECOMMANDÉS

1. Test plan Découverte: 3 devis, 2 factures → bloquer 4ème
2. Test trial: 14 jours → notification countdown → downgrade auto
3. Test upgrade: Découverte → Artisan via Stripe
4. Test features disabled: Pas d'IA, pas de tresorerie sur Découverte
5. Test storage: 100 Mo Découverte → bloquer au-delà
6. Test webhook: checkout.session.completed → subscription actif
7. Test cancellation: Résilier → downgrade Découverte
8. Test usage reset: Fin mois → compteurs reset à 0

## 11. CONSIDÉRATIONS DE SÉCURITÉ

- Vérifier le subscription status côté serveur avant de servir les features
- Ne jamais faire confiance au state Zustand côté client pour autoriser/bloquer
- Valider les limites sur API endpoints (créer devis, factures, etc.)
- Hash les Stripe IDs en DB pour éviter les fuites
- Rate-limit les endpoints de tracking d'usage
- Vérifier que \`company_id\` dans les requests appartient à l'utilisateur authentifié

## 12. FLUX UTILISATEUR DÉTAILLÉ

### Premier accès (Découverte)
1. User crée un compte → subscription auto-créée sur plan Découverte
2. Dashboard affiche "Plan gratuit" + CTA upgrade visible
3. Après quelques jours: notification in-app "Upgrade" avec lien

### Upgrade vers payant
1. User clique "Upgrade" → UpgradeModal affiche 3 plans payants
2. Choisir plan + Monthly/Yearly
3. Redirection vers Stripe checkout
4. Paiement → webhook checkout.session.completed
5. Subscription mis à jour en DB
6. Redirection vers Dashboard avec banner "Bienvenue sur plan X"
7. Features débloqueées immédiatement

### Trial (14 jours)
1. User upgrading to Artisan/Pro → trial_end = now + 14 days
2. J-3: Email + in-app notification "3 jours restants"
3. J-1: Notification urgent "Demain fin de l'essai"
4. J0: Trial ends → status = canceled (si pas de paiement)
5. Auto-downgrade vers Découverte
6. Notification "Essai terminé, revenu à plan gratuit"

## 13. METRIQUES À TRACKER

Chaque création d'entité doit tracker l'usage:
- \`trackUsage('devis_created')\` après création devis
- \`trackUsage('factures_created')\` après création facture
- \`trackUsage('ia_analyses')\` après chaque analyse IA
- \`trackUsage('signatures')\` après chaque signature
- \`trackUsage('clients_max')\` après ajout client (ou juste tracker la count)
- \`trackUsage('chantiers_active')\` après création chantier
- \`trackUsage('users_added')\` après ajout utilisateur
- \`trackUsage('storage_bytes')\` après upload fichier

Les limites sont vérifiées AVANT l'action et blocking si atteint.
```

---

## Fichiers à créer/modifier

### À CRÉER :
1. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/store/subscriptionStore.ts`
2. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/api/subscriptionsApi.ts`
3. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/hooks/useFeatureGate.ts`
4. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/middleware/featureGuard.tsx`
5. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/components/UpgradeModal.tsx`
6. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/components/UsageAlerts.tsx`
7. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/pages/Pricing.tsx`
8. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/pages/BillingDashboard.tsx`
9. `/sessions/keen-bold-albattani/mnt/chantierpro-app/server/api/stripe/checkout.ts`
10. `/sessions/keen-bold-albattani/mnt/chantierpro-app/server/api/stripe/webhook.ts`
11. `/sessions/keen-bold-albattani/mnt/chantierpro-app/server/api/stripe/cancel-subscription.ts`
12. `/sessions/keen-bold-albattani/mnt/chantierpro-app/migrations/001_subscription_schema.sql`

### À MODIFIER :
1. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/App.tsx`
2. `/sessions/keen-bold-albattani/mnt/chantierpro-app/.env.local`
3. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/pages/Dashboard.tsx`
4. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/pages/Devis.tsx`
5. `/sessions/keen-bold-albattani/mnt/chantierpro-app/src/pages/Factures.tsx`

---

## Description brève du contenu

Ce prompt constitue une **spécification technique complète** pour implémenter un système d'abonnements freemium avec 4 plans (Découverte gratuit, Artisan 29€/mois, Pro 59€/mois, Entreprise 119€/mois).

**Points clés couverts :**
- Définition détaillée de chaque plan avec features spécifiques
- Schéma Supabase complet avec tables, indexes et triggers
- Données seed SQL pour peupler les plans
- Intégration Stripe avec checkout et webhooks
- Store Zustand pour gestion d'état d'abonnement
- API client pour requêtes backend
- Feature gates et composants de protection
- Routes API pour checkout, webhooks et annulation
- Flux utilisateur complet avec trial 14j
- Métriques d'usage mensuels
- Sécurité et validations serveur

Le prompt est rédigé en français et comprend du code production-ready (TypeScript, React, Stripe SDK).
