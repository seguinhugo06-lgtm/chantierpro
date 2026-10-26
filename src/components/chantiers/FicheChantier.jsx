import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Archive, CalendarPlus, CheckCircle, CheckSquare, ChevronDown, Clock, Copy, Edit3, FileText, Plus, Receipt, Shield, UserCog, AlertTriangle } from 'lucide-react';
import { Onglets } from '../ui/Onglets';
import { Bouton } from '../ui/Bouton';
import Carte from '../ui/Carte';
import { PastilleStatut } from '../ui/Pastille';
import QuickChantierModal from '../QuickChantierModal';
import TaskGeneratorModal from '../TaskGeneratorModal';
import ChantierJournal from '../audit/ChantierJournal';
import ChantierGarantiesTab from './ChantierGarantiesTab';
import ReceptionForm from './ReceptionForm';
import InterventionForm from './InterventionForm';
import SituationsTravaux from './SituationsTravaux';
import EnTeteChantier from './EnTeteChantier';
import OngletApercu from './OngletApercu';
import OngletTaches from './OngletTaches';
import OngletPhotos from './OngletPhotos';
import OngletDocuments from './OngletDocuments';
import OngletFinances from './OngletFinances';
import OngletNotes from './OngletNotes';
import { FeuilleDepense, FeuilleHeures, DetailHeures, FeuilleAjustement, VisionneusePhoto } from './FenetresChantier';
import { useConfirm, useToast } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import supabase, { isDemo } from '../../supabaseClient';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { generateId } from '../../lib/utils';
import { formatClientName } from '../../lib/formatters';
import { CHANTIER_STATUS_LABELS, getAvailableChantierTransitions } from '../../lib/constants';
import { statut as lireStatut } from '../../lib/statuts';
import { estFranchiseTva } from '../../lib/franchiseTva';
import { montantsDepense } from '../../lib/tvaDepenses';
import { arrondi } from '../../lib/totauxDocument';
import { coutHoraire } from '../../lib/tauxEquipe';
import { budgetChantier, resteAFacturerChantier } from '../../lib/budgetChantier';
import { avancementChantier } from '../../lib/avancementChantier';
import { joursAvantFin, chantierEnRetard, joursSansActivite } from '../../lib/echeanceChantier';
import { jourLocal } from '../../lib/dates';
import { generateSmartTasks } from '../../lib/templates/task-templates-v2';
import { FONCTIONS } from '../../lib/fonctions';
import { getUserWeather, getChantierWeather } from '../../services/WeatherService';
import { getReception, createReception, updateReserve as updateReserveService, leverToutesReserves } from '../../services/receptionService';
import { getByChantier as getGarantiesByChantier } from '../../services/garantieService';
import { getByChantier as getInterventionsByChantier, create as createIntervention } from '../../services/interventionService';

const TON_STATUT = {
  neutre: 'bg-neutre-fond text-neutre-texte', info: 'bg-info-fond text-info-texte', succes: 'bg-succes-fond text-succes-texte',
  alerte: 'bg-alerte-fond text-alerte-texte', danger: 'bg-danger-fond text-danger-texte',
};
const DEPENSE_VIDE = { description: '', montant: '', categorie: 'Matériaux', catalogueId: '', quantite: 1, prixUnitaire: '', tauxTva: '', montantTva: '' };
const BILAN_VIDE = { totalDepenses: 0, revenuPrevu: 0, revenuTotal: 0, margeBrute: 0, tauxMarge: 0, adjRevenus: 0, adjDepenses: 0, mainOeuvre: 0 };

/**
 * La fiche d'un chantier — sortie de Chantiers.jsx le 25 oct. 2026 (passe « ancien code », audit UX du 20 oct.).
 * En haut : qui, où il en est, UNE action principale selon l'état (prospect : créer le devis ; en cours : ajouter une
 * dépense ; terminé : facturer le solde) et le reste dans « ⋯ ». Dessous, une seule rangée d'onglets : Aperçu, Tâches,
 * Photos, Documents, Finances, Notes, Journal. Avant : une page de six blocs (dont les finances deux fois), un bouton
 * « + » flottant sans libellé et onze onglets dans un menu « … ».
 */
export default function FicheChantier({
  id, chantiers, clients, depenses, pointages, equipe, devis, ajustements, memos = [], paiements = [], catalogue,
  entreprise, modeDiscret, isDark, couleur,
  addChantier, updateChantier, getChantierBilan, addAjustement, deleteAjustement, deductStock, addMemo, toggleMemo,
  setPage, onPlanEvent, addDevis, generateNextNumero, nouveauDevisPour, ouvrirDevis,
  onRetour, onOuvrir,
}) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { addDepense: ctxAddDepense, updateDepense: ctxUpdateDepense, deleteDepense: ctxDeleteDepense, addPointage: ctxAddPointage, updatePointage: ctxUpdatePointage, deletePointage: ctxDeletePointage } = useData();
  const { canPerform, canViewPrices: voitPrix } = usePermissions();
  const franchiseTva = estFranchiseTva(entreprise);

  const [onglet, setOnglet] = useState('apercu');
  const [nouvelleDepense, setNouvelleDepense] = useState(DEPENSE_VIDE);
  const [feuilleDepense, setFeuilleDepense] = useState(false);
  const [depenseEnCours, setDepenseEnCours] = useState(false);
  const [feuilleAjustement, setFeuilleAjustement] = useState(null); // 'REVENU' | 'DEPENSE'
  const [ajustement, setAjustement] = useState({ libelle: '', montant_ht: '' });
  const [ajustementEnCours, setAjustementEnCours] = useState(false);
  const [detailHeures, setDetailHeures] = useState(false);
  const [feuilleHeures, setFeuilleHeures] = useState(false);
  const [heuresEnCours, setHeuresEnCours] = useState(false);
  const [saisieHeures, setSaisieHeures] = useState({ employeId: '', date: jourLocal(), heures: '', note: '' });
  const [photoOuverte, setPhotoOuverte] = useState(null);
  const [animatedTaskId, setAnimatedTaskId] = useState(null);
  const [generateur, setGenerateur] = useState(false);
  const [weather, setWeather] = useState(null);
  const [enEdition, setEnEdition] = useState(null);
  const [formReception, setFormReception] = useState(false);
  const [formIntervention, setFormIntervention] = useState(null);
  const [reception, setReception] = useState(null);
  const [garanties, setGaranties] = useState([]);
  const [interventions, setInterventions] = useState([]);

  const ch = chantiers.find((c) => c.id === id);

  // Une autre fiche (précédent / suivant) : retour sur l'aperçu, en haut de page
  const idPrecedent = useRef(id);
  useEffect(() => {
    if (id !== idPrecedent.current) { setOnglet('apercu'); idPrecedent.current = id; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  // Fiche d'un chantier supprimé ou introuvable : retour à la liste
  useEffect(() => { if (!ch) onRetour(); }, [ch, onRetour]);

  // Météo du chantier (ou du lieu de l'artisan)
  useEffect(() => {
    if (!ch) return;
    if (ch.latitude && ch.longitude) getChantierWeather(ch).then(setWeather).catch(() => setWeather(null));
    else getUserWeather().then(setWeather).catch(() => setWeather(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Réception et garanties : éteintes (src/lib/fonctions.js), rien à charger
  useEffect(() => {
    if (!FONCTIONS.receptionChantier || !id) return;
    (async () => {
      try {
        const [r, g, i] = await Promise.all([getReception(id), getGarantiesByChantier(id), getInterventionsByChantier(id)]);
        setReception(r); setGaranties(g || []); setInterventions(i || []);
      } catch { /* les données se chargent à l'ouverture de l'onglet */ }
    })();
  }, [id]);

  const triggerPostChantierSequence = useCallback((chantier) => {
    // Écrit la suite du chantier terminé, sans l'annoncer : aucun envoi n'est encore branché sur ces étapes
    // (cp_post_chantier_executions n'est lue nulle part) ; l'ancien message « étapes planifiées » promettait des envois
    // qui ne partent pas (relecture de la Task 6).
    try {
      const sequence = JSON.parse(localStorage.getItem('cp_post_chantier_sequence') || '[]');
      const actives = sequence.filter((s) => s.active);
      if (actives.length === 0) return;
      const executions = actives.map((step) => ({
        id: `exec_${Date.now()}_${step.id}`, stepId: step.id, chantierId: chantier.id, clientId: chantier.clientId || chantier.client_id,
        scheduledDate: new Date(Date.now() + step.delay * 86400000).toISOString(), status: 'scheduled', template: step.template, channel: step.channel, label: step.label,
      }));
      const existantes = JSON.parse(localStorage.getItem('cp_post_chantier_executions') || '[]');
      localStorage.setItem('cp_post_chantier_executions', JSON.stringify([...existantes, ...executions]));
    } catch { /* suite non enregistrée : rien de critique */ }
  }, []);

  const formatMoney = useCallback((n) => (modeDiscret ? '·····' : (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'), [modeDiscret]);
  const formatPct = useCallback((n) => {
    if (modeDiscret) return '··%';
    const valeur = n || 0;
    const arrondie = Math.round(valeur);
    return Math.abs(valeur - arrondie) < 0.1 ? `${arrondie} %` : `${valeur.toFixed(1).replace('.', ',')} %`;
  }, [modeDiscret]);

  const mesDevis = useMemo(() => (ch ? devis.filter((d) => d.chantier_id === ch.id) : []), [devis, ch]);
  if (!ch) return null;

  // ── Droits : une action réservée n'est affichée qu'avec canPerform ──
  const peutModifier = canPerform('chantier', 'edit');
  const peutCreer = canPerform('chantier', 'create');
  const peutDepense = canPerform('depense', 'create');
  const peutDepenseModifier = canPerform('depense', 'edit');
  const peutDepenseSupprimer = canPerform('depense', 'delete');
  const peutPointer = canPerform('pointage', 'create');
  const peutPointageModifier = canPerform('pointage', 'edit');
  const peutPointageSupprimer = canPerform('pointage', 'delete');
  const peutDevis = canPerform('devis', 'create');
  const peutPlanifier = canPerform('planning', 'create') && !!onPlanEvent;
  const peutMemo = canPerform('memo', 'create');
  const peutMemoModifier = canPerform('memo', 'edit');

  // ── Chiffres ──
  const client = clients.find((c) => c.id === ch.client_id);
  const bilan = getChantierBilan(ch.id) || BILAN_VIDE;
  const mesDepenses = depenses.filter((d) => d.chantierId === ch.id);
  const mesPointages = pointages.filter((p) => p.chantierId === ch.id);
  const mesAjustements = (ajustements || []).filter((a) => a.chantierId === ch.id);
  const taches = ch.taches || [];
  const tasksDone = taches.filter((t) => t.done).length;
  const tasksTotal = taches.length;
  const devisLie = mesDevis.find((d) => d.type === 'devis');
  const avancement = avancementChantier(ch, bilan, tasksDone, tasksTotal);
  // Budget et reste à facturer : la même définition que la liste, son sous-titre et le bouton « Facturer le solde »
  const revenuTotal = budgetChantier(ch, bilan);
  // Facturé : les factures émises du chantier (avoirs déduits), pas le devis qu'elles facturent (compté deux fois)
  const totalFacture = mesDevis.filter((d) => d.type === 'facture' && d.statut !== 'brouillon').reduce((s, d) => s + (d.total_ht || 0), 0);
  const { ht: resteAFacturer, devis: devisASolder } = resteAFacturerChantier(ch, devis);
  const depensesFinales = avancement > 0 ? bilan.totalDepenses / (avancement / 100) : bilan.totalDepenses * 2;
  const benefice = bilan.revenuPrevu - depensesFinales;
  const prevision = avancement > 0 && avancement < 100 && revenuTotal > 0
    ? { depensesFinales, benefice, tauxMarge: bilan.revenuPrevu > 0 && bilan.hasDepenses ? (benefice / bilan.revenuPrevu) * 100 : null }
    : null;
  const mesPhotos = ch.photos || [];
  const totalPhotos = chantiers.reduce((s, c) => s + (c.photos?.length || 0), 0);
  const sousTraitants = FONCTIONS.sousTraitantsChantier ? (equipe || []).filter((m) => m.type === 'sous_traitant') : [];
  const echeance = joursAvantFin(ch);
  const inactif = joursSansActivite(ch);
  const prioritaires = taches.filter((t) => t.critical && !t.done).length;
  const alertes = [
    ...(inactif ? [{ cle: 'inactif', libelle: `Aucune activité depuis ${inactif} jours` }] : []),
    ...(prioritaires > 0 ? [{ cle: 'taches', libelle: `${prioritaires} tâche${prioritaires > 1 ? 's' : ''} prioritaire${prioritaires > 1 ? 's' : ''} à faire` }] : []),
  ];
  const modeSituation = ch.situations_data?.mode === 'situation';

  // ── Écritures : un message par geste, jamais de succès sans écriture ──
  // Les situations de travaux disent elles-mêmes ce qu'elles ont fait : l'écriture ne doit pas ajouter « Chantier mis à jour »
  const updateSilencieux = (chantierId, donnees) => updateChantier(chantierId, donnees, { silencieux: true });
  const modifier = async (donnees, message) => {
    const ok = await updateChantier(ch.id, donnees, { silencieux: true });
    if (ok && message) showToast(message, 'success');
    return ok;
  };
  // « Terminé » et « Abandonné » ferment le chantier : confirmation, et la date de fin est celle d'aujourd'hui
  const terminer = async () => {
    const confirme = await confirm({ title: 'Terminer le chantier', message: `Marquer « ${ch.nom} » comme terminé ? La date de fin sera celle d'aujourd'hui.` });
    if (!confirme) return;
    if (await modifier({ statut: 'termine', date_fin: jourLocal(), dateFin: jourLocal() }, 'Chantier marqué comme terminé')) triggerPostChantierSequence(ch);
  };
  const abandonner = async () => {
    const confirme = await confirm({ title: 'Abandonner le chantier', message: `Marquer « ${ch.nom} » comme abandonné ? La date de fin sera celle d'aujourd'hui.` });
    if (!confirme) return;
    await modifier({ statut: 'abandonne', date_fin: jourLocal(), dateFin: jourLocal() }, 'Chantier marqué comme abandonné');
  };
  const changerStatut = async (statut) => {
    if (statut === 'termine') { await terminer(); return; }
    if (statut === 'abandonne') { await abandonner(); return; }
    const ok = await modifier({ statut });
    if (ok) showToast(`Statut : ${CHANTIER_STATUS_LABELS[statut]}`, 'success');
  };
  const archiver = async () => {
    const confirme = await confirm({ title: 'Archiver', message: `Archiver le chantier « ${ch.nom} » ? Il ne sera plus visible dans la liste active.` });
    if (!confirme) return;
    if (await modifier({ statut: 'archive' }, 'Chantier archivé')) onRetour();
  };
  const restaurer = async () => { await modifier({ statut: 'termine' }, 'Chantier restauré'); };
  const dupliquer = async () => {
    const copie = {
      nom: `${ch.nom} (copie)`, client_id: ch.client_id, clientId: ch.client_id, adresse: ch.adresse, ville: ch.ville, codePostal: ch.codePostal,
      dateDebut: jourLocal(), date_debut: jourLocal(), dateFin: '', date_fin: '',
      budgetPrevu: ch.budget_estime || ch.budgetPrevu || 0, budget_estime: ch.budget_estime || ch.budgetPrevu || 0,
      budget_materiaux: ch.budget_materiaux || 0, heures_estimees: ch.heures_estimees || 0, description: ch.description || '', notes: ch.notes || '',
      taches: taches.map((t) => ({ ...t, id: generateId(), done: false })), photos: [], documents: [], messages: [], statut: 'prospect',
    };
    // Attendre le résultat : à la limite du plan, ou si la base refuse, rien n'est créé
    const creee = await addChantier(copie);
    if (creee?.id) onOuvrir(creee.id);
  };
  const modifierFiche = async (donnees) => {
    if (!donnees.id) return;
    const clientId = donnees.clientId || donnees.client_id || '';
    const ok = await modifier({
      nom: donnees.nom, client_id: clientId, clientId, adresse: donnees.adresse, ville: donnees.ville, codePostal: donnees.codePostal, code_postal: donnees.codePostal,
      dateDebut: donnees.dateDebut || donnees.date_debut || null, date_debut: donnees.date_debut || donnees.dateDebut || null,
      dateFin: donnees.dateFin || donnees.date_fin || null, date_fin: donnees.date_fin || donnees.dateFin || null,
      budgetPrevu: donnees.budgetPrevu || donnees.budget_estime || 0, budget_estime: donnees.budget_estime || donnees.budgetPrevu || 0,
      budget_materiaux: donnees.budget_materiaux || 0, heures_estimees: donnees.heures_estimees || 0, notes: donnees.notes, description: donnees.description,
    }, 'Chantier modifié');
    if (ok) setEnEdition(null);
  };

  // Photos : limite du plan, puis écriture ; « Photo ajoutée » seulement si la base l'a prise
  const ajouterPhoto = (e, categorie = 'pendant') => {
    const fichier = e.target.files?.[0];
    const champ = e.target;
    if (!fichier) return;
    const limite = useSubscriptionStore.getState().getLimit('photos');
    if (limite !== -1 && totalPhotos >= limite) {
      showToast(`Limite de ${limite} photos atteinte — passez à un plan supérieur pour en ajouter plus`, 'warning');
      useSubscriptionStore.getState().openUpgradeModal('photos');
      champ.value = '';
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = async () => {
      await modifier({ photos: [...mesPhotos, { id: generateId(), src: lecteur.result, categorie, date: new Date().toISOString() }] }, 'Photo ajoutée');
    };
    lecteur.onerror = () => showToast('Photo illisible : réessayez avec une autre', 'error');
    lecteur.readAsDataURL(fichier);
  };
  const supprimerPhoto = async (photoId) => {
    const confirme = await confirm({ title: 'Supprimer la photo', message: 'La photo sera retirée du chantier, avec sa date et son heure.' });
    if (confirme) await modifier({ photos: mesPhotos.filter((p) => p.id !== photoId) });
  };

  // Tâches
  const ajouterTache = (texte) => modifier({ taches: [...taches, { id: generateId(), text: texte, done: false, critical: false, phase: 'second-oeuvre' }] });
  const basculerTache = async (tacheId) => {
    const suivantes = taches.map((t) => (t.id === tacheId ? { ...t, done: !t.done } : t));
    const ok = await modifier({ taches: suivantes });
    if (!ok) return;
    setAnimatedTaskId(tacheId);
    setTimeout(() => setAnimatedTaskId(null), 400);
    if (suivantes.length > 0 && suivantes.every((t) => t.done)) setTimeout(() => showToast('Toutes les tâches sont terminées', 'success'), 300);
  };
  const modifierTache = (tacheId, changements) => modifier({ taches: taches.map((t) => (t.id === tacheId ? { ...t, ...changements } : t)) });
  const supprimerTache = (tacheId) => modifier({ taches: taches.filter((t) => t.id !== tacheId) });
  const ajouterTaches = async (nouvelles) => {
    const ok = await modifier({ taches: [...taches, ...nouvelles] });
    if (ok) showToast(`${nouvelles.length} tâche${nouvelles.length > 1 ? 's' : ''} ajoutée${nouvelles.length > 1 ? 's' : ''}`, 'success');
    return ok;
  };
  const listeType = async (cle) => {
    const generees = generateSmartTasks(ch.metier || entreprise?.metier || 'general', cle);
    if (generees.length === 0) return;
    await ajouterTaches(generees.map((t) => ({ ...t, id: generateId(), done: false })));
  };

  // Dépenses : écrites par DataContext (base + écran) ; le montant saisi est HT (en franchise : le montant payé)
  const enregistrerDepense = async () => {
    if (depenseEnCours || !nouvelleDepense.description || !nouvelleDepense.montant) return;
    const quantite = parseInt(nouvelleDepense.quantite) || 1;
    const montant = parseFloat(String(nouvelleDepense.montant).replace(',', '.'));
    const taux = franchiseTva || nouvelleDepense.tauxTva === '' ? null : Number(nouvelleDepense.tauxTva);
    // TVA écrite sur la facture, si saisie : c'est elle qui se déduit (CGI art. 271, II-1-a) ; sinon HT × taux
    const tvaEcrite = franchiseTva || taux === 0 ? NaN : parseFloat(String(nouvelleDepense.montantTva).replace(/\s/g, '').replace(',', '.'));
    const m = montantsDepense({ montant, tauxTva: taux, montantTva: Number.isFinite(tvaEcrite) ? tvaEcrite : null });
    setDepenseEnCours(true);
    try {
      const creee = await ctxAddDepense({
        chantierId: ch.id,
        description: nouvelleDepense.description + (quantite > 1 ? ` (x${quantite})` : ''),
        montant,
        montantHt: franchiseTva ? null : montant,
        tauxTva: taux,
        montantTva: m.connue ? m.tva : null,
        categorie: nouvelleDepense.categorie,
        date: jourLocal(),
      });
      if (!creee) return; // refus : la saisie reste, DataContext a dit pourquoi
      if (nouvelleDepense.catalogueId && deductStock) deductStock(nouvelleDepense.catalogueId, quantite);
      // Le taux choisi reste pour la dépense suivante (souvent le même fournisseur)
      setNouvelleDepense((p) => ({ ...DEPENSE_VIDE, tauxTva: p.tauxTva }));
      setFeuilleDepense(false);
    } finally {
      setDepenseEnCours(false);
    }
  };
  const fermerFeuilleDepense = () => { setFeuilleDepense(false); setNouvelleDepense((p) => ({ ...DEPENSE_VIDE, tauxTva: p.tauxTva })); };
  const changerTauxDepense = async (dep, valeur) => {
    const taux = valeur === '' ? null : Number(valeur);
    const { ht, tva, taux: ancien, connue } = montantsDepense(dep);
    const nouvelle = taux === null ? null : arrondi(ht * taux / 100);
    // Une TVA écrite sur la facture (différente de HT × ancien taux) n'est remplacée qu'après accord
    if (connue && ancien !== null && tva !== arrondi(ht * ancien / 100)) {
      const ok = await confirm({
        title: 'Remplacer la TVA écrite ?',
        message: `La TVA écrite sur la facture (${tva.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €) sera remplacée par ${nouvelle === null ? 'une TVA non saisie' : `${nouvelle.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € (HT × taux)`}.`,
      });
      if (!ok) return;
    }
    await ctxUpdateDepense(dep.id, { tauxTva: taux, tvaRate: undefined, tva_rate: undefined, montantTva: nouvelle });
  };
  const supprimerDepense = async (dep) => {
    if (await confirm({ title: 'Supprimer', message: `Supprimer la dépense « ${dep.description} » ?` })) await ctxDeleteDepense(dep.id);
  };
  // Fournitures du devis seulement : les lignes venues du catalogue avec un prix d'achat (et au prix d'achat, pas de vente)
  const fournituresManquantes = (() => {
    const prevues = (devisLie?.lignes || []).filter((l) => Number(l.prixAchat ?? l.prix_achat) > 0 && l.description);
    return prevues
      .filter((l) => !mesDepenses.some((d) => d.description.toLowerCase().includes(l.description.toLowerCase().split(' ')[0])))
      .slice(0, 4)
      .map((l) => ({ description: l.description, montant: (Number(l.prixAchat ?? l.prix_achat) * (Number(l.quantite) || 1)).toFixed(2) }));
  })();

  // Ajustements, heures
  // Attendre l'écriture : refusée par la base, la saisie et la fenêtre restent (le message d'échec vient de DataContext)
  const validerAjustement = async () => {
    if (ajustementEnCours || !ajustement.libelle || !ajustement.montant_ht) return;
    const montant = parseFloat(String(ajustement.montant_ht).replace(',', '.'));
    if (!Number.isFinite(montant)) { showToast('Le montant n’est pas un nombre', 'error'); return; }
    setAjustementEnCours(true);
    try {
      const cree = await addAjustement({ chantierId: ch.id, type: feuilleAjustement, libelle: ajustement.libelle, montant_ht: montant });
      if (!cree) return;
      setAjustement({ libelle: '', montant_ht: '' });
      setFeuilleAjustement(null);
    } finally {
      setAjustementEnCours(false);
    }
  };
  const supprimerAjustement = async (ajustementId) => {
    if (await confirm({ title: 'Supprimer', message: 'Supprimer cet ajustement ?' })) await deleteAjustement(ajustementId);
  };
  const validerHeures = async () => {
    if (heuresEnCours) return;
    if (!saisieHeures.employeId || !saisieHeures.heures) { showToast('Choisissez la personne et le nombre d’heures', 'error'); return; }
    setHeuresEnCours(true);
    try {
      const cree = await ctxAddPointage({ employeId: saisieHeures.employeId, chantierId: ch.id, date: saisieHeures.date, heures: parseFloat(String(saisieHeures.heures).replace(',', '.')), description: saisieHeures.note, manuel: true, approuve: true });
      if (!cree) return;
      setSaisieHeures({ employeId: '', date: jourLocal(), heures: '', note: '' });
      setFeuilleHeures(false);
    } finally {
      setHeuresEnCours(false);
    }
  };
  const modifierPointage = (pointageId, champ, valeur) => ctxUpdatePointage(pointageId, { [champ]: champ === 'heures' ? parseFloat(String(valeur).replace(',', '.')) || 0 : valeur });
  const supprimerPointage = async (pointageId) => {
    if (await confirm({ title: 'Supprimer', message: 'Supprimer ce pointage ?' })) await ctxDeletePointage(pointageId);
  };

  // Prévenir le client : le message est copié (aucun coût de SMS), une trace est gardée en base
  const prevenirClient = async (type) => {
    const messages = {
      en_route: `Bonjour ${client?.prenom || 'Madame, Monsieur'}, votre artisan ${entreprise?.nom || ''} est en route. Arrivée estimée dans 30 minutes.`,
      arrive: `Bonjour, votre artisan est arrivé sur le chantier « ${ch.nom} ».`,
      termine: `Bonne nouvelle : les travaux de votre chantier « ${ch.nom} » sont terminés. N'hésitez pas à nous contacter.`,
    };
    const message = messages[type];
    const tel = client?.telephone || client?.tel;
    if (!isDemo && supabase) {
      supabase.from('notifications_client').insert({
        entreprise_id: entreprise?.id, client_id: client?.id, chantier_id: ch.id, type, canal: tel ? 'sms' : 'email', message, sent_at: new Date().toISOString(), statut: 'clipboard',
      }).then(() => {}, () => {});
    }
    // N'annoncer « copié » que si la copie a réellement eu lieu
    let copie = false;
    try { await navigator.clipboard.writeText(message); copie = true; } catch { copie = false; }
    showToast(copie ? `Message copié : collez-le dans vos SMS à ${client?.prenom || 'votre client'}` : `Copie impossible. Message : ${message}`, copie ? 'info' : 'warning');
  };

  // Fichiers du chantier, notes, mémos, échanges
  const ajouterFichier = ({ nom, categorie, fichier }) => new Promise((resolve) => {
    const poser = async (data) => {
      const ok = await modifier({ documents: [...(ch.documents || []), { id: generateId(), nom, categorie, date: new Date().toISOString(), data: data || null, fileName: fichier?.name || null, fileSize: fichier?.size || null }] }, 'Document ajouté');
      resolve(ok);
    };
    if (!fichier) { poser(null); return; }
    const lecteur = new FileReader();
    lecteur.onload = () => poser(lecteur.result);
    lecteur.onerror = () => { showToast('Fichier illisible : réessayez', 'error'); resolve(false); };
    lecteur.readAsDataURL(fichier);
  });
  const ajouterEchange = ({ type, content }) => modifier({ messages: [...(ch.messages || []), { id: generateId(), type, content, date: new Date().toISOString() }] });

  // ── Action principale selon l'état ──
  const principal = (() => {
    if (ch.statut === 'prospect' && peutDevis) {
      return devisLie
        ? { libelle: 'Ouvrir le devis', icone: FileText, onClick: () => ouvrirDevis?.({ ouvrir: devisLie.id }) }
        : { libelle: 'Créer le devis', icone: FileText, onClick: () => (nouveauDevisPour ? nouveauDevisPour(ch.client_id, ch.id) : setPage?.('devis')) };
    }
    if (ch.statut === 'en_cours' && peutDepense) return { libelle: 'Ajouter une dépense', icone: Plus, onClick: () => setFeuilleDepense(true) };
    if (ch.statut === 'termine' && peutDevis && devisASolder && !modeSituation) return { libelle: 'Facturer le solde', icone: Receipt, onClick: () => ouvrirDevis?.({ facturer: devisASolder.id }) };
    if (ch.statut === 'archive' && peutModifier) return { libelle: 'Restaurer', icone: Archive, onClick: restaurer };
    return null;
  })();

  const actions = [
    ...(peutModifier ? [{ libelle: 'Modifier', icone: Edit3, onClick: () => setEnEdition(ch) }] : []),
    ...(peutPointer ? [{ libelle: 'Pointer des heures', icone: Clock, onClick: () => setFeuilleHeures(true) }] : []),
    ...(peutPlanifier ? [{ libelle: 'Planifier une intervention', icone: CalendarPlus, onClick: () => onPlanEvent({ type: 'rdv', title: `Intervention ${ch.nom}`, clientId: ch.client_id || ch.clientId || '', description: ch.adresse || '', date: jourLocal() }) }] : []),
    ...(peutCreer ? [{ libelle: 'Dupliquer', icone: Copy, onClick: dupliquer }] : []),
    ...(peutModifier && FONCTIONS.receptionChantier && (ch.statut === 'en_cours' || ch.statut === 'termine') && !reception ? [{ libelle: 'Réceptionner', icone: Shield, onClick: () => setFormReception(true) }] : []),
    ...(peutModifier && ch.statut === 'en_cours' ? [{ libelle: 'Terminer', icone: CheckCircle, onClick: terminer }] : []),
    ...(peutModifier && ch.statut !== 'archive' ? [{ libelle: 'Archiver', icone: Archive, onClick: archiver }] : []),
  ];

  const liste = chantiers.filter((c) => c.statut !== 'archive');
  const position = liste.findIndex((c) => c.id === ch.id);
  const precedent = position > 0 ? liste[position - 1] : null;
  const suivant = position >= 0 && position < liste.length - 1 ? liste[position + 1] : null;

  const tonStatut = TON_STATUT[lireStatut('chantier', ch.statut).ton] || TON_STATUT.neutre;
  const statutControle = peutModifier ? (
    <label className="relative inline-flex">
      <span className="sr-only">Statut du chantier</span>
      <select
        value={ch.statut} onChange={(e) => changerStatut(e.target.value)}
        className={`appearance-none h-11 pl-3.5 pr-9 rounded-full text-sm font-semibold cursor-pointer border-0 ${tonStatut}`}
      >
        <option value={ch.statut}>{CHANTIER_STATUS_LABELS[ch.statut]}</option>
        {getAvailableChantierTransitions(ch.statut).map((s) => <option key={s} value={s}>{CHANTIER_STATUS_LABELS[s]}</option>)}
      </select>
      <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
    </label>
  ) : <PastilleStatut genre="chantier" statut={ch.statut} taille="grande" />;

  const clientLigne = [client ? formatClientName(client) : '', ch.ville].filter(Boolean).join(' · ');
  const onglets = [
    { id: 'apercu', libelle: 'Aperçu' },
    { id: 'taches', libelle: 'Tâches', compte: tasksTotal - tasksDone },
    { id: 'photos', libelle: 'Photos', compte: mesPhotos.length },
    { id: 'documents', libelle: 'Documents', compte: mesDevis.length + (ch.documents || []).length },
    ...(voitPrix ? [{ id: 'finances', libelle: 'Finances' }] : []),
    { id: 'notes', libelle: 'Notes', compte: (ch.messages || []).filter((m) => !m.read).length },
    { id: 'journal', libelle: 'Journal' },
    ...(sousTraitants.length > 0 ? [{ id: 'soustraitants', libelle: 'Sous-traitants', compte: sousTraitants.length }] : []),
    ...(FONCTIONS.receptionChantier && (reception || ch.statut === 'termine') ? [{ id: 'garanties', libelle: 'Garanties', compte: garanties.filter((g) => g.statut === 'active').length }] : []),
  ];
  const ongletActif = onglets.some((o) => o.id === onglet) ? onglet : 'apercu';

  return (
    <div className="space-y-6 pb-24">
      <EnTeteChantier
        titre={ch.nom} sousTitre={clientLigne} statut={statutControle} principal={principal} actions={actions}
        precedent={precedent ? { nom: precedent.nom, onClick: () => onOuvrir(precedent.id) } : null}
        suivant={suivant ? { nom: suivant.nom, onClick: () => onOuvrir(suivant.id) } : null}
        onRetour={onRetour}
      />

      {/* Ce qui demande une décision, au-dessus des onglets : un bandeau par fait */}
      {ch.statut === 'en_cours' && peutModifier && tasksTotal > 0 && tasksDone === tasksTotal && (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-succes-fond text-succes-texte">
          <CheckSquare size={20} aria-hidden="true" className="flex-shrink-0" />
          <p className="flex-1 min-w-0 text-sm font-semibold">Toutes les tâches sont faites. Terminer le chantier ?</p>
          <Bouton taille="compacte" onClick={terminer}>Terminer</Bouton>
        </div>
      )}
      {echeance !== null && echeance <= 14 && (
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${chantierEnRetard(ch) ? 'bg-danger-fond text-danger-texte' : echeance <= 3 ? 'bg-alerte-fond text-alerte-texte' : 'bg-surface-2 text-encre-2'}`}>
          <AlertTriangle size={20} aria-hidden="true" className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {echeance < 0 ? `Échéance dépassée de ${-echeance} jour${-echeance > 1 ? 's' : ''}` : echeance === 0 ? "Échéance aujourd'hui" : `${echeance} jour${echeance > 1 ? 's' : ''} avant l'échéance`}
            </p>
            <p className="text-sm">Fin prévue le {new Date(`${String(ch.date_fin || ch.dateFin).slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      )}

      <Onglets ariaLabel="Fiche du chantier" onglets={onglets} actif={ongletActif} onChange={setOnglet} />

      <div role="tabpanel" aria-label={onglets.find((o) => o.id === ongletActif)?.libelle}>
        {ongletActif === 'apercu' && (
          <OngletApercu
            chantier={ch} client={client} bilan={bilan} revenuTotal={revenuTotal} totalFacture={totalFacture} resteAFacturer={resteAFacturer}
            avancement={avancement} tasksDone={tasksDone} tasksTotal={tasksTotal} franchiseTva={franchiseTva} modeDiscret={modeDiscret}
            formatMoney={formatMoney} formatPct={formatPct} weather={weather} alertes={alertes} voitPrix={voitPrix}
            peutPointer={peutPointer} onPointer={() => setFeuilleHeures(true)} notifierClient={prevenirClient}
            onTaches={() => setOnglet('taches')} onFinances={() => setOnglet('finances')}
          />
        )}
        {ongletActif === 'taches' && (
          <OngletTaches
            taches={taches} peutModifier={peutModifier} animatedTaskId={animatedTaskId}
            onBascule={basculerTache} onAjouter={ajouterTache} onModifier={modifierTache} onSupprimer={supprimerTache}
            onGenerer={() => setGenerateur(true)} onListeType={listeType}
          />
        )}
        {ongletActif === 'photos' && (
          <OngletPhotos photos={mesPhotos} totalPhotos={totalPhotos} peutModifier={peutModifier} onAjouter={ajouterPhoto} onSupprimer={supprimerPhoto} onVoir={setPhotoOuverte} />
        )}
        {ongletActif === 'documents' && (
          <OngletDocuments
            chantier={ch} documents={mesDevis} paiements={paiements} entreprise={entreprise} franchiseTva={franchiseTva} modeDiscret={modeDiscret}
            formatMoney={formatMoney} voitPrix={voitPrix} peutModifier={peutModifier} peutDevis={peutDevis} equipe={equipe} isDark={isDark} couleur={couleur}
            onOuvrirDocument={(docId) => ouvrirDevis?.({ ouvrir: docId })}
            onCreerDevis={() => (nouveauDevisPour ? nouveauDevisPour(ch.client_id, ch.id) : setPage?.('devis'))}
            onAjouterFichier={ajouterFichier} onSupprimerFichier={(fichierId) => modifier({ documents: (ch.documents || []).filter((d) => d.id !== fichierId) })}
          />
        )}
        {ongletActif === 'finances' && (
          <OngletFinances
            chantier={ch} bilan={bilan} revenuTotal={revenuTotal} avancement={avancement} resteAFacturer={resteAFacturer}
            franchiseTva={franchiseTva} modeDiscret={modeDiscret} formatMoney={formatMoney} formatPct={formatPct}
            depensesChantier={mesDepenses} ajustementsRevenus={mesAjustements.filter((a) => a.type === 'REVENU')} ajustementsDepenses={mesAjustements.filter((a) => a.type === 'DEPENSE')}
            depensePrevision={prevision} peutDepense={peutDepense} peutDepenseModifier={peutDepenseModifier} peutDepenseSupprimer={peutDepenseSupprimer} peutModifier={peutModifier}
            onAjouterRevenu={() => setFeuilleAjustement('REVENU')} onAjouterDepense={() => setFeuilleDepense(true)} onVoirHeures={() => setDetailHeures(true)}
            onDepenseAutres={() => setFeuilleAjustement('DEPENSE')}
            onSupprimerAjustement={supprimerAjustement} onChangerTaux={changerTauxDepense} onSupprimerDepense={supprimerDepense}
            situations={(
              <SituationsTravaux
                chantier={ch} devis={mesDevis} updateChantier={updateSilencieux} addDevis={addDevis} generateNextNumero={generateNextNumero}
                clients={clients} entreprise={entreprise} modeDiscret={modeDiscret} isDark={isDark} couleur={couleur} setPage={setPage}
              />
            )}
          />
        )}
        {ongletActif === 'notes' && (
          <OngletNotes
            chantier={ch} memos={memos.filter((m) => m.chantier_id === ch.id)} peutModifier={peutModifier} peutMemo={peutMemo} peutMemoModifier={peutMemoModifier}
            onNotes={(texte) => updateChantier(ch.id, { notes: texte }, { silencieux: true })}
            onAjouterMemo={(texte) => addMemo?.({ text: texte, chantier_id: ch.id, client_id: ch.client_id || null })}
            onBasculerMemo={(memoId) => toggleMemo?.(memoId)}
            onAjouterEchange={ajouterEchange}
            onSupprimerEchange={(echangeId) => modifier({ messages: (ch.messages || []).filter((m) => m.id !== echangeId) })}
          />
        )}
        {ongletActif === 'journal' && (
          <Carte marge="aucun"><ChantierJournal chantierId={ch.id} isDark={isDark} couleur={couleur} modeDiscret={modeDiscret} /></Carte>
        )}
        {ongletActif === 'soustraitants' && (
          <Carte>
            <h2 className="text-lg font-semibold text-encre mb-1">Sous-traitants de l'entreprise</h2>
            <p className="text-sm text-encre-2 mb-4">Les sous-traitants de votre équipe. Les affecter à un chantier n'est pas encore possible.</p>
            <ul className="space-y-3">
              {sousTraitants.map((st, i) => (
                <li key={st.id || i} className="p-4 rounded-xl bg-surface-2 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm bg-accent text-sur-accent flex-shrink-0" aria-hidden="true">{(st.entreprise || st.nom || st.name || 'S').charAt(0).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-encre truncate">{st.entreprise || st.nom || st.name || 'Sous-traitant'}</p>
                    <p className="text-sm text-encre-3 truncate">{[st.role_sur_chantier || st.specialite || st.metier, st.telephone || st.phone].filter(Boolean).join(' · ')}</p>
                  </div>
                  <UserCog size={18} aria-hidden="true" className="text-encre-3 flex-shrink-0" />
                </li>
              ))}
            </ul>
          </Carte>
        )}
        {ongletActif === 'garanties' && (
          <ChantierGarantiesTab
            chantier={ch} reception={reception} garanties={garanties} interventions={interventions}
            onReceptionner={() => setFormReception(true)} onSignalerDesordre={(garantie) => setFormIntervention(garantie)}
            onUpdateReserve={async (reserveId, data) => {
              try {
                await updateReserveService(reserveId, data);
                setReception(await getReception(id));
                showToast('Réserve mise à jour', 'success');
              } catch { showToast('Erreur mise à jour réserve', 'error'); }
            }}
            onLeverToutesReserves={async () => {
              if (!reception?.id) return;
              try {
                await leverToutesReserves(reception.id);
                setReception(await getReception(id));
                showToast('Toutes les réserves ont été levées', 'success');
              } catch { showToast('Erreur levée des réserves', 'error'); }
            }}
            isDark={isDark} couleur={couleur} modeDiscret={modeDiscret}
          />
        )}
      </div>

      <FeuilleDepense
        ouvert={feuilleDepense} onFermer={fermerFeuilleDepense} onValider={enregistrerDepense} depense={nouvelleDepense} setDepense={setNouvelleDepense}
        franchiseTva={franchiseTva} catalogue={catalogue || []} fournituresManquantes={voitPrix ? fournituresManquantes : []} voitPrix={voitPrix} enCours={depenseEnCours}
      />
      <FeuilleHeures
        ouvert={feuilleHeures} onFermer={() => setFeuilleHeures(false)} onValider={validerHeures} heures={saisieHeures} setHeures={setSaisieHeures}
        equipe={equipe} onOuvrirEquipe={() => { setFeuilleHeures(false); setPage?.('equipe'); }} enCours={heuresEnCours}
      />
      <DetailHeures
        ouvert={detailHeures} onFermer={() => setDetailHeures(false)} pointages={mesPointages} equipe={equipe} coutHoraireDe={coutHoraire}
        formatMoney={formatMoney} voitPrix={voitPrix} coutTotal={bilan.coutMO}
        onModifier={peutPointageModifier ? modifierPointage : undefined} onSupprimer={peutPointageSupprimer ? supprimerPointage : undefined}
        onAjouter={peutPointer ? () => { setDetailHeures(false); setFeuilleHeures(true); } : undefined}
      />
      <FeuilleAjustement
        type={feuilleAjustement} onFermer={() => { setFeuilleAjustement(null); setAjustement({ libelle: '', montant_ht: '' }); }}
        onValider={validerAjustement} valeur={ajustement} setValeur={setAjustement} enCours={ajustementEnCours}
      />
      <VisionneusePhoto photo={photoOuverte} chantier={ch} onFermer={() => setPhotoOuverte(null)} />

      <TaskGeneratorModal
        isOpen={generateur} onClose={() => setGenerateur(false)} onGenerateTasks={ajouterTaches}
        existingTasks={taches} entrepriseMetier={entreprise?.metier} devisLignes={devisLie?.lignes} isDark={isDark} couleur={couleur}
      />

      {formReception && (
        <ReceptionForm
          chantier={ch}
          onSubmit={async (data) => {
            try {
              await createReception(null, { ...data, chantierId: ch.id, userId: null, orgId: null });
              if (ch.statut === 'en_cours') {
                updateChantier(ch.id, { statut: 'termine', date_fin: data.dateReception, dateFin: data.dateReception }, { silencieux: true });
                triggerPostChantierSequence(ch);
              }
              const [r, g, i] = await Promise.all([getReception(ch.id), getGarantiesByChantier(ch.id), getInterventionsByChantier(ch.id)]);
              setReception(r); setGaranties(g || []); setInterventions(i || []);
              setFormReception(false);
              setOnglet('garanties');
              showToast('Réception validée : 3 garanties créées', 'success');
            } catch { showToast('Erreur lors de la réception', 'error'); }
          }}
          onClose={() => setFormReception(false)} isDark={isDark} couleur={couleur}
        />
      )}
      {formIntervention && (
        <InterventionForm
          garantie={formIntervention} chantier={ch}
          onSubmit={async (data) => {
            try {
              await createIntervention(null, { ...data, chantierId: ch.id, userId: null, orgId: null });
              setInterventions((await getInterventionsByChantier(ch.id)) || []);
              setFormIntervention(null);
              showToast('Désordre signalé', 'success');
            } catch { showToast('Erreur lors du signalement', 'error'); }
          }}
          onClose={() => setFormIntervention(null)} isDark={isDark} couleur={couleur}
        />
      )}

      <QuickChantierModal
        isOpen={!!enEdition} onClose={() => setEnEdition(null)} onSubmit={modifierFiche}
        clients={clients} devis={devis} isDark={isDark} couleur={couleur} editChantier={enEdition} voitPrix={voitPrix}
      />
    </div>
  );
}
