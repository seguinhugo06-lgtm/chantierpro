/**
 * ExempleRelances — « Relances » : la frise du scénario de relance de devis que propose l'app (« Relance Devis » des
 * réglages) ; étapes, délais et noms lus dans le code (`DEFAULT_DEVIS_STEPS`, src/lib/scenariosRelance.js, que
 * l'écran des réglages RelanceConfigTab réexporte), chaque étape avec l'objet du message que l'app envoie.
 *
 * Une fois à l'écran, la frise se dessine une fois de haut en bas (trait qui descend, étapes l'une après l'autre) ;
 * en mouvement réduit, ou sans IntersectionObserver, elle est entière d'emblée.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Mail, Send } from 'lucide-react';
import { statut } from '../../../lib/statuts';
import { DEFAULT_DEVIS_STEPS } from '../../../lib/scenariosRelance';
import { CLIENT, NUMERO_DEVIS } from '../devisVivantEtapes';
import { friseDesRelances } from './exemples';
import { LegendeExemple, PastilleExemple } from './communs';

const FRISE = friseDesRelances(DEFAULT_DEVIS_STEPS, NUMERO_DEVIS);
const PAS = 0.45;

/** Une étape de la frise : son repère sur le trait, puis son contenu. */
function Etape({ rang, anime, joue, repere, children, ...autres }) {
  return (
    <motion.li
      {...autres}
      initial={anime ? { opacity: 0, x: -10 } : false}
      animate={joue ? { opacity: 1, x: 0 } : undefined}
      transition={{ duration: 0.35, delay: rang * PAS, ease: 'easeOut' }}
      className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3"
    >
      <span className="relative z-10 flex h-10 w-10 items-center justify-center">{repere}</span>
      <div className="min-w-0 pb-1">{children}</div>
    </motion.li>
  );
}

export default function ExempleRelances({ visible = true }) {
  const reduit = !!useReducedMotion();
  const liste = useRef(null);
  const vue = useInView(liste, { once: true, amount: 0.35 });
  const anime = !reduit && typeof IntersectionObserver !== 'undefined';
  const joue = !anime || (vue && visible);
  const envoye = statut('devis', 'envoye');

  return (
    <>
      <div className="flex flex-1 flex-col p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-marque-acier/60 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-base font-bold tracking-tight text-slate-900">Devis {NUMERO_DEVIS}</p>
            <p className="text-sm text-slate-600">{CLIENT} n'a pas encore répondu</p>
          </div>
          <PastilleExemple ton="info">{envoye.libelle}</PastilleExemple>
        </div>

        <ol ref={liste} className="relative mt-5 flex flex-1 flex-col justify-between gap-4">
          {/* Le trait de la frise, et sa part déjà « parcourue » qui descend une fois (décor) */}
          <span aria-hidden="true" className="absolute bottom-5 left-5 top-5 w-0.5 -translate-x-1/2 rounded-full bg-marque-acier/70" />
          <motion.span
            aria-hidden="true"
            initial={anime ? { scaleY: 0 } : false}
            animate={joue ? { scaleY: 1 } : undefined}
            transition={{ duration: PAS * (FRISE.length + 1), ease: 'linear' }}
            className="absolute bottom-5 left-5 top-5 w-0.5 origin-top -translate-x-1/2 rounded-full bg-marque-nuit-2"
          />

          <Etape
            rang={0}
            anime={anime}
            joue={joue}
            repere={(
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-marque-nuit-2 text-white shadow-[0_6px_14px_-6px_rgba(13,46,108,0.7)]">
                <Send size={17} strokeWidth={2} aria-hidden="true" />
              </span>
            )}
          >
            <p className="pt-1.5 text-sm font-semibold text-slate-900">Jour 0 · Devis envoyé</p>
          </Etape>

          {FRISE.map((etape, i) => (
            <Etape
              key={etape.id}
              rang={i + 1}
              anime={anime}
              joue={joue}
              data-etape-relance=""
              repere={(
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-marque-nuit-2 bg-white text-marque-nuit-2">
                  <Mail size={17} strokeWidth={2} aria-hidden="true" />
                </span>
              )}
            >
              <div className="rounded-2xl border border-marque-acier/60 bg-white px-4 py-3 shadow-[0_14px_30px_-26px_rgba(13,46,108,0.6)]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span data-delai="" className="rounded-full bg-marque-glacier-2 px-2.5 py-0.5 text-xs font-bold tabular-nums text-marque-nuit">
                    {etape.libelleDelai}
                  </span>
                  <span data-nom="" className="text-sm font-bold text-slate-900">{etape.nom}</span>
                </div>
                <p data-objet="" className="mt-1.5 text-sm leading-snug text-slate-600">
                  Objet : <span className="whitespace-nowrap font-medium text-slate-800">{etape.objet}</span>
                </p>
              </div>
            </Etape>
          ))}
        </ol>
      </div>
      <LegendeExemple>Vous réglez les délais et les messages ; l'envoi automatique est une option.</LegendeExemple>
    </>
  );
}
