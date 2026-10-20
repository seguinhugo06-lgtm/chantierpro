/**
 * MetiersSection — « Votre métier est déjà chiffré » (spec de la refonte, section 4, `id="metiers"`).
 *
 * L'explorateur : les 17 métiers de la bibliothèque en pastilles (Électricité choisi d'abord) ; pour le métier
 * choisi, ses trois premiers lots types en cartes (nom, résumé, « N lignes · HT », total HT arrondi à l'euro, trois
 * premières lignes avec leur montant). Tout est lu dans la bibliothèque des métiers, chargée à la demande et une
 * seule fois pour la page (`site/bibliotheque.js`, partagé avec le devis vivant) ; la logique est dans `metiers.js`.
 *
 * Accessibilité : les pastilles sont des boutons `aria-pressed` dans une barre d'outils (`role="toolbar"`) ; une
 * seule est dans l'ordre de tabulation (celle qui est choisie), les flèches gauche/droite passent au métier
 * précédent/suivant (Début, Fin : premier, dernier). Une touche accompagnée d'Alt, Ctrl ou Méta garde son rôle
 * habituel (Alt+← est le retour arrière du navigateur).
 * Un changement de métier fait par le visiteur est annoncé brièvement (texte hors écran, poli).
 * Bibliothèque introuvable : un message à la place de l'explorateur, pas un squelette pour toujours.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { formatMoney } from '../../lib/formatters';
import { captureException } from '../../lib/sentry';
import SectionSite from './site/SectionSite';
import EnTeteSection from './site/EnTeteSection';
import PastilleFiltre from './site/PastilleFiltre';
import { chargerBibliotheque } from './site/bibliotheque';
import { METIER_INITIAL, lotsMontres, metiersDeLaBibliotheque, metierVoisin } from './metiers';

// Largeurs des pastilles d'attente (à peu près celles des noms de métiers) : la place est tenue avant le chargement.
const ATTENTE = ['w-28', 'w-32', 'w-28', 'w-28', 'w-28', 'w-28', 'w-28', 'w-28', 'w-24', 'w-24', 'w-24', 'w-24', 'w-28', 'w-28', 'w-28', 'w-24', 'w-28'];

/**
 * Une carte de lot type. Au bureau, les trois cartes partagent les rangées de la grille (`subgrid`) : les totaux et
 * les listes s'alignent d'une carte à l'autre quel que soit la longueur des noms et des résumés.
 */
function CarteLot({ lot, rang }) {
  return (
    <motion.article
      data-lot=""
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rang * 0.06, ease: 'easeOut' }}
      className="flex flex-col rounded-2xl border border-marque-acier/60 bg-white bg-gradient-to-b from-white to-marque-glacier-1 p-5 shadow-[0_18px_40px_-30px_rgba(13,46,108,0.5)] lg:row-span-3 lg:grid lg:grid-rows-subgrid lg:gap-0"
    >
      <div>
        <h3 className="text-lg font-bold leading-snug tracking-tight text-slate-900">{lot.nom}</h3>
        {lot.resume ? <p className="mt-1 text-sm leading-snug text-slate-600">{lot.resume}</p> : null}
      </div>
      <p className="mt-4 flex items-baseline justify-between gap-3 border-t border-dashed border-marque-acier pt-3">
        <span data-nb-lignes="" className="text-sm text-slate-600">
          {lot.nbLignes} lignes · HT
        </span>
        <span data-total-ht="" className="whitespace-nowrap text-2xl font-extrabold tabular-nums tracking-tight text-marque-nuit">
          {formatMoney(lot.totalHT, 0)}
        </span>
      </p>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {lot.lignes.map((ligne, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 text-slate-600">
            <span className="line-clamp-2 min-w-0 leading-snug">{ligne.designation}</span>
            <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-slate-900">{formatMoney(ligne.montant, 0)}</span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

export default function MetiersSection() {
  const [bibliotheque, setBibliotheque] = useState(null);
  const [echec, setEchec] = useState(false);
  const [choisi, setChoisi] = useState(METIER_INITIAL);
  const [annonce, setAnnonce] = useState('');
  const boutons = useRef({});

  useEffect(() => {
    let annule = false;
    chargerBibliotheque()
      .then((b) => { if (!annule) setBibliotheque(b); })
      .catch((erreur) => {
        captureException(erreur, { composant: 'MetiersSection' });
        if (!annule) setEchec(true);
      });
    return () => { annule = true; };
  }, []);

  const metiers = metiersDeLaBibliotheque(bibliotheque);
  const ids = metiers.map((m) => m.id);
  // Si le métier de départ venait à disparaître de la bibliothèque, le premier métier prend sa place.
  const actif = ids.includes(choisi) ? choisi : ids[0];
  const lots = lotsMontres(bibliotheque, actif);

  const choisir = (id) => {
    setChoisi(id);
    const nom = metiers.find((m) => m.id === id)?.nom;
    setAnnonce(nom ? `${nom}\u202f: ${lotsMontres(bibliotheque, id).length} lots types affichés.` : '');
  };

  const auClavier = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const cible = metierVoisin(ids, e.target.dataset?.metier || actif, e.key);
    if (!cible) return;
    e.preventDefault();
    choisir(cible);
    boutons.current[cible]?.focus();
  };

  return (
    <SectionSite id="metiers" fond="blanc">
      <EnTeteSection titre="Votre métier est déjà chiffré.">
        Choisissez le vôtre : voici les lots types que vous insérez en un geste dans un devis, avec leurs prix moyens.
        Vous ajustez les quantités et vos tarifs, c’est tout.
      </EnTeteSection>

      {echec ? (
        <p data-metiers-echec="" className="mt-8 rounded-2xl border border-marque-acier/60 bg-marque-glacier-1 px-5 py-4 text-base text-marque-ardoise">
          Les lots types n’ont pas pu être chargés. Rechargez la page pour les parcourir.
        </p>
      ) : !bibliotheque ? (
        <div data-metiers-attente="" aria-hidden="true">
          <div className="mt-8 flex flex-wrap gap-2">
            {ATTENTE.map((largeur, i) => (
              <span key={i} className={`h-11 rounded-full border border-dashed border-marque-acier/70 ${largeur}`} />
            ))}
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 rounded-2xl border border-dashed border-marque-acier/70" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Flèches : `onKeyDown` sur la barre, qui reçoit les touches de ses boutons (événements délégués). */}
          <div role="toolbar" aria-label="Métiers" onKeyDown={auClavier} className="mt-8 flex flex-wrap gap-2">
            {metiers.map((metier) => {
              const presse = metier.id === actif;
              return (
                <PastilleFiltre
                  key={metier.id}
                  ref={(el) => { boutons.current[metier.id] = el; }}
                  data-metier={metier.id}
                  pressee={presse}
                  tabIndex={presse ? 0 : -1}
                  onClick={() => choisir(metier.id)}
                >
                  {metier.nom}
                </PastilleFiltre>
              );
            })}
          </div>
          <p className="sr-only" aria-live="polite">{annonce}</p>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {lots.map((lot, i) => (
              <CarteLot key={`${actif}-${lot.id}`} lot={lot} rang={i} />
            ))}
          </div>

          <p data-note="" className="mt-6 max-w-[48em] text-sm leading-relaxed text-slate-600">
            Prix moyens indicatifs du marché français (2026), fourniture et pose HT. Ils font gagner du temps ; vos propres
            tarifs restent les vôtres.
          </p>
        </>
      )}
    </SectionSite>
  );
}
