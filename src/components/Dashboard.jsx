/**
 * Accueil — de haut en bas :
 * 1. salutation, date, une seule action pleine (« Nouveau devis ») ;
 * 2. premier usage (aucun document) : « Pour envoyer votre premier devis », profil → client → devis ;
 * 3. l'argent : À encaisser (tuile vedette), Encaissé du mois, Devis en attente ;
 * 4. À faire aujourd'hui : la ligne ouvre la fiche, le bouton fait l'action (relancer, finaliser, cocher) ;
 * 5. l'encaissé sur 6 mois, puis les chantiers en cours.
 *
 * @module Dashboard
 */

import { useState, useMemo } from 'react';
import {
  HardHat,
  AlertCircle,
  Clock,
  ChevronRight,
  Receipt,
  Send,
  ClipboardList,
  CheckCircle,
  TrendingUp,
  Plus,
  BellRing,
  Users,
  Flame,
} from 'lucide-react';

import { useData } from '../context/DataContext';
import { isDemo } from '../supabaseClient';
import { useToast, useConfirm } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { useRelances } from '../hooks/useRelances';
import { useOrg } from '../context/OrgContext';
import { getRoleLabel } from '../lib/permissions';
import { captureException } from '../lib/sentry';
import { statutFacture, resteAPayer, joursDeRetard, echeance, encaisseEntre } from '../lib/paiementsFacture';
import UsageAlerts from './subscription/UsageAlerts';
import TuileChiffre from './ui/TuileChiffre';
import { TitreSection } from './ui/EnTete';
import LigneListe, { GroupeListe } from './ui/LigneListe';
import { Bouton } from './ui/Bouton';
import EtatVide from './ui/EtatVide';
import { useSubscriptionStore, PLANS } from '../stores/subscriptionStore';
import { jourLocal, dateLue } from '../lib/dates';
import Modal, { ModalHeader, ModalTitle, ModalBody } from './ui/Modal';
import RappelRamonage, { echeanceLue } from './ramonage/RappelRamonage';
import { rappelsDus, DELAI_RAPPEL_DEFAUT } from '../lib/ramonage';
import { profilManquant, enPhrase } from '../lib/profilLegal';
import { devisARelancer, joursDepuisEnvoi } from '../lib/ventes';
import { formatClientName } from '../lib/formatters';
import { RELANCES_PAR_ENVOI } from '../lib/relanceEngine';

/** La mallette — marque Mallettico, reprise du jeu d'icônes (grille 48, contour 3,2). */
function Mallette({ size = 24, style, className }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} style={style} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 15v-3a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
      <rect x="5" y="15" width="38" height="24" rx="2.5" />
      <path d="M5 27h38" strokeWidth="2.4" />
      <rect x="11" y="24.5" width="5" height="5" rx="1" strokeWidth="2.4" />
      <rect x="32" y="24.5" width="5" height="5" rx="1" strokeWidth="2.4" />
    </svg>
  );
}

// ============ HELPERS ============

function fmt(amount, discret = false) {
  if (discret) return '\u2022\u2022\u2022\u2022\u2022';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function getPrenom(user) {
  if (!user) return '';
  const meta = user.user_metadata || {};
  if (meta.prenom) return meta.prenom;
  if (meta.first_name) return meta.first_name;
  if (meta.full_name) return meta.full_name.split(' ')[0];
  if (meta.name) return meta.name.split(' ')[0];
  // Jamais le premier mot de l'entreprise (« Bonjour, BTP ») ni l'adresse e-mail
  // (« Bonjour, seguin.hugo06+controle ») : sans prénom, « Bonjour » tout court (recette du 9 oct.).
  return '';
}

// ============ MAIN DASHBOARD ============


export default function Dashboard({
  chantiers = [],
  clients = [],
  devis = [],
  entreprise,
  couleur = '#8b5cf6',
  modeDiscret,
  setSelectedChantier,
  setPage,
  setSelectedDevis,
  setCreateMode,
  isDark = false,
  user,
  memos = [],
  toggleMemo,
  // Ouvre la page Devis & factures sur une demande : { relancer: id } (fiche + feuille « Relancer »), { etat } (liste filtrée)
  ouvrirDevis,
}) {
  const { paiements = [], ramonages = [], suivreRamonage, updateClient, dataLoading } = useData();
  // Rappels du prochain ramonage (module ramonage, D-30) : le client apparaît ici dès « prochain − délai »
  const [rappelOuvert, setRappelOuvert] = useState(null);
  const rappelsRamonage = useMemo(() => (entreprise?.ramonageActif
    ? rappelsDus(ramonages, clients, { jours: Number(entreprise?.ramonageRappelJours) || DELAI_RAPPEL_DEFAUT, aujourdhui: jourLocal() })
    : []), [entreprise?.ramonageActif, entreprise?.ramonageRappelJours, ramonages, clients]);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { canAccess, canPerform } = usePermissions();
  const canSeeFinances = canAccess('finances');
  const peutCreerDevis = canPerform('devis', 'create');
  // Relancer, tout envoyer : réservé aux rôles qui envoient des documents (relecture du 25 oct., I3)
  const peutEnvoyer = canPerform('devis', 'send');
  const { orgId, orgName, role } = useOrg();
  // Membre d'une équipe (invité) : on lui dit où il est ; le plan est l'affaire du gérant
  const membreEquipe = !isDemo && !!role && role !== 'owner';
  const planId = useSubscriptionStore((s) => s.planId);
  const planCourant = PLANS[planId] || PLANS.gratuit;

  // Relances : détection auto + envoi groupé 1-clic (cœur du pivot devis→facture→relance)
  const relances = useRelances({ devis, clients, entreprise, userId: user?.id, orgId });
  const [sendingRelances, setSendingRelances] = useState(false);
  const [onboardingHidden, setOnboardingHidden] = useState(() => !!localStorage.getItem('cp_onboarding_dismissed'));
  const handleSendAllRelances = async () => {
    if (sendingRelances) return;
    // Ce qui part chez les clients se confirme d'abord (audit UX du 20 oct. 2026, § 2.6) : le même texte que « Tout
    // envoyer » de la liste des documents (DevisPage) ; l'envoi groupé part par lots (relanceEngine, RELANCES_PAR_ENVOI)
    const partent = (relances.dueNow || []).slice(0, RELANCES_PAR_ENVOI);
    const nombre = Math.min(relances.counts.due, RELANCES_PAR_ENVOI);
    const noms = [...new Set(partent.map(p => formatClientName(p.client, '') || p.doc?.client_nom).filter(Boolean))];
    const ok = await confirm({
      title: `Envoyer ${nombre} relance${nombre > 1 ? 's' : ''} ?`,
      message: `Par e-mail${noms.length ? `, à : ${noms.join(', ')}` : ''}.${relances.counts.due > RELANCES_PAR_ENVOI ? ` Les relances partent par ${RELANCES_PAR_ENVOI} : il en restera ${relances.counts.due - RELANCES_PAR_ENVOI} à envoyer ensuite.` : ''}`,
    });
    if (!ok) return;
    setSendingRelances(true);
    try {
      const res = await relances.sendBulkRelances();
      if (res?.sent > 0) {
        showToast(
          `${res.sent} relance${res.sent > 1 ? 's' : ''} envoyée${res.sent > 1 ? 's' : ''}${res.failed ? ` — ${res.failed} échec${res.failed > 1 ? 's' : ''}` : ''}`,
          res.failed ? 'warning' : 'success'
        );
      } else if (res?.failed > 0) {
        showToast(`Échec de ${res.failed} relance${res.failed > 1 ? 's' : ''}`, 'error');
      } else {
        showToast('Aucune relance à envoyer', 'info');
      }
    } catch (error) {
      captureException(error, { context: 'dashboard bulk relances' });
      showToast('Erreur lors de l\'envoi des relances', 'error');
    } finally {
      setSendingRelances(false);
    }
  };

  const [showAllActions, setShowAllActions] = useState(false);

  // Ouvrir la fiche d'un document ; la relancer (fiche + feuille « Relancer » : destinataire, canal, aperçu)
  const ouvrirFiche = (d) => { setSelectedDevis(d); setPage('devis'); };
  const relancer = (d) => (ouvrirDevis ? ouvrirDevis({ relancer: d.id }) : ouvrirFiche(d));
  // Réglages sur un onglet (et un champ) : l'événement que les Réglages écoutent une fois affichés
  const ouvrirReglages = (tab, fieldId) => {
    setPage('settings');
    if (tab) setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-settings-tab', { detail: { tab, fieldId } })), 400);
  };

  // ---- Computed data ----
  const computed = useMemo(() => {
    const now = new Date();

    // KPIs — mêmes définitions que la page Devis et la Trésorerie (src/lib/paiementsFacture.js) :
    // le reste dû des factures ouvertes, le retard après l'échéance, les paiements réellement reçus.
    // Avant (revue du 9 oct.) : « en retard » comptait des factures déjà payées, la conversion
    // ignorait « accepté » (0 % ici, 75 % sur Devis) et « Encaissé ce mois » additionnait des devis signés.
    const facturesOuvertes = devis.filter(d => d.type === 'facture' && d.facture_type !== 'avoir'
      && ['envoye', 'vu', 'facture', 'partielle', 'en_retard'].includes(statutFacture(d, paiements, now)));
    const facturesEnRetard = facturesOuvertes.filter(d => statutFacture(d, paiements, now) === 'en_retard');
    const aEncaisser = facturesOuvertes.reduce((s, d) => s + resteAPayer(d, paiements), 0);
    const retard = facturesEnRetard.reduce((s, d) => s + resteAPayer(d, paiements), 0);

    const devisEnAttente = devis.filter(d => d.type !== 'facture' && ['envoye', 'vu'].includes(d.statut));
    const chantiersActifs = chantiers.filter(c => c.statut === 'en_cours');

    const jour = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const caCeMois = encaisseEntre(devis, paiements, jour(debutMois), jour(finMois));

    // Mois précédent, pour la comparaison
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthCA = encaisseEntre(devis, paiements, jour(prevMonth), jour(new Date(now.getFullYear(), now.getMonth(), 0)));

    // À faire aujourd'hui : un titre entier, la ligne ouvre la fiche, le bouton fait ce qu'il dit (audit UX du 20 oct.
    // 2026 : « Relancer » et « Finaliser » remplaçaient le montant, coupaient le titre et n'ouvraient que la fiche).
    const actions = [];

    // Factures, devis et montants : seulement pour un rôle qui voit les finances. Avant (recette du 9 oct. 2026),
    // un ouvrier ou un chef de chantier voyait « Facture en retard — Martin — 2 000 € » et des boutons vers des
    // pages qui lui sont fermées.
    if (canSeeFinances) {
    // 1. Factures en retard (reste dû, après l'échéance)
    facturesEnRetard
      .slice()
      .sort((a, b) => echeance(a) - echeance(b))
      .forEach(d => {
        const jours = joursDeRetard(d, paiements, now);
        const client = clients.find(c => c.id === d.client_id);
        const reste = resteAPayer(d, paiements);
        actions.push({
          priority: 1,
          icon: Receipt,
          ton: 'danger',
          label: `Facture en retard de ${jours} j`,
          detail: client ? `${client.nom || client.name} — ${fmt(reste, modeDiscret)}` : fmt(reste, modeDiscret),
          onClick: () => ouvrirFiche(d),
          action: peutEnvoyer ? { libelle: 'Relancer', icone: Send, onClick: () => relancer(d) } : undefined,
        });
      });

    // 2. Devis à relancer : la règle commune (src/lib/ventes.js) — compté depuis l'envoi, jamais expiré
    devisEnAttente
      .filter(d => devisARelancer(d, now, entreprise))
      .sort((a, b) => joursDepuisEnvoi(b, now) - joursDepuisEnvoi(a, now))
      .forEach(d => {
        const jours = joursDepuisEnvoi(d, now);
        const client = clients.find(c => c.id === d.client_id);
        actions.push({
          priority: 2,
          icon: Send,
          ton: 'alerte',
          label: `Devis sans réponse depuis ${jours} j`,
          detail: client ? `${client.nom || client.name} — ${fmt(d.total_ttc, modeDiscret)}` : fmt(d.total_ttc, modeDiscret),
          onClick: () => ouvrirFiche(d),
          action: peutEnvoyer ? { libelle: 'Relancer', icone: Send, onClick: () => relancer(d) } : undefined,
        });
      });

    // 3. Brouillons à finaliser (groupé) : la liste filtrée sur les brouillons
    const brouillons = devis.filter(d => d.statut === 'brouillon' && d.type !== 'facture');
    if (brouillons.length > 0) {
      const totalBrouillons = brouillons.reduce((s, d) => s + (d.total_ttc || 0), 0);
      const voirBrouillons = () => (ouvrirDevis ? ouvrirDevis({ etat: 'brouillons' }) : setPage('devis'));
      actions.push({
        priority: 3,
        icon: ClipboardList,
        // À surveiller (ambre), comme la pastille du compte : le rouge veut dire « en retard » (décision du 25 oct. 2026)
        ton: 'alerte',
        label: `${brouillons.length} brouillon${brouillons.length > 1 ? 's' : ''} à finaliser`,
        detail: fmt(totalBrouillons, modeDiscret),
        onClick: voirBrouillons,
        action: { libelle: 'Finaliser', onClick: voirBrouillons },
      });
    }
    }

    // Encaissé par mois, 6 derniers mois : l'argent reçu (avant : la somme des devis signés, « CA »).
    const sparkData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const fin = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      sparkData.push({ label, ca: encaisseEntre(devis, paiements, jour(d), jour(fin)) });
    }

    return {
      aEncaisser,
      retard,
      devisEnAttente,
      chantiersActifs,
      actions: actions.sort((a, b) => a.priority - b.priority),
      caCeMois,
      lastMonthCA,
      facturesEnRetardCount: facturesEnRetard.length,
      sparkData,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ouvrirFiche / relancer ne lisent que des setters stables
  }, [devis, paiements, chantiers, clients, entreprise, modeDiscret, setSelectedDevis, setPage, canSeeFinances, ouvrirDevis, peutEnvoyer]);

  // ---- Greeting ----
  const prenom = getPrenom(user);
  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
  const formattedDate = capitalize(new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }));

  // ---- Memos du jour ----
  // Tâches non faites, pour aujourd'hui ou en retard. Avant (recette du 9 oct.) : le filtre lisait `done` et
  // `date`, que les tâches n'ont pas (`is_done`, `due_date`) : toutes s'affichaient, faites et futures comprises.
  const memosJour = useMemo(() => {
    const today = jourLocal();
    return memos.filter(m => !m.is_done && m.due_date && m.due_date <= today);
  }, [memos]);

  // Merge memos into actions
  const allActions = useMemo(() => {
    const memoActions = memosJour.map(m => ({
      priority: 4,
      icon: CheckCircle,
      ton: m.due_date < jourLocal() ? 'danger' : 'neutre',
      label: m.text || m.titre || 'Tâche',
      detail: m.due_date < jourLocal() ? 'Tâche en retard' : 'Tâche du jour',
      // La ligne ouvre les tâches ; « Fait » coche la tâche (avant : toucher la ligne la cochait)
      onClick: () => setPage('tasks'),
      action: { libelle: 'Fait', icone: CheckCircle, onClick: () => toggleMemo?.(m.id) },
    }));
    const ramonageActions = rappelsRamonage.map((r) => ({
      priority: 2,
      icon: Flame,
      ton: 'alerte',
      label: `Ramonage à prévoir — ${[r.client.prenom, r.client.nom].filter(Boolean).join(' ') || r.client.entreprise || 'client'}`,
      detail: `Avant le ${dateLue(r.ramonage.prochain_avant).toLocaleDateString('fr-FR')} (${echeanceLue(r.joursRestants)})`,
      // Le rappel ouvert est gardé tel quel : la fenêtre reste ouverte après « SMS » (pour « Annuler »)
      onClick: () => setRappelOuvert(r),
      action: { libelle: 'Rappeler', onClick: () => setRappelOuvert(r) },
    }));
    return [...computed.actions, ...ramonageActions, ...memoActions].sort((a, b) => a.priority - b.priority);
  }, [computed.actions, memosJour, toggleMemo, rappelsRamonage, setPage]);
  const rappelAffiche = rappelOuvert;

  const visibleActions = showAllActions ? allActions : allActions.slice(0, 5);


  // ============ RENDER ============


  // Relances (impayés, devis sans réponse, envoi aux clients) : seulement pour un rôle qui voit les finances et envoie
  const relancesDue = canSeeFinances && peutEnvoyer ? (relances?.counts?.due || 0) : 0;
  const relancesRisk = relances?.totalAtRisk || 0;
  const hasAnyAction = relancesDue > 0 || allActions.length > 0;

  // Premier usage (audit UX du 20 oct. 2026, P1) : tant qu'aucun document n'existe, l'Accueil guide vers le premier devis
  // au lieu de dire « Mallette bouclée — Rien ne traîne » (alors que le profil incomplet bloquait l'envoi). Ni tuiles à 0
  // ni graphique vide : rien n'existe encore (§ 2.7).
  const premierUsage = peutCreerDevis && !dataLoading && devis.length === 0;
  const manquantProfil = profilManquant(entreprise);
  const nouveauDevis = () => { setCreateMode?.(p => ({ ...p, devis: true })); setPage('devis'); };
  const etapesPremierDevis = [
    {
      key: 'profil',
      label: 'Compléter mon profil',
      // Les mentions qui bloquent l'envoi (lib/profilLegal : la liste du contrôle d'envoi)
      meta: manquantProfil.length === 0 ? 'Les informations exigées avant l\'envoi sont renseignées' : `Manque : ${enPhrase(manquantProfil)}`,
      done: manquantProfil.length === 0,
      action: () => ouvrirReglages(manquantProfil[0]?.onglet, manquantProfil[0]?.champ),
    },
    {
      key: 'client',
      label: 'Ajouter mon premier client',
      meta: (clients?.length || 0) > 0 ? 'Fait' : 'Son nom et son e-mail suffisent pour commencer',
      done: (clients?.length || 0) > 0,
      action: () => { setCreateMode?.(p => ({ ...p, client: true })); setPage('clients'); },
    },
    {
      key: 'devis',
      label: 'Créer mon premier devis',
      meta: manquantProfil.length === 0 ? 'Votre profil est prêt : il pourra partir dès qu\'il est rédigé' : 'Il partira dès que votre profil sera complet',
      done: false,
      action: nouveauDevis,
    },
  ];
  const prochaineEtape = etapesPremierDevis.find(e => !e.done);

  // Après le premier document : la suite des premiers pas (relances automatiques), masquable
  const onboardingSteps = [
    // « Fait » = les champs qui débloquent l'ENVOI d'un devis (lib/profilLegal, la liste du contrôle d'envoi),
    // pas un simple % de profil — sinon l'étape se coche alors que l'envoi restera bloqué.
    { key: 'profil', label: 'Configurer mon entreprise', done: manquantProfil.length === 0, action: () => ouvrirReglages(manquantProfil[0]?.onglet, manquantProfil[0]?.champ) },
    { key: 'client', label: 'Ajouter mon premier client', done: (clients?.length || 0) > 0, action: () => setPage('clients') },
    { key: 'devis', label: 'Créer mon premier devis', done: (devis?.length || 0) > 0, action: nouveauDevis },
    // Avant : une clé de stockage que les Réglages ne lisent pas ; l'onglet ne s'ouvrait pas
    { key: 'relances', label: 'Activer les relances automatiques', done: !!(entreprise?.relanceConfig?.enabled), action: () => ouvrirReglages('relances') },
  ];
  const onboardingDone = onboardingSteps.filter(s => s.done).length;
  // En démo, un visiteur explore l'app — pas de checklist d'installation
  const showOnboarding = !premierUsage && canSeeFinances && !isDemo && !onboardingHidden && onboardingDone < onboardingSteps.length;

  const activeChantiers = computed.chantiersActifs;

  // Montant compact sous les barres du graphique (« 4,7 k€ »)
  const compact = (n) => modeDiscret ? '•••' : n >= 1000
    ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n / 1000)} k€`
    : `${Math.round(n)} €`;
  const moisCourant = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  // Mois précédent : `new Date(a, m - 1, 1)`. Avant (vu sur le compte démo le 11 oct. 2026), `dateLue(a, m - 1, 1)`
  // ne lisait que l'année (2026 ms après 1970) : « janvier : … » sous « Encaissé · octobre », chaque mois.
  const moisPrecedent = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('fr-FR', { month: 'long' });
  // Ton d'une ligne « à faire » : rouge = retard, ambre = à surveiller, neutre = le reste
  const TON_ACTION = { danger: 'bg-danger-fond text-danger-texte', alerte: 'bg-alerte-fond text-alerte-texte', neutre: 'bg-surface-2 text-encre-2' };
  const nbDevisAttente = computed.devisEnAttente.length;

  // Refonte du 9 oct. 2026 (revue visuelle, problème 14) : une hiérarchie — l'argent dû d'abord
  // (tuile héros), puis ce qu'il y a à faire, puis le pouls ; une seule couleur d'accent, des
  // tuiles calmes, le graphique avec ses valeurs.
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8 min-h-screen bg-fond">

      {/* ===== EN-TÊTE : salutation, date, une seule action ===== */}
      <header className="flex flex-wrap justify-between items-end gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-encre">Bonjour{prenom ? `, ${prenom}` : ''}</h1>
          <p className="mt-1 text-sm text-encre-3 flex items-center gap-1.5 flex-wrap">
            <span>{formattedDate}</span>
            <span aria-hidden="true">·</span>
            {membreEquipe ? (
              <span className="inline-flex items-center gap-1 font-medium text-encre-2">
                <Users size={14} aria-hidden="true" />
                Équipe {entreprise?.nom || orgName} · {getRoleLabel(role)}
              </span>
            ) : (
              <button type="button" onClick={() => setPage('plan')} className="h-11 -my-3 inline-flex items-center gap-1 font-medium text-encre-2 hover:underline underline-offset-2">
                Plan {planCourant.name}
              </button>
            )}
          </p>
        </div>
        {/* Seulement pour un rôle qui crée des devis : pour un ouvrier, le bouton ne menait nulle part. Au premier
            usage, le bouton plein est celui de l'étape suivante (un seul par écran). Le mode confidentiel est dans
            l'en-tête de l'app (une seule commande, audit § 2.1). */}
        {peutCreerDevis && !premierUsage && (
          <Bouton variante="principal" icone={Plus} onClick={nouveauDevis}>
            Nouveau devis
          </Bouton>
        )}
      </header>

      {/* ===== PREMIER USAGE : le chemin vers le premier devis envoyé ===== */}
      {premierUsage && (
        <section aria-label="Pour envoyer votre premier devis">
          <TitreSection titre="Pour envoyer votre premier devis" compte={`${etapesPremierDevis.filter(e => e.done).length}/${etapesPremierDevis.length}`} />
          <GroupeListe>
            {etapesPremierDevis.map((etape, i) => (
              <LigneListe
                key={etape.key}
                onClick={etape.done || prochaineEtape?.key === etape.key ? undefined : etape.action}
                debut={etape.done
                  ? <span className="w-10 h-10 rounded-xl bg-succes-fond text-succes-texte flex items-center justify-center"><CheckCircle size={20} aria-hidden="true" /><span className="sr-only">Fait :</span></span>
                  : <span className="w-10 h-10 rounded-xl bg-surface-2 text-encre-2 flex items-center justify-center text-base font-bold tabular-nums" aria-hidden="true">{i + 1}</span>}
                titre={etape.label}
                titreEntier
                meta={etape.meta}
                pied={prochaineEtape?.key === etape.key ? (
                  <>
                    <span />
                    <Bouton variante="principal" taille="compacte" iconeFin={ChevronRight} onClick={etape.action}>
                      {etape.key === 'profil' ? 'Compléter' : etape.key === 'client' ? 'Ajouter un client' : 'Créer le devis'}
                    </Bouton>
                  </>
                ) : undefined}
              />
            ))}
          </GroupeListe>
        </section>
      )}

      {/* ===== ONBOARDING (nouveaux comptes, après le premier document) ===== */}
      {showOnboarding && (
        <section aria-label="Premiers pas">
          <TitreSection titre="On remplit la mallette" compte={`${onboardingDone}/${onboardingSteps.length}`} action="Masquer" onAction={() => { try { localStorage.setItem('cp_onboarding_dismissed', '1'); } catch { /* préférence non enregistrée */ } setOnboardingHidden(true); }} />
          <GroupeListe>
            {onboardingSteps.map(st => (
              <LigneListe
                key={st.key}
                onClick={st.done ? undefined : st.action}
                debut={st.done
                  ? <span className="w-10 h-10 rounded-xl bg-succes-fond text-succes-texte flex items-center justify-center"><CheckCircle size={20} aria-hidden="true" /></span>
                  : <span className="w-10 h-10 rounded-xl bg-surface-2 text-encre-3 flex items-center justify-center"><ChevronRight size={20} aria-hidden="true" /></span>}
                titre={<span className={st.done ? 'line-through text-encre-3 font-medium' : ''}>{st.label}</span>}
              />
            ))}
          </GroupeListe>
        </section>
      )}

      {/* ===== L'ARGENT : ce qu'on me doit, en grand ===== */}
      {canSeeFinances && !premierUsage && (
        <section aria-label="Argent" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <TuileChiffre
            heros className="col-span-2"
            libelle="À encaisser"
            valeur={fmt(computed.aEncaisser, modeDiscret)}
            alerte={computed.retard > 0 ? `dont ${fmt(computed.retard, modeDiscret)} en retard · ${computed.facturesEnRetardCount} facture${computed.facturesEnRetardCount > 1 ? 's' : ''}` : undefined}
            contexte={computed.retard > 0 ? undefined : 'Aucun retard'}
            onClick={() => setPage('finances')}
          />
          <TuileChiffre
            libelle={`Encaissé · ${moisCourant}`}
            valeur={fmt(computed.caCeMois, modeDiscret)}
            contexte={computed.lastMonthCA > 0 ? `${moisPrecedent} : ${fmt(computed.lastMonthCA, modeDiscret)}` : 'Premier mois suivi'}
            onClick={() => setPage('finances')}
          />
          {/* Un seul chiffre par tuile : le montant, et le nombre de devis qu'il recouvre (avant : « 1 envoyé · 75 % signés »,
              un taux de signature global sans rapport avec le montant affiché) */}
          <TuileChiffre
            libelle="Devis en attente"
            valeur={fmt(computed.devisEnAttente.reduce((s, d) => s + (d.total_ttc || 0), 0), modeDiscret)}
            contexte={`${nbDevisAttente} devis envoyé${nbDevisAttente > 1 ? 's' : ''}`}
            onClick={() => (ouvrirDevis ? ouvrirDevis({ etat: 'devis_attente' }) : setPage('devis'))}
          />
        </section>
      )}

      {/* Jauges d'usage — après l'argent, seulement quand une limite approche. Pas au premier usage : rien n'approche
          d'une limite, et la carte du premier devis porte le seul bouton plein de l'écran. */}
      {!premierUsage && <UsageAlerts isDark={isDark} couleur={couleur} />}

      {/* ===== À FAIRE AUJOURD'HUI ===== */}
      {(hasAnyAction || !premierUsage) && (
      <section aria-label="À faire aujourd'hui">
        <TitreSection titre="À faire aujourd'hui" compte={hasAnyAction ? relancesDue + allActions.length : undefined} />
        <GroupeListe>
          {relancesDue > 0 && (
            <LigneListe
              chevron={false}
              debut={<span className="w-10 h-10 rounded-xl bg-alerte-fond text-alerte-texte flex items-center justify-center"><BellRing size={20} aria-hidden="true" /></span>}
              titre={`${relancesDue} relance${relancesDue > 1 ? 's' : ''} à envoyer`}
              titreEntier
              piedEnLigne
              meta={relancesRisk > 0 ? `${fmt(relancesRisk, modeDiscret)} concernés` : 'Impayés et devis sans réponse'}
              pied={(
                <>
                  <span />
                  <Bouton taille="compacte" icone={sendingRelances ? Clock : Send} chargement={sendingRelances} onClick={handleSendAllRelances}>
                    {sendingRelances ? 'Envoi…' : 'Tout envoyer'}
                  </Bouton>
                </>
              )}
            />
          )}
          {visibleActions.map((action, i) => {
            const Icone = action.icon || AlertCircle;
            return (
              <LigneListe
                key={i}
                onClick={action.onClick}
                debut={<span className={`w-10 h-10 rounded-xl flex items-center justify-center ${TON_ACTION[action.ton] || TON_ACTION.neutre}`}><Icone size={20} aria-hidden="true" /></span>}
                titre={action.label}
                titreEntier
                piedEnLigne
                meta={action.detail}
                pied={action.action ? (
                  <>
                    <span />
                    <Bouton taille="compacte" icone={action.action.icone} onClick={action.action.onClick}>
                      {action.action.libelle}
                    </Bouton>
                  </>
                ) : undefined}
              />
            );
          })}
          {allActions.length > 5 && (
            <button type="button" onClick={() => setShowAllActions(v => !v)} aria-expanded={showAllActions} className="w-full h-12 text-sm font-semibold text-encre-2 hover:bg-surface-2">
              {showAllActions ? 'Voir moins' : `Voir tout (${allActions.length})`}
            </button>
          )}
          {/* « Mallette bouclée » : seulement pour un compte qui a déjà travaillé (jamais au premier usage) */}
          {!hasAnyAction && (
            <EtatVide icone={Mallette} titre="Mallette bouclée" texte="Rien ne traîne. Vous pouvez la refermer." />
          )}
        </GroupeListe>
      </section>
      )}

      {/* Rappel de ramonage ouvert depuis « À faire » */}
      <Modal isOpen={!!rappelAffiche} onClose={() => setRappelOuvert(null)} size="md">
        <ModalHeader>
          <ModalTitle>{rappelAffiche ? `Rappeler ${[rappelAffiche.client.prenom, rappelAffiche.client.nom].filter(Boolean).join(' ')}` : 'Rappel'}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {rappelAffiche && (
            <RappelRamonage
              rappel={rappelAffiche}
              entreprise={entreprise}
              envoiAutoPrevu={!!entreprise?.ramonageEnvoiAuto && String(entreprise?.email || '').includes('@')}
              suivreRamonage={suivreRamonage}
              refuserRappels={async (c) => {
                const ok = await confirm({
                  title: 'Ne plus rappeler ce client ?',
                  message: `${[c.prenom, c.nom].filter(Boolean).join(' ')} ne recevra plus de rappel de ramonage (ni SMS proposé, ni e-mail automatique). Ce refus ne s'annule pas.`,
                  confirmText: 'Ne plus rappeler',
                  variant: 'warning',
                });
                if (!ok) return;
                setRappelOuvert(null);
                if ((await updateClient(c.id, { rappels_refuses_le: new Date().toISOString() })) !== false) showToast('Refus des rappels noté : plus aucun rappel pour ce client.', 'success');
              }}
            />
          )}
        </ModalBody>
      </Modal>

      {/* ===== LE POULS : l'argent reçu, mois par mois ===== */}
      {canSeeFinances && !premierUsage && (
        <section aria-label="Encaissé sur 6 mois">
          <TitreSection titre="Encaissé sur 6 mois" action="Finances" onAction={() => setPage('finances')} />
          <div className="bg-surface border border-bord rounded-2xl shadow-e1 p-4 sm:p-5">
            {computed.sparkData.some(m => m.ca > 0) ? (() => {
              const data = computed.sparkData;
              const max = Math.max(...data.map(d => d.ca), 1);
              return (
                <div className="grid grid-cols-6 gap-2 items-end h-44" role="img" aria-label={`Encaissé par mois : ${data.map(d => `${d.label} ${fmt(d.ca)}`).join(', ')}`}>
                  {data.map((d, i) => {
                    const dernier = i === data.length - 1;
                    return (
                      <div key={i} className="flex flex-col items-center justify-end h-full gap-1.5 min-w-0">
                        <span className={`text-xs tabular-nums whitespace-nowrap ${dernier ? 'font-bold text-encre' : 'font-medium text-encre-2'}`}>{d.ca > 0 ? compact(d.ca) : '—'}</span>
                        <div className={`w-full max-w-[44px] rounded-lg ${dernier ? 'bg-accent' : 'bg-accent/30'}`} style={{ height: `${Math.max(4, (d.ca / max) * 100)}%` }} />
                        <span className={`text-xs capitalize ${dernier ? 'font-semibold text-encre' : 'text-encre-3'}`}>{d.label.replace('.', '')}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <EtatVide icone={TrendingUp} titre="Rien d'encaissé pour l'instant" texte="Les paiements reçus apparaîtront ici, mois par mois." className="!py-6" />
            )}
          </div>
        </section>
      )}

      {/* ===== CHANTIERS EN COURS ===== */}
      {activeChantiers.length > 0 && (
        <section aria-label="Chantiers en cours">
          <TitreSection titre="Chantiers en cours" compte={activeChantiers.length} action="Tout voir" onAction={() => setPage('chantiers')} />
          <GroupeListe>
            {activeChantiers.slice(0, 4).map(c => {
              const client = clients.find(cl => cl.id === c.client_id);
              const av = Math.max(0, Math.min(100, Math.round(c.avancement || 0)));
              return (
                <LigneListe
                  key={c.id}
                  onClick={() => { setSelectedChantier?.(c); setPage('chantiers'); }}
                  debut={<span className="w-10 h-10 rounded-xl bg-surface-2 text-encre-2 flex items-center justify-center"><HardHat size={20} aria-hidden="true" /></span>}
                  titre={c.nom || c.titre || c.name || 'Chantier'}
                  meta={client ? [client.prenom, client.nom || client.name].filter(Boolean).join(' ') : undefined}
                  pied={(
                    <>
                      {/* Une barre d'avancement n'est pas un statut : l'accent, pas le bleu « chez le client » (§ 2.8) */}
                      <span className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${av}%` }} />
                      </span>
                      <span className="text-sm font-semibold text-encre tabular-nums">Avancement {av} %</span>
                    </>
                  )}
                />
              );
            })}
          </GroupeListe>
        </section>
      )}

    </div>
  );
}
