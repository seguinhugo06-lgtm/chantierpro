import React from 'react';
import { CreditCard, Receipt, ClipboardList, CheckCircle, Circle, BarChart3 } from 'lucide-react';
import {
  ETAPE_STATUT,
  ETAPE_STATUT_LABELS,
  getEcheancierProgress,
  getNextEtapeAFacturer,
} from '../../lib/acompteUtils';
import { cn } from '../../lib/utils';
import { dateLue } from '../../lib/dates';
import { Bouton } from '../ui/Bouton';
import Pastille from '../ui/Pastille';

/** Ton de la pastille d'une étape d'échéancier : à facturer (neutre), facturée (chez le client), payée (acquise). */
const TON_ETAPE = { a_facturer: 'neutre', facture: 'info', paye: 'succes' };

/**
 * AcompteSuiviCard — le suivi de la facturation d'un devis signé, sous l'en-tête de sa fiche.
 *
 *  0. Facturé par situations de travaux : où en est le marché, lien vers le chantier ;
 *  1. Échéancier : avancement, étapes, « Facturer l'étape suivante » (bouton secondaire : l'en-tête porte le seul plein) ;
 *  2. Ancien acompte unique : ce qui reste à facturer (le solde se facture depuis l'en-tête).
 *
 * Audit UX du 20 oct. 2026 : le choix du mode de facturation (acompte, échéancier, solde, situation) n'est plus un
 * encadré vert sous le bouton « Facturer » — c'est ce bouton qui l'ouvre ; et rien ne s'affiche avant la signature
 * (« Options de facturation · Envoyer d'abord recommandé » occupait la fiche d'un brouillon). Les props de ces deux
 * anciens modes restent acceptées (appelant inchangé).
 */
export default function AcompteSuiviCard({
  devis,
  echeancier,
  facturesLiees = [],
  allDevis = [],
  textPrimary = 'text-encre',
  textMuted = 'text-encre-3',
  modeDiscret = false,
  formatMoney: fm,
  // Actions
  onFacturerEtape,
  onSelectFacture,
  onOpenSituation,
  acompteFacture = null,
  resteAFacturer = 0,
  situationsFacturees = [], // factures de situation de travaux déjà émises sur ce devis
  situationsEnCours = false, // le chantier a des situations sur ce devis (même pas encore facturées)
}) {
  // --- Mode 0 : facturé par situations de travaux ---
  // Plus de facture complète, d'acompte ni de solde : la dernière situation (décompte général définitif) solde le marché.
  if (situationsFacturees.length > 0 || situationsEnCours) {
    const cumul = situationsFacturees.reduce((s, f) => s + (f.total_ttc || 0), 0);
    return (
      <div className="rounded-2xl border border-bord bg-surface p-4 shadow-e1">
        <p className="flex items-center gap-2 text-base font-semibold text-encre">
          <BarChart3 size={18} aria-hidden="true" className="text-encre-3" /> Facturé par situations de travaux
        </p>
        <p className="mt-1 text-sm text-encre-2">
          {situationsFacturees.length === 0 ? 'Situations en cours sur le chantier, aucune facturée' : `${situationsFacturees.length} situation${situationsFacturees.length > 1 ? 's' : ''} facturée${situationsFacturees.length > 1 ? 's' : ''}`}
          {modeDiscret ? '' : ` · ${fm(cumul)} net à payer`}. Continuez depuis le chantier, onglet Situations, jusqu'à la dernière situation (DGD, tout à 100 %). La retenue de garantie éventuelle se règle à part, à sa libération.
        </p>
        {onOpenSituation && (
          <Bouton variante="secondaire" className="mt-3" onClick={onOpenSituation}>
            Ouvrir les situations du chantier
          </Bouton>
        )}
      </div>
    );
  }

  // --- Mode 1 : échéancier ---
  if (echeancier && echeancier.etapes?.length > 0) {
    const progress = getEcheancierProgress(echeancier.etapes);
    const nextEtape = getNextEtapeAFacturer(echeancier.etapes);
    const templateLabel = echeancier.template_key && echeancier.template_key !== 'custom'
      ? echeancier.template_key.replace(/-/g, '/')
      : 'Personnalisé';

    return (
      <div className="rounded-2xl border border-bord bg-surface p-4 shadow-e1">
        {/* En-tête */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-encre">
            <ClipboardList size={16} className="text-encre-3" aria-hidden="true" />
            Échéancier {templateLabel}
          </p>
          <span className="text-sm text-encre-3 tabular-nums">
            {progress.etapesFacturees}/{progress.totalEtapes} facturée{progress.etapesFacturees > 1 ? 's' : ''}
          </span>
        </div>

        {/* Avancement */}
        <div className="h-2 rounded-full mb-4 bg-surface-2" role="img" aria-label={`${Math.round(progress.pourcentageFacture)} % facturé`}>
          <div className="h-full rounded-full transition-all duration-500 bg-accent" style={{ width: `${progress.pourcentageFacture}%` }} />
        </div>

        {/* Étapes */}
        <ul className="space-y-1">
          {echeancier.etapes.map((etape) => {
            const isFacture = etape.statut === ETAPE_STATUT.FACTURE || etape.statut === ETAPE_STATUT.PAYE;
            const isNext = nextEtape && etape.numero === nextEtape.numero;
            const linkedFacture = etape.facture_id
              ? allDevis.find(d => d.id === etape.facture_id) || facturesLiees.find(f => f.id === etape.facture_id)
              : null;
            const ouvrable = isFacture && linkedFacture;
            const Ligne = ouvrable ? 'button' : 'div';
            return (
              <li key={etape.numero}>
                <Ligne
                  {...(ouvrable ? { type: 'button', onClick: () => onSelectFacture?.(linkedFacture) } : {})}
                  className={cn(
                    'w-full text-left flex items-center gap-2.5 px-3 py-2 min-h-[48px] rounded-xl transition-colors',
                    isNext && 'bg-fond',
                    ouvrable && 'hover:bg-surface-2',
                  )}
                >
                  {isFacture ? (
                    <CheckCircle size={16} className={etape.statut === ETAPE_STATUT.PAYE ? 'text-succes-texte' : 'text-encre-2'} aria-hidden="true" />
                  ) : (
                    <Circle size={16} className={isNext ? 'text-encre' : 'text-encre-3'} aria-hidden="true" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className={cn('block text-sm font-medium truncate', textPrimary)}>{etape.label}</span>
                    <span className={cn('block text-sm', textMuted)}>
                      {etape.pourcentage} %
                      {linkedFacture ? ` · ${linkedFacture.numero}` : ''}
                      {etape.date_facture ? ` · ${dateLue(etape.date_facture).toLocaleDateString('fr-FR')}` : ''}
                    </span>
                  </span>
                  <span className="text-sm font-semibold whitespace-nowrap tabular-nums text-encre">
                    {modeDiscret ? '·····' : fm(etape.montant_ttc)}
                  </span>
                  <Pastille ton={TON_ETAPE[etape.statut] || 'neutre'}>{ETAPE_STATUT_LABELS[etape.statut]}</Pastille>
                </Ligne>
              </li>
            );
          })}
        </ul>

        {/* Reste à facturer et étape suivante */}
        {nextEtape ? (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-encre-3">Reste à facturer</span>
              <span className="text-sm font-bold tabular-nums text-encre">
                {modeDiscret ? '·····' : fm(progress.resteAFacturer)}
              </span>
            </div>
            <Bouton variante="secondaire" icone={Receipt} pleineLargeur onClick={() => onFacturerEtape?.(echeancier, nextEtape)}>
              Facturer : {nextEtape.label} ({nextEtape.pourcentage} %)
            </Bouton>
          </div>
        ) : (
          <p className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-succes-fond text-succes-texte text-sm font-medium">
            <CheckCircle size={14} aria-hidden="true" />
            Échéancier terminé : toutes les étapes sont facturées
          </p>
        )}
      </div>
    );
  }

  // --- Mode 2 : ancien acompte unique (le solde se facture depuis l'en-tête de la fiche) ---
  if (devis.statut === 'acompte_facture' && !echeancier) {
    return (
      <div className="rounded-2xl border border-bord bg-surface p-4 shadow-e1">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-encre">
            <CreditCard size={16} className="text-encre-3" aria-hidden="true" />
            Acompte {devis.acompte_pct} % facturé
            {acompteFacture && (
              <button type="button" onClick={() => onSelectFacture?.(acompteFacture)} className="min-h-[44px] font-medium underline underline-offset-2 text-encre-2 hover:text-encre">
                {acompteFacture.numero}
              </button>
            )}
          </p>
          <span className={cn('text-sm font-bold tabular-nums whitespace-nowrap', textPrimary)}>
            {modeDiscret ? '·····' : fm(resteAFacturer)} restant
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface-2" role="img" aria-label={`Acompte de ${devis.acompte_pct} % facturé`}>
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${devis.acompte_pct}%` }} />
        </div>
      </div>
    );
  }

  return null;
}
