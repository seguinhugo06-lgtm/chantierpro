import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, ClipboardCheck, ChevronRight } from 'lucide-react';
import Carte from '../ui/Carte';
import { Bouton } from '../ui/Bouton';

/**
 * Où en est le profil de l'entreprise (lib/jaugeProfil) : en tête des Paramètres.
 *
 * Audit UX du 20 oct. 2026 (P1) : la jauge s'affichait « Profil complété 100 % » en vert avec « 2 mentions
 * obligatoires selon votre situation » en ambre, médiateur vide ; l'artisan se croyait en règle. Maintenant deux
 * lignes : ce qui bloque l'envoi (vert seulement quand plus rien ne le bloque), puis, à part, ce qui reste à vérifier
 * selon la situation (ambre, avec un lien vers le médiateur) ; la barre n'est verte que quand les deux sont faits.
 *
 * Retours d'Hugo (21-23 oct.) : « Compléter avec l'assistant » était caché dans un menu, avec une icône d'étincelles ;
 * c'est maintenant le bouton de l'écran tant qu'une mention bloque l'envoi, sans allure d'intelligence artificielle.
 */
const NOM_ONGLET = { identite: 'Identité', legal: 'Légal', assurances: 'Assurances', documents: 'Documents' };

export default function EtatProfil({ jauge, onAllerAuChamp, onAssistant }) {
  const [detail, setDetail] = useState(false);
  const { obligatoires, selonSituation, recommandes, completude } = jauge;
  const bloque = obligatoires.length;
  const aVerifier = selonSituation.length;
  const toutBon = !bloque && !aVerifier && completude >= 100;
  const mediateur = selonSituation.find((m) => m.id === 'mediateur');
  const groupes = [
    { id: 'obligatoires', titre: 'Bloquent l’envoi', ton: 'text-danger-texte', point: 'bg-danger-point', champs: obligatoires },
    { id: 'selon-situation', titre: 'Obligatoires selon votre situation', sousTitre: 'n’empêchent pas l’envoi', ton: 'text-alerte-texte', point: 'bg-alerte-point', champs: selonSituation },
    { id: 'recommandes', titre: 'Recommandés', ton: 'text-encre-2', point: 'bg-neutre-point', champs: recommandes },
  ].filter((g) => g.champs.length);

  return (
    <Carte data-profil="etat">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="text-base font-semibold text-encre">Profil de l’entreprise</h2>
          {bloque ? (
            <p data-profil="bloque" className="flex items-start gap-1.5 text-sm font-semibold text-danger-texte">
              <AlertCircle size={17} aria-hidden="true" className="flex-shrink-0 mt-px" />
              {bloque === 1 ? '1 mention bloque l’envoi de vos devis et factures' : `${bloque} mentions bloquent l’envoi de vos devis et factures`}
            </p>
          ) : (
            <p data-profil="bloque" className="flex items-start gap-1.5 text-sm font-semibold text-succes-texte">
              <CheckCircle size={17} aria-hidden="true" className="flex-shrink-0 mt-px" />
              Mentions qui bloquent l’envoi : complètes
            </p>
          )}
          {aVerifier > 0 && (
            <p data-profil="a-verifier" className="flex items-start gap-1.5 text-sm font-medium text-alerte-texte">
              <AlertTriangle size={17} aria-hidden="true" className="flex-shrink-0 mt-px" />
              {aVerifier === 1 ? '1 mention obligatoire selon votre situation, à compléter' : `${aVerifier} mentions obligatoires selon votre situation, à compléter`}
            </p>
          )}
          {mediateur && (
            <button type="button" onClick={() => onAllerAuChamp(mediateur.onglet, mediateur.champ)}
              className="min-h-[44px] -my-1 -ml-2 px-2 inline-flex items-center gap-1 rounded-xl text-left text-sm font-semibold text-accent-texte hover:bg-surface-2">
              Renseigner le médiateur (clients particuliers) <ChevronRight size={16} aria-hidden="true" className="flex-shrink-0" />
            </button>
          )}
        </div>
        {bloque > 0 && onAssistant ? (
          <Bouton variante="principal" icone={ClipboardCheck} onClick={onAssistant} className="w-full sm:w-auto">Compléter avec l’assistant</Bouton>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden bg-surface-2" role="progressbar" aria-label="Profil complété" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completude}>
          <div className={`h-full rounded-full transition-all duration-500 ${toutBon ? 'bg-succes-point' : bloque ? 'bg-danger-point' : 'bg-alerte-point'}`} style={{ width: `${completude}%` }} />
        </div>
        <span className="text-sm font-semibold tabular-nums text-encre-2 whitespace-nowrap">{completude} %</span>
      </div>

      {groupes.length > 0 && (
        <button type="button" aria-expanded={detail} onClick={() => setDetail((d) => !d)}
          className="mt-1 h-11 -ml-2 px-2 rounded-xl text-sm font-semibold text-encre-2 hover:bg-surface-2">
          {detail ? 'Masquer le détail' : 'Voir ce qui manque'}
        </button>
      )}
      {detail && (
        <div className="mt-2 space-y-3">
          {groupes.map((g) => (
            <div key={g.id} data-groupe={g.id}>
              <p className={`text-sm font-semibold mb-1 flex items-center gap-1.5 ${g.ton}`}>
                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${g.point}`} />
                {g.titre}{g.sousTitre ? <span className="font-normal"> ({g.sousTitre})</span> : null}
              </p>
              <ul>
                {g.champs.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => onAllerAuChamp(f.onglet, f.champ)}
                      className="w-full min-h-[44px] px-3 py-1.5 -mx-3 rounded-xl flex items-center justify-between gap-3 text-left text-sm text-encre-2 hover:bg-surface-2">
                      <span className="min-w-0">
                        <span className="block">{f.libelle}</span>
                        {f.precision ? <span className="block text-sm text-encre-3">{f.precision}</span> : null}
                      </span>
                      <span className="text-sm text-encre-3 whitespace-nowrap">{NOM_ONGLET[f.onglet]} →</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Carte>
  );
}
