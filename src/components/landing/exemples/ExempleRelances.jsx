/**
 * ExempleRelances — « Relances » : la frise du scénario de relance de devis que propose l'app (« Relance Devis » des
 * réglages) ; étapes, délais et noms lus dans le code (`DEFAULT_DEVIS_STEPS`, src/lib/scenariosRelance.js, que
 * l'écran des réglages RelanceConfigTab réexporte). L'objet du message que l'app envoie est dit une fois, en tête (il
 * est le même pour les trois relances) ; chaque étape montre la première phrase de son message, le modèle de l'app
 * rempli avec le devis fictif (`friseDesRelances`, exemples.js) : le ton qui monte se lit (relecture DA-12).
 *
 * Une fois à l'écran, la frise se dessine une seule fois de haut en bas (étapes l'une après l'autre, chaque trait
 * descend jusqu'à l'étape suivante) ; elle ne se rejoue pas au retour sur l'onglet. En mouvement réduit, ou sans
 * IntersectionObserver, elle est entière d'emblée. Le trait s'arrête à la dernière étape.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Mail, Send } from 'lucide-react';
import { statut } from '../../../lib/statuts';
import { captureException } from '../../../lib/sentry';
import { DEFAULT_DEVIS_STEPS } from '../../../lib/scenariosRelance';
import { CLIENT, NUMERO_DEVIS, lotDemonstration } from '../devisVivantEtapes';
import { chargerBibliotheque } from '../site/bibliotheque';
import { friseDesRelances, montantDuDevis } from './exemples';
import { LegendeExemple, PastilleExemple } from './communs';
import { SANS_OBSERVATEUR, zoneObservee } from '../site/observateur';

/** Sans le montant (bibliothèque pas encore là) : délais, noms et objet ; les phrases arrivent avec le montant. */
const FRISE_SANS_MONTANT = friseDesRelances(DEFAULT_DEVIS_STEPS, NUMERO_DEVIS);
const PAS = 0.45;
const CACHEE = { opacity: 0, x: -10 };
const MONTREE = { opacity: 1, x: 0 };

/**
 * Une étape de la frise : son repère, son contenu et, sauf pour la dernière, le trait qui descend jusqu'au repère de
 * l'étape suivante (l'étape occupe la place jusqu'à elle). `montree` ne repasse jamais à faux : pas de rejeu.
 */
function Etape({ rang, anime, montree, derniere = false, repere, children, ...autres }) {
  return (
    <motion.li
      {...autres}
      initial={anime ? CACHEE : false}
      animate={montree ? MONTREE : CACHEE}
      transition={{ duration: 0.35, delay: rang * PAS, ease: 'easeOut' }}
      className={`relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 ${derniere ? '' : 'flex-1 pb-4'}`}
    >
      {!derniere ? (
        <>
          <span aria-hidden="true" data-trait="" className="absolute bottom-0 left-5 top-10 w-0.5 -translate-x-1/2 bg-marque-acier/70" />
          <motion.span
            aria-hidden="true"
            initial={anime ? { scaleY: 0 } : false}
            animate={{ scaleY: montree ? 1 : 0 }}
            transition={{ duration: PAS, delay: rang * PAS + 0.2, ease: 'linear' }}
            className="absolute bottom-0 left-5 top-10 w-0.5 origin-top -translate-x-1/2 bg-marque-nuit-2"
          />
        </>
      ) : null}
      <span className="relative z-10 flex h-10 w-10 items-center justify-center">{repere}</span>
      <div className="min-w-0">{children}</div>
    </motion.li>
  );
}

export default function ExempleRelances({ visible = true }) {
  const reduit = !!useReducedMotion();
  const liste = useRef(null);
  // Sans observateur ou en mouvement réduit, rien n'est observé (site/observateur.js) : la frise est entière d'emblée
  const vue = useInView(zoneObservee(liste, { reduit }), { once: true, amount: 0.35 });
  const anime = !reduit && !SANS_OBSERVATEUR;
  // Jouée une fois (onglet affiché et frise à l'écran), elle le reste : au retour sur l'onglet, rien ne se rejoue
  const [jouee, setJouee] = useState(false);
  useEffect(() => {
    if (vue && visible) setJouee(true);
  }, [vue, visible]);
  const montree = !anime || jouee;
  const envoye = statut('devis', 'envoye');

  // Le montant du devis fictif (2 081,20 € pour le lot du tableau), calculé depuis la bibliothèque comme le document et
  // la signature : la première phrase de chaque message le cite. Bibliothèque introuvable : pas de phrase (jamais
  // « 0,00 € »), la frise garde ses délais, ses noms et l'objet.
  const [montant, setMontant] = useState(null);
  useEffect(() => {
    let annule = false;
    chargerBibliotheque()
      .then((bibliotheque) => { if (!annule) setMontant(montantDuDevis(lotDemonstration(bibliotheque))); })
      .catch((erreur) => captureException(erreur, { composant: 'ExempleRelances' }));
    return () => { annule = true; };
  }, []);
  const frise = useMemo(() => (montant == null ? FRISE_SANS_MONTANT : friseDesRelances(DEFAULT_DEVIS_STEPS, NUMERO_DEVIS, montant)), [montant]);
  // L'objet est le même pour les trois relances (`objetDeRelance` de l'app) : dit une fois, en tête
  const objets = [...new Set(frise.map((e) => e.objet))];
  const objetCommun = objets.length === 1 ? objets[0] : null;

  return (
    <>
      <div className="flex flex-1 flex-col p-4 sm:p-6">
        <div className="rounded-2xl border border-marque-acier/60 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-bold tracking-tight text-slate-900">Devis {NUMERO_DEVIS}</p>
              <p className="text-sm text-slate-600">{CLIENT} n’a pas encore répondu</p>
            </div>
            <PastilleExemple ton="info">{envoye.libelle}</PastilleExemple>
          </div>
          {objetCommun ? (
            <p data-objet="" className="mt-2 border-t border-marque-acier/50 pt-2 text-sm leading-snug text-slate-600">
              Objet des messages : <span className="font-medium text-slate-800">{`«\u202f${objetCommun}\u202f»`}</span>
            </p>
          ) : null}
        </div>

        <ol ref={liste} className="relative mt-5 flex flex-1 flex-col">
          <Etape
            rang={0}
            anime={anime}
            montree={montree}
            repere={(
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-marque-nuit-2 text-white shadow-[0_6px_14px_-6px_rgba(13,46,108,0.7)]">
                <Send size={17} strokeWidth={2} aria-hidden="true" />
              </span>
            )}
          >
            <p className="pt-1.5 text-sm font-semibold text-slate-900">Jour 0 · Devis envoyé</p>
          </Etape>

          {frise.map((etape, i) => (
            <Etape
              key={etape.id}
              rang={i + 1}
              anime={anime}
              montree={montree}
              derniere={i === frise.length - 1}
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
                {objetCommun ? null : (
                  <p data-objet="" className="mt-1.5 text-sm leading-snug text-slate-600">
                    Objet : <span className="font-medium text-slate-800">{etape.objet}</span>
                  </p>
                )}
                {/* La première phrase du message de l'étape : le ton monte d'une relance à l'autre (texte de l'app) */}
                <p data-phrase="" className="mt-1.5 min-h-[2.75em] text-sm italic leading-snug text-slate-700">
                  {etape.phrase ? `«\u202f${etape.phrase}\u202f»` : '\u00a0'}
                </p>
              </div>
            </Etape>
          ))}
        </ol>
      </div>
      <LegendeExemple>Vous réglez les délais et les messages ; l’envoi automatique est une option.</LegendeExemple>
    </>
  );
}
