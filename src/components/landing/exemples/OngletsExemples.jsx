/**
 * OngletsExemples — les cinq onglets de « Les fonctionnalités en action » et leurs exemples, dans un cadre
 * d'application. Chargé à la demande par `FonctionnalitesSection.jsx` (`import()`, quand la section approche de
 * l'écran) : ni ce fichier ni les exemples ne pèsent sur le premier écran du site.
 *
 * Bureau : onglets en colonne (icône, titre, une phrase), l'exemple à droite. Téléphone : onglets en pastilles sur une
 * rangée qui défile seule (la page, elle, ne défile pas en largeur), l'exemple dessous.
 * Un exemple déjà ouvert reste monté (caché) : on retrouve sa signature, son métré, ses encaissements.
 *
 * Accessibilité (motif « onglets » de l'ARIA) : `role="tablist"`, `aria-selected`, un seul onglet dans l'ordre de
 * tabulation ; flèches gauche/droite et haut/bas, Début, Fin (activation immédiate) ; une touche accompagnée d'Alt,
 * Ctrl ou Méta garde son rôle habituel. Chaque panneau (`role="tabpanel"`) est relié à son onglet.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BellRing, FileText, PenLine, Ruler, Wallet } from 'lucide-react';
import { ONGLETS, ongletVoisin } from '../fonctionnalitesOnglets';
import ExempleDocument from './ExempleDocument';
import ExempleSignature from './ExempleSignature';
import ExempleMetre from './ExempleMetre';
import ExempleRelances from './ExempleRelances';
import ExempleEncaissements from './ExempleEncaissements';
import { FOCUS_INTERIEUR, FOCUS_SUR_GLACIER } from '../site/focus';

const ICONES = { document: FileText, signature: PenLine, metre: Ruler, relances: BellRing, encaissements: Wallet };
const EXEMPLES = {
  document: ExempleDocument,
  signature: ExempleSignature,
  metre: ExempleMetre,
  relances: ExempleRelances,
  encaissements: ExempleEncaissements,
};
const IDS = ONGLETS.map((o) => o.id);

const POINT_ORANGE = 'h-2 w-2 shrink-0 rounded-full bg-marque-orange shadow-[0_0_0_3px_rgba(238,123,32,0.18),0_0_10px_rgba(238,123,32,0.75)]';

/**
 * Un onglet : pastille au téléphone (pleine bleu nuit quand elle est choisie) ; carte au bureau, avec son icône, son
 * titre et sa phrase (blanche, liseré bleu nuit à gauche quand elle est choisie).
 */
function Onglet({ onglet, choisi, refBouton, onChoisir }) {
  const Icone = ICONES[onglet.id];
  return (
    <button
      ref={refBouton}
      type="button"
      role="tab"
      id={`onglet-${onglet.id}`}
      aria-controls={`panneau-${onglet.id}`}
      aria-selected={choisi}
      tabIndex={choisi ? 0 : -1}
      data-onglet={onglet.id}
      onClick={() => onChoisir(onglet.id)}
      className={`relative flex min-h-[44px] shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-left text-sm font-semibold transition-[color,background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none ${FOCUS_SUR_GLACIER} lg:w-full lg:shrink lg:gap-3.5 lg:rounded-2xl lg:py-3.5 lg:pl-5 lg:pr-4 lg:text-base ${
        choisi
          ? 'border-marque-nuit-2 bg-marque-nuit-2 text-white shadow-[0_8px_18px_-10px_rgba(13,46,108,0.7)] lg:border-marque-acier/70 lg:bg-white lg:text-marque-nuit lg:shadow-[0_18px_40px_-28px_rgba(13,46,108,0.55)]'
          : 'border-marque-acier bg-white text-marque-ardoise hover:border-marque-nuit-2/60 hover:text-marque-nuit lg:border-transparent lg:bg-transparent lg:text-slate-800 lg:hover:border-marque-acier/60 lg:hover:bg-white/70'
      }`}
    >
      {choisi ? <span aria-hidden="true" className="absolute inset-y-3 left-0 hidden w-1 rounded-full bg-marque-nuit-2 lg:block" /> : null}
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center lg:h-10 lg:w-10 lg:rounded-xl ${
          choisi ? 'lg:bg-marque-nuit-2 lg:text-white' : 'lg:bg-marque-glacier-2 lg:text-marque-nuit-2'
        }`}
      >
        <Icone size={18} strokeWidth={2} className="h-4 w-4 lg:h-5 lg:w-5" />
      </span>
      <span className="min-w-0">
        {/* Sous 1024 px, le titre court (trois onglets tiennent dans un téléphone) ; au bureau, le titre de la spec.
            `data-titre` garde le titre de la spec (lu par le parcours, même caché). */}
        <span data-titre="" className="hidden leading-snug lg:block">
          {onglet.titre}
        </span>
        <span data-titre-court="" className="block whitespace-nowrap leading-snug lg:hidden">
          {onglet.titreCourt}
        </span>
        <span data-phrase="" className="mt-0.5 hidden text-sm font-normal leading-snug text-slate-600 lg:block">
          {onglet.phrase}
        </span>
      </span>
    </button>
  );
}

export default function OngletsExemples() {
  const reduit = !!useReducedMotion();
  const [actif, setActif] = useState(IDS[0]);
  const [ouverts, setOuverts] = useState(() => new Set([IDS[0]]));
  // Les panneaux apparaissent en fondu seulement après un premier choix du visiteur (pas à l'arrivée)
  const [choixFait, setChoixFait] = useState(false);
  const boutons = useRef({});

  const choisir = (id) => {
    setActif(id);
    setChoixFait(true);
    setOuverts((avant) => (avant.has(id) ? avant : new Set([...avant, id])));
  };

  /** Focalise l'onglet et le rend visible dans sa rangée (téléphone) sans faire sauter la page. */
  const montrer = (id) => {
    const bouton = boutons.current[id];
    if (!bouton) return;
    bouton.focus({ preventScroll: true });
    bouton.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: reduit ? 'auto' : 'smooth' });
  };

  const auClavier = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const depuis = e.target.closest?.('[role="tab"]')?.dataset?.onglet || actif;
    const cible = ongletVoisin(IDS, depuis, e.key);
    if (!cible) return;
    e.preventDefault();
    choisir(cible);
    montrer(cible);
  };

  const ongletActif = ONGLETS.find((o) => o.id === actif) || ONGLETS[0];

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* Flèches : `onKeyDown` sur la liste, qui reçoit les touches de ses onglets (événements délégués). */}
      <div
        role="tablist"
        aria-label="Fonctionnalités à essayer"
        onKeyDown={auClavier}
        // Sous 1024 px, un fondu au bord droit dit que la rangée continue (les onglets suivants défilent)
        className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-1 scrollbar-hide [mask-image:linear-gradient(to_right,#000_85%,transparent)] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-0 lg:[mask-image:none]"
      >
        {ONGLETS.map((onglet) => (
          <Onglet
            key={onglet.id}
            onglet={onglet}
            choisi={onglet.id === actif}
            refBouton={(el) => { boutons.current[onglet.id] = el; }}
            onChoisir={(id) => { choisir(id); montrer(id); }}
          />
        ))}
      </div>

      <div className="mt-5 min-w-0 lg:mt-0">
        <div className="overflow-hidden rounded-[22px] border border-marque-acier/70 bg-white shadow-[0_30px_60px_-28px_rgba(13,46,108,0.45)]">
          {/* Barre du cadre d'application (décor et rappel de l'exemple ouvert ; l'onglet porte déjà son nom). */}
          <div aria-hidden="true" className="flex h-11 items-center gap-3 border-b border-marque-acier/60 bg-marque-glacier-1 px-4">
            <span className="hidden shrink-0 gap-1.5 sm:flex">
              <span className="h-2.5 w-2.5 rounded-full bg-marque-acier" />
              <span className="h-2.5 w-2.5 rounded-full bg-marque-acier" />
              <span className="h-2.5 w-2.5 rounded-full bg-marque-acier" />
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <img src="/icon.svg" alt="" width="18" height="18" loading="lazy" className="h-[18px] w-[18px] shrink-0" />
              {/* Téléphone : le titre court, que le numéro tienne entier */}
              <span data-cadre-titre="" className="truncate text-sm font-semibold text-marque-ardoise">
                <span className="hidden sm:inline">Mallettico · {ongletActif.cadre}</span>
                <span className="sm:hidden">{ongletActif.cadreCourt}</span>
              </span>
            </span>
            <span className={`ml-auto ${POINT_ORANGE}`} />
          </div>

          {ONGLETS.map((onglet) => {
            const visible = onglet.id === actif;
            const Exemple = EXEMPLES[onglet.id];
            return (
              <div
                key={onglet.id}
                role="tabpanel"
                id={`panneau-${onglet.id}`}
                aria-labelledby={`onglet-${onglet.id}`}
                hidden={!visible}
                tabIndex={0}
                className={FOCUS_INTERIEUR}
              >
                {/* Au bureau, les cinq exemples ont la même hauteur (celle du plus haut : le document, et la facture
                    soldée) : le cadre ne change pas d'un onglet à l'autre ; chacun occupe la place (`flex-1`). */}
                {ouverts.has(onglet.id) ? (
                  <motion.div
                    className="flex flex-col lg:min-h-[40rem]"
                    initial={choixFait && !reduit ? { opacity: 0, y: 6 } : false}
                    animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                    transition={{ duration: visible && !reduit ? 0.28 : 0, ease: 'easeOut' }}
                  >
                    <Exemple visible={visible} />
                  </motion.div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
