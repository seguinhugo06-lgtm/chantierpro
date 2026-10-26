import { useId } from 'react';
import { Check } from 'lucide-react';
import { EtatEnregistrement } from './champsParametres';
import { COULEUR_DOCUMENTS_DEFAUT } from '../../lib/theme';

/**
 * Couleur des devis et factures. Les pastilles montrent la couleur imprimée telle quelle (c'est un choix pour les
 * documents) ; l'app, elle, en tire son accent lisible (src/lib/theme.js).
 *
 * « Bleu nuit » (la couleur du logo et de l'app) est proposé depuis le 26 oct. 2026 (audit UX du 20 oct., P2). La
 * couleur des fiches qui n'en ont jamais choisi reste l'orange d'origine : le changer attend la décision d'Hugo.
 */
export const COULEURS_DOCUMENTS = [
  { valeur: '#12336F', nom: 'Bleu nuit' },
  { valeur: COULEUR_DOCUMENTS_DEFAUT, nom: 'Orange' },
  { valeur: '#ef4444', nom: 'Rouge' },
  { valeur: '#22c55e', nom: 'Vert' },
  { valeur: '#3b82f6', nom: 'Bleu' },
  { valeur: '#8b5cf6', nom: 'Violet' },
  { valeur: '#ec4899', nom: 'Rose' },
  { valeur: '#14b8a6', nom: 'Turquoise' },
  { valeur: '#64748b', nom: 'Ardoise' },
];

const meme = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

export default function ChoixCouleur({ entreprise, updateEntreprise }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <div className="flex items-end justify-between gap-2 mb-1.5">
        <p id={id} className="text-sm font-medium text-encre-2">Couleur des documents</p>
        <EtatEnregistrement cle="couleur" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {COULEURS_DOCUMENTS.map((c) => {
          const choisie = meme(entreprise.couleur, c.valeur);
          return (
            <button
              key={c.valeur}
              type="button"
              onClick={() => updateEntreprise((p) => ({ ...p, couleur: c.valeur }), 'couleur')}
              aria-pressed={choisie}
              aria-label={`${c.nom}${choisie ? ' (choisie)' : ''}`}
              title={c.nom}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-150 hover:scale-105"
              // La couleur imprimée elle-même ; la sélection : un contour de la même couleur, décalé
              style={{ background: c.valeur, outline: choisie ? `3px solid ${c.valeur}` : 'none', outlineOffset: 3 }}
            >
              {choisie ? <Check size={20} strokeWidth={3} aria-hidden="true" className="text-white drop-shadow" /> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-sm text-encre-3">Couleur de vos devis et factures.</p>
    </div>
  );
}
