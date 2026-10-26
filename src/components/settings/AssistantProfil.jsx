import { useId } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Package, Search } from 'lucide-react';
import Modal from '../ui/Modal';
import { Bouton } from '../ui/Bouton';
import ChampChoix from '../ui/ChampChoix';
import { ChampParam, DebouncedInput, CLASSE_CHAMP } from './champsParametres';
import ChampsAdresse from './ChampsAdresse';
import ChoixCouleur from './ChoixCouleur';
import ChoixTva from './ChoixTva';
import { estEntrepreneurIndividuel, estEirl } from '../../lib/identiteEntreprise';
import { estFranchiseTva } from '../../lib/franchiseTva';
import { profilManquant } from '../../lib/profilLegal';
import { LEXIQUE } from '../../lib/lexique';

/**
 * Assistant de démarrage : le profil de l'entreprise en cinq étapes, ouvert depuis Paramètres (« Compléter avec
 * l'assistant ») quand une mention bloque l'envoi des devis et factures.
 *
 * Retours d'Hugo (21-23 oct. 2026) : charte de l'app (plus d'orange dans les étapes ni dans le curseur d'acompte),
 * l'adresse en trois champs (« 127 cours du Médoc33300Bordeaux » s'affichait sans séparateur) et le taux de TVA par
 * défaut d'une micro-entreprise : 0 % et la mention 293 B (il proposait 10 %). Fenêtre de l'app (ui/Modal) : rôle
 * dialogue, focus gardé, Échap, feuille du bas au téléphone.
 */
export const ETAPES_ASSISTANT = [
  { id: 'identite', titre: 'Identité', desc: 'Votre entreprise en un coup d’œil' },
  { id: 'siret', titre: 'Informations légales', desc: 'SIRET, forme juridique, adresse et contact' },
  { id: 'documents', titre: 'Documents', desc: 'TVA et acompte par défaut' },
  { id: 'relances', titre: 'Relances', desc: 'Relancer les impayés et les devis sans réponse' },
  { id: 'catalogue', titre: 'Catalogue', desc: 'Importez le référentiel BTP' },
];

export default function AssistantProfil({
  ouvert, onFermer, etape, setEtape, entreprise, updateEntreprise, formesJuridiques, completude,
  relancesActives, onLogo, lookupSirene, sireneEnCours, onCompleter, onOuvrirRelances, onOuvrirCatalogue, onTerminer,
}) {
  const idForme = useId();
  const total = ETAPES_ASSISTANT.length;
  const n = Math.min(etape, total - 1);
  const def = ETAPES_ASSISTANT[n];
  // Ce qui bloquerait l'envoi (lib/profilLegal). Avant, la dernière étape disait « Configuration terminée ! »
  // même sans décennale (que l'assistant ne demande pas) : l'artisan croyait pouvoir envoyer, l'envoi était bloqué.
  const manquantes = profilManquant(entreprise);
  const NOM_ONGLET = { identite: 'Identité', legal: 'Légal', assurances: 'Assurances', documents: 'Documents' };
  const maj = (cle) => (val) => updateEntreprise((p) => ({ ...p, [cle]: val }), cle);

  const pied = (
    <div className="w-full flex items-center gap-3">
      {n > 0 ? (
        <Bouton variante="discret" icone={ArrowLeft} onClick={() => setEtape((s) => Math.max(0, s - 1))}>Précédent</Bouton>
      ) : null}
      <p className="flex-1 text-center text-sm text-encre-3 tabular-nums whitespace-nowrap max-sm:invisible">Profil {completude} %</p>
      {n < total - 1 ? (
        <Bouton variante="principal" iconeFin={ArrowRight} onClick={() => setEtape((s) => s + 1)}>Suivant</Bouton>
      ) : manquantes.length > 0 ? (
        <Bouton variante="principal" onClick={() => onCompleter(manquantes[0])}>Compléter le profil</Bouton>
      ) : (
        <Bouton variante="principal" icone={Check} onClick={onTerminer}>Terminer</Bouton>
      )}
    </div>
  );

  return (
    <Modal isOpen={ouvert} onClose={onFermer} size="md" title={def.titre} description={`Étape ${n + 1} sur ${total} · ${def.desc}`} footer={pied}>
      {/* Étapes : un trait par étape, à l'accent pour les étapes faites et la courante ; une étape faite se rouvre */}
      <ol className="flex items-center gap-1.5 mb-5" aria-label="Étapes de l'assistant">
        {ETAPES_ASSISTANT.map((s, i) => (
          <li key={s.id} className="flex-1">
            <button
              type="button"
              onClick={() => i <= n && setEtape(i)}
              disabled={i > n}
              aria-current={i === n ? 'step' : undefined}
              aria-label={`Étape ${i + 1} : ${s.titre}${i < n ? ' (faite)' : ''}`}
              className="w-full h-11 flex items-center disabled:cursor-default"
            >
              <span aria-hidden="true" className={`block w-full h-1.5 rounded-full ${i <= n ? 'bg-accent' : 'bg-bord'}`} />
            </button>
          </li>
        ))}
      </ol>

      <div className="space-y-4">
        {n === 0 && (
          <>
            <ChampParam id="assistant-nom" cle="nom" libelle="Nom de l’entreprise">
              <DebouncedInput id="assistant-nom" type="text" value={entreprise.nom || ''} onChange={maj('nom')} placeholder="Ex : Martin Rénovation" />
            </ChampParam>
            <div>
              <p className="text-sm font-medium text-encre-2 mb-1.5">Logo</p>
              <div className="flex items-center gap-3">
                {entreprise.logo ? (
                  <img src={entreprise.logo} alt="Logo" className="w-12 h-12 rounded-xl object-contain border border-bord bg-surface" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <span className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold bg-surface-2 text-encre-2" aria-hidden="true">
                    {(entreprise.nom || 'E').charAt(0).toUpperCase()}
                  </span>
                )}
                <label className="inline-flex items-center h-11 px-4 rounded-full cursor-pointer text-sm font-semibold bg-surface text-encre border border-bord-fort hover:bg-surface-2">
                  {entreprise.logo ? 'Changer le logo' : 'Ajouter un logo'}
                  <input type="file" accept="image/*" onChange={onLogo} className="sr-only" />
                </label>
              </div>
            </div>
            <ChoixCouleur entreprise={entreprise} updateEntreprise={updateEntreprise} />
          </>
        )}

        {n === 1 && (
          <>
            <ChampParam id="assistant-siret" cle="siret" libelle="SIRET" lexique={LEXIQUE.siret} aide="Avec « Remplir », le répertoire SIRENE complète le nom, l’adresse et le code APE.">
              <div className="flex gap-2">
                <DebouncedInput id="assistant-siret" type="text" inputMode="numeric" value={entreprise.siret || ''} onChange={maj('siret')} placeholder="123 456 789 00012" className={`${CLASSE_CHAMP} flex-1 min-w-0`} />
                <Bouton icone={Search} chargement={sireneEnCours} onClick={lookupSirene} className="h-12">Remplir</Bouton>
              </div>
            </ChampParam>
            <ChampParam id="assistant-forme" idLibelle={idForme} cle="formeJuridique" libelle="Forme juridique">
              <ChampChoix id="assistant-forme" idLibelle={idForme} titre="Forme juridique" vide="Choisir la forme juridique"
                options={formesJuridiques.map((f) => ({ valeur: f.valeur, libelle: f.libelle }))}
                valeur={entreprise.formeJuridique || ''} onChange={maj('formeJuridique')} />
            </ChampParam>
            {(estEntrepreneurIndividuel(entreprise) || estEirl(entreprise)) && (
              <ChampParam id="assistant-nom-entrepreneur" cle="nomEntrepreneur" libelle="Votre prénom et nom" lexique={LEXIQUE.ei}
                aide={`Imprimé suivi de « ${estEirl(entreprise) ? 'EIRL' : 'EI'} » sur vos documents.`}>
                <DebouncedInput id="assistant-nom-entrepreneur" type="text" value={entreprise.nomEntrepreneur || ''} onChange={maj('nomEntrepreneur')} placeholder="Ex : Hugo Séguin" />
              </ChampParam>
            )}
            <ChampsAdresse id="assistant-adresse" entreprise={entreprise} updateEntreprise={updateEntreprise} />
            <ChampParam id="assistant-tel" cle="tel" libelle="Téléphone">
              <DebouncedInput id="assistant-tel" type="tel" value={entreprise.tel || ''} onChange={maj('tel')} placeholder="06 12 34 56 78" />
            </ChampParam>
            <ChampParam id="assistant-email" cle="email" libelle="E-mail">
              <DebouncedInput id="assistant-email" type="email" value={entreprise.email || ''} onChange={maj('email')} placeholder="contact@entreprise.fr" />
            </ChampParam>
            <ChampParam id="assistant-codeApe" cle="codeApe" libelle="Code APE" facultatif lexique={LEXIQUE.ape}>
              <DebouncedInput id="assistant-codeApe" type="text" value={entreprise.codeApe || ''} onChange={(v) => updateEntreprise((p) => ({ ...p, codeApe: v.toUpperCase() }), 'codeApe')} placeholder="4321A" maxLength={5} />
            </ChampParam>
            {!estFranchiseTva(entreprise) && (
              <ChampParam id="assistant-tvaIntra" cle="tvaIntra" libelle="N° de TVA intracommunautaire" lexique={LEXIQUE.tvaIntra}>
                <DebouncedInput id="assistant-tvaIntra" type="text" value={entreprise.tvaIntra || ''} onChange={(v) => updateEntreprise((p) => ({ ...p, tvaIntra: v.toUpperCase() }), 'tvaIntra')} placeholder="FR12345678901" />
              </ChampParam>
            )}
          </>
        )}

        {n === 2 && (
          <>
            <ChoixTva entreprise={entreprise} updateEntreprise={updateEntreprise} />
            <ChampParam id="assistant-acompte" cle="acompteDefaut" libelle={`Acompte par défaut : ${entreprise.acompteDefaut ?? 30} %`}>
              <input id="assistant-acompte" type="range" min="0" max="50" step="5"
                value={entreprise.acompteDefaut ?? 30}
                onChange={(e) => updateEntreprise((p) => ({ ...p, acompteDefaut: parseInt(e.target.value, 10) }), 'acompteDefaut')}
                className="w-full h-11 accent-accent"
              />
              <div className="flex justify-between text-sm text-encre-3" aria-hidden="true"><span>0 %</span><span>25 %</span><span>50 %</span></div>
            </ChampParam>
            <p className="text-sm text-encre-3">Assurances, garanties légales, pénalités de retard et droit de rétractation s’impriment à partir de votre profil. À joindre vous-même pour l’instant : votre attestation d’assurance décennale.</p>
          </>
        )}

        {n === 3 && (
          <>
            <div className="p-4 rounded-2xl bg-surface-2">
              <p className="text-sm font-semibold text-encre mb-2">Scénario de relance type</p>
              <ul className="space-y-2">
                {[
                  { jour: 'J+7', desc: 'Rappel de consultation' },
                  { jour: 'J+15', desc: 'Relance douce' },
                  { jour: 'J+30', desc: 'Dernière relance' },
                ].map((r) => (
                  <li key={r.jour} className="flex items-center gap-3 text-sm text-encre-2">
                    <span className="font-semibold w-11 tabular-nums text-encre">{r.jour}</span>
                    <span>E-mail · {r.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* L'interrupteur réel des relances (relanceConfig.enabled) est dans la rubrique Relances, avec ses étapes et ses
                textes. Avant (recette du 9 oct. 2026), celui de l'assistant écrivait « relancesActives », que rien ne lit. */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-bord">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-encre">Relances automatiques : {relancesActives ? 'activées' : 'désactivées'}</p>
                <p className="text-sm text-encre-3">Réglez-les (étapes, textes, envoi) dans la rubrique Relances.</p>
              </div>
              <Bouton onClick={onOuvrirRelances}>Ouvrir les relances</Bouton>
            </div>
          </>
        )}

        {n === 4 && (
          <>
            {manquantes.length > 0 && (
              <div className="p-4 rounded-2xl bg-alerte-fond text-alerte-texte" data-assistant="manquantes">
                <p className="text-sm font-semibold flex items-start gap-2">
                  <AlertCircle size={18} aria-hidden="true" className="shrink-0 mt-px" />
                  {manquantes.length === 1 ? 'Il manque une information' : `Il manque ${manquantes.length} informations`} pour envoyer vos devis et factures :
                </p>
                <ul className="mt-2 space-y-1.5">
                  {manquantes.map((m) => (
                    <li key={m.id}>
                      <button type="button" onClick={() => onCompleter(m)}
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-left text-sm bg-surface text-encre hover:bg-surface-2">
                        <span>{m.libelle}</span>
                        <span className="text-sm text-encre-3 whitespace-nowrap">{NOM_ONGLET[m.onglet]} →</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="p-4 rounded-2xl text-center bg-surface-2">
              <Package size={32} aria-hidden="true" className="mx-auto mb-2 text-encre-3" />
              <p className="text-sm font-semibold text-encre">Importez le référentiel BTP</p>
              <p className="text-sm mt-1 text-encre-3">Choisissez votre métier : les articles courants s’ajoutent à votre catalogue.</p>
            </div>
            <Bouton pleineLargeur icone={Package} onClick={onOuvrirCatalogue}>Ouvrir le catalogue pour importer</Bouton>
            <p className="text-sm text-center text-encre-3">Vous pourrez toujours le faire plus tard depuis le catalogue.</p>
          </>
        )}
      </div>
    </Modal>
  );
}
