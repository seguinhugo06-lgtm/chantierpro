import { useRef, useState } from 'react';
import { ArrowLeft, MoreHorizontal, AlertTriangle, ChevronRight } from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import { Volet } from '../ui/Filtres';

/**
 * En-tête de fiche devis / facture — refonte du 9 oct. 2026 (revue visuelle, problèmes 4 et 5).
 * Avant : le numéro en titre, le client en gris 14 px, le montant 900 px plus bas, le statut dit
 * trois fois, « Facturer » trois fois et trois couleurs pour le bouton principal.
 * Maintenant : qui (le client), combien (TTC en 36 px), où on en est (une pastille, une phrase,
 * une barre d'étapes), et UNE action principale ; tout le reste est dans « ⋯ ».
 *
 * @param {string} surtitre « Devis · DEV-2026-00042 »
 * @param {React.ReactNode} titre nom du client (ou bouton « Assigner un client »)
 * @param {string} [objet]
 * @param {string} montant TTC formaté
 * @param {React.ReactNode} pastille <PastilleStatut taille="grande" />
 * @param {string} [contexte] « Échéance 24 oct. · reste 2 068 € »
 * @param {boolean} [contexteAlerte] contexte en rouge (retard)
 * @param {Array<{libelle:string, onClick?:Function}>} [alertes] manques légaux, etc.
 * @param {Array<{id:string, libelle:string, etat:'fait'|'courant'|'avenir'}>} [etapes]
 * @param {{libelle:string, icone?:any, onClick:Function, chargement?:boolean, desactive?:boolean, aide?:string}} [principal]
 * @param {{libelle:string, icone?:any, onClick:Function, chargement?:boolean}} [secondaire]
 * @param {Array<{libelle:string, icone?:any, onClick:Function, danger?:boolean, groupe?:string}>} [actions] menu « ⋯ »
 * @param {React.ReactNode} [extra] à droite du surtitre (versions)
 * @param {Function} onRetour
 */
export default function EnTeteDocument({
  surtitre, titre, objet, montant, pastille, contexte, contexteAlerte = false, alertes = [], etapes = [],
  principal, secondaire, actions = [], extra, onRetour,
}) {
  const [menu, setMenu] = useState(false);
  const ancreRef = useRef(null);
  const courant = etapes.find((e) => e.etat === 'courant');
  const groupes = actions.reduce((acc, a) => {
    const g = a.danger ? 'danger' : (a.groupe || 'principal');
    (acc[g] = acc[g] || []).push(a);
    return acc;
  }, {});

  return (
    <section data-ui="EnTeteDocument" className="space-y-4">
      {/* Retour · type et numéro · plus d'actions */}
      <div className="flex items-center gap-1 -mx-2">
        <BoutonIcone icone={ArrowLeft} libelle="Retour à la liste" onClick={onRetour} />
        <p className="flex-1 min-w-0 text-sm font-medium text-encre-3 truncate">{surtitre}</p>
        {extra}
        {actions.length ? (
          <BoutonIcone
            ref={ancreRef} icone={MoreHorizontal} libelle="Plus d'actions" onClick={() => setMenu((m) => !m)}
            aria-haspopup="dialog" aria-expanded={menu}
          />
        ) : null}
      </div>

      {/* Qui, quoi */}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-encre line-clamp-2 break-words">{titre}</h1>
        {objet ? <p className="mt-1 text-base text-encre-2 line-clamp-2">{objet}</p> : null}
      </div>

      {/* Combien, où on en est */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-4xl font-bold tabular-nums tracking-tight text-encre leading-none">{montant}</span>
          {pastille}
        </div>
        {contexte ? (
          <p className={`text-sm ${contexteAlerte ? 'font-semibold text-danger-texte' : 'text-encre-2'}`}>{contexte}</p>
        ) : null}
      </div>

      {alertes.length ? (
        <ul className="space-y-2">
          {alertes.map((a) => (
            <li key={a.libelle}>
              <button
                type="button" onClick={a.onClick} disabled={!a.onClick}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-alerte-fond text-alerte-texte text-left text-sm font-medium"
              >
                <AlertTriangle size={18} aria-hidden="true" className="flex-shrink-0" />
                <span className="flex-1">{a.libelle}</span>
                {a.onClick ? <ChevronRight size={18} aria-hidden="true" className="flex-shrink-0" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Étapes : des segments, le nom de l'étape en cours seulement */}
      {etapes.length ? (
        <div>
          <div className="flex gap-1.5" role="img" aria-label={`Étape ${etapes.findIndex((e) => e.etat === 'courant') + 1} sur ${etapes.length}${courant ? ` : ${courant.libelle}` : ''}`}>
            {etapes.map((e) => (
              <span key={e.id} className={`h-1.5 flex-1 rounded-full ${e.etat === 'avenir' ? 'bg-surface-2' : 'bg-accent'} ${e.etat === 'courant' ? 'opacity-100' : ''}`} />
            ))}
          </div>
          {courant ? <p className="mt-1.5 text-xs font-medium text-encre-3">{courant.libelle}</p> : null}
        </div>
      ) : null}

      {/* Une action principale, une secondaire */}
      {principal || secondaire ? (
        <div className="flex gap-2">
          {principal ? (
            <Bouton
              variante="principal" taille="grande" icone={principal.icone} onClick={principal.onClick}
              chargement={principal.chargement} disabled={principal.desactive} title={principal.aide}
              className="flex-1 sm:flex-none"
            >
              {principal.libelle}
            </Bouton>
          ) : null}
          {secondaire ? (
            <Bouton
              variante="secondaire" taille="grande" icone={secondaire.icone} onClick={secondaire.onClick}
              chargement={secondaire.chargement} className={principal ? '' : 'flex-1 sm:flex-none'}
            >
              {secondaire.libelle}
            </Bouton>
          ) : null}
        </div>
      ) : null}

      <Volet ouvert={menu} onFermer={() => setMenu(false)} titre="Actions" ancreRef={ancreRef} largeur={300}>
        {['principal', 'envoi', 'document', 'danger'].filter((g) => groupes[g]).map((g) => (
          <ul key={g} className={`-mx-2 ${g === 'danger' ? 'pt-2 border-t border-bord' : ''}`}>
            {groupes[g].map((a) => {
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
