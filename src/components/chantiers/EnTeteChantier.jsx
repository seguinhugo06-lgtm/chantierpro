import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, MoreHorizontal } from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import { Volet } from '../ui/Filtres';

/**
 * En-tête de la fiche chantier — le motif de l'en-tête des fiches de documents (devis/EnteteDocument.jsx) : qui, où on
 * en est, UNE action principale ; le reste dans « ⋯ » (audit UX du 20 oct. 2026, § 2.4 et fiche chantier).
 * Avant : aucune action pleine en haut (le seul bouton plein était « Prendre une photo », tout en bas), quatre icônes
 * sans libellé au bureau.
 *
 * @param {string} titre nom du chantier
 * @param {string} [sousTitre] « Marie Dupont · Paris »
 * @param {React.ReactNode} statut la pastille du statut (ou son sélecteur)
 * @param {{libelle:string, icone?:any, onClick:Function, aide?:string}} [principal] une seule action pleine
 * @param {Array<{libelle:string, icone?:any, onClick:Function, danger?:boolean}>} [actions] menu « ⋯ »
 * @param {{nom:string, onClick:Function}} [precedent] chantier d'avant (bureau)
 * @param {{nom:string, onClick:Function}} [suivant] chantier d'après (bureau)
 * @param {Function} onRetour
 */
export default function EnTeteChantier({ titre, sousTitre, statut, principal, actions = [], precedent, suivant, onRetour }) {
  const [menu, setMenu] = useState(false);
  const ancreRef = useRef(null);
  const normales = actions.filter((a) => !a.danger);
  const dangereuses = actions.filter((a) => a.danger);

  return (
    <section data-ui="EnTeteChantier" className="space-y-4">
      <div className="flex items-start gap-1 -mx-2">
        <BoutonIcone icone={ArrowLeft} libelle="Retour aux chantiers" onClick={onRetour} />
        <div className="flex-1 min-w-0 pt-2">
          <p className="text-sm font-medium text-encre-3">Chantier</p>
        </div>
        {actions.length ? (
          <BoutonIcone
            ref={ancreRef} icone={MoreHorizontal} libelle="Plus d'actions" onClick={() => setMenu((m) => !m)}
            aria-haspopup="dialog" aria-expanded={menu}
          />
        ) : null}
      </div>

      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-encre break-words">{titre}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          {statut}
          {sousTitre ? <p className="text-base text-encre-2 min-w-0 break-words">{sousTitre}</p> : null}
        </div>
      </div>

      {principal ? (
        <div className="flex">
          <Bouton
            variante="principal" taille="grande" icone={principal.icone} onClick={principal.onClick}
            title={principal.aide} className="flex-1 sm:flex-none"
          >
            {principal.libelle}
          </Bouton>
        </div>
      ) : null}

      {precedent || suivant ? (
        <div className="hidden sm:flex items-center justify-between -mx-2">
          <Bouton variante="discret" taille="compacte" icone={ArrowLeft} disabled={!precedent} onClick={precedent?.onClick}>
            <span className="max-w-[200px] truncate">{precedent?.nom || 'Précédent'}</span>
          </Bouton>
          <Bouton variante="discret" taille="compacte" iconeFin={ArrowRight} disabled={!suivant} onClick={suivant?.onClick}>
            <span className="max-w-[200px] truncate">{suivant?.nom || 'Suivant'}</span>
          </Bouton>
        </div>
      ) : null}

      <Volet ouvert={menu} onFermer={() => setMenu(false)} titre="Actions" ancreRef={ancreRef} largeur={300}>
        {[normales, dangereuses].filter((groupe) => groupe.length).map((groupe, i) => (
          <ul key={i} className={`-mx-2 ${i > 0 || (groupe === dangereuses && normales.length) ? 'pt-2 border-t border-bord' : ''}`}>
            {groupe.map((a) => {
              const Icone = a.icone;
              return (
                <li key={a.libelle}>
                  <button
                    type="button"
                    onClick={() => { setMenu(false); a.onClick(); }}
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
    </section>
  );
}
