/**
 * ExempleEncaissements — « Encaissements » : une facture de 4 136,00 € déjà réglée en partie (acompte de 30 % et
 * virement partiel) ; chaque clic sur « Encaisser 500 € » note un paiement, le reste dû baisse, et la pastille ne passe
 * à « Payée » qu'au solde exact : le dernier clic encaisse le reste (395,20 €), jamais plus.
 *
 * - Logique pure et testée (`exemples.js`), en centimes entiers ; le statut est celui de l'app (`statutFacture`,
 *   libellés de `statuts.js`).
 * - Soldée : « Recommencer l'exemple » remet la facture de départ ; la barre y revient d'un coup (bloc recréé), sans
 *   repartir en arrière. En mouvement réduit, la barre change sans animation.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, RotateCcw } from 'lucide-react';
import { formatMoney } from '../../../lib/formatters';
import BoutonSite from '../site/BoutonSite';
import { CLIENT } from '../devisVivantEtapes';
import { FACTURE_FICTIVE } from './donneesFictives';
import { encaisser, etatDesEncaissements, libelleEncaisser, paiementsDeDepart } from './exemples';
import { LegendeExemple, PastilleExemple } from './communs';

const euros = (centimes) => formatMoney(centimes / 100, 2);

export default function ExempleEncaissements() {
  const reduit = !!useReducedMotion();
  const [paiements, setPaiements] = useState(() => paiementsDeDepart(FACTURE_FICTIVE));
  // Chaque « Recommencer l'exemple » recrée la barre et la liste : elles reviennent à l'état de départ sans animation
  const [tour, setTour] = useState(0);
  // Le bouton cliqué disparaît au solde (et à « Recommencer ») : le focus passe au bouton qui le remplace
  const actions = useRef(null);
  const suivreLeFocus = useRef(false);
  const etat = etatDesEncaissements(FACTURE_FICTIVE, paiements);
  const payee = etat.statut === 'payee';
  // Part encaissée, arrondie vers le bas : « 100 % » seulement au solde
  const pourcent = Math.floor((etat.encaisseCentimes / etat.totalCentimes) * 100);
  const reperes = paiements.slice(0, -1).reduce((liste, p) => [...liste, (liste[liste.length - 1] || 0) + p.centimes], []);

  useEffect(() => {
    if (!suivreLeFocus.current) return;
    suivreLeFocus.current = false;
    actions.current?.querySelector('button')?.focus({ preventScroll: true });
  }, [payee]);

  const recommencer = () => {
    suivreLeFocus.current = true;
    setPaiements(paiementsDeDepart(FACTURE_FICTIVE));
    setTour((t) => t + 1);
  };

  const encaisserUnPas = () => {
    suivreLeFocus.current = etat.prochainCentimes === etat.resteCentimes;
    setPaiements((liste) => encaisser(FACTURE_FICTIVE, liste));
  };

  return (
    <>
      <div className="flex flex-1 flex-col p-4 sm:p-6">
        <div className="flex flex-1 flex-col rounded-2xl border border-marque-acier/60 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(13,46,108,0.5)] sm:p-5">
          {/* Téléphone : la pastille d'abord, le titre a toute la largeur ; il ne se coupe pas dans le numéro */}
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
              <p className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                <span className="whitespace-nowrap">Facture {FACTURE_FICTIVE.numero} ·</span> <span className="whitespace-nowrap">{CLIENT}</span>
              </p>
              <p className="mt-0.5 text-sm text-slate-600">
                Total TTC <span data-total-facture="" className="font-semibold tabular-nums text-slate-900">{euros(etat.totalCentimes)}</span>
              </p>
            </div>
            <PastilleExemple ton={payee ? 'succes' : 'info'} data-statut-facture="" className="order-first sm:order-none">
              {etat.libelle}
            </PastilleExemple>
          </div>

          {/* La barre : la part encaissée, des traits blancs entre les paiements (décor : les montants sont écrits dessous) */}
          <p className="mt-5 text-right text-sm font-semibold tabular-nums text-slate-600">{pourcent} % encaissé</p>
          <div key={tour} aria-hidden="true" className="relative mt-1.5 h-3 overflow-hidden rounded-full bg-marque-glacier-2">
            <motion.div
              data-barre-encaisse=""
              initial={false}
              animate={{ width: `${(etat.encaisseCentimes / etat.totalCentimes) * 100}%` }}
              transition={{ duration: reduit ? 0 : 0.5, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 rounded-full bg-marque-nuit-2"
            />
            {reperes.map((r) => (
              <span key={r} className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${(r / etat.totalCentimes) * 100}%` }} />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-marque-glacier-1 px-4 py-3">
              <p className="text-sm font-semibold text-slate-600">Encaissé</p>
              <p data-encaisse={etat.encaisseCentimes / 100} className="mt-0.5 text-xl font-extrabold tabular-nums tracking-tight text-slate-900 sm:text-2xl">
                {euros(etat.encaisseCentimes)}
              </p>
            </div>
            <div className={`rounded-xl px-4 py-3 ${payee ? 'bg-emerald-50' : 'bg-marque-glacier-1'}`}>
              <p className="text-sm font-semibold text-slate-600">Reste dû</p>
              <p data-reste={etat.resteCentimes / 100} className={`mt-0.5 text-xl font-extrabold tabular-nums tracking-tight sm:text-2xl ${payee ? 'text-emerald-800' : 'text-marque-nuit'}`}>
                {euros(etat.resteCentimes)}
              </p>
            </div>
          </div>

          <h3 className="mt-5 text-sm font-bold text-marque-nuit">Paiements reçus</h3>
          <ul key={`liste-${tour}`} className="mt-2 divide-y divide-marque-acier/50">
            <AnimatePresence initial={false}>
              {paiements.map((p) => (
                <motion.li
                  key={p.id}
                  initial={reduit ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-slate-700">
                    <Check size={15} strokeWidth={3} aria-hidden="true" className="shrink-0 text-emerald-700" />
                    {p.libelle}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">{euros(p.centimes)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div ref={actions} className="mt-auto flex justify-end pt-4">
            {payee ? (
              <BoutonSite variante="contour" onClick={recommencer}>
                <RotateCcw size={18} strokeWidth={2} aria-hidden="true" />
                Recommencer l’exemple
              </BoutonSite>
            ) : (
              <BoutonSite variante="plein" onClick={encaisserUnPas}>
                {libelleEncaisser(etat.prochainCentimes)}
              </BoutonSite>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            {`${etat.libelle}. Reste dû\u202f: ${euros(etat.resteCentimes)}.`}
          </p>
        </div>
      </div>
      {/* La règle « payée seulement au solde » est déjà le titre d'une carte de la fiabilité : la légende dit autre chose,
          de vrai (relecture DA-7) */}
      <LegendeExemple>Démonstration : rien n’est encaissé pour de vrai ; le reste dû se recalcule à chaque paiement.</LegendeExemple>
    </>
  );
}
