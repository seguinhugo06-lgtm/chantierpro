/**
 * UsageAlerts — la carte d'usage du plan sur l'accueil.
 *
 * Une jauge par ressource limitée (devis, clients, chantiers…). Une limite atteinte se lit
 * « Limite atteinte : 2 chantiers », en ton alerte (à surveiller) ; jamais une fraction impossible
 * comme « 10 / 2 ». Les chiffres viennent de `PLANS` (subscriptionStore) et de l'usage mesuré.
 */

import { useSubscriptionStore, PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';
import { ArrowRight, FileText, Users, Building2, Camera, HardHat } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { Bouton } from '../ui/Bouton';

const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;

// `limite(n)` : la phrase de la limite, pour « Limite atteinte : … ». Pas de jauge de stockage : il n'est ni compté ni
// appliqué (`computeLiveUsage` renvoie 0) ; une jauge « 0 Mo sur 100 Mo » serait un placebo (avis juriste du 26 oct., Q7).
const RESOURCE_CONFIG = {
  devis: { label: 'Devis ce mois', icon: FileText, unit: '', limite: (n) => `${pluriel(n, 'devis', 'devis')} ce mois` },
  clients: { label: 'Clients', icon: Users, unit: '', limite: (n) => pluriel(n, 'client', 'clients') },
  chantiers: { label: 'Chantiers', icon: Building2, unit: '', limite: (n) => pluriel(n, 'chantier', 'chantiers') },
  photos: { label: 'Photos', icon: Camera, unit: '', limite: (n) => pluriel(n, 'photo', 'photos') },
  equipe: { label: 'Équipe', icon: HardHat, unit: '', limite: (n) => pluriel(n, 'collaborateur', 'collaborateurs') }
};

/**
 * UsageBar — la jauge d'une ressource.
 */
function UsageBar({ resource, current, limit, icon: Icon, label, unit }) {
  if (limit === -1) return null; // Illimité : pas de jauge
  if (limit === 0 && current === 0) return null; // Ressource non utilisée

  const percent = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 100;
  const atteinte = current >= limit;
  const proche = !atteinte && percent >= 80;
  const unite = unit ? ` ${unit}` : '';

  return (
    <div className="space-y-1" data-jauge={resource} data-etat={atteinte ? 'atteinte' : proche ? 'proche' : 'normal'}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-1.5 text-encre-2 min-w-0">
          <Icon size={14} aria-hidden="true" className="flex-shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        <span className={`font-medium tabular-nums flex-shrink-0 ${atteinte || proche ? 'text-alerte-texte' : 'text-encre-2'}`}>
          {atteinte
            ? `Limite atteinte : ${RESOURCE_CONFIG[resource]?.limite(limit) ?? `${limit}${unite}`}`
            : `${Math.round(current * 10) / 10}${unite} sur ${limit}${unite}`}
        </span>
      </div>
      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-all duration-500 ${atteinte || proche ? 'bg-alerte-point' : 'bg-neutre-point'}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * UsageAlerts widget — rendu sur l'accueil
 */
export default function UsageAlerts({ isDark: _isDark, couleur: _couleur }) {
  const planId = useSubscriptionStore((s) => s.planId);
  const usage = useSubscriptionStore((s) => s.usage);
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);
  const subscription = useSubscriptionStore((s) => s.subscription);

  const plan = PLANS[planId] || PLANS.gratuit;
  const isFree = planId === 'gratuit';
  const planSuivant = PLANS[PLAN_ORDER[PLAN_ORDER.indexOf(planId) + 1]];
  // Seul le titulaire du compte gère l'abonnement
  const { canAccessBilling } = usePermissions();

  // Ressources proches de leur limite (80 %) ou au-delà
  const warnings = Object.entries(plan.limits).filter(([key, limit]) => {
    if (limit === -1 || limit === 0) return false;
    const current = usage[key] ?? 0;
    return current >= limit * 0.8;
  });

  const isTrial = subscription?.status === 'trialing';
  const trialEnd = subscription?.trial_end;
  const trialDays = trialEnd
    ? Math.max(0, Math.ceil((new Date(trialEnd) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Cette carte ne s'affiche que si elle a quelque chose à DIRE : une limite
  // qu'on approche, un essai qui se termine, ou un plan Gratuit à faire évoluer.
  // `warnings` était calculé mais jamais utilisé : la carte occupait le haut de
  // l'accueil à chaque visite, y compris pour un abonné payant à 0 % d'usage —
  // et repoussait sous la ligne de flottaison ce que l'artisan vient vraiment
  // chercher : ce qu'il a à encaisser.
  if (warnings.length === 0 && !isTrial && !isFree) return null;

  return (
    <div className="rounded-2xl border p-4 bg-surface border-bord" data-carte="usage-plan">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-2 text-encre-2 flex-shrink-0">
            <FileText size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-encre">
              Plan {plan.name}
            </h3>
            <p className="text-sm text-encre-3">
              {isTrial ? `Essai : ${pluriel(trialDays, 'jour restant', 'jours restants')}` : plan.description}
            </p>
          </div>
        </div>
        {canAccessBilling && isFree && planSuivant && (
          <Bouton variante="secondaire" taille="compacte" iconeFin={ArrowRight} onClick={() => openUpgradeModal()}>
            Passer au plan {planSuivant.name}
          </Bouton>
        )}
      </div>

      {isTrial && trialDays <= 3 && (
        <p className="mb-3 p-2.5 rounded-xl bg-alerte-fond text-sm text-alerte-texte">
          Votre essai se termine dans {pluriel(trialDays, 'jour', 'jours')}. Choisissez un plan pour continuer.
        </p>
      )}

      <div className="space-y-2.5">
        {Object.entries(RESOURCE_CONFIG).map(([key, config]) => (
          <UsageBar
            key={key}
            resource={key}
            current={usage[key] ?? 0}
            limit={plan.limits[key] ?? 0}
            icon={config.icon}
            label={config.label}
            unit={config.unit}
          />
        ))}
      </div>

      {/* Sur un plan payant proche d'une limite : un lien vers les offres (le plan Gratuit a déjà son bouton) */}
      {canAccessBilling && warnings.length > 0 && !isTrial && !isFree && (
        <div className="mt-3 pt-3 border-t border-bord">
          <button
            type="button"
            onClick={() => openUpgradeModal()}
            className="w-full min-h-[44px] text-center text-sm text-alerte-texte hover:underline font-medium transition-colors"
          >
            Vous approchez de vos limites : voir les offres
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact usage indicator for the sidebar or header
 */
export function UsageBadge() {
  const planId = useSubscriptionStore((s) => s.planId);
  const usage = useSubscriptionStore((s) => s.usage);
  const plan = PLANS[planId] || PLANS.gratuit;

  const atLimit = Object.entries(plan.limits).filter(([key, limit]) => {
    if (limit === -1 || limit === 0) return false;
    return (usage[key] ?? 0) >= limit;
  }).length;

  if (atLimit === 0) return null;

  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-alerte-fond text-alerte-texte">
      {atLimit} limite{atLimit > 1 ? 's' : ''} atteinte{atLimit > 1 ? 's' : ''}
    </span>
  );
}
