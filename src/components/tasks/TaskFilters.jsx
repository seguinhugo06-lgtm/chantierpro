import { useRef, useState } from 'react';
import { ChampRecherche, BoutonVolet, Volet, GroupeChoix, ListeChoix, PucesActives } from '../ui/Filtres';
import { CATEGORIES, PRIORITIES, TASK_STATUSES } from './constants';

// ════════════════════════════════════════════════════════
// TaskFilters — recherche + volet « Filtres » (catégorie, priorité, statut, membre).
// Quatre listes déroulantes natives remplacées par la boîte à outils commune (ui/Filtres.jsx, 9 oct. 2026).
// ════════════════════════════════════════════════════════
export default function TaskFilters({ filters, onFiltersChange, equipe = [], isDark, couleur }) {
  const { search = '', category = '', priority = '', status = '', assignedTo = '' } = filters;
  const [ouvert, setOuvert] = useState(false);
  const ancreRef = useRef(null);

  const update = (key, value) => onFiltersChange({ ...filters, [key]: value });
  const nbFiltres = !!category + !!priority + !!status + !!assignedTo;
  const toutEffacer = () => onFiltersChange({ ...filters, category: '', priority: '', status: '', assignedTo: '' });
  const libelle = (liste, valeur) => liste.find((x) => x.value === valeur)?.label;
  const membre = equipe.find((m) => m.id === assignedTo);

  const puces = [
    category && { cle: 'categorie', libelle: libelle(CATEGORIES, category), onRetirer: () => update('category', '') },
    priority && { cle: 'priorite', libelle: `Priorité ${(libelle(PRIORITIES, priority) || '').toLowerCase()}`, onRetirer: () => update('priority', '') },
    status && { cle: 'statut', libelle: libelle(TASK_STATUSES, status), onRetirer: () => update('status', '') },
    assignedTo && { cle: 'membre', libelle: membre ? `${membre.prenom || ''} ${membre.nom || ''}`.trim() : 'Membre', onRetirer: () => update('assignedTo', '') },
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ChampRecherche
          valeur={search} onChange={(v) => update('search', v)} placeholder="Rechercher une tâche…"
          ariaLabel="Rechercher (texte, notes, client, chantier)" isDark={isDark} couleur={couleur} className="flex-1"
        />
        <BoutonVolet ref={ancreRef} libelle="Filtres" compte={nbFiltres} ouvert={ouvert} onClick={() => setOuvert((o) => !o)} isDark={isDark} couleur={couleur} libelleCacheTelephone />
      </div>
      <PucesActives puces={puces} onToutEffacer={toutEffacer} isDark={isDark} couleur={couleur} />

      <Volet
        ouvert={ouvert} onFermer={() => setOuvert(false)} titre="Filtrer les tâches" ancreRef={ancreRef} largeur={360} isDark={isDark}
        pied={(
          <>
            <button type="button" onClick={toutEffacer} disabled={!nbFiltres} className={`h-11 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}>Tout effacer</button>
            <button type="button" onClick={() => setOuvert(false)} className="flex-1 h-11 rounded-xl text-white text-sm font-bold shadow-sm" style={{ background: couleur }}>Afficher les tâches</button>
          </>
        )}
      >
        <GroupeChoix titre="Catégorie" options={[{ valeur: '', libelle: 'Toutes' }, ...CATEGORIES.map((c) => ({ valeur: c.value, libelle: c.label }))]} valeur={category} onChange={(v) => update('category', v)} isDark={isDark} couleur={couleur} />
        <GroupeChoix titre="Priorité" options={[{ valeur: '', libelle: 'Toutes' }, ...PRIORITIES.map((p) => ({ valeur: p.value, libelle: `${p.dot} ${p.label}` }))]} valeur={priority} onChange={(v) => update('priority', v)} isDark={isDark} couleur={couleur} />
        <GroupeChoix titre="Statut" options={[{ valeur: '', libelle: 'Tous' }, ...TASK_STATUSES.map((s) => ({ valeur: s.value, libelle: s.label }))]} valeur={status} onChange={(v) => update('status', v)} isDark={isDark} couleur={couleur} />
        {equipe.length > 0 && (
          <ListeChoix
            titre="Membre" placeholder="Rechercher un membre" isDark={isDark} couleur={couleur}
            options={[{ valeur: '', libelle: 'Tout le monde', toujours: true }, ...equipe.map((m) => ({ valeur: m.id, libelle: `${m.prenom || ''} ${m.nom || ''}`.trim() || 'Sans nom' }))]}
            valeur={assignedTo} onChange={(v) => update('assignedTo', v)}
          />
        )}
      </Volet>
    </div>
  );
}
