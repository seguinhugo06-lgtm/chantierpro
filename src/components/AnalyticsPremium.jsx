import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingUp, Clock, ShoppingCart, Target, Users, AlertTriangle,
  BarChart3, HardHat, Zap, RefreshCw, Copy,
} from 'lucide-react';
import { useAnalyticsPremium } from '../hooks/useAnalyticsPremium';
import { Segmente } from './ui/Onglets';
import Pastille, { PastilleStatut } from './ui/Pastille';
import EtatVide from './ui/EtatVide';
import { Bouton } from './ui/Bouton';
import { statut } from '../lib/statuts';

// ── Formatters ──────────────────────────────────────────────────
// Mode discret : tous les montants de l'écran (tableaux, tuiles, axes des graphiques) passent par ces deux
// fonctions ; l'écran pose le réglage à chaque rendu. Avant (recette du 9 oct. 2026), une cinquantaine de
// montants restaient lisibles ici en mode discret.
let montantsMasques = false;
const formatEUR = (v) => (montantsMasques ? '•••'
  : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0));

const formatCompact = (v) => (montantsMasques ? '•••'
  : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(v || 0));

const PERIOD_OPTIONS = [
  { key: 'month', label: 'Ce mois' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Année' },
  { key: 'all', label: 'Tout' },
];


// ── Couleurs du thème pour les graphiques (recharts écrit des attributs SVG) : lues sur <html>, elles suivent le clair, le
// sombre et l'accent de l'entreprise (src/styles/theme.css). Avant : l'orange brut et des gris écrits à la main.
function couleurTheme(nom, repli) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
    return v ? `rgb(${v})` : repli;
  } catch {
    return repli;
  }
}

// ── Info-bulle des graphiques ────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border px-3 py-2 shadow-e2 text-sm bg-surface border-bord text-encre">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} aria-hidden="true" />
          <span className="text-encre-3">{entry.name} :</span>
          <span className="font-medium tabular-nums">{formatter ? formatter(entry.value) : formatEUR(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ── Jauge circulaire ──────────────────────────────────────────────
function CircularGauge({ value, max = 100, size = 64, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);
  return (
    <svg width={size} height={size} className="transform -rotate-90" role="img" aria-label={`Score : ${value}${max === 100 ? ' %' : ' sur ' + max}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-bord" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        className="stroke-accent transition-all duration-1000 ease-out"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Tuile ─────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, gauge, gaugeValue }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border p-4 sm:p-5 bg-surface border-bord shadow-e1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface-2 text-encre-2">
              <Icon size={16} aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-encre-2">{label}</span>
          </div>
          <div className="text-2xl font-bold tracking-tight tabular-nums text-encre">{value}</div>
          {sub && <p className="text-sm mt-1 text-encre-3">{sub}</p>}
        </div>
        {gauge && (
          <div className="relative flex items-center justify-center">
            <CircularGauge value={gaugeValue || 0} />
            <span className="absolute text-xs font-bold tabular-nums text-encre">{gaugeValue} %</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bloc ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`rounded-2xl border bg-surface border-bord shadow-e1 ${className}`}>
      <div className="flex items-center gap-2.5 px-4 sm:px-5 pt-5 pb-3">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface-2 text-encre-2">
          <Icon size={16} aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold text-encre">{title}</h2>
      </div>
      <div className="px-4 sm:px-5 pb-5">
        {children}
      </div>
    </section>
  );
}

// Marge d'un chantier : trois tons, le rouge est celui du retard (décision du 26 oct. 2026) — une marge négative est « à surveiller »
const tonMarge = (pct) => (pct > 20 ? 'succes' : pct >= 0 ? 'neutre' : 'alerte');
const TEXTE_TON = { succes: 'text-succes-texte', neutre: 'text-encre-2', alerte: 'text-alerte-texte', danger: 'text-danger-texte', info: 'text-info-texte' };
const POINT_TON = { succes: 'bg-succes-point', neutre: 'bg-neutre-point', alerte: 'bg-alerte-point', danger: 'bg-danger-point', info: 'bg-info-point' };

// ── Composant principal ───────────────────────────────────────────
export default function AnalyticsPremium({
  devis = [],
  clients = [],
  chantiers = [],
  depenses = [],
  equipe = [],
  paiements = [],
  pointages = [],
  isDark,
  // couleur reste acceptée : l'accent du thème suit la couleur de l'entreprise
  couleur: _couleur,
  showToast,
  setPage: _setPage,
  modeDiscret = false,
}) {
  montantsMasques = !!modeDiscret;
  const [period, setPeriod] = useState(() => {
    try { return localStorage.getItem('cp_analytics_premium_period') || 'all'; } catch { return 'all'; }
  });

  useEffect(() => {
    try { localStorage.setItem('cp_analytics_premium_period', period); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
  }, [period]);

  const {
    funnel,
    delaiMoyenSignature,
    tauxRefus,
    caPrevisionnel,
    panierMoyen,
    tauxConversion,
    clientStats,
    clientsDormants,
    topPrestations,
    rentabiliteChantiers,
    productivite,
    moisList,
    retardMoyenPaiement,
  } = useAnalyticsPremium({ devis, clients, chantiers, depenses, equipe, paiements, pointages, period });

  // Relues à chaque changement de thème (isDark) : recharts écrit des couleurs, pas des classes
  const graphe = useMemo(() => ({
    grille: couleurTheme('--bord', '#E1EBF3'),
    axe: couleurTheme('--encre-3', '#64748B'),
    accent: couleurTheme('--accent', '#12336F'),
    depenses: couleurTheme('--bord-fort', '#C8D6E4'),
    marge: couleurTheme('--succes-point', '#10B981'),
    surface: couleurTheme('--surface', '#FFFFFF'),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isDark : le thème posé sur <html> a changé
  }), [isDark]);

  // Max CA for proportional bars
  const maxClientCA = clientStats.length > 0 ? clientStats[0].ca : 1;
  const maxPrestCA = topPrestations.length > 0 ? topPrestations[0].ca : 1;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Période (le titre est celui de Finances) ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-encre-3">Vue d’ensemble de votre activité commerciale</p>
        <Segmente ariaLabel="Période" valeur={period} onChange={setPeriod} options={PERIOD_OPTIONS.map((o) => ({ valeur: o.key, libelle: o.label }))} />
      </div>

      {/* ── Chiffres ─────────────────────────────────────────────────────── */}
      <div className="bandeau-chiffres grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard icon={Target} label="Taux de conversion" value={`${tauxConversion} %`} sub={`${tauxRefus} % refusés`} gauge gaugeValue={tauxConversion} />
        <KPICard icon={Clock} label="Délai moyen de signature" value={`${delaiMoyenSignature} j`}
          sub={retardMoyenPaiement > 0 ? `Retard de paiement : ${retardMoyenPaiement} j` : 'Paiements à temps'} />
        <KPICard icon={ShoppingCart} label="Panier moyen" value={formatCompact(panierMoyen)} sub={`Sur ${clientStats.length} client${clientStats.length > 1 ? 's' : ''}`} />
        <KPICard icon={TrendingUp} label="CA prévisionnel" value={formatCompact(caPrevisionnel)} sub="Estimé d’après le taux de conversion" />
      </div>

      {/* Conversion des devis */}
      <Section title="Conversion des devis" icon={Target}>
        <div className="space-y-3">
          {funnel.map((step, i) => {
            const widthPct = Math.max(step.pct, 8);
            const prevStep = i > 0 ? funnel[i - 1] : null;
            const convRate = prevStep && prevStep.count > 0
              ? Math.round((step.count / prevStep.count) * 100)
              : null;
            return (
              <div key={step.etape}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-encre-2">{step.etape}</span>
                  <div className="flex items-center gap-2">
                    {convRate !== null && i > 0 && <Pastille>{convRate} %</Pastille>}
                    <span className="text-sm font-bold tabular-nums text-encre">{step.count}</span>
                  </div>
                </div>
                <div className="h-8 rounded-lg overflow-hidden bg-surface-2">
                  <div
                    className="h-full rounded-lg transition-all duration-1000 ease-out flex items-center px-3 bg-accent"
                    style={{ width: `${widthPct}%`, opacity: 1 - (i * 0.15) }}
                  >
                    {widthPct > 20 && <span className="text-xs font-semibold text-sur-accent tabular-nums">{step.pct} %</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Chiffre d'affaires et marge ──────────────────── */}
      <Section title="Chiffre d’affaires et marge par mois" icon={BarChart3}>
        <div style={{ minHeight: 280 }}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={moisList} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={graphe.grille} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: graphe.axe, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: graphe.axe, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (montantsMasques ? '•••' : v >= 1000 ? `${Math.round(v / 1000)} k` : v)}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="depenses" name="Dépenses" fill={graphe.depenses} radius={[4, 4, 0, 0]} isAnimationActive={true} />
              <Bar dataKey="ca" name="CA" fill={graphe.accent} radius={[4, 4, 0, 0]} isAnimationActive={true}>
                {moisList.map((_, idx) => (
                  <Cell key={idx} fill={graphe.accent} fillOpacity={idx === moisList.length - 1 ? 1 : 0.8} />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="marge"
                name="Marge"
                stroke={graphe.marge}
                strokeWidth={2.5}
                dot={{ r: 3, fill: graphe.marge, stroke: graphe.surface, strokeWidth: 2 }}
                isAnimationActive={true}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── Clients ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Section title="Les 10 meilleurs clients" icon={Users}>
          <ol className="space-y-2.5">
            {clientStats.slice(0, 10).map((cl, i) => (
              <li key={cl.id} className="flex items-center gap-3">
                <span className="w-5 text-sm font-bold text-center tabular-nums text-encre-3">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium truncate text-encre">{cl.nom}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Pastille>{cl.tauxConversion} %</Pastille>
                      <span className="text-sm font-semibold tabular-nums text-encre">{formatCompact(cl.ca)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-surface-2">
                    <div className="h-full rounded-full transition-all duration-700 bg-accent"
                      style={{ width: `${Math.max((cl.ca / maxClientCA) * 100, 3)}%`, opacity: 1 - (i * 0.07) }} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {clientStats.length === 0 && (
            <p className="text-sm text-center py-6 text-encre-3">Aucune donnée client disponible</p>
          )}
        </Section>

        <Section title="Clients sans activité" icon={AlertTriangle}>
          <ul className="space-y-2">
            {clientsDormants.map(cl => (
              <li key={cl.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-surface-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-encre">{cl.nom}</p>
                  <p className="text-sm text-encre-3">Sans activité depuis {cl.joursSansActivite} jours</p>
                </div>
                {/* Le bouton disait « Relancer » et copiait seulement le nom (audit UX § 2.6 : un libellé fait ce qu'il dit) */}
                <Bouton taille="compacte" icone={Copy}
                  onClick={async () => {
                    try {
                      await navigator.clipboard?.writeText(cl.nom);
                      showToast?.(`${cl.nom} : nom copié`, 'success');
                    } catch {
                      showToast?.('Copie impossible sur cet appareil', 'error');
                    }
                  }}>
                  Copier le nom
                </Bouton>
              </li>
            ))}
          </ul>
          {clientsDormants.length === 0 && (
            <EtatVide icone={Users} titre="Aucun client sans activité" />
          )}
        </Section>
      </div>

      {/* ── Prestations ─────────────────────── */}
      <Section title="Prestations les plus vendues" icon={Zap}>
        <ol className="space-y-2.5">
          {topPrestations.map((p, i) => (
            <li key={i} className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium truncate max-w-[60%] text-encre">{p.nom}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm tabular-nums text-encre-3">{p.count} fois</span>
                  <span className="text-sm font-semibold tabular-nums text-encre">{formatCompact(p.ca)}</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-surface-2">
                <div className="h-full rounded-full transition-all duration-700 bg-accent"
                  style={{ width: `${Math.max((p.ca / maxPrestCA) * 100, 3)}%`, opacity: 1 - (i * 0.08) }} />
              </div>
            </li>
          ))}
        </ol>
        {topPrestations.length === 0 && (
          <p className="text-sm text-center py-6 text-encre-3">Aucune prestation trouvée dans les devis</p>
        )}
      </Section>

      {/* ── Rentabilité des chantiers ───────────────── */}
      <Section title="Rentabilité des chantiers" icon={HardHat}>
        <ul className="space-y-2">
          {rentabiliteChantiers.slice(0, 15).map(ch => {
            const ton = tonMarge(ch.margePct);
            const margeLabel = ch.margePct > 20 ? 'Bonne marge' : ch.margePct >= 0 ? 'Marge faible' : 'Marge négative';
            return (
              <li key={ch.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl bg-surface-2">
                <div className="flex items-center gap-2 min-w-0 sm:w-1/3">
                  <PastilleStatut genre="chantier" statut={ch.statut} className="shrink-0" />
                  <span className="text-sm font-medium truncate text-encre">{ch.nom}</span>
                </div>
                <div className="flex items-center gap-3 sm:w-1/3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-encre-3">Marge <span className="sr-only">({margeLabel})</span></span>
                      <span className={`text-sm font-bold tabular-nums ${TEXTE_TON[ton]}`}>{ch.margePct} %</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-bord">
                      <div className={`h-full rounded-full transition-all duration-700 ${POINT_TON[ton]}`}
                        style={{ width: `${Math.min(Math.max(ch.margePct, 0), 100)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:w-1/3 sm:justify-end text-sm">
                  <div className="text-center">
                    <p className="text-encre-3">CA</p>
                    <p className="font-semibold tabular-nums text-encre">{formatCompact(ch.ca)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-encre-3">Dépenses</p>
                    <p className="font-semibold tabular-nums text-encre">{formatCompact(ch.depenses)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-encre-3">Marge</p>
                    <p className={`font-semibold tabular-nums ${TEXTE_TON[ton]}`}>{formatCompact(ch.marge)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {rentabiliteChantiers.length === 0 && (
          <p className="text-sm text-center py-6 text-encre-3">Aucun chantier avec données financières</p>
        )}
      </Section>

      {/* ── Répartition des chantiers : un statut = un mot et un ton (src/lib/statuts.js) ─────── */}
      {chantiers.length > 0 && (() => {
        const statusMap = {};
        chantiers.forEach(ch => {
          const s = ch.statut || 'en_attente';
          statusMap[s] = (statusMap[s] || 0) + 1;
        });
        const total = chantiers.length;
        const entries = Object.entries(statusMap).sort((a, b) => b[1] - a[1]);
        return (
          <Section title="Répartition des chantiers" icon={HardHat}>
            <ul className="space-y-2">
              {entries.map(([status, count]) => {
                const { libelle, ton } = statut('chantier', status);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <li key={status} className="flex items-center gap-3">
                    <p className="w-24 sm:w-28 shrink-0 text-sm font-medium text-encre">{libelle}</p>
                    <div className="flex-1 h-5 rounded-full overflow-hidden bg-surface-2">
                      <div className={`h-full rounded-full transition-all ${POINT_TON[ton] || POINT_TON.neutre}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-bold w-20 text-right tabular-nums text-encre">{count} ({pct} %)</span>
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })()}

      {/* ── Charge de l'équipe ─────────────────── */}
      <Section title="Charge de l’équipe" icon={RefreshCw}>
        <ul className="space-y-3">
          {productivite.map(m => {
            // Au-delà de la capacité : « à surveiller » (ambre) ; le rouge reste celui du retard
            const ton = m.taux > 100 ? 'alerte' : 'neutre';
            const chargeLabel = m.taux > 100 ? 'Surcharge' : 'Charge normale';
            return (
              <li key={m.id} className="flex items-center gap-3">
                <div className="w-24 sm:w-32 shrink-0">
                  <p className="text-sm font-medium truncate text-encre">{m.nom}</p>
                  <p className="text-sm text-encre-3 truncate">{m.role}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm tabular-nums text-encre-3">{m.heures} h sur {m.capacite} h</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold tabular-nums ${TEXTE_TON[ton]}`}>{m.taux} %</span>
                      <span className="sr-only">{chargeLabel}</span>
                      {m.cout > 0 && <span className="text-sm tabular-nums text-encre-3">{formatCompact(m.cout)}</span>}
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-surface-2">
                    <div className={`h-full rounded-full transition-all duration-700 ${ton === 'alerte' ? 'bg-alerte-point' : 'bg-accent'}`}
                      style={{ width: `${Math.min(m.taux, 100)}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {productivite.length === 0 && (
          <EtatVide icone={Zap} titre="Aucun pointage enregistré" texte="Les données apparaîtront quand l’équipe pointera ses heures." />
        )}
      </Section>
    </div>
  );
}
