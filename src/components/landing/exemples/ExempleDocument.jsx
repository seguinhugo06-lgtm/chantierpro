/**
 * ExempleDocument — « Le document que reçoit votre client » : le vrai générateur de devis de Mallettico
 * (`buildDevisHtml`, src/lib/devisHtmlBuilder.js) rend un devis fictif d'Élec Exemple pour M. Martin (le lot « Mise aux
 * normes du tableau électrique » de la bibliothèque Électricité, TVA 10 %), dans un cadre réduit qui défile.
 *
 * - Générateur et bibliothèque chargés à la demande (`import()`), au premier affichage de l'exemple : ils ne pèsent
 *   pas sur le premier écran du site. La bibliothèque est la promesse partagée de la page (`site/bibliotheque.js`).
 * - Cadre `<iframe srcdoc sandbox="">` : aucun script ne s'y exécute. Le document est rendu à une largeur de page
 *   (de 520 à 794 px, celle d'une feuille A4), puis réduit à la largeur du cadre (environ 85 %) ; il défile dans le
 *   cadre.
 * - À côté, les mentions que le document porte réellement, lues dans le HTML produit (`mentionsDuDocument`).
 * - Fiche marquée « données fictives » : le générateur pose le filigrane « EXEMPLE » de l'app.
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Check } from 'lucide-react';
import { captureException } from '../../../lib/sentry';
import { chargerBibliotheque } from '../site/bibliotheque';
import { NUMERO_DEVIS, lotDemonstration } from '../devisVivantEtapes';
import { mentionsDuDocument, parametresDuDocument } from './exemples';
import { LegendeExemple } from './communs';

const LARGEUR_A4 = 794;
const LARGEUR_MIN = 520;
const ECHELLE_VISEE = 0.85;
// Largeurs des pastilles d'attente des mentions (à peu près celles des libellés) : la place est tenue
const ATTENTE_MENTIONS = ['w-20', 'w-48', 'w-52', 'w-40', 'w-44', 'w-40', 'w-48'];

/** Le générateur de devis, chargé une seule fois ; un échec n'est pas gardé (l'appel suivant retente). */
let chargementGenerateur = null;
function chargerGenerateur() {
  if (!chargementGenerateur) {
    chargementGenerateur = import('../../../lib/devisHtmlBuilder.js')
      .then((module) => module.buildDevisHtml)
      .catch((erreur) => {
        chargementGenerateur = null;
        throw erreur;
      });
  }
  return chargementGenerateur;
}

/** Largeur et hauteur de l'élément, suivies au redimensionnement. */
function useTaille(ref) {
  const [taille, setTaille] = useState({ l: 0, h: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const mesurer = () => setTaille({ l: element.clientWidth, h: element.clientHeight });
    mesurer();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [ref]);
  return taille;
}

/** La feuille avant l'arrivée du document : quelques traits à la place des blocs (décor). */
function FeuilleEnAttente() {
  return (
    <div aria-hidden="true" className="flex h-full flex-col gap-3 p-5">
      <div className="flex justify-between gap-4 border-b-2 border-marque-glacier-2 pb-4">
        <span className="h-4 w-1/3 rounded bg-slate-100" />
        <span className="h-6 w-1/5 rounded bg-slate-100" />
      </div>
      <span className="h-16 w-1/2 rounded bg-slate-50" />
      <span className="h-6 w-full rounded bg-marque-glacier-2" />
      {[0, 1, 2, 3, 4].map((i) => <span key={i} className="h-3 w-full rounded bg-slate-100" />)}
    </div>
  );
}

export default function ExempleDocument() {
  const [html, setHtml] = useState(null);
  const [echec, setEchec] = useState(false);
  const feuille = useRef(null);
  const { l, h } = useTaille(feuille);

  useEffect(() => {
    let annule = false;
    Promise.all([chargerBibliotheque(), chargerGenerateur()])
      .then(([bibliotheque, buildDevisHtml]) => {
        if (!annule) setHtml(buildDevisHtml(parametresDuDocument(lotDemonstration(bibliotheque))));
      })
      .catch((erreur) => {
        // Générateur ou bibliothèque introuvable (déploiement remplacé, réseau coupé) : un message, pas une feuille vide
        captureException(erreur, { composant: 'ExempleDocument' });
        if (!annule) setEchec(true);
      });
    return () => { annule = true; };
  }, []);

  const largeurPage = l ? Math.min(LARGEUR_A4, Math.max(LARGEUR_MIN, l / ECHELLE_VISEE)) : 0;
  const echelle = largeurPage ? l / largeurPage : 0;
  const mentions = html ? mentionsDuDocument(html) : [];

  return (
    <>
      <div className="flex-1 p-4 sm:p-6">
        <div className="rounded-2xl bg-slate-100 p-3 ring-1 ring-inset ring-marque-acier/50 sm:p-5">
          <div
            ref={feuille}
            className="relative h-[23rem] overflow-hidden rounded-md bg-white shadow-[0_16px_36px_-16px_rgba(13,46,108,0.5)] sm:h-[25rem]"
          >
            {html && echelle > 0 ? (
              <iframe
                title={`Devis ${NUMERO_DEVIS} d'Élec Exemple pour M. Martin (exemple fictif)`}
                srcDoc={html}
                sandbox=""
                className="absolute left-0 top-0 block border-0"
                style={{ width: largeurPage, height: h / echelle, transform: `scale(${echelle})`, transformOrigin: '0 0' }}
              />
            ) : null}
            {!html && !echec ? <FeuilleEnAttente /> : null}
            {echec ? (
              <p data-document-echec="" className="flex h-full items-center justify-center px-6 text-center text-base text-marque-ardoise">
                Le document n'a pas pu être chargé. Rechargez la page pour le voir.
              </p>
            ) : null}
          </div>
          {!echec ? (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600">
              <ArrowDown size={14} strokeWidth={2} aria-hidden="true" />
              Faites défiler le document
            </p>
          ) : null}
        </div>

        {!echec ? (
          <div className="mt-5">
            <h3 className="text-sm font-bold text-marque-nuit">Mentions trouvées dans ce document</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {html
                ? mentions.map((mention) => (
                    <li
                      key={mention}
                      data-mention=""
                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-marque-acier/70 bg-white px-3 text-sm font-medium text-slate-800"
                    >
                      <Check size={14} strokeWidth={3} aria-hidden="true" className="shrink-0 text-emerald-700" />
                      {mention}
                    </li>
                  ))
                : ATTENTE_MENTIONS.map((largeur, i) => (
                    <li key={i} aria-hidden="true" className={`h-8 rounded-full border border-dashed border-marque-acier/70 ${largeur}`} />
                  ))}
            </ul>
          </div>
        ) : null}
      </div>
      <LegendeExemple>Exemple fictif généré par Mallettico.</LegendeExemple>
    </>
  );
}
