import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { ArrowUpDown, Plus, AlertTriangle, Navigation, Calendar, ChevronDown, ChevronUp, Building2, Archive, FileText, Search } from 'lucide-react';
import Pastille, { PastilleStatut } from './ui/Pastille';
import { Bouton, BoutonIcone } from './ui/Bouton';
import { EnTetePage } from './ui/EnTete';
import EtatVide from './ui/EtatVide';
import LigneListe from './ui/LigneListe';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';
import { Segmente } from './ui/Onglets';
import { ChampRecherche, BoutonVolet, Volet, ListeChoix, PucesActives, SegmentDefilant } from './ui/Filtres';
import ErrorBoundary from './ui/ErrorBoundary';
import QuickChantierModal from './QuickChantierModal';
import FicheChantier from './chantiers/FicheChantier';
import { useConfirm, useToast } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { findDuplicateChantiers } from '../lib/utils';
import { formatClientName } from '../lib/formatters';
import { estFranchiseTva } from '../lib/franchiseTva';
import { avancementChantier, avancementDuChantier } from '../lib/avancementChantier';
import { joursAvantFin, chantierEnRetard } from '../lib/echeanceChantier';
import { budgetChantier } from '../lib/budgetChantier';
import { ouvrirLienExterne } from '../lib/natif';
import { FONCTIONS } from '../lib/fonctions';
import { jourLocal, dateLue } from '../lib/dates';

const ChantierMap = lazy(() => import('./chantiers/ChantierMap'));
const GanttView = lazy(() => import('./GanttView'));
const GarantiesDashboard = lazy(() => import('./chantiers/GarantiesDashboard'));

const CHARGEMENT = <div className="h-[400px] rounded-xl flex items-center justify-center bg-surface-2"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement" /></div>;

// Un chantier s'ouvre par son identifiant ; un appelant qui passerait l'objet entier ne doit pas faire un écran blanc.
const idDe = (v) => (v && typeof v === 'object' ? v.id ?? null : v || null);

/**
 * La rubrique « Chantiers » : la liste (cartes, frise, carte), puis la fiche d'un chantier (chantiers/FicheChantier.jsx).
 * Passe « ancien code » du 25 oct. 2026 et audit UX du 20 oct. : la liste d'abord (plus de tuiles qui répétaient les puces,
 * « Aujourd'hui » replié sur une ligne), des chiffres qui disent ce qu'ils sont (« Budget 8 500 € HT », « Avancement 85 % »).
 */
export default function Chantiers({
  chantiers, addChantier, updateChantier, clients, depenses, pointages, equipe, devis, ajustements, addAjustement, deleteAjustement,
  getChantierBilan, couleur, modeDiscret, entreprise, selectedChantier, setSelectedChantier, catalogue, deductStock, isDark,
  createMode, setCreateMode, setPage, memos = [], addMemo, toggleMemo, onPlanEvent, addDevis, generateNextNumero, nouveauDevisPour,
  paiements = [], ouvrirDevis,
}) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { canPerform, canViewPrices: voitPrix } = usePermissions();
  const franchiseTva = estFranchiseTva(entreprise);

  const [view, setView] = useState(idDe(selectedChantier));
  const [show, setShow] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // recent, name, status, margin
  const [filterStatus, setFilterStatus] = useState('all'); // all, cette_semaine, en_cours, prospect, termine, brouillons, archive
  const [filterClient, setFilterClient] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Recherche / Filtres / Trier : boîte à outils commune (ui/Filtres.jsx), comme Devis, Clients et Tâches.
  const [voletListe, setVoletListe] = useState(null); // null | 'filtres' | 'tri'
  const boutonFiltresRef = useRef(null);
  const boutonTriRef = useRef(null);
  const [viewMode, setViewMode] = useState('list'); // list, gantt, map, garanties
  const [ganttTasks, setGanttTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cp_gantt_tasks') || '[]'); } catch { return []; }
  });
  const [todayCollapsed, setTodayCollapsed] = useState(true); // « Aujourd'hui » : une ligne, dépliée à la demande
  const [mergeDialog, setMergeDialog] = useState(null); // { primaryId, secondaryId }
  const [fusionEnCours, setFusionEnCours] = useState(false);
  const [chantierDuplicateDismissed, setChantierDuplicateDismissed] = useState(() => { try { return localStorage.getItem('chantierDuplicateDismissed') === 'true'; } catch { return false; } });
  const [clientPourChantier, setClientPourChantier] = useState(null);

  const duplicateMap = React.useMemo(() => findDuplicateChantiers(chantiers || []), [chantiers]);

  useEffect(() => { const ouvert = idDe(selectedChantier); if (ouvert) setView(ouvert); }, [selectedChantier]);
  // Fiche ouverte → selectedChantier, gardé par App.jsx (une notification ou une recherche l'ouvre de la même façon)
  useEffect(() => { setSelectedChantier?.(view || null); }, [view, setSelectedChantier]);
  // createMode peut porter un client (ouvert depuis sa fiche) : le formulaire part avec lui.
  useEffect(() => { if (createMode) { setClientPourChantier(createMode?.clientId || null); setShow(true); setCreateMode?.(false); } }, [createMode, setCreateMode]);
  // La frise garde ses tâches sur l'appareil
  useEffect(() => { try { localStorage.setItem('cp_gantt_tasks', JSON.stringify(ganttTasks)); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } }, [ganttTasks]);

  // L'avancement affiché par la frise et la carte est celui de la liste (src/lib/avancementChantier.js)
  const avancementDe = (c) => avancementDuChantier(c, getChantierBilan(c.id));

  const retourListe = useCallback(() => { setView(null); setSelectedChantier?.(null); }, [setSelectedChantier]);

  const formatMoney = (n) => (modeDiscret ? '·····' : (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €');
  const formatPct = (n) => {
    if (modeDiscret) return '··%';
    const valeur = n || 0;
    const arrondie = Math.round(valeur);
    return Math.abs(valeur - arrondie) < 0.1 ? `${arrondie} %` : `${valeur.toFixed(1).replace('.', ',')} %`;
  };

  // Fusion de deux doublons : le principal reçoit les données de l'autre, qui est archivé
  const fusionner = async (primaryId, secondaryId) => {
    const primary = chantiers.find((c) => c.id === primaryId);
    const secondary = chantiers.find((c) => c.id === secondaryId);
    if (!primary || !secondary || fusionEnCours) return;
    const taches = [...(primary.taches || [])];
    (secondary.taches || []).forEach((t) => { if (!taches.some((mt) => mt.text === t.text)) taches.push(t); });
    const documents = [...(primary.documents || [])];
    (secondary.documents || []).forEach((d) => { if (!documents.some((md) => md.nom === d.nom)) documents.push(d); });
    const fusion = {
      taches,
      photos: [...(primary.photos || []), ...(secondary.photos || [])],
      documents,
      messages: [...(primary.messages || []), ...(secondary.messages || [])],
      description: primary.description || secondary.description || '',
      adresse: primary.adresse || secondary.adresse || '',
      ville: primary.ville || secondary.ville || '',
      code_postal: primary.code_postal || secondary.code_postal || '',
      budget_estime: primary.budget_estime || primary.budgetPrevu || secondary.budget_estime || secondary.budgetPrevu || 0,
      budgetPrevu: primary.budgetPrevu || primary.budget_estime || secondary.budgetPrevu || secondary.budget_estime || 0,
      budget_materiaux: primary.budget_materiaux || secondary.budget_materiaux || 0,
      heures_estimees: primary.heures_estimees || secondary.heures_estimees || 0,
      notes: [primary.notes, secondary.notes].filter(Boolean).join('\n---\n') || '',
    };
    setFusionEnCours(true);
    try {
      if (!(await updateChantier(primaryId, fusion, { silencieux: true }))) return;
      const archive = await updateChantier(secondaryId, { statut: 'archive', notes: `[Fusionné dans "${primary.nom}" le ${new Date().toLocaleDateString('fr-FR')}]\n${secondary.notes || ''}` }, { silencieux: true });
      setMergeDialog(null);
      showToast(archive ? `Chantiers fusionnés — « ${secondary.nom} » archivé` : `Données copiées dans « ${primary.nom} », mais « ${secondary.nom} » n'a pas pu être archivé`, archive ? 'success' : 'warning');
    } finally {
      setFusionEnCours(false);
    }
  };

  // ── Fiche d'un chantier ──
  if (view) {
    return (
      <FicheChantier
        id={view} chantiers={chantiers} clients={clients} depenses={depenses} pointages={pointages} equipe={equipe} devis={devis}
        ajustements={ajustements} memos={memos} paiements={paiements} catalogue={catalogue} entreprise={entreprise}
        modeDiscret={modeDiscret} isDark={isDark} couleur={couleur}
        addChantier={addChantier} updateChantier={updateChantier} getChantierBilan={getChantierBilan} addAjustement={addAjustement}
        deleteAjustement={deleteAjustement} deductStock={deductStock} addMemo={addMemo} toggleMemo={toggleMemo}
        setPage={setPage} onPlanEvent={onPlanEvent} addDevis={addDevis} generateNextNumero={generateNextNumero}
        nouveauDevisPour={nouveauDevisPour} ouvrirDevis={ouvrirDevis}
        onRetour={retourListe} onOuvrir={setView}
      />
    );
  }

  // ── Création ──
  const creer = async (formData) => {
    // C2 : nom valide
    const MOTS_RESERVES = ['test', 'essai', 'demo', 'tmp', 'aaa', 'xxx', 'azerty', 'qwerty'];
    const nom = (formData.nom || '').trim();
    if (nom.length < 5) {
      showToast('Le nom du chantier doit contenir au moins 5 caractères', 'error');
      return;
    }
    if (MOTS_RESERVES.some((w) => nom.toLowerCase() === w)) {
      showToast('Nom de chantier non valide pour la production (mot réservé)', 'error');
      return;
    }

    // Doublon : même nom, même client, même adresse
    const doublon = chantiers.some((c) =>
      c.nom?.toLowerCase().trim() === nom.toLowerCase()
      && (c.client_id || '') === (formData.client_id || formData.clientId || '')
      && (c.adresse || '').toLowerCase().trim() === (formData.adresse || '').toLowerCase().trim());
    if (doublon && !await confirm({
      title: 'Chantier similaire',
      message: 'Un chantier similaire existe déjà (même nom, client et adresse). Créer quand même ?',
      confirmText: 'Créer quand même',
      cancelText: 'Annuler',
    })) {
      return;
    }

    const clientId = formData.clientId || formData.client_id || '';
    const budget = formData.budget_estime || formData.budgetPrevu || 0;
    // Attendre le résultat : à la limite du plan gratuit ou si la base refuse, la saisie reste. Le message de succès vient
    // de l'enveloppe d'App.jsx.
    const cree = await addChantier({
      ...formData,
      client_id: clientId,
      clientId,
      dateDebut: formData.dateDebut || formData.date_debut || jourLocal(),
      date_debut: formData.date_debut || formData.dateDebut || jourLocal(),
      dateFin: formData.dateFin || formData.date_fin || null,
      date_fin: formData.date_fin || formData.dateFin || null,
      budgetPrevu: budget,
      budget_estime: budget,
      budget_materiaux: formData.budget_materiaux || 0,
      heures_estimees: formData.heures_estimees || 0,
      statut: 'prospect',
    });
    if (!cree) return; // refus : le formulaire reste ouvert avec la saisie
    setShow(false);
    if (cree.id) setView(cree.id);
  };

  // ── Liste : filtres et tri ──
  const peutCreer = canPerform('chantier', 'create');
  const peutModifier = canPerform('chantier', 'edit');
  const peutDevis = canPerform('devis', 'create');

  const chantierOverlapsWeek = (c) => {
    const maintenant = new Date();
    const jour = maintenant.getDay();
    const lundi = new Date(maintenant);
    lundi.setDate(maintenant.getDate() + (jour === 0 ? -6 : 1 - jour));
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);
    const debutSemaine = jourLocal(lundi);
    const finSemaine = jourLocal(dimanche);
    const debut = c.date_debut ? c.date_debut.split('T')[0] : null;
    const fin = c.date_fin ? c.date_fin.split('T')[0] : null;
    if (!debut && !fin) return c.statut === 'en_cours';
    if (debut && !fin) return debut <= finSemaine;
    if (!debut && fin) return fin >= debutSemaine;
    return debut <= finSemaine && fin >= debutSemaine;
  };

  // Brouillon : nom de test, ou presque rien de renseigné
  const isDraftChantier = (ch) => {
    const nomsDeTest = ['test', 'test1', 'test2', 'test3', 'essai', 'brouillon', 'zzz'];
    const nom = (ch.nom || '').toLowerCase().trim();
    if (nomsDeTest.includes(nom)) return true;
    const vide = !ch.adresse && !ch.budget_estime && !ch.budgetPrevu && (!ch.taches || ch.taches.length === 0) && !ch.client_id;
    return vide && nom.length <= 5;
  };

  const getFilteredAndSortedChantiers = () => {
    let filtered = [...chantiers];
    if (filterStatus === 'brouillons') filtered = filtered.filter((c) => c.statut !== 'archive' && isDraftChantier(c));
    else if (filterStatus === 'archive') filtered = filtered.filter((c) => c.statut === 'archive');
    else if (filterStatus === 'cette_semaine') filtered = filtered.filter((c) => c.statut !== 'archive' && !isDraftChantier(c) && chantierOverlapsWeek(c));
    else {
      filtered = filtered.filter((c) => c.statut !== 'archive' && !isDraftChantier(c));
      if (filterStatus !== 'all') filtered = filtered.filter((c) => c.statut === filterStatus);
    }
    if (filterClient) filtered = filtered.filter((c) => c.client_id === filterClient);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const cl = clients.find((x) => x.id === c.client_id);
        return (c.nom || '').toLowerCase().includes(q) || (c.adresse || '').toLowerCase().includes(q)
          || (c.ville || '').toLowerCase().includes(q) || (cl?.nom || '').toLowerCase().includes(q);
      });
    }
    switch (sortBy) {
      case 'name': return filtered.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      case 'status': {
        const ordre = { en_cours: 0, prospect: 1, termine: 2 };
        // « ?? » et non « || » : en_cours vaut 0, qui devenait 2 et se classait avec les terminés
        return filtered.sort((a, b) => (ordre[a.statut] ?? 2) - (ordre[b.statut] ?? 2));
      }
      case 'margin': return filtered.sort((a, b) => (getChantierBilan(b.id)?.tauxMarge || 0) - (getChantierBilan(a.id)?.tauxMarge || 0));
      case 'recent':
      default: return filtered.sort((a, b) => new Date(b.createdAt || b.date_debut || 0) - new Date(a.createdAt || a.date_debut || 0));
    }
  };

  const archivedCount = chantiers.filter((c) => c.statut === 'archive').length;
  const brouillonsCount = chantiers.filter((c) => c.statut !== 'archive' && isDraftChantier(c)).length;
  const actifs = chantiers.filter((c) => c.statut !== 'archive' && !isDraftChantier(c));
  const statusCounts = {
    all: actifs.length,
    cette_semaine: actifs.filter((c) => chantierOverlapsWeek(c)).length,
    en_cours: actifs.filter((c) => c.statut === 'en_cours').length,
    prospect: actifs.filter((c) => c.statut === 'prospect').length,
    termine: actifs.filter((c) => c.statut === 'termine').length,
    brouillons: brouillonsCount,
    archive: archivedCount,
  };
  // Budget : UNE définition pour le sous-titre, les cartes et la fiche (src/lib/budgetChantier.js) ; aucun montant sans le droit de voir les prix
  const budgetEnCours = voitPrix ? actifs.filter((c) => c.statut === 'en_cours').reduce((somme, c) => somme + budgetChantier(c, getChantierBilan(c.id)), 0) : 0;
  // Le sous-titre est un fait vivant (audit UX § 2.2) ; le budget était une tuile qui répétait les puces
  const sousTitre = chantiers.length === 0 ? undefined
    : statusCounts.en_cours > 0
      ? `${statusCounts.en_cours} en cours${budgetEnCours > 0 ? ` · ${modeDiscret ? '·····' : formatMoney(budgetEnCours)}${franchiseTva ? '' : ' HT'} de budget` : ''}`
      : `${statusCounts.all} chantier${statusCounts.all > 1 ? 's' : ''}`;

  const resultats = getFilteredAndSortedChantiers();
  const aujourdhui = jourLocal();
  const chantiersToday = chantiers.filter((c) => {
    if (c.statut !== 'en_cours' || isDraftChantier(c)) return false;
    const debut = c.date_debut ? c.date_debut.split('T')[0] : null;
    const fin = c.date_fin ? c.date_fin.split('T')[0] : null;
    if (!debut) return true;
    return debut <= aujourdhui && (!fin || fin >= aujourdhui);
  });
  const tachesEnAttente = chantiersToday.reduce((sum, c) => sum + (c.taches || []).filter((t) => !t.done).length, 0);

  const optionsVue = [
    { valeur: 'list', libelle: 'Liste' }, { valeur: 'gantt', libelle: 'Frise' }, { valeur: 'map', libelle: 'Carte' },
    ...(FONCTIONS.receptionChantier ? [{ valeur: 'garanties', libelle: 'Garanties' }] : []),
  ];
  const aucun = chantiers.length === 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <EnTetePage
        titre="Chantiers" sousTitre={sousTitre} className="!mb-0"
        actions={aucun ? null : (
          <>
            {/* Au bureau, le choix de la vue est dans l'en-tête (avant : une rangée seule, avec un vide de 50 px dessous) */}
            <Segmente ariaLabel="Vue des chantiers" valeur={viewMode} onChange={setViewMode} options={optionsVue} className="hidden sm:inline-flex" />
            {peutCreer && <Bouton variante="principal" icone={Plus} onClick={() => setShow(true)}>Nouveau chantier</Bouton>}
          </>
        )}
      />

      {!aucun && <Segmente ariaLabel="Vue des chantiers" pleineLargeur valeur={viewMode} onChange={setViewMode} options={optionsVue} className="sm:hidden" />}

      {/* Aujourd'hui : une ligne, dépliée à la demande (avant : la moitié de l'écran avant la première carte) */}
      {chantiersToday.length > 0 && viewMode === 'list' && (
        <div className="bg-surface border border-bord rounded-2xl shadow-e1 overflow-hidden">
          <button
            type="button" onClick={() => setTodayCollapsed(!todayCollapsed)} aria-expanded={!todayCollapsed}
            className="w-full min-h-[52px] px-4 flex items-center gap-2 text-left"
          >
            <Calendar size={16} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
            <span className="text-base font-semibold text-encre truncate">
              {chantiersToday.length} chantier{chantiersToday.length > 1 ? 's' : ''} aujourd'hui
            </span>
            {!todayCollapsed && tachesEnAttente > 0 && <Pastille ton="alerte">{tachesEnAttente} tâche{tachesEnAttente > 1 ? 's' : ''}</Pastille>}
            <span className="ml-auto flex items-center gap-1 flex-shrink-0 text-sm font-semibold text-accent-texte">
              {todayCollapsed ? 'Itinéraires' : 'Réduire'}
              {todayCollapsed ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
            </span>
          </button>
          {!todayCollapsed && (
            <div className="border-t border-bord divide-y divide-bord">
              {chantiersToday.slice(0, 4).map((c) => {
                const cl = clients.find((x) => x.id === c.client_id);
                const lieu = c.adresse || c.ville;
                return (
                  <div key={c.id} className="flex items-center">
                    <LigneListe
                      className="flex-1 min-w-0" onClick={() => setView(c.id)} chevron={!lieu} titre={c.nom}
                      meta={[cl ? formatClientName(cl, '') : '', c.ville || c.adresse].filter(Boolean).join(' · ')}
                    />
                    {lieu && (
                      <BoutonIcone
                        icone={Navigation} variante="secondaire" className="mr-3" libelle={`Itinéraire vers ${c.nom}`}
                        onClick={() => ouvrirLienExterne(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.adresse || ''} ${c.codePostal || ''} ${c.ville || ''}`.trim())}`)}
                      />
                    )}
                  </div>
                );
              })}
              {chantiersToday.length > 4 && <p className="text-sm text-center py-2.5 text-encre-3">et {chantiersToday.length - 4} autre{chantiersToday.length - 4 > 1 ? 's' : ''}</p>}
            </div>
          )}
        </div>
      )}

      {aucun ? (
        <EtatVide
          icone={Building2} titre="Aucun chantier pour l'instant"
          texte="Un chantier réunit les devis, les factures, les photos et les tâches d'un même client."
          action={peutCreer ? <Bouton variante="principal" taille="grande" icone={Plus} onClick={() => setShow(true)}>Créer mon premier chantier</Bouton> : null}
        />
      ) : (
        <>
          {/* Recherche, statut, filtres et tri : boîte à outils commune (ui/Filtres.jsx) */}
          {(() => {
            const TRIS = [['recent', 'Plus récents'], ['name', 'Nom de A à Z'], ['status', 'Par statut'], ...(voitPrix ? [['margin', 'Par marge']] : [])];
            const clientChoisi = clients.find((c) => c.id === filterClient);
            const statuts = [
              { key: 'all', label: 'Tous' },
              { key: 'cette_semaine', label: 'Cette semaine' },
              { key: 'en_cours', label: 'En cours' },
              { key: 'prospect', label: 'Prospects' },
              { key: 'termine', label: 'Terminés' },
              ...(brouillonsCount > 0 ? [{ key: 'brouillons', label: 'Brouillons' }] : []),
              ...(archivedCount > 0 ? [{ key: 'archive', label: 'Archivés' }] : []),
            ];
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ChampRecherche valeur={searchQuery} onChange={setSearchQuery} placeholder="Rechercher…" ariaLabel="Rechercher un chantier, un client ou une adresse" isDark={isDark} className="flex-1" />
                  {clients.length > 1 && (
                    <BoutonVolet ref={boutonFiltresRef} libelle="Filtres" compte={filterClient ? 1 : 0} ouvert={voletListe === 'filtres'} onClick={() => setVoletListe((v) => (v === 'filtres' ? null : 'filtres'))} isDark={isDark} libelleCacheTelephone />
                  )}
                  {chantiers.length > 1 && (
                    <BoutonVolet ref={boutonTriRef} icone={ArrowUpDown} libelle="Trier" valeur={TRIS.find((t) => t[0] === sortBy)?.[1]} ouvert={voletListe === 'tri'} onClick={() => setVoletListe((v) => (v === 'tri' ? null : 'tri'))} isDark={isDark} libelleCacheTelephone />
                  )}
                </div>
                <SegmentDefilant
                  ariaLabel="Statut des chantiers" isDark={isDark}
                  options={statuts.map((t) => ({ valeur: t.key, libelle: t.label, compte: statusCounts[t.key] }))}
                  valeur={filterStatus} onChange={setFilterStatus}
                />
                <PucesActives
                  puces={filterClient ? [{ cle: 'client', libelle: clientChoisi ? formatClientName(clientChoisi) : 'Client', onRetirer: () => setFilterClient('') }] : []}
                  onToutEffacer={() => setFilterClient('')} isDark={isDark}
                />
                <Volet
                  ouvert={voletListe === 'filtres'} onFermer={() => setVoletListe(null)} titre="Filtres" ancreRef={boutonFiltresRef} largeur={340} isDark={isDark}
                  pied={(
                    <Bouton variante="principal" pleineLargeur onClick={() => setVoletListe(null)}>
                      Voir {resultats.length} chantier{resultats.length > 1 ? 's' : ''}
                    </Bouton>
                  )}
                >
                  <ListeChoix
                    titre="Client" placeholder="Rechercher un client" isDark={isDark}
                    options={[{ valeur: '', libelle: 'Tous les clients', toujours: true }, ...clients.map((c) => ({ valeur: c.id, libelle: formatClientName(c) }))]}
                    valeur={filterClient} onChange={setFilterClient}
                  />
                </Volet>
                <Volet ouvert={voletListe === 'tri'} onFermer={() => setVoletListe(null)} titre="Trier les chantiers" ancreRef={boutonTriRef} largeur={300} isDark={isDark}>
                  <ListeChoix
                    titre="Trier par" rechercheAuDela={99} isDark={isDark}
                    options={TRIS.map(([valeur, libelle]) => ({ valeur, libelle }))}
                    valeur={sortBy} onChange={(v) => { setSortBy(v); setVoletListe(null); }}
                  />
                </Volet>
              </div>
            );
          })()}

          {viewMode === 'gantt' && (
            <Suspense fallback={CHARGEMENT}>
              <GanttView
                chantiers={chantiers.filter((c) => c.statut === 'en_cours' || c.statut === 'prospect')}
                equipe={equipe} taches={ganttTasks} setTaches={setGanttTasks} onUpdateChantier={updateChantier} isDark={isDark} couleur={couleur}
                avancementDe={avancementDe}
              />
            </Suspense>
          )}

          {viewMode === 'map' && (
            <ErrorBoundary
              isDark={isDark}
              fallback={(
                <div className="h-[500px] rounded-xl flex flex-col items-center justify-center gap-3 bg-surface-2 text-encre-2">
                  <AlertTriangle size={24} aria-hidden="true" className="text-alerte-texte" />
                  <p className="font-medium">La carte n'a pas pu se charger</p>
                  <Bouton variante="secondaire" onClick={() => setViewMode('list')}>Revenir à la liste</Bouton>
                </div>
              )}
            >
              <Suspense fallback={CHARGEMENT}>
                <ChantierMap
                  chantiers={resultats} clients={clients} onSelectChantier={(id) => setView(id)} isDark={isDark} couleur={couleur}
                  formatMoney={formatMoney} modeDiscret={modeDiscret} voitPrix={voitPrix}
                  budgetDe={(c) => budgetChantier(c, getChantierBilan(c.id))} avancementDe={avancementDe}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          {viewMode === 'garanties' && (
            <Suspense fallback={CHARGEMENT}>
              <GarantiesDashboard isDark={isDark} couleur={couleur} showToast={showToast} chantiers={chantiers} />
            </Suspense>
          )}

          {/* Doublons possibles : une ligne, qu'on peut fermer */}
          {viewMode === 'list' && !chantierDuplicateDismissed && duplicateMap.size > 0 && (
            <div className="flex items-center gap-2 pl-3 pr-1 min-h-[48px] rounded-xl text-sm bg-alerte-fond text-alerte-texte">
              <AlertTriangle size={16} aria-hidden="true" className="shrink-0" />
              <span className="flex-1">
                {Math.ceil(duplicateMap.size / 2)} doublon{Math.ceil(duplicateMap.size / 2) > 1 ? 's' : ''} possible{Math.ceil(duplicateMap.size / 2) > 1 ? 's' : ''} : touchez « Doublon : fusionner » sur la carte.
              </span>
              <Bouton
                variante="discret" taille="compacte" className="shrink-0" aria-label="Fermer l'alerte doublons"
                onClick={() => { setChantierDuplicateDismissed(true); try { localStorage.setItem('chantierDuplicateDismissed', 'true'); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } }}
              >
                Fermer
              </Bouton>
            </div>
          )}

          {viewMode === 'list' && (
            resultats.length === 0 ? (
              <EtatVide
                icone={Search}
                titre={searchQuery ? 'Aucun résultat' : filterStatus === 'termine' ? 'Aucun chantier terminé' : filterStatus === 'archive' ? 'Aucun chantier archivé' : 'Aucun chantier trouvé'}
                texte={searchQuery ? `Aucun chantier ne correspond à « ${searchQuery} »` : 'Les chantiers de cette catégorie apparaîtront ici.'}
                action={(searchQuery || filterClient) ? <Bouton variante="secondaire" onClick={() => { setSearchQuery(''); setFilterClient(''); }}>Effacer les filtres</Bouton> : null}
              />
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {resultats.map((ch) => {
                  const client = clients.find((c) => c.id === ch.client_id);
                  const bilan = getChantierBilan(ch.id) || { totalDepenses: 0, revenuPrevu: 0, margeBrute: 0, tauxMarge: 0 };
                  const devisLie = devis?.find((d) => d.chantier_id === ch.id && d.type === 'devis');
                  const budgetPrevu = voitPrix ? budgetChantier(ch, bilan) : 0;
                  const revenuTotal = bilan.revenuPrevu + (bilan.adjRevenus || 0);
                  const budgetPresqueConsomme = voitPrix && revenuTotal > 0 && bilan.totalDepenses > revenuTotal * 0.9;
                  const taches = ch.taches || [];
                  const faites = taches.filter((t) => t.done).length;
                  const avancement = avancementChantier(ch, bilan, faites, taches.length);

                  // Fin prévue : une règle pour la cloche, la liste et la fiche (src/lib/echeanceChantier.js). Rouge = en retard
                  // (chantier en cours, fin passée) ; ambre = à surveiller.
                  const jours = joursAvantFin(ch);
                  const fin = jours === null ? null
                    : jours < 0 ? { texte: `Fin dépassée de ${-jours} j`, ton: `${chantierEnRetard(ch) ? 'text-danger-texte' : 'text-alerte-texte'} font-semibold` }
                      : jours === 0 ? { texte: "Fin prévue aujourd'hui", ton: 'text-alerte-texte font-semibold' }
                        : jours <= 7 ? { texte: `Fin dans ${jours} j`, ton: 'text-alerte-texte font-semibold' }
                          : { texte: `Fin le ${dateLue(String(ch.date_fin).slice(0, 10)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`, ton: 'text-encre-3' };
                  const ville = ch.ville || (String(ch.adresse || '').match(/\b\d{5}\s+([^,\n]+)\s*$/) || [])[1] || '';
                  const meta = [client ? formatClientName(client, 'Sans client') : 'Sans client', ville].filter(Boolean).join(' · ');
                  const margeNegative = voitPrix && bilan.hasDepenses && bilan.tauxMarge < 0;

                  return (
                    <article key={ch.id} data-ui="Carte" className="bg-surface border border-bord rounded-2xl shadow-e1 overflow-hidden flex flex-col">
                      <button type="button" onClick={() => setView(ch.id)} aria-label={`Ouvrir le chantier ${ch.nom}`} className="flex-1 w-full text-left p-4 transition-colors hover:bg-surface-2/60 active:bg-surface-2">
                        <span className="flex items-start justify-between gap-3">
                          <span className="text-base font-semibold leading-snug text-encre line-clamp-2">{ch.nom}</span>
                          <span className="flex-shrink-0"><PastilleStatut genre="chantier" statut={ch.statut} /></span>
                        </span>
                        <span className="mt-1 block text-sm text-encre-2 truncate">{meta}</span>
                        {ch.statut === 'en_cours' && (
                          <span className="mt-3 block">
                            <span className="flex items-baseline justify-between text-sm">
                              <span className="text-encre-3">Avancement</span>
                              <span className="font-semibold tabular-nums text-encre">{avancement} %</span>
                            </span>
                            <span className="mt-1 block h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                              <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, avancement))}%` }} />
                            </span>
                          </span>
                        )}
                        <span className="mt-3 flex items-baseline justify-between gap-3">
                          <span className={`text-sm truncate ${fin?.ton || 'text-encre-3'}`}>{fin?.texte || (taches.length ? `${faites}/${taches.length} tâches` : '')}</span>
                          {budgetPrevu > 0 && (
                            <span className="text-sm whitespace-nowrap text-encre-3">
                              Budget <span className="text-base font-semibold tabular-nums text-encre">{modeDiscret ? '···' : formatMoney(budgetPrevu)}{franchiseTva ? '' : ' HT'}</span>
                            </span>
                          )}
                        </span>
                        {(margeNegative || budgetPresqueConsomme) && (
                          <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-alerte-texte">
                            <AlertTriangle size={16} aria-hidden="true" className="flex-shrink-0" />
                            {margeNegative ? `Marge ${formatPct(bilan.tauxMarge)}` : 'Budget presque consommé'}
                          </span>
                        )}
                      </button>
                      {(duplicateMap.has(ch.id) || isDraftChantier(ch)) && (
                        <div className="px-4 pb-3 -mt-1 flex flex-wrap gap-2">
                          {isDraftChantier(ch) && <Pastille ton="neutre">Brouillon</Pastille>}
                          {duplicateMap.has(ch.id) && peutModifier && (
                            <button type="button" onClick={() => setMergeDialog({ primaryId: ch.id, secondaryId: duplicateMap.get(ch.id)[0] })} className="min-h-[44px] px-3 rounded-full bg-alerte-fond text-alerte-texte text-sm font-semibold">
                              Doublon : fusionner
                            </button>
                          )}
                        </div>
                      )}
                      {ch.statut === 'prospect' && setPage && peutDevis && (
                        <div className="px-4 pb-4">
                          {devisLie
                            ? <Bouton pleineLargeur icone={FileText} onClick={() => ouvrirDevis?.({ ouvrir: devisLie.id })}>Ouvrir le devis</Bouton>
                            : <Bouton pleineLargeur icone={FileText} onClick={() => (nouveauDevisPour ? nouveauDevisPour(ch.client_id, ch.id) : setPage('devis'))}>Créer le devis</Bouton>}
                        </div>
                      )}
                      {ch.statut === 'archive' && peutModifier && (
                        <div className="px-4 pb-4">
                          <Bouton
                            pleineLargeur icone={Archive}
                            onClick={async () => { if (await updateChantier(ch.id, { statut: 'termine' }, { silencieux: true })) showToast('Chantier restauré', 'success'); }}
                          >
                            Restaurer
                          </Bouton>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )
          )}
        </>
      )}

      <QuickChantierModal
        isOpen={show}
        onClose={() => { setShow(false); setClientPourChantier(null); }}
        onSubmit={creer}
        clientInitial={clientPourChantier}
        clients={clients}
        devis={devis}
        isDark={isDark}
        couleur={couleur}
        voitPrix={voitPrix}
      />

      {/* Fusion de deux doublons */}
      {mergeDialog && (() => {
        const primary = chantiers.find((c) => c.id === mergeDialog.primaryId);
        const secondary = chantiers.find((c) => c.id === mergeDialog.secondaryId);
        if (!primary || !secondary) return null;
        return (
          <Modal isOpen onClose={() => setMergeDialog(null)} size="sm" closeOnBackdrop={!fusionEnCours} closeOnEscape={!fusionEnCours}>
            <ModalHeader>
              <ModalTitle>Fusionner les doublons</ModalTitle>
              <ModalDescription>Les tâches, photos, fichiers, échanges et notes du chantier secondaire seront ajoutés au principal, puis le secondaire sera archivé. Ses devis et factures restent rattachés au chantier archivé.</ModalDescription>
            </ModalHeader>
            <ModalBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[{ ch: primary, etiquette: 'Principal', ton: 'text-succes-texte' }, { ch: secondary, etiquette: 'Sera archivé', ton: 'text-alerte-texte' }].map(({ ch, etiquette, ton }) => {
                  const cl = clients.find((c) => c.id === ch.client_id);
                  return (
                    <div key={ch.id} className="rounded-xl p-3 text-center bg-surface-2">
                      <span className={`text-sm font-semibold block mb-1 ${ton}`}>{etiquette}</span>
                      <p className="text-sm font-semibold truncate text-encre">{ch.nom}</p>
                      <p className="text-sm truncate text-encre-3">{cl ? formatClientName(cl) : '—'}</p>
                      <div className="text-sm mt-2 space-y-0.5 text-encre-3">
                        <p>{(ch.taches || []).length} tâches · {(ch.photos || []).length} photos</p>
                        <p>{(ch.documents || []).length} documents</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Bouton variante="discret" pleineLargeur onClick={() => setMergeDialog({ primaryId: mergeDialog.secondaryId, secondaryId: mergeDialog.primaryId })} disabled={fusionEnCours}>
                Inverser principal et secondaire
              </Bouton>
            </ModalBody>
            <ModalFooter>
              <Bouton variante="secondaire" onClick={() => setMergeDialog(null)} disabled={fusionEnCours}>Annuler</Bouton>
              <Bouton variante="principal" chargement={fusionEnCours} onClick={() => fusionner(mergeDialog.primaryId, mergeDialog.secondaryId)}>Fusionner</Bouton>
            </ModalFooter>
          </Modal>
        );
      })()}
    </div>
  );
}
