/**
 * TrialEndModal — One-time modal shown when the trial period ends
 *
 * Displays:
 *  - Usage summary: devis created, total invoiced, clients, chantiers
 *  - Side-by-side comparison: Gratuit vs Pro
 *  - CTA to upgrade or continue on Gratuit
 *
 * Shows only once (localStorage flag: cp_trial_end_modal_shown)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Check, Crown, Zap, ArrowRight, FileText, Users, Hammer, Euro
} from 'lucide-react';
import { useSubscriptionStore, PLANS } from '../../stores/subscriptionStore';
import { useClients, useDevis, useChantiers } from '../../context/DataContext';

const SHOWN_KEY = 'cp_trial_end_modal_shown';

export default function TrialEndModal() {
  const planId = useSubscriptionStore((s) => s.planId);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const isTrial = useSubscriptionStore((s) => s.isTrial());
  const daysLeft = useSubscriptionStore((s) => s.trialDaysLeft());
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);

  const { clients } = useClients();
  const { devis } = useDevis();
  const { chantiers } = useChantiers();

  const [visible, setVisible] = useState(false);

  // Determine if we should show the modal:
  // - Trial is expired (daysLeft === 0 AND was trialing OR subscription has trial_end in the past)
  // - User is now on gratuit
  // - Never shown before
  useEffect(() => {
    const wasShown = localStorage.getItem(SHOWN_KEY);
    if (wasShown) return;

    // Check if trial just ended: free plan + trial_end exists and is in the past
    const trialEnd = subscription?.trial_end;
    if (!trialEnd) return;

    const trialEndDate = new Date(trialEnd);
    const now = new Date();

    if (planId === 'gratuit' && !isTrial && trialEndDate < now) {
      // Trial has ended, show the modal
      setVisible(true);
    }
  }, [planId, isTrial, subscription]);

  const stats = useMemo(() => {
    const devisCount = Array.isArray(devis) ? devis.length : 0;
    const facturesCount = Array.isArray(devis) ? devis.filter(d => d.type === 'facture').length : 0;
    const totalFacture = Array.isArray(devis)
      ? devis.filter(d => d.type === 'facture').reduce((s, f) => s + (f.total_ttc || 0), 0)
      : 0;
    const clientsCount = Array.isArray(clients) ? clients.length : 0;
    const chantiersCount = Array.isArray(chantiers) ? chantiers.length : 0;

    return { devisCount, facturesCount, totalFacture, clientsCount, chantiersCount };
  }, [devis, clients, chantiers]);

  const handleClose = () => {
    localStorage.setItem(SHOWN_KEY, 'true');
    setVisible(false);
  };

  const handleUpgrade = () => {
    localStorage.setItem(SHOWN_KEY, 'true');
    setVisible(false);
    openUpgradeModal('generic');
  };

  if (!visible) return null;

  const gratuit = PLANS.gratuit;
  const pro = PLANS.pro;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-[trialEndSlideUp_400ms_ease-out]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Votre essai Pro est terminé
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Voici ce que vous avez accompli pendant votre essai
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Usage summary */}
        <div className="mx-6 p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10 border border-orange-100 dark:border-orange-800/30">
          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-3">
            Pendant votre essai
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={FileText} label="Devis créés" value={stats.devisCount} color="#f97316" />
            <StatCard icon={Euro} label="Facturé" value={`${stats.totalFacture.toLocaleString('fr-FR')} €`} color="#22c55e" />
            <StatCard icon={Users} label="Clients" value={stats.clientsCount} color="#3b82f6" />
            <StatCard icon={Hammer} label="Chantiers" value={stats.chantiersCount} color="#8b5cf6" />
          </div>
        </div>

        {/* Comparison */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Ce qui change avec le plan Gratuit
          </p>
          <div className="space-y-2">
            {[
              { feature: 'Devis par mois', gratuit: '5', pro: 'Illimités' },
              { feature: 'Clients', gratuit: '10', pro: 'Illimités' },
              { feature: 'Chantiers actifs', gratuit: '2', pro: 'Illimités' },
              { feature: 'Signatures électroniques', gratuit: false, pro: true },
              { feature: 'Export comptable (FEC)', gratuit: false, pro: true },
              { feature: 'Paiement en ligne', gratuit: false, pro: true },
              { feature: 'Trésorerie & Bilan', gratuit: false, pro: true },
              { feature: 'PDF sans watermark', gratuit: false, pro: true },
            ].map((row, i) => (
              <div key={i} className="flex items-center text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className="flex-1 text-slate-600 dark:text-slate-300">{row.feature}</span>
                <span className="w-20 text-center">
                  {typeof row.gratuit === 'boolean' ? (
                    row.gratuit
                      ? <Check size={14} className="text-green-500 mx-auto" />
                      : <X size={14} className="text-red-400 mx-auto" />
                  ) : (
                    <span className="text-slate-400">{row.gratuit}</span>
                  )}
                </span>
                <span className="w-20 text-center">
                  {typeof row.pro === 'boolean' ? (
                    row.pro
                      ? <Check size={14} className="text-green-500 mx-auto" />
                      : <X size={14} className="text-red-400 mx-auto" />
                  ) : (
                    <span className="text-orange-600 dark:text-orange-400 font-semibold">{row.pro}</span>
                  )}
                </span>
              </div>
            ))}
            {/* Column headers */}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-2">
          <button
            onClick={handleUpgrade}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Crown size={16} />
            Garder le Pro — {pro.priceMonthly.toFixed(2).replace('.', ',')}€/mois
            <ArrowRight size={16} />
          </button>
          <button
            onClick={handleClose}
            className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Continuer avec le plan Gratuit
          </button>
        </div>
      </div>

      <style>{`
        @keyframes trialEndSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/70 dark:bg-slate-800/50">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + '15' }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{value}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
