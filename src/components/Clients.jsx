import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, ArrowLeft, Search, X, Check, Users, Smartphone, ArrowUpDown, Upload, LayoutGrid, List, AlertTriangle, Phone } from 'lucide-react';
import { EnTetePage } from './ui/EnTete';
import { ChampRecherche, BoutonVolet, Volet, GroupeChoix, ListeChoix, PucesActives, SegmentDefilant } from './ui/Filtres';
import LigneListe, { Avatar, GroupeListe } from './ui/LigneListe';
import Pastille from './ui/Pastille';
import { Bouton, BoutonIcone } from './ui/Bouton';
import Carte from './ui/Carte';
import Champ from './ui/Champ';
import EtatVide from './ui/EtatVide';
import MenuActions from './ui/MenuActions';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';
import { resteAPayer } from '../lib/paiementsFacture';
import { encaisse, estOuverte, resteAFacturer } from '../lib/ventes';
import { statutClient, REGLE_CLIENT } from '../lib/statuts';
import { useConfirm, useToast } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { useDebounce } from '../hooks/useDebounce';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import { pickContacts, isContactPickerSupported } from '../lib/contactPicker';
import { useFormValidation, clientSchema } from '../lib/validation';
import { CLIENT_TYPES } from '../lib/constants';
import { formatClientName, formatMoney as fmtMoney } from '../lib/formatters';
import { usePermissions } from '../hooks/usePermissions';
import { dateLue } from '../lib/dates';
import { telInternational } from '../lib/messageRelance';
import { ouvrirLienExterne } from '../lib/natif';
import QuickClientModal from './QuickClientModal';
import FicheClient from './clients/FicheClient';
import TableauClients, { Surligne } from './clients/TableauClients';
import { villeDe, lienTel } from './clients/outils';

const FORMULAIRE_VIDE = { nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', notes: '', categorie: '', siret: '', tva_intra: '' };

// Ce que dit chaque choix de la rangée de statuts (une phrase, la règle écrite dans src/lib/statuts.js)
const REGLE_SEGMENT = {
  adu: 'Clients qui ont une facture à encaisser.',
  actif: 'Un chantier est en cours ou prévu, ou un devis est envoyé ou signé.',
  prospect: REGLE_CLIENT.prospect,
  inactif: REGLE_CLIENT.inactif,
};

/** Fenêtre ouverte par-dessus ? (Échap la ferme d'abord : on ne ferme pas la fiche derrière.) */
const fenetreOuverte = () => !!document.querySelector('[role="dialog"]');

export default function Clients({ clients, setClients, updateClient, deleteClient: deleteClientProp, devis, chantiers, echanges = [], onSubmit, couleur, setPage, setSelectedChantier, setSelectedDevis, isDark, createMode, setCreateMode, modeDiscret, memos = [], addMemo, toggleMemo, onImportClients, entreprise, nouveauDevisPour, nouveauChantierPour, ouvrirDevis }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { addClient: ctxAddClient, updateDevis: ctxUpdateDevis, updateChantier: ctxUpdateChantier, paiements = [] } = useData();
  // Droits : chaque action réservée passe par canPerform ; sans le droit de voir les prix (chef de chantier, ouvrier :
  // canViewPrices, une seule règle), aucun montant dans la liste ni dans la fiche
  const { canPerform, canViewPrices } = usePermissions();
  const peutCreer = canPerform('client', 'create');
  const peutResoudreDoublons = canPerform('client', 'edit') && canPerform('client', 'delete');

  // Ce que chaque client doit (reste des factures ouvertes : la règle de src/lib/ventes.js) et son dernier devis — pour la ligne de liste.
  const dueParClient = useMemo(() => {
    const m = new Map();
    (devis || []).forEach((d) => {
      if (!d.client_id || !estOuverte(d, paiements)) return;
      m.set(d.client_id, (m.get(d.client_id) || 0) + resteAPayer(d, paiements));
    });
    return m;
  }, [devis, paiements]);
  const dernierDevisParClient = useMemo(() => {
    const m = new Map();
    (devis || []).forEach((d) => {
      if (d.type !== 'devis' || !d.client_id || !d.date) return;
      if (!m.has(d.client_id) || d.date > m.get(d.client_id)) m.set(d.client_id, d.date);
    });
    return m;
  }, [devis]);
  const dateCreation = (c) => new Date(c.createdAt || c.created_at || 0).getTime() || 0;
  const { errors, validate, validateAll, clearErrors, clearFieldError } = useFormValidation(clientSchema);
  const [showDupeConfirm, setShowDupeConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [importingContacts, setImportingContacts] = useState(false);
  const [bilanContacts, setBilanContacts] = useState(null); // null | { importes, total } : l'import depuis le répertoire s'est arrêté
  const contactPickerOk = isContactPickerSupported();

  // Import en masse depuis le répertoire téléphone (dédup + un seul toast récap)
  const handleImportFromContacts = async () => {
    setImportingContacts(true);
    try {
      const picked = await pickContacts({ multiple: true });
      if (!picked.length) return;
      const digits = (p) => (p || '').replace(/\D/g, '');
      const phones = new Set((clients || []).map((c) => digits(c.telephone)).filter(Boolean));
      const emails = new Set((clients || []).map((c) => (c.email || '').toLowerCase()).filter(Boolean));
      let added = 0, skipped = 0, arrete = false;
      for (const c of picked) {
        const ph = digits(c.telephone), em = (c.email || '').toLowerCase();
        if ((ph && phones.has(ph)) || (em && emails.has(em))) { skipped++; continue; }
        const cree = await ctxAddClient({ ...c, categorie: 'Particulier' });
        if (!cree) { arrete = true; break; } // refus (limite du plan, droits) : DataContext l'a dit, on s'arrête
        if (ph) phones.add(ph);
        if (em) emails.add(em);
        added++;
      }
      if (arrete) {
        // Même règle que l'import d'un fichier : dire ce qui a été enregistré, sans écraser le message de refus de DataContext
        // (un seul message à la fois : le bilan passe dans une fenêtre)
        setBilanContacts({ importes: added, total: picked.length - skipped });
      } else if (added > 0) {
        showToast(`${added} contact${added > 1 ? 's' : ''} importé${added > 1 ? 's' : ''}${skipped ? ` · ${skipped} déjà présent${skipped > 1 ? 's' : ''}` : ''}`, 'success');
      } else {
        showToast('Ces contacts sont déjà dans vos clients', 'info');
      }
    } catch {
      // Annulation utilisateur → silencieux
    } finally {
      setImportingContacts(false);
    }
  };

  // Montants au format français : centimes seulement s'il y en a (« 2 337,50 € », plus « 2 337,5 € ») ;
  // arrondis à l'euro dans les tuiles de chiffres (d = 0).
  const formatMoney = (n, d) => (modeDiscret ? '·····' : fmtMoney(n || 0, d));

  const [show, setShow] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [sortBy, setSortBy] = useState('recent'); // recent, name, ca, activite
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // '' | 'adu' | 'actif' | 'prospect' | 'inactif'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' : la liste · 'list' : le tableau
  // Recherche / Filtres / Trier : boîte à outils commune (ui/Filtres.jsx, recette du 9 oct.).
  const [volet, setVolet] = useState(null); // null | 'filtres' | 'tri'
  const boutonFiltresRef = useRef(null);
  const boutonTriRef = useRef(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(() => {
    try { return localStorage.getItem('clientDuplicateDismissed') === 'true'; } catch { return false; }
  });

  // Détection des doublons dans le formulaire (téléphone, e-mail)
  const { phoneDuplicates, emailDuplicates, strongDuplicates, checkField: checkDupeField, clearAll: clearDupes } = useDuplicateCheck(clients, editId, 300);

  // Le menu « + » de l'en-tête demande la création : sans le droit de créer un client, rien ne s'ouvre
  useEffect(() => { if (createMode) { if (peutCreer) setShow(true); setCreateMode?.(false); } }, [createMode, setCreateMode, peutCreer]);

  const fermerFormulaire = () => { setShow(false); setEditId(null); setForm(FORMULAIRE_VIDE); clearErrors(); clearDupes(); };

  // Échap : ferme le formulaire, puis la fiche (jamais quand une fenêtre est ouverte par-dessus : c'est elle qui se ferme)
  useEffect(() => {
    const surEchap = (e) => {
      if (e.key !== 'Escape' || fenetreOuverte()) return;
      if (show) fermerFormulaire();
      else if (viewId) setViewId(null);
    };
    document.addEventListener('keydown', surEchap);
    return () => document.removeEventListener('keydown', surEchap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, viewId]);

  // Ce que chaque client a : documents, chantiers, encaissé, reste (src/lib/ventes.js : une seule définition)
  const clientStatsMap = useMemo(() => {
    const map = new Map();
    const vide = { devis: 0, factures: 0, ca: 0, caEnCours: 0, chantiers: 0, chantiersEnCours: 0, chantiersActifs: 0, devisActifs: 0 };
    (devis || []).forEach((d) => {
      const cid = d.client_id;
      if (!cid) return;
      if (!map.has(cid)) map.set(cid, { ...vide });
      const s = map.get(cid);
      if (d.type === 'devis') s.devis++;
      if (d.type === 'facture') s.factures++;
      // Encaissé : ce que les factures ont reçu (acomptes et paiements partiels compris) ; en cours : reste dû
      // des factures ouvertes + part non facturée des devis signés.
      s.ca += encaisse(d, paiements);
      s.caEnCours += estOuverte(d, paiements) ? resteAPayer(d, paiements) : resteAFacturer(d, devis);
      if (d.type === 'devis' && ['envoye', 'vu', 'accepte', 'signe', 'acompte_facture'].includes(d.statut)) s.devisActifs++;
    });
    (chantiers || []).forEach((ch) => {
      const cid = ch.client_id || ch.clientId;
      if (!cid) return;
      if (!map.has(cid)) map.set(cid, { ...vide });
      const s = map.get(cid);
      s.chantiers++;
      if (ch.statut === 'en_cours') s.chantiersEnCours++;
      if (ch.statut !== 'archive' && ch.statut !== 'abandonne' && ch.statut !== 'termine') s.chantiersActifs++;
    });
    for (const st of map.values()) { st.ca = Math.round(st.ca * 100) / 100; st.caEnCours = Math.round(st.caEnCours * 100) / 100; }
    return map;
  }, [devis, chantiers, paiements]);

  const getClientStats = (id) => clientStatsMap.get(id) || { devis: 0, factures: 0, ca: 0, chantiers: 0, chantiersEnCours: 0, chantiersActifs: 0, devisActifs: 0 };

  // Le statut d'un client : la règle est dans src/lib/statuts.js (statutClient), une seule pour la liste, la fiche et les filtres
  const getClientStatus = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return statutClient(getClientStats(clientId), client?.created_at || client?.createdAt);
  };

  // Doublons : même téléphone OU même e-mail
  const duplicateMap = useMemo(() => {
    const map = new Map(); // clientId → [ids des doublons]
    const parTel = new Map();
    const parMail = new Map();
    clients.forEach((c) => {
      const tel = c.telephone?.replace(/[\s.\-()]/g, '');
      if (tel && tel.length >= 6) {
        if (!parTel.has(tel)) parTel.set(tel, []);
        parTel.get(tel).push(c.id);
      }
      const mail = c.email?.toLowerCase().trim();
      if (mail && mail.includes('@')) {
        if (!parMail.has(mail)) parMail.set(mail, []);
        parMail.get(mail).push(c.id);
      }
    });
    const ajouter = (ids) => {
      if (ids.length < 2) return;
      ids.forEach((id) => {
        if (!map.has(id)) map.set(id, new Set());
        ids.forEach((autre) => { if (autre !== id) map.get(id).add(autre); });
      });
    };
    parTel.forEach((ids) => ajouter(ids));
    parMail.forEach((ids) => ajouter(ids));
    const resultat = new Map();
    map.forEach((dupes, id) => { if (dupes.size > 0) resultat.set(id, [...dupes]); });
    return resultat;
  }, [clients]);

  const getDuplicateOf = (clientId) => {
    const ids = duplicateMap.get(clientId);
    if (!ids || ids.length === 0) return [];
    return ids.map((id) => clients.find((c) => c.id === id)).filter(Boolean);
  };

  // Fusion : on garde la cible, on lui transfère les données du doublon, puis on supprime le doublon
  const mergeClients = async (targetId, sourceId) => {
    const target = clients.find((c) => c.id === targetId);
    const source = clients.find((c) => c.id === sourceId);
    if (!target || !source) return;

    const confirmed = await confirm({
      title: 'Fusionner les clients',
      message: `Fusionner "${source.nom} ${source.prenom || ''}" dans "${target.nom} ${target.prenom || ''}" ?\n\nLes informations manquantes seront complétées et les documents transférés. Le doublon sera supprimé.`,
    });
    if (!confirmed) return;

    // Une facture émise ne change pas de client (la base le refuse, migration 093) : vérifié AVANT tout transfert
    const facturesEmisesDuDoublon = (devis || []).filter((d) => d.client_id === sourceId && d.type === 'facture' && d.statut !== 'brouillon');
    if (facturesEmisesDuDoublon.length > 0) {
      showToast(`Fusion impossible : « ${source.nom} » a ${facturesEmisesDuDoublon.length} facture${facturesEmisesDuDoublon.length > 1 ? 's' : ''} émise${facturesEmisesDuDoublon.length > 1 ? 's' : ''}, qui ne change${facturesEmisesDuDoublon.length > 1 ? 'nt' : ''} pas de client. Gardez plutôt ce client-là et fusionnez l'autre dans celui-ci.`, 'error');
      return;
    }

    const merged = {};
    ['prenom', 'entreprise', 'email', 'telephone', 'adresse', 'notes', 'categorie', 'siret', 'tva_intra'].forEach((field) => {
      if (!target[field] && source[field]) merged[field] = source[field];
    });
    if (target.notes && source.notes && target.notes !== source.notes) merged.notes = `${target.notes}\n---\n${source.notes}`;

    // Chaque étape passe par DataContext (base + écran) et s'arrête au premier refus, AVANT de supprimer le doublon.
    const interrompre = () => {
      showToast('Fusion interrompue : rien n\'a été supprimé. Les documents déjà transférés restent sur le client conservé.', 'error');
    };
    if (Object.keys(merged).length > 0 && updateClient) {
      if (!(await updateClient(targetId, merged))) return interrompre();
    }
    for (const d of (devis || []).filter((x) => x.client_id === sourceId)) {
      if (!(await ctxUpdateDevis(d.id, { client_id: targetId }))) return interrompre();
    }
    for (const ch of (chantiers || []).filter((x) => (x.client_id || x.clientId) === sourceId)) {
      if (!(await ctxUpdateChantier(ch.id, { client_id: targetId, clientId: targetId }))) return interrompre();
    }
    if (deleteClientProp) {
      if (!(await deleteClientProp(sourceId))) return interrompre();
    } else {
      setClients(clients.filter((c) => c.id !== sourceId));
    }

    showToast('Clients fusionnés', 'success');
    setViewId(targetId);
  };

  // Données de test : masquées en production, repérées en développement
  const isTestClient = (c) => {
    if (c.isTestData) return true;
    const nom = (c.nom || '').toLowerCase();
    const entrepriseNom = (c.entreprise || '').toLowerCase();
    return /^(clientpersist|test_|testclient)/i.test(c.nom || '') || /^(clientpersist|test_|testclient)/i.test(c.entreprise || '') || nom.includes('test') || entrepriseNom.includes('test');
  };
  const isProduction = typeof __DEV__ !== 'undefined' ? !__DEV__ : (import.meta.env?.PROD ?? true);
  const displayClients = useMemo(() => (isProduction ? clients.filter((c) => !isTestClient(c)) : clients), [clients, isProduction]);

  // La colonne « Type » du tableau seulement si au moins 20 % des clients ont une catégorie
  const showTypeColumn = useMemo(() => {
    if (displayClients.length === 0) return false;
    const avecType = displayClients.filter((c) => c.categorie && c.categorie.trim()).length;
    return (avecType / displayClients.length) >= 0.2;
  }, [displayClients]);

  const nbADu = useMemo(() => displayClients.filter((c) => (dueParClient.get(c.id) || 0) > 0).length, [displayClients, dueParClient]);

  const filtered = displayClients.filter((c) => {
    const q = debouncedSearch?.toLowerCase() || '';
    const matchSearch = !q
      || c.nom?.toLowerCase().includes(q)
      || c.prenom?.toLowerCase().includes(q)
      || c.entreprise?.toLowerCase().includes(q)
      || c.telephone?.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      || c.email?.toLowerCase().includes(q)
      || c.adresse?.toLowerCase().includes(q);
    const matchCat = !filterCategorie || c.categorie === filterCategorie;
    let matchStatus = true;
    if (filterStatus === 'adu') matchStatus = (dueParClient.get(c.id) || 0) > 0;
    else if (filterStatus === 'actif') matchStatus = ['actif', 'en_devis'].includes(getClientStatus(c.id));
    else if (filterStatus) matchStatus = getClientStatus(c.id) === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  // Dernière activité d'un client (pour le tri et l'affichage)
  const getLastActivity = (clientId) => {
    let latest = 0;
    const regarder = (dateStr) => {
      if (!dateStr) return;
      const t = new Date(dateStr).getTime();
      if (t > latest && !Number.isNaN(t)) latest = t;
    };
    (devis || []).forEach((d) => {
      if (d.client_id === clientId) { regarder(d.created_at); regarder(d.updated_at); regarder(d.date); }
    });
    (chantiers || []).forEach((ch) => {
      if ((ch.client_id || ch.clientId) === clientId) { regarder(ch.created_at); regarder(ch.updated_at); regarder(ch.date_debut); }
    });
    regarder(clients.find((c) => c.id === clientId)?.updated_at);
    return latest;
  };

  const getSortedClients = () => {
    const sorted = [...filtered];
    const sens = sortDir === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'name': return sorted.sort((a, b) => sens * (a.nom || '').localeCompare(b.nom || ''));
      case 'ca': return sorted.sort((a, b) => sens * (getClientStats(a.id).ca - getClientStats(b.id).ca));
      case 'activite': return sorted.sort((a, b) => sens * (getLastActivity(a.id) - getLastActivity(b.id)));
      default: return sorted.sort((a, b) => sens * (dateCreation(a) - dateCreation(b)));
    }
  };

  const doSubmit = async (trimmedForm) => {
    const wasEditing = editId;
    // Le résultat dit si la base a confirmé. En cas de refus, DataContext l'a déjà expliqué : le formulaire
    // reste ouvert avec la saisie. Le message de succès vient de l'enveloppe d'App.jsx (un seul message).
    let reussi;
    try {
      if (editId) {
        if (updateClient) {
          reussi = await updateClient(editId, trimmedForm);
        } else {
          setClients(clients.map((c) => (c.id === editId ? { ...c, ...trimmedForm } : c)));
          reussi = true;
        }
      } else {
        reussi = await onSubmit(trimmedForm);
      }
    } catch (error) {
      console.error('Error saving client:', error);
      showToast('Le client n\'a pas été enregistré. Réessayez.', 'error');
      return;
    }
    if (!reussi) return;
    fermerFormulaire();
    if (wasEditing) setViewId(wasEditing);
  };

  const submit = async () => {
    const trimmedForm = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
    setForm(trimmedForm);
    if (!validateAll(trimmedForm)) {
      showToast('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }
    // Doublon fort (téléphone, e-mail) : à la création seulement, pas à la modification
    if (!editId && strongDuplicates.length > 0) {
      setPendingSubmit(trimmedForm);
      setShowDupeConfirm(true);
      return;
    }
    await doSubmit(trimmedForm);
  };

  const startEdit = (client) => {
    setForm({ ...FORMULAIRE_VIDE, nom: client.nom || '', prenom: client.prenom || '', entreprise: client.entreprise || '', email: client.email || '', telephone: client.telephone || '', adresse: client.adresse || '', notes: client.notes || '', categorie: client.categorie || '' });
    clearErrors();
    setEditId(client.id);
    setViewId(null); // la fiche se ferme : le formulaire prend sa place
    setShow(true);
  };
  const callPhone = (tel) => { if (tel) window.location.href = lienTel(tel); };
  const sendWhatsApp = (tel, prenom) => { if (tel) ouvrirLienExterne(`https://wa.me/${telInternational(tel)}?text=${encodeURIComponent(`Bonjour ${prenom || ''},`)}`); };

  const handleDeleteClient = async (id) => {
    const client = clients.find((c) => c.id === id);
    const stats = getClientStats(id);
    const hasData = stats.chantiers > 0 || stats.devis > 0 || stats.factures > 0;
    const message = hasData
      ? `Supprimer ${client?.nom || 'ce client'} ? Ce client a ${stats.chantiers} chantier(s) et ${stats.devis + stats.factures} document(s) associés. Cette action est irréversible.`
      : `Supprimer ${client?.nom || 'ce client'} ? Cette action est irréversible.`;
    // Un client qui a des factures ne se supprime pas : elles resteraient « sans client », alors qu'elles
    // doivent être conservées 10 ans avec le nom et l'adresse de l'acheteur.
    if (stats.factures > 0) {
      showToast(`Impossible de supprimer ${client?.nom || 'ce client'} : il a ${stats.factures} facture${stats.factures > 1 ? 's' : ''}, à conserver 10 ans.`, 'error');
      return;
    }
    // Un devis signé est la preuve du contrat : il resterait sans client (la base refuse aussi, migration 093)
    if ((devis || []).some((d) => d.client_id === id && (d.signature || d.signature_data))) {
      showToast(`Impossible de supprimer ${client?.nom || 'ce client'} : il a un devis signé, à conserver.`, 'error');
      return;
    }
    const confirmed = await confirm({ title: 'Supprimer le client', message });
    if (confirmed) {
      if (deleteClientProp) {
        if (!(await deleteClientProp(id))) return; // refus : DataContext l'a dit, la fiche reste
      } else {
        setClients(clients.filter((c) => c.id !== id));
      }
      setViewId(null);
    }
  };

  // Création rapide : la fiche du client s'ouvre ensuite
  const handleQuickSubmit = async (data) => {
    const newClient = await onSubmit(data);
    if (!newClient) return null; // refusé : la fenêtre reste ouverte (le message vient de DataContext)
    setShowQuickModal(false);
    if (newClient?.id) setViewId(newClient.id);
    return newClient;
  };

  const fenetreRapide = (
    <QuickClientModal
      isOpen={showQuickModal} onClose={() => setShowQuickModal(false)} onSubmit={handleQuickSubmit}
      isDark={isDark} couleur={couleur} existingClients={clients}
      onViewClient={(id) => { setShowQuickModal(false); setViewId(id); }}
    />
  );

  // ====== Fiche d'un client ======
  if (viewId) {
    const client = clients.find((c) => c.id === viewId);
    if (!client) { setViewId(null); return null; }
    return (
      <FicheClient
        key={client.id}
        client={client}
        stats={getClientStats(client.id)}
        statut={getClientStatus(client.id)}
        clientDevis={(devis || []).filter((d) => d.client_id === client.id)}
        clientChantiers={(chantiers || []).filter((c) => (c.client_id || c.clientId) === client.id)}
        doublons={getDuplicateOf(client.id)}
        resteDu={dueParClient.get(client.id) || 0}
        echanges={echanges} memos={memos} devis={devis} entreprise={entreprise}
        modeDiscret={modeDiscret} isDark={isDark} couleur={couleur} formatMoney={formatMoney}
        onRetour={() => setViewId(null)} onModifier={startEdit} onSupprimer={handleDeleteClient} onFusionner={mergeClients} onVoirClient={setViewId}
        updateClient={updateClient} addMemo={addMemo} toggleMemo={toggleMemo}
        nouveauDevisPour={nouveauDevisPour} nouveauChantierPour={nouveauChantierPour} ouvrirDevis={ouvrirDevis}
        setPage={setPage} setSelectedChantier={setSelectedChantier} setSelectedDevis={setSelectedDevis}
      />
    );
  }

  // ====== Formulaire (modification, ou création complète) ======
  if (show) {
    const lienDoublon = (autres, cle) => (autres.length > 0 ? (
      <p className="mt-1.5 flex items-start gap-1.5 text-sm text-alerte-texte">
        <AlertTriangle size={15} aria-hidden="true" className="shrink-0 mt-0.5" />
        <span>
          Un client avec {cle === 'telephone' ? 'ce téléphone' : 'cet e-mail'} existe déjà : <strong>{autres[0].nom} {autres[0].prenom || ''}</strong>
          <button type="button" onClick={() => { fermerFormulaire(); setViewId(autres[0].id); }} className="ml-1 underline font-semibold">Voir la fiche</button>
        </span>
      </p>
    ) : null);
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-2">
          <BoutonIcone icone={ArrowLeft} libelle="Retour" onClick={fermerFormulaire} className="-ml-2" />
          <h2 className="text-2xl font-bold text-encre">{editId ? 'Modifier' : 'Nouveau'} client</h2>
        </div>
        <Carte marge="large">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Champ
              id="client-nom" libelle="Nom" aria-required="true" erreur={errors.nom} value={form.nom}
              onChange={(e) => { setForm((p) => ({ ...p, nom: e.target.value })); if (errors.nom) clearFieldError('nom'); }}
              onBlur={() => validate('nom', form.nom, form)}
            />
            <Champ id="client-prenom" libelle="Prénom" facultatif value={form.prenom} onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))} />
            <Champ id="client-entreprise" libelle="Entreprise" facultatif value={form.entreprise} onChange={(e) => setForm((p) => ({ ...p, entreprise: e.target.value }))} />
            <div>
              <Champ
                id="client-telephone" libelle="Téléphone" facultatif type="tel" placeholder="06 12 34 56 78" erreur={errors.telephone} value={form.telephone}
                onChange={(e) => { setForm((p) => ({ ...p, telephone: e.target.value })); if (errors.telephone) clearFieldError('telephone'); checkDupeField('telephone', e.target.value); }}
                onBlur={() => validate('telephone', form.telephone, form)}
              />
              {lienDoublon(phoneDuplicates, 'telephone')}
            </div>
            <div>
              <Champ
                id="client-email" libelle="E-mail" facultatif type="email" placeholder="client@email.com" erreur={errors.email} value={form.email}
                onChange={(e) => { setForm((p) => ({ ...p, email: e.target.value })); if (errors.email) clearFieldError('email'); checkDupeField('email', e.target.value); }}
                onBlur={() => validate('email', form.email, form)}
              />
              {lienDoublon(emailDuplicates, 'email')}
            </div>
            <Champ id="client-categorie" as="select" libelle="Catégorie" facultatif value={form.categorie} onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value }))}>
              <option value="">Non définie</option>
              {CLIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Champ>
            <Champ id="client-adresse" as="textarea" libelle="Adresse" facultatif rows={2} className="sm:col-span-2" value={form.adresse} onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))} />
            {/* Facturation électronique : à partir de septembre 2026, une facture adressée à un professionnel doit porter son
                SIRET. Sans lui, elle sera rejetée par les plateformes agréées. */}
            <Champ id="client-siret" libelle="SIRET" facultatif aide="À renseigner pour un client professionnel." inputMode="numeric" maxLength={17} placeholder="123 456 789 00012" value={form.siret} onChange={(e) => setForm((p) => ({ ...p, siret: e.target.value }))} />
            <Champ id="client-tva" libelle="N° de TVA intracommunautaire" facultatif placeholder="FR12345678900" value={form.tva_intra} onChange={(e) => setForm((p) => ({ ...p, tva_intra: e.target.value }))} />
            <Champ
              id="client-notes" as="textarea" libelle="Notes internes" facultatif rows={3} maxLength={500} className="sm:col-span-2"
              placeholder="Ex: Code portail A1234, sonnette 2ème gauche, préfère être contacté le matin..."
              aide={`${form.notes?.length || 0} / 500`} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-bord">
            <Bouton variante="secondaire" onClick={fermerFormulaire}>Annuler</Bouton>
            <Bouton variante="principal" icone={Check} onClick={submit}>{editId ? 'Enregistrer' : 'Créer'}</Bouton>
          </div>
        </Carte>
      </div>
    );
  }

  // ====== Liste ======
  const TRIS = [['recent-desc', 'Plus récents'], ['name-asc', 'Nom de A à Z'], ['name-desc', 'Nom de Z à A'], ...(canViewPrices ? [['ca-desc', "Chiffre d'affaires encaissé"]] : []), ['activite-desc', 'Activité récente']];
  const triCourant = `${sortBy}-${sortDir}`;
  const nbFiltres = filterCategorie ? 1 : 0;
  const toutEffacer = () => { setFilterCategorie(''); setFilterStatus(''); };
  const puces = [
    filterCategorie && { cle: 'type', libelle: filterCategorie, onRetirer: () => setFilterCategorie('') },
  ].filter(Boolean);
  const aucunClient = displayClients.length === 0;
  const sousTitre = [
    `${displayClients.length} contact${displayClients.length !== 1 ? 's' : ''}`,
    canViewPrices && nbADu > 0 ? `${nbADu} à encaisser` : null,
  ].filter(Boolean).join(' · ');
  const segments = [
    { valeur: '', libelle: 'Tous' },
    ...(canViewPrices ? [{ valeur: 'adu', libelle: 'À encaisser', compte: nbADu }] : []),
    { valeur: 'actif', libelle: 'Actifs' },
    { valeur: 'prospect', libelle: 'Prospects' },
    { valeur: 'inactif', libelle: 'Inactifs' },
  ];

  return (
    <div className="space-y-3">
      {fenetreRapide}

      {/* Import depuis le répertoire arrêté en route : ce qui a été enregistré, dit une fois (le refus lui-même est déjà affiché) */}
      <Modal isOpen={!!bilanContacts} onClose={() => setBilanContacts(null)} size="sm">
        <ModalHeader>
          <ModalTitle>Importation incomplète</ModalTitle>
          <ModalDescription>
            {bilanContacts?.importes} contact{bilanContacts?.importes > 1 ? 's' : ''} importé{bilanContacts?.importes > 1 ? 's' : ''} sur {bilanContacts?.total} : l'import s'est arrêté.
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-encre-2">Les autres contacts n'ont pas été enregistrés.</p>
        </ModalBody>
        <ModalFooter>
          <Bouton variante="principal" onClick={() => setBilanContacts(null)}>Fermer</Bouton>
        </ModalFooter>
      </Modal>

      {/* Doublon détecté à la création : on demande avant de créer */}
      <Modal isOpen={showDupeConfirm && !!pendingSubmit} onClose={() => { setShowDupeConfirm(false); setPendingSubmit(null); }} size="sm">
        <ModalHeader>
          <ModalTitle>Doublon potentiel détecté</ModalTitle>
          <ModalDescription>Ce client semble être un doublon de :</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-2">
          {strongDuplicates.map((dup) => (
            <div key={dup.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-bord bg-surface-2">
              <div className="min-w-0">
                <p className="font-semibold text-base text-encre truncate">{dup.nom} {dup.prenom || ''}</p>
                <p className="text-sm text-encre-2">
                  {dup.matchReason}
                  {dup.matchField === 'telephone' && dup.telephone && ` · ${dup.telephone}`}
                  {dup.matchField === 'email' && dup.email && ` · ${dup.email}`}
                </p>
              </div>
              <Bouton variante="secondaire" taille="compacte" onClick={() => { setShowDupeConfirm(false); setPendingSubmit(null); setShow(false); setEditId(null); clearDupes(); setViewId(dup.id); }}>Voir la fiche</Bouton>
            </div>
          ))}
        </ModalBody>
        <ModalFooter>
          <Bouton variante="secondaire" onClick={() => { setShowDupeConfirm(false); setPendingSubmit(null); }}>Annuler</Bouton>
          <Bouton variante="principal" onClick={async () => { setShowDupeConfirm(false); await doSubmit(pendingSubmit); setPendingSubmit(null); }}>Créer quand même</Bouton>
        </ModalFooter>
      </Modal>

      <EnTetePage
        titre="Clients"
        sousTitre={sousTitre}
        actions={(
          <>
            <MenuActions
              titre="Importer des clients"
              actions={[
                { libelle: 'Importer un fichier (CSV)', icone: Upload, onClick: () => onImportClients?.(), masque: !onImportClients || !peutCreer },
                { libelle: importingContacts ? 'Ouverture du répertoire…' : 'Importer depuis mes contacts', icone: Smartphone, onClick: handleImportFromContacts, masque: !contactPickerOk || !peutCreer || importingContacts },
              ]}
            />
            {peutCreer && !aucunClient && (
              <Bouton variante="principal" icone={Plus} onClick={() => setShowQuickModal(true)}>Nouveau client</Bouton>
            )}
          </>
        )}
      />

      {/* Doublons : un bandeau discret, avec les premières paires à résoudre (seulement pour qui peut fusionner) */}
      {!duplicateDismissed && peutResoudreDoublons && duplicateMap.size > 0 && (() => {
        const nbDoublons = Math.ceil(duplicateMap.size / 2);
        const paires = [];
        const vus = new Set();
        duplicateMap.forEach((dupes, clientId) => {
          if (vus.has(clientId)) return;
          const a = clients.find((c) => c.id === clientId);
          if (!a) return;
          dupes.forEach((dupeId) => {
            if (vus.has(dupeId)) return;
            const b = clients.find((c) => c.id === dupeId);
            if (!b) return;
            paires.push({ a, b });
            vus.add(clientId);
            vus.add(dupeId);
          });
        });
        return (
          <div className="rounded-2xl bg-alerte-fond text-alerte-texte overflow-hidden">
            <div className="flex items-center gap-2 pl-4 pr-1 py-1">
              <AlertTriangle size={18} aria-hidden="true" className="shrink-0" />
              <p className="flex-1 min-w-0 py-2 text-sm font-semibold">
                {nbDoublons} doublon{nbDoublons > 1 ? 's' : ''} détecté{nbDoublons > 1 ? 's' : ''} : résolvez-les pour garder votre base propre
              </p>
              <BoutonIcone
                icone={X} libelle="Masquer l'alerte des doublons"
                onClick={() => { setDuplicateDismissed(true); try { localStorage.setItem('clientDuplicateDismissed', 'true'); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ } }}
              />
            </div>
            <div className="border-t border-alerte-point/30 px-3 py-2 space-y-2 max-h-56 overflow-y-auto">
              {paires.slice(0, 5).map((paire, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-surface text-encre">
                  <p className="flex-1 min-w-[10rem] text-sm">
                    <span className="font-semibold">{formatClientName(paire.a)}</span>
                    <span className="mx-1.5 text-encre-3">↔</span>
                    <span className="font-semibold">{formatClientName(paire.b)}</span>
                    {paire.a.telephone && paire.b.telephone && paire.a.telephone.replace(/\s/g, '') === paire.b.telephone.replace(/\s/g, '') && <span className="ml-1.5 text-encre-2">· même téléphone</span>}
                    {paire.a.email && paire.b.email && paire.a.email.toLowerCase() === paire.b.email.toLowerCase() && <span className="ml-1.5 text-encre-2">· même e-mail</span>}
                  </p>
                  <Bouton variante="secondaire" taille="compacte" onClick={() => mergeClients(paire.a.id, paire.b.id)}>Fusionner</Bouton>
                  <Bouton variante="discret" taille="compacte" onClick={() => setViewId(paire.a.id)}>Comparer</Bouton>
                </div>
              ))}
              {paires.length > 5 && <p className="text-sm text-center text-encre-2">+{paires.length - 5} autre{paires.length - 5 > 1 ? 's' : ''}</p>}
            </div>
          </div>
        );
      })()}

      {/* Recherche, filtres, tri : la boîte à outils commune (ui/Filtres.jsx) */}
      {!aucunClient && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ChampRecherche valeur={search} onChange={setSearch} placeholder="Rechercher…" ariaLabel="Rechercher un client" className="flex-1" />
            <BoutonVolet ref={boutonFiltresRef} libelle="Filtres" compte={nbFiltres} ouvert={volet === 'filtres'} onClick={() => setVolet((v) => (v === 'filtres' ? null : 'filtres'))} libelleCacheTelephone />
            <BoutonVolet ref={boutonTriRef} icone={ArrowUpDown} libelle="Trier" valeur={TRIS.find((x) => x[0] === triCourant)?.[1]} ouvert={volet === 'tri'} onClick={() => setVolet((v) => (v === 'tri' ? null : 'tri'))} libelleCacheTelephone />
          </div>
          {displayClients.length > 1 && (
            <SegmentDefilant ariaLabel="Statut des clients" options={segments} valeur={filterStatus} onChange={setFilterStatus} />
          )}
          {filterStatus && REGLE_SEGMENT[filterStatus] && <p className="text-sm text-encre-3">{REGLE_SEGMENT[filterStatus]}</p>}
          <PucesActives puces={puces} onToutEffacer={toutEffacer} />

          <Volet
            ouvert={volet === 'filtres'} onFermer={() => setVolet(null)} titre="Filtres" ancreRef={boutonFiltresRef} largeur={340}
            pied={(
              <>
                <Bouton variante="discret" onClick={toutEffacer} disabled={!nbFiltres}>Tout effacer</Bouton>
                <Bouton variante="principal" className="flex-1" onClick={() => setVolet(null)}>Voir {filtered.length} client{filtered.length > 1 ? 's' : ''}</Bouton>
              </>
            )}
          >
            <ListeChoix
              titre="Type de client" rechercheAuDela={99}
              options={[{ valeur: '', libelle: 'Tous les types' }, ...CLIENT_TYPES.map((t) => ({ valeur: t, libelle: t }))]}
              valeur={filterCategorie} onChange={setFilterCategorie}
            />
          </Volet>

          <Volet ouvert={volet === 'tri'} onFermer={() => setVolet(null)} titre="Trier et afficher" ancreRef={boutonTriRef} largeur={320}>
            <ListeChoix
              titre="Trier par" rechercheAuDela={99}
              options={TRIS.map(([valeur, libelle]) => ({ valeur, libelle }))}
              valeur={triCourant} onChange={(v) => { const [tri, sens] = v.split('-'); setSortBy(tri); setSortDir(sens); setVolet(null); }}
            />
            <GroupeChoix
              titre="Affichage"
              options={[{ valeur: 'grid', libelle: 'Liste', icone: LayoutGrid }, { valeur: 'list', libelle: 'Tableau', icone: List }]}
              valeur={viewMode} onChange={(v) => { setViewMode(v); setVolet(null); }}
            />
          </Volet>
        </div>
      )}

      {filtered.length === 0 ? (
        <Carte marge="aucun">
          {(() => {
            // Premier usage : une icône, une phrase, une action pleine (celle de l'en-tête est masquée)
            if (aucunClient && !debouncedSearch) {
              return (
                <EtatVide
                  icone={Users} titre="Ajoutez votre premier client" texte="Un nom suffit pour commencer."
                  action={peutCreer ? (
                    <div className="flex flex-col items-center gap-2">
                      <Bouton variante="principal" icone={Plus} onClick={() => setShow(true)}>Ajouter un client</Bouton>
                      {contactPickerOk && (
                        <Bouton variante="discret" icone={Smartphone} onClick={handleImportFromContacts} disabled={importingContacts}>
                          {importingContacts ? 'Ouverture…' : 'Depuis mes contacts'}
                        </Bouton>
                      )}
                    </div>
                  ) : null}
                />
              );
            }
            if (debouncedSearch) {
              return (
                <EtatVide
                  icone={Search} titre={`Aucun résultat pour « ${debouncedSearch} »`} texte="Vérifiez l'orthographe ou créez un nouveau client."
                  action={peutCreer ? (
                    <Bouton variante="secondaire" icone={Plus} onClick={() => { setForm((p) => ({ ...p, nom: debouncedSearch })); setShow(true); setSearch(''); }}>
                      Créer « {debouncedSearch} » comme client
                    </Bouton>
                  ) : null}
                />
              );
            }
            if (filterCategorie || filterStatus) {
              return (
                <EtatVide
                  icone={Users} titre="Aucun client ne correspond à ce filtre"
                  texte={[filterStatus && REGLE_SEGMENT[filterStatus], filterCategorie && `Type : ${filterCategorie}`].filter(Boolean).join(' ')}
                  action={<Bouton variante="secondaire" icone={X} onClick={toutEffacer}>Effacer les filtres</Bouton>}
                />
              );
            }
            return <EtatVide icone={Users} titre="Aucun client trouvé" />;
          })()}
        </Carte>
      ) : viewMode === 'grid' ? (
        // Une ligne par client : qui, où, ce qu'il doit ou la date de son dernier devis, et appeler d'un geste. Le dernier
        // devis passe dans la méta (la colonne de droite prenait la place du nom au téléphone) ; la pastille « Actif » (le cas
        // normal) n'existe plus : seuls Prospect, Doublon et le montant à encaisser restent (audit UX du 20 oct. 2026).
        <GroupeListe>
          {getSortedClients().map((c) => {
            const statut = getClientStatus(c.id);
            const du = canViewPrices ? (dueParClient.get(c.id) || 0) : 0;
            const dernierDevis = dernierDevisParClient.get(c.id);
            // La date du dernier devis d'abord et abrégée : au téléphone, c'est la fin de la ligne qui est coupée (« devis du … »)
            const meta = [
              dernierDevis ? `devis ${dateLue(dernierDevis).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : null,
              c.entreprise,
              villeDe(c.adresse),
            ].filter(Boolean).join(' · ') || c.telephone || c.email || 'Coordonnées à compléter';
            return (
              <div key={c.id} className="flex items-center">
                <LigneListe
                  className="flex-1 min-w-0"
                  onClick={() => setViewId(c.id)}
                  chevron={!c.telephone}
                  aria-label={`Ouvrir la fiche de ${formatClientName(c)}`}
                  debut={<Avatar nom={formatClientName(c) || c.nom} />}
                  titre={<Surligne texte={formatClientName(c)} requete={debouncedSearch} />}
                  meta={meta}
                  montant={du > 0 ? formatMoney(du, 0) : undefined}
                  pastille={(() => {
                    // Sous le montant, son libellé : une ligne chacun (un montant sur deux lignes écartait le nom de sa méta)
                    const etat = duplicateMap.has(c.id) ? <Pastille ton="alerte">Doublon</Pastille> : statut === 'prospect' ? <Pastille ton="neutre">Prospect</Pastille> : null;
                    const libelleDu = du > 0 ? <span className="text-xs font-medium text-encre-3 whitespace-nowrap">à encaisser</span> : null;
                    return etat || libelleDu ? <span className="flex items-center gap-2">{etat}{libelleDu}</span> : undefined;
                  })()}
                />
                {c.telephone ? (
                  <BoutonIcone icone={Phone} libelle={`Appeler ${formatClientName(c)}`} variante="secondaire" onClick={() => callPhone(c.telephone)} className="mr-3" />
                ) : null}
              </div>
            );
          })}
        </GroupeListe>
      ) : (
        <TableauClients
          clients={getSortedClients()} statsDe={getClientStats} statutDe={getClientStatus} doublonsDe={(id) => duplicateMap.has(id)}
          derniereActivite={getLastActivity} afficherType={showTypeColumn} voitPrix={canViewPrices} formatMoney={formatMoney} requete={debouncedSearch}
          onOuvrir={setViewId} onAppeler={callPhone} onWhatsApp={sendWhatsApp} montrerTests={!isProduction} estTest={isTestClient}
        />
      )}
    </div>
  );
}
