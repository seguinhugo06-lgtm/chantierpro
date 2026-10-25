/**
 * Pastille de compte d'une rubrique (menu latéral, « Plus », cloche). Audit UX du 20 oct. 2026, § 2.1 : seulement ce
 * qui demande d'agir ; rouge (danger) pour un retard ou une relance due, neutre pour le reste. Avant : rouge, orange,
 * vert ou bleu en hexadécimal, et une pastille verte « 5 chantiers en cours » qui ne demandait rien.
 *
 * @param {number} n
 * @param {'danger'|'neutre'} [ton]
 */
const TONS = {
  danger: 'bg-danger-fond text-danger-texte',
  neutre: 'bg-neutre-fond text-neutre-texte',
};

export function PastilleCompte({ n, ton = 'neutre', titre, className = '' }) {
  if (!(n > 0)) return null;
  return (
    <span
      title={titre || undefined}
      className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold tabular-nums ${TONS[ton] || TONS.neutre} ${className}`}
    >
      {n > 99 ? '99+' : n}
      {titre ? <span className="sr-only"> : {titre}</span> : null}
    </span>
  );
}

export default PastilleCompte;
