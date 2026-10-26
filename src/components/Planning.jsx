import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, CalendarDays, CalendarCheck, Clock, User, X, Edit3, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Bell, Home, Briefcase, Phone, RefreshCw, Zap, ClipboardList, Building2, Tag, ListChecks, CheckCircle2, Settings2 } from 'lucide-react';
import { useConfirm, useToast } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';
import { Bouton, BoutonIcone } from './ui/Bouton';
import Carte from './ui/Carte';
import Champ from './ui/Champ';
import EtatVide from './ui/EtatVide';
import { PastilleStatut } from './ui/Pastille';
import { Segmente } from './ui/Onglets';
import { BoutonVolet, Volet, GroupeChoix, ListeChoix, PucesActives, useEstTelephone } from './ui/Filtres';
import { PRIORITIES, CATEGORIES, classesTon } from './tasks/constants';
import { developperRecurrences } from '../lib/evenementsPlanning';
import { dateLue, jourLocal } from '../lib/dates';

const DURATIONS = [
  { label: '30min', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '4h', value: 240 },
  { label: 'Journée', value: 480 },
  { label: 'Perso', value: -1 }, // durée libre : l'heure de fin
];

const formatDuration = (mins) => {
  if (!mins) return '';
  if (mins >= 480) return 'Journée';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m}min`;
};

// Arrondit l'heure courante à la prochaine demi-heure
const getNextHalfHour = () => {
  const now = new Date();
  const mins = now.getMinutes();
  if (mins <= 30) return `${String(now.getHours()).padStart(2, '0')}:30`;
  const next = new Date(now.getTime() + (60 - mins) * 60000);
  return `${String(next.getHours()).padStart(2, '0')}:00`;
};

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const TYPE_LABELS = { chantier: 'Chantier', rdv: 'RDV Client', relance: 'Relance', urgence: 'Urgence', memo: 'Tâche', autre: 'Autre', deadline: 'Échéance' };
const TYPE_ICONS = { chantier: Home, rdv: User, relance: Phone, urgence: Zap, memo: ClipboardList, autre: Calendar, deadline: CalendarCheck };

/**
 * Un type d'événement = un ton, comme partout (src/lib/statuts.js) : le rendez-vous client est à l'accent, l'urgence en ambre,
 * le reste en tons doux ; le rouge est réservé à une échéance de facture dépassée (un retard). Avant : sept couleurs en dur par
 * type (vert, orange, violet…) et des pastilles bleues répétées chaque jour. Classes écrites en entier pour Tailwind.
 */
const STYLES = {
  plein: { pastille: 'bg-accent text-sur-accent', point: 'bg-accent', bord: 'border-l-accent' },
  neutre: { pastille: 'bg-neutre-fond text-neutre-texte', point: 'bg-neutre-point', bord: 'border-l-neutre-point' },
  info: { pastille: 'bg-info-fond text-info-texte', point: 'bg-info-point', bord: 'border-l-info-point' },
  alerte: { pastille: 'bg-alerte-fond text-alerte-texte', point: 'bg-alerte-point', bord: 'border-l-alerte-point' },
  danger: { pastille: 'bg-danger-fond text-danger-texte', point: 'bg-danger-point', bord: 'border-l-danger-point' },
};
const TON_DU_TYPE = { rdv: 'plein', relance: 'info', urgence: 'alerte', memo: 'neutre', autre: 'neutre', deadline: 'neutre', chantier: 'info' };
const styleDe = (ev) => STYLES[ev.ton || TON_DU_TYPE[ev.type] || 'neutre'];

const FORMULAIRE_VIDE = { title: '', date: '', time: '', endTime: '', type: 'rdv', employeId: '', clientId: '', chantierId: '', description: '', duration: 60, recurrence: 'never', recurrenceEnd: '', recurrenceDays: [], recurrenceOccurrences: '', recurrenceEndType: 'date', dateEnd: '', rappel: '' };

/** Les champs d'un événement, communs à la création et à la modification (avant : deux copies, qui n'avaient pas les mêmes champs). */
function ChampsEvenement({ form, setForm, equipe, clients, chantiers }) {
  const chantiersProposes = (chantiers || []).filter((ch) => ch.statut !== 'termine' && (!form.clientId || ch.client_id === form.clientId));
  const duree = (d) => {
    if (d.value === 480) setForm((p) => ({ ...p, duration: 480, time: '', endTime: '' }));
    else if (d.value === -1) setForm((p) => ({ ...p, duration: -1 }));
    else setForm((p) => ({ ...p, duration: d.value, endTime: '' }));
  };
  const diff = form.time && form.endTime
    ? (Number(form.endTime.split(':')[0]) * 60 + Number(form.endTime.split(':')[1])) - (Number(form.time.split(':')[0]) * 60 + Number(form.time.split(':')[1]))
    : 0;
  const pastille = (actif) => `min-h-[44px] px-3.5 rounded-full text-sm font-medium transition-colors border ${actif ? 'bg-accent text-sur-accent border-accent' : 'bg-surface text-encre border-bord hover:bg-surface-2'}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-encre-2">Type</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Type d'événement">
          {Object.entries(TYPE_LABELS).map(([cle, libelle]) => {
            const Icone = TYPE_ICONS[cle];
            return (
              <button key={cle} type="button" aria-pressed={form.type === cle} onClick={() => setForm((p) => ({ ...p, type: cle }))} className={`${pastille(form.type === cle)} inline-flex items-center gap-1.5`}>
                <Icone size={14} aria-hidden="true" /> {libelle}
              </button>
            );
          })}
        </div>
      </div>
      <Champ libelle="Titre" placeholder="Ex: RDV devis M. Dupont" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
      <div className="grid grid-cols-2 gap-3">
        <Champ libelle="Date" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
        <Champ libelle="Heure" facultatif type="time" value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))} />
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-encre-2">Durée</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Durée">
          {DURATIONS.map((d) => (
            <button key={d.value} type="button" aria-pressed={form.duration === d.value} onClick={() => duree(d)} className={pastille(form.duration === d.value)}>{d.label}</button>
          ))}
        </div>
        {form.duration === -1 && (
          <div className="mt-3 flex items-end gap-3">
            <Champ className="flex-1" libelle="Heure de fin" type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
            {diff > 0 && <span className="pb-3 text-sm font-medium text-encre-2">{formatDuration(diff)}</span>}
          </div>
        )}
      </div>
      <div className={`grid ${form.recurrence !== 'never' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
        <Champ as="select" libelle="Récurrence" value={form.recurrence} onChange={(e) => setForm((p) => ({ ...p, recurrence: e.target.value }))}>
          <option value="never">Jamais</option>
          <option value="daily">Chaque jour</option>
          <option value="weekly">Chaque semaine</option>
          <option value="biweekly">Toutes les 2 sem.</option>
          <option value="monthly">Chaque mois</option>
          <option value="custom">Personnalisé</option>
        </Champ>
        {form.recurrence !== 'never' && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-encre-2">Fin de la série</p>
            <Segmente
              ariaLabel="Fin de la série" pleineLargeur className="mb-2" valeur={form.recurrenceEndType === 'count' ? 'count' : 'date'}
              onChange={(v) => setForm((p) => ({ ...p, recurrenceEndType: v }))} options={[{ valeur: 'date', libelle: 'Date' }, { valeur: 'count', libelle: 'N fois' }]}
            />
            {form.recurrenceEndType === 'count'
              ? <input type="number" min="1" max="365" placeholder="12" aria-label="Nombre d'occurrences" className="w-full h-12 px-3.5 rounded-xl border border-bord-fort bg-surface text-base text-encre" value={form.recurrenceOccurrences} onChange={(e) => setForm((p) => ({ ...p, recurrenceOccurrences: e.target.value }))} />
              : <input type="date" aria-label="Date de fin de la série" className="w-full h-12 px-3.5 rounded-xl border border-bord-fort bg-surface text-base text-encre" value={form.recurrenceEnd} onChange={(e) => setForm((p) => ({ ...p, recurrenceEnd: e.target.value }))} />}
          </div>
        )}
      </div>
      {form.recurrence === 'custom' && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-encre-2">Jours</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jours de la semaine">
            {JOURS.map((j, i) => {
              const choisi = (form.recurrenceDays || []).includes(i);
              return (
                <button
                  key={j} type="button" aria-pressed={choisi}
                  onClick={() => setForm((p) => ({ ...p, recurrenceDays: choisi ? p.recurrenceDays.filter((d) => d !== i) : [...(p.recurrenceDays || []), i] }))}
                  className={`min-w-[44px] min-h-[44px] rounded-full text-sm font-semibold transition-colors border ${choisi ? 'bg-accent text-sur-accent border-accent' : 'bg-surface text-encre border-bord'}`}
                >
                  {j}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Champ as="select" libelle="Assigner à" value={form.employeId} onChange={(e) => setForm((p) => ({ ...p, employeId: e.target.value }))}>
          <option value="">Moi</option>
          {equipe.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </Champ>
        {clients.length > 0 && (
          <Champ as="select" libelle="Client" facultatif value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value, chantierId: '' }))}>
            <option value="">—</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.nom} {c.prenom || ''}</option>)}
          </Champ>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Champ libelle="Date de fin" facultatif type="date" min={form.date} value={form.dateEnd} onChange={(e) => setForm((p) => ({ ...p, dateEnd: e.target.value }))} />
        <Champ as="select" libelle="Rappel" facultatif value={form.rappel} onChange={(e) => setForm((p) => ({ ...p, rappel: e.target.value }))}>
          <option value="">Aucun</option>
          <option value="15">15 min</option>
          <option value="30">30 min</option>
          <option value="60">1h</option>
          <option value="1440">Veille</option>
          <option value="2880">2 jours</option>
        </Champ>
      </div>
      {(form.type === 'chantier' || form.clientId) && chantiersProposes.length > 0 && (
        <Champ as="select" libelle="Chantier" facultatif value={form.chantierId} onChange={(e) => setForm((p) => ({ ...p, chantierId: e.target.value }))}>
          <option value="">—</option>
          {chantiersProposes.map((ch) => {
            const cl = clients.find((c) => c.id === ch.client_id);
            return <option key={ch.id} value={ch.id}>{ch.nom}{cl ? ` — ${cl.nom}` : ''}</option>;
          })}
        </Champ>
      )}
      <Champ as="textarea" libelle="Notes" facultatif rows={2} placeholder="Adresse, infos..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
    </div>
  );
}

/** Les chantiers de la période, sur une ligne dépliable : le calendrier ne montre plus que les rendez-vous (audit UX du 20 oct. 2026). */
function BandeauChantiers({ chantiers, onOuvrir }) {
  const [ouvert, setOuvert] = useState(false);
  if (chantiers.length === 0) return null;
  return (
    <div className="bg-surface border border-bord rounded-2xl shadow-e1 overflow-hidden">
      <button type="button" onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} className="w-full min-h-[52px] px-4 flex items-center gap-2 text-left">
        <Home size={16} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
        <span className="text-base font-semibold text-encre truncate">{chantiers.length} chantier{chantiers.length > 1 ? 's' : ''} sur la période</span>
        <span className="ml-auto flex items-center gap-1 flex-shrink-0 text-sm font-semibold text-accent-texte">
          {ouvert ? 'Réduire' : 'Voir'}
          {ouvert ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
        </span>
      </button>
      {ouvert && (
        <ul className="border-t border-bord divide-y divide-bord">
          {chantiers.map((ch) => (
            <li key={ch.id}>
              <button type="button" onClick={() => onOuvrir(ch.chantierId)} className="w-full min-h-[56px] px-4 py-2 flex items-center justify-between gap-3 text-left hover:bg-surface-2">
                <span className="min-w-0">
                  <span className="block text-base font-semibold truncate text-encre">{ch.title}</span>
                  <span className="block text-sm text-encre-3">
                    {dateLue(ch.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{ch.dateEnd ? ` → ${dateLue(ch.dateEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}
                  </span>
                </span>
                <PastilleStatut genre="chantier" statut={ch.statut} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Planning({
  events, setEvents, addEvent, updateEvent: updateEventProp, deleteEvent: deleteEventProp, chantiers, clients = [], equipe, memos = [], toggleMemo, updateMemo,
  setPage, setSelectedChantier, updateChantier: _updateChantier, isDark, prefill, clearPrefill, devis = [], demandeAjout,
}) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const telephone = useEstTelephone();

  // Droits
  const { canPerform } = usePermissions();
  const peutCreer = canPerform('planning', 'create');
  const peutModifier = canPerform('planning', 'edit');
  const peutSupprimer = canPerform('planning', 'delete');
  const peutTerminer = canPerform('memo', 'edit');

  const [date, setDate] = useState(new Date());
  // Agenda par défaut au téléphone (une liste se lit d'une main), mois au bureau
  const [viewMode, setViewMode] = useState(() => (window.innerWidth < 640 ? 'agenda' : 'month'));
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [filterEmploye, setFilterEmploye] = useState(() => { try { return localStorage.getItem('cp_planning_filter_employe') || ''; } catch { return ''; } });
  const [filterType, setFilterType] = useState('');
  const [voletOuvert, setVoletOuvert] = useState(null); // null | 'filtres' | 'horaires'
  const boutonFiltresRef = useRef(null);
  const boutonHorairesRef = useRef(null);
  const [showTips, setShowTips] = useState(() => { try { return !localStorage.getItem('cp_planning_tips_dismissed'); } catch { return true; } });
  const [mobileWeekDay, setMobileWeekDay] = useState(0);
  const [agendaRange, setAgendaRange] = useState(30);
  const [agendaHideEmpty, setAgendaHideEmpty] = useState(true);
  const [workHourStart, setWorkHourStart] = useState(() => { try { return parseInt(localStorage.getItem('cp_planning_hour_start')) || 7; } catch { return 7; } });
  const [workHourEnd, setWorkHourEnd] = useState(() => { try { return parseInt(localStorage.getItem('cp_planning_hour_end')) || 20; } catch { return 20; } });
  const [journeeDepliee, setJourneeDepliee] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const weekGridRef = useRef(null);
  const [form, setForm] = useState(FORMULAIRE_VIDE);

  const formatLocalDate = jourLocal;

  // Le collaborateur filtré est gardé d'une visite à l'autre
  useEffect(() => {
    try { localStorage.setItem('cp_planning_filter_employe', filterEmploye); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
  }, [filterEmploye]);

  const fermerAjout = () => { setShowAdd(false); setForm(FORMULAIRE_VIDE); };
  const fermerDetail = () => { setShowDetail(null); setEditMode(false); setForm(FORMULAIRE_VIDE); };
  const ouvrirAjout = (jour, heure) => {
    setForm({ ...FORMULAIRE_VIDE, date: jour || formatLocalDate(new Date()), time: heure || getNextHalfHour() });
    setShowAdd(true);
  };

  // Création demandée depuis l'en-tête de la page (« Événement ») : un compteur qui change = une demande
  const derniereDemande = useRef(demandeAjout || 0);
  useEffect(() => {
    if (demandeAjout && demandeAjout !== derniereDemande.current && peutCreer) ouvrirAjout();
    derniereDemande.current = demandeAjout || 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandeAjout]);

  // Création pré-remplie venue d'ailleurs (fiche chantier → « Planifier une intervention »)
  useEffect(() => {
    if (prefill) {
      setForm({ ...FORMULAIRE_VIDE, ...prefill });
      setShowAdd(true);
      clearPrefill?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const weekDays = (() => {
    const debut = new Date(date);
    const jour = debut.getDay();
    debut.setDate(debut.getDate() - jour + (jour === 0 ? -6 : 1));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(debut); d.setDate(debut.getDate() + i); return d; });
  })();

  // Fait défiler la grille de la semaine vers l'heure courante
  useEffect(() => {
    if (viewMode === 'week' && weekGridRef.current) {
      const now = new Date();
      const scrollTo = Math.max(0, ((now.getHours() - 7) * 60 + now.getMinutes()) - 60);
      setTimeout(() => weekGridRef.current?.scrollTo({ top: scrollTo, behavior: 'smooth' }), 100);
    }
  }, [viewMode]);

  // Semaine suivante : on retombe sur aujourd'hui si la semaine le contient
  useEffect(() => {
    const idx = weekDays.findIndex((d) => formatLocalDate(d) === formatLocalDate(new Date()));
    if (idx >= 0) setMobileWeekDay(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // ── Les événements : saisis (et leurs récurrences), tâches datées, échéances de documents ; les chantiers à part ──
  const evenementsChantier = useMemo(() => chantiers.filter((ch) => ch.date_debut).map((ch) => ({
    id: `ch_${ch.id}`, title: ch.nom, date: ch.date_debut, dateEnd: ch.date_fin, type: 'chantier', chantierId: ch.id, statut: ch.statut, isChantier: true, description: ch.adresse || '',
  })), [chantiers]);
  const evenementsTaches = useMemo(() => memos.filter((m) => m.due_date && !m.is_done).map((m) => ({
    id: `memo_${m.id}`, memoId: m.id, title: m.text?.substring(0, 50) || 'Tâche', date: m.due_date, time: m.due_time || '', type: 'memo', isMemo: true, description: m.notes || '',
    priority: m.priority || '', category: m.category || '', subtasks: m.subtasks || [], chantier_id: m.chantier_id || '', is_done: m.is_done || false, fullText: m.text || '',
  })), [memos]);
  // Échéances de documents : le devis à valider, la facture à encaisser (rouge seulement si l'échéance est passée)
  const evenementsDocuments = useMemo(() => {
    const liste = [];
    const nomClient = (d) => { const c = clients.find((x) => x.id === d.client_id); return c ? `${c.prenom || ''} ${c.nom || ''}`.trim() : ''; };
    devis.forEach((d) => {
      if (d.type === 'devis' && d.date_validite && ['envoye', 'vu'].includes(d.statut)) {
        liste.push({ id: `devis_${d.id}`, title: `Devis ${d.numero || ''} ${nomClient(d)}`.trim(), date: d.date_validite, type: 'deadline', isDeadline: true, ton: 'neutre', description: `Échéance devis — ${d.total_ttc ? d.total_ttc.toLocaleString('fr-FR') + ' €' : ''}`, devisId: d.id });
      }
      if (d.type === 'facture' && d.date_echeance && d.statut === 'envoye') {
        const enRetard = String(d.date_echeance).slice(0, 10) < jourLocal(); // échéance du jour : pas en retard
        liste.push({ id: `facture_${d.id}`, title: `Facture ${d.numero || ''} ${nomClient(d)}`.trim(), date: d.date_echeance, type: 'deadline', isDeadline: true, ton: enRetard ? 'danger' : 'neutre', description: `Échéance facture — ${d.total_ttc ? d.total_ttc.toLocaleString('fr-FR') + ' €' : ''}`, devisId: d.id });
      }
    });
    return liste;
  }, [devis, clients]);
  const allEvents = useMemo(() => [...developperRecurrences(events), ...evenementsTaches, ...evenementsDocuments], [events, evenementsTaches, evenementsDocuments]);

  const passeFiltres = (e) => {
    if (filterEmploye === '__me__') { if (e.employeId) return false; } else if (filterEmploye && e.employeId !== filterEmploye) return false;
    if (filterType && e.type !== filterType) return false;
    return true;
  };
  const getEventsForDay = (jour) => {
    if (!jour) return [];
    const d = typeof jour === 'string' ? jour : `${year}-${String(month + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
    return allEvents.filter((e) => passeFiltres(e) && (e.dateEnd ? d >= e.date && d <= e.dateEnd : e.date === d));
  };
  const getEventsForDate = (dateObj) => getEventsForDay(formatLocalDate(dateObj));
  const hasActiveFilter = !!(filterEmploye || filterType);
  const isAllDayEvent = (ev) => !ev.time || ev.duration >= 480 || (ev.dateEnd && ev.dateEnd !== ev.date);

  // Les chantiers de la période affichée (mois, semaine, jour ou les prochains jours de l'agenda)
  const periode = (() => {
    if (viewMode === 'month') return [`${year}-${String(month + 1).padStart(2, '0')}-01`, `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`];
    if (viewMode === 'week') return [formatLocalDate(weekDays[0]), formatLocalDate(weekDays[6])];
    if (viewMode === 'day') return [formatLocalDate(date), formatLocalDate(date)];
    const fin = new Date(); fin.setDate(fin.getDate() + agendaRange);
    return [formatLocalDate(new Date()), formatLocalDate(fin)];
  })();
  const chantiersPeriode = evenementsChantier
    .filter((c) => c.date <= periode[1] && (c.dateEnd || c.date) >= periode[0] && c.statut !== 'archive')
    .sort((a, b) => (a.statut === b.statut ? a.date.localeCompare(b.date) : ({ en_cours: 0, prospect: 1 }[a.statut] ?? 2) - ({ en_cours: 0, prospect: 1 }[b.statut] ?? 2)));

  const goToChantier = (chantierId) => { if (setSelectedChantier && setPage) { setSelectedChantier(chantierId); setPage('chantiers'); } };
  const goToToday = () => setDate(new Date());
  const handleEventClick = (e, ev) => { e?.stopPropagation(); setShowDetail(ev); setEditMode(false); };

  // Seuls les rendez-vous saisis se déplacent ici : un chantier, une tâche, une échéance de document ou une occurrence de série
  // se change depuis sa fiche (recette du 9 oct. 2026)
  const moveEvent = (eventId, newDate) => {
    const ev = allEvents.find((e) => e.id === eventId);
    if (!ev || ev.isChantier || ev.isMemo || ev.isDeadline || ev.isRecurrence || !peutModifier) return;
    if (updateEventProp) updateEventProp(eventId, { date: newDate });
    else setEvents(events.map((e) => (e.id === eventId ? { ...e, date: newDate } : e)));
  };

  // « Perso » : la durée vient de l'heure de fin
  const avecDuree = (saisie) => {
    const data = { ...saisie };
    if (data.duration === -1 && data.time && data.endTime) {
      const [sh, sm] = data.time.split(':').map(Number);
      const [eh, em] = data.endTime.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      data.duration = diff > 0 ? diff : 60;
    } else if (data.duration === -1) data.duration = 60;
    return data;
  };

  const submit = async () => {
    if (enregistrement) return;
    if (!form.title || !form.date) {
      showToast(!form.title ? 'Donnez un titre à l\'événement' : 'Choisissez une date', 'error');
      return;
    }
    setEnregistrement(true);
    try {
      const cree = await addEvent(avecDuree(form));
      if (!cree) return; // refus : le formulaire reste ouvert, DataContext a dit pourquoi
      fermerAjout();
    } finally {
      setEnregistrement(false);
    }
  };

  // Chantiers, tâches et échéances de devis / factures sont affichés ici mais vivent ailleurs
  const estCalcule = (id) => /^(ch|memo|devis|facture)_/.test(String(id));
  const handleDeleteEvent = async (id) => {
    if (estCalcule(id)) {
      showToast('Cet élément se modifie depuis sa fiche (chantier, tâche, devis ou facture)', 'info');
      return;
    }
    // Pour une occurrence de série, c'est la série entière qui est supprimée
    const ev = allEvents.find((e) => e.id === id);
    const realId = ev?.isRecurrence ? ev.originalId : id;
    const confirme = await confirm({ title: 'Supprimer', message: ev?.isRecurrence ? 'Supprimer toute la série récurrente ?' : 'Supprimer cet événement ?' });
    if (!confirme) return;
    if (deleteEventProp) { if (!(await deleteEventProp(realId))) return; } else setEvents(events.filter((e) => e.id !== realId));
    fermerDetail();
  };

  const handleUpdateEvent = async () => {
    if (!showDetail || showDetail.isChantier || enregistrement) return;
    if (estCalcule(showDetail.id)) {
      showToast('Cet élément se modifie depuis sa fiche (chantier, tâche, devis ou facture)', 'info');
      return;
    }
    const realId = showDetail.isRecurrence ? showDetail.originalId : showDetail.id;
    setEnregistrement(true);
    try {
      if (updateEventProp) { if (!(await updateEventProp(realId, avecDuree(form)))) return; } else setEvents(events.map((e) => (e.id === realId ? { ...e, ...avecDuree(form) } : e)));
      fermerDetail();
      showToast('Événement mis à jour', 'success');
    } finally {
      setEnregistrement(false);
    }
  };

  const startEdit = () => {
    const origine = showDetail.isRecurrence ? (events.find((e) => e.id === showDetail.originalId) || showDetail) : showDetail;
    setForm({
      ...FORMULAIRE_VIDE, title: showDetail.title || '', date: origine.date || showDetail.date || '', time: showDetail.time || '', endTime: showDetail.endTime || '',
      type: showDetail.type || 'rdv', employeId: showDetail.employeId || '', clientId: showDetail.clientId || '', chantierId: showDetail.chantierId || '',
      description: showDetail.description || '', duration: showDetail.duration || 60, recurrence: origine.recurrence || 'never', recurrenceEnd: origine.recurrenceEnd || '',
      recurrenceEndType: origine.recurrenceEndType || 'date', recurrenceOccurrences: origine.recurrenceOccurrences || '', recurrenceDays: origine.recurrenceDays || [],
      dateEnd: showDetail.dateEnd || '', rappel: showDetail.rappel || '',
    });
    setEditMode(true);
  };

  const todayStr = formatLocalDate(new Date());
  const titrePeriode = viewMode === 'month' ? `${MOIS[month]} ${year}`
    : viewMode === 'day' ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : viewMode === 'agenda' ? 'À venir'
        : `Semaine du ${weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  const pas = (sens) => setDate(viewMode === 'month' ? new Date(year, month + sens) : viewMode === 'day' ? new Date(date.getTime() + sens * 86400000) : new Date(date.getTime() + sens * 7 * 86400000));

  const pucesFiltres = [
    filterEmploye && { cle: 'personne', libelle: filterEmploye === '__me__' ? 'Moi' : (equipe.find((e) => e.id === filterEmploye)?.nom || 'Personne'), onRetirer: () => setFilterEmploye('') },
    filterType && { cle: 'type', libelle: TYPE_LABELS[filterType], onRetirer: () => setFilterType('') },
  ].filter(Boolean);
  const effacerFiltres = () => { setFilterType(''); setFilterEmploye(''); };
  const videFiltre = (
    <EtatVide
      icone={CalendarDays} titre="Aucun événement pour ce filtre" className="py-8"
      action={<Bouton variante="secondaire" onClick={effacerFiltres}>Effacer les filtres</Bouton>}
    />
  );
  const actionCreer = peutCreer ? <Bouton variante="secondaire" onClick={() => ouvrirAjout()}>Créer un événement</Bouton> : null;
  const memoChantier = (m) => (chantiers || []).find((c) => c.id === m);

  return (
    <div className="space-y-4 animate-page-enter">
      {/* Une seule barre : la vue, aujourd'hui, les filtres, les horaires (avant : quatre rangées et trois « + ») */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmente
          ariaLabel="Affichage du planning" valeur={viewMode} className="w-full sm:w-auto" pleineLargeur={telephone}
          onChange={(v) => { if (v === 'week' || v === 'day') { const t = new Date(); if (date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear()) setDate(t); } setViewMode(v); }}
          options={[{ valeur: 'month', libelle: 'Mois' }, { valeur: 'week', libelle: 'Semaine' }, { valeur: 'day', libelle: 'Jour' }, { valeur: 'agenda', libelle: 'Agenda' }]}
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <Bouton variante="secondaire" onClick={goToToday} aria-label="Aujourd'hui">Aujourd'hui</Bouton>
          <BoutonVolet ref={boutonFiltresRef} libelle="Filtres" compte={pucesFiltres.length} ouvert={voletOuvert === 'filtres'} onClick={() => setVoletOuvert((v) => (v === 'filtres' ? null : 'filtres'))} isDark={isDark} libelleCacheTelephone />
          <BoutonIcone ref={boutonHorairesRef} icone={Settings2} libelle="Horaires de travail" variante="secondaire" aria-haspopup="dialog" aria-expanded={voletOuvert === 'horaires'} onClick={() => setVoletOuvert((v) => (v === 'horaires' ? null : 'horaires'))} />
        </div>
      </div>
      <PucesActives puces={pucesFiltres} onToutEffacer={effacerFiltres} isDark={isDark} />

      <Volet ouvert={voletOuvert === 'filtres'} onFermer={() => setVoletOuvert(null)} titre="Filtrer le planning" ancreRef={boutonFiltresRef} largeur={340} isDark={isDark}
        pied={<Bouton variante="principal" pleineLargeur onClick={() => setVoletOuvert(null)}>Voir le planning</Bouton>}>
        <ListeChoix
          titre="Personne" isDark={isDark} valeur={filterEmploye} onChange={setFilterEmploye}
          options={[{ valeur: '', libelle: 'Tout le monde', toujours: true }, { valeur: '__me__', libelle: 'Moi', toujours: true }, ...equipe.map((e) => ({ valeur: e.id, libelle: e.nom }))]}
        />
        <GroupeChoix
          titre="Type" isDark={isDark} valeur={filterType} onChange={setFilterType}
          options={[{ valeur: '', libelle: 'Tous les types' }, ...Object.entries(TYPE_LABELS).map(([valeur, libelle]) => ({ valeur, libelle }))]}
        />
      </Volet>
      <Volet ouvert={voletOuvert === 'horaires'} onFermer={() => setVoletOuvert(null)} titre="Horaires de travail" ancreRef={boutonHorairesRef} largeur={300} isDark={isDark}>
        <div className="space-y-4">
          <Champ as="select" libelle="Heure de début" value={workHourStart} onChange={(e) => { const v = parseInt(e.target.value); setWorkHourStart(v); try { localStorage.setItem('cp_planning_hour_start', String(v)); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } }}>
            {Array.from({ length: 8 }, (_, i) => i + 5).map((h) => <option key={h} value={h}>{h}h00</option>)}
          </Champ>
          <Champ as="select" libelle="Heure de fin" value={workHourEnd} onChange={(e) => { const v = parseInt(e.target.value); setWorkHourEnd(v); try { localStorage.setItem('cp_planning_hour_end', String(v)); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } }}>
            {Array.from({ length: 10 }, (_, i) => i + 14).map((h) => <option key={h} value={h}>{h}h00</option>)}
          </Champ>
        </div>
      </Volet>

      <BandeauChantiers chantiers={chantiersPeriode} onOuvrir={goToChantier} />

      <Carte marge="aucun" className="overflow-hidden">
        <div className="flex items-center justify-between px-2 sm:px-4 py-1 border-b border-bord">
          {viewMode !== 'agenda' ? <BoutonIcone icone={ChevronLeft} libelle="Période précédente" onClick={() => pas(-1)} /> : <div className="w-11" />}
          <h2 className="text-base sm:text-lg font-bold text-encre first-letter:uppercase">{titrePeriode}</h2>
          {viewMode !== 'agenda' ? <BoutonIcone icone={ChevronRight} libelle="Période suivante" onClick={() => pas(1)} /> : <div className="w-11" />}
        </div>

        {viewMode === 'month' ? (
          <>
            <div className="grid grid-cols-7 border-b border-bord">
              {JOURS.map((j) => <div key={j} className="py-1.5 text-center text-xs font-medium text-encre-3">{j}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dayEvents = [...(day ? getEventsForDay(day) : [])].sort((a, b) => {
                  const ta = isAllDayEvent(a) ? 0 : 1;
                  const tb = isAllDayEvent(b) ? 0 : 1;
                  return ta !== tb ? ta - tb : (a.time || '').localeCompare(b.time || '');
                });
                const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                const isToday = dateStr === todayStr;
                const max = telephone ? 2 : 3;
                return (
                  <div
                    key={i} className={`min-h-[68px] sm:min-h-[88px] p-0.5 sm:p-1.5 border-r border-b border-bord ${!day ? 'bg-surface-2' : ''} ${day && peutCreer ? 'cursor-pointer' : ''}`}
                    role={day && peutCreer ? 'button' : undefined} tabIndex={day && peutCreer ? 0 : undefined}
                    aria-label={day && peutCreer ? `Ajouter un événement le ${day} ${MOIS[month]} ${year}` : undefined}
                    onKeyDown={day && peutCreer ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrirAjout(dateStr); } } : undefined}
                    onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('eventId'); if (id && dateStr) moveEvent(id, dateStr); }}
                    onClick={() => day && peutCreer && ouvrirAjout(dateStr)}
                  >
                    {day && (
                      <>
                        <p className={`mb-0.5 text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-accent text-sur-accent' : 'text-encre'}`}>{day}</p>
                        <div className="space-y-px">
                          {dayEvents.slice(0, max).map((ev) => (
                            <div
                              key={ev.id} onClick={(e) => handleEventClick(e, ev)} role="button" tabIndex={0}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleEventClick(e, ev); }}
                              draggable={peutModifier && !ev.isMemo && !ev.isDeadline && !ev.isRecurrence} onDragStart={(e) => e.dataTransfer.setData('eventId', ev.id)}
                              title={ev.title} aria-label={`${ev.title} — ${TYPE_LABELS[ev.type] || 'Événement'}${ev.time ? ` à ${ev.time}` : ''}`}
                              className={`text-xs px-1 sm:px-1.5 py-0.5 rounded cursor-pointer hover:brightness-95 transition-all flex items-center gap-0.5 leading-tight ${styleDe(ev).pastille}`}
                            >
                              {!isAllDayEvent(ev) && ev.time && <span className="opacity-80 hidden sm:inline flex-shrink-0">{ev.time.slice(0, 5)}</span>}
                              <span className="truncate font-medium">{ev.title}</span>
                            </div>
                          ))}
                          {dayEvents.length > max && (
                            <button
                              type="button" onClick={(e) => { e.stopPropagation(); setDate(new Date(year, month, day)); setViewMode('day'); }}
                              className="text-xs font-semibold px-1.5 rounded transition-colors hover:underline text-accent-texte"
                            >
                              +{dayEvents.length - max}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {!days.some((day) => day && getEventsForDay(day).length > 0) && (hasActiveFilter ? videFiltre : (
              <EtatVide icone={Calendar} titre="Aucun événement ce mois" texte="Touchez un jour pour planifier un premier événement." action={actionCreer} className="py-8" />
            ))}
          </>
        ) : viewMode === 'week' ? (
          (() => {
            const HOUR_START = workHourStart;
            const HOUR_END = workHourEnd;
            const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
            const HOUR_HEIGHT = 60;
            const TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT;
            const getEventPos = (ev) => {
              if (!ev.time) return null;
              const [h, m] = ev.time.split(':').map(Number);
              const topMins = (h - HOUR_START) * 60 + (m || 0);
              if (topMins < 0) return null;
              return { top: (topMins / 60) * HOUR_HEIGHT, height: Math.max(((ev.duration || 60) / 60) * HOUR_HEIGHT, 22) };
            };
            const now = new Date();
            const nowMins = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
            const nowTop = nowMins >= 0 && nowMins <= (HOUR_END - HOUR_START + 1) * 60 ? (nowMins / 60) * HOUR_HEIGHT : null;

            const renderDayColumn = (dayDate, dayIdx, style = {}) => {
              const dateStr = formatLocalDate(dayDate);
              const timedEvts = getEventsForDate(dayDate).filter((ev) => !isAllDayEvent(ev));
              return (
                <div key={dayIdx} className="relative border-l border-bord" style={{ height: TOTAL_HEIGHT, ...style }}>
                  {HOURS.map((h) => (
                    <div key={h} className={`absolute left-0 right-0 border-b border-bord ${peutCreer ? 'cursor-pointer' : ''}`} style={{ top: (h - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      onClick={() => peutCreer && ouvrirAjout(dateStr, `${String(h).padStart(2, '0')}:00`)} />
                  ))}
                  {dateStr === todayStr && nowTop !== null && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: nowTop }}>
                      <div className="w-2.5 h-2.5 rounded-full bg-accent -ml-1.5 flex-shrink-0" />
                      <div className="flex-1 h-0.5 bg-accent" />
                    </div>
                  )}
                  {timedEvts.map((ev) => {
                    const pos = getEventPos(ev);
                    if (!pos) return null;
                    return (
                      <div
                        key={ev.id} onClick={(e) => handleEventClick(e, ev)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleEventClick(e, ev); }}
                        draggable={peutModifier && !ev.isMemo && !ev.isDeadline && !ev.isRecurrence} onDragStart={(e) => e.dataTransfer.setData('eventId', ev.id)}
                        title={`${ev.title}${ev.time ? `\n${ev.time}${ev.duration ? ` — ${formatDuration(ev.duration)}` : ''}` : ''}\n${TYPE_LABELS[ev.type] || 'Événement'}`}
                        className={`absolute left-1 right-1 rounded-lg px-2 py-0.5 text-xs cursor-pointer overflow-hidden hover:shadow-e2 hover:brightness-95 transition-all z-10 ${styleDe(ev).pastille}`}
                        style={{ top: pos.top, height: pos.height, minHeight: 22 }}
                      >
                        <p className="font-semibold truncate leading-tight">{ev.title}</p>
                        {pos.height > 32 && <p className="opacity-80 text-xs leading-tight">{ev.time}{ev.duration ? ` · ${formatDuration(ev.duration)}` : ''}</p>}
                      </div>
                    );
                  })}
                </div>
              );
            };

            const allDayMap = weekDays.map((d) => getEventsForDate(d).filter((ev) => isAllDayEvent(ev)));
            const hasAnyAllDay = allDayMap.some((arr) => arr.length > 0);

            return (
              <div>
                <div className="hidden sm:block">
                  <div className="flex border-b border-bord">
                    <div className="w-14 flex-shrink-0" />
                    {weekDays.map((d, i) => (
                      <div key={i} className="flex-1 text-center py-2 border-l border-bord">
                        <p className="text-xs text-encre-3">{JOURS[i]}</p>
                        <p className={`text-sm font-bold ${formatLocalDate(d) === todayStr ? 'bg-accent text-sur-accent w-7 h-7 rounded-full flex items-center justify-center mx-auto' : 'text-encre'}`}>{d.getDate()}</p>
                      </div>
                    ))}
                  </div>
                  {hasAnyAllDay && (
                    <div className="flex border-b border-bord">
                      <div className="w-14 flex-shrink-0 text-xs text-center py-2 font-medium text-encre-3">Journée</div>
                      {weekDays.map((d, i) => (
                        <div key={i} className="flex-1 p-1.5 border-l border-bord min-h-[36px]">
                          {(journeeDepliee ? allDayMap[i] : allDayMap[i].slice(0, 2)).map((ev) => (
                            <button key={ev.id} type="button" onClick={(e) => handleEventClick(e, ev)} title={ev.title}
                              className={`w-full text-left text-xs px-2 py-1 rounded-md bg-surface-2 text-encre cursor-pointer truncate mb-0.5 border-l-[3px] hover:bg-bord transition-colors ${styleDe(ev).bord}`}>
                              <span className="truncate font-medium">{ev.title}</span>
                            </button>
                          ))}
                          {!journeeDepliee && allDayMap[i].length > 2 && (
                            <button type="button" onClick={() => setJourneeDepliee(true)} className="w-full text-left text-xs font-semibold text-accent-texte px-2 py-0.5">+ {allDayMap[i].length - 2}</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div ref={weekGridRef} className="overflow-y-auto" style={{ maxHeight: 'min(600px, 60vh)' }}>
                    <div className="flex" style={{ height: TOTAL_HEIGHT }}>
                      <div className="w-14 flex-shrink-0 relative">
                        {HOURS.map((h) => (
                          <div key={h} className="absolute right-2 text-xs font-medium text-encre-3" style={{ top: (h - HOUR_START) * HOUR_HEIGHT - 6 }}>{String(h).padStart(2, '0')}h</div>
                        ))}
                      </div>
                      {weekDays.map((d, i) => renderDayColumn(d, i, { flex: '1 1 0%' }))}
                    </div>
                  </div>
                </div>

                {/* Téléphone : les jours en onglets, une colonne */}
                <div className="sm:hidden">
                  <div className="flex overflow-x-auto gap-1 p-2 border-b border-bord" role="group" aria-label="Jour de la semaine">
                    {weekDays.map((d, i) => {
                      const actif = mobileWeekDay === i;
                      return (
                        <button
                          key={i} type="button" onClick={() => setMobileWeekDay(i)} aria-pressed={actif}
                          className={`flex-shrink-0 w-11 py-2 rounded-xl text-center transition-all ${actif ? 'bg-accent text-sur-accent shadow-e1' : formatLocalDate(d) === todayStr ? 'text-accent-texte font-semibold' : 'text-encre-3'}`}
                        >
                          <p className="text-xs font-medium">{JOURS[i]}</p>
                          <p className="text-base font-bold">{d.getDate()}</p>
                        </button>
                      );
                    })}
                  </div>
                  {allDayMap[mobileWeekDay]?.length > 0 && (() => {
                    const evs = allDayMap[mobileWeekDay];
                    return (
                      <div className="p-2 border-b border-bord space-y-1">
                        {(journeeDepliee ? evs : evs.slice(0, 2)).map((ev) => {
                          const Icone = TYPE_ICONS[ev.type] || Calendar;
                          return (
                            <button key={ev.id} type="button" onClick={(e) => handleEventClick(e, ev)}
                              className={`w-full min-h-[44px] px-3 rounded-lg bg-surface-2 text-left text-sm text-encre flex items-center gap-2 border-l-4 hover:bg-bord transition-colors ${styleDe(ev).bord}`}>
                              <Icone size={16} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
                              <span className="truncate font-medium">{ev.title}</span>
                            </button>
                          );
                        })}
                        {evs.length > 2 && (
                          <button type="button" onClick={() => setJourneeDepliee((v) => !v)} className="w-full h-11 text-sm font-semibold text-accent-texte">
                            {journeeDepliee ? 'Réduire' : `Et ${evs.length - 2} autre${evs.length - 2 > 1 ? 's' : ''}`}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  <div className="overflow-y-auto" style={{ maxHeight: 'min(500px, 55vh)' }}>
                    <div className="flex" style={{ height: TOTAL_HEIGHT }}>
                      <div className="w-12 flex-shrink-0 relative">
                        {HOURS.map((h) => (
                          <div key={h} className="absolute right-1.5 text-xs font-medium text-encre-3" style={{ top: (h - HOUR_START) * HOUR_HEIGHT - 5 }}>{String(h).padStart(2, '0')}h</div>
                        ))}
                      </div>
                      {renderDayColumn(weekDays[mobileWeekDay], mobileWeekDay, { flex: '1 1 0%' })}
                    </div>
                  </div>
                </div>

                {!weekDays.some((d) => getEventsForDate(d).length > 0) && (hasActiveFilter ? videFiltre : (
                  <EtatVide icone={Calendar} titre="Aucun événement cette semaine" texte="Touchez un créneau horaire pour planifier un événement." action={actionCreer} className="py-8" />
                ))}
              </div>
            );
          })()
        ) : viewMode === 'day' ? (
          (() => {
            const dayStr = formatLocalDate(date);
            const dayEvents = getEventsForDay(dayStr);
            const HOURS = Array.from({ length: workHourEnd - workHourStart + 1 }, (_, i) => i + workHourStart);
            const allDayEvts = dayEvents.filter((ev) => isAllDayEvent(ev));
            const timedOnlyEvts = dayEvents.filter((ev) => !isAllDayEvent(ev));
            return (
              <div>
                {allDayEvts.length > 0 && (
                  <div className="px-3 py-2 border-b border-bord bg-surface-2">
                    <p className="text-sm font-semibold mb-1 text-encre-3">Journée</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allDayEvts.map((ev) => {
                        const Icone = TYPE_ICONS[ev.type] || Calendar;
                        return (
                          <button key={ev.id} type="button" onClick={(e) => handleEventClick(e, ev)} title={ev.title}
                            className={`flex items-center gap-1.5 px-2.5 min-h-[36px] rounded-lg text-xs font-medium cursor-pointer hover:brightness-95 transition-all ${styleDe(ev).pastille}`}>
                            <Icone size={12} aria-hidden="true" />
                            <span className="truncate max-w-[160px]">{ev.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="divide-y divide-bord">
                  {HOURS.map((hour) => {
                    const hourStr = `${String(hour).padStart(2, '0')}:00`;
                    const hourEvents = timedOnlyEvts.filter((ev) => parseInt(ev.time.split(':')[0]) === hour);
                    return (
                      <div
                        key={hour} className={`flex min-h-[48px] hover:bg-surface-2 ${peutCreer ? 'cursor-pointer' : ''}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const id = e.dataTransfer.getData('eventId');
                          const ev = allEvents.find((evt) => evt.id === id);
                          if (ev && peutModifier && !ev.isChantier && !ev.isMemo && !ev.isDeadline && !ev.isRecurrence) {
                            if (updateEventProp) updateEventProp(id, { date: dayStr, time: hourStr });
                            else setEvents(events.map((evt) => (evt.id === id ? { ...evt, date: dayStr, time: hourStr } : evt)));
                          }
                        }}
                        onClick={() => peutCreer && ouvrirAjout(dayStr, hourStr)}
                      >
                        <div className="w-16 sm:w-20 p-2 text-right flex-shrink-0 border-r border-bord"><span className="text-xs font-medium text-encre-3">{hourStr}</span></div>
                        <div className="flex-1 p-1.5">
                          {hourEvents.map((ev) => {
                            const Icone = TYPE_ICONS[ev.type] || Calendar;
                            return (
                              <div
                                key={ev.id} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleEventClick(e, ev); }}
                                draggable={peutModifier && !ev.isMemo && !ev.isDeadline && !ev.isRecurrence} onDragStart={(e) => e.dataTransfer.setData('eventId', ev.id)}
                                onClick={(e) => handleEventClick(e, ev)}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border-l-4 mb-1 bg-surface hover:bg-surface-2 shadow-e1 ${styleDe(ev).bord}`}
                              >
                                <Icone size={14} aria-hidden="true" className="text-encre-3" />
                                <span className="text-sm font-medium truncate text-encre" title={ev.title}>{ev.title}</span>
                                {ev.time && <span className="text-xs text-encre-3 ml-auto">{ev.time}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {dayEvents.length === 0 && (hasActiveFilter ? videFiltre : (
                  <EtatVide icone={CalendarDays} titre="Journée libre" texte="Touchez un créneau pour planifier un événement." action={actionCreer} className="py-8" />
                ))}
              </div>
            );
          })()
        ) : (
          (() => {
            const debut = new Date();
            debut.setHours(0, 0, 0, 0);
            const agendaDays = Array.from({ length: agendaRange }, (_, i) => {
              const d = new Date(debut);
              d.setDate(d.getDate() + i);
              const dateStr = formatLocalDate(d);
              return { date: d, dateStr, events: getEventsForDay(dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || '')) };
            });
            const visibleDays = agendaHideEmpty ? agendaDays.filter((d) => d.events.length > 0 || d.dateStr === todayStr) : agendaDays;
            const aDesEvenements = agendaDays.some((d) => d.events.length > 0);
            return (
              <div>
                <div className="flex items-center justify-between gap-2 px-4 py-1 border-b border-bord">
                  <span className="text-sm text-encre-3">{visibleDays.length} jour{visibleDays.length > 1 ? 's' : ''} affiché{visibleDays.length > 1 ? 's' : ''}</span>
                  <Bouton variante="discret" taille="compacte" aria-pressed={agendaHideEmpty} onClick={() => setAgendaHideEmpty((h) => !h)}>
                    {agendaHideEmpty ? 'Afficher tous les jours' : 'Seulement les jours avec événements'}
                  </Bouton>
                </div>
                {visibleDays.map(({ date: dayDate, dateStr, events: dayEvts }) => {
                  const isToday = dateStr === todayStr;
                  return (
                    <div key={dateStr}>
                      <div className={`sticky top-0 z-10 px-4 py-2 text-sm font-semibold first-letter:uppercase ${isToday ? 'bg-accent/10 text-accent-texte' : 'bg-surface-2 text-encre-2'}`}>
                        {isToday ? "Aujourd'hui — " : ''}{dayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </div>
                      {dayEvts.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-encre-3 border-b border-bord">Rien de prévu</div>
                      ) : dayEvts.map((ev) => {
                        const Icone = TYPE_ICONS[ev.type] || Calendar;
                        const client = ev.clientId ? clients.find((c) => c.id === ev.clientId) : null;
                        return (
                          <button
                            key={ev.id} type="button" onClick={(e) => handleEventClick(e, ev)}
                            className="w-full min-h-[56px] flex items-center gap-3 px-4 py-2 text-left transition-colors border-b border-bord hover:bg-surface-2"
                          >
                            <span className="flex flex-col items-center w-12 flex-shrink-0">
                              {ev.time ? <span className="text-sm font-bold tabular-nums text-encre">{ev.time}</span> : <span className="text-sm text-encre-3">Journée</span>}
                              {ev.time && ev.duration ? <span className="text-xs text-encre-3">{formatDuration(ev.duration)}</span> : null}
                            </span>
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${styleDe(ev).point}`} aria-hidden="true" />
                            <span className="flex-1 min-w-0">
                              <span className="block text-base font-medium truncate text-encre" title={ev.title}>{ev.title}</span>
                              {client && <span className="block text-sm text-encre-3 truncate">{client.nom} {client.prenom || ''}</span>}
                            </span>
                            <Icone size={16} aria-label={TYPE_LABELS[ev.type]} className="flex-shrink-0 text-encre-3" />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                {!aDesEvenements && (hasActiveFilter ? videFiltre : (
                  <EtatVide icone={CalendarCheck} titre="Aucun événement à venir" texte="Planifiez vos prochaines interventions, rendez-vous et relances." action={actionCreer} className="py-8" />
                ))}
                <button type="button" onClick={() => setAgendaRange((r) => r + 30)} className="w-full min-h-[56px] text-sm font-semibold transition-colors text-accent-texte hover:bg-surface-2">
                  Afficher 30 jours de plus
                </button>
              </div>
            );
          })()
        )}
      </Carte>

      {showTips && (
        <div className="rounded-2xl p-4 flex items-start gap-3 bg-surface-2 text-encre">
          <CalendarDays size={20} aria-hidden="true" className="flex-shrink-0 mt-0.5 text-encre-3" />
          <div className="text-sm flex-1">
            <p className="font-semibold mb-1">Votre planning</p>
            <ul className="space-y-1 text-encre-2 list-disc pl-4">
              <li>Touchez un jour pour créer un événement.</li>
              <li className="indication-clavier">Faites glisser un rendez-vous pour le déplacer.</li>
              <li>Les chantiers datés sont dans la ligne « Chantiers sur la période ».</li>
            </ul>
          </div>
          <BoutonIcone icone={X} libelle="Fermer les astuces" taille={16} onClick={() => { setShowTips(false); try { localStorage.setItem('cp_planning_tips_dismissed', 'true'); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } }} />
        </div>
      )}

      {/* Détail d'un événement, et sa modification */}
      {showDetail && (() => {
        const TypeIcone = TYPE_ICONS[showDetail.type] || Calendar;
        const enSerie = (showDetail.recurrence && showDetail.recurrence !== 'never') || showDetail.isRecurrence;
        const client = showDetail.clientId ? clients.find((c) => c.id === showDetail.clientId) : null;
        const employe = showDetail.employeId ? equipe.find((e) => e.id === showDetail.employeId) : null;
        const chantierLie = showDetail.chantierId && !showDetail.isChantier ? memoChantier(showDetail.chantierId) : null;
        const ligne = (Icone, contenu) => (
          <div className="flex items-center gap-2.5 text-sm text-encre"><Icone size={14} aria-hidden="true" className="text-encre-3 flex-shrink-0" />{contenu}</div>
        );
        return (
          <Modal isOpen onClose={fermerDetail} size="sm" closeOnBackdrop={!enregistrement} closeOnEscape={!enregistrement}>
            <ModalHeader>
              <ModalDescription className="flex items-center gap-1.5">
                <TypeIcone size={14} aria-hidden="true" />{TYPE_LABELS[showDetail.type] || 'Événement'}{enSerie ? ' · se répète' : ''}
              </ModalDescription>
              <ModalTitle>{editMode ? 'Modifier l\'événement' : showDetail.title}</ModalTitle>
            </ModalHeader>
            <ModalBody>
              {editMode ? (
                <div className="space-y-3">
                  {showDetail.isRecurrence && <p className="text-sm text-encre-2 bg-surface-2 rounded-lg px-3 py-2">Cette modification s’applique à toute la série (date de départ : celle de la première occurrence).</p>}
                  <ChampsEvenement form={form} setForm={setForm} equipe={equipe} clients={clients} chantiers={chantiers} />
                </div>
              ) : showDetail.isMemo ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-encre">{showDetail.fullText || showDetail.title}</p>
                  {(showDetail.priority || showDetail.category) && (
                    <div className="flex flex-wrap gap-1.5">
                      {PRIORITIES.filter((p) => p.value === showDetail.priority).map((p) => (
                        <span key={p.value} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${classesTon(p.ton).pastille}`}>{p.dot} {p.label}</span>
                      ))}
                      {CATEGORIES.filter((c) => c.value === showDetail.category).map((c) => (
                        <span key={c.value} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${classesTon(c.ton).pastille}`}><Tag size={12} aria-hidden="true" /> {c.label}</span>
                      ))}
                    </div>
                  )}
                  {ligne(Calendar, dateLue(showDetail.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}
                  {showDetail.time && ligne(Clock, showDetail.time)}
                  {showDetail.chantier_id && (() => {
                    const ch = memoChantier(showDetail.chantier_id);
                    return ch ? ligne(Home, <button type="button" onClick={() => goToChantier(ch.id)} className="hover:underline text-accent-texte">{ch.nom}</button>) : null;
                  })()}
                  {showDetail.subtasks?.length > 0 && (() => {
                    const faites = showDetail.subtasks.filter((s) => s.done).length;
                    const total = showDetail.subtasks.length;
                    return (
                      <div className="p-3 rounded-lg bg-surface-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-encre-2"><ListChecks size={14} aria-hidden="true" className="inline mr-1" />Sous-tâches</span>
                          <span className="text-sm font-semibold text-encre-3 tabular-nums">{faites}/{total}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-bord mb-2"><div className={`h-full rounded-full transition-all ${faites === total ? 'bg-succes-point' : 'bg-accent'}`} style={{ width: `${Math.round((faites / total) * 100)}%` }} /></div>
                        <div className="space-y-1">
                          {showDetail.subtasks.map((st) => (
                            <label key={st.id} className="flex items-center gap-2 min-h-[36px] cursor-pointer">
                              <input
                                type="checkbox" checked={!!st.done} disabled={!peutTerminer}
                                onChange={() => {
                                  if (!updateMemo || !showDetail.memoId) return;
                                  const suivantes = showDetail.subtasks.map((s) => (s.id === st.id ? { ...s, done: !s.done } : s));
                                  updateMemo(showDetail.memoId, { subtasks: suivantes });
                                  setShowDetail((prev) => (prev ? { ...prev, subtasks: suivantes } : null));
                                }}
                                className="w-4 h-4 rounded accent-[rgb(var(--accent))]"
                              />
                              <span className={`text-sm ${st.done ? 'line-through text-encre-3' : 'text-encre'}`}>{st.text}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {showDetail.description && <div className="p-3 rounded-lg text-sm bg-surface-2 text-encre-2 whitespace-pre-wrap">{showDetail.description}</div>}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ligne(Calendar, <>{dateLue(showDetail.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}{showDetail.dateEnd && showDetail.dateEnd !== showDetail.date && ` → ${dateLue(showDetail.dateEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}</>)}
                  {ligne(Clock, showDetail.time ? <>{showDetail.time}{showDetail.duration ? ` — ${formatDuration(showDetail.duration)}` : ''}</> : <span className="italic text-encre-3">Toute la journée</span>)}
                  {employe && ligne(Briefcase, employe.nom || '-')}
                  {client && ligne(Building2, `${client.nom} ${client.prenom || ''}`)}
                  {chantierLie && ligne(Home, <button type="button" onClick={() => goToChantier(chantierLie.id)} className="hover:underline text-accent-texte">{chantierLie.nom}</button>)}
                  {showDetail.rappel && ligne(Bell, `Rappel ${showDetail.rappel === '15' ? '15 min' : showDetail.rappel === '30' ? '30 min' : showDetail.rappel === '60' ? '1h' : showDetail.rappel === '1440' ? 'veille' : showDetail.rappel === '2880' ? '2 jours' : `${showDetail.rappel} min`}`)}
                  {showDetail.isRecurrence && ligne(RefreshCw, 'Occurrence d\'une série')}
                  {showDetail.description && <div className="p-3 rounded-lg text-sm bg-surface-2 text-encre-2 whitespace-pre-wrap">{showDetail.description}</div>}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              {showDetail.isChantier ? (
                <Bouton variante="principal" icone={Home} onClick={() => goToChantier(showDetail.chantierId)}>Voir le chantier</Bouton>
              ) : showDetail.isMemo ? (
                <>
                  <Bouton variante="secondaire" icone={ClipboardList} onClick={() => { setPage?.('tasks'); fermerDetail(); }}>Voir dans Tâches</Bouton>
                  {peutTerminer && <Bouton variante="principal" icone={CheckCircle2} onClick={() => { if (toggleMemo && showDetail.memoId) { toggleMemo(showDetail.memoId); fermerDetail(); } }}>Terminer</Bouton>}
                </>
              ) : showDetail.isDeadline ? (
                // Échéance calculée depuis un devis ou une facture : elle se change dans le document.
                <Bouton variante="principal" onClick={() => { setPage?.('devis'); fermerDetail(); }}>Voir dans Devis &amp; Factures</Bouton>
              ) : editMode ? (
                <>
                  <Bouton variante="secondaire" onClick={() => { setEditMode(false); setForm(FORMULAIRE_VIDE); }} disabled={enregistrement}>Annuler</Bouton>
                  <Bouton variante="principal" onClick={handleUpdateEvent} chargement={enregistrement}>Enregistrer</Bouton>
                </>
              ) : (
                <>
                  {peutSupprimer && <Bouton variante="discret" icone={Trash2} className="text-danger-texte" onClick={() => handleDeleteEvent(showDetail.id)}>Supprimer</Bouton>}
                  {peutModifier && <Bouton variante="principal" icone={Edit3} onClick={startEdit}>Modifier</Bouton>}
                </>
              )}
            </ModalFooter>
          </Modal>
        );
      })()}

      {/* Nouvel événement */}
      <Modal isOpen={showAdd} onClose={fermerAjout} size="md" closeOnBackdrop={!enregistrement} closeOnEscape={!enregistrement}>
        <ModalHeader>
          <ModalTitle>Nouvel événement</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <ChampsEvenement form={form} setForm={setForm} equipe={equipe} clients={clients} chantiers={chantiers} />
        </ModalBody>
        <ModalFooter>
          <Bouton variante="secondaire" onClick={fermerAjout} disabled={enregistrement}>Annuler</Bouton>
          <Bouton variante="principal" onClick={submit} chargement={enregistrement}>Créer</Bouton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
