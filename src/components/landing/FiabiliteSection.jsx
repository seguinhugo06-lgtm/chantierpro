/**
 * FiabiliteSection — « Une facture, ça ne se bricole pas. » (spec de la refonte, section 6, `id="fiabilite"`).
 *
 * Bande bleu nuit avec le quadrillage en blanc très léger ; quatre garanties, chacune avec un visuel animé sobrement
 * et son texte (le `h3`, seul porteur de l'information : les visuels sont `aria-hidden`) :
 *   - un registre de numéros de facture qui avance d'une unité, sans trou ;
 *   - un cadenas qui se ferme une fois à l'écran ;
 *   - une barre d'encaissement par paliers, « Payée » seulement au solde ;
 *   - trois mentions qui s'ajoutent l'une après l'autre.
 * Le registre et la barre ne tournent que si la bande est à l'écran et l'onglet affiché (`useALEcran`) ; en
 * mouvement réduit ils restent fixes (registre sur FAC-2026-00041, barre pleine et « Payée »), le cadenas est
 * fermé et les mentions sont là d'emblée.
 * Couleurs sur la bande nuit : blanc, acier (≥ 7,9:1 sur les cartes) et glacier ; l'orange du logo seulement en point
 * (décor) : en texte, il tomberait sous 4,5:1 sur le fond éclairci des cartes.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Check, Lock, Unlock } from 'lucide-react';
import SectionSite from './site/SectionSite';
import EnTeteSection from './site/EnTeteSection';
import Apparition from './site/Apparition';
import PlanArchitecte from './site/PlanArchitecte';
import useALEcran from './site/useALEcran';

/** Numéro de départ du registre (fictif, comme celui du devis vivant). */
const PREMIER_NUMERO = 41;
const RYTHME_MS = 1600;
const numeroDeFacture = (n) => `FAC-2026-${String(n).padStart(5, '0')}`;

/** Paliers de la barre d'encaissement : deux paiements partiels, puis le solde. */
const PALIERS = [0.3, 0.65, 1];

const MENTIONS = ['Assurance décennale', 'TVA réduite', 'Pénalités de retard'];

const POINT_ORANGE = 'h-2 w-2 shrink-0 rounded-full bg-marque-orange shadow-[0_0_0_3px_rgba(238,123,32,0.2),0_0_10px_rgba(238,123,32,0.8)]';

/**
 * Le registre : trois numéros visibles, le dernier en blanc, suivi du point orange. À chaque pas, la liste (quatre
 * numéros) repart décalée d'une ligne vers le bas puis remonte : le plus ancien sort par le haut, le nouveau entre.
 */
function Registre({ actif }) {
  const [numero, setNumero] = useState(PREMIER_NUMERO);
  useEffect(() => {
    if (!actif) return undefined;
    const minuterie = setInterval(() => setNumero((n) => n + 1), RYTHME_MS);
    return () => clearInterval(minuterie);
  }, [actif]);

  return (
    <div data-compteur={numero} className="relative h-[84px] w-full overflow-hidden font-mono text-base tabular-nums">
      <motion.ol
        key={numero}
        initial={numero === PREMIER_NUMERO ? false : { y: 28 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        className="absolute inset-x-0 bottom-0"
      >
        {[numero - 3, numero - 2, numero - 1, numero].map((n) => (
          <li key={n} className={`flex h-7 items-center gap-2.5 ${n === numero ? 'font-bold text-white' : 'text-marque-acier'}`}>
            <span data-numero-facture="">{numeroDeFacture(n)}</span>
            {n === numero ? <span className={POINT_ORANGE} /> : null}
          </li>
        ))}
      </motion.ol>
    </div>
  );
}

/** Le cadenas se ferme une fois, quand il arrive à l'écran ; fermé d'emblée en mouvement réduit. */
function Cadenas({ reduit }) {
  const zone = useRef(null);
  const vu = useInView(zone, { once: true, amount: 0.8 });
  const ferme = reduit || vu || typeof IntersectionObserver === 'undefined';
  const Icone = ferme ? Lock : Unlock;
  return (
    <div ref={zone}>
      <motion.span
        animate={ferme ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"
      >
        <Icone size={30} strokeWidth={2} className="text-marque-glacier-3" />
        {/* Le voyant du logo, posé au coin du cadenas */}
        <span className={`absolute -right-1 -top-1 ${POINT_ORANGE}`} />
      </motion.span>
    </div>
  );
}

/**
 * La barre d'encaissement d'une facture : paliers à 30 %, 65 %, puis 100 % ; la pastille ne dit « Payée » qu'au
 * solde. Elle n'avance jamais à reculons : une facture « Payée » ne redevient pas « Payée en partie ». Au bout du
 * cycle, c'est une nouvelle facture (comme le registre voisin, qui passe au numéro suivant) : le bloc est recréé,
 * apparaît en fondu et sa barre repart de zéro vers le premier palier, sans transition arrière.
 * `data-facture` (rang de la facture montrée) et `data-barre` : lus par le parcours.
 */
function Encaissement({ actif, reduit }) {
  const [pas, setPas] = useState(0);
  useEffect(() => {
    if (!actif) return undefined;
    const minuterie = setInterval(() => setPas((p) => p + 1), RYTHME_MS);
    return () => clearInterval(minuterie);
  }, [actif]);

  const facture = reduit ? 0 : Math.floor(pas / PALIERS.length);
  const part = reduit ? 1 : PALIERS[pas % PALIERS.length];
  const payee = part >= 1;
  const nouvelle = facture > 0;
  return (
    <motion.div
      key={facture}
      data-encaissement={part}
      data-facture={facture}
      initial={nouvelle ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          data-statut=""
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${payee ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/10 text-marque-glacier-3'}`}
        >
          {payee ? 'Payée' : 'Payée en partie'}
        </span>
        <span className="text-sm tabular-nums text-marque-acier">{`${Math.round(part * 100)} %`}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.12]">
        <motion.div
          data-barre=""
          initial={nouvelle ? { width: '0%' } : false}
          animate={{ width: `${part * 100}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`h-full rounded-full ${payee ? 'bg-emerald-300' : 'bg-gradient-to-r from-marque-glacier-3 to-marque-acier'}`}
        />
      </div>
    </motion.div>
  );
}

/** Les trois mentions s'ajoutent l'une après l'autre, une fois à l'écran ; présentes d'emblée en mouvement réduit. */
function Mentions({ reduit }) {
  const anime = !reduit && typeof IntersectionObserver !== 'undefined';
  return (
    <ul data-mentions="" className="flex flex-col gap-1.5 text-sm text-marque-acier">
      {MENTIONS.map((mention, i) => (
        <motion.li
          key={mention}
          initial={anime ? { opacity: 0, x: -8 } : false}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 1 }}
          transition={{ duration: 0.3, delay: 0.3 + i * 0.35 }}
          className="flex items-center gap-2"
        >
          <Check size={16} strokeWidth={3} className="shrink-0 text-marque-glacier-3" />
          {mention}
        </motion.li>
      ))}
    </ul>
  );
}

function Garantie({ visuel, children }) {
  return (
    <li className="flex flex-col rounded-2xl border border-marque-acier/25 bg-white/[0.04] p-5">
      <div aria-hidden="true" className="flex h-[84px] items-center">
        {visuel}
      </div>
      <h3 className="mt-5 text-base font-semibold leading-snug text-white">{children}</h3>
    </li>
  );
}

export default function FiabiliteSection() {
  const reduit = !!useReducedMotion();
  const grille = useRef(null);
  const aLEcran = useALEcran(grille, 0.25);
  const actif = !reduit && aLEcran;

  return (
    <SectionSite id="fiabilite" fond="nuit" decor={<PlanArchitecte ton="nuit" />}>
      <EnTeteSection titre="Une facture, ça ne se bricole pas." sombre>
        Les règles importantes ne dépendent pas de l'écran : la base de données les fait respecter elle-même.
      </EnTeteSection>

      <Apparition delai={0.1}>
        <ul ref={grille} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Garantie visuel={<Registre actif={actif} />}>Des numéros qui se suivent, sans trou</Garantie>
          <Garantie visuel={<Cadenas reduit={reduit} />}>
            Une facture envoyée ne se supprime pas : on la corrige par un avoir
          </Garantie>
          <Garantie visuel={<Encaissement actif={actif} reduit={reduit} />}>
            Une facture n'est « payée » que si les paiements la soldent
          </Garantie>
          <Garantie visuel={<Mentions reduit={reduit} />}>
            Assurance décennale, TVA réduite, pénalités de retard : les mentions s'ajoutent toutes seules
          </Garantie>
        </ul>
      </Apparition>
    </SectionSite>
  );
}
