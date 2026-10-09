import { statut as lireStatut } from '../../lib/statuts';

/**
 * Pastille — un mot dans un ton (neutre, info, succes, alerte, danger), toujours écrit en toutes
 * lettres, 12 px au moins, texte ≥ 6:1 sur son fond. Le point reprend le ton.
 * Refonte du 9 oct. 2026 : remplace les 5 styles de pastilles de l'app (voir src/lib/statuts.js).
 *
 * @param {'neutre'|'info'|'succes'|'alerte'|'danger'} [ton]
 * @param {'normale'|'grande'} [taille] grande = en-tête de fiche
 * @param {React.ComponentType} [icone] icône lucide à la place du point
 */
const TONS = {
  neutre: 'bg-neutre-fond text-neutre-texte',
  info: 'bg-info-fond text-info-texte',
  succes: 'bg-succes-fond text-succes-texte',
  alerte: 'bg-alerte-fond text-alerte-texte',
  danger: 'bg-danger-fond text-danger-texte',
};
const POINTS = {
  neutre: 'bg-neutre-point',
  info: 'bg-info-point',
  succes: 'bg-succes-point',
  alerte: 'bg-alerte-point',
  danger: 'bg-danger-point',
};

export default function Pastille({ ton = 'neutre', taille = 'normale', icone: Icone, children, className = '' }) {
  const t = TONS[ton] ? ton : 'neutre';
  return (
    <span
      data-ui="Pastille"
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap leading-none ${
        taille === 'grande' ? 'h-7 px-3 text-sm' : 'h-6 px-2.5 text-xs'
      } ${TONS[t]} ${className}`}
    >
      {Icone
        ? <Icone size={taille === 'grande' ? 14 : 12} strokeWidth={2.5} aria-hidden="true" />
        : <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${POINTS[t]}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Pastille d'un statut métier : <PastilleStatut genre="devis" statut="envoye" />. */
export function PastilleStatut({ genre, statut, taille, className }) {
  const { libelle, ton } = lireStatut(genre, statut);
  return <Pastille ton={ton} taille={taille} className={className}>{libelle}</Pastille>;
}
