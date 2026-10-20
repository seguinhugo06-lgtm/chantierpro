/**
 * ExempleSignature — « Signature en ligne » : la carte du devis DEV-2026-00012 (total TTC calculé par le code de l'app
 * sur le lot de la bibliothèque), une zone « Signez ici » où l'on trace au doigt, au stylet ou à la souris, puis
 * « Valider la signature » pose le tampon « Signé le JJ/MM/AAAA à HH:MM » (heure locale).
 *
 * - Tracé sur un `<canvas>` maison (évènements de pointeur, `touch-action: none`), net sur écran haute densité, redessiné
 *   à chaque changement de taille (les points sont gardés en proportions). Ni le pavé de signature de l'app, ni une
 *   dépendance : rien de plus à charger.
 * - Au clavier : « Signer avec mon nom » écrit « M. Martin » en cursive (polices du système, aucune police chargée).
 * - « Valider la signature » demande un vrai tracé (12 px au moins en tout, `longueurDesTraits`) : un simple toucher
 *   ne suffit pas ; « Signer avec mon nom » l'active toujours.
 * - Rien ne quitte la page : aucune requête, aucun stockage ; « Recommencer » efface tout.
 * - Statuts : libellés de l'app (`statuts.js`) : « Envoyé », puis « Signé ».
 * - Bibliothèque introuvable : la carte le dit à la place des montants ; la signature s'essaie quand même.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Eraser, RotateCcw, Type } from 'lucide-react';
import { formatMoney } from '../../../lib/formatters';
import { statut } from '../../../lib/statuts';
import { captureException } from '../../../lib/sentry';
import { chargerBibliotheque } from '../site/bibliotheque';
import BoutonSite from '../site/BoutonSite';
import { FOCUS } from '../site/focus';
import { CLIENT, NOM_LOT_DEMONSTRATION, NUMERO_DEVIS, lotDemonstration } from '../devisVivantEtapes';
import { ENTREPRISE_FICTIVE } from './donneesFictives';
import { TRACE_MINIMAL_PX, longueurDesTraits, tamponDeSignature, totauxDuDevis } from './exemples';
import { LegendeExemple, PastilleExemple } from './communs';

// Polices cursives des systèmes (macOS, Windows, Linux), puis la famille générique : aucune police nouvelle.
const POLICE_CURSIVE = '"Snell Roundhand", "Segoe Script", "Brush Script MT", "Apple Chancery", "URW Chancery L", cursive';
const EPAISSEUR = 2.6;

const BOUTON_INACTIF = 'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:bg-marque-nuit-2';

/** Un trait lissé (courbes passant par le milieu des segments) ; les points sont en proportions de la zone. */
function tracerTrait(ctx, points, l, h) {
  if (!points.length) return;
  const p = points.map(({ x, y }) => ({ x: x * l, y: y * h }));
  ctx.beginPath();
  ctx.moveTo(p[0].x, p[0].y);
  if (p.length === 1) {
    ctx.arc(p[0].x, p[0].y, EPAISSEUR / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = 1; i < p.length - 1; i++) {
    ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
  }
  ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
  ctx.stroke();
}

export default function ExempleSignature() {
  const reduit = !!useReducedMotion();
  const zone = useRef(null);
  const traits = useRef([]);
  const enCours = useRef(null);
  const nomRef = useRef(false);
  const actions = useRef(null);
  const [nbTraits, setNbTraits] = useState(0);
  const [assezLong, setAssezLong] = useState(false);
  const [nomEcrit, setNomEcrit] = useState(false);
  const [signeLe, setSigneLe] = useState(null);
  const [lot, setLot] = useState(null);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    let annule = false;
    chargerBibliotheque()
      .then((bibliotheque) => { if (!annule) setLot(lotDemonstration(bibliotheque)); })
      // Sans la bibliothèque, la carte dit que les montants manquent : la signature s'essaie quand même
      .catch((erreur) => {
        captureException(erreur, { composant: 'ExempleSignature' });
        if (!annule) setEchec(true);
      });
    return () => { annule = true; };
  }, []);

  /** Redessine toute la zone : le nom écrit (s'il y en a un), puis les traits ; à la densité de l'écran. */
  const dessiner = useCallback(() => {
    const c = zone.current;
    const ctx = c?.getContext?.('2d');
    if (!ctx) return;
    const l = c.clientWidth;
    const h = c.clientHeight;
    if (!l || !h) return;
    const densite = window.devicePixelRatio || 1;
    if (c.width !== Math.round(l * densite) || c.height !== Math.round(h * densite)) {
      c.width = Math.round(l * densite);
      c.height = Math.round(h * densite);
    }
    ctx.setTransform(densite, 0, 0, densite, 0, 0);
    ctx.clearRect(0, 0, l, h);
    // L'encre est la couleur du texte de la zone (bleu nuit de la palette `marque`, posé par sa classe)
    const encre = getComputedStyle(c).color;
    ctx.strokeStyle = encre;
    ctx.fillStyle = encre;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = EPAISSEUR;
    if (nomRef.current) {
      ctx.font = `${Math.round(h * 0.34)}px ${POLICE_CURSIVE}`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(CLIENT, l * 0.1, h * 0.64, l * 0.8);
    }
    for (const trait of traits.current) tracerTrait(ctx, trait, l, h);
  }, []);

  useEffect(() => {
    nomRef.current = nomEcrit;
    dessiner();
  }, [nomEcrit, nbTraits, dessiner]);

  // La zone change de taille (rotation, fenêtre, panneau qui réapparaît) : on redessine aux nouvelles dimensions
  useEffect(() => {
    const c = zone.current;
    if (!c || typeof ResizeObserver === 'undefined') return undefined;
    const observateur = new ResizeObserver(() => dessiner());
    observateur.observe(c);
    return () => observateur.disconnect();
  }, [dessiner]);

  // Signé : le focus passe à « Recommencer » (le bouton « Valider » disparaît)
  useEffect(() => {
    if (signeLe) actions.current?.querySelector('[data-recommencer]')?.focus({ preventScroll: true });
  }, [signeLe]);

  const position = (e) => {
    const r = zone.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const commencer = (e) => {
    if (signeLe || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    zone.current.setPointerCapture?.(e.pointerId);
    // Tracer remplace le nom écrit
    if (nomRef.current) {
      nomRef.current = false;
      setNomEcrit(false);
    }
    enCours.current = [position(e)];
    traits.current = [...traits.current, enCours.current];
    setNbTraits(traits.current.length);
    dessiner();
  };

  const continuer = (e) => {
    if (!enCours.current) return;
    e.preventDefault();
    enCours.current.push(position(e));
    dessiner();
  };

  // Fin d'un trait : la signature compte si l'ensemble des traits mesure au moins 12 px (un toucher mesure 0)
  const finir = () => {
    if (!enCours.current) return;
    enCours.current = null;
    const c = zone.current;
    setAssezLong(longueurDesTraits(traits.current, c?.clientWidth || 0, c?.clientHeight || 0) >= TRACE_MINIMAL_PX);
  };

  const effacer = () => {
    traits.current = [];
    enCours.current = null;
    setNbTraits(0);
    setAssezLong(false);
    setNomEcrit(false);
  };

  const signerAvecMonNom = () => {
    traits.current = [];
    setNbTraits(0);
    setAssezLong(false);
    setNomEcrit(true);
  };

  const recommencer = () => {
    effacer();
    setSigneLe(null);
  };

  // Quelque chose dans la zone (« Signez ici » s'efface, « Effacer » paraît) ; une signature à valider
  const rempli = nbTraits > 0 || nomEcrit;
  const signable = assezLong || nomEcrit;
  const totaux = lot ? totauxDuDevis(lot) : null;
  const tampon = signeLe ? tamponDeSignature(signeLe) : '';
  const etat = statut('devis', signeLe ? 'signe' : 'envoye');

  return (
    <>
      <div className="flex flex-1 flex-col justify-center p-4 sm:p-6">
        <div className="rounded-2xl border border-marque-acier/60 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(13,46,108,0.5)] sm:p-5">
          {/* Téléphone : la pastille d'abord, le titre a toute la largeur ; il ne se coupe pas dans le numéro */}
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
              <p data-montant-devis="" className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                <span className="whitespace-nowrap">Devis {NUMERO_DEVIS}{totaux ? ' ·' : ''}</span>
                {totaux ? <> <span className="whitespace-nowrap">{formatMoney(totaux.totalTTC, 2)} TTC</span></> : null}
              </p>
              <p className="mt-0.5 text-sm leading-snug text-slate-600">
                {lot ? lot.nom : NOM_LOT_DEMONSTRATION} · {ENTREPRISE_FICTIVE.nom} pour {CLIENT}
              </p>
            </div>
            <PastilleExemple ton={signeLe ? 'succes' : 'info'} data-statut-devis="" className="order-first sm:order-none">
              {etat.libelle}
            </PastilleExemple>
          </div>

          {/* Ce que le client signe : les totaux du devis, calculés comme l'éditeur (place tenue avant le chargement) */}
          {echec ? (
            <p data-signature-echec="" className="mt-4 rounded-xl bg-marque-glacier-1 px-4 py-3 text-sm text-marque-ardoise">
              Les montants n’ont pas pu être chargés. Rechargez la page pour les voir.
            </p>
          ) : (
            <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-marque-glacier-1 px-3 py-2.5 text-center sm:px-4">
              {[
                ['Total HT', totaux && formatMoney(totaux.totalHT, 2)],
                [totaux && totaux.taux.length === 1 ? `TVA ${String(totaux.taux[0]).replace('.', ',')}\u202f%` : 'TVA', totaux && formatMoney(totaux.totalTVA, 2)],
                ['Total TTC', totaux && formatMoney(totaux.totalTTC, 2)],
              ].map(([libelle, valeur], i) => (
                <div key={i} className="min-w-0">
                  <dt className="text-xs font-semibold text-slate-600">{libelle}</dt>
                  <dd className="mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums text-slate-900 sm:text-base">{valeur || '\u00a0'}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="relative mt-4">
            <canvas
              ref={zone}
              role="img"
              aria-label={signeLe
                ? `Signature de ${CLIENT}, ${tampon.charAt(0).toLowerCase()}${tampon.slice(1)}`
                : 'Zone de signature\u202f: tracez votre signature au doigt ou à la souris, ou choisissez «\u202fSigner avec mon nom\u202f».'}
              onPointerDown={commencer}
              onPointerMove={continuer}
              onPointerUp={finir}
              onPointerCancel={finir}
              className={`block h-44 w-full touch-none select-none rounded-xl border-2 bg-marque-glacier-1/60 text-marque-nuit sm:h-52 lg:h-64 ${
                signeLe ? 'cursor-default border-solid border-emerald-600/60' : 'cursor-crosshair border-dashed border-marque-acier'
              }`}
            />
            {/* La ligne de signature, et l'invitation tant que la zone est vide (décor : la zone est déjà nommée) */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 bottom-9 flex items-end gap-2 border-b border-marque-acier">
              <span className="-mb-0.5 text-base font-semibold text-marque-ardoise">×</span>
            </span>
            {!rempli ? (
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-lg font-semibold text-marque-ardoise">
                Signez ici
              </span>
            ) : null}
            {rempli && !signeLe ? (
              <button
                type="button"
                onClick={effacer}
                className={`absolute right-2 top-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-marque-acier/70 bg-white/90 px-3 text-sm font-semibold text-marque-ardoise transition-colors hover:border-marque-nuit-2/60 hover:text-marque-nuit ${FOCUS}`}
              >
                <Eraser size={16} strokeWidth={2} aria-hidden="true" />
                Effacer
              </button>
            ) : null}
            {signeLe ? (
              <motion.span
                data-tampon=""
                initial={reduit ? false : { opacity: 0, scale: 1.35, rotate: -7 }}
                animate={{ opacity: 1, scale: 1, rotate: -7 }}
                transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
                // Au-dessus de la ligne de signature (bottom-9) : au téléphone, le tampon couvrait la ligne et le « × »
                className="pointer-events-none absolute bottom-12 right-3 rounded-lg border-[3px] border-double border-emerald-700 bg-white/90 px-3 py-1.5 text-sm font-extrabold tracking-wide text-emerald-800 shadow-sm sm:bottom-14 sm:right-5"
              >
                {tampon}
              </motion.span>
            ) : null}
          </div>

          {/* Téléphone : boutons pleine largeur, l'un sous l'autre ; bureau : alignés à droite */}
          <div ref={actions} className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            {signeLe ? (
              <BoutonSite data-recommencer="" variante="contour" onClick={recommencer}>
                <RotateCcw size={18} strokeWidth={2} aria-hidden="true" />
                Recommencer
              </BoutonSite>
            ) : (
              <>
                <BoutonSite variante="contour" onClick={signerAvecMonNom}>
                  <Type size={18} strokeWidth={2} aria-hidden="true" />
                  Signer avec mon nom
                </BoutonSite>
                <BoutonSite variante="plein" disabled={!signable} onClick={() => setSigneLe(new Date())} className={BOUTON_INACTIF}>
                  Valider la signature
                </BoutonSite>
              </>
            )}
          </div>
        </div>
      </div>
      <LegendeExemple>Démonstration : votre signature ne quitte pas cette page.</LegendeExemple>
      <p className="sr-only" aria-live="polite">{tampon}</p>
    </>
  );
}
