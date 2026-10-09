/**
 * Filtres — la boîte à outils commune des recherches, filtres et tris des listes.
 *
 * Recette du 9 oct. 2026 (Hugo : « les menus de tri et de filtre sont dégueu ») : chaque page avait
 * ses <select> natifs, ses boutons de période de 26 px, ses pastilles de styles différents et ses
 * menus qui débordaient. Ici, un seul langage :
 *   - ChampRecherche : 44 px, effaçable, 16 px de texte sur téléphone (sinon iOS zoome au focus) ;
 *   - BoutonVolet    : « Filtres » / « Trier », avec la valeur en cours et le nombre de filtres actifs ;
 *   - Volet          : panneau qui monte du bas sur téléphone, panneau ancré sous le bouton ailleurs ;
 *   - GroupeChoix    : puces pour un choix court (une ou plusieurs valeurs) ;
 *   - ListeChoix     : liste à cocher, avec recherche au-delà de quelques entrées (clients, chantiers) ;
 *   - PucesActives   : les filtres actifs, retirables d'une touche ;
 *   - SegmentDefilant: la rangée du filtre principal (Tous, Devis, Factures…).
 * Thème : prop isDark ; accent : prop couleur (hex), en style inline comme le reste de l'app.
 */
import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import useFocusTrap from '../../hooks/useFocusTrap';

const REQUETE_TELEPHONE = '(max-width: 639.98px)';

/** Vrai sous 640 px (largeur téléphone), suivi en direct. */
export function useEstTelephone() {
  const [telephone, setTelephone] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(REQUETE_TELEPHONE).matches);
  useEffect(() => {
    const m = window.matchMedia?.(REQUETE_TELEPHONE);
    if (!m) return undefined;
    const suivre = (e) => setTelephone(e.matches);
    m.addEventListener?.('change', suivre);
    return () => m.removeEventListener?.('change', suivre);
  }, []);
  return telephone;
}

const theme = (isDark) => ({
  bord: isDark ? 'border-slate-600' : 'border-slate-200',
  fond: isDark ? 'bg-slate-800' : 'bg-white',
  fondDoux: isDark ? 'bg-slate-700/70' : 'bg-slate-100',
  texte: isDark ? 'text-slate-100' : 'text-slate-800',
  texteDoux: isDark ? 'text-slate-400' : 'text-slate-500',
  survol: isDark ? 'hover:bg-slate-700/60' : 'hover:bg-slate-50',
  placeholder: isDark ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400',
});

const normaliser = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Champ de recherche : 44 px, icône, bouton d'effacement. */
export function ChampRecherche({ valeur, onChange, placeholder = 'Rechercher…', ariaLabel, isDark, couleur = '#f97316', compact = false, className = '' }) {
  const t = theme(isDark);
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Search size={17} aria-hidden="true" className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${t.texteDoux}`} />
      <input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className={`w-full ${compact ? 'h-10' : 'h-11'} pl-10 pr-10 rounded-xl border text-base sm:text-sm outline-none transition-shadow focus:ring-2 ${t.fond} ${t.bord} ${t.texte} ${t.placeholder}`}
        style={{ '--tw-ring-color': `${couleur}55` }}
      />
      {valeur ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          className={`absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center ${t.texteDoux} ${t.survol}`}
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

/** Bouton qui ouvre un volet : libellé, valeur en cours, nombre de filtres actifs. */
export const BoutonVolet = forwardRef(function BoutonVolet(
  { icone: Icone = SlidersHorizontal, libelle, valeur, compte = 0, ouvert = false, onClick, isDark, couleur = '#f97316', libelleCacheTelephone = false },
  ref,
) {
  const t = theme(isDark);
  const actif = compte > 0;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={ouvert}
      aria-label={`${libelle}${valeur ? ` : ${valeur}` : ''}${compte ? ` (${compte} actif${compte > 1 ? 's' : ''})` : ''}`}
      className={`h-11 inline-flex items-center justify-center gap-2 ${libelleCacheTelephone ? 'min-w-[44px] px-3 sm:px-3.5' : 'px-3.5'} rounded-xl border text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
        actif ? '' : `${t.fond} ${t.bord} ${t.texte} ${t.survol}`
      }`}
      style={actif ? { background: `${couleur}14`, borderColor: `${couleur}80`, color: couleur } : undefined}
    >
      <Icone size={16} aria-hidden="true" className="flex-shrink-0" />
      <span className={libelleCacheTelephone ? 'hidden sm:inline' : ''}>{libelle}</span>
      {valeur ? <span className={`hidden sm:inline font-semibold ${actif ? '' : t.texte}`}>{valeur}</span> : null}
      {compte > 0 ? (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white flex items-center justify-center tabular-nums" style={{ background: couleur }}>
          {compte}
        </span>
      ) : null}
      <ChevronDown size={15} aria-hidden="true" className={`flex-shrink-0 opacity-60 transition-transform ${ouvert ? 'rotate-180' : ''} ${libelleCacheTelephone ? 'hidden sm:block' : ''}`} />
    </button>
  );
});

/**
 * Volet : panneau qui monte du bas sur téléphone ; ailleurs, panneau ancré sous le bouton
 * (aligné à droite du bouton, toujours gardé dans l'écran, ouvert vers le haut s'il manque de place).
 */
export function Volet({ ouvert, onFermer, titre, ancreRef, children, pied, isDark, largeur = 380 }) {
  const telephone = useEstTelephone();
  const t = theme(isDark);
  const panneauRef = useFocusTrap(ouvert, { lockScroll: telephone, focusConteneur: true });
  const [position, setPosition] = useState(null);

  // Ancrage (ordinateur et tablette).
  useLayoutEffect(() => {
    if (!ouvert || telephone) return undefined;
    const placer = () => {
      const ancre = ancreRef?.current?.getBoundingClientRect();
      if (!ancre) { setPosition({ top: 80, left: Math.max(8, (window.innerWidth - largeur) / 2), maxHeight: window.innerHeight - 96 }); return; }
      const l = Math.min(largeur, window.innerWidth - 16);
      const left = Math.min(Math.max(8, ancre.right - l), window.innerWidth - l - 8);
      const dessous = window.innerHeight - ancre.bottom - 16;
      const dessus = ancre.top - 16;
      if (dessous >= 320 || dessous >= dessus) setPosition({ top: ancre.bottom + 8, left, width: l, maxHeight: Math.max(220, dessous) });
      else setPosition({ bottom: window.innerHeight - ancre.top + 8, left, width: l, maxHeight: dessus });
    };
    placer();
    window.addEventListener('resize', placer);
    window.addEventListener('scroll', placer, true);
    return () => { window.removeEventListener('resize', placer); window.removeEventListener('scroll', placer, true); };
  }, [ouvert, telephone, ancreRef, largeur]);

  // Échap ferme ; un clic en dehors aussi (ordinateur : pas de voile).
  useEffect(() => {
    if (!ouvert) return undefined;
    const touche = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onFermer(); } };
    const dehors = (e) => {
      if (telephone) return;
      if (panneauRef.current?.contains(e.target) || ancreRef?.current?.contains(e.target)) return;
      onFermer();
    };
    document.addEventListener('keydown', touche);
    document.addEventListener('mousedown', dehors);
    return () => { document.removeEventListener('keydown', touche); document.removeEventListener('mousedown', dehors); };
  }, [ouvert, telephone, onFermer, ancreRef, panneauRef]);

  if (!ouvert) return null;

  const contenu = (
    <>
      <div className={`flex items-center justify-between gap-3 px-5 ${telephone ? 'pt-1 pb-3' : 'pt-4 pb-3'} border-b ${t.bord}`}>
        <h2 className={`text-base font-bold ${t.texte}`}>{titre}</h2>
        <button type="button" onClick={onFermer} aria-label="Fermer" className={`w-10 h-10 -mr-2 rounded-xl flex items-center justify-center ${t.texteDoux} ${t.survol}`}>
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-6">{children}</div>
      {pied ? <div className={`px-5 py-3 border-t ${t.bord} flex items-center gap-3`}>{pied}</div> : null}
    </>
  );

  if (telephone) {
    return createPortal(
      <div className="fixed inset-0 z-[1060] flex flex-col justify-end" role="presentation">
        <div className="absolute inset-0 bg-black/45 animate-fade-in" onClick={onFermer} aria-hidden="true" />
        <div
          ref={panneauRef}
          role="dialog"
          aria-modal="true"
          aria-label={titre}
          tabIndex={-1}
          className={`relative w-full max-h-[85vh] flex flex-col rounded-t-3xl shadow-2xl animate-slide-up outline-none ${t.fond}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex justify-center pt-2.5 pb-1" aria-hidden="true">
            <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
          </div>
          {contenu}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={panneauRef}
      role="dialog"
      aria-label={titre}
      tabIndex={-1}
      className={`fixed z-[1060] flex flex-col rounded-2xl border shadow-2xl outline-none ${t.fond} ${t.bord}`}
      style={position ? { top: position.top, bottom: position.bottom, left: position.left, width: position.width, maxHeight: position.maxHeight } : { visibility: 'hidden' }}
    >
      {contenu}
    </div>,
    document.body,
  );
}

/** Titre de section dans un volet. */
function TitreSection({ children, isDark }) {
  return <legend className={`text-[11px] font-semibold uppercase tracking-wider mb-2.5 ${theme(isDark).texteDoux}`}>{children}</legend>;
}

/**
 * Puces de choix (choix court). `multiple` : valeur = Set, sinon une valeur simple.
 * options : [{ valeur, libelle, icone?, compte? }]
 */
export function GroupeChoix({ titre, options, valeur, onChange, multiple = false, isDark, couleur = '#f97316' }) {
  const t = theme(isDark);
  const choisi = (v) => (multiple ? !!valeur?.has?.(v) : valeur === v);
  const basculer = (v) => {
    if (!multiple) return onChange(v);
    const suivant = new Set(valeur);
    if (suivant.has(v)) suivant.delete(v); else suivant.add(v);
    return onChange(suivant);
  };
  return (
    <fieldset>
      {titre ? <TitreSection isDark={isDark}>{titre}</TitreSection> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const oui = choisi(o.valeur);
          const Icone = o.icone;
          return (
            <button
              key={String(o.valeur)}
              type="button"
              onClick={() => basculer(o.valeur)}
              aria-pressed={oui}
              className={`min-h-[40px] inline-flex items-center gap-1.5 px-3.5 rounded-full border text-sm font-medium transition-colors ${oui ? '' : `${t.fond} ${t.bord} ${t.texte} ${t.survol}`}`}
              style={oui ? { background: `${couleur}14`, borderColor: couleur, color: couleur } : undefined}
            >
              {oui ? <Check size={15} strokeWidth={2.75} aria-hidden="true" /> : Icone ? <Icone size={15} aria-hidden="true" /> : null}
              {o.libelle}
              {typeof o.compte === 'number' ? <span className="text-xs opacity-70 tabular-nums">{o.compte}</span> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Liste à choix unique ; recherche affichée au-delà de `rechercheAuDela` entrées.
 * options : [{ valeur, libelle, detail?, icone?, toujours? }] — `toujours` : visible même filtrée (« Tous »).
 */
export function ListeChoix({ titre, options, valeur, onChange, rechercheAuDela = 7, placeholder = 'Rechercher…', vide = 'Aucun résultat', isDark, couleur = '#f97316' }) {
  const t = theme(isDark);
  const [requete, setRequete] = useState('');
  const q = normaliser(requete);
  const visibles = q ? options.filter((o) => o.toujours || normaliser(`${o.libelle} ${o.detail || ''}`).includes(q)) : options;
  return (
    <fieldset>
      {titre ? <TitreSection isDark={isDark}>{titre}</TitreSection> : null}
      {options.length > rechercheAuDela ? (
        <ChampRecherche valeur={requete} onChange={setRequete} placeholder={placeholder} isDark={isDark} couleur={couleur} compact className="mb-2" />
      ) : null}
      <div role="radiogroup" aria-label={titre} className={`rounded-xl border overflow-hidden ${t.bord} ${options.length > rechercheAuDela ? 'max-h-64 overflow-y-auto overscroll-contain' : ''}`}>
        {visibles.map((o, i) => {
          const oui = valeur === o.valeur;
          const Icone = o.icone;
          return (
            <button
              key={String(o.valeur)}
              type="button"
              role="radio"
              aria-checked={oui}
              onClick={() => onChange(o.valeur)}
              className={`w-full min-h-[48px] flex items-center gap-3 px-3.5 py-2 text-left transition-colors ${i ? `border-t ${t.bord}` : ''} ${t.survol}`}
            >
              {Icone ? <Icone size={17} aria-hidden="true" className={oui ? '' : t.texteDoux} style={oui ? { color: couleur } : undefined} /> : null}
              <span className="flex-1 min-w-0">
                <span className={`block truncate text-[15px] sm:text-sm ${oui ? 'font-semibold' : t.texte}`} style={oui ? { color: couleur } : undefined}>{o.libelle}</span>
                {o.detail ? <span className={`block truncate text-xs ${t.texteDoux}`}>{o.detail}</span> : null}
              </span>
              <span
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: oui ? couleur : (isDark ? '#64748b' : '#cbd5e1'), background: oui ? couleur : 'transparent' }}
                aria-hidden="true"
              >
                {oui ? <Check size={12} strokeWidth={3.5} className="text-white" /> : null}
              </span>
            </button>
          );
        })}
        {!visibles.length ? <p className={`px-3.5 py-4 text-sm ${t.texteDoux}`}>{vide}</p> : null}
      </div>
    </fieldset>
  );
}

/** Les filtres actifs, chacun retirable d'une touche ; « Tout effacer » au-delà d'un. */
export function PucesActives({ puces, onToutEffacer, isDark, couleur = '#f97316' }) {
  const t = theme(isDark);
  if (!puces?.length) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap" aria-label="Filtres actifs">
      {puces.map((p) => (
        <button
          key={p.cle}
          type="button"
          onClick={p.onRetirer}
          aria-label={`Retirer le filtre ${p.libelle}`}
          className="min-h-[40px] inline-flex items-center gap-1.5 pl-3.5 pr-2.5 rounded-full text-[13px] font-semibold whitespace-nowrap flex-shrink-0 transition-opacity hover:opacity-80"
          style={{ background: `${couleur}14`, color: couleur }}
        >
          {p.libelle}
          <X size={15} aria-hidden="true" />
        </button>
      ))}
      {puces.length > 1 ? (
        <button type="button" onClick={onToutEffacer} className={`min-h-[40px] px-2 text-[13px] font-medium whitespace-nowrap flex-shrink-0 hover:underline underline-offset-2 ${t.texteDoux}`}>
          Tout effacer
        </button>
      ) : null}
    </div>
  );
}

/** Rangée du filtre principal (défile sur téléphone, garde le choix en vue). */
export function SegmentDefilant({ options, valeur, onChange, ariaLabel, isDark, couleur = '#f97316' }) {
  const t = theme(isDark);
  const rangeeRef = useRef(null);
  useEffect(() => {
    const rangee = rangeeRef.current;
    const actif = rangee?.querySelector('[aria-pressed="true"]');
    if (!rangee || !actif) return;
    const gauche = actif.offsetLeft - rangee.offsetLeft;
    if (gauche < rangee.scrollLeft || gauche + actif.offsetWidth > rangee.scrollLeft + rangee.clientWidth) {
      rangee.scrollLeft = Math.max(0, gauche - 12);
    }
  }, [valeur]);
  return (
    <div ref={rangeeRef} role="group" aria-label={ariaLabel} className="flex gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
      {options.map((o) => {
        const oui = o.valeur === valeur;
        const Icone = o.icone;
        return (
          <button
            key={String(o.valeur)}
            type="button"
            onClick={() => onChange(o.valeur)}
            aria-pressed={oui}
            className={`h-10 inline-flex items-center gap-1.5 px-4 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${oui ? 'text-white shadow-sm' : `${t.fondDoux} ${t.texte}`}`}
            style={oui ? { background: couleur } : undefined}
          >
            {Icone ? <Icone size={15} aria-hidden="true" /> : null}
            {o.libelle}
            {o.compte > 0 ? (
              <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums ${oui ? 'bg-white/25 text-white' : isDark ? 'bg-slate-600 text-slate-200' : 'bg-white text-slate-600'}`}>
                {o.compte}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
