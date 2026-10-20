/**
 * ExempleDocument — « Le document que reçoit votre client » : le vrai générateur de devis de Mallettico
 * (`buildDevisHtml`, src/lib/devisHtmlBuilder.js) rend un devis fictif d'Élec Exemple pour M. Martin (le lot « Mise aux
 * normes du tableau électrique » de la bibliothèque Électricité, TVA 10 %), par `htmlDuDocument` (la fonction que lit
 * aussi le test d'honnêteté du site).
 *
 * - Générateur et bibliothèque chargés à la demande (`import()`, une seule fois : `chargerUneFois`), au premier
 *   affichage de l'exemple : ils ne pèsent pas sur le premier écran du site.
 * - Aperçu : `<iframe srcdoc sandbox="">` (aucun script), la page A4 entière (794 px) réduite à la largeur du cadre ; il
 *   défile. La taille est gardée quand l'onglet est caché (largeur nulle) : le cadre n'est pas recréé, le défilement
 *   reste.
 * - « Voir le document en grand » : le même HTML à l'échelle 1, dans une fenêtre (`DocumentEnGrand.jsx`), pour le
 *   lire au téléphone ; à la fermeture, le focus revient au bouton.
 * - À côté (au bureau) ou dessous (au téléphone), les mentions que le document porte réellement, lues dans le HTML
 *   produit (`mentionsDuDocument`).
 * - Générateur ou bibliothèque introuvable : un message à la place du document, sans légende.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Check, Maximize2 } from 'lucide-react';
import { captureException } from '../../../lib/sentry';
import { chargerBibliotheque } from '../site/bibliotheque';
import { chargerUneFois } from '../site/chargerUneFois';
import BoutonSite from '../site/BoutonSite';
import { NUMERO_DEVIS } from '../devisVivantEtapes';
import { htmlDuDocument, mentionsDuDocument } from './exemples';
import { LegendeExemple } from './communs';
import DocumentEnGrand, { LARGEUR_PAGE_A4 } from './DocumentEnGrand';

// Largeurs des pastilles d'attente des mentions (à peu près celles des libellés) : la place est tenue
const ATTENTE_MENTIONS = ['w-20', 'w-48', 'w-52', 'w-40', 'w-44', 'w-40', 'w-48'];
const TITRE_DU_CADRE = `Devis ${NUMERO_DEVIS} d’Élec Exemple pour M. Martin (exemple fictif)`;

/** Le générateur de devis, chargé une seule fois pour la page. */
const chargerGenerateur = chargerUneFois(() => import('../../../lib/devisHtmlBuilder.js').then((module) => module.buildDevisHtml));

/**
 * Largeur et hauteur de l'élément, suivies au redimensionnement. Une mesure nulle (onglet caché : `display: none`)
 * est ignorée : la dernière taille connue est gardée.
 */
function useTaille(ref) {
  const [taille, setTaille] = useState({ l: 0, h: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const mesurer = () => {
      if (element.clientWidth > 0 && element.clientHeight > 0) setTaille({ l: element.clientWidth, h: element.clientHeight });
    };
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
  const [enGrand, setEnGrand] = useState(false);
  const feuille = useRef(null);
  const ouverture = useRef(null);
  const etaitEnGrand = useRef(false);
  const { l, h } = useTaille(feuille);

  useEffect(() => {
    let annule = false;
    Promise.all([chargerBibliotheque(), chargerGenerateur()])
      .then(([bibliotheque, buildDevisHtml]) => {
        if (!annule) setHtml(htmlDuDocument(buildDevisHtml, bibliotheque));
      })
      .catch((erreur) => {
        // Générateur ou bibliothèque introuvable (déploiement remplacé, réseau coupé) : un message, pas une feuille vide
        captureException(erreur, { composant: 'ExempleDocument' });
        if (!annule) setEchec(true);
      });
    return () => { annule = true; };
  }, []);

  // Fenêtre fermée : le focus revient au bouton qui l'a ouverte (la page n'est plus inerte à ce moment-là)
  useEffect(() => {
    if (etaitEnGrand.current && !enGrand) ouverture.current?.querySelector('button')?.focus();
    etaitEnGrand.current = enGrand;
  }, [enGrand]);

  const echelle = l ? l / LARGEUR_PAGE_A4 : 0;
  const mentions = useMemo(() => (html ? mentionsDuDocument(html) : []), [html]);

  if (echec) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p data-document-echec="" className="max-w-sm text-center text-base text-marque-ardoise">
          Le document n’a pas pu être chargé. Rechargez la page pour le voir.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid flex-1 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_13.5rem] lg:gap-6">
        <div className="rounded-2xl bg-slate-100 p-3 ring-1 ring-inset ring-marque-acier/50 sm:p-5">
          <div
            ref={feuille}
            className="relative h-[23rem] overflow-hidden rounded-md bg-white shadow-[0_16px_36px_-16px_rgba(13,46,108,0.5)] sm:h-[26rem]"
          >
            {html && echelle > 0 ? (
              <iframe
                title={TITRE_DU_CADRE}
                srcDoc={html}
                sandbox=""
                // Hors de l'ordre de tabulation : arrêt sans anneau visible ; le panneau est déjà focalisable et « Voir le
                // document en grand » donne la version lisible au clavier
                tabIndex={-1}
                className="absolute left-0 top-0 block border-0"
                style={{ width: LARGEUR_PAGE_A4, height: h / echelle, transform: `scale(${echelle})`, transformOrigin: '0 0' }}
              />
            ) : null}
            {!html ? <FeuilleEnAttente /> : null}
          </div>
          <div ref={ouverture} className="mt-3 flex flex-col items-stretch gap-2.5 sm:items-center">
            <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600">
              <ArrowDown size={14} strokeWidth={2} aria-hidden="true" />
              Faites défiler le document
            </p>
            <BoutonSite variante="plein" disabled={!html} onClick={() => setEnGrand(true)} className="disabled:cursor-wait disabled:opacity-60">
              <Maximize2 size={18} strokeWidth={2} aria-hidden="true" />
              Voir le document en grand
            </BoutonSite>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-marque-nuit">Mentions trouvées dans ce document</h3>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:items-start">
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
      </div>
      <LegendeExemple>Exemple fictif généré par Mallettico.</LegendeExemple>
      {enGrand && html ? (
        <DocumentEnGrand
          html={html}
          titre={`Devis ${NUMERO_DEVIS} · exemple fictif`}
          titreDuCadre={TITRE_DU_CADRE}
          onFermer={() => setEnGrand(false)}
        />
      ) : null}
    </>
  );
}
