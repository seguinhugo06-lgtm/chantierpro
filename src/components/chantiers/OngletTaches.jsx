import { useState } from 'react';
import { ChevronRight, Plus, MoreVertical, Sparkles, ListChecks, Trash2, CheckCircle } from 'lucide-react';
import Carte from '../ui/Carte';
import Pastille from '../ui/Pastille';
import EtatVide from '../ui/EtatVide';
import Champ from '../ui/Champ';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import { SegmentDefilant } from '../ui/Filtres';
import { PHASES, calculateProgressByPhase, getAvailableProjectTypes } from '../../lib/templates/task-templates-v2';
import { FONCTIONS } from '../../lib/fonctions';

/**
 * Onglet « Tâches » de la fiche chantier : la liste type du chantier, par phase, et la saisie d'une tâche. Avant, un bloc
 * de la fiche : un cercle de progression, trois filtres et une liste de 350 px défilant dans la page.
 */
export default function OngletTaches({
  taches = [], peutModifier, animatedTaskId, onBascule, onAjouter, onModifier, onSupprimer, onGenerer, onListeType,
}) {
  const [nouvelle, setNouvelle] = useState('');
  const [filtre, setFiltre] = useState('toutes');
  const [replie, setReplie] = useState({});
  const [termineesOuvertes, setTermineesOuvertes] = useState(false);
  const [enEdition, setEnEdition] = useState(null);

  const aFaire = taches.filter((t) => !t.done);
  const faites = taches.filter((t) => t.done);
  const prioritaires = aFaire.filter((t) => t.critical);
  const progression = calculateProgressByPhase(taches);
  const parPhase = Object.fromEntries(PHASES.map((p) => [p.id, taches.filter((t) => t.phase === p.id)]));
  const sansPhase = taches.filter((t) => !t.phase);
  const typesProjet = getAvailableProjectTypes();

  const filtrer = (liste) => (filtre === 'afaire' ? liste.filter((t) => !t.done) : filtre === 'prioritaires' ? liste.filter((t) => t.critical && !t.done) : liste);
  const progressionPhase = (id) => {
    const l = parPhase[id] || [];
    const faitesPhase = l.filter((t) => t.done).length;
    return { faites: faitesPhase, total: l.length, pct: l.length ? Math.round((faitesPhase / l.length) * 100) : 0 };
  };
  const ajouter = () => {
    const texte = nouvelle.trim();
    if (!texte) return;
    onAjouter(texte);
    setNouvelle('');
  };

  const ligne = (t, avecPriorite) => (
    <div key={t.id} className="flex items-center gap-3 min-h-[44px] px-1 rounded-lg group transition-colors hover:bg-surface-2/60">
      <input
        type="checkbox" checked={t.done} disabled={!peutModifier} onChange={() => onBascule(t.id)}
        aria-label={`${t.done ? 'Rouvrir' : 'Cocher'} : ${t.text}`}
        className={`w-6 h-6 rounded-md cursor-pointer flex-shrink-0 accent-[rgb(var(--accent))] transition-transform ${animatedTaskId === t.id ? 'scale-125' : ''}`}
      />
      <button
        type="button" disabled={!peutModifier} onClick={() => setEnEdition(t)}
        className={`flex-1 min-w-0 py-2 text-sm text-left ${peutModifier ? 'cursor-pointer' : 'cursor-default'} ${t.done ? 'line-through text-encre-3' : 'text-encre'} ${t.critical && avecPriorite ? 'font-semibold' : ''}`}
      >
        {t.text}
      </button>
      {avecPriorite && t.critical && !t.done && <Pastille ton="alerte">Prioritaire</Pastille>}
      {peutModifier && (
        <button
          type="button" onClick={() => setEnEdition(t)} aria-label="Modifier la tâche"
          className="min-w-[44px] min-h-[44px] rounded flex items-center justify-center sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-bord"
        >
          <MoreVertical size={16} aria-hidden="true" className="text-encre-3" />
        </button>
      )}
    </div>
  );

  const enTetePhase = (id, libelle, compteFaites, compteTotal, pct) => (
    <button type="button" onClick={() => setReplie((p) => ({ ...p, [id]: !p[id] }))} aria-expanded={!replie[id]} className={`w-full min-h-[48px] flex items-center gap-2 px-3 text-left transition-colors hover:bg-surface-2 ${replie[id] ? 'rounded-lg' : 'rounded-t-lg'}`}>
      <ChevronRight size={16} aria-hidden="true" className={`flex-shrink-0 text-encre-3 transition-transform ${replie[id] ? '' : 'rotate-90'}`} />
      <span className="text-sm font-semibold flex-1 text-encre">{libelle}</span>
      <span className="text-sm text-encre-3 tabular-nums">{compteFaites}/{compteTotal}</span>
      {pct !== undefined && (
        <span className="w-10 h-1.5 rounded-full overflow-hidden bg-bord" aria-hidden="true">
          <span className={`block h-full rounded-full transition-all ${pct === 100 ? 'bg-succes-point' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
        </span>
      )}
    </button>
  );

  return (
    <Carte>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-encre flex items-baseline gap-2">
          Tâches
          {taches.length > 0 && <span className="text-sm font-medium text-encre-3 tabular-nums">{faites.length}/{taches.length}</span>}
        </h2>
        {peutModifier && taches.length > 0 && (
          <Bouton variante="discret" taille="compacte" icone={Sparkles} onClick={onGenerer} className="-mr-2">
            {FONCTIONS.ia ? 'Compléter (IA)' : 'Tâches types'}
          </Bouton>
        )}
      </div>

      {taches.length === 0 ? (
        <div>
          <EtatVide
            icone={ListChecks} titre="Aucune tâche"
            texte={peutModifier ? "Partez d'une liste type, puis cochez au fil du chantier." : 'Aucune tâche sur ce chantier.'}
            className="py-6"
          />
          {peutModifier && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {typesProjet.slice(0, 4).map((pt) => (
                  <button
                    key={pt.key} type="button" onClick={() => onListeType(pt.key)}
                    className="min-h-[48px] px-3 py-2 rounded-xl border border-bord-fort bg-surface text-left text-sm font-semibold text-encre transition-colors hover:bg-surface-2"
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
              <Bouton variante="discret" taille="compacte" iconeFin={ChevronRight} className="mt-2 -ml-2" onClick={onGenerer}>Autres listes types</Bouton>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex sm:flex-col items-center gap-3 sm:gap-1">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                  <circle cx="32" cy="32" r="26" strokeWidth="8" fill="none" className="stroke-bord" />
                  <circle
                    cx="32" cy="32" r="26" strokeWidth="8" fill="none" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 26 * progression.total / 100} ${2 * Math.PI * 26}`}
                    className={`transition-all duration-500 ${progression.total === 100 ? 'stroke-succes-point' : 'stroke-accent'}`}
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center font-bold text-xl tabular-nums ${progression.total === 100 ? 'text-succes-texte' : 'text-encre'}`}>{progression.total}%</span>
              </div>
              <div className="sm:text-center">
                <p className="font-semibold text-encre tabular-nums">{faites.length}/{taches.length}</p>
                <p className="text-sm text-encre-3">{faites.length === taches.length ? 'Terminé !' : `${aFaire.length} restante${aFaire.length > 1 ? 's' : ''}`}</p>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="mb-3">
                <SegmentDefilant
                  ariaLabel="Tâches à afficher" valeur={filtre} onChange={setFiltre}
                  options={[
                    { valeur: 'toutes', libelle: 'Toutes' },
                    { valeur: 'afaire', libelle: 'À faire' },
                    { valeur: 'prioritaires', libelle: 'Prioritaires', compte: prioritaires.length },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                {PHASES.map((phase) => {
                  const toutes = parPhase[phase.id] || [];
                  const visibles = filtrer(toutes);
                  if (toutes.length === 0 || (visibles.length === 0 && filtre !== 'toutes')) return null;
                  const pp = progressionPhase(phase.id);
                  return (
                    <div key={phase.id} className="rounded-lg border border-bord">
                      {enTetePhase(phase.id, phase.label, pp.faites, pp.total, pp.pct)}
                      {!replie[phase.id] && <div className="px-2.5 pb-2 space-y-0.5">{visibles.map((t) => ligne(t, true))}</div>}
                    </div>
                  );
                })}
                {sansPhase.length > 0 && (
                  <div className="rounded-lg border border-bord">
                    {enTetePhase('sans-phase', 'Autres tâches', sansPhase.filter((t) => t.done).length, sansPhase.length)}
                    {!replie['sans-phase'] && <div className="px-2.5 pb-2 space-y-0.5">{filtrer(sansPhase).map((t) => ligne(t, true))}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {faites.length > 0 && filtre === 'toutes' && (
            <div className="mb-3">
              <button
                type="button" onClick={() => setTermineesOuvertes(!termineesOuvertes)} aria-expanded={termineesOuvertes}
                className="w-full min-h-[44px] flex items-center gap-2 px-2 rounded-lg text-left transition-colors bg-surface-2 hover:bg-bord"
              >
                <ChevronRight size={16} aria-hidden="true" className={`text-encre-3 transition-transform ${termineesOuvertes ? 'rotate-90' : ''}`} />
                <CheckCircle size={16} aria-hidden="true" className="text-succes-texte" />
                <span className="text-sm font-medium text-encre-2">Terminées ({faites.length})</span>
              </button>
              {termineesOuvertes && <div className="mt-1 space-y-0.5 max-h-[200px] overflow-y-auto">{faites.map((t) => ligne(t, false))}</div>}
            </div>
          )}
        </>
      )}

      {peutModifier && (
        <div className="flex gap-2 pt-3 border-t border-bord">
          <input
            placeholder="Ajouter une tâche..." aria-label="Ajouter une tâche" value={nouvelle}
            onChange={(e) => setNouvelle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ajouter(); }}
            className="flex-1 min-w-0 h-12 px-3.5 rounded-xl border border-bord-fort bg-surface text-base text-encre placeholder:text-encre-3 focus:outline-none focus:ring-4 focus:border-accent focus:ring-accent/20"
          />
          <BoutonIcone icone={Plus} libelle="Ajouter la tâche" variante="secondaire" onClick={ajouter} disabled={!nouvelle.trim()} />
        </div>
      )}

      {enEdition && (
        <Modal isOpen onClose={() => setEnEdition(null)} size="sm">
          <ModalHeader>
            <ModalTitle>Modifier la tâche</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Champ libelle="Nom de la tâche" value={enEdition.text} onChange={(e) => setEnEdition({ ...enEdition, text: e.target.value })} />
            <Champ as="select" libelle="Phase" value={enEdition.phase || ''} onChange={(e) => setEnEdition({ ...enEdition, phase: e.target.value })}>
              <option value="">Sans phase</option>
              {PHASES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Champ>
            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer text-sm text-encre">
              <input type="checkbox" checked={enEdition.critical || false} onChange={(e) => setEnEdition({ ...enEdition, critical: e.target.checked })} className="w-5 h-5 rounded accent-[rgb(var(--accent))]" />
              Tâche prioritaire
            </label>
          </ModalBody>
          <ModalFooter className="justify-between">
            <Bouton variante="discret" icone={Trash2} className="text-danger-texte" onClick={() => { onSupprimer(enEdition.id); setEnEdition(null); }}>Supprimer</Bouton>
            <div className="flex gap-2">
              <Bouton variante="secondaire" onClick={() => setEnEdition(null)}>Annuler</Bouton>
              <Bouton
                variante="principal" disabled={!enEdition.text?.trim()}
                onClick={() => { onModifier(enEdition.id, { text: enEdition.text, phase: enEdition.phase, critical: enEdition.critical }); setEnEdition(null); }}
              >
                Enregistrer
              </Bouton>
            </div>
          </ModalFooter>
        </Modal>
      )}
    </Carte>
  );
}
