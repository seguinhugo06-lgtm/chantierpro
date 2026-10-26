import { useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { BoutonIcone } from './Bouton';
import { Volet } from './Filtres';

/**
 * MenuActions — le bouton « ⋯ » et sa liste d'actions : une feuille qui monte du bas sur téléphone, un panneau ancré
 * au bouton ailleurs (même motif que l'en-tête des fiches de documents et de chantiers). Les actions rares ou
 * destructrices y vivent, pour que l'écran garde UNE action pleine (audit UX du 20 oct. 2026, § 2.4 et fiche client).
 *
 * @param {Array<{libelle:string, icone?:any, onClick:Function, danger?:boolean, masque?:boolean}>} actions
 *   `masque` : l'action n'est pas proposée (droit manquant, fonction absente) ; sans action visible, rien ne s'affiche.
 *   Les actions `danger` vont en bas, séparées.
 * @param {string} [titre] titre de la feuille
 * @param {string} [libelle] nom accessible du bouton
 */
export default function MenuActions({ actions = [], titre = 'Actions', libelle = "Plus d'actions", largeur = 300, className = '' }) {
  const [ouvert, setOuvert] = useState(false);
  const ancreRef = useRef(null);
  const visibles = actions.filter((a) => a && !a.masque);
  if (!visibles.length) return null;
  const normales = visibles.filter((a) => !a.danger);
  const dangereuses = visibles.filter((a) => a.danger);

  return (
    <>
      <BoutonIcone
        ref={ancreRef} icone={MoreHorizontal} libelle={libelle} variante="secondaire" className={className}
        onClick={() => setOuvert((o) => !o)} aria-haspopup="dialog" aria-expanded={ouvert}
      />
      <Volet ouvert={ouvert} onFermer={() => setOuvert(false)} titre={titre} ancreRef={ancreRef} largeur={largeur}>
        {[normales, dangereuses].filter((groupe) => groupe.length).map((groupe, i) => (
          <ul key={i} className={`-mx-2 ${groupe === dangereuses && normales.length ? 'pt-2 border-t border-bord' : ''}`}>
            {groupe.map((a) => {
              const Icone = a.icone;
              return (
                <li key={a.libelle}>
                  <button
                    type="button"
                    onClick={() => { setOuvert(false); a.onClick(); }}
                    className={`w-full min-h-[48px] flex items-center gap-3 px-3 rounded-xl text-left text-base sm:text-sm font-medium transition-colors hover:bg-surface-2 ${a.danger ? 'text-danger-texte' : 'text-encre'}`}
                  >
                    {Icone ? <Icone size={18} aria-hidden="true" className={a.danger ? '' : 'text-encre-3'} /> : null}
                    {a.libelle}
                  </button>
                </li>
              );
            })}
          </ul>
        ))}
      </Volet>
    </>
  );
}
