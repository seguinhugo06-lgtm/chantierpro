import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { Plus, LayoutList } from 'lucide-react';
import TaskFilters from './TaskFilters';
import { EnTetePage } from '../ui/EnTete';
import { Bouton } from '../ui/Bouton';
import { Segmente } from '../ui/Onglets';
import { BoutonVolet, Volet, ListeChoix } from '../ui/Filtres';
import { usePermissions } from '../../hooks/usePermissions';
import { evenementsDuJour } from '../../lib/evenementsPlanning';
import { jourLocal } from '../../lib/dates';

const TaskListView = lazy(() => import('./TaskListView'));
const TaskKanbanView = lazy(() => import('./TaskKanbanView'));
const TaskCalendarView = lazy(() => import('./TaskCalendarView'));
const TaskGanttView = lazy(() => import('./TaskGanttView'));
const TaskTeamView = lazy(() => import('./TaskTeamView'));

// ════════════════════════════════════════════════════════
// TasksAndPlanning — Tâches et planning sous une seule rubrique (audit UX du 20 oct. 2026)
//
// Avant : trois niveaux de navigation empilés (cinq vues, puis « ← Planning », puis Mois / Semaine / Jour / Agenda), la vue
// active coupée au téléphone, trois « + » et trois compteurs qui se contredisaient (« 0 tâches », « 38 évén. », « 4 évén. »).
// Maintenant : un choix à deux (Planning ou Tâches) ; dans Tâches, la façon de les voir (Liste, Colonnes, Frise, Équipe) est
// dans un menu « Vue » ; dans Planning, Mois / Semaine / Jour / Agenda. Le sous-titre dit un fait : « 5 rendez-vous aujourd'hui ».
// ════════════════════════════════════════════════════════

const VUES_TACHES = [
  { valeur: 'list', libelle: 'Liste' },
  { valeur: 'kanban', libelle: 'Colonnes' },
  { valeur: 'gantt', libelle: 'Frise' },
  { valeur: 'team', libelle: 'Équipe' },
];
const RUBRIQUES = [{ valeur: 'planning', libelle: 'Planning' }, { valeur: 'taches', libelle: 'Tâches' }];
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export default function TasksAndPlanning({
  // Mémos (les tâches)
  memos, addMemo, updateMemo, deleteMemo, toggleMemo,
  // Événements du planning
  events, setEvents, addEvent, updateEvent, deleteEvent,
  // Données partagées
  chantiers, clients, equipe, devis,
  // Navigation
  setPage, setSelectedChantier, updateChantier,
  // Interface
  isDark, couleur, showToast: _showToast,
  // Planning
  prefill, clearPrefill,
  // Vue de départ (redirections depuis « planning » et « memos »)
  initialView,
}) {
  const { canPerform } = usePermissions();
  const [viewMode, setViewMode] = useState(() => {
    const raw = initialView || localStorage.getItem('cp_tasks_view') || 'list';
    // L'ancienne vue « agenda » est devenue une vue du planning
    return raw === 'agenda' ? 'calendar' : raw;
  });
  const [derniereVueTaches, setDerniereVueTaches] = useState(() => (VUES_TACHES.some((v) => v.valeur === viewMode) ? viewMode : 'list'));
  const [filters, setFilters] = useState({ search: '', category: '', priority: '', status: '', assignedTo: '' });
  const [selectedMemoId, setSelectedMemoId] = useState(null);
  const [demandeAjout, setDemandeAjout] = useState(0);
  const [voletVue, setVoletVue] = useState(false);
  const boutonVueRef = useRef(null);

  // Une redirection (page « planning », page « memos ») change la rubrique
  useEffect(() => {
    if (!initialView) return;
    const resolue = initialView === 'agenda' ? 'calendar' : initialView;
    setViewMode(resolue);
    if (resolue !== 'calendar') setDerniereVueTaches(resolue);
  }, [initialView]);

  const choisirVue = (v) => {
    setViewMode(v);
    if (v !== 'calendar') setDerniereVueTaches(v);
    try { localStorage.setItem('cp_tasks_view', v); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
  };

  const rubrique = viewMode === 'calendar' ? 'planning' : 'taches';
  const changerRubrique = (r) => choisirVue(r === 'planning' ? 'calendar' : derniereVueTaches);

  const stats = useMemo(() => {
    const aujourdhui = jourLocal();
    const actives = memos.filter((m) => !m.is_done);
    return {
      aFaire: actives.length,
      enRetard: actives.filter((m) => m.due_date && m.due_date < aujourdhui).length,
      rdvAujourdhui: evenementsDuJour(events || [], aujourdhui).length,
    };
  }, [memos, events]);

  const sousTitre = rubrique === 'planning'
    ? (stats.rdvAujourdhui > 0 ? `${pluriel(stats.rdvAujourdhui, 'rendez-vous')} aujourd'hui` : "Aucun rendez-vous aujourd'hui")
    : (stats.aFaire > 0 ? `${pluriel(stats.aFaire, 'tâche')} à faire${stats.enRetard > 0 ? ` · ${stats.enRetard} en retard` : ''}` : 'Aucune tâche à faire');

  const peutCreerEvenement = canPerform('planning', 'create');
  const libelleVue = VUES_TACHES.find((v) => v.valeur === viewMode)?.libelle;

  return (
    <div className="pb-4">
      <EnTetePage
        titre="Tâches & Planning" sousTitre={sousTitre}
        actions={(
          <>
            <Segmente ariaLabel="Rubrique" valeur={rubrique} onChange={changerRubrique} options={RUBRIQUES} className="hidden sm:inline-flex" />
            {rubrique === 'planning' && peutCreerEvenement && (
              <Bouton variante="principal" icone={Plus} onClick={() => setDemandeAjout((n) => n + 1)}>Événement</Bouton>
            )}
          </>
        )}
      />
      <Segmente ariaLabel="Rubrique" pleineLargeur valeur={rubrique} onChange={changerRubrique} options={RUBRIQUES} className="sm:hidden mb-4 -mt-1" />

      {/* Tâches : recherche, filtres et façon de les voir sur une seule rangée */}
      {rubrique === 'taches' && (
        <div className="mb-4">
          <TaskFilters
            filters={filters} onFiltersChange={setFilters} equipe={equipe || []} isDark={isDark} couleur={couleur}
            extra={(
              <BoutonVolet
                ref={boutonVueRef} icone={LayoutList} libelle="Vue" valeur={libelleVue} ouvert={voletVue} onClick={() => setVoletVue((o) => !o)} isDark={isDark} libelleCacheTelephone
              />
            )}
          />
          <Volet ouvert={voletVue} onFermer={() => setVoletVue(false)} titre="Voir les tâches en" ancreRef={boutonVueRef} largeur={300} isDark={isDark}>
            <ListeChoix
              titre="Vue" rechercheAuDela={99} isDark={isDark} options={VUES_TACHES} valeur={viewMode}
              onChange={(v) => { choisirVue(v); setVoletVue(false); }}
            />
          </Volet>
        </div>
      )}

      <Suspense fallback={(
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" role="status" aria-label="Chargement" />
        </div>
      )}>
        {viewMode === 'list' && (
          <TaskListView
            memos={memos} addMemo={addMemo} updateMemo={updateMemo} deleteMemo={deleteMemo} toggleMemo={toggleMemo}
            chantiers={chantiers} clients={clients} isDark={isDark} couleur={couleur} filters={filters}
            selectedMemoId={selectedMemoId} onSelectMemo={setSelectedMemoId} setPage={setPage}
          />
        )}
        {viewMode === 'kanban' && (
          <TaskKanbanView
            memos={memos} updateMemo={updateMemo} addMemo={addMemo} deleteMemo={deleteMemo} toggleMemo={toggleMemo}
            chantiers={chantiers} clients={clients} isDark={isDark} couleur={couleur} filters={filters}
            selectedMemoId={selectedMemoId} onSelectMemo={setSelectedMemoId}
          />
        )}
        {viewMode === 'gantt' && (
          <TaskGanttView
            memos={memos} updateMemo={updateMemo} chantiers={chantiers} clients={clients} isDark={isDark} couleur={couleur}
            filters={filters} onSelectMemo={setSelectedMemoId}
          />
        )}
        {viewMode === 'team' && (
          <TaskTeamView
            memos={memos} updateMemo={updateMemo} deleteMemo={deleteMemo} equipe={equipe} chantiers={chantiers} clients={clients}
            isDark={isDark} couleur={couleur} filters={filters} selectedMemoId={selectedMemoId} onSelectMemo={setSelectedMemoId}
          />
        )}
        {viewMode === 'calendar' && (
          <TaskCalendarView
            events={events} setEvents={setEvents} addEvent={addEvent} updateEvent={updateEvent} deleteEvent={deleteEvent}
            memos={memos} toggleMemo={toggleMemo} updateMemo={updateMemo} chantiers={chantiers} clients={clients} equipe={equipe} devis={devis}
            setPage={setPage} setSelectedChantier={setSelectedChantier} updateChantier={updateChantier}
            couleur={couleur} isDark={isDark} prefill={prefill} clearPrefill={clearPrefill} demandeAjout={demandeAjout}
          />
        )}
      </Suspense>
    </div>
  );
}
