/**
 * EtatVide — refonte du 9 oct. 2026 (4 styles d'états vides remplacés par un seul). Sans carte ni
 * motif : une icône neutre, un titre, une phrase, une seule action — principale au premier usage
 * (« Créer mon premier devis »), secondaire après une recherche sans résultat (« Effacer la recherche »).
 *
 * @param {React.ComponentType} icone lucide
 * @param {string} titre
 * @param {string} [texte]
 * @param {React.ReactNode} [action] un <Bouton>
 */
export default function EtatVide({ icone: Icone, titre, texte, action, className = '' }) {
  return (
    <div data-ui="EtatVide" role="status" className={`flex flex-col items-center text-center px-6 py-12 ${className}`}>
      {Icone ? (
        <span className="w-12 h-12 rounded-2xl bg-surface-2 text-encre-3 flex items-center justify-center" aria-hidden="true">
          <Icone size={24} />
        </span>
      ) : null}
      <p className="mt-4 text-lg font-semibold text-encre">{titre}</p>
      {texte ? <p className="mt-1 text-sm text-encre-2 max-w-xs">{texte}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
