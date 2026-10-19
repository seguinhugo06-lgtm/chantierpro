/**
 * DevisVivant — la carte du premier écran du site : un devis qui se monte tout seul avec un vrai lot de la
 * bibliothèque Électricité, se fait signer, devient une facture, puis est payé ; la boucle reprend.
 *
 * - La bibliothèque (149 Ko) est chargée à la demande (`import()`) : le cadre et le titre s'affichent tout de
 *   suite, les lignes dès que les données sont là. Aucun prix n'est recopié ici. Si elle ne se charge pas, la
 *   carte se réduit à son en-tête et à la légende.
 * - La bulle « Relance du devis à J+7 » n'est montrée que pendant les étapes du devis (lignes, signé).
 * - La boucle ne tourne que si la carte est à l'écran et l'onglet affiché (IntersectionObserver,
 *   visibilitychange) ; `reduit` ou « réduire les animations » du système : état final complet et « Payée ».
 * - L'animation est masquée aux lecteurs d'écran (`aria-hidden`), doublée d'un texte hors écran ; aucune région
 *   `aria-live` (la boucle serait annoncée sans fin).
 * - Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 * La logique (étapes, totaux, rythme) est dans `devisVivantEtapes.js`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { formatMoney } from '../../lib/formatters';
import { captureException } from '../../lib/sentry';
import {
  CLIENT,
  NB_LIGNES_DEMONSTRATION,
  NOM_LOT_DEMONSTRATION,
  dureeEtape,
  etapesDuDevis,
  etatDuDevis,
  libelleTotal,
  lotDemonstration,
} from './devisVivantEtapes';

const TEXTE_HORS_ECRAN =
  `Exemple : un devis de ${NB_LIGNES_DEMONSTRATION} lignes pour une mise aux normes de tableau électrique, signé en ligne, facturé puis payé.`;

// Un statut = un mot et un ton ; le texte porte l'information (pas la seule couleur). Contrastes ≥ 6,8:1.
const PASTILLES = {
  brouillon: { libelle: 'Brouillon', classes: 'bg-slate-100 text-slate-700' },
  signe: { libelle: 'Signé', classes: 'bg-emerald-100 text-emerald-800' },
  facture: { libelle: 'Facture envoyée', classes: 'bg-marque-glacier-2 text-marque-nuit' },
  partiel: { libelle: 'Payée en partie', classes: 'bg-marque-glacier-2 text-marque-nuit' },
  payee: { libelle: 'Payée', classes: 'bg-emerald-100 text-emerald-800' },
};

const quantite = (q) => q.toLocaleString('fr-FR');

/**
 * Une ligne du devis. Pas encore écrite (ou données pas encore chargées : `ligne` nulle) : un emplacement en
 * pointillés, contenu invisible mais à sa place, pour que la carte garde sa hauteur quand la bibliothèque arrive.
 * Désignation : deux lignes, ni plus ni moins, au téléphone (les désignations y passent toutes sur deux lignes) ;
 * une seule au bureau (ellipse). Entre les deux (640 à 1023 px), la hauteur naturelle : les désignations y tiennent
 * sur une ligne, en réserver deux laisserait un blanc dans chaque ligne.
 */
function Ligne({ ligne, vue }) {
  return (
    <li
      data-ligne={ligne ? (vue ? 'vue' : 'attente') : undefined}
      data-emplacement={ligne ? undefined : ''}
      className={`rounded-[10px] border px-2.5 py-1 transition-colors duration-300 motion-reduce:transition-none ${
        vue ? 'border-transparent bg-marque-glacier-1' : 'border-dashed border-marque-acier/70 bg-transparent'
      }`}
    >
      <span
        className={`grid grid-cols-[1fr_auto] items-start gap-x-3 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
          vue ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
        }`}
      >
        <span className="min-w-0">
          {/* 2,75em = deux lignes de leading-snug (1,375) */}
          <span className="line-clamp-2 min-h-[2.75em] text-sm leading-snug text-slate-900 sm:min-h-0 lg:line-clamp-1">
            {ligne ? ligne.designation : <>&nbsp;</>}
          </span>
          <span className="mt-0.5 block text-xs tabular-nums text-slate-600">
            {ligne ? <>{quantite(ligne.quantite)} {ligne.unite} × {formatMoney(ligne.prixUnitaire)}</> : <>&nbsp;</>}
          </span>
        </span>
        <span className="text-sm font-bold tabular-nums text-slate-900">
          {ligne ? formatMoney(ligne.quantite * ligne.prixUnitaire, 2) : null}
        </span>
      </span>
    </li>
  );
}

/** Le total affiché rattrape sa cible en 0,45 s (sortie amortie) ; sans animation, il y saute. */
function useCompteur(cible, anime) {
  const [valeur, setValeur] = useState(cible);
  const actuelle = useRef(cible);
  useEffect(() => {
    const depart = actuelle.current;
    if (!anime || cible === 0 || depart === cible || typeof requestAnimationFrame === 'undefined') {
      actuelle.current = cible;
      setValeur(cible);
      return undefined;
    }
    const debut = performance.now();
    let image;
    const pas = (t) => {
      const k = Math.min(1, (t - debut) / 450);
      const v = k < 1 ? depart + (cible - depart) * (1 - (1 - k) ** 3) : cible;
      actuelle.current = v;
      setValeur(v);
      if (k < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [cible, anime]);
  return valeur;
}

export default function DevisVivant({ reduit: reduitDemande = false }) {
  const mouvementReduit = useReducedMotion();
  const reduit = reduitDemande || !!mouvementReduit;
  const carte = useRef(null);
  const [lot, setLot] = useState(null);
  const [echec, setEchec] = useState(false);
  const [index, setIndex] = useState(-1);
  const [aLEcran, setALEcran] = useState(false);
  const [ongletAffiche, setOngletAffiche] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');

  useEffect(() => {
    let annule = false;
    import('../../lib/templates/trade-library.js')
      .then((module) => { if (!annule) setLot(lotDemonstration(module.TRADE_LIBRARY)); })
      .catch((erreur) => {
        // Bibliothèque introuvable (déploiement remplacé, réseau coupé) ou lot disparu : la carte se réduit à son
        // en-tête et à la légende, plutôt qu'à des emplacements vides et « 0,00 € » pour toujours.
        captureException(erreur, { composant: 'DevisVivant' });
        if (!annule) setEchec(true);
      });
    return () => { annule = true; };
  }, []);

  // À l'écran = au moins 30 % de la carte visible (au téléphone, elle est sous le texte).
  useEffect(() => {
    const element = carte.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setALEcran(true);
      return undefined;
    }
    const observateur = new IntersectionObserver(
      ([entree]) => setALEcran(entree.isIntersecting && entree.intersectionRatio >= 0.3),
      { threshold: [0, 0.3] },
    );
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);

  useEffect(() => {
    const suivre = () => setOngletAffiche(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', suivre);
    return () => document.removeEventListener('visibilitychange', suivre);
  }, []);

  const etapes = useMemo(() => (lot ? etapesDuDevis(lot) : []), [lot]);
  const actif = !reduit && etapes.length > 0 && aLEcran && ongletAffiche;

  useEffect(() => {
    if (!actif) return undefined;
    const minuterie = setTimeout(
      () => setIndex((i) => (i + 1 >= etapes.length ? -1 : i + 1)),
      dureeEtape(etapes, index),
    );
    return () => clearTimeout(minuterie);
  }, [actif, index, etapes]);

  const indexAffiche = reduit && etapes.length ? etapes.length - 1 : index;
  const etat = etatDuDevis(etapes, indexAffiche);
  const total = useCompteur(etat.totalTTC, !reduit);
  const pastille = PASTILLES[etat.statut];
  const part = etat.encaisse ?? 0;
  const lignes = lot ? lot.lignes : [];
  // La bulle parle de la relance du DEVIS : visible pendant les étapes du devis seulement (en facture, l'app relance
  // après l'échéance, pas à J+7). Elle reste dans le texte lu par les lecteurs d'écran (opacité), sans décalage.
  const relanceVisible = etat.statut === 'brouillon' || etat.statut === 'signe';

  return (
    <figure className="relative">
      <p className="sr-only">{TEXTE_HORS_ECRAN}</p>
      <div
        ref={carte}
        aria-hidden="true"
        data-devis-vivant=""
        data-etape={indexAffiche}
        data-etat={etat.statut}
        data-echec={echec ? '' : undefined}
        className={`relative overflow-hidden rounded-[22px] border border-marque-acier/60 bg-white px-4 pt-5 shadow-[0_30px_60px_-28px_rgba(13,46,108,0.45)] sm:px-5 ${
          echec ? 'pb-5' : 'pb-10'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p data-numero="" className="text-xs font-semibold tabular-nums text-slate-600">
              {etat.numero} · {CLIENT}
            </p>
            <p className="mt-0.5 text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-lg">
              {lot ? lot.nom : NOM_LOT_DEMONSTRATION}
            </p>
          </div>
          <span
            data-pastille=""
            className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold transition-colors duration-300 motion-reduce:transition-none ${pastille.classes}`}
          >
            {pastille.libelle}
          </span>
        </div>

        {!echec && (
          <>
            <ol className="mt-3.5 flex flex-col gap-1.5">
              {/* Clé = rang : les emplacements d'avant le chargement deviennent les lignes, sans être recréés. */}
              {lot
                ? lot.lignes.map((ligne, i) => <Ligne key={i} ligne={ligne} vue={i < etat.lignesVues} />)
                : Array.from({ length: NB_LIGNES_DEMONSTRATION }, (_, i) => <Ligne key={i} ligne={null} vue={false} />)}
            </ol>

            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-dashed border-marque-acier pt-3">
              <span className="text-sm text-slate-600">{libelleTotal(lignes)}</span>
              <span data-total="" className="whitespace-nowrap text-2xl font-extrabold tabular-nums tracking-tight text-marque-nuit sm:text-3xl">
                {formatMoney(total, 2)}
              </span>
            </div>

            {/* Barre d'encaissement dès la facture ; sa légende seulement quand quelque chose est encaissé. */}
            <div className={`transition-opacity duration-300 motion-reduce:transition-none ${etat.encaisse === null ? 'opacity-0' : 'opacity-100'}`}>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-[width,background-color] duration-1000 ease-out motion-reduce:transition-none ${
                    part >= 1 ? 'bg-emerald-600' : 'bg-marque-nuit-2'
                  }`}
                  style={{ width: `${part * 100}%` }}
                />
              </div>
              <p
                data-encaisse={part > 0 ? 'visible' : 'cache'}
                className={`mt-1.5 flex justify-between text-xs tabular-nums text-slate-600 transition-opacity duration-300 motion-reduce:transition-none ${
                  part > 0 ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <span>Encaissé : {formatMoney(part * etat.totalTTC, 2)}</span>
                <span>{Math.round(part * 100)} %</span>
              </p>
            </div>

            {/* Le tampon se pose sous le total, là où viendra la barre d'encaissement (encore cachée à la signature) :
                il ne masque aucune ligne. Vert assombri (emerald-700) : 5,5:1 sur blanc. */}
            <span
              className={`pointer-events-none absolute bottom-9 right-5 z-10 rotate-[-7deg] rounded-[10px] border-[3px] border-emerald-700 bg-white/90 px-3 py-1 text-base font-extrabold tracking-[0.06em] text-emerald-700 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.2,1.6,0.4,1)] motion-reduce:transition-none ${
                etat.tampon ? 'scale-100 opacity-100' : 'scale-[0.6] opacity-0'
              }`}
            >
              SIGNÉ EN LIGNE
            </span>
          </>
        )}
      </div>

      {!echec && (
        <p
          data-relance={relanceVisible ? 'visible' : 'cachee'}
          className={`relative z-10 -mt-6 ml-3 mr-3 flex w-fit items-center gap-2.5 rounded-2xl border border-marque-acier/60 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-[0_20px_40px_-24px_rgba(13,46,108,0.5)] transition-[opacity,transform] duration-300 motion-reduce:transition-none lg:-ml-8 ${
            relanceVisible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          }`}
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-marque-orange shadow-[0_0_0_3px_rgba(238,123,32,0.2),0_0_10px_rgba(238,123,32,0.8)]"
          />
          <span>
            Relance du devis à <strong className="font-bold text-marque-nuit">J+7</strong>, au rythme que vous choisissez
          </span>
        </p>
      )}

      <figcaption className="mt-3 text-xs leading-relaxed text-slate-600">
        Démonstration : le lot « {NOM_LOT_DEMONSTRATION} » de la bibliothèque Électricité, prix moyens indicatifs du marché.
      </figcaption>
    </figure>
  );
}
