/**
 * TresorerieModule - Full-page cash flow management module
 *
 * Provides a comprehensive treasury overview for construction companies:
 * - KPI cards (solde, entrees/sorties prevues, projection)
 * - SVG bar chart with monthly cash flow + cumulative balance line
 * - Upcoming payments table (invoices + user previsions)
 * - Quick-add / edit modal for previsions (persisted to localStorage)
 * - Mark-as-paid, edit, delete on each row
 * - Solde initial configuration
 * - Alerts for projected negative balance or large upcoming payments
 * - Auto-sync: factures → entree previsions, depenses → sortie previsions
 * - TVA dashboard with collectée vs déductible breakdown
 *
 * All data comes via props (no DataContext import).
 *
 * @module TresorerieModule
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { toast } from '../../stores/toastStore';
import {
  Wallet, TrendingUp, Plus,
  AlertTriangle, Info, ArrowDown, ArrowUp, Clock, BarChart3, Save, Settings,
  Check, Edit3, Trash2, Zap,
  FileText, Receipt, Percent, Link2, Sliders, Target, TrendingDown, Activity,
  MessageCircle, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, HardHat, Download,
} from 'lucide-react';
import { useTresorerie } from '../../hooks/useTresorerie';
import { useTVA } from '../../hooks/useTVA';
import { useExportComptable } from '../../hooks/useExportComptable';
import useKeepInViewport from '../../hooks/useKeepInViewport';
import { formatClientName } from '../../lib/formatters';
import { statutPrevision, estPrevisionMiroir, seuilAlerteRegle } from '../../lib/previsions';
import { SEUIL_PAR_DEFAUT } from '../../lib/tresorerieReglages';
import TuileChiffre from '../ui/TuileChiffre';
import Modal from '../ui/Modal';
import Champ from '../ui/Champ';
import ChampChoix from '../ui/ChampChoix';
import { TitreSection } from '../ui/EnTete';
import LigneListe, { GroupeListe } from '../ui/LigneListe';
import Pastille, { PastilleStatut } from '../ui/Pastille';
import { Segmente, Onglets } from '../ui/Onglets';
import EtatVide from '../ui/EtatVide';
import Carte from '../ui/Carte';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import { remettreFichier } from '../../lib/natif';
import { statutFacture, resteAPayer, joursDeRetard, echeance, encaisseEntre, dateLocale } from '../../lib/paiementsFacture';
import { estOuverte, resteAFacturer } from '../../lib/ventes';
import { jourLocal, ajouterMois, dateLue } from '../../lib/dates';
import { captureException } from '../../lib/sentry';
import { telInternational } from '../../lib/messageRelance';
import { estFranchiseTva, regimeTvaTresorerie, tvaARegulariser } from '../../lib/franchiseTva';
import { decaisseDepense } from '../../lib/tvaDepenses';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

/** Period filter options shown in the header */
const PERIOD_OPTIONS = [
  { key: '1m', label: 'Ce mois' },
  { key: '3m', label: '3 mois' },
  { key: '6m', label: '6 mois' },
  { key: '1y', label: '1 an' },
];

/** Tabs for the main content area */
/** Statut affiché d'une échéance → ton de pastille (un mot, un ton : voir src/lib/statuts.js). */
const TON_STATUT_PAIEMENT = { 'Payé': 'succes', 'En retard': 'danger', 'En attente': 'info', 'Prévu': 'neutre', 'Signé': 'succes' };

const TABS = [
  { key: 'apercu', label: 'Aperçu' },
  { key: 'previsions', label: 'Prévisions' },
  { key: 'historique', label: 'Historique' },
  { key: 'mouvements', label: 'Mouvements' },
  { key: 'projections', label: 'Projections' },
  { key: 'tva', label: 'TVA' },
];

/** Scenario presets for projections */
const SCENARIO_PRESETS = [
  { key: 'current', label: 'Tendance actuelle', icon: Activity, entreesAdj: 0, sortiesAdj: 0, extraEntree: 0, extraSortie: 0 },
  { key: 'optimiste', label: 'Optimiste', icon: TrendingUp, entreesAdj: 20, sortiesAdj: -10, extraEntree: 0, extraSortie: 0 },
  { key: 'pessimiste', label: 'Pessimiste', icon: TrendingDown, entreesAdj: -25, sortiesAdj: 15, extraEntree: 0, extraSortie: 0 },
  { key: 'nouveau_chantier', label: 'Nouveau chantier', icon: Target, entreesAdj: 0, sortiesAdj: 0, extraEntree: 15000, extraSortie: 5000 },
];

/** French BTP TVA rates */
const TVA_RATES = {
  200: { label: '20%', rate: 0.20, desc: 'Taux normal' },
  100: { label: '10%', rate: 0.10, desc: 'Rénovation' },
  55: { label: '5,5%', rate: 0.055, desc: 'Rénovation énergétique' },
  21: { label: '2,1%', rate: 0.021, desc: 'Taux réduit' },
  0: { label: '0%', rate: 0, desc: 'Sans TVA' },
};

/** Categories for previsions */
const CATEGORIES_PREVISION = [
  'Client', 'Fournisseur', 'Loyer', 'Assurance',
  'Salaires', 'Materiaux', 'Sous-traitance', 'Divers',
];


/** Charges courantes BTP (Feature 6) */
const BTP_CHARGES = [
  { categorie: 'Assurance', items: [
    { label: 'Responsabilité civile pro (RC)', montantMoyen: 250, recurrence: 'mensuel' },
    { label: 'Décennale', montantMoyen: 800, recurrence: 'mensuel' },
    { label: 'Multirisque local', montantMoyen: 180, recurrence: 'mensuel' },
  ]},
  { categorie: 'Véhicules', items: [
    { label: 'Leasing véhicule utilitaire', montantMoyen: 650, recurrence: 'mensuel' },
    { label: 'Carburant / Gasoil', montantMoyen: 500, recurrence: 'mensuel' },
    { label: 'Entretien / CT véhicules', montantMoyen: 120, recurrence: 'mensuel' },
  ]},
  { categorie: 'Local / Dépôt', items: [
    { label: 'Loyer local / dépôt', montantMoyen: 1800, recurrence: 'mensuel' },
    { label: 'Électricité / Eau', montantMoyen: 200, recurrence: 'mensuel' },
    { label: 'Télécom / Internet', montantMoyen: 80, recurrence: 'mensuel' },
  ]},
  { categorie: 'Personnel', items: [
    { label: 'Salaires + charges', montantMoyen: 3500, recurrence: 'mensuel' },
    { label: 'Mutuelle / Prévoyance', montantMoyen: 150, recurrence: 'mensuel' },
    { label: 'Formation', montantMoyen: 200, recurrence: 'trimestriel' },
  ]},
  { categorie: 'Divers', items: [
    { label: 'Comptable / Expert', montantMoyen: 300, recurrence: 'mensuel' },
    { label: 'Logiciels / Abonnements', montantMoyen: 100, recurrence: 'mensuel' },
    { label: 'Fournitures de bureau', montantMoyen: 60, recurrence: 'mensuel' },
  ]},
];

/** Template recurring charges for first-time setup */
const STARTER_TEMPLATES = [
  { type: 'sortie', description: 'Loyer local / dépôt', montant: 1800, categorie: 'Loyer', recurrence: 'mensuel' },
  { type: 'sortie', description: 'Assurance pro (RC/décennale)', montant: 450, categorie: 'Assurance', recurrence: 'mensuel' },
  { type: 'sortie', description: 'Salaires et charges', montant: 8500, categorie: 'Salaires', recurrence: 'mensuel' },
  { type: 'sortie', description: 'Leasing véhicules', montant: 650, categorie: 'Divers', recurrence: 'mensuel' },
  { type: 'sortie', description: 'Carburant / déplacements', montant: 400, categorie: 'Divers', recurrence: 'mensuel' },
  { type: 'sortie', description: 'Fournitures bureau / télécom', montant: 150, categorie: 'Divers', recurrence: 'mensuel' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount || 0);

const formatCompact = (amount) => {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return `${Math.round(amount)}`;
};

const monthKey = (d) => ({ month: d.getMonth(), year: d.getFullYear() });
const sameMonth = (a, b) => a.month === b.month && a.year === b.year;
const periodMonths = (key) => {
  switch (key) { case '1m': return 1; case '3m': return 3; case '6m': return 6; case '1y': return 12; default: return 6; }
};

const genId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------


/**
 * SVG-based bar chart showing monthly entrées / sorties with a cumulative balance line.
 */
function CashFlowChart({ data, compact = false }) {
  // compact : téléphone, tout le graphique dans la largeur de l'écran, textes ≥ 12 px une fois réduits.
  const width = compact ? 420 : 800, height = compact ? 300 : 320;
  const padTop = compact ? 34 : 30, padBottom = compact ? 44 : 40, padLeft = compact ? 46 : 60, padRight = compact ? 8 : 20;
  const taille = compact ? 17 : 12;
  const k = taille / 11;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxBar = Math.max(...data.map((d) => Math.max(d.entrees, d.sorties)), 1);
  const allBalances = data.map((d) => d.cumulBalance);
  const minBal = Math.min(...allBalances, 0);
  const maxBal = Math.max(...allBalances, maxBar);
  const barScale = chartH / (maxBar * 1.15);
  const balMin = minBal - Math.abs(minBal) * 0.1;
  const balMax = maxBal + Math.abs(maxBal) * 0.1 || 1;
  const balRange = balMax - balMin || 1;

  const barGroupWidth = chartW / data.length;
  const barWidth = Math.min(barGroupWidth * 0.3, 32);
  const gap = 4;

  const tickCount = 5;
  const tickStep = maxBar / tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(i * tickStep));

  const balPoints = data.map((d, i) => {
    const x = padLeft + barGroupWidth * i + barGroupWidth / 2;
    const y = padTop + chartH - ((d.cumulBalance - balMin) / balRange) * chartH;
    return `${x},${y}`;
  }).join(' ');

  // Jetons du thème (lus en style : ils suivent le clair et le sombre). L'accent n'est pas un sens :
  // entrées en vert, sorties en rouge, solde à l'encre.
  const gridColor = 'rgb(var(--bord))';
  const textColor = 'rgb(var(--encre-3))';
  const positiveColor = 'rgb(var(--succes-point))';
  const negativeColor = 'rgb(var(--danger-point))';
  const soldeColor = 'rgb(var(--encre))';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {ticks.map((t) => {
        const y = padTop + chartH - t * barScale;
        return (
          <g key={`grid-${t}`}>
            <line x1={padLeft} y1={y} x2={width - padRight} y2={y} style={{ stroke: gridColor }} strokeDasharray="4 4" />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" style={{ fill: textColor }} fontSize={taille}>{formatCompact(t)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = padLeft + barGroupWidth * i + barGroupWidth / 2;
        const entreeH = d.entrees * barScale;
        const sortieH = d.sorties * barScale;
        const baseY = padTop + chartH;
        return (
          <g key={d.label}>
            <rect x={cx - barWidth - gap / 2} y={baseY - entreeH} width={barWidth} height={entreeH} rx={4} style={{ fill: positiveColor }} opacity={0.85} />
            <rect x={cx + gap / 2} y={baseY - sortieH} width={barWidth} height={sortieH} rx={4} style={{ fill: negativeColor }} opacity={0.85} />
            <text x={cx} y={baseY + taille + 8} textAnchor="middle" style={{ fill: textColor }} fontSize={taille} fontWeight={d.isCurrent ? 700 : 400}>{d.label}</text>
            {d.isCurrent && <circle cx={cx} cy={baseY + taille * 2 + 6} r={3} style={{ fill: positiveColor }} />}
          </g>
        );
      })}
      <polyline points={balPoints} fill="none" style={{ stroke: soldeColor }} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => {
        const x = padLeft + barGroupWidth * i + barGroupWidth / 2;
        const y = padTop + chartH - ((d.cumulBalance - balMin) / balRange) * chartH;
        return <circle key={`dot-${i}`} cx={x} cy={y} r={4} style={{ fill: soldeColor, stroke: 'rgb(var(--surface))' }} strokeWidth={2} />;
      })}
      <g transform={`translate(${compact ? 4 : padLeft}, 6)`}>
        <rect width={12 * k} height={12 * k} rx={3} style={{ fill: positiveColor }} opacity={0.85} />
        <text x={16 * k} y={10 * k} style={{ fill: textColor }} fontSize={taille}>Entrées</text>
        <rect x={80 * k} width={12 * k} height={12 * k} rx={3} style={{ fill: negativeColor }} opacity={0.85} />
        <text x={96 * k} y={10 * k} style={{ fill: textColor }} fontSize={taille}>Sorties</text>
        <line x1={160 * k} y1={6 * k} x2={180 * k} y2={6 * k} style={{ stroke: soldeColor }} strokeWidth={2.5} />
        <text x={184 * k} y={10 * k} style={{ fill: textColor }} fontSize={taille}>Solde cumulé</text>
      </g>
    </svg>
  );
}

/**
 * SVG-based projection chart showing scenario balance over 12 months.
 * Shows baseline vs adjusted scenario with colored fill area.
 */
function ProjectionChart({ baseline, scenario }) {
  const width = 800, height = 280;
  const padTop = 34, padBottom = 40, padLeft = 70, padRight = 20;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const taille = 14; // rendu ≥ 12 px : le graphique garde 700 px de large au moins (défilement au téléphone)

  const allVals = [...baseline.map(d => d.balance), ...scenario.map(d => d.balance)];
  const minVal = Math.min(...allVals, 0);
  const maxVal = Math.max(...allVals, 1);
  const range = (maxVal - minVal) * 1.15 || 1;
  const bottom = minVal - (maxVal - minVal) * 0.075;

  const toY = (v) => padTop + chartH - ((v - bottom) / range) * chartH;
  const toX = (i) => padLeft + (chartW / (baseline.length - 1 || 1)) * i;

  // Jetons du thème (clair et sombre) : la tendance en encre discrète, le scénario à l'accent, un solde négatif en ambre
  const gridColor = 'rgb(var(--bord))';
  const textColor = 'rgb(var(--encre-3))';
  const tendance = 'rgb(var(--encre-3))';
  const accent = 'rgb(var(--accent))';
  const negatif = 'rgb(var(--alerte-point))';

  const baselinePoints = baseline.map((d, i) => `${toX(i)},${toY(d.balance)}`).join(' ');
  const scenarioPoints = scenario.map((d, i) => `${toX(i)},${toY(d.balance)}`).join(' ');

  // Fill area between baseline and scenario
  const fillPath = scenario.map((d, i) => `${toX(i)},${toY(d.balance)}`).join(' L')
    + ` L${toX(baseline.length - 1)},${toY(baseline[baseline.length - 1].balance)}`
    + baseline.slice().reverse().map((d, i) => ` L${toX(baseline.length - 1 - i)},${toY(d.balance)}`).join('');

  // Grid ticks
  const tickCount = 5;
  const tickStep = (maxVal - minVal) / tickCount || 1;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round(minVal + i * tickStep));

  // Zero line
  const zeroY = toY(0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Évolution du solde projeté">
      {ticks.map((t) => {
        const y = toY(t);
        return (
          <g key={`grid-${t}`}>
            <line x1={padLeft} y1={y} x2={width - padRight} y2={y} style={{ stroke: gridColor }} strokeDasharray="4 4" />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" style={{ fill: textColor }} fontSize={taille}>{formatCompact(t)}</text>
          </g>
        );
      })}
      {minVal < 0 && <line x1={padLeft} y1={zeroY} x2={width - padRight} y2={zeroY} style={{ stroke: tendance }} strokeWidth={1.5} />}
      <polygon points={fillPath} style={{ fill: accent }} opacity={0.08} />
      <polyline points={baselinePoints} fill="none" style={{ stroke: tendance }} strokeWidth={2} strokeDasharray="6 4" strokeLinejoin="round" />
      <polyline points={scenarioPoints} fill="none" style={{ stroke: accent }} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {scenario.map((d, i) => (
        <circle key={`dot-${i}`} cx={toX(i)} cy={toY(d.balance)} r={4} style={{ fill: d.balance < 0 ? negatif : accent, stroke: 'rgb(var(--surface))' }} strokeWidth={2} />
      ))}
      {scenario.map((d, i) => (
        <text key={`label-${i}`} x={toX(i)} y={height - 10} textAnchor="middle" style={{ fill: textColor }} fontSize={taille} fontWeight={i === 0 ? 700 : 400}>{d.mois}</text>
      ))}
      <g transform={`translate(${padLeft}, 12)`}>
        <line x1={0} y1={6} x2={20} y2={6} style={{ stroke: tendance }} strokeWidth={2} strokeDasharray="6 4" />
        <text x={26} y={11} style={{ fill: textColor }} fontSize={taille}>Tendance actuelle</text>
        <line x1={180} y1={6} x2={200} y2={6} style={{ stroke: accent }} strokeWidth={2.5} />
        <text x={206} y={11} style={{ fill: textColor }} fontSize={taille}>Scénario ajusté</text>
      </g>
    </svg>
  );
}

const OPTIONS_RECURRENCE = [
  { valeur: 'unique', libelle: 'Unique' },
  { valeur: 'mensuel', libelle: 'Mensuel' },
  { valeur: 'trimestriel', libelle: 'Trimestriel' },
  { valeur: 'annuel', libelle: 'Annuel' },
];
const OPTIONS_CATEGORIE = CATEGORIES_PREVISION.map((c) => ({ valeur: c, libelle: c === 'Materiaux' ? 'Matériaux' : c }));
const OPTIONS_TAUX = [
  { valeur: 20, libelle: '20 %' },
  { valeur: 10, libelle: '10 %' },
  { valeur: 5.5, libelle: '5,5 %' },
  { valeur: 2.1, libelle: '2,1 %' },
  { valeur: 0, libelle: '0 % (exonéré)' },
];

/** Un choix (menu de l'app) avec son libellé, dans une fenêtre. */
function ChoixFenetre({ id, libelle, options, valeur, onChange }) {
  return (
    <div>
      <label id={`${id}-libelle`} htmlFor={id} className="block mb-1.5 text-sm font-medium text-encre-2">{libelle}</label>
      <ChampChoix id={id} idLibelle={`${id}-libelle`} titre={libelle} options={options} valeur={valeur} onChange={onChange} />
    </div>
  );
}

/**
 * Fenêtre d'ajout / de modification d'une prévision (ui/Modal : rôle dialogue, focus gardé, feuille du bas au téléphone).
 * La fenêtre ne se ferme qu'une fois la prévision enregistrée : refusée, la saisie reste (le refus est dit par le hook).
 */
function PrevisionModal({ isOpen, onClose, onSave, editItem }) {
  const [form, setForm] = useState({
    type: 'entree', description: '', montant: '',
    date: jourLocal(),
    categorie: 'Client', recurrence: 'unique',
  });
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({
        type: editItem.type || 'entree',
        description: editItem.description || '',
        montant: editItem.montant?.toString() || '',
        date: editItem.date || jourLocal(),
        categorie: editItem.categorie || 'Client',
        recurrence: editItem.recurrence || 'unique',
      });
    } else {
      setForm({ type: 'entree', description: '', montant: '', date: jourLocal(), categorie: 'Client', recurrence: 'unique' });
    }
  }, [editItem, isOpen]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const montant = parseFloat(String(form.montant).replace(',', '.'));
  const valide = form.description.trim() && Number.isFinite(montant) && montant > 0;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!valide || enCours) return;
    setEnCours(true);
    const ok = await onSave({
      ...form,
      description: form.description.trim(),
      montant,
      id: editItem?.id || genId(),
      createdAt: editItem?.createdAt || new Date().toISOString(),
      statut: statutPrevision(editItem?.statut),
    });
    setEnCours(false);
    if (ok) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title={editItem ? 'Modifier la prévision' : 'Nouvelle prévision'}
      footer={(
        <>
          <Bouton variante="discret" onClick={onClose}>Annuler</Bouton>
          <Bouton variante="principal" icone={Save} chargement={enCours} disabled={!valide} onClick={handleSubmit}>{editItem ? 'Enregistrer' : 'Ajouter'}</Bouton>
        </>
      )}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Segmente ariaLabel="Type" pleineLargeur valeur={form.type} onChange={(v) => handleChange('type', v)}
          options={[{ valeur: 'entree', libelle: 'Entrée' }, { valeur: 'sortie', libelle: 'Sortie' }]} />
        <Champ id="prevision-description" libelle="Description" value={form.description} placeholder="Ex. : facture chantier Dupont"
          onChange={(e) => handleChange('description', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Champ id="prevision-montant" libelle="Montant (€)" type="text" inputMode="decimal" value={form.montant} placeholder="0"
            onChange={(e) => handleChange('montant', e.target.value)} />
          <Champ id="prevision-date" libelle="Date prévue" type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ChoixFenetre id="prevision-categorie" libelle="Catégorie" options={OPTIONS_CATEGORIE} valeur={form.categorie} onChange={(v) => handleChange('categorie', v)} />
          <ChoixFenetre id="prevision-recurrence" libelle="Récurrence" options={OPTIONS_RECURRENCE} valeur={form.recurrence} onChange={(v) => handleChange('recurrence', v)} />
        </div>
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">Enregistrer</button>
      </form>
    </Modal>
  );
}

/**
 * Fenêtre d'ajout / de modification d'un mouvement (transaction réelle, TVA ventilée). Même règle : fermée seulement
 * une fois le mouvement enregistré.
 */
function MouvementModal({ isOpen, onClose, onSave, editItem }) {
  const [form, setForm] = useState({
    type: 'sortie', description: '', montant: '',
    date: jourLocal(),
    categorie: 'Divers', tauxTva: 20, autoliquidation: false,
    isRecurring: false, recurringFrequency: 'mensuel',
    notes: '',
  });
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({
        type: editItem.type || 'sortie',
        description: editItem.description || '',
        montant: editItem.montant?.toString() || '',
        date: editItem.date || jourLocal(),
        categorie: editItem.categorie || 'Divers',
        tauxTva: editItem.tauxTva ?? 20,
        autoliquidation: editItem.autoliquidation || false,
        isRecurring: editItem.isRecurring || false,
        recurringFrequency: editItem.recurringFrequency || 'mensuel',
        notes: editItem.notes || '',
      });
    } else {
      setForm({ type: 'sortie', description: '', montant: '', date: jourLocal(), categorie: 'Divers', tauxTva: 20, autoliquidation: false, isRecurring: false, recurringFrequency: 'mensuel', notes: '' });
    }
  }, [editItem, isOpen]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const montantNum = parseFloat(String(form.montant).replace(',', '.')) || 0;
  const montantHt = form.autoliquidation ? montantNum : montantNum / (1 + form.tauxTva / 100);
  const montantTva = form.autoliquidation ? 0 : montantNum - montantHt;
  const valide = form.description.trim() && montantNum > 0;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!valide || enCours) return;
    setEnCours(true);
    const ok = await onSave({
      ...form,
      description: form.description.trim(),
      montant: montantNum,
      montantHt: Math.round(montantHt * 100) / 100,
      montantTva: Math.round(montantTva * 100) / 100,
      id: editItem?.id || crypto.randomUUID(),
      createdAt: editItem?.createdAt || new Date().toISOString(),
      statut: editItem?.statut || 'prevu',
    });
    setEnCours(false);
    if (ok) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={editItem ? 'Modifier le mouvement' : 'Nouveau mouvement'}
      footer={(
        <>
          <Bouton variante="discret" onClick={onClose}>Annuler</Bouton>
          <Bouton variante="principal" icone={Save} chargement={enCours} disabled={!valide} onClick={handleSubmit}>{editItem ? 'Enregistrer' : 'Ajouter'}</Bouton>
        </>
      )}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Segmente ariaLabel="Type" pleineLargeur valeur={form.type} onChange={(v) => handleChange('type', v)}
          options={[{ valeur: 'entree', libelle: 'Entrée' }, { valeur: 'sortie', libelle: 'Sortie' }]} />
        <Champ id="mouvement-description" libelle="Description" value={form.description} placeholder="Ex. : paiement facture n° 124"
          onChange={(e) => handleChange('description', e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Champ id="mouvement-montant" libelle="Montant TTC (€)" type="text" inputMode="decimal" value={form.montant} placeholder="0"
            onChange={(e) => handleChange('montant', e.target.value)} />
          <ChoixFenetre id="mouvement-taux" libelle="Taux de TVA" options={OPTIONS_TAUX} valeur={form.tauxTva} onChange={(v) => handleChange('tauxTva', v)} />
          <Champ id="mouvement-date" libelle="Date" type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} />
        </div>
        {montantNum > 0 && (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 rounded-xl text-sm bg-surface-2 text-encre-2 tabular-nums">
            <span>HT : <strong className="text-encre">{formatCurrency(montantHt)}</strong></span>
            <span>TVA : <strong className="text-encre">{formatCurrency(montantTva)}</strong></span>
            <span>TTC : <strong className="text-encre">{formatCurrency(montantNum)}</strong></span>
          </p>
        )}
        <ChoixFenetre id="mouvement-categorie" libelle="Catégorie" options={OPTIONS_CATEGORIE} valeur={form.categorie} onChange={(v) => handleChange('categorie', v)} />
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none text-sm text-encre-2">
            <input type="checkbox" checked={form.autoliquidation} onChange={(e) => handleChange('autoliquidation', e.target.checked)} className="w-5 h-5 rounded accent-accent" />
            Autoliquidation de la TVA
          </label>
          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none text-sm text-encre-2">
            <input type="checkbox" checked={form.isRecurring} onChange={(e) => handleChange('isRecurring', e.target.checked)} className="w-5 h-5 rounded accent-accent" />
            Récurrent
          </label>
        </div>
        {form.isRecurring && (
          <ChoixFenetre id="mouvement-frequence" libelle="Fréquence" options={OPTIONS_RECURRENCE.filter((o) => o.valeur !== 'unique')}
            valeur={form.recurringFrequency} onChange={(v) => handleChange('recurringFrequency', v)} />
        )}
        <Champ id="mouvement-notes" libelle="Notes" facultatif value={form.notes} placeholder="Référence, détails…" onChange={(e) => handleChange('notes', e.target.value)} />
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">Enregistrer</button>
      </form>
    </Modal>
  );
}
// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

// isDark et couleur restent acceptés : jetons du thème (clair, sombre, accent de l'entreprise)
// peutModifier : faux en lecture seule (rôle « readonly », Finances en consultation) — rien à ajouter, modifier ni supprimer
export default function TresorerieModule({
  devis = [], depenses = [], chantiers: _chantiers = [], clients = [],
  entreprise, isDark: _isDark = false, couleur: _couleur, setPage: _setPage, ouvrirDocument,
  modeDiscret = false, paiements = [], peutModifier = true,
}) {
  // Helper: mask financial amounts when modeDiscret is active
  const formatMoney = useCallback((amount) => modeDiscret ? '••••\u00a0€' : formatCurrency(amount), [modeDiscret]);
  // -- Hook: tresorerie data from useTresorerie ─────────────────────
  const {
    previsions, setPrevisions, loading: tresorerieLoading,
    addPrevision, updatePrevision, deletePrevision: hookDeletePrevision, markAsPaid: hookMarkAsPaid,
    settings: reglagesTresorerie, updateSettings,
    reglements,
    mouvements, addMouvement, updateMouvement, deleteMouvement, validerMouvement,
    mouvementsKPIs,
    getSyncedIds, saveSyncedIds,
  } = useTresorerie();

  // Micro-entreprise : franchise en base de TVA (art. 293 B du CGI), comme ses devis et factures, qui
  // s'impriment sans TVA (src/lib/franchiseTva.js). Avant (vu sur le compte démo le 11 oct. 2026), le régime
  // réglé par défaut (« trimestriel ») lui affichait une « TVA déductible » et un « crédit estimé » qu'elle ne
  // peut pas récupérer.
  const franchiseImposee = estFranchiseTva(entreprise);
  const settings = useMemo(() => ({
    ...reglagesTresorerie,
    regimeTva: regimeTvaTresorerie(reglagesTresorerie, entreprise),
  }), [reglagesTresorerie, entreprise]);

  // -- Hook: TVA computations ──────────────────────────────────────
  const tvaHook = useTVA({ devis, depenses, mouvements, settings });

  // -- Hook: Export comptable ──────────────────────────────────────
  const { exportJournalVentes, exportJournalAchats, exportMouvements: exportMouvementsCSV } = useExportComptable({
    devis, depenses, reglements, mouvements, clients, entreprise,
  });

  // -- State ----------------------------------------------------------------
  const [period, setPeriod] = useState('6m');
  const [activeTab, setActiveTab] = useState('apercu');
  const [toutesEcheances, setToutesEcheances] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  // Seuil d'alerte en cours de saisie (null : pas de saisie). Enregistré à la sortie du champ ou à Entrée. Avant (relecture
  // du 26 oct. 2026), chaque frappe enregistrait : « 5000 » valait le seuil par défaut, donc « non réglé », et le champ se
  // vidait sous les doigts ; 50 000 € était impossible à saisir.
  const [brouillonSeuil, setBrouillonSeuil] = useState(null);
  const [seuilParDefautSaisi, setSeuilParDefautSaisi] = useState(false);
  const settingsPanelRef = useRef(null);
  useKeepInViewport(settingsPanelRef, showSettingsPanel);
  const [showMouvModal, setShowMouvModal] = useState(false);
  const [editingMouv, setEditingMouv] = useState(null);
  const [mouvFilter, setMouvFilter] = useState('all'); // all | entree | sortie
  const [mouvStatutFilter, setMouvStatutFilter] = useState('all'); // all | prevu | paye
  const [showPrefillConfirm, setShowPrefillConfirm] = useState(false);
  const [showEncaisserWidget, setShowEncaisserWidget] = useState(true);
  const [showChargesBTP, setShowChargesBTP] = useState(false); // UX: fermé par défaut, l'user ouvre s'il veut
  const [confirmingPaidId, setConfirmingPaidId] = useState(null);
  const [alertDismissed, setAlertDismissed] = useState(() => {
    try { return localStorage.getItem('cp_treso_alert_dismissed') === '1'; } catch { return false; }
  });

  // Wizard bootstrapping state
  const [wizardDismissed] = useState(() => {
    try { return localStorage.getItem('cp_treso_wizard_done') === '1'; } catch { return false; }
  });
  const [wizardStep, setWizardStep] = useState(0); // 0=solde, 1=charges, 2=done
  const [wizardCharges, setWizardCharges] = useState({}); // { chargeLabel: montant }
  const [wizardMinimized, setWizardMinimized] = useState(false); // UX-017: minimizable wizard
  const showWizard = !wizardDismissed && previsions.length === 0 && !tresorerieLoading && !(settings.soldeInitial > 0);

  const handleWizardFinish = useCallback(async () => {
    // Step 0: save solde initial (already handled by updateSettings in the form)
    // Step 1: add selected charges
    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), 5);
    let i = 0;
    for (const [label, montant] of Object.entries(wizardCharges)) {
      if (!montant || montant <= 0) continue;
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i * 2);
      await addPrevision({
        id: genId(),
        type: 'sortie',
        description: label,
        montant: Number(montant),
        date: jourLocal(date),
        categorie: 'Divers',
        recurrence: 'mensuel',
        statut: 'prevu',
        source: 'wizard',
        createdAt: new Date().toISOString(),
      });
      i++;
    }
    try { localStorage.setItem('cp_treso_wizard_done', '1'); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
    setWizardStep(2);
  }, [wizardCharges, addPrevision]);

  // ── "À encaisser maintenant" computation ───────────────────────────
  const encaisserData = useMemo(() => {
    const now = new Date();
    // Factures seulement (panne verte du 9 oct. : la liste comptait des DEVIS signés, avec un
    // « retard » calculé sur leur date de validité). Reste dû et échéance : src/lib/paiementsFacture.js.
    const facturesImpayees = devis.filter(d =>
      d.type === 'facture' && d.facture_type !== 'avoir' &&
      ['envoye', 'vu', 'facture', 'partielle', 'en_retard'].includes(statutFacture(d, paiements, now))
    );

    const items = facturesImpayees.map(f => {
      const ech = echeance(f);
      // Jour local (avant : toISOString d'un minuit local = la veille en UTC, échéance affichée un jour trop tôt)
      const echeance_ = ech ? jourLocal(ech) : '';
      const reste = resteAPayer(f, paiements);
      const joursRetard = joursDeRetard(f, paiements, now);
      const client = clients.find(c => c.id === f.client_id);
      const clientNom = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : `Client #${f.client_id || '?'}`;
      const clientTel = client?.telephone || client?.tel || '';

      return {
        id: f.id,
        numero: f.numero || f.id?.slice(-6) || '—',
        clientNom,
        clientTel,
        montant: reste,
        echeance: echeance_,
        joursRetard,
        isOverdue: joursRetard > 0,
        statut: f.statut,
        // Le statut lu partout ailleurs (« Payée en partie », « En retard »…) : audit UX du 20 oct. 2026 (P1), la même
        // facture était « Payée en partie » sur sa fiche et « À payer » ici
        statutVu: statutFacture(f, paiements, now),
        type: f.type || 'devis',
      };
    }).filter(i => i.montant > 0).sort((a, b) => b.joursRetard - a.joursRetard);

    const totalAEncaisser = items.reduce((s, i) => s + i.montant, 0);
    const overdueItems = items.filter(i => i.isOverdue);
    const overdueTotal = overdueItems.reduce((s, i) => s + i.montant, 0);

    return { items, totalAEncaisser, overdueItems, overdueTotal };
  }, [devis, clients, paiements]);

  // ── Escape key handler: close all modals/panels ──────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddModal) { setShowAddModal(false); setEditingItem(null); }
        else if (showMouvModal) { setShowMouvModal(false); setEditingMouv(null); }
        else if (showSettingsPanel) setShowSettingsPanel(false);
        else if (showPrefillConfirm) setShowPrefillConfirm(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, showMouvModal, showSettingsPanel, showPrefillConfirm]);

  // -- Projection scenario state -------------------------------------------
  const [scenarioPreset, setScenarioPreset] = useState('current');
  const [scenarioParams, setScenarioParams] = useState({
    entreesAdj: 0,     // % adjustment on avg monthly entrées (-50 to +100)
    sortiesAdj: 0,     // % adjustment on avg monthly sorties (-50 to +100)
    extraEntree: 0,    // fixed additional monthly entrée (€)
    extraSortie: 0,    // fixed additional monthly sortie (€)
  });

  const handleScenarioPreset = useCallback((presetKey) => {
    const preset = SCENARIO_PRESETS.find(p => p.key === presetKey);
    if (preset) {
      setScenarioPreset(presetKey);
      setScenarioParams({
        entreesAdj: preset.entreesAdj,
        sortiesAdj: preset.sortiesAdj,
        extraEntree: preset.extraEntree,
        extraSortie: preset.extraSortie,
      });
    }
  }, []);

  const handleScenarioSlider = useCallback((field, value) => {
    setScenarioPreset('custom');
    setScenarioParams(prev => ({ ...prev, [field]: value }));
  }, []);

  // ── Auto-sync: factures → entree previsions ──────────────────────
  const syncedIdsRef = useRef(null);
  useEffect(() => {
    if (tresorerieLoading) return;
    if (!syncedIdsRef.current) syncedIdsRef.current = getSyncedIds();

    const factures = devis.filter(d => d.type === 'facture' && !['refuse', 'brouillon'].includes(d.statut));
    const synced = syncedIdsRef.current;
    const newPrevisions = [];

    factures.forEach(f => {
      if (synced.devis.includes(f.id)) return;
      if (previsions.some(p => p.linkedId === f.id && p.source === 'auto_facture')) return;

      const client = clients.find(c => c.id === f.client_id);
      const reste = (f.total_ttc || 0) - (f.montant_paye || 0);
      if (reste <= 0) return;

      newPrevisions.push({
        id: genId(),
        type: 'entree',
        description: `Facture ${f.numero || f.id?.slice(-6) || '—'} – ${formatClientName(client)}`,
        montant: reste,
        date: f.date_echeance || f.date_validite || f.date || jourLocal(),
        categorie: 'Client',
        recurrence: 'unique',
        statut: (f.statut === 'payee' || f.statut === 'paye') ? 'paye' : 'prevu',
        source: 'auto_facture',
        linkedId: f.id,
        createdAt: new Date().toISOString(),
      });
      synced.devis.push(f.id);
    });

    if (newPrevisions.length > 0) {
      setPrevisions(list => [...list, ...newPrevisions]);
      syncedIdsRef.current = synced;
      saveSyncedIds(synced);
    }
  }, [devis, clients, tresorerieLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-sync: depenses → sortie previsions ──────────────────────
  useEffect(() => {
    if (tresorerieLoading) return;
    if (!syncedIdsRef.current) syncedIdsRef.current = getSyncedIds();

    const synced = syncedIdsRef.current;
    const newPrevisions = [];

    depenses.forEach(dep => {
      if (synced.depenses.includes(dep.id)) return;
      if (previsions.some(p => p.linkedId === dep.id && p.source === 'auto_depense')) return;
      if (!dep.montant || dep.montant <= 0) return;

      newPrevisions.push({
        id: genId(),
        type: 'sortie',
        description: dep.description || dep.libelle || `Dépense ${dep.fournisseur || dep.categorie || ''}`.trim(),
        montant: decaisseDepense(dep, { franchise: franchiseImposee }),
        date: dep.date || dep.createdAt || jourLocal(),
        categorie: dep.categorie || 'Fournisseur',
        recurrence: 'unique',
        statut: 'paye',
        source: 'auto_depense',
        linkedId: dep.id,
        createdAt: new Date().toISOString(),
      });
      synced.depenses.push(dep.id);
    });

    if (newPrevisions.length > 0) {
      setPrevisions(list => [...list, ...newPrevisions]);
      syncedIdsRef.current = synced;
      saveSyncedIds(synced);
    }
  }, [depenses, tresorerieLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-sync: devis acceptés (signés) → entree previsions ─────
  useEffect(() => {
    if (tresorerieLoading) return;
    if (!syncedIdsRef.current) syncedIdsRef.current = getSyncedIds();

    // Devis signés, sur place (« accepte ») ou par le lien (« signe »)
    const acceptedDevis = devis.filter(d => d.type === 'devis' && ['accepte', 'signe'].includes(d.statut));
    const synced = syncedIdsRef.current;
    if (!synced.acceptedDevis) synced.acceptedDevis = [];
    const newPrevisions = [];

    acceptedDevis.forEach(d => {
      if (synced.acceptedDevis.includes(d.id)) return;
      if (previsions.some(p => p.linkedId === d.id && p.source === 'auto_devis_accepte')) return;

      const client = clients.find(c => c.id === d.client_id);
      newPrevisions.push({
        id: genId(),
        type: 'entree',
        description: `Devis signé ${d.numero || d.id?.slice(-6) || '—'} – ${formatClientName(client)}`,
        montant: d.total_ttc || 0,
        date: d.date_validite || d.date || jourLocal(),
        categorie: 'Client',
        recurrence: 'unique',
        statut: 'prevu',
        source: 'auto_devis_accepte',
        linkedId: d.id,
        createdAt: new Date().toISOString(),
      });
      synced.acceptedDevis.push(d.id);
    });

    if (newPrevisions.length > 0) {
      setPrevisions(list => [...list, ...newPrevisions]);
      syncedIdsRef.current = synced;
      saveSyncedIds(synced);
    }
  }, [devis, clients, tresorerieLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // (Les paiements reçus ne sont plus recopiés en « mouvements » : la copie, faute de lien enregistré en base,
  //  était recréée sur chaque appareil et doublait la TVA collectée — recette du 9 oct. 2026. Les paiements
  //  comptent directement dans le solde et le graphique, src/lib/paiementsFacture.js `encaisseEntre`.)

  // ── Auto-renewal: generate missing future recurring instances ───
  const renewalDoneRef = useRef(false);
  useEffect(() => {
    if (tresorerieLoading || renewalDoneRef.current || previsions.length === 0) return;
    renewalDoneRef.current = true;

    // Limit auto-renewal to 3 months ahead (not 12) to avoid over-generation
    const maxFutureMonths = 3;
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + maxFutureMonths);
    const now = new Date();
    const newInstances = [];

    // Build a global dedup key set: description + YYYY-MM + montant
    const globalDedup = new Set(
      previsions.map(p => {
        const d = new Date(p.date);
        return `${p.description}|${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}|${p.montant}`;
      })
    );

    // Find parent recurring previsions (those with recurrence !== 'unique' and no recurrenceParentId)
    const parents = previsions.filter(p => p.recurrence && p.recurrence !== 'unique' && !p.recurrenceParentId);

    parents.forEach(parent => {
      const interval = parent.recurrence === 'mensuel' ? 1 : parent.recurrence === 'trimestriel' ? 3 : 12;
      // Find all existing instances (children + parent itself)
      const family = previsions.filter(p => p.id === parent.id || p.recurrenceParentId === parent.id);
      const existingDates = new Set(family.map(p => p.date));
      const latest = family.reduce((max, p) => (p.date > max ? p.date : max), parent.date);
      const aujourdhui = jourLocal(now);
      const limite = jourLocal(maxDate);

      // Échéances suivantes, comptées depuis la date du parent (le jour d'origine est gardé : 31 → 30 nov. → 31 déc.)
      let ajoutees = 0;
      for (let k = 1; k <= 120 && ajoutees < 4; k++) {
        const dateStr = ajouterMois(parent.date, interval * k);
        if (!dateStr || dateStr > limite) break;
        if (dateStr <= latest || dateStr < aujourdhui) continue; // déjà générées, ou passées
        if (existingDates.has(dateStr)) continue;
        const nextDate = dateLocale(dateStr);

        // Strong dedup: check description + month + montant
        const dedupKey = `${parent.description}|${nextDate.getFullYear()}-${String(nextDate.getMonth()).padStart(2, '0')}|${parent.montant}`;
        if (globalDedup.has(dedupKey)) continue;
        globalDedup.add(dedupKey);

        existingDates.add(dateStr);
        ajoutees++;
        newInstances.push({
          ...parent,
          id: genId(),
          date: dateStr,
          statut: 'prevu',
          recurrenceParentId: parent.id,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // addPrevision ajoute l'échéance à l'écran et l'enregistre : un setPrevisions en plus la doublait en mémoire
    newInstances.forEach(inst => addPrevision(inst).catch((err) => captureException(err, { context: 'échéance récurrente' })));
  }, [previsions, tresorerieLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // CRUD handlers (delegate to hook)
  const handleSavePrevision = useCallback(async (prev) => {
    const existing = previsions.find(p => p.id === prev.id);
    if (existing) {
      const modifiee = await updatePrevision(prev.id, prev);
      if (!modifiee) return false; // refusée : dite par le hook, la fenêtre et la saisie restent
    } else {
      const creee = await addPrevision(prev);
      if (!creee) return false;
      // Échéances suivantes seulement si la première est enregistrée (sinon : refusée, déjà signalée)
      if (prev.recurrence && prev.recurrence !== 'unique') {
        const instances = generateRecurring(prev);
        for (const inst of instances) {
          await addPrevision(inst);
        }
      }
    }
    setEditingItem(null);
    return true;
  }, [previsions, addPrevision, updatePrevision]);

  const handleDeletePrevision = useCallback(async (id) => {
    await hookDeletePrevision(id);
  }, [hookDeletePrevision]);

  const handleMarkAsPaid = useCallback(async (id) => {
    await hookMarkAsPaid(id);

    // Auto-renewal: if the prevision is recurring, generate the next instance
    const paid = previsions.find(p => p.id === id);
    if (paid && paid.recurrence && paid.recurrence !== 'unique') {
      const interval = paid.recurrence === 'mensuel' ? 1 : paid.recurrence === 'trimestriel' ? 3 : 12;
      const paidDate = new Date(paid.date);
      const nextDate = new Date(paidDate);
      nextDate.setMonth(nextDate.getMonth() + interval);
      // Only generate if within 12 months from now
      const maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      if (nextDate <= maxDate) {
        // Check if next instance already exists
        const nextDateStr = jourLocal(nextDate);
        const alreadyExists = previsions.some(p =>
          p.recurrenceParentId === (paid.recurrenceParentId || paid.id) &&
          p.date === nextDateStr && p.statut === 'prevu'
        );
        if (!alreadyExists) {
          await addPrevision({
            ...paid,
            id: genId(),
            date: nextDateStr,
            statut: 'prevu',
            recurrenceParentId: paid.recurrenceParentId || paid.id,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }, [hookMarkAsPaid, previsions, addPrevision]);

  // WhatsApp relance for overdue invoices
  const handleWhatsAppRelance = useCallback((item) => {
    const msg = encodeURIComponent(
      `Bonjour ${item.clientNom},\n\nJe me permets de vous relancer concernant la facture n°${item.numero} d'un montant de ${formatCurrency(item.montant)} €.\n\n${item.joursRetard > 0 ? `Cette facture est en retard de ${item.joursRetard} jour${item.joursRetard > 1 ? 's' : ''}. ` : ''}Pourriez-vous procéder au règlement ?\n\nMerci d'avance,\nCordialement`
    );
    // Indicatif international, chiffres seuls (wa.me refuse « +33… » et « 06.12… »)
    const tel = telInternational(item.clientTel || '');
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
  }, []);

  // Add BTP charge as prevision
  const handleAddBTPCharge = useCallback(async (charge) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), 5);
    await addPrevision({
      id: genId(),
      type: 'sortie',
      description: charge.label,
      montant: charge.montantMoyen,
      date: jourLocal(date),
      categorie: charge.categorie || 'Divers',
      recurrence: charge.recurrence || 'mensuel',
      statut: 'prevu',
      source: 'btp_charge',
      createdAt: new Date().toISOString(),
    });
  }, [addPrevision]);

  const handleEditPrevision = useCallback((item) => {
    // La ligne affichée porte un statut traduit (« Payé », « En retard ») : l'enregistrer tel quel
    // sortait la prévision des projections, ou la rendait de nouveau « à payer ». On édite l'originale.
    setEditingItem(previsions.find((x) => x.id === item.id) || item);
    setShowAddModal(true);
  }, [previsions]);

  // ── Mouvement handlers ─────────────────────────────────────────────
  const handleSaveMouvement = useCallback(async (mouv) => {
    const ecrit = editingMouv ? await updateMouvement(mouv.id, mouv) : await addMouvement(mouv);
    if (!ecrit) return false; // refusé : dit par le hook, la fenêtre et la saisie restent
    setEditingMouv(null);
    return true;
  }, [editingMouv, addMouvement, updateMouvement]);

  const handleEditMouvement = useCallback((item) => {
    setEditingMouv(item);
    setShowMouvModal(true);
  }, []);

  const handleDeleteMouvement = useCallback(async (id) => {
    await deleteMouvement(id);
  }, [deleteMouvement]);

  const handleValiderMouvement = useCallback(async (id) => {
    await validerMouvement(id);
  }, [validerMouvement]);

  // Filtered mouvements for Mouvements tab
  const filteredMouvements = useMemo(() => {
    let result = [...mouvements];
    if (mouvFilter !== 'all') result = result.filter(m => m.type === mouvFilter);
    if (mouvStatutFilter !== 'all') result = result.filter(m => m.statut === mouvStatutFilter);
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [mouvements, mouvFilter, mouvStatutFilter]);

  const handlePrefill = useCallback(async () => {
    // Dedup: skip templates that already exist (same description)
    const existingDescs = new Set(previsions.map(p => p.description?.toLowerCase().trim()));
    const toAdd = STARTER_TEMPLATES.filter(t => !existingDescs.has(t.description.toLowerCase().trim()));
    if (toAdd.length === 0) return;

    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), 5);
    for (let i = 0; i < toAdd.length; i++) {
      const tmpl = toAdd[i];
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i * 3);
      await addPrevision({
        ...tmpl,
        id: genId(),
        date: jourLocal(date),
        statut: 'prevu',
        createdAt: new Date().toISOString(),
      });
    }
    setShowPrefillConfirm(false);
  }, [addPrevision, previsions]);

  // Generate recurring instances helper (3 months ahead max to avoid duplication with auto-renewal)
  const generateRecurring = (parent) => {
    const instances = [];
    const interval = parent.recurrence === 'mensuel' ? 1 : parent.recurrence === 'trimestriel' ? 3 : 12;
    const maxMonths = 3; // Only create 3 months ahead; auto-renewal handles the rest
    const maxIterations = Math.ceil(maxMonths / interval);
    for (let i = 1; i <= maxIterations; i++) {
      const date = ajouterMois(parent.date, interval * i);
      if (!date) break;
      instances.push({
        ...parent,
        id: genId(),
        date,
        recurrenceParentId: parent.id,
        statut: 'prevu',
      });
    }
    return instances;
  };

  // -- Derived data ---------------------------------------------------------
  const now = useMemo(() => new Date(), []);

  // Une facture, un devis signé ou une dépense est compté depuis le document lui-même ; sa copie
  // automatique en prévision (« miroir ») le comptait une seconde fois : solde, entrées prévues,
  // graphique et projections étaient gonflés. Les calculs ne lisent que les prévisions saisies.
  const previsionsComptees = useMemo(() => previsions.filter((p) => !estPrevisionMiroir(p)), [previsions]);

  const {
    soldeActuel,
    entreesPrevues, sortiesPrevues, projectionFinMois,
    monthlyData, upcomingPayments,
    autoSyncCount,
    projections, negativeMonth, thresholdMonth, avgMonthlyEntrees, avgMonthlySorties,
    recurringSummary,
  } = useMemo(() => {
    // 1. Documents : une seule définition (src/lib/ventes.js). Recette du 9 oct. 2026 : un devis signé était
    //    compté en entier PLUS ses factures, une facture partiellement payée en entier, les paiements partiels
    //    ignorés par le solde, les échéances en retard et celles du jour sorties des totaux.
    const facturesOuvertes = devis.filter((f) => estOuverte(f, paiements, now));
    const devisAFacturer = devis.filter((d) => resteAFacturer(d, devis) > 0);
    const jourDe = (v) => {
      const d = dateLocale(v);
      return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
    };
    const echeanceDe = (f) => jourDe(echeance(f)) || jourDe(f.date);

    // Solde : solde initial à SA date + ce qui est entré et sorti depuis (paiements reçus, factures payées,
    // dépenses, prévisions réglées). Avant : la date du solde était ignorée, toute l'histoire s'y ajoutait.
    const depuis = settings.soldeDate || '0000-01-01';
    const totalEnc = encaisseEntre(devis, paiements, depuis, '9999-12-31');
    // Sorties d'argent : le TTC payé quand la TVA de la dépense est connue (son montant est HT, src/lib/tvaDepenses.js)
    const totalDep = depenses.filter((d) => (jourDe(d.date || d.createdAt) || depuis) >= depuis).reduce((s, d) => s + decaisseDepense(d, { franchise: franchiseImposee }), 0);

    // Une prévision ne compte qu'une fois (même identifiant) ; avant, le dédoublonnage par « libellé + mois +
    // montant » fusionnait deux vraies échéances identiques et masquait un double ajout en mémoire.
    const vusIds = new Set();
    const dedupPrevisions = previsionsComptees.filter((p) => {
      if (!p?.id) return true;
      if (vusIds.has(p.id)) return false;
      vusIds.add(p.id);
      return true;
    });

    // Prévisions réglées depuis la date du solde (saisies à la main)
    const regleeDepuis = (p) => p.statut === 'paye' && (jourDe(p.date) || depuis) >= depuis;
    const paidPrevEntrees = dedupPrevisions.filter(p => p.type === 'entree' && regleeDepuis(p)).reduce((s, p) => s + (p.montant || 0), 0);
    const paidPrevSorties = dedupPrevisions.filter(p => p.type === 'sortie' && regleeDepuis(p)).reduce((s, p) => s + (p.montant || 0), 0);

    const solde = (settings.soldeInitial || 0) + totalEnc + paidPrevEntrees - totalDep - paidPrevSorties;

    // Period scope
    const monthsAhead = periodMonths(period);
    const futureLimit = new Date(now);
    futureLimit.setMonth(futureLimit.getMonth() + monthsAhead);
    const limite = jourDe(futureLimit);

    // Entrées prévues : reste dû des factures ouvertes à échéance dans la période (retard compris), part
    // non facturée des devis signés, prévisions d'entrée non réglées dans la période (retard compris).
    const devisAFacturerTotal = devisAFacturer.reduce((s, d) => s + resteAFacturer(d, devis), 0);
    const entPrev = facturesOuvertes.filter((f) => echeanceDe(f) <= limite).reduce((s, f) => s + resteAPayer(f, paiements), 0)
      + devisAFacturerTotal
      + dedupPrevisions.filter(p => p.type === 'entree' && p.statut === 'prevu' && jourDe(p.date) <= limite).reduce((s, p) => s + (p.montant || 0), 0);

    // Sorties prévues : non réglées dans la période, retard compris (avant : une échéance en retard sortait du total)
    const sorPrev = dedupPrevisions
      .filter(p => p.type === 'sortie' && p.statut === 'prevu' && jourDe(p.date) <= limite)
      .reduce((s, p) => s + (p.montant || 0), 0);

    const projFin = solde + entPrev - sorPrev;

    // 2. Build monthly buckets
    const numMonths = Math.max(periodMonths(period), 6);
    const pastMonths = Math.min(numMonths, 6);
    const futureMonthsCount = numMonths - pastMonths;

    const buckets = [];
    for (let i = pastMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ month: d.getMonth(), year: d.getFullYear(), label: MONTH_NAMES[d.getMonth()], entrees: 0, sorties: 0, isCurrent: i === 0, isFuture: false });
    }
    for (let i = 1; i <= futureMonthsCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      buckets.push({ month: d.getMonth(), year: d.getFullYear(), label: MONTH_NAMES[d.getMonth()], entrees: 0, sorties: 0, isCurrent: false, isFuture: true });
    }

    // Mois passés : l'argent réellement reçu (src/lib/paiementsFacture.js `encaisseEntre`) et les dépenses.
    // Avant : factures « payée » au total, et devis signés rangés comme entrées encaissées.
    buckets.forEach((b) => {
      if (b.isFuture) return;
      const debut = `${b.year}-${String(b.month + 1).padStart(2, '0')}-01`;
      const fin = jourDe(new Date(b.year, b.month + 1, 0));
      b.entrees += encaisseEntre(devis, paiements, debut, fin);
    });

    depenses.forEach((dep) => {
      const d = dateLocale(dep.date || dep.createdAt);
      if (!d) return;
      const bucket = buckets.find((b) => sameMonth(b, monthKey(d)));
      if (bucket && !bucket.isFuture) bucket.sorties += decaisseDepense(dep, { franchise: franchiseImposee });
    });

    // Mois à venir : reste dû des factures ouvertes à leur échéance (en retard : ce mois-ci)
    facturesOuvertes.forEach((f) => {
      const ech = dateLocale(echeanceDe(f));
      const d = ech && ech > now ? ech : now;
      const bucket = buckets.find((b) => sameMonth(b, monthKey(d)));
      if (bucket) bucket.entrees += resteAPayer(f, paiements);
    });

    // Add ALL previsions (paid = past, pending = future) to their month buckets
    // Deduplicate: same description + same month + same montant = counted only once
    dedupPrevisions.forEach((p) => {
      const d = dateLocale(p.date);
      if (!d) return;
      const mk = monthKey(d);
      const bucket = buckets.find((b) => sameMonth(b, mk));
      if (!bucket) return;
      if (p.type === 'entree') bucket.entrees += p.montant || 0;
      else bucket.sorties += p.montant || 0;
    });

    // Cumulative balance starting from solde initial
    let cumul = settings.soldeInitial || 0;
    const chartData = buckets.map((b) => {
      cumul += b.entrees - b.sorties;
      return { ...b, cumulBalance: cumul };
    });

    // 3. Upcoming payments list
    const payments = [];

    // Factures ouvertes : reste dû, à leur échéance
    facturesOuvertes.forEach((f) => {
      const client = clients.find((c) => c.id === f.client_id);
      const reste = resteAPayer(f, paiements);
      const isOverdue = statutFacture(f, paiements, now) === 'en_retard';
      payments.push({
        id: `fac_${f.id}`, date: echeanceDe(f),
        description: `Facture ${f.numero || f.id?.slice(-6) || '---'} – ${formatClientName(client)}`,
        type: 'entree', montant: reste,
        statut: isOverdue ? 'En retard' : 'En attente',
        source: 'facture', categorie: 'Client',
      });
    });

    // Devis signés : la part pas encore facturée
    devisAFacturer.forEach((d) => {
      const client = clients.find((c) => c.id === d.client_id);
      const reste = resteAFacturer(d, devis);
      payments.push({
        id: `devis_${d.id}`, date: d.date_validite || d.date || new Date().toISOString(),
        description: `Devis signé ${d.numero || d.id?.slice(-6) || '---'} – ${formatClientName(client, d.client_nom || 'Client')}`,
        type: 'entree', montant: reste,
        statut: 'Signé',
        source: 'devis_accepte', categorie: 'Client',
      });
    });

    // Recent depenses as historical sorties (last 60 days)
    const sixtyAgo = new Date(now); sixtyAgo.setDate(sixtyAgo.getDate() - 60);
    depenses.filter((d) => new Date(d.date || d.createdAt) >= sixtyAgo).forEach((dep) => {
      payments.push({
        id: `dep_${dep.id}`, date: dep.date || dep.createdAt,
        description: dep.description || dep.libelle || `Dépense ${dep.fournisseur || ''}`,
        type: 'sortie', montant: decaisseDepense(dep, { franchise: franchiseImposee }),
        statut: 'Payé', source: 'depense', categorie: dep.categorie || 'Fournisseur',
      });
    });

    // User previsions (with deduplication: same description + same month + same montant = duplicate)
    dedupPrevisions.forEach((p) => {
      // En retard : la veille ou avant (une échéance du jour n'est pas en retard)
      const isOverdue = p.statut === 'prevu' && jourDe(p.date) < jourDe(now);
      payments.push({
        id: p.id, date: p.date, description: p.description,
        type: p.type, montant: p.montant,
        statut: p.statut === 'paye' ? 'Payé' : isOverdue ? 'En retard' : 'Prévu',
        source: 'prevision', categorie: p.categorie || 'Divers',
        recurrence: p.recurrence,
      });
    });

    payments.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 4. Alerts
    const futureNegative = chartData.filter((d) => d.isFuture || d.isCurrent).some((d) => d.cumulBalance < 0);
    const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
    const bigPayment = facturesOuvertes.find((f) => {
      const due = echeanceDe(f);
      return due <= jourDe(in7) && due >= jourDe(now) && resteAPayer(f, paiements) >= 10000;
    });

    const currentBucket = chartData.find((b) => b.isCurrent);
    const prevBucketIdx = chartData.findIndex((b) => b.isCurrent) - 1;
    const prevBucket = prevBucketIdx >= 0 ? chartData[prevBucketIdx] : null;
    let trend = null;
    if (prevBucket && prevBucket.entrees > 0) {
      trend = Math.round(((currentBucket.entrees - prevBucket.entrees) / prevBucket.entrees) * 100);
    }

    // 5. TVA data now comes from useTVA hook (tvaHook)

    // Auto-synced count
    const autoSyncCount = {
      factures: payments.filter(p => p.source === 'auto_facture' || (p.source === 'facture')).length,
      depenses: payments.filter(p => p.source === 'auto_depense' || (p.source === 'depense')).length,
    };

    // 6. Cash flow projections (next 6 months)
    const monthlyRecurring = previsionsComptees
      .filter(p => p.recurrence === 'mensuel' && p.type === 'sortie' && p.statut !== 'paye')
      .reduce((s, p) => s + (p.montant || 0), 0) || 0;

    const avgMonthlyEntrees = (() => {
      const past6 = chartData.filter(b => !b.isFuture && b.entrees > 0);
      if (past6.length === 0) return 0;
      return past6.reduce((s, b) => s + b.entrees, 0) / past6.length;
    })();

    const avgMonthlySorties = (() => {
      const past6 = chartData.filter(b => !b.isFuture && b.sorties > 0);
      if (past6.length === 0) return monthlyRecurring;
      return past6.reduce((s, b) => s + b.sorties, 0) / past6.length;
    })();

    // Factures ouvertes pour la projection, à leur échéance (en retard : le mois prochain)
    const moisEncaissement = (f) => {
      const ech = dateLocale(echeanceDe(f));
      const premier = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return ech && ech >= premier ? ech : premier;
    };

    const projections = [];
    let projBalance = solde;
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      // Use scheduled previsions for this month, or fallback to averages
      const mk = { month: d.getMonth(), year: d.getFullYear() };
      const moisDe = (p) => { const x = dateLocale(p.date); return x ? monthKey(x) : null; };
      const monthPrevEntrees = dedupPrevisions.filter(p => p.type === 'entree' && p.statut === 'prevu' && moisDe(p) && sameMonth(moisDe(p), mk));
      const scheduledEntrees = monthPrevEntrees.reduce((s, p) => s + (p.montant || 0), 0);
      const monthPrevSorties = dedupPrevisions.filter(p => p.type === 'sortie' && p.statut === 'prevu' && moisDe(p) && sameMonth(moisDe(p), mk));
      const scheduledSorties = monthPrevSorties.reduce((s, p) => s + (p.montant || 0), 0);

      // Include unpaid invoices/accepted devis as projected income for this month
      const monthInvoices = facturesOuvertes.filter(f => sameMonth(monthKey(moisEncaissement(f)), mk));
      const invoiceEntrees = monthInvoices.reduce((s, f) => s + resteAPayer(f, paiements), 0);

      const entrees = (scheduledEntrees + invoiceEntrees) || avgMonthlyEntrees;
      const sorties = scheduledSorties || avgMonthlySorties;
      projBalance += entrees - sorties;

      // Build items list for tooltip
      const items = [
        ...monthPrevEntrees.map(p => ({ label: p.description || 'Prévision', montant: p.montant || 0, type: 'entree' })),
        ...monthInvoices.map(f => ({ label: `Facture ${f.numero || f.nom || ''}`.trim(), montant: resteAPayer(f, paiements), type: 'entree' })),
        ...monthPrevSorties.map(p => ({ label: p.description || 'Charge', montant: p.montant || 0, type: 'sortie' })),
      ];

      projections.push({
        mois: MONTH_NAMES[d.getMonth()],
        moisLong: d.toLocaleDateString('fr-FR', d.getFullYear() === now.getFullYear() ? { month: 'long' } : { month: 'long', year: 'numeric' }),
        entrees,
        sorties,
        balance: projBalance,
        isScheduled: scheduledEntrees > 0 || scheduledSorties > 0 || invoiceEntrees > 0,
        items,
      });
    }

    // When balance will go negative
    const negativeMonth = projections.find(p => p.balance < 0);
    // When balance will go below threshold (seulement si l'artisan en a réglé un : src/lib/previsions.js)
    const seuil = seuilAlerteRegle(settings);
    const thresholdMonth = seuil === null ? null : projections.find(p => p.balance >= 0 && p.balance < seuil);

    // 7. Recurring summary
    const recurringParents = previsionsComptees.filter(p => p.recurrence && p.recurrence !== 'unique' && !p.recurrenceParentId);
    const recurringEntrees = recurringParents.filter(p => p.type === 'entree');
    const recurringSorties = recurringParents.filter(p => p.type === 'sortie');
    const monthlyRecurrEntrees = recurringEntrees.reduce((s, p) => {
      const factor = p.recurrence === 'mensuel' ? 1 : p.recurrence === 'trimestriel' ? 1/3 : 1/12;
      return s + (p.montant || 0) * factor;
    }, 0);
    const monthlyRecurrSorties = recurringSorties.reduce((s, p) => {
      const factor = p.recurrence === 'mensuel' ? 1 : p.recurrence === 'trimestriel' ? 1/3 : 1/12;
      return s + (p.montant || 0) * factor;
    }, 0);
    const recurringSummary = {
      parents: recurringParents,
      totalEntrees: monthlyRecurrEntrees,
      totalSorties: monthlyRecurrSorties,
      net: monthlyRecurrEntrees - monthlyRecurrSorties,
      count: recurringParents.length,
    };

    return {
      soldeActuel: solde, totalEncaisse: totalEnc, totalDepense: totalDep,
      entreesPrevues: entPrev, sortiesPrevues: sorPrev, projectionFinMois: projFin,
      monthlyData: chartData, upcomingPayments: payments,
      alertNegativeBalance: futureNegative, alertLargePayment: bigPayment, trendSolde: trend,
      autoSyncCount,
      projections, negativeMonth, thresholdMonth, avgMonthlyEntrees, avgMonthlySorties,
      recurringSummary,
    };
  }, [devis, paiements, depenses, clients, previsionsComptees, now, period, settings, franchiseImposee]);

  // TVA data from hook (replaces inline computation)
  const { tvaMonthly, tvaTotal, tvaByRate, tvaQuarterly, tvaNextDeadline, depensesSansTva } = tvaHook;

  // Filtered payments for current tab
  const filteredPayments = useMemo(() => {
    let result = upcomingPayments;
    if (activeTab === 'previsions') result = result.filter((p) => p.statut !== 'Payé');
    else if (activeTab === 'historique') result = result.filter((p) => p.statut === 'Payé');
    if (categoryFilter !== 'all') result = result.filter((p) => p.categorie === categoryFilter);
    if (activeTab !== 'historique') {
      // À venir : la plus proche d'abord (les retards en tête), puis le réglé, du plus récent au plus ancien.
      // Triée à l'envers, la liste montrait janvier prochain avant les échéances de la semaine.
      const ouvert = result.filter((p) => p.statut !== 'Payé').sort((a, b) => new Date(a.date) - new Date(b.date));
      result = [...ouvert, ...result.filter((p) => p.statut === 'Payé')];
    }
    return result;
  }, [upcomingPayments, activeTab, categoryFilter]);
  // 12 échéances d'abord : la liste complète dépassait 80 lignes au téléphone.
  const paiementsVisibles = toutesEcheances ? filteredPayments : filteredPayments.slice(0, 12);
  useEffect(() => { setToutesEcheances(false); }, [activeTab, categoryFilter]);

  // -- Scenario projections (12 months) -----------------------------------
  const { scenarioProjections, baselineProjections, scenarioSummary } = useMemo(() => {
    const months = 12;
    const baseAvgEntrees = avgMonthlyEntrees || 0;
    const baseAvgSorties = avgMonthlySorties || 0;

    const baseline = [];
    const scenario = [];
    let baseBal = soldeActuel;
    let scenBal = soldeActuel;

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const mk = { month: d.getMonth(), year: d.getFullYear() };
      const mois = MONTH_NAMES[d.getMonth()];

      // Scheduled previsions for this month
      const scheduledE = previsionsComptees.filter(p => p.type === 'entree' && p.statut === 'prevu' && sameMonth(monthKey(new Date(p.date)), mk)).reduce((s, p) => s + (p.montant || 0), 0);
      const scheduledS = previsionsComptees.filter(p => p.type === 'sortie' && p.statut === 'prevu' && sameMonth(monthKey(new Date(p.date)), mk)).reduce((s, p) => s + (p.montant || 0), 0);

      const baseE = scheduledE || baseAvgEntrees;
      const baseS = scheduledS || baseAvgSorties;
      baseBal += baseE - baseS;
      baseline.push({ mois, entrees: baseE, sorties: baseS, balance: baseBal });

      // Scenario: apply adjustments
      const adjE = (baseE * (1 + scenarioParams.entreesAdj / 100)) + scenarioParams.extraEntree;
      const adjS = (baseS * (1 + scenarioParams.sortiesAdj / 100)) + scenarioParams.extraSortie;
      scenBal += adjE - adjS;
      scenario.push({ mois, entrees: adjE, sorties: adjS, balance: scenBal });
    }

    // Summary
    const totalBaseEntrees = baseline.reduce((s, b) => s + b.entrees, 0);
    const totalBaseSorties = baseline.reduce((s, b) => s + b.sorties, 0);
    const totalScenEntrees = scenario.reduce((s, b) => s + b.entrees, 0);
    const totalScenSorties = scenario.reduce((s, b) => s + b.sorties, 0);
    const baselineEndBalance = baseline[baseline.length - 1]?.balance || 0;
    const scenarioEndBalance = scenario[scenario.length - 1]?.balance || 0;
    const baseNegMonth = baseline.find(b => b.balance < 0);
    const scenNegMonth = scenario.find(b => b.balance < 0);
    const seuil = seuilAlerteRegle(settings);
    const baseThreshMonth = seuil === null ? null : baseline.find(b => b.balance < seuil);
    const scenThreshMonth = seuil === null ? null : scenario.find(b => b.balance < seuil);

    return {
      baselineProjections: baseline,
      scenarioProjections: scenario,
      scenarioSummary: {
        totalBaseEntrees, totalBaseSorties, totalScenEntrees, totalScenSorties,
        baselineEndBalance, scenarioEndBalance,
        delta: scenarioEndBalance - baselineEndBalance,
        baseNegMonth, scenNegMonth,
        baseThreshMonth, scenThreshMonth,
      },
    };
  }, [soldeActuel, avgMonthlyEntrees, avgMonthlySorties, previsionsComptees, now, scenarioParams, settings]);

  // -- Render ---------------------------------------------------------------
  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-3';
  const CHAMP_PANNEAU = 'w-full h-11 px-3 rounded-xl border text-base sm:text-sm bg-surface border-bord-fort text-encre placeholder:text-encre-3 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/20 disabled:opacity-60';
  const TETE_TABLEAU = `text-sm ${textSecondary} border-b border-bord`;
  const [projectionOuverte, setProjectionOuverte] = useState(false);

  // Solde estimé (audit UX du 20 oct. 2026, P1) : ce n'est pas le compte en banque, c'est un calcul depuis le solde de
  // départ saisi ; on le dit. Un seul bandeau au plus, et seulement si l'artisan doit agir.
  const seuil = seuilAlerteRegle(settings);
  const departRegle = Number(settings.soldeInitial) !== 0 && settings.soldeInitial !== undefined && settings.soldeInitial !== null;
  const dateDepart = settings.soldeDate ? dateLue(settings.soldeDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const contexteSolde = departRegle && dateDepart
    ? `Calculé depuis votre solde de départ du ${dateDepart}`
    : 'Calculé sans solde de départ : réglez-le dans les paramètres de trésorerie';
  const libelleProjection = period === '1m' ? 'Solde estimé fin de mois' : `Solde estimé dans ${periodMonths(period)} mois`;
  const horsAssistant = !showWizard || wizardStep >= 2;
  const enregistrerSeuil = () => {
    if (brouillonSeuil === null) return;
    const n = parseInt(brouillonSeuil, 10);
    updateSettings({ seuilAlerte: Number.isFinite(n) && n > 0 ? n : 0 });
    setSeuilParDefautSaisi(n === SEUIL_PAR_DEFAUT);
    setBrouillonSeuil(null);
  };
  const ignorerSeuil = () => { setAlertDismissed(true); try { localStorage.setItem('cp_treso_alert_dismissed', '1'); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } };
  const bandeau = !horsAssistant ? null
    : negativeMonth ? {
      id: 'negatif',
      titre: 'Solde estimé négatif prévu',
      ligne: `${negativeMonth.moisLong} : ${formatMoney(negativeMonth.balance)}`,
      texte: 'Estimation d’après vos factures à encaisser et vos prévisions ; pour un mois sans prévision, d’après la moyenne de vos derniers mois. Pistes : relancer les factures impayées, ou décaler une dépense qui peut attendre.',
    }
      : (seuil !== null && soldeActuel < seuil && !alertDismissed) ? {
        id: 'seuil',
        titre: `Solde estimé sous votre seuil d’alerte (${formatMoney(seuil)})`,
        ligne: null,
        texte: `Votre solde estimé est de ${formatMoney(soldeActuel)}.`,
      }
        : null;
  const ajouter = () => {
    if (activeTab === 'mouvements') { setEditingMouv(null); setShowMouvModal(true); } else { setEditingItem(null); setShowAddModal(true); }
  };
  const libelleAjouter = activeTab === 'mouvements' ? 'Ajouter un mouvement' : 'Ajouter une prévision';

  return (
    <div className="space-y-6">
      {/* ── En-tête : la période, l'ajout (au bureau), les réglages ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <Segmente ariaLabel="Période" valeur={period} onChange={setPeriod} options={PERIOD_OPTIONS.map((o) => ({ valeur: o.key, libelle: o.label }))} />
        <div className="flex items-center gap-2">
          {/* Au bureau, l'ajout est dans l'en-tête (audit UX : le bouton flottant cachait « Encaisser ») */}
          {peutModifier && (
            <Bouton variante={horsAssistant ? 'principal' : 'secondaire'} icone={Plus} onClick={ajouter} className="hidden md:inline-flex">{libelleAjouter}</Bouton>
          )}
          <div className="relative">
            <BoutonIcone icone={Settings} libelle="Paramètres de trésorerie" variante="secondaire" onClick={() => setShowSettingsPanel(!showSettingsPanel)} aria-expanded={showSettingsPanel} />
            {showSettingsPanel && (
              <div ref={settingsPanelRef} className="absolute right-0 top-full mt-2 z-30 p-4 w-[19rem] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-e3 bg-surface border-bord">
                <h4 className="text-base font-bold mb-3 text-encre">Paramètres de trésorerie</h4>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="treso-solde-initial" className="block text-sm font-medium mb-1 text-encre-2">Solde de départ (€)</label>
                    <input id="treso-solde-initial" type="number" inputMode="decimal" value={settings.soldeInitial || ''} placeholder="0" disabled={!peutModifier}
                      onChange={(e) => updateSettings({ soldeInitial: parseFloat(e.target.value) || 0 })}
                      className={CHAMP_PANNEAU} />
                    <p className="text-sm mt-1 text-encre-3">Le solde de votre compte en banque à cette date</p>
                  </div>
                  <div>
                    <label htmlFor="treso-solde-date" className="block text-sm font-medium mb-1 text-encre-2">Date du solde de départ</label>
                    <input id="treso-solde-date" type="date" value={settings.soldeDate || ''} disabled={!peutModifier}
                      onChange={(e) => updateSettings({ soldeDate: e.target.value })}
                      className={CHAMP_PANNEAU} />
                  </div>
                  <div>
                    <label htmlFor="treso-seuil" className="block text-sm font-medium mb-1 text-encre-2">Seuil d’alerte (€) <span className="font-normal text-encre-3">(facultatif)</span></label>
                    <input id="treso-seuil" type="number" inputMode="numeric" min="0" step="100" value={brouillonSeuil ?? (seuil ?? '')} placeholder="Aucun" disabled={!peutModifier}
                      onChange={(e) => setBrouillonSeuil(e.target.value)}
                      onBlur={enregistrerSeuil}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enregistrerSeuil(); } }}
                      className={CHAMP_PANNEAU} />
                    <p className="text-sm mt-1 text-encre-3">Une alerte si le solde estimé passe sous ce montant. Vide : aucune alerte.</p>
                    {seuilParDefautSaisi && (
                      <p role="status" className="text-sm mt-1 text-alerte-texte">5 000 € est aussi la valeur enregistrée par défaut des anciens comptes : elle ne déclenche pas d’alerte. Choisissez un autre montant.</p>
                    )}
                  </div>
                  <div className="pt-3 mt-1 border-t border-bord">
                    {franchiseImposee ? (
                      <>
                        <p className="text-sm font-medium mb-1 text-encre-2">Régime de TVA</p>
                        <p className="text-sm text-encre">Franchise en base de TVA (art. 293 B du CGI) : pas de TVA facturée ni déductible. Mallettico part du principe que vous y êtes si votre statut est « Micro-entreprise » ; sinon, choisissez le statut « Entreprise individuelle (EI) » dans Paramètres › Identité.</p>
                      </>
                    ) : (
                      <>
                        <label id="treso-regime-libelle" htmlFor="treso-regime" className="block text-sm font-medium mb-1 text-encre-2">Régime de TVA</label>
                        <ChampChoix id="treso-regime" idLibelle="treso-regime-libelle" titre="Régime de TVA" disabled={!peutModifier}
                          options={[
                            { valeur: 'mensuel', libelle: 'Réel normal (mensuel)', detail: 'Déclaration chaque mois' },
                            { valeur: 'trimestriel', libelle: 'Réel simplifié', detail: 'Déclaration trimestrielle' },
                            { valeur: 'franchise', libelle: 'Franchise en base', detail: 'TVA non applicable (art. 293 B du CGI)' },
                          ]}
                          valeur={settings.regimeTva || 'trimestriel'} onChange={(v) => updateSettings({ regimeTva: v })} className="!h-11" />
                      </>
                    )}
                  </div>
                  <div>
                    <label htmlFor="treso-numero-tva" className="block text-sm font-medium mb-1 text-encre-2">N° de TVA intracommunautaire</label>
                    <input id="treso-numero-tva" type="text" value={settings.numeroTva || ''} placeholder="FR XX XXXXXXXXX" disabled={!peutModifier}
                      onChange={(e) => updateSettings({ numeroTva: e.target.value })}
                      className={CHAMP_PANNEAU} />
                  </div>
                </div>
                <Bouton pleineLargeur className="mt-3" onClick={() => setShowSettingsPanel(false)}>Fermer</Bouton>
              </div>
            )}
          </div>
        </div>
      </div>

      <TuileChiffre
        heros
        libelle="Solde estimé"
        valeur={formatMoney(soldeActuel)}
        contexte={contexteSolde}
        alerte={soldeActuel < 0 ? `Négatif. ${contexteSolde}` : undefined}
        tonAlerte="alerte"
      />

      {/* ── Un bandeau au plus : seulement si l'artisan doit agir ─────────────────────────────── */}
      {bandeau && (
        <div role="status" data-bandeau-tresorerie={bandeau.id} className="flex items-start gap-3 p-4 rounded-2xl bg-alerte-fond text-alerte-texte">
          <AlertTriangle size={20} aria-hidden="true" className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{bandeau.titre}</p>
            {bandeau.ligne ? <p className="text-base font-bold tabular-nums mt-0.5">{bandeau.ligne}</p> : null}
            <p className="text-sm mt-1">{bandeau.texte}</p>
            {bandeau.id === 'seuil' && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Bouton taille="compacte" onClick={() => setShowSettingsPanel(true)}>Modifier le seuil</Bouton>
                <Bouton taille="compacte" variante="discret" className="!text-alerte-texte" onClick={ignorerSeuil}>Ne plus afficher</Bouton>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Assistant de démarrage de la trésorerie ─────────────────────── */}
      {peutModifier && showWizard && wizardStep < 2 && (
        <Carte marge="aucun" className="overflow-hidden">
          {wizardMinimized ? (
            <button
              type="button"
              onClick={() => setWizardMinimized(false)}
              className="w-full min-h-[64px] flex items-center justify-between px-5 py-3 transition-colors hover:bg-surface-2"
            >
              <span className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2">
                  <Wallet size={18} aria-hidden="true" />
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold text-encre">Configuration de la trésorerie</span>
                  <span className="block text-sm text-encre-3">Étape {wizardStep + 1} sur 2 : touchez pour continuer</span>
                </span>
              </span>
              <ChevronDown size={18} aria-hidden="true" className="text-encre-3" />
            </button>
          ) : (
          <>
          {/* Étapes : un trait par étape, à l'accent pour les étapes faites et la courante */}
          <div className="flex items-center gap-2 px-5 pt-4 pb-2">
            <ol className="flex items-center gap-1.5 flex-1" aria-label="Étapes de la configuration">
              {[0, 1].map((s) => (
                <li key={s} className="flex-1" aria-current={wizardStep === s ? 'step' : undefined}>
                  <span aria-hidden="true" className={`block h-1.5 rounded-full ${wizardStep >= s ? 'bg-accent' : 'bg-bord'}`} />
                  <span className="sr-only">Étape {s + 1}{wizardStep > s ? ' (faite)' : ''}</span>
                </li>
              ))}
            </ol>
            <BoutonIcone icone={ChevronUp} taille={16} libelle="Réduire" onClick={() => setWizardMinimized(true)} />
          </div>

          {wizardStep === 0 && (
            <div className="px-5 pb-5">
              <div className="mb-4">
                <h3 className="text-base font-bold text-encre">Bienvenue dans la trésorerie</h3>
                <p className="text-sm text-encre-3">Étape 1 sur 2 : le solde de votre compte aujourd’hui</p>
              </div>
              <div className="space-y-3">
                <Champ id="treso-assistant-solde" libelle="Solde actuel de votre compte (€)" type="number" inputMode="decimal" placeholder="Ex. : 15000"
                  value={settings.soldeInitial || ''} onChange={(e) => updateSettings({ soldeInitial: parseFloat(e.target.value) || 0 })}
                  aide="Ce sera votre point de départ pour les projections." />
                <Bouton variante="principal" pleineLargeur iconeFin={ChevronRight} onClick={() => setWizardStep(1)}>Suivant</Bouton>
                <Bouton variante="discret" pleineLargeur onClick={() => { try { localStorage.setItem('cp_treso_wizard_done', '1'); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } setWizardStep(2); }}>
                  Passer cette étape
                </Bouton>
              </div>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="px-5 pb-5">
              <div className="mb-4">
                <h3 className="text-base font-bold text-encre">Vos charges mensuelles</h3>
                <p className="text-sm text-encre-3">Étape 2 sur 2 : cochez et ajustez</p>
              </div>
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {STARTER_TEMPLATES.map((tmpl) => {
                  const isSelected = wizardCharges[tmpl.description] !== undefined;
                  const basculer = () => {
                    if (isSelected) setWizardCharges(prev => { const n = { ...prev }; delete n[tmpl.description]; return n; });
                    else setWizardCharges(prev => ({ ...prev, [tmpl.description]: tmpl.montant }));
                  };
                  return (
                    <li key={tmpl.description} className={`flex items-center gap-2 pr-3 rounded-xl border transition-colors ${isSelected ? 'border-accent bg-accent/10' : 'border-bord bg-surface'}`}>
                      <label className="flex flex-1 items-center gap-3 min-h-[48px] pl-3 cursor-pointer">
                        <input type="checkbox" checked={isSelected} onChange={basculer} className="w-5 h-5 rounded accent-accent flex-shrink-0" />
                        <span className="flex-1 text-sm text-encre">{tmpl.description}</span>
                      </label>
                      {isSelected ? (
                        <input type="number" inputMode="decimal" value={wizardCharges[tmpl.description]} aria-label={`Montant de ${tmpl.description} par mois`}
                          onChange={(e) => setWizardCharges(prev => ({ ...prev, [tmpl.description]: Number(e.target.value) || 0 }))}
                          className="w-24 h-11 px-2 rounded-lg border text-base sm:text-sm text-right font-semibold bg-surface border-bord-fort text-encre" />
                      ) : (
                        <span className="text-sm text-encre-3 tabular-nums">{formatCurrency(tmpl.montant)} par mois</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center gap-3 mt-4">
                <Bouton variante="discret" icone={ChevronLeft} onClick={() => setWizardStep(0)}>Retour</Bouton>
                <Bouton variante="principal" className="flex-1" onClick={handleWizardFinish}>
                  {Object.keys(wizardCharges).length > 0
                    ? `Ajouter ${Object.keys(wizardCharges).length} charge${Object.keys(wizardCharges).length > 1 ? 's' : ''} et commencer`
                    : 'Commencer sans charges'}
                </Bouton>
              </div>
            </div>
          )}
          </>
          )}
        </Carte>
      )}

      {/* ── « À encaisser » ─────────────────────────────────────────────── */}
      {horsAssistant && encaisserData.items.length > 0 && showEncaisserWidget && (
        <section aria-label="À encaisser maintenant">
          {/* Une ligne par facture (client, n°, retard ou échéance, reste dû), relancer et encaisser en un geste. */}
          <TitreSection
            titre="À encaisser"
            compte={encaisserData.items.length}
            action="Masquer" onAction={() => setShowEncaisserWidget(false)}
          />
          <p className="-mt-1 mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-encre tabular-nums">{formatMoney(encaisserData.totalAEncaisser)} au total</span>
            {encaisserData.overdueItems.length > 0 && (
              <span className="flex items-center gap-1.5 font-semibold text-danger-texte">
                <AlertTriangle size={16} aria-hidden="true" /> dont {formatMoney(encaisserData.overdueTotal)} en retard
              </span>
            )}
          </p>
          <GroupeListe>
            {encaisserData.items.slice(0, 5).map((item) => (
              <LigneListe
                key={item.id}
                chevron={false}
                titre={item.clientNom}
                montant={formatMoney(item.montant)}
                meta={`${item.numero}${item.isOverdue ? ` · ${item.joursRetard} j de retard` : item.echeance ? ` · échéance ${dateLue(item.echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}`}
                pastille={<PastilleStatut genre="facture" statut={item.statutVu} />}
                pied={peutModifier ? (
                  <>
                    <span />
                    <span className="flex items-center gap-2">
                      {item.clientTel && <Bouton taille="compacte" icone={MessageCircle} onClick={() => handleWhatsAppRelance(item)}>Relancer</Bouton>}
                      {/* Ouvre la facture : « Encaisser » y enregistre le paiement (montant, date, moyen) et met à
                          jour le reste dû. Avant : « Encaissée » ne marquait qu'une prévision, la facture restait due. */}
                      {ouvrirDocument && <Bouton taille="compacte" icone={Check} onClick={() => ouvrirDocument(item.id)}>Encaisser</Bouton>}
                    </span>
                  </>
                ) : null}
              />
            ))}
            {encaisserData.items.length > 5 && (
              <button type="button" onClick={() => setActiveTab('previsions')} className="w-full h-12 text-sm font-semibold text-encre-2 hover:bg-surface-2">
                Voir les {encaisserData.items.length - 5} autres factures
              </button>
            )}
          </GroupeListe>
        </section>
      )}

      {/* ── Ce qui va entrer, sortir, et où l'on arrive au bout de la période ──────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <TuileChiffre libelle="Entrées prévues" valeur={formatMoney(entreesPrevues)} contexte="Factures à encaisser et prévisions" />
        <TuileChiffre libelle="Sorties prévues" valeur={formatMoney(sortiesPrevues)} contexte="Charges et prévisions" />
        <TuileChiffre libelle={libelleProjection} valeur={formatMoney(projectionFinMois)}
          contexte="Solde estimé, plus les entrées, moins les sorties"
          alerte={projectionFinMois < 0 ? 'Négatif' : (seuil !== null && projectionFinMois < seuil) ? 'Sous votre seuil d’alerte' : undefined}
          tonAlerte="alerte" />
      </div>

      {/* ── Graphique ─────────────────────────────────────────────────────────── */}
      <Carte>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-encre">Flux de trésorerie</h2>
          <span className="text-sm text-encre-3 tabular-nums">{monthlyData.length} mois</span>
        </div>
        {monthlyData.length > 0 && monthlyData.some(d => d.entrees > 0 || d.sorties > 0) ? (
          <>
            <div className="sm:hidden"><CashFlowChart data={monthlyData} compact /></div>
            <div className="hidden sm:block"><CashFlowChart data={monthlyData} /></div>
          </>
        ) : (
          <EtatVide icone={BarChart3} titre="Pas encore de données"
            texte="Ajoutez votre première entrée ou sortie pour voir votre flux de trésorerie."
            action={peutModifier ? <Bouton icone={Plus} onClick={() => setShowAddModal(true)}>Ajouter une prévision</Bouton> : null} />
        )}
      </Carte>

      {/* ── Repliés (audit UX : la page faisait 4 860 px au téléphone, tout ouvert) ─────────────── */}
      {activeTab === 'apercu' && (settings.regimeTva || 'trimestriel') !== 'franchise' && (tvaTotal.collectee > 0 || tvaTotal.deductible > 0) && (
        <Carte as="button" marge="aucun" onClick={() => setActiveTab('tva')} className="overflow-hidden" aria-label="TVA de l’année : voir le détail">
          <span className="min-h-[64px] flex items-center gap-3 px-4 py-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-2 text-encre-2">
              <Percent size={20} aria-hidden="true" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-base font-semibold text-encre">TVA de l’année</span>
              <span className="block text-sm text-encre-2 tabular-nums truncate">
                {tvaTotal.net >= 0 ? 'TVA à payer estimée' : 'Crédit de TVA estimé'} : {formatMoney(Math.abs(tvaTotal.net))}
              </span>
            </span>
            <ChevronRight size={18} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
          </span>
        </Carte>
      )}

      {activeTab === 'apercu' && peutModifier && (
        <Carte marge="aucun" className="overflow-hidden">
          <button
            type="button"
            aria-expanded={showChargesBTP}
            onClick={() => { setShowChargesBTP(!showChargesBTP); try { localStorage.setItem('cp_treso_charges_btp_seen', '1'); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } }}
            className="w-full min-h-[64px] flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-2 text-encre-2">
                <HardHat size={20} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-encre">Charges courantes BTP</span>
                <span className="block text-sm text-encre-2">Ajoutez vos charges récurrentes en un geste</span>
              </span>
            </span>
            {showChargesBTP ? <ChevronUp size={20} aria-hidden="true" className="flex-shrink-0 text-encre-3" /> : <ChevronDown size={20} aria-hidden="true" className="flex-shrink-0 text-encre-3" />}
          </button>

          {showChargesBTP && (
            <div className="px-4 pb-4 space-y-4 border-t border-bord">
              {BTP_CHARGES.map((group) => (
                <div key={group.categorie} className="pt-3">
                  <p className="text-sm font-semibold mb-2 text-encre-2">{group.categorie}</p>
                  <div className="divide-y divide-bord">
                    {group.items.map((charge) => {
                      const exists = previsions.some(p =>
                        p.description?.toLowerCase().trim() === charge.label.toLowerCase().trim() && p.statut === 'prevu'
                      );
                      return (
                        <div key={charge.label} className="flex items-center justify-between gap-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-encre">{charge.label}</p>
                            <p className="text-sm text-encre-3 tabular-nums">
                              environ {formatCurrency(charge.montantMoyen)} par {charge.recurrence === 'mensuel' ? 'mois' : charge.recurrence === 'trimestriel' ? 'trimestre' : 'an'}
                            </p>
                          </div>
                          {exists ? (
                            <Pastille ton="succes" icone={Check}>Ajoutée</Pastille>
                          ) : (
                            <Bouton taille="compacte" icone={Plus} onClick={() => handleAddBTPCharge({ ...charge, categorie: group.categorie })}
                              aria-label={`Ajouter ${charge.label}`}>
                              Ajouter
                            </Bouton>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Carte>
      )}

      {activeTab !== 'tva' && activeTab !== 'projections' && activeTab !== 'mouvements' && projections.length > 0 && (
        <Carte marge="aucun" className="overflow-hidden" data-projection-6-mois>
          <button type="button" aria-expanded={projectionOuverte} onClick={() => setProjectionOuverte((o) => !o)}
            className="w-full min-h-[64px] flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60">
            <span className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-2 text-encre-2">
                <TrendingUp size={20} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-encre">Projection à 6 mois</span>
                <span className="block text-sm text-encre-2 tabular-nums truncate">
                  {projections[projections.length - 1].moisLong} : {formatMoney(projections[projections.length - 1].balance)}
                </span>
              </span>
            </span>
            {projectionOuverte ? <ChevronUp size={20} aria-hidden="true" className="flex-shrink-0 text-encre-3" /> : <ChevronDown size={20} aria-hidden="true" className="flex-shrink-0 text-encre-3" />}
          </button>
          {projectionOuverte && (
            <div className="px-4 pb-4 border-t border-bord">
              {thresholdMonth && !negativeMonth ? (
                <Pastille ton="alerte" icone={AlertTriangle} className="mt-3">Sous votre seuil en {thresholdMonth.moisLong}</Pastille>
              ) : null}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {projections.map((p, i) => {
                  const isNeg = p.balance < 0;
                  const isBelowThreshold = seuil !== null && p.balance < seuil;
                  return (
                    <div key={i} title={p.items?.length > 0 ? p.items.map(it => `${it.type === 'entree' ? '+' : '-'} ${it.label}: ${formatCompact(it.montant)}`).join('\n') : 'Basé sur la moyenne'}
                      className="p-3 rounded-xl bg-surface-2 cursor-default">
                      <p className="text-sm font-semibold text-encre-2 capitalize">{p.mois}</p>
                      <p className={`mt-0.5 text-lg font-bold tabular-nums ${isNeg || isBelowThreshold ? 'text-alerte-texte' : 'text-encre'}`}>
                        {formatMoney(p.balance)}
                      </p>
                      <p className="text-sm text-encre-3 tabular-nums">
                        +{modeDiscret ? '···' : formatCompact(p.entrees)} / −{modeDiscret ? '···' : formatCompact(p.sorties)}
                      </p>
                      {p.isScheduled && <p className="text-sm text-encre-3">avec vos prévisions</p>}
                    </div>
                  );
                })}
              </div>
              <p className="text-sm mt-3 text-encre-3">
                Basé sur la moyenne des {period === '6m' ? '6' : '3'} derniers mois ({formatMoney(avgMonthlyEntrees)} entrées / {formatMoney(avgMonthlySorties)} sorties par mois) et les prévisions planifiées.
              </p>
            </div>
          )}
        </Carte>
      )}

      {/* ── Mouvements ce mois (Aperçu) ─────────────────────────────── */}
      {activeTab === 'apercu' && mouvements.length > 0 && (
        <Carte as="button" marge="aucun" onClick={() => setActiveTab('mouvements')} className="overflow-hidden">
          <span className="min-h-[64px] flex items-center gap-3 px-4 py-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-2 text-encre-2">
              <Receipt size={20} aria-hidden="true" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-base font-semibold text-encre">Mouvements ce mois</span>
              <span className="block text-sm text-encre-2 tabular-nums truncate">
                {mouvementsKPIs.entreesThisMonth || mouvementsKPIs.sortiesThisMonth
                  ? <><span className="font-semibold text-succes-texte">+{formatMoney(mouvementsKPIs.entreesThisMonth)}</span> · <span className="font-semibold text-encre">−{formatMoney(mouvementsKPIs.sortiesThisMonth)}</span></>
                  : 'Aucun ce mois-ci'}
                {' · '}{mouvements.length} au total
              </span>
            </span>
            <ChevronRight size={18} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
          </span>
        </Carte>
      )}

      {/* ── Onglets ───────────────────────────────────────────────────── */}
      <Carte marge="aucun">
        <Onglets
          onglets={TABS.map((t) => ({ id: t.key, libelle: t.label }))}
          actif={activeTab}
          onChange={setActiveTab}
          ariaLabel="Vues de la trésorerie"
          className="px-4 sm:px-5"
        />
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pt-3">
          {activeTab !== 'tva' && activeTab !== 'projections' && activeTab !== 'mouvements' && (
            <div className="w-full sm:w-56">
              <ChampChoix id="treso-filtre-categorie" titre="Catégorie" className="!h-11"
                options={[{ valeur: 'all', libelle: 'Toutes catégories' }, ...OPTIONS_CATEGORIE]}
                valeur={categoryFilter} onChange={setCategoryFilter} />
            </div>
          )}
          {activeTab === 'mouvements' && (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <div className="flex-1 min-w-[9rem] sm:flex-none sm:w-44">
                <ChampChoix id="treso-filtre-type" titre="Type de mouvement" className="!h-11"
                  options={[{ valeur: 'all', libelle: 'Tous types' }, { valeur: 'entree', libelle: 'Entrées' }, { valeur: 'sortie', libelle: 'Sorties' }]}
                  valeur={mouvFilter} onChange={setMouvFilter} />
              </div>
              <div className="flex-1 min-w-[9rem] sm:flex-none sm:w-44">
                <ChampChoix id="treso-filtre-statut" titre="Statut du mouvement" className="!h-11"
                  options={[{ valeur: 'all', libelle: 'Tous statuts' }, { valeur: 'prevu', libelle: 'Prévu' }, { valeur: 'paye', libelle: 'Payé' }]}
                  valeur={mouvStatutFilter} onChange={setMouvStatutFilter} />
              </div>
              <Bouton taille="compacte" icone={FileText} onClick={() => exportMouvementsCSV()}>Export CSV</Bouton>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-5 py-4">
          {activeTab === 'tva' || activeTab === 'projections' || activeTab === 'mouvements' ? null : filteredPayments.length === 0 ? (
            <EtatVide icone={Clock} titre="Aucune prévision pour cette vue"
              texte="Ajoutez vos charges récurrentes et vos entrées prévues pour suivre votre trésorerie."
              action={peutModifier && previsions.length === 0 ? <Bouton icone={Zap} onClick={() => setShowPrefillConfirm(true)}>Pré-remplir les charges courantes BTP</Bouton> : null} />
          ) : (
            <>
            {/* Téléphone : une ligne par échéance ; toucher pour modifier une prévision. */}
            <div className="sm:hidden -mx-4 divide-y divide-bord border-y border-bord">
              {paiementsVisibles.map((p) => {
                const isEntree = p.type === 'entree';
                const isPrevision = p.source === 'prevision';
                const dateStr = p.date ? dateLue(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                const aRegler = peutModifier && isPrevision && p.statut !== 'Payé' && p.date && new Date(p.date) <= new Date(Date.now() + 7 * 86400000);
                return (
                  <LigneListe
                    key={p.id}
                    titre={p.description}
                    montant={<span className={isEntree ? 'text-succes-texte' : ''}>{isEntree ? '+' : '−'}{formatMoney(p.montant)}</span>}
                    meta={[dateStr, p.categorie || 'Divers', p.recurrence && p.recurrence !== 'unique' ? p.recurrence : null].filter(Boolean).join(' · ')}
                    pastille={p.statut !== 'Prévu' ? <Pastille ton={TON_STATUT_PAIEMENT[p.statut] || 'neutre'}>{p.statut === 'Signé' ? 'Devis signé' : p.statut}</Pastille> : null}
                    onClick={isPrevision && peutModifier ? () => handleEditPrevision(p) : undefined}
                    pied={aRegler ? (
                      confirmingPaidId === p.id ? (
                        <>
                          <span className="text-sm font-medium text-encre">{isEntree ? 'Bien encaissée ?' : 'Bien payée ?'}</span>
                          <span className="flex gap-2">
                            <Bouton taille="compacte" onClick={() => setConfirmingPaidId(null)}>Non</Bouton>
                            <Bouton taille="compacte" icone={Check} onClick={() => { handleMarkAsPaid(p.id); setConfirmingPaidId(null); }}>Oui</Bouton>
                          </span>
                        </>
                      ) : (
                        <>
                          <span />
                          <Bouton taille="compacte" icone={Check} onClick={() => setConfirmingPaidId(p.id)}>{isEntree ? 'Encaissée' : 'Payée'}</Bouton>
                        </>
                      )
                    ) : null}
                  />
                );
              })}
            </div>
            <div className="hidden sm:block overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-sm min-w-[640px]" aria-label="Prévisions de trésorerie">
                <thead>
                  <tr className={TETE_TABLEAU}>
                    <th className="text-left py-3 pr-4 font-semibold">Échéance</th>
                    <th className="text-left py-3 pr-4 font-semibold">Description</th>
                    <th className="text-left py-3 pr-4 font-semibold">Type</th>
                    <th className="text-left py-3 pr-4 font-semibold">Catégorie</th>
                    <th className="text-right py-3 pr-4 font-semibold">Montant</th>
                    <th className="text-left py-3 font-semibold">Statut</th>
                    <th className="text-right py-3 font-semibold w-36"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {paiementsVisibles.map((p) => {
                    const isEntree = p.type === 'entree';
                    const dateStr = p.date ? dateLue(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                    const isPrevision = p.source === 'prevision';

                    return (
                      <tr key={p.id} className="border-b last:border-b-0 transition-colors border-bord hover:bg-surface-2">
                        <td className={`py-3 pr-4 ${textSecondary} whitespace-nowrap`}>{dateStr}</td>
                        <td className={`py-3 pr-4 ${textPrimary} font-medium max-w-[150px] sm:max-w-xs truncate`} title={p.description}>
                          {p.description}
                          {p.recurrence && p.recurrence !== 'unique' && (
                            <span className="ml-1.5 text-sm font-normal text-encre-3">· {p.recurrence}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Pastille ton={isEntree ? 'succes' : 'neutre'} icone={isEntree ? ArrowDown : ArrowUp}>{isEntree ? 'Entrée' : 'Sortie'}</Pastille>
                        </td>
                        <td className="py-3 pr-4">
                          <Pastille>{p.categorie === 'Materiaux' ? 'Matériaux' : (p.categorie || 'Divers')}</Pastille>
                        </td>
                        <td className={`py-3 pr-4 text-right font-bold whitespace-nowrap tabular-nums ${isEntree ? 'text-succes-texte' : 'text-encre'}`}>
                          {isEntree ? '+' : '−'}{formatMoney(p.montant)}
                        </td>
                        <td className="py-3">
                          <Pastille ton={TON_STATUT_PAIEMENT[p.statut] || 'neutre'}>{p.statut === 'Signé' ? 'Devis signé' : p.statut}</Pastille>
                        </td>
                        <td className="py-2 text-right">
                          {peutModifier && isPrevision ? (
                            <div className="flex items-center justify-end gap-0.5 relative">
                              {p.statut !== 'Payé' && (
                                <>
                                  <BoutonIcone icone={Check} taille={16} libelle="Marquer comme payé" onClick={() => setConfirmingPaidId(confirmingPaidId === p.id ? null : p.id)} />
                                  {confirmingPaidId === p.id && (
                                    <div className="absolute right-0 top-full z-30 mt-1 rounded-2xl border shadow-e3 p-3 w-56 bg-surface border-bord text-left">
                                      <p className="text-sm font-semibold mb-2 text-encre">Marquer comme payé ?</p>
                                      <div className="flex gap-2">
                                        <Bouton taille="compacte" onClick={() => setConfirmingPaidId(null)} className="flex-1">Non</Bouton>
                                        <Bouton taille="compacte" icone={Check} onClick={() => { handleMarkAsPaid(p.id); setConfirmingPaidId(null); }} className="flex-1">Oui</Bouton>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                              <BoutonIcone icone={Edit3} taille={16} libelle="Modifier" onClick={() => handleEditPrevision(p)} />
                              <BoutonIcone icone={Trash2} taille={16} libelle="Supprimer" className="hover:!bg-danger-fond hover:!text-danger-texte" onClick={() => handleDeletePrevision(p.id)} />
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredPayments.length > paiementsVisibles.length && (
              <div className="pt-3 text-center">
                <Bouton variante="discret" icone={ChevronDown} onClick={() => setToutesEcheances(true)}>
                  Afficher les {filteredPayments.length - paiementsVisibles.length} autres
                </Bouton>
              </div>
            )}
            </>
          )}

          {/* Footer: prefill hint */}
          {peutModifier && activeTab !== 'tva' && activeTab !== 'projections' && activeTab !== 'mouvements' && previsions.length === 0 && filteredPayments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-bord text-center">
              <Bouton variante="discret" icone={Zap} onClick={() => setShowPrefillConfirm(true)}>Ajouter les charges courantes BTP</Bouton>
            </div>
          )}
        </div>
      </Carte>

      {/* ── Mouvements ─────────────────────────────────────────── */}
      {activeTab === 'mouvements' && (
        <Carte>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <TuileChiffre libelle="Entrées payées" valeur={formatMoney(mouvementsKPIs.totalEntrees)} />
            <TuileChiffre libelle="Sorties payées" valeur={formatMoney(mouvementsKPIs.totalSorties)} />
            <TuileChiffre libelle="Entrées prévues" valeur={formatMoney(mouvementsKPIs.entreesPrevu)} />
            <TuileChiffre libelle="Solde net" valeur={formatMoney(mouvementsKPIs.soldeNet)}
              alerte={mouvementsKPIs.soldeNet < 0 ? 'Négatif' : undefined} tonAlerte="alerte" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-encre">
              Mouvements de trésorerie
              <Pastille>{filteredMouvements.length}</Pastille>
            </h2>
            {peutModifier && <Bouton taille="compacte" icone={Plus} onClick={() => { setEditingMouv(null); setShowMouvModal(true); }}>Nouveau mouvement</Bouton>}
          </div>

          {filteredMouvements.length === 0 ? (
            <EtatVide icone={Wallet} titre="Aucun mouvement enregistré"
              texte="Les mouvements sont vos transactions réelles (encaissements, décaissements), avec la TVA ventilée."
              action={peutModifier ? <Bouton icone={Plus} onClick={() => { setEditingMouv(null); setShowMouvModal(true); }}>Créer un mouvement</Bouton> : null} />
          ) : (
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-sm min-w-[640px]" aria-label="Mouvements de trésorerie">
                <thead>
                  <tr className={TETE_TABLEAU}>
                    <th className="text-left py-3 pr-4 font-semibold">Date</th>
                    <th className="text-left py-3 pr-4 font-semibold">Description</th>
                    <th className="text-left py-3 pr-4 font-semibold">Type</th>
                    <th className="text-right py-3 pr-4 font-semibold">HT</th>
                    <th className="text-right py-3 pr-4 font-semibold">TVA</th>
                    <th className="text-right py-3 pr-4 font-semibold">TTC</th>
                    <th className="text-left py-3 font-semibold">Statut</th>
                    <th className="text-right py-3 font-semibold w-36"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMouvements.map((m) => {
                    const isEntree = m.type === 'entree';
                    const dateStr = m.date ? dateLue(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                    return (
                      <tr key={m.id} className="border-b last:border-b-0 transition-colors border-bord hover:bg-surface-2">
                        <td className={`py-3 pr-4 ${textSecondary} whitespace-nowrap`}>{dateStr}</td>
                        <td className={`py-3 pr-4 ${textPrimary} font-medium max-w-[150px] sm:max-w-xs`} title={m.description}>
                          <span className="block truncate">{m.description}</span>
                          <span className="flex flex-wrap gap-1 mt-0.5">
                            {m.isRecurring && <Pastille>{m.recurringFrequency || 'récurrent'}</Pastille>}
                            {m.autoliquidation && <Pastille ton="alerte">Autoliquidation</Pastille>}
                          </span>
                          {m.notes && (
                            <span className={`block text-sm mt-0.5 font-normal ${textSecondary}`}>{m.notes}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Pastille ton={isEntree ? 'succes' : 'neutre'} icone={isEntree ? ArrowDown : ArrowUp}>{isEntree ? 'Entrée' : 'Sortie'}</Pastille>
                        </td>
                        <td className={`py-3 pr-4 text-right whitespace-nowrap tabular-nums ${textSecondary}`}>{formatMoney(m.montantHt || 0)}</td>
                        <td className={`py-3 pr-4 text-right whitespace-nowrap tabular-nums ${textSecondary}`}>
                          {m.autoliquidation ? '—' : formatMoney(m.montantTva || 0)}
                          <span className={`block text-sm ${textSecondary}`}>{String(m.tauxTva ?? 20).replace('.', ',')} %</span>
                        </td>
                        <td className={`py-3 pr-4 text-right font-bold whitespace-nowrap tabular-nums ${isEntree ? 'text-succes-texte' : 'text-encre'}`}>
                          {isEntree ? '+' : '−'}{formatMoney(m.montant)}
                        </td>
                        <td className="py-3">
                          {m.statut === 'paye' ? (
                            <Pastille ton="succes">Payé</Pastille>
                          ) : m.statut === 'annule' ? (
                            <Pastille>Annulé</Pastille>
                          ) : (
                            <Pastille ton="info">Prévu</Pastille>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {peutModifier ? (
                            <div className="flex items-center justify-end gap-0.5">
                              {m.statut !== 'paye' && (
                                <BoutonIcone icone={Check} taille={16} libelle="Marquer comme payé" onClick={() => handleValiderMouvement(m.id)} />
                              )}
                              <BoutonIcone icone={Edit3} taille={16} libelle="Modifier" onClick={() => handleEditMouvement(m)} />
                              <BoutonIcone icone={Trash2} taille={16} libelle="Supprimer" className="hover:!bg-danger-fond hover:!text-danger-texte" onClick={() => handleDeleteMouvement(m.id)} />
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Carte>
      )}

      {/* ── Projections interactives ─────────────────────────────────── */}
      {activeTab === 'projections' && (
        <div className="space-y-5">
          <Carte>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-2 text-encre-2">
                <Sliders size={20} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-bold text-encre">Projections interactives sur 12 mois</h2>
                <p className="text-sm text-encre-3">Ajustez les hypothèses pour simuler différents scénarios de trésorerie</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Scénario">
              {SCENARIO_PRESETS.map(preset => {
                const Icon = preset.icon;
                const isActive = scenarioPreset === preset.key;
                return (
                  <button key={preset.key} type="button" onClick={() => handleScenarioPreset(preset.key)} aria-pressed={isActive}
                    className={`h-11 inline-flex items-center gap-2 px-4 rounded-full border text-sm font-medium transition-colors ${
                      isActive ? 'bg-encre text-surface border-encre' : 'bg-surface border-bord text-encre-2 hover:bg-surface-2'
                    }`}>
                    <Icon size={15} aria-hidden="true" />
                    {preset.label}
                  </button>
                );
              })}
              {scenarioPreset === 'custom' && <Pastille icone={Sliders} className="self-center">Personnalisé</Pastille>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { cle: 'entreesAdj', libelle: 'Variation des entrées', min: -50, max: 100, pas: 5, valeur: `${scenarioParams.entreesAdj >= 0 ? '+' : ''}${scenarioParams.entreesAdj} %`, bornes: ['−50 %', '0 %', '+100 %'] },
                { cle: 'sortiesAdj', libelle: 'Variation des sorties', min: -50, max: 100, pas: 5, valeur: `${scenarioParams.sortiesAdj >= 0 ? '+' : ''}${scenarioParams.sortiesAdj} %`, bornes: ['−50 %', '0 %', '+100 %'] },
                { cle: 'extraEntree', libelle: 'Entrée supplémentaire par mois', min: 0, max: 50000, pas: 1000, valeur: `+${formatMoney(scenarioParams.extraEntree)}`, bornes: ['0 €', '25 000 €', '50 000 €'] },
                { cle: 'extraSortie', libelle: 'Charge supplémentaire par mois', min: 0, max: 30000, pas: 500, valeur: `−${formatMoney(scenarioParams.extraSortie)}`, bornes: ['0 €', '15 000 €', '30 000 €'] },
              ].map((r) => (
                <div key={r.cle} className="p-4 rounded-xl bg-surface-2">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor={`scenario-${r.cle}`} className="text-sm font-semibold text-encre-2">{r.libelle}</label>
                    <span className="text-sm font-bold tabular-nums text-encre">{r.valeur}</span>
                  </div>
                  <input id={`scenario-${r.cle}`} type="range" min={r.min} max={r.max} step={r.pas} value={scenarioParams[r.cle]}
                    onChange={(e) => handleScenarioSlider(r.cle, parseInt(e.target.value, 10))}
                    className="w-full h-11 cursor-pointer accent-accent" />
                  <div className="flex justify-between text-sm text-encre-3" aria-hidden="true">
                    {r.bornes.map((b) => <span key={b}>{b}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </Carte>

          {baselineProjections.length > 0 && (
            <Carte>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-base font-bold text-encre">Évolution du solde projeté</h3>
                {scenarioSummary.scenNegMonth && (
                  <Pastille ton="alerte" icone={AlertTriangle}>Négatif en {scenarioSummary.scenNegMonth.mois}</Pastille>
                )}
              </div>
              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div style={{ minWidth: 700 }}>
                  <ProjectionChart baseline={baselineProjections} scenario={scenarioProjections} />
                </div>
              </div>
            </Carte>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <TuileChiffre libelle="Solde final (12 mois)" valeur={formatMoney(scenarioSummary.scenarioEndBalance)}
              contexte={`Tendance actuelle : ${formatMoney(scenarioSummary.baselineEndBalance)}`}
              alerte={scenarioSummary.scenarioEndBalance < 0 ? `Négatif. Tendance actuelle : ${formatMoney(scenarioSummary.baselineEndBalance)}` : undefined} tonAlerte="alerte" />
            <TuileChiffre libelle="Effet du scénario" valeur={`${scenarioSummary.delta >= 0 ? '+' : ''}${formatMoney(scenarioSummary.delta)}`} contexte="Écart avec la tendance actuelle" />
            <TuileChiffre libelle="Entrées sur 12 mois" valeur={formatMoney(scenarioSummary.totalScenEntrees)}
              contexte={scenarioSummary.totalScenEntrees !== scenarioSummary.totalBaseEntrees
                ? `Tendance : ${formatMoney(scenarioSummary.totalBaseEntrees)}`
                : 'Identique à la tendance'} />
            <TuileChiffre libelle="Sorties sur 12 mois" valeur={formatMoney(scenarioSummary.totalScenSorties)}
              contexte={scenarioSummary.totalScenSorties !== scenarioSummary.totalBaseSorties
                ? `Tendance : ${formatMoney(scenarioSummary.totalBaseSorties)}`
                : 'Identique à la tendance'} />
          </div>

          <Carte>
            <h3 className="text-base font-bold mb-4 text-encre">Détail mensuel du scénario</h3>
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-sm min-w-[640px]" aria-label="Projections mensuelles">
                <thead>
                  <tr className={TETE_TABLEAU}>
                    <th className="text-left py-3 pr-4 font-semibold">Mois</th>
                    <th className="text-right py-3 pr-4 font-semibold">Entrées</th>
                    <th className="text-right py-3 pr-4 font-semibold">Sorties</th>
                    <th className="text-right py-3 pr-4 font-semibold">Flux net</th>
                    <th className="text-right py-3 font-semibold">Solde projeté</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioProjections.map((p) => {
                    const flux = p.entrees - p.sorties;
                    const aSurveiller = p.balance < 0 || (seuil !== null && p.balance < seuil);
                    return (
                      <tr key={p.mois} className={`border-b last:border-b-0 border-bord ${aSurveiller ? 'bg-alerte-fond/60' : 'hover:bg-surface-2'}`}>
                        <td className="py-2.5 pr-4 font-medium text-encre">{p.mois}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-succes-texte">{formatMoney(p.entrees)}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-encre-2">{formatMoney(p.sorties)}</td>
                        <td className="py-2.5 pr-4 text-right font-semibold tabular-nums text-encre">
                          {flux >= 0 ? '+' : ''}{formatMoney(flux)}
                        </td>
                        <td className={`py-2.5 text-right font-bold tabular-nums ${aSurveiller ? 'text-alerte-texte' : 'text-encre'}`}>
                          {formatMoney(p.balance)}
                          {p.balance < 0 && <AlertTriangle size={14} aria-label="négatif" className="inline ml-1" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Carte>

          <p className="flex items-start gap-2 p-3.5 rounded-2xl text-sm bg-info-fond text-info-texte">
            <Info size={16} aria-hidden="true" className="flex-shrink-0 mt-0.5" />
            Ces projections sont indicatives et basées sur les moyennes historiques et vos prévisions planifiées. Elles ne constituent pas un conseil financier.
          </p>
        </div>
      )}

      {/* ── TVA ───────────────────────────────────────────── */}
      {activeTab === 'tva' && (
        <Carte>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-2 text-encre-2">
                <Percent size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-encre">Tableau de TVA {new Date().getFullYear()}</h2>
                <p className="text-sm text-encre-3">
                  {(settings.regimeTva || 'trimestriel') === 'franchise'
                    ? 'Franchise en base de TVA'
                    : `TVA facturée (débits) et déductible · régime ${(settings.regimeTva || 'trimestriel') === 'mensuel' ? 'réel normal' : 'réel simplifié'}`}
                  {settings.numeroTva && <span className="ml-1">· {settings.numeroTva}</span>}
                </p>
              </div>
            </div>
            {(settings.regimeTva || 'trimestriel') !== 'franchise' && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Export « CA3 » retiré (relecture juridique du 10 oct. 2026) : une seule colonne au lieu de « base hors
                    taxe » et « taxe due », une année au lieu d'un mois ou d'un trimestre, lignes du millésime 2026
                    non suivies — l'artisan aurait recopié la taxe dans la colonne de la base. */}
                <Bouton taille="compacte" icone={Receipt} onClick={() => exportJournalVentes()} title="Export des ventes avec TVA ventilée">Ventes</Bouton>
                <Bouton taille="compacte" icone={Receipt} onClick={() => exportJournalAchats()} title="Export des achats avec TVA déductible">Achats</Bouton>
                {/* Le FEC se fait depuis l'onglet « Export comptable » (un seul générateur) : celui-ci comptait des
                    devis comme des ventes, oubliait les factures non payées, et séparait par des virgules. */}
                <Bouton taille="compacte" icone={Download} title="Exporter le résumé TVA en CSV" onClick={() => {
                  const isQuarterly = (settings.regimeTva || 'trimestriel') === 'trimestriel';
                  const rows = isQuarterly
                    ? tvaQuarterly.map(q => `${q.label};${q.collectee.toFixed(2)};${q.deductible.toFixed(2)};${q.net.toFixed(2)}`)
                    : tvaMonthly.map(m => `${m.mois};${m.collectee.toFixed(2)};${m.deductible.toFixed(2)};${(m.collectee - m.deductible).toFixed(2)}`);
                  const csv = 'Période;TVA facturée (débits);TVA déductible;TVA à payer estimée (débits)\n' + rows.join('\n');
                  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
                  remettreFichier(blob, `resume_tva_${new Date().getFullYear()}.csv`)
                    .then((r) => { if (r !== 'annule') toast.success('Résumé TVA exporté', 'Le fichier CSV est prêt.'); });
                }}>Résumé TVA</Bouton>
              </div>
            )}
          </div>

          {(settings.regimeTva || 'trimestriel') === 'franchise' ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-2">
              <Info size={20} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
              <div>
                <p className="text-sm font-semibold text-encre">Franchise en base de TVA</p>
                <p className="text-sm mt-0.5 text-encre-2">
                  En franchise en base de TVA, vous n’avez pas de TVA à collecter ni à déduire.
                  Mention obligatoire sur vos factures : « TVA non applicable, art. 293 B du CGI ».
                </p>
                {/* Une facture émise par erreur avec de la TVA la rend due (relecture juriste-btp du 17 oct. 2026) */}
                {(() => {
                  const n = devis.filter(d => d.type === 'facture' && tvaARegulariser(d, entreprise)).length;
                  return n > 0 && (
                    <p role="status" className="text-sm mt-2 text-alerte-texte">
                      {n === 1 ? '1 facture émise porte de la TVA : cette TVA est due du seul fait de la facture (art. 283, 3 du CGI). Faites un avoir puis une nouvelle facture sans TVA.' : `${n} factures émises portent de la TVA : cette TVA est due du seul fait de la facture (art. 283, 3 du CGI). Faites un avoir puis une nouvelle facture sans TVA.`}
                    </p>
                  );
                })()}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <TuileChiffre libelle="TVA facturée" valeur={formatMoney(tvaTotal.collectee)} contexte="Sur vos factures émises (régime des débits)" />
                <TuileChiffre libelle="TVA déductible" valeur={formatMoney(tvaTotal.deductible)} contexte="Sur vos achats et dépenses" />
                <TuileChiffre libelle={tvaTotal.net >= 0 ? 'TVA à payer estimée (débits)' : 'Crédit de TVA estimé (débits)'} valeur={formatMoney(Math.abs(tvaTotal.net))}
                  contexte="Sans option pour les débits, la TVA de vos travaux est due à l’encaissement (art. 269 du CGI) : le montant à déclarer peut différer." />
                {tvaNextDeadline && (
                  <TuileChiffre libelle="Prochaine échéance" valeur={tvaNextDeadline.label} contexte={`Déclaration ${tvaNextDeadline.period}`} />
                )}
              </div>

              {/* Dépenses sans TVA saisie : rien n'est déduit pour elles, le dire plutôt que de supposer 20 % */}
              {depensesSansTva > 0 && (
                <div role="status" className="mb-6 p-3 rounded-xl bg-alerte-fond text-alerte-texte text-sm flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>
                    {depensesSansTva === 1 ? '1 dépense de l’année n’a pas sa TVA saisie : aucune TVA n’est déduite pour elle.' : `${depensesSansTva} dépenses de l’année n’ont pas leur TVA saisie : aucune TVA n’est déduite pour elles.`}
                    {' '}Choisissez le taux porté sur la facture du fournisseur dans la fiche du chantier, onglet Finances.
                  </span>
                </div>
              )}

              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-sm min-w-[640px]" aria-label="TVA par période">
                  <thead>
                    <tr className={TETE_TABLEAU}>
                      <th className="text-left py-3 pr-4 font-semibold">Période</th>
                      <th className="text-right py-3 pr-4 font-semibold">TVA facturée (débits)</th>
                      <th className="text-right py-3 pr-4 font-semibold">TVA déductible</th>
                      <th className="text-right py-3 font-semibold">Solde de TVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((settings.regimeTva || 'trimestriel') === 'trimestriel'
                      ? tvaQuarterly.map((q, qi) => ({ cle: q.label, libelle: q.label, collectee: q.collectee, deductible: q.deductible, net: q.net, courant: qi === Math.floor(new Date().getMonth() / 3) }))
                      : tvaMonthly.map((m, i) => ({ cle: m.mois, libelle: m.mois, collectee: m.collectee, deductible: m.deductible, net: m.net, courant: i === new Date().getMonth() }))
                    ).map((r) => {
                      const hasData = r.collectee > 0 || r.deductible > 0;
                      return (
                        <tr key={r.cle} className={`border-b last:border-b-0 transition-colors border-bord ${r.courant ? 'bg-surface-2' : 'hover:bg-surface-2'}`}>
                          <td className={`py-3 pr-4 ${r.courant ? 'font-bold' : 'font-medium'} ${hasData ? textPrimary : textSecondary}`}>
                            {r.libelle} {r.courant && <Pastille ton="info" className="ml-1">actuel</Pastille>}
                          </td>
                          <td className={`py-3 pr-4 text-right tabular-nums ${hasData ? 'text-encre' : textSecondary}`}>{hasData ? formatMoney(r.collectee) : '—'}</td>
                          <td className={`py-3 pr-4 text-right tabular-nums ${hasData ? 'text-encre' : textSecondary}`}>{hasData ? formatMoney(r.deductible) : '—'}</td>
                          <td className={`py-3 text-right font-semibold tabular-nums ${hasData ? 'text-encre' : textSecondary}`}>
                            {hasData ? (r.net >= 0 ? '+' : '') + formatMoney(r.net) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-bord-fort">
                      <td className="py-3 pr-4 font-bold text-encre">Total annuel</td>
                      <td className="py-3 pr-4 text-right font-bold tabular-nums text-encre">{formatMoney(tvaTotal.collectee)}</td>
                      <td className="py-3 pr-4 text-right font-bold tabular-nums text-encre">{formatMoney(tvaTotal.deductible)}</td>
                      <td className="py-3 text-right font-bold tabular-nums text-encre">{(tvaTotal.net >= 0 ? '+' : '') + formatMoney(tvaTotal.net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {Object.keys(tvaByRate).length > 0 && (
                <div className="mt-6 pt-5 border-t border-bord">
                  <h3 className="text-base font-bold mb-3 text-encre">Ventilation par taux</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(tvaByRate).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, data]) => {
                      // Les clés de TVA_RATES sont en dixièmes de point (200 = 20 %, 55 = 5,5 %)
                      const info = TVA_RATES[Math.round(Number(rate) * 10)] || { label: `${String(rate).replace('.', ',')} %`, desc: '' };
                      return (
                        <div key={rate} className="p-3 rounded-xl bg-surface-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-bold text-encre">{info.label}</span>
                            {info.desc ? <span className="text-sm text-encre-3">{info.desc}</span> : null}
                          </div>
                          <p className="text-sm text-encre-3 tabular-nums">Base HT des ventes : {formatMoney(data.base)}</p>
                          <p className="text-sm font-semibold text-encre tabular-nums">Facturée : {formatMoney(data.collectee)}</p>
                          {(data.deductible || 0) > 0 && (
                            <>
                              <p className="text-sm text-encre-3 tabular-nums mt-1">Base HT des achats : {formatMoney(data.baseDeductible || 0)}</p>
                              <p className="text-sm font-semibold text-encre tabular-nums">Déductible : {formatMoney(data.deductible)}</p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="mt-5 flex items-start gap-2 p-3.5 rounded-xl text-sm bg-info-fond text-info-texte">
                <Info size={16} aria-hidden="true" className="flex-shrink-0 mt-0.5" />
                Ces données sont indicatives. La TVA d’un achat de services (location de matériel, entretien, honoraires) se déduit en
                principe au paiement, sauf si le fournisseur a opté pour les débits (mention sur sa facture), et la sous-traitance en
                autoliquidation n’est pas prise en compte. Consultez votre expert-comptable pour la déclaration officielle.
              </p>
            </>
          )}
        </Carte>
      )}

      {/* ── Charges récurrentes ──────────────────────────────── */}
      {activeTab === 'apercu' && recurringSummary.count > 0 && (
        <section>
          <TitreSection titre="Charges récurrentes" compte={recurringSummary.count} />
          <p className="-mt-1 mb-3 text-sm text-encre-2 tabular-nums">
            {recurringSummary.totalEntrees > 0 && <>Entrées <span className="font-semibold text-succes-texte">+{formatMoney(recurringSummary.totalEntrees)}</span> · </>}
            Sorties <span className="font-semibold text-encre">−{formatMoney(recurringSummary.totalSorties)}</span> par mois
            {' · '}soit <span className="font-semibold text-encre">{recurringSummary.net >= 0 ? '+' : '−'}{formatMoney(Math.abs(recurringSummary.net * 12))}</span> sur un an
          </p>
          <GroupeListe>
            {recurringSummary.parents.map(p => {
              const isEntree = p.type === 'entree';
              const freqLabel = p.recurrence === 'mensuel' ? 'par mois' : p.recurrence === 'trimestriel' ? 'par trimestre' : 'par an';
              const pendingCount = previsions.filter(ch =>
                (ch.recurrenceParentId === p.id || ch.id === p.id) && ch.statut === 'prevu'
              ).length;
              return (
                <LigneListe
                  key={p.id}
                  titre={p.description}
                  montant={<span className={isEntree ? 'text-succes-texte' : ''}>{isEntree ? '+' : '−'}{formatMoney(p.montant)}</span>}
                  meta={`${p.categorie || 'Divers'} · ${pendingCount} échéance${pendingCount > 1 ? 's' : ''} à venir`}
                  pastille={<span className="text-sm text-encre-3">{freqLabel}</span>}
                  onClick={peutModifier ? () => handleEditPrevision(p) : undefined}
                />
              );
            })}
          </GroupeListe>
        </section>
      )}

      {/* ── Liens automatiques ──────────────────────────────────────── */}
      {(autoSyncCount.factures > 0 || autoSyncCount.depenses > 0) && (activeTab === 'apercu') && (
        <p className="flex items-center gap-3 p-3 rounded-xl text-sm bg-surface-2 text-encre-3">
          <Link2 size={16} aria-hidden="true" className="flex-shrink-0" />
          <span>
            Repris automatiquement : <strong>{autoSyncCount.factures}</strong> facture{autoSyncCount.factures > 1 ? 's' : ''} et <strong>{autoSyncCount.depenses}</strong> dépense{autoSyncCount.depenses > 1 ? 's' : ''}
          </span>
        </p>
      )}

      {/* Au téléphone, la marge sous le bouton flottant (88 px : audit UX du 20 oct. 2026) ; au bureau, rien */}
      {peutModifier && <div className="h-[88px] md:hidden" aria-hidden="true" />}

      {/* ── Bouton flottant d'ajout : téléphone seulement ─────────────────────────────────────── */}
      {peutModifier && (
        <button type="button" onClick={ajouter}
          className="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-e3 bg-accent text-sur-accent transition-transform active:scale-95"
          aria-label={libelleAjouter} title={libelleAjouter}>
          <Plus size={24} aria-hidden="true" />
        </button>
      )}

      {/* ── Pré-remplir les charges ──────────────────────────────── */}
      <Modal isOpen={showPrefillConfirm} onClose={() => setShowPrefillConfirm(false)} size="md" title="Pré-remplir les charges BTP ?"
        description={`Ajoute ${STARTER_TEMPLATES.length} charges récurrentes courantes du BTP (loyer, assurance, salaires…). Vous pourrez les modifier ou les supprimer.`}
        footer={(
          <>
            <Bouton variante="discret" onClick={() => setShowPrefillConfirm(false)}>Annuler</Bouton>
            <Bouton variante="principal" icone={Zap} onClick={handlePrefill}>Ajouter ces charges</Bouton>
          </>
        )}>
        <ul className="divide-y divide-bord">
          {STARTER_TEMPLATES.map((t) => (
            <li key={t.description} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-encre-2">{t.description}</span>
              <span className="font-semibold tabular-nums text-encre whitespace-nowrap">−{formatCurrency(t.montant)} par mois</span>
            </li>
          ))}
        </ul>
      </Modal>

      <PrevisionModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingItem(null); }}
        onSave={handleSavePrevision}
        editItem={editingItem}
      />

      <MouvementModal
        isOpen={showMouvModal}
        onClose={() => { setShowMouvModal(false); setEditingMouv(null); }}
        onSave={handleSaveMouvement}
        editItem={editingMouv}
      />
    </div>
  );
}
