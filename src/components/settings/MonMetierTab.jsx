import { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import Carte from '../ui/Carte';
import ChoixMetiers from './ChoixMetiers';
import { EtatEnregistrement } from './champsParametres';
import { changementsDuChoix, normaliserMetiers } from '../../lib/metiers';

/**
 * Paramètres › Mon métier : le choix fait à l'inscription, modifiable (lot 1, docs/metiers/synthese.md § 3.1).
 * Chaque puce s'enregistre aussitôt (« Enregistré » s'affiche une fois la base d'accord, par `updateEntreprise`).
 */
export default function MonMetierTab({ entreprise, updateEntreprise }) {
  const enregistres = normaliserMetiers(entreprise?.metiers);
  const [choix, setChoix] = useState(enregistres);
  const cle = enregistres.join(',');
  useEffect(() => { setChoix(cle ? cle.split(',') : []); }, [cle]);
  const ramonageAllume = !!entreprise?.ramonageActif && choix.includes('ramoneur');

  const changer = (ids) => {
    setChoix(ids);
    updateEntreprise((p) => ({ ...p, ...changementsDuChoix(p, ids) }), 'metiers').then((ok) => {
      if (!ok) setChoix(normaliserMetiers(entreprise?.metiers));
    });
  };

  return (
    <div className="space-y-4" data-testid="reglages-metier">
      <Carte>
        <div className="flex items-center gap-2 mb-1 text-encre-2">
          <Briefcase size={18} aria-hidden="true" />
          <h3 id="metier-choix-titre" className="text-lg font-semibold text-encre flex-1">Quels travaux faites-vous ?</h3>
          {/* État visible de l'enregistrement (relecture du 4 nov. : il n'était annoncé qu'aux lecteurs d'écran) */}
          <span data-testid="metier-etat"><EtatEnregistrement cle="metiers" /></span>
        </div>
        <p className="text-sm text-encre-2 mb-4">
          Plusieurs choix possibles. Vos métiers passent en premier dans la bibliothèque de devis, les modèles et
          l’import du catalogue ; les autres métiers restent à un geste. Sans choix, rien ne change.
        </p>
        <ChoixMetiers valeur={choix} onChange={changer} idGroupe="metier-choix" />
        {ramonageAllume && <p className="mt-3 text-sm text-encre-2">Ramoneur : l’onglet « Ramonage » des fiches clients est allumé (réglable dans Paramètres › Ramonage).</p>}
      </Carte>
    </div>
  );
}
