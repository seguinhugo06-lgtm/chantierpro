import { Check } from 'lucide-react';
import { METIERS, normaliserMetiers } from '../../lib/metiers';

/**
 * « Quels travaux faites-vous ? » : les 15 métiers de la synthèse et « Autre », en puces à choix multiple
 * (bienvenue d'un nouveau compte et Paramètres › Mon métier). Rien n'est obligatoire.
 */
export default function ChoixMetiers({ valeur = [], onChange, desactive = false, idGroupe = 'choix-metiers' }) {
  const choisis = normaliserMetiers(valeur);
  const basculer = (id) => {
    const suivant = choisis.includes(id) ? choisis.filter((x) => x !== id) : [...choisis, id];
    onChange?.(normaliserMetiers(suivant));
  };
  return (
    <div role="group" aria-labelledby={`${idGroupe}-titre`} className="flex flex-wrap gap-2" data-testid="choix-metiers">
      {METIERS.map((m) => {
        const actif = choisis.includes(m.id);
        return (
          <button
            key={m.id} type="button" aria-pressed={actif} disabled={desactive}
            onClick={() => basculer(m.id)}
            className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full border text-sm font-medium transition-colors disabled:opacity-60 ${actif ? 'border-accent bg-accent/10 text-encre' : 'border-bord bg-surface text-encre-2 hover:border-bord-fort'}`}
          >
            {actif && <Check size={14} className="text-accent-texte" aria-hidden="true" />}
            {m.nom}
          </button>
        );
      })}
    </div>
  );
}
