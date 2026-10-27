import React, { useState, useMemo, useCallback, useEffect, useId } from 'react';
import { useToast, useConfirm } from '../context/AppContext';
import {
  Download, FileText, RefreshCw, AlertCircle, AlertTriangle, Info, Calculator, Building2, ChevronLeft, Shield, Check,
  Home, Smartphone, Fuel, Landmark, BarChart3, CreditCard, Users, HardDrive, FolderOpen, Construction, Receipt, Mail,
  GraduationCap, Flame, Package, LayoutTemplate, Scale,
} from 'lucide-react';
import { captureException } from '../lib/sentry';
import AdminHelp from './admin-help/AdminHelp';
import { calculateTVASummary } from '../lib/integrations/accounting';
import { estFranchiseTva, tvaARegulariser } from '../lib/franchiseTva';

import Facture2026Tab from './settings/Facture2026Tab';
import RelanceConfigTab from './settings/RelanceConfigTab';
import RamonageTab, { Interrupteur } from './settings/RamonageTab';
import PaymentConfigTab from './settings/PaymentConfigTab';
import EntrepriseSettingsPage from './settings/EntrepriseSettingsPage';
import TeamManagement from './settings/TeamManagement';
import { usePermissions } from '../hooks/usePermissions';
import { useRelances } from '../hooks/useRelances';
import { compressImage } from '../lib/image-utils';
import { useOrg } from '../context/OrgContext';
import TemplateManager from './settings/TemplateManager';
import SuppressionCompte from './settings/SuppressionCompte';
import PostChantierSettings from './settings/PostChantierSettings';
import AssistantProfil from './settings/AssistantProfil';
import EtatProfil from './settings/EtatProfil';
import ChampsAdresse from './settings/ChampsAdresse';
import ChoixCouleur from './settings/ChoixCouleur';
import ChoixTva from './settings/ChoixTva';
import {
  ChampParam, DebouncedInput, DebouncedTextarea, EnregistrementContext, EtatEnregistrement, useEtatsEnregistrement, CLASSE_CHAMP,
} from './settings/champsParametres';
import { remettreFichier } from '../lib/natif';
import { FONCTIONS } from '../lib/fonctions';
import { Bouton } from './ui/Bouton';
import Carte from './ui/Carte';
import Pastille from './ui/Pastille';
import ChampChoix from './ui/ChampChoix';
import AideMot from './ui/AideMot';
import LigneListe, { GroupeListe } from './ui/LigneListe';
import { EnTetePage } from './ui/EnTete';
import { jourLocal, dateLue } from '../lib/dates';
import { estEntrepreneurIndividuel, estEirl, nomImprime } from '../lib/identiteEntreprise';
import { estSociete } from '../lib/mentionsFacture';
import { minimumPenalites, libelleMinimumPenalites, tauxPenalitesValide } from '../lib/tauxInteretLegal';
import { URL_SIRENE, profilDepuisSirene } from '../lib/sirene';
import { chiffreAffairesHT } from '../lib/ventes';
import { jaugeProfil } from '../lib/jaugeProfil';
import { MODES_PAIEMENT } from '../lib/modesPaiement';
import { champsAdresse, adresseComposee, adresseComplete } from '../lib/adresseEntreprise';
import { LEXIQUE } from '../lib/lexique';
import { formatMoney } from '../lib/formatters';
import { COULEUR_DOCUMENTS_DEFAUT } from '../lib/theme';

// ── Rubriques ────────────────────────────────────────────────────────────────
// Audit UX du 20 oct. 2026 (P2) : au bureau, une colonne de navigation à gauche (avant : deux rangées d'onglets) ; au
// téléphone, une liste de rubriques qui ouvre chacune sa page (avant : un accordéon mêlé de puces).
const GROUPES = [
  { id: 'entreprise', libelle: 'Mon entreprise', rubriques: [
    { cle: 'identite', libelle: 'Identité', icone: Building2 },
    { cle: 'legal', libelle: 'Légal', icone: Scale },
    { cle: 'assurances', libelle: 'Assurances', icone: Shield },
    { cle: 'banque', libelle: 'Banque', icone: Landmark },
  ]},
  { id: 'documents', libelle: 'Documents', rubriques: [
    { cle: 'documents', libelle: 'Documents', icone: FileText },
    { cle: 'templates', libelle: 'Modèles', icone: LayoutTemplate },
    { cle: 'facture2026', libelle: 'Facture 2026', icone: Receipt },
    { cle: 'relances', libelle: 'Relances', icone: Mail },
    { cle: 'postchantier', libelle: 'Post-chantier', icone: Construction },
    // Parcours ramoneur (D-30) : attestations, rappels, tarifs
    { cle: 'ramonage', libelle: 'Ramonage', icone: Flame },
  ]},
  { id: 'finance', libelle: 'Finance', rubriques: [
    { cle: 'comptabilite', libelle: 'Comptabilité', icone: Calculator },
    { cle: 'rentabilite', libelle: 'Rentabilité', icone: BarChart3 },
    // Paiement en ligne des factures masqué en v1 (D-21, src/lib/fonctions.js)
    ...(FONCTIONS.paiementEnLigne ? [{ cle: 'paiements', libelle: 'Paiements', icone: CreditCard }] : []),
  ]},
  { id: 'equipe', libelle: 'Équipe', rubriques: [
    { cle: 'team', libelle: 'Équipe & accès', icone: Users },
  ]},
  { id: 'avance', libelle: 'Avancé', rubriques: [
    { cle: 'donnees', libelle: 'Données', icone: HardDrive },
    { cle: 'administratif', libelle: 'Administratif', icone: FolderOpen },
    { cle: 'multi', libelle: 'Multi-entreprise', icone: Construction },
  ]},
];

// ── Frais de structure charge items ─────────────────────────────────────────
const FRAIS_ITEMS = [
  { key: 'loyer', label: 'Loyer / local', placeholder: '1500', icon: Home },
  { key: 'assurances', label: 'Assurances (RC + Décennale)', placeholder: '800', icon: Shield },
  { key: 'telephone', label: 'Téléphone / Internet', placeholder: '100', icon: Smartphone },
  { key: 'comptable', label: 'Comptable / Expert', placeholder: '300', icon: Calculator },
  { key: 'carburant', label: 'Carburant / Déplacements', placeholder: '400', icon: Fuel },
  { key: 'divers', label: 'Fournitures / Divers', placeholder: '200', icon: Package },
];

// Formes juridiques : une liste fermée (l'assistant proposait un texte libre ; « micro-entreprise » tapé à la
// main n'était pas reconnu et la TVA s'ajoutait sous la franchise 293 B)
const FORMES_JURIDIQUES = [
  { valeur: 'EI', libelle: 'Entreprise individuelle (EI)' },
  { valeur: 'EIRL', libelle: 'EIRL' },
  { valeur: 'Micro-entreprise', libelle: 'Micro-entreprise', detail: 'auto-entrepreneur' },
  { valeur: 'EURL', libelle: 'EURL' },
  { valeur: 'SARL', libelle: 'SARL' },
  { valeur: 'SAS', libelle: 'SAS' },
  { valeur: 'SASU', libelle: 'SASU' },
  { valeur: 'SA', libelle: 'SA (société anonyme)' },
  { valeur: 'SNC', libelle: 'SNC (société en nom collectif)' },
];

// Champs repris par « Reprendre les informations de l'entreprise » (texte et nombres seulement)
const CHAMPS_IMPORTABLES = [
  'nom', 'nomEntrepreneur', 'formeJuridique', 'capital', 'adresse', 'ville', 'codePostal', 'pays', 'tel', 'email', 'siteWeb',
  'slogan', 'siret', 'codeApe', 'tvaIntra', 'rcs', 'rcsVille', 'rcsNumero', 'rcsType', 'iban', 'bic', 'banque', 'titulaireBanque',
  'decennaleAssureur', 'decennaleNumero', 'decennaleValidite', 'decennaleActivites', 'decennaleAssureurAdresse', 'decennaleZone',
  'rcProAssureur', 'rcProNumero', 'rcProValidite', 'rcProMontantGarantie', 'rcProZone', 'rge', 'rgeOrganisme',
  'mediateur', 'mediateurContact', 'cgv', 'mentionDevis', 'mentionFacture', 'tvaDefaut', 'acompteDefaut', 'validiteDevis',
  'delaiPaiement', 'tauxPenalites', 'modePaiementDefaut', 'conditionsPaiementDefaut', 'tauxFraisStructure', 'couleur',
];

const VILLES_RCS = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Saint-Étienne', 'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne', 'Clermont-Ferrand', 'Aix-en-Provence', 'Brest', 'Tours', 'Amiens', 'Limoges', 'Annecy', 'Perpignan', 'Boulogne-Billancourt', 'Metz', 'Besançon', 'Orléans', 'Rouen', 'Mulhouse', 'Caen', 'Nancy', 'Saint-Denis', 'Argenteuil', 'Roubaix', 'Tourcoing', 'Montreuil', 'Avignon', 'Créteil', 'Poitiers', 'Fort-de-France', 'Versailles', 'Courbevoie', 'Vitry-sur-Seine', 'Colombes', 'Pau'];

// Listes des réglages des documents (menus de l'app à la place des listes natives : retours d'Hugo, 21-23 oct. 2026).
// « 30 % (recommandé BTP) » et « Virement bancaire (recommandé BTP) » sont retirés : affirmations invérifiables.
const VALIDITES = [{ valeur: 15, libelle: '15 jours' }, { valeur: 30, libelle: '30 jours' }, { valeur: 60, libelle: '2 mois' }, { valeur: 90, libelle: '3 mois' }];
const DELAIS = [{ valeur: 0, libelle: 'Comptant' }, { valeur: 14, libelle: '14 jours' }, { valeur: 30, libelle: '30 jours' }, { valeur: 45, libelle: '45 jours' }, { valeur: 60, libelle: '60 jours' }];
const ACOMPTES = [{ valeur: 0, libelle: 'Pas d’acompte' }, { valeur: 20, libelle: '20 %' }, { valeur: 30, libelle: '30 %' }, { valeur: 40, libelle: '40 %' }, { valeur: 50, libelle: '50 %' }];
// La valeur enregistrée est toujours proposée, même hors de la liste (25 % choisi au curseur de l'assistant) : avant,
// le menu affichait « Choisir… » (relecture du 26 oct. 2026)
const optionsAcompte = (valeur) => {
  const n = Number(valeur);
  if (!Number.isFinite(n) || ACOMPTES.some((a) => a.valeur === n)) return ACOMPTES;
  return [...ACOMPTES, { valeur: n, libelle: `${String(n).replace('.', ',')} %` }].sort((a, b) => a.valeur - b.valeur);
};
const TYPES_RCS = [{ valeur: 'A', libelle: 'A : commerçant' }, { valeur: 'B', libelle: 'B : société commerciale' }, { valeur: 'C', libelle: 'C : GIE' }, { valeur: 'D', libelle: 'D : société civile' }];
const ORGANISMES_RGE = ['Qualibat', 'Qualifelec', 'Qualit\'EnR', 'Qualiopi', 'Autre'].map((v) => ({ valeur: v, libelle: v }));

const TITRE_CARTE = 'text-lg font-semibold text-encre';

/** Une carte des Paramètres : titre de bloc (18 px), puis son contenu. */
function Bloc({ titre, sousTitre, lexique, children, className = '' }) {
  const t = <h2 className={TITRE_CARTE}>{titre}</h2>;
  return (
    <Carte className={className}>
      <div className="mb-4">
        {lexique ? <AideMot mot={lexique.mot} texte={lexique.texte}>{t}</AideMot> : t}
        {sousTitre ? <p className="mt-1 text-sm text-encre-3">{sousTitre}</p> : null}
      </div>
      {children}
    </Carte>
  );
}

/** Un choix dans une liste (menu de l'app) avec son libellé. */
function ChoixParam({ id, cle, libelle, titre, options, valeur, onChange, aide, lexique, facultatif, vide }) {
  const idLibelle = `${id}-libelle`;
  return (
    <ChampParam id={id} idLibelle={idLibelle} cle={cle} libelle={libelle} aide={aide} lexique={lexique} facultatif={facultatif}>
      <ChampChoix id={id} idLibelle={idLibelle} titre={titre || libelle} options={options} valeur={valeur} onChange={onChange} vide={vide} />
    </ChampParam>
  );
}

/** État d'une assurance d'après sa date de validité. */
function PastilleValidite({ date }) {
  if (!date) return null;
  const jours = Math.ceil((dateLue(date) - new Date()) / 86400000);
  if (jours < 0) return <Pastille ton="danger">Expirée</Pastille>;
  if (jours < 60) return <Pastille ton="alerte">Expire dans {jours} j</Pastille>;
  return <Pastille ton="succes" icone={Check}>Valide</Pastille>;
}

export default function Settings({ entreprise, setEntreprise, user, devis = [], depenses = [], clients = [], chantiers = [], isDark, couleur, setPage, modeDiscret }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { canManageTeam } = usePermissions();
  const { orgId } = useOrg();
  const relances = useRelances({
    devis, clients, entreprise,
    userId: user?.id,
    orgId,
  });

  // Droit d'accès et à la portabilité (RGPD art. 15 et 20) : TOUTES les données, pas des compteurs.
  // Sert aussi avant une suppression de compte (les factures se conservent 10 ans).
  const exporterDonneesRGPD = () => {
    try {
      const rgpdData = {
        export_type: 'RGPD - Droit d\'accès et portabilité (art. 15 et 20)',
        date: new Date().toISOString(),
        utilisateur: {
          email: user?.email || 'Mode démo',
          id: user?.id || 'demo',
          date_inscription: user?.created_at || null,
        },
        entreprise,
        donnees: { clients, devis_et_factures: devis, chantiers, depenses },
        // Conditions d'utilisation acceptées (métadonnées du compte, depuis le 25 oct. 2026). Le bandeau des traceurs a été
        // retiré : aucun traceur soumis à consentement n'est utilisé, il n'y a plus de choix à exporter.
        conditions_utilisation: {
          version: user?.user_metadata?.cgu_version || entreprise?.cguVersion || null,
          acceptees_le: user?.user_metadata?.cgu_accepted_at || entreprise?.cguAcceptedAt || null,
        },
      };
      const blob = new Blob([JSON.stringify(rgpdData, null, 2)], { type: 'application/json' });
      remettreFichier(blob, `mallettico_export_donnees_${jourLocal()}.json`)
        .then((r) => { if (r !== 'annule') showToast('Export de vos données prêt', 'success'); })
        .catch((e) => { captureException(e, { context: 'export RGPD' }); showToast('Erreur lors de l\'export de vos données', 'error'); });
    } catch (e) {
      captureException(e, { context: 'export RGPD' });
      showToast('Erreur lors de l\'export de vos données', 'error');
    }
  };

  const [tab, setTab] = useState('identite');
  // Téléphone : la liste des rubriques d'abord, puis la page d'une rubrique (au bureau, les deux côte à côte)
  const [vueMobile, setVueMobile] = useState('liste');
  const ouvrirRubrique = useCallback((cle) => {
    setTab(cle);
    setVueMobile('rubrique');
    try { window.scrollTo({ top: 0 }); } catch { /* jsdom : pas de défilement */ }
  }, []);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(() => {
    try { return parseInt(localStorage.getItem('cp_wizard_step'), 10) || 0; } catch { return 0; }
  });
  const [sireneLoading, setSireneLoading] = useState(false);
  const [showFraisCalc, setShowFraisCalc] = useState(false);
  const [fraisCharges, setFraisCharges] = useState({});
  const [survolLogo, setSurvolLogo] = useState(false);
  // Taux de pénalités en cours de saisie (null : pas de saisie), enregistré à la sortie du champ s'il atteint le minimum
  // légal (avis juriste du 26 oct. 2026, R13 : un taux de 1 % s'imprimait tel quel)
  const [brouillonPenalites, setBrouillonPenalites] = useState(null);
  const [penalitesRefusees, setPenalitesRefusees] = useState(false);

  // Rubrique Équipe réservée à qui gère l'équipe
  const groupesVisibles = GROUPES.filter((g) => g.id !== 'equipe' || canManageTeam);

  // Persist wizard step
  useEffect(() => {
    if (showSetupWizard) {
      try { localStorage.setItem('cp_wizard_step', String(wizardStep)); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
    }
  }, [wizardStep, showSetupWizard]);

  // Enregistrement : « Enregistré » près du champ (`cle`), seulement une fois la base d'accord ; un refus se dit près du
  // champ et par une notification, et reste affiché. Plus de « Modifications enregistrées » à chaque champ (retours
  // d'Hugo, 21-23 oct. 2026). Sans `cle` (rubriques Relances, Ramonage…), l'état s'affiche à côté du titre de la page.
  const { etat: etatEnregistrement, debut, reussite, echec, abandon } = useEtatsEnregistrement();
  const CLE_PAGE = '__page';
  const updateEntreprise = useCallback((updater, cle = CLE_PAGE) => {
    debut(cle);
    return Promise.resolve(setEntreprise(updater)).then((ecrit) => {
      // Rien n'a été écrit (envois automatiques refusés faute de conditions d'utilisation acceptées, App.jsx) : aucun
      // « Enregistré » — l'app a déjà dit pourquoi (relecture du 25 oct. 2026 : « Enregistré » s'affichait quand même)
      if (ecrit === false) { abandon(cle); return false; }
      reussite(cle);
      return true;
    }).catch((e) => {
      captureException(e, { context: 'paramètres entreprise' });
      echec(cle);
      showToast('Modification non enregistrée. Vérifiez votre connexion et réessayez.', 'error');
      return false;
    });
  }, [setEntreprise, showToast, debut, reussite, echec, abandon]);
  const maj = (cle, transformer = (v) => v) => (val) => updateEntreprise((p) => ({ ...p, [cle]: transformer(val) }), cle);

  // SIRENE API lookup
  const lookupSIRENE = useCallback(async () => {
    const siret = (entreprise.siret || '').replace(/\s/g, '');
    if (!/^\d{14}$/.test(siret)) {
      showToast('SIRET invalide (14 chiffres requis)', 'error');
      return;
    }
    setSireneLoading(true);
    try {
      // API publique de l'État, sans clé (src/lib/sirene.js)
      const resp = await fetch(`${URL_SIRENE}?q=${encodeURIComponent(siret)}&per_page=1`, { headers: { Accept: 'application/json' } });
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const profil = profilDepuisSirene(await resp.json(), siret);
      if (!profil) throw new Error('SIRET introuvable');
      const fullNom = profil.nom;
      // Seuls les champs vides sont remplis (le code APE, public, est mis à jour). L'adresse d'une ligne du répertoire
      // (« 3 RUE DES LILAS 33000 BORDEAUX ») se range dans les trois champs.
      const ok = await updateEntreprise((prev) => {
        const adresseSirene = profil.adresse && !prev.adresse ? champsAdresse({ adresse: profil.adresse }) : null;
        return {
          ...prev,
          ...(profil.nom && !prev.nom ? { nom: profil.nom } : {}),
          ...(adresseSirene ? { adresse: adresseComposee(adresseSirene), codePostal: adresseSirene.codePostal, ville: adresseSirene.ville } : {}),
          ...(profil.codeApe ? { codeApe: profil.codeApe } : {}),
          ...(profil.formeJuridique && !prev.formeJuridique ? { formeJuridique: profil.formeJuridique } : {}),
          ...(profil.nomEntrepreneur && !prev.nomEntrepreneur ? { nomEntrepreneur: profil.nomEntrepreneur } : {}),
        };
      }, 'siret');
      if (ok) showToast(`SIRENE : ${fullNom || 'Entreprise trouvée'}`, 'success');
    } catch (err) {
      if (err?.message === 'SIRET introuvable') showToast('Ce SIRET est introuvable dans le répertoire SIRENE : vérifiez-le.', 'error');
      else { captureException(err, { context: 'auto-remplissage SIRENE' }); showToast('Le répertoire SIRENE ne répond pas : réessayez plus tard ou remplissez les champs à la main.', 'error'); }
    }
    setSireneLoading(false);
  }, [entreprise.siret, updateEntreprise, showToast]);

  // Frais de structure calculator
  const fraisTotal = useMemo(() => Object.values(fraisCharges).reduce((s, v) => s + (parseFloat(v) || 0), 0), [fraisCharges]);
  // CA moyen mensuel des 6 derniers mois : factures émises, avoirs déduits (src/lib/ventes.js). Avant (recette du
  // 9 oct. 2026) : devis signés ET factures payées additionnés, et 1 € sur un compte neuf, d'où « 230000 % ».
  const caEstime = useMemo(() => {
    const now = new Date();
    const du = jourLocal(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()));
    return chiffreAffairesHT(devis, { du }) / 6;
  }, [devis]);
  // Pas de chiffre d'affaires : pas de suggestion ; sinon borné comme le champ (50 %)
  const tauxSuggere = useMemo(() => (caEstime > 0 ? Math.min(50, Math.round((fraisTotal / caEstime) * 100)) : null), [fraisTotal, caEstime]);

  // Ouvre la rubrique et amène le champ sous les yeux (chaque champ porte id="settings-field-<champ>")
  const allerAuChamp = useCallback((onglet, champ) => {
    ouvrirRubrique(onglet);
    setTimeout(() => {
      const el = document.getElementById(`settings-field-${champ}`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
    }, 150);
  }, [ouvrirRubrique]);

  // Navigation demandée par une autre rubrique (ex. Facture 2026 → « Compléter »)
  useEffect(() => {
    const handleTabNav = (e) => {
      const data = e.detail;
      // Support both string (legacy) and object { tab, fieldId } formats
      const tabValue = typeof data === 'string' ? data : data?.tab;
      const fieldId = typeof data === 'object' ? data?.fieldId : null;
      if (!tabValue) return;
      if (fieldId) allerAuChamp(tabValue, fieldId);
      else ouvrirRubrique(tabValue);
    };
    window.addEventListener('navigate-settings-tab', handleTabNav);
    return () => window.removeEventListener('navigate-settings-tab', handleTabNav);
  }, [allerAuChamp, ouvrirRubrique]);

  // Comptabilite state
  const [exportPeriod, setExportPeriod] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      debut: jourLocal(firstDay),
      fin: jourLocal(now)
    };
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Veuillez choisir un fichier image', 'error');
      if (e.target) e.target.value = '';
      return;
    }
    try {
      // Compresse/redimensionne le logo (≤512px) avant stockage : il est stocké en
      // base64 dans l'entreprise, chargé sur chaque page ET intégré dans chaque PDF.
      // Sans ça, un gros logo gonfle la base et alourdit tous les documents.
      const blob = await compressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.9,
        format: file.type === 'image/png' ? 'image/png' : 'image/jpeg', // garde la transparence des PNG
        maxSizeBytes: 200 * 1024,
      });
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      // Par l'enregistrement commun : un refus de la base se dit (avant : aucun message, logo absent)
      await updateEntreprise(p => ({ ...p, logo: dataUrl }), 'logo');
    } catch (err) {
      // Échec du traitement de l'image (le refus de la base est dit par updateEntreprise)
      captureException(err, { context: 'logo entreprise' });
      showToast('Le logo n\'a pas été enregistré. Réessayez avec une image plus légère ou plus tard.', 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Helper to mask sensitive data in modeDiscret
  const maskValue = (value) => modeDiscret ? '····················' : value;

  // Où en est le profil (lib/jaugeProfil) : ce qui bloque l'envoi, ce qui est à vérifier selon la situation, le reste
  const jauge = jaugeProfil(entreprise);
  const { completude } = jauge;

  // Alertes assurances
  const alertesAssurances = useMemo(() => {
    const alerts = [];
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const verifier = (type, valeur, nom) => {
      if (!valeur) return;
      const date = new Date(valeur);
      if (date < now) alerts.push({ type, severity: 'critical', message: `${nom} expirée`, date });
      else if (date < in30Days) alerts.push({ type, severity: 'warning', message: `${nom} : expire dans moins de 30 jours`, date });
      else if (date < in60Days) alerts.push({ type, severity: 'info', message: `${nom} : expire dans moins de 60 jours`, date });
    };
    verifier('rc', entreprise.rcProValidite, 'RC Pro');
    verifier('decennale', entreprise.decennaleValidite, 'Décennale');
    return alerts;
  }, [entreprise.rcProValidite, entreprise.decennaleValidite]);

  const hasAssuranceAlerts = alertesAssurances.some(a => a.severity === 'critical' || a.severity === 'warning');
  const TON_ALERTE = { critical: 'bg-danger-fond text-danger-texte', warning: 'bg-alerte-fond text-alerte-texte', info: 'bg-info-fond text-info-texte' };

  // Résumé de TVA de la période : règles communes (src/lib/integrations/accounting.js). Les exports (FEC, CSV) sont
  // ceux de Finances › Export comptable ; ceux d'ici comptaient les brouillons et recalculaient la TVA à 20 %
  // (relecture juriste-btp du 17 oct. 2026).
  const franchiseTva = estFranchiseTva(entreprise);
  const tvaSummary = useMemo(() => {
    return calculateTVASummary(devis, depenses, exportPeriod.debut, exportPeriod.fin, { franchise: franchiseTva });
  }, [devis, depenses, exportPeriod, franchiseTva]);

  const ouvrirExportComptable = () => {
    try { sessionStorage.setItem('cp_finances_onglet', 'export'); } catch (e) { captureException(e, { contexte: 'ouvrirExportComptable' }); }
    setPage?.('finances');
  };

  // Validation format TVA
  const validateTVA = (value) => /^FR[0-9A-Z]{2}\d{9}$/.test(value.replace(/\s/g, '').toUpperCase());
  // Validation SIRET
  const validateSIRET = (value) => /^\d{14}$/.test(value.replace(/\s/g, ''));
  const telValide = (v) => /^(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test((v || '').trim());
  const emailValide = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());

  // Formater RCS complet
  const getRCSComplet = () => {
    if (!entreprise.rcsVille || !entreprise.rcsNumero) return '';
    return `RCS ${entreprise.rcsVille} ${entreprise.rcsType || 'B'} ${entreprise.rcsNumero}`;
  };

  const ouvrirAssistant = () => { setShowSetupWizard(true); setWizardStep(0); };
  // Taux de pénalités : refusé sous le minimum légal du semestre (src/lib/tauxInteretLegal.js), la saisie reste affichée
  const enregistrerPenalites = () => {
    if (brouillonPenalites === null) return;
    if (!tauxPenalitesValide(brouillonPenalites)) { setPenalitesRefusees(true); return; }
    const vide = String(brouillonPenalites).trim() === '';
    const taux = vide ? null : Number(String(brouillonPenalites).replace(',', '.'));
    setPenalitesRefusees(false);
    setBrouillonPenalites(null);
    updateEntreprise((p) => ({ ...p, tauxPenalites: taux }), 'tauxPenalites');
  };
  const rubriqueCourante = groupesVisibles.flatMap((g) => g.rubriques).find((r) => r.cle === tab);
  const formeLibelle = FORMES_JURIDIQUES.find((f) => f.valeur === entreprise.formeJuridique)?.libelle;
  const pageEnregistrement = { enCours: etatEnregistrement.enCours === CLE_PAGE, fait: etatEnregistrement.fait === CLE_PAGE, erreur: !!etatEnregistrement.erreurs[CLE_PAGE] };
  const idIban = useId();

  return (
    <EnregistrementContext.Provider value={etatEnregistrement}>
    <div className="space-y-4 sm:space-y-6">
      <EnTetePage
        className="!mb-0"
        titre="Paramètres"
        sousTitre={[entreprise.nom, formeLibelle].filter(Boolean).join(' · ') || null}
        actions={(pageEnregistrement.enCours || pageEnregistrement.fait || pageEnregistrement.erreur) ? (
          <span className="text-sm"><EtatEnregistrement cle={CLE_PAGE} /></span>
        ) : null}
      />
      {/* Annonce aux lecteurs d'écran (l'état visible est près du champ) */}
      <p role="status" className="sr-only">
        {Object.keys(etatEnregistrement.erreurs).length ? 'Modification non enregistrée' : etatEnregistrement.fait ? 'Enregistré' : ''}
      </p>

      {/* Profil : au bureau toujours, au téléphone sur la liste des rubriques */}
      <div className={vueMobile === 'rubrique' ? 'hidden md:block' : ''}>
        <EtatProfil jauge={jauge} onAllerAuChamp={allerAuChamp} onAssistant={ouvrirAssistant} />
      </div>

      {/* Alertes assurances critiques */}
      {alertesAssurances.filter(a => a.severity === 'critical').map((alert, i) => (
        <div key={i} className={`rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 bg-danger-fond text-danger-texte ${vueMobile === 'rubrique' ? 'hidden md:flex' : ''}`}>
          <AlertCircle size={20} aria-hidden="true" className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{alert.message}</p>
            <p className="text-sm">Expiration le {alert.date.toLocaleDateString('fr-FR')}</p>
          </div>
          <Bouton taille="compacte" onClick={() => ouvrirRubrique('assurances')}>Renouveler</Bouton>
        </div>
      ))}

      <div className="md:flex md:items-start md:gap-6">
        {/* Bureau et tablette : colonne de navigation */}
        <nav aria-label="Rubriques des paramètres" className="hidden md:block md:w-52 lg:w-56 flex-shrink-0 md:sticky md:top-4">
          {groupesVisibles.map((g) => (
            <div key={g.id} className="mb-4">
              <p className="px-3 mb-1 text-sm font-semibold text-encre-3">{g.libelle}</p>
              <ul>
                {g.rubriques.map((r) => {
                  const actif = r.cle === tab;
                  const Icone = r.icone;
                  return (
                    <li key={r.cle}>
                      <button
                        type="button"
                        onClick={() => ouvrirRubrique(r.cle)}
                        aria-current={actif ? 'page' : undefined}
                        className={`relative w-full h-11 flex items-center gap-2.5 px-3 rounded-xl text-left text-sm transition-colors ${actif ? 'bg-surface-2 text-encre font-semibold' : 'text-encre-2 font-medium hover:bg-surface-2 hover:text-encre'}`}
                      >
                        {actif ? <span aria-hidden="true" className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-accent" /> : null}
                        <Icone size={17} aria-hidden="true" className="flex-shrink-0" />
                        <span className="truncate">{r.libelle}</span>
                        {r.cle === 'assurances' && hasAssuranceAlerts ? <span aria-label="à renouveler" className="ml-auto w-2 h-2 rounded-full bg-danger-point" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Téléphone : la liste des rubriques */}
        {vueMobile === 'liste' && (
          <div className="md:hidden space-y-5" data-parametres="liste">
            {groupesVisibles.map((g) => (
              <section key={g.id} aria-label={g.libelle}>
                <h2 className="text-sm font-semibold text-encre-3 mb-2 px-1">{g.libelle}</h2>
                <GroupeListe>
                  {g.rubriques.map((r) => {
                    const Icone = r.icone;
                    return (
                      <LigneListe
                        key={r.cle}
                        onClick={() => ouvrirRubrique(r.cle)}
                        aria-label={r.libelle}
                        debut={<span className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-2 text-encre-2"><Icone size={18} aria-hidden="true" /></span>}
                        titre={r.libelle}
                        pastille={r.cle === 'assurances' && hasAssuranceAlerts ? <Pastille ton="danger">À renouveler</Pastille> : null}
                      />
                    );
                  })}
                </GroupeListe>
              </section>
            ))}
          </div>
        )}

        {/* La rubrique */}
        <div className={`flex-1 min-w-0 space-y-4 sm:space-y-6 ${vueMobile === 'liste' ? 'hidden md:block' : ''}`}>
          <div className="md:hidden flex items-center gap-1 -ml-2">
            <button type="button" onClick={() => { setVueMobile('liste'); try { window.scrollTo({ top: 0 }); } catch { /* jsdom */ } }}
              className="h-11 inline-flex items-center gap-1 pl-1 pr-3 rounded-xl text-sm font-semibold text-accent-texte hover:bg-surface-2">
              <ChevronLeft size={20} aria-hidden="true" /> Paramètres
            </button>
          </div>
          {rubriqueCourante ? <h2 className="md:hidden text-xl font-bold text-encre">{rubriqueCourante.libelle}</h2> : null}

      {/* IDENTITÉ */}
      {tab === 'identite' && (
        <div className="space-y-4 sm:space-y-6">
          <Bloc titre="Logo et couleur">
            <div className="flex gap-6 flex-wrap items-start">
              <div>
                <div className="flex items-end justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium text-encre-2">Logo de l’entreprise</p>
                  <EtatEnregistrement cle="logo" />
                </div>
                <div className="flex items-center gap-4">
                  <div
                    onDragOver={e => { e.preventDefault(); setSurvolLogo(true); }}
                    onDragLeave={() => setSurvolLogo(false)}
                    onDrop={e => { e.preventDefault(); setSurvolLogo(false); const file = e.dataTransfer.files?.[0]; if (file) handleLogoUpload({ target: { files: [file] } }); }}
                    className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all bg-surface-2 ${survolLogo ? 'border-accent ring-2 ring-accent' : 'border-bord-fort'}`}>
                    {entreprise.logo ? (
                      <img src={entreprise.logo} className="w-full h-full object-contain" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : entreprise.nom ? (
                      <span className="text-2xl font-bold text-encre-2" aria-hidden="true">
                        {entreprise.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    ) : (
                      <Building2 size={28} aria-hidden="true" className="text-encre-3" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="inline-flex items-center h-11 px-4 rounded-full cursor-pointer text-sm font-semibold bg-surface text-encre border border-bord-fort hover:bg-surface-2">
                      Choisir une image
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="sr-only" />
                    </label>
                    {entreprise.logo && (
                      <button type="button" onClick={() => updateEntreprise(p => ({ ...p, logo: '' }), 'logo')} className="block h-11 text-sm font-semibold text-danger-texte hover:underline">
                        Supprimer le logo
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-encre-3 mt-2">PNG ou JPG, 500 Ko au plus.</p>
              </div>
              <ChoixCouleur entreprise={entreprise} updateEntreprise={updateEntreprise} />
            </div>
          </Bloc>

          <Bloc titre="Informations de l’entreprise">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChampParam id="settings-field-nom" cle="nom" libelle="Nom de l’entreprise" className="md:col-span-2">
                <DebouncedInput id="settings-field-nom" placeholder="Ex : Dupont Rénovation" value={entreprise.nom || ''} onChange={maj('nom')} />
              </ChampParam>
              <ChoixParam id="settings-field-formeJuridique" cle="formeJuridique" libelle="Statut juridique" titre="Forme juridique"
                options={FORMES_JURIDIQUES} valeur={entreprise.formeJuridique || ''} onChange={maj('formeJuridique')} vide="Choisir le statut" />
              {/* Société : forme juridique ET capital social sur les factures (C. com. R123-238). Un entrepreneur individuel
                  n'a pas de capital : le champ n'est pas proposé, et les documents ne l'impriment pas (avis juriste, R10). */}
              {estSociete(entreprise) && (
                <ChampParam id="settings-field-capital" cle="capital" libelle="Capital social" aide="Obligatoire pour une SARL, une EURL, une SAS, une SASU ou une SA (art. R123-238 du Code de commerce).">
                  <div className="flex">
                    <DebouncedInput id="settings-field-capital" type="number" inputMode="decimal" className={`${CLASSE_CHAMP} rounded-r-none`} placeholder="10000" value={entreprise.capital || ''} onChange={maj('capital')} />
                    <span className="h-12 px-4 flex items-center border-y border-r rounded-r-xl bg-surface-2 text-encre-3 border-bord-fort">€</span>
                  </div>
                </ChampParam>
              )}
              {(estEntrepreneurIndividuel(entreprise) || estEirl(entreprise)) && (
                <ChampParam id="settings-field-nomEntrepreneur" cle="nomEntrepreneur" libelle="Votre prénom et nom" lexique={LEXIQUE.ei} className="md:col-span-2"
                  aide={<>Sur vos devis et factures, votre nom doit être précédé ou suivi immédiatement de « {estEirl(entreprise) ? 'EIRL' : 'EI'} ». Il s’imprimera ainsi : <strong className="text-encre-2">{nomImprime(entreprise) || '—'}</strong></>}>
                  <DebouncedInput id="settings-field-nomEntrepreneur" placeholder="Ex : Hugo Séguin" value={entreprise.nomEntrepreneur || ''} onChange={maj('nomEntrepreneur')} />
                </ChampParam>
              )}
              <div className="md:col-span-2">
                <ChampsAdresse id="settings-field-adresse" entreprise={entreprise} updateEntreprise={updateEntreprise} />
              </div>
              <ChampParam id="settings-field-tel" cle="tel" libelle="Téléphone">
                <div className="relative">
                  <DebouncedInput id="settings-field-tel" type="tel" className={`${CLASSE_CHAMP} pr-10`} placeholder="06 12 34 56 78" value={entreprise.tel || ''} onChange={maj('tel')} />
                  {telValide(entreprise.tel) && <Check size={18} aria-label="Numéro valide" className="absolute right-3 top-1/2 -translate-y-1/2 text-succes-texte" />}
                </div>
              </ChampParam>
              <ChampParam id="settings-field-email" cle="email" libelle="E-mail">
                <div className="relative">
                  <DebouncedInput id="settings-field-email" type="email" className={`${CLASSE_CHAMP} pr-10`} placeholder="contact@monentreprise.fr" value={entreprise.email || ''} onChange={maj('email')} />
                  {emailValide(entreprise.email) && <Check size={18} aria-label="Adresse valide" className="absolute right-3 top-1/2 -translate-y-1/2 text-succes-texte" />}
                </div>
              </ChampParam>
              <ChampParam id="settings-field-siteWeb" cle="siteWeb" libelle="Site web" facultatif>
                <DebouncedInput id="settings-field-siteWeb" placeholder="www.monentreprise.fr" value={entreprise.siteWeb || ''} onChange={maj('siteWeb')} />
              </ChampParam>
              <ChampParam id="settings-field-slogan" cle="slogan" libelle="Slogan" facultatif>
                <DebouncedInput id="settings-field-slogan" placeholder="Votre artisan de confiance" value={entreprise.slogan || ''} onChange={maj('slogan')} />
              </ChampParam>
            </div>
          </Bloc>

          {/* Aperçu de l'en-tête d'un document : la couleur imprimée telle quelle (comme les générateurs de documents) */}
          {(() => {
            const couleurDoc = entreprise.couleur || COULEUR_DOCUMENTS_DEFAUT;
            return (
              <Bloc titre="Aperçu de l’en-tête de vos documents">
                <div className="border border-bord rounded-xl p-4 sm:p-6 bg-surface-2">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {entreprise.logo ? (
                        <img src={entreprise.logo} className="h-16 object-contain" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-bold text-lg text-encre break-words">{nomImprime(entreprise) || entreprise.nom || 'Nom de l’entreprise'}</p>
                        {entreprise.slogan && <p className="text-sm text-encre-3 italic">{entreprise.slogan}</p>}
                        {entreprise.formeJuridique && (
                          <p className="text-sm text-encre-3">{entreprise.formeJuridique}{entreprise.capital && ` · Capital : ${entreprise.capital} €`}</p>
                        )}
                        {entreprise.adresse ? (
                          <p className="text-sm text-encre-3 whitespace-pre-line mt-1">{adresseComplete(entreprise)}</p>
                        ) : (
                          <p className="text-sm text-alerte-texte mt-1 flex items-center gap-1"><AlertTriangle size={14} aria-hidden="true" /> Adresse manquante : vos documents ne seront pas conformes</p>
                        )}
                      </div>
                    </div>
                    <p className="font-bold text-xl flex-shrink-0" style={{ color: couleurDoc }}>DEVIS</p>
                  </div>
                  <div className="text-sm text-encre-3 space-y-0.5 border-t border-bord pt-3 mt-3">
                    {entreprise.siret && <p>SIRET : {maskValue(entreprise.siret)} {entreprise.codeApe && `· APE : ${entreprise.codeApe}`}</p>}
                    {getRCSComplet() && <p>{getRCSComplet()}</p>}
                    {entreprise.tvaIntra && <p>TVA intracommunautaire : {entreprise.tvaIntra}</p>}
                    {entreprise.tel && <p>Tél. : {entreprise.tel} {entreprise.email && `· ${entreprise.email}`}</p>}
                    {/* Même règle que les documents : la décennale n'apparaît qu'avec l'assureur ET le n° de police */}
                    {(entreprise.rcProAssureur || (entreprise.decennaleAssureur && entreprise.decennaleNumero)) && (
                      <p className="pt-1">
                        {entreprise.rcProAssureur && `RC Pro : ${entreprise.rcProAssureur}${entreprise.rcProNumero ? ` n° ${entreprise.rcProNumero}` : ''}`}
                        {entreprise.rcProAssureur && entreprise.decennaleAssureur && entreprise.decennaleNumero && ' · '}
                        {entreprise.decennaleAssureur && entreprise.decennaleNumero && `Décennale : ${entreprise.decennaleAssureur} n° ${entreprise.decennaleNumero}${entreprise.decennaleValidite ? ` (valide jusqu’au ${dateLue(entreprise.decennaleValidite).toLocaleDateString('fr-FR')})` : ''}`}
                      </p>
                    )}
                  </div>
                </div>
              </Bloc>
            );
          })()}
        </div>
      )}

      {/* LÉGAL */}
      {tab === 'legal' && (
        <div className="space-y-4 sm:space-y-6">
          <Bloc titre="Numéros d’identification">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChampParam id="settings-field-siret" cle="siret" libelle="SIRET (14 chiffres)" lexique={LEXIQUE.siret}>
                <div className="relative">
                  <DebouncedInput id="settings-field-siret" inputMode="numeric"
                    className={`${CLASSE_CHAMP} pr-10 tabular-nums ${entreprise.siret && !validateSIRET(entreprise.siret) ? '!border-alerte-point' : ''}`}
                    aria-invalid={entreprise.siret && !validateSIRET(entreprise.siret) ? true : undefined}
                    placeholder="123 456 789 00012" maxLength={17} value={entreprise.siret || ''} onChange={maj('siret')} />
                  {entreprise.siret && validateSIRET(entreprise.siret) && <Check size={18} aria-label="SIRET valide" className="absolute right-3 top-1/2 -translate-y-1/2 text-succes-texte" />}
                </div>
                {entreprise.siret && !validateSIRET(entreprise.siret) && (
                  <p className="mt-1.5 text-sm font-medium text-danger-texte">Format invalide : 14 chiffres attendus.</p>
                )}
              </ChampParam>
              <ChampParam id="settings-field-codeApe" cle="codeApe" libelle="Code APE (NAF)" facultatif lexique={LEXIQUE.ape}>
                <DebouncedInput id="settings-field-codeApe" placeholder="4321A" maxLength={5} value={entreprise.codeApe || ''} onChange={maj('codeApe', (v) => v.toUpperCase())} />
              </ChampParam>
            </div>
          </Bloc>

          {entreprise.formeJuridique !== 'Micro-entreprise' && entreprise.formeJuridique !== 'Auto-entrepreneur' ? (
            <Bloc titre="RCS : registre du commerce" lexique={LEXIQUE.rcs} sousTitre="Format : RCS, ville du greffe, type, numéro (ex. RCS Paris B 123 456 789).">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ChoixParam id="settings-field-rcs" cle="rcsVille" libelle="Ville du greffe" options={VILLES_RCS.map((v) => ({ valeur: v, libelle: v }))}
                  valeur={entreprise.rcsVille || ''} onChange={maj('rcsVille')} vide="Choisir la ville" />
                <ChoixParam id="settings-field-rcsType" cle="rcsType" libelle="Type" titre="Type d’immatriculation" options={TYPES_RCS}
                  valeur={entreprise.rcsType || 'B'} onChange={maj('rcsType')} />
                <ChampParam id="settings-field-rcsNumero" cle="rcsNumero" libelle="Numéro (9 chiffres)">
                  <DebouncedInput id="settings-field-rcsNumero" inputMode="numeric" className={`${CLASSE_CHAMP} tabular-nums`} placeholder="123 456 789" maxLength={11} value={entreprise.rcsNumero || ''} onChange={maj('rcsNumero')} />
                </ChampParam>
              </div>
              {getRCSComplet() && (
                <p className="mt-4 p-3 rounded-xl text-sm bg-succes-fond text-succes-texte">Sera imprimé : <strong>{getRCSComplet()}</strong></p>
              )}
            </Bloc>
          ) : (
            <div className="rounded-2xl p-4 flex items-start gap-3 bg-info-fond text-info-texte">
              <Info size={18} aria-hidden="true" className="flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Micro-entreprise</p>
                <p className="mt-0.5">Le RCS ne concerne que les commerçants et les sociétés. Un artisan en micro-entreprise est inscrit au registre national des entreprises (RNE) : il n’a pas de numéro de RCS à saisir.</p>
              </div>
            </div>
          )}

          {franchiseTva ? (
            <div className="rounded-2xl p-4 flex items-start gap-3 bg-info-fond text-info-texte">
              <Info size={18} aria-hidden="true" className="flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Franchise en base de TVA</p>
                <p className="mt-0.5">La mention « TVA non applicable, art. 293 B du CGI » est ajoutée d’elle-même sur vos devis et factures.</p>
              </div>
            </div>
          ) : null}
          {/* Le numéro, pour toutes les formes : un micro-entrepreneur qui a dépassé les seuils de la franchise ou opté pour
              la TVA en a un (avis juriste du 26 oct. 2026) */}
          <Bloc titre="TVA intracommunautaire" lexique={LEXIQUE.tvaIntra}>
              <ChampParam id="settings-field-tvaIntra" cle="tvaIntra" libelle="Numéro de TVA" facultatif={franchiseTva} aide="FR suivi de 11 caractères (ex. FR12345678901).">
                <DebouncedInput id="settings-field-tvaIntra" className={`${CLASSE_CHAMP} ${entreprise.tvaIntra && !validateTVA(entreprise.tvaIntra) ? '!border-alerte-point' : ''}`} placeholder="FR 12 345678901" value={entreprise.tvaIntra || ''} onChange={maj('tvaIntra', (v) => v.toUpperCase())} />
                {entreprise.tvaIntra && validateTVA(entreprise.tvaIntra) && <p className="mt-1.5 text-sm text-succes-texte">Format valide</p>}
              </ChampParam>
            </Bloc>

          <Bloc titre="Qualifications professionnelles">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChampParam id="settings-field-rge" cle="rge" libelle="Numéro RGE" facultatif aide="Reconnu garant de l’environnement.">
                <DebouncedInput id="settings-field-rge" placeholder="E-12345" value={entreprise.rge || ''} onChange={maj('rge')} />
              </ChampParam>
              <ChoixParam id="settings-field-rgeOrganisme" cle="rgeOrganisme" libelle="Organisme RGE" facultatif options={ORGANISMES_RGE}
                valeur={entreprise.rgeOrganisme || ''} onChange={maj('rgeOrganisme')} vide="Choisir l’organisme" />
            </div>
          </Bloc>
        </div>
      )}

      {/* ASSURANCES */}
      {tab === 'assurances' && (
        <div className="space-y-4 sm:space-y-6">
          {alertesAssurances.length > 0 && (
            <div className="space-y-3">
              {alertesAssurances.map((alert, i) => (
                <div key={i} className={`rounded-2xl p-4 flex items-start gap-3 ${TON_ALERTE[alert.severity]}`}>
                  {alert.severity === 'info' ? <Info size={18} aria-hidden="true" className="flex-shrink-0 mt-0.5" /> : <AlertTriangle size={18} aria-hidden="true" className="flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 text-sm">
                    <p className="font-semibold">{alert.message}</p>
                    <p>Expiration le {alert.date.toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* C. assur. L241-1 (obligation : travaux de construction) et L243-2 (attestation jointe aux devis et factures) ;
              la RC Pro n'est pas obligatoire dans le bâtiment. Avant : « obligatoire pour les artisans du BTP », « L243-1 ». */}
          <div className="rounded-2xl p-4 bg-alerte-fond text-alerte-texte">
            <p className="font-semibold">Décennale : obligatoire pour les travaux de construction</p>
            <p className="text-sm mt-1">Si vous en faites, même parfois, joignez votre attestation à vos devis et factures. La RC Pro est conseillée, pas obligatoire.</p>
          </div>

          <Carte>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <AideMot mot={LEXIQUE.decennale.mot} texte={LEXIQUE.decennale.texte} className="min-w-0">
                <h2 className={TITRE_CARTE}>Garantie décennale</h2>
              </AideMot>
              <PastilleValidite date={entreprise.decennaleValidite} />
            </div>
            {/* D-24 : l'obligation de décennale (C. assur. L241-1) vise les travaux de construction, pas le dépannage
                ni l'entretien. Déclaré par l'artisan, sous sa responsabilité : l'envoi n'exige plus la décennale. */}
            <label className="flex items-start gap-3 min-h-11 mb-4 cursor-pointer">
              <input id="settings-field-decennaleNonSoumis" type="checkbox" className="mt-0.5 w-5 h-5 shrink-0 accent-accent"
                checked={entreprise.decennaleNonSoumis === true}
                onChange={e => updateEntreprise(p => ({ ...p, decennaleNonSoumis: e.target.checked }), 'decennaleNonSoumis')} />
              <span className="text-sm">
                <span className="font-medium text-encre">Je ne fais que du dépannage, de l'entretien ou de petites réparations : je ne suis pas soumis à la décennale</span>
                <span className="block text-encre-3">À cocher seulement si vous ne faites jamais de construction, d'extension ni de rénovation importante (par exemple refaire une toiture ou toute l'électricité d'un logement). En cas de doute, demandez à votre assureur. Vous le déclarez sous votre responsabilité.</span>
                <EtatEnregistrement cle="decennaleNonSoumis" />
              </span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChampParam id="settings-field-decennaleAssureur" cle="decennaleAssureur" libelle="Compagnie d’assurance">
                <DebouncedInput id="settings-field-decennaleAssureur" placeholder="SMABTP, AXA…" value={entreprise.decennaleAssureur || ''} onChange={maj('decennaleAssureur')} />
              </ChampParam>
              <ChampParam id="settings-field-decennaleNumero" cle="decennaleNumero" libelle="Numéro de contrat">
                <DebouncedInput id="settings-field-decennaleNumero" placeholder="DEC-987654321" value={entreprise.decennaleNumero || ''} onChange={maj('decennaleNumero')} />
              </ChampParam>
              <ChampParam id="settings-field-decennaleValidite" cle="decennaleValidite" libelle="Date de validité">
                <input id="settings-field-decennaleValidite" type="date" className={CLASSE_CHAMP} value={entreprise.decennaleValidite || ''} onChange={e => updateEntreprise(p => ({ ...p, decennaleValidite: e.target.value }), 'decennaleValidite')} />
              </ChampParam>
              <ChampParam id="settings-field-decennaleActivites" cle="decennaleActivites" libelle="Activités couvertes" facultatif>
                <DebouncedInput id="settings-field-decennaleActivites" placeholder="Tous corps d’état" value={entreprise.decennaleActivites || ''} onChange={maj('decennaleActivites')} />
              </ChampParam>
              {/* Mentions obligatoires sur devis et factures : coordonnées de l'assureur et couverture géographique */}
              <ChampParam id="settings-field-decennaleAssureurAdresse" cle="decennaleAssureurAdresse" libelle="Coordonnées de l’assureur">
                <DebouncedInput id="settings-field-decennaleAssureurAdresse" placeholder="Adresse de la compagnie" value={entreprise.decennaleAssureurAdresse || ''} onChange={maj('decennaleAssureurAdresse')} />
              </ChampParam>
              <ChampParam id="settings-field-decennaleZone" cle="decennaleZone" libelle="Zone géographique couverte">
                <DebouncedInput id="settings-field-decennaleZone" placeholder="France métropolitaine" value={entreprise.decennaleZone || ''} onChange={maj('decennaleZone')} />
              </ChampParam>
            </div>
          </Carte>

          <Carte>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className={TITRE_CARTE}>RC professionnelle</h2>
              <PastilleValidite date={entreprise.rcProValidite} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChampParam id="settings-field-rcPro" cle="rcProAssureur" libelle="Compagnie d’assurance" facultatif>
                <DebouncedInput id="settings-field-rcPro" placeholder="AXA, MAAF, MMA…" value={entreprise.rcProAssureur || ''} onChange={maj('rcProAssureur')} />
              </ChampParam>
              <ChampParam id="settings-field-rcProNumero" cle="rcProNumero" libelle="Numéro de contrat" facultatif>
                <DebouncedInput id="settings-field-rcProNumero" placeholder="RC-123456789" value={entreprise.rcProNumero || ''} onChange={maj('rcProNumero')} />
              </ChampParam>
              <ChampParam id="settings-field-rcProValidite" cle="rcProValidite" libelle="Date de validité" facultatif>
                <input id="settings-field-rcProValidite" type="date" className={CLASSE_CHAMP} value={entreprise.rcProValidite || ''} onChange={e => updateEntreprise(p => ({ ...p, rcProValidite: e.target.value }), 'rcProValidite')} />
              </ChampParam>
              <ChampParam id="settings-field-rcProMontantGarantie" cle="rcProMontantGarantie" libelle="Montant de garantie" facultatif>
                <div className="flex">
                  <DebouncedInput id="settings-field-rcProMontantGarantie" type="number" inputMode="decimal" className={`${CLASSE_CHAMP} rounded-r-none`} placeholder="300000" value={entreprise.rcProMontantGarantie || ''} onChange={maj('rcProMontantGarantie')} />
                  <span className="h-12 px-4 flex items-center border-y border-r rounded-r-xl bg-surface-2 text-encre-3 border-bord-fort">€</span>
                </div>
              </ChampParam>
              <ChampParam id="settings-field-rcProZone" cle="rcProZone" libelle="Zone géographique" facultatif>
                <DebouncedInput id="settings-field-rcProZone" placeholder="France entière" value={entreprise.rcProZone || 'France entière'} onChange={maj('rcProZone')} />
              </ChampParam>
            </div>
          </Carte>
        </div>
      )}

      {/* BANQUE */}
      {tab === 'banque' && (
        <Bloc titre="Coordonnées bancaires" sousTitre="Elles s’impriment sur vos factures pour faciliter les virements.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChampParam id="settings-field-banque" cle="banque" libelle="Banque" facultatif>
              <DebouncedInput id="settings-field-banque" placeholder="Crédit Agricole, BNP…" value={entreprise.banque || ''} onChange={maj('banque')} />
            </ChampParam>
            <ChampParam id="settings-field-titulaireBanque" cle="titulaireBanque" libelle="Titulaire du compte" facultatif>
              <DebouncedInput id="settings-field-titulaireBanque" placeholder={entreprise.nom || 'Nom du titulaire'} value={entreprise.titulaireBanque || ''} onChange={maj('titulaireBanque')} />
            </ChampParam>
            <ChampParam id="settings-field-iban" cle="iban" libelle="IBAN" facultatif className="md:col-span-2">
              <DebouncedInput id="settings-field-iban" aria-describedby={idIban}
                className={`${CLASSE_CHAMP} tabular-nums ${entreprise.iban && entreprise.iban.replace(/\s/g, '').length > 4 && !(entreprise.iban.replace(/\s/g, '').length === 27 && entreprise.iban.replace(/\s/g, '').startsWith('FR')) ? '!border-alerte-point' : ''}`}
                placeholder="FR76 1234 5678 9012 3456 7890 123" value={modeDiscret ? '···· ···· ···· ···· ···· ···· ···' : (entreprise.iban || '')} onChange={maj('iban', (v) => v.toUpperCase())} readOnly={modeDiscret} />
              <p id={idIban} className="mt-1.5 text-sm text-succes-texte">{entreprise.iban && entreprise.iban.replace(/\s/g, '').length === 27 && entreprise.iban.replace(/\s/g, '').startsWith('FR') ? 'Format d’IBAN valide' : ''}</p>
            </ChampParam>
            <ChampParam id="settings-field-bic" cle="bic" libelle="BIC" facultatif>
              <DebouncedInput id="settings-field-bic" className={`${CLASSE_CHAMP} tabular-nums`} placeholder="AGRIFRPP" value={modeDiscret ? '········' : (entreprise.bic || '')} onChange={maj('bic', (v) => v.toUpperCase())} readOnly={modeDiscret} />
            </ChampParam>
          </div>

          <div className="mt-6 pt-6 border-t border-bord">
            <ChoixParam id="settings-field-modePaiementDefaut" cle="modePaiementDefaut" libelle="Mode de paiement par défaut"
              aide="Proposé quand vous encaissez une facture." options={MODES_PAIEMENT}
              valeur={entreprise.modePaiementDefaut || 'virement'} onChange={maj('modePaiementDefaut')} />
          </div>
        </Bloc>
      )}

      {/* DOCUMENTS */}
      {tab === 'documents' && (
        <div className="space-y-4 sm:space-y-6">
          <Bloc titre="Réglages par défaut des devis">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChoixParam id="settings-field-validiteDevis" cle="validiteDevis" libelle="Validité d’un devis" options={VALIDITES}
                valeur={Number(entreprise.validiteDevis) || 30} onChange={maj('validiteDevis', (v) => parseInt(v, 10))} aide="Art. L111-1 du Code de la consommation." />
              <ChoixParam id="settings-field-delaiPaiement" cle="delaiPaiement" libelle="Délai de paiement" options={DELAIS}
                valeur={Number(entreprise.delaiPaiement ?? 30)} onChange={maj('delaiPaiement', (v) => parseInt(v, 10))} />
              <ChoixParam id="settings-field-acompteDefaut" cle="acompteDefaut" libelle="Acompte par défaut" options={optionsAcompte(entreprise.acompteDefaut ?? 30)}
                valeur={Number(entreprise.acompteDefaut ?? 30)} onChange={maj('acompteDefaut', (v) => parseInt(v, 10))} />
              <div className="md:col-span-2">
                <ChoixTva entreprise={entreprise} updateEntreprise={updateEntreprise} />
              </div>
            </div>
          </Bloc>

          <Bloc titre="Mentions légales sur les documents">
            <div className="space-y-4">
              {/* Plus d'interrupteur : l'avis et le formulaire de rétractation sont obligatoires pour un particulier
                  (C. conso. L221-5, 7° ; sans eux, délai prolongé de douze mois, L221-20) et jamais imprimés pour un
                  professionnel (relecture juriste-btp du 12 oct. 2026) */}
              <div className="p-3.5 rounded-xl bg-surface-2">
                <p className="font-semibold text-encre">Droit de rétractation</p>
                <p className="text-sm text-encre-2">Imprimé automatiquement sur les devis des clients particuliers (obligatoire) : conditions, délai de 14 jours et formulaire type.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-2">
                <Interrupteur id="settings-field-mentionGaranties" actif={entreprise.mentionGaranties !== false}
                  onChange={(v) => updateEntreprise(p => ({ ...p, mentionGaranties: v }), 'mentionGaranties')}
                  libelle="Garanties légales BTP" description="Parfait achèvement, biennale, décennale." />
                <EtatEnregistrement cle="mentionGaranties" />
              </div>
            </div>
          </Bloc>

          {/* Pénalités de retard (relecture juriste-btp, H3) : la case « Pénalités de retard » ne faisait rien — aucun générateur
              ne la lisait ; la mention s'imprime toujours pour un client professionnel (src/lib/piedDePageDocument.js). Reste le
              taux, lu par les documents et les relances. */}
          <Bloc titre="Pénalités de retard" sousTitre="Art. L441-10 du Code de commerce — imprimé sur les documents de vos clients professionnels">
            <ChampParam id="settings-field-tauxPenalites" cle="tauxPenalites" libelle="Taux annuel" facultatif
              aide={`Laissé vide : taux de la BCE majoré de 10 points. Un taux choisi ne peut pas être inférieur à 3 fois le taux d’intérêt légal, soit ${libelleMinimumPenalites()} (art. L441-10 II du Code de commerce).`}>
              <div className="flex max-w-[14rem]">
                <input id="settings-field-tauxPenalites" type="number" inputMode="decimal" step="0.01" min={minimumPenalites()} max="50"
                  className={`${CLASSE_CHAMP} rounded-r-none ${penalitesRefusees ? '!border-alerte-point' : ''}`}
                  aria-invalid={penalitesRefusees ? true : undefined}
                  aria-describedby={penalitesRefusees ? 'settings-field-tauxPenalites-erreur' : undefined}
                  value={brouillonPenalites ?? (entreprise.tauxPenalites ?? '')} placeholder="BCE + 10"
                  onChange={(e) => { setBrouillonPenalites(e.target.value); setPenalitesRefusees(false); }}
                  onBlur={enregistrerPenalites}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enregistrerPenalites(); } }} />
                <span className="h-12 px-4 flex items-center border-y border-r rounded-r-xl bg-surface-2 text-encre-3 border-bord-fort">%</span>
              </div>
              {penalitesRefusees && (
                <p id="settings-field-tauxPenalites-erreur" role="alert" className="mt-1.5 text-sm font-medium text-danger-texte">
                  {`Ce taux est inférieur au minimum légal : ${libelleMinimumPenalites()} (3 fois le taux d’intérêt légal, art. L441-10 II du Code de commerce).`}
                </p>
              )}
            </ChampParam>
          </Bloc>

          {/* Médiateur de la consommation */}
          {/* Pas de médiation de la consommation entre professionnels (C. conso. L611-3 1°) */}
          <Bloc titre="Médiateur de la consommation" sousTitre="Obligatoire si vous travaillez pour des particuliers (C. conso. L612-1 et L616-1).">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChampParam id="settings-field-mediateur" cle="mediateur" libelle="Nom du médiateur">
                <DebouncedInput id="settings-field-mediateur" placeholder="Médiation de la consommation" value={entreprise.mediateur || ''} onChange={maj('mediateur')} />
              </ChampParam>
              {/* R616-1 : les coordonnées du médiateur et l'adresse de son site internet */}
              <ChampParam id="settings-field-mediateurContact" cle="mediateurContact" libelle="Site internet et adresse du médiateur">
                <DebouncedInput id="settings-field-mediateurContact" placeholder="www.… — adresse postale" value={entreprise.mediateurContact || ''} onChange={maj('mediateurContact')} />
              </ChampParam>
            </div>
          </Bloc>

          {/* CGV */}
          <Bloc titre="Conditions générales personnalisées">
            <ChampParam id="settings-field-cgv" cle="cgv" libelle="Vos conditions" facultatif aide="Ce texte est ajouté après les mentions légales obligatoires.">
              <DebouncedTextarea id="settings-field-cgv" rows={4} placeholder="Ajoutez ici vos conditions générales personnalisées qui apparaîtront sur tous vos devis et factures…" value={entreprise.cgv || ''} onChange={maj('cgv')} />
            </ChampParam>
          </Bloc>
        </div>
      )}

      {/* MODÈLES DE DEVIS */}
      {tab === 'templates' && (
        <TemplateManager
          isDark={isDark}
          couleur={couleur}
          modeDiscret={modeDiscret}
        />
      )}

      {/* FACTURE 2026 */}
      {tab === 'facture2026' && (
        <Facture2026Tab
          entreprise={entreprise}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {/* RELANCES */}
      {tab === 'relances' && (
        <RelanceConfigTab
          entreprise={entreprise}
          setEntreprise={updateEntreprise}
          isDark={isDark}
          couleur={couleur}
          stats={relances.stats}
          exclusions={relances.exclusions}
          onRemoveExclusion={(id) => relances.deleteExclusion(id)}
          clients={clients}
          devis={devis}
          modeDiscret={modeDiscret}
        />
      )}

      {tab === 'ramonage' && (
        <RamonageTab entreprise={entreprise} setEntreprise={updateEntreprise} />
      )}

      {tab === 'postchantier' && (
        <PostChantierSettings
          isDark={isDark}
          couleur={couleur}
          showToast={showToast}
        />
      )}

      {/* RENTABILITÉ */}
      {tab === 'rentabilite' && (
        <Bloc titre="Calcul de rentabilité">
          <div className="space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <ChampParam id="settings-field-tauxFraisStructure" cle="tauxFraisStructure" libelle="Taux de frais de structure (%)">
                <input id="settings-field-tauxFraisStructure" type="text" inputMode="decimal" key={`taux-frais-${entreprise.tauxFraisStructure ?? 15}`} className={`${CLASSE_CHAMP} !w-32`} defaultValue={String(entreprise.tauxFraisStructure ?? 15).replace('.', ',')}
                  onBlur={e => {
                    // Validé à la sortie du champ, borné de 0 à 50 (avant : « 15 » réimposé dès que le champ était vide)
                    const n = parseFloat(e.target.value.replace(',', '.'));
                    const v = Number.isFinite(n) ? Math.max(0, Math.min(50, n)) : (entreprise.tauxFraisStructure ?? 15);
                    e.target.value = String(v).replace('.', ',');
                    if (v !== entreprise.tauxFraisStructure) updateEntreprise(p => ({ ...p, tauxFraisStructure: v }), 'tauxFraisStructure');
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
              </ChampParam>
              <Bouton icone={Calculator} aria-expanded={showFraisCalc} onClick={() => setShowFraisCalc(!showFraisCalc)}>
                {showFraisCalc ? 'Masquer le calcul' : 'Calculer mes frais'}
              </Bouton>
            </div>

            {/* Mini-wizard frais de structure */}
            {showFraisCalc && (
              <div className="p-4 rounded-2xl space-y-3 bg-surface-2">
                <p className="text-sm font-semibold text-encre">Calculez votre taux réel</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FRAIS_ITEMS.map(item => (
                    <div key={item.key}>
                      <label htmlFor={`frais-${item.key}`} className="flex items-center gap-1.5 text-sm font-medium mb-1.5 text-encre-2">{item.icon && <item.icon size={14} aria-hidden="true" />} {item.label}</label>
                      <input
                        id={`frais-${item.key}`}
                        type="number"
                        inputMode="decimal"
                        placeholder={item.placeholder}
                        value={fraisCharges[item.key] || ''}
                        onChange={e => setFraisCharges(prev => ({ ...prev, [item.key]: e.target.value }))}
                        className={CLASSE_CHAMP}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-surface border border-bord">
                  <div>
                    <p className="text-sm text-encre-3">Charges par mois</p>
                    <p className="text-lg font-bold tabular-nums text-encre">{formatMoney(fraisTotal, 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-encre-3">CA moyen par mois</p>
                    <p className="text-sm font-semibold tabular-nums text-encre">{formatMoney(caEstime, 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-encre-3">Taux suggéré</p>
                    <p className="text-xl font-bold tabular-nums text-encre">{tauxSuggere === null ? '—' : `${tauxSuggere} %`}</p>
                  </div>
                </div>
                {tauxSuggere === null ? (
                  <p className="text-sm text-encre-2">Le taux se calcule à partir de vos factures des 6 derniers mois. Sans facture émise, saisissez-le à la main ci-dessus.</p>
                ) : (
                  <Bouton pleineLargeur
                    onClick={async () => {
                      const ok = await updateEntreprise(p => ({ ...p, tauxFraisStructure: tauxSuggere }), 'tauxFraisStructure');
                      if (ok) { setShowFraisCalc(false); showToast(`Taux mis à jour : ${tauxSuggere} %`, 'success'); }
                    }}
                  >
                    Appliquer {tauxSuggere} % comme taux de frais de structure
                  </Bouton>
                )}
              </div>
            )}

            {/* Visual formula breakdown */}
            <div className="rounded-2xl p-4 sm:p-5 bg-surface-2">
              <p className="text-sm font-semibold mb-3 text-encre">Formule de calcul</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="px-3 py-1.5 rounded-lg font-semibold bg-encre text-surface">Marge réelle</span>
                <span className="text-lg font-bold text-encre-3" aria-hidden="true">=</span>
                <span className="px-3 py-1.5 rounded-lg font-medium bg-surface text-encre border border-bord">CA HT</span>
                <span className="text-lg font-bold text-encre-3" aria-hidden="true">+</span>
                <span className="px-3 py-1.5 rounded-lg font-medium bg-surface text-encre border border-bord">Ajustements de revenus</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm mt-2 ml-0 sm:ml-8">
                {['Matériaux', 'Main d’œuvre', `Frais de structure (${entreprise.tauxFraisStructure ?? 15} %)`, 'Ajustements de dépenses'].map((t) => (
                  <React.Fragment key={t}>
                    <span className="text-lg font-bold text-encre-3" aria-hidden="true">−</span>
                    <span className="px-3 py-1.5 rounded-lg font-medium bg-surface text-encre border border-bord">{t}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Code couleur de la marge : la marge négative est « à surveiller » (ambre), pas « en retard » (rouge) */}
            <div className="rounded-2xl p-4 text-sm bg-surface-2">
              <p className="font-semibold mb-2 text-encre">Couleur de la marge</p>
              <div className="flex flex-wrap gap-4 text-encre-2">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-alerte-point shrink-0" aria-hidden="true" /> Moins de 0 % : négative</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-neutre-point shrink-0" aria-hidden="true" /> 0 à 15 % : faible</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-succes-point shrink-0" aria-hidden="true" /> Plus de 15 % : saine</span>
              </div>
            </div>
          </div>
        </Bloc>
      )}

      {/* COMPTABILITÉ */}
      {tab === 'comptabilite' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Exports : un seul endroit, Finances › Export comptable */}
          <Bloc titre="Exports pour votre comptable" sousTitre="Le fichier des écritures comptables (FEC) et les fichiers par journal se préparent dans Finances › Export comptable : factures émises seulement, avoirs déduits, TVA des dépenses seulement quand elle est saisie.">
            {setPage && <Bouton icone={Download} onClick={ouvrirExportComptable}>Ouvrir l’export comptable</Bouton>}
          </Bloc>

          {franchiseTva ? (
            <Bloc titre="Franchise en base de TVA">
              <p className="text-sm text-encre-2">
                En franchise en base de TVA (art. 293 B du CGI), vous ne facturez pas de TVA et n’en déduisez pas. Mallettico part du principe que vous y êtes si votre statut est « Micro-entreprise » ; sinon, choisissez le statut « Entreprise individuelle (EI) » dans Paramètres › Identité.
              </p>
              {(() => {
                const n = devis.filter(d => d.type === 'facture' && tvaARegulariser(d, entreprise)).length;
                return n > 0 && (
                  <p role="status" className="text-sm mt-2 text-alerte-texte">
                    {n === 1 ? '1 facture émise porte de la TVA : cette TVA est due du seul fait de la facture (art. 283, 3 du CGI). Faites un avoir puis une nouvelle facture sans TVA.' : `${n} factures émises portent de la TVA : cette TVA est due du seul fait de la facture (art. 283, 3 du CGI). Faites un avoir puis une nouvelle facture sans TVA.`}
                  </p>
                );
              })()}
            </Bloc>
          ) : (
            <>
              <Bloc titre="Période">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label htmlFor="compta-du" className="block text-sm font-medium mb-1.5 text-encre-2">Du</label>
                    <input id="compta-du" type="date" value={exportPeriod.debut} onChange={(e) => setExportPeriod(p => ({ ...p, debut: e.target.value }))} className={CLASSE_CHAMP} />
                  </div>
                  <div>
                    <label htmlFor="compta-au" className="block text-sm font-medium mb-1.5 text-encre-2">Au</label>
                    <input id="compta-au" type="date" value={exportPeriod.fin} onChange={(e) => setExportPeriod(p => ({ ...p, fin: e.target.value }))} className={CLASSE_CHAMP} />
                  </div>
                </div>
              </Bloc>

              <div className="grid sm:grid-cols-3 gap-4">
                <Carte>
                  <p className="text-sm text-encre-2 mb-1">TVA facturée</p>
                  <p className="text-2xl font-bold tabular-nums text-encre">{formatMoney(tvaSummary.tvaCollectee)}</p>
                  <p className="text-sm text-encre-3 mt-1">{tvaSummary.nbFactures} facture{tvaSummary.nbFactures > 1 ? 's' : ''}</p>
                </Carte>
                <Carte>
                  <p className="text-sm text-encre-2 mb-1">TVA déductible</p>
                  <p className="text-2xl font-bold tabular-nums text-encre">{formatMoney(tvaSummary.tvaDeductible)}</p>
                  <p className="text-sm text-encre-3 mt-1">{tvaSummary.nbDepenses} dépense{tvaSummary.nbDepenses > 1 ? 's' : ''}</p>
                </Carte>
                <Carte>
                  <p className="text-sm text-encre-2 mb-1">{tvaSummary.isCredit ? 'Crédit estimé (débits)' : 'Solde estimé (débits)'}</p>
                  <p className="text-2xl font-bold tabular-nums text-encre">{formatMoney(Math.abs(tvaSummary.tvaNetteAPayer))}</p>
                  <p className="text-sm text-encre-3 mt-1">{tvaSummary.periode.debut} au {tvaSummary.periode.fin}</p>
                </Carte>
              </div>

              {tvaSummary.depensesSansTva > 0 && (
                <div role="status" className="rounded-2xl p-3.5 flex items-start gap-2 text-sm bg-alerte-fond text-alerte-texte">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>
                    {tvaSummary.depensesSansTva === 1 ? '1 dépense de la période n’a pas sa TVA saisie : aucune TVA n’est déduite pour elle.' : `${tvaSummary.depensesSansTva} dépenses de la période n’ont pas leur TVA saisie : aucune TVA n’est déduite pour elles.`}
                    {' '}Choisissez le taux porté sur la facture du fournisseur dans la fiche du chantier, onglet Finances.
                  </span>
                </div>
              )}

              {/* Détail par taux */}
              <Carte marge="aucun" className="overflow-hidden">
                <h2 className="px-4 py-3 border-b border-bord bg-surface-2 text-base font-semibold text-encre">Détail par taux de TVA</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Détail par taux de TVA">
                    <thead className="bg-surface-2">
                      <tr>
                        <th scope="col" className="text-left px-4 py-3 font-medium text-encre-2">Taux</th>
                        <th scope="col" className="text-right px-4 py-3 font-medium text-encre-2">Base HT</th>
                        <th scope="col" className="text-right px-4 py-3 font-medium text-encre-2">Facturée</th>
                        <th scope="col" className="text-right px-4 py-3 font-medium text-encre-2">Déductible</th>
                        <th scope="col" className="text-right px-4 py-3 font-medium text-encre-2">Solde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(tvaSummary.detailParTaux)
                        .sort(([a], [b]) => Number(b) - Number(a))
                        .map(([taux, data]) => {
                          const solde = data.collectee - data.deductible;
                          return (
                            <tr key={taux} className="border-t border-bord">
                              <td className="px-4 py-3 font-medium text-encre">{String(taux).replace('.', ',')} %</td>
                              <td className="text-right px-4 py-3 tabular-nums text-encre-2">{formatMoney(data.base)}</td>
                              <td className="text-right px-4 py-3 tabular-nums text-encre-2">{formatMoney(data.collectee)}</td>
                              <td className="text-right px-4 py-3 tabular-nums text-encre-2">{formatMoney(data.deductible)}</td>
                              <td className="text-right px-4 py-3 tabular-nums font-semibold text-encre">{solde >= 0 ? '+' : ''}{formatMoney(solde)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </Carte>

              <div className="rounded-2xl p-4 flex items-start gap-3 bg-info-fond text-info-texte">
                <Info size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm">
                  Ce résumé est calculé sur vos factures émises (régime des débits). Sans option pour les débits, la TVA de vos
                  travaux est due à l’encaissement (art. 269 du CGI) : le montant à déclarer peut différer. Pour votre
                  déclaration, consultez votre expert-comptable.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* PAIEMENTS EN LIGNE */}
      {tab === 'paiements' && FONCTIONS.paiementEnLigne && (
        <PaymentConfigTab
          entreprise={entreprise}
          isDark={isDark}
          couleur={couleur}
          user={user}
          modeDiscret={modeDiscret}
        />
      )}

      {/* DONNÉES */}
      {tab === 'donnees' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Export Global */}
          <Bloc titre="Export global des données" sousTitre="Exportez toutes vos données Mallettico dans un fichier JSON : pour une sauvegarde ou un transfert vers un autre appareil.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Devis et factures', count: devis.length },
                { label: 'Clients', count: clients.length },
                { label: 'Chantiers', count: chantiers.length },
                { label: 'Dépenses', count: depenses.length },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-xl text-center bg-surface-2">
                  <p className="text-xl font-bold tabular-nums text-encre">{s.count}</p>
                  <p className="text-sm text-encre-3">{s.label}</p>
                </div>
              ))}
            </div>

            <Bouton icone={Download}
              onClick={() => {
                try {
                  const exportData = {
                    version: '3.0',
                    exportDate: new Date().toISOString(),
                    app: 'Mallettico',
                    data: {
                      entreprise,
                      devis,
                      clients,
                      chantiers,
                      depenses,
                    },
                    localStorage: (() => {
                      // ⚠️ Le préfixe 'mallettico' est conservé volontairement : c'est celui des clés
                      // réellement écrites sur les appareils. Le renommer casserait l'effacement.
                      const keys = Object.keys(localStorage).filter(k => k.startsWith('cp_') || k.startsWith('mallettico'));
                      const obj = {};
                      keys.forEach(k => { try { obj[k] = JSON.parse(localStorage.getItem(k)); } catch { obj[k] = localStorage.getItem(k); } });
                      return obj;
                    })(),
                  };
                  const json = JSON.stringify(exportData, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  remettreFichier(blob, `mallettico_backup_${jourLocal()}.json`)
                    .then((r) => { if (r !== 'annule') showToast('Export global prêt', 'success'); })
                    .catch(() => showToast('Erreur lors de l\'export', 'error'));
                } catch (err) {
                  captureException(err, { context: 'export global' });
                  showToast('Erreur lors de l\'export', 'error');
                }
              }}
            >
              Exporter toutes les données (.json)
            </Bouton>
          </Bloc>

          {/* Import Global */}
          <Bloc titre="Reprendre les informations de l’entreprise" sousTitre="Reprend l’identité, les mentions et les réglages de l’entreprise d’un export Mallettico (.json). Les devis, factures, clients et chantiers de l’export ne sont pas importés : gardez ce fichier, il fait office d’archive.">
            <div className="flex items-end justify-end mb-1"><EtatEnregistrement cle="import" /></div>
            <div className="border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-colors border-bord-fort hover:border-encre-3">
              <input
                type="file"
                accept=".json"
                id="import-file"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const data = JSON.parse(ev.target.result);
                      if (!data.app || data.app !== 'Mallettico') {
                        showToast('Fichier non reconnu (pas un export Mallettico)', 'error');
                        return;
                      }
                      // Seules les informations de l'entreprise sont reprises, par l'enregistrement commun (un refus de la
                      // base se dit). Avant (recette du 9 oct. 2026) : « Import réussi » alors que ni devis, ni clients,
                      // ni chantiers n'étaient restaurés, et n'importe quelle clé du stockage local était réécrite.
                      if (!data.data?.entreprise || typeof data.data.entreprise !== 'object') {
                        showToast('Cet export ne contient pas d\'informations d\'entreprise.', 'error');
                        return;
                      }
                      // Liste fermée (ni statut de la fiche, ni identifiants) ; un fichier préparé par un tiers ne doit
                      // pas glisser son IBAN sans que l'artisan le voie
                      const source = data.data.entreprise;
                      const infos = Object.fromEntries(CHAMPS_IMPORTABLES.filter(k => source[k] !== undefined && source[k] !== null && typeof source[k] !== 'object').map(k => [k, source[k]]));
                      const sensibles = [['iban', 'IBAN'], ['bic', 'BIC'], ['siret', 'SIRET'], ['nom', 'nom de l\'entreprise']]
                        .filter(([k]) => infos[k] !== undefined && String(infos[k]).trim() !== String(entreprise[k] || '').trim());
                      (async () => {
                        if (sensibles.length) {
                          const ok = await confirm({
                            title: 'Remplacer ces informations ?',
                            message: sensibles.map(([k, l]) => `${l} : « ${String(entreprise[k] || '—')} » → « ${String(infos[k])} »`).join('\n') + '\n\nN\'importez que vos propres exports : ces informations s\'imprimeront sur vos devis et factures.',
                          });
                          if (!ok) return;
                        }
                        const ok = await updateEntreprise(prev => ({ ...prev, ...infos }), 'import');
                        if (ok) showToast(`Informations de l'entreprise reprises de l'export${data.exportDate ? ` du ${dateLue(data.exportDate).toLocaleDateString('fr-FR')}` : ''}.`, 'success');
                      })();
                    } catch {
                      showToast('Erreur de lecture du fichier', 'error');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
              <label htmlFor="import-file" className="cursor-pointer block">
                <span className="w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center bg-surface-2">
                  <RefreshCw size={24} aria-hidden="true" className="text-encre-2" />
                </span>
                <span className="block text-sm font-semibold text-encre">Choisir un fichier</span>
                <span className="block text-sm text-encre-3 mt-1">Format .json (export Mallettico)</span>
              </label>
            </div>
          </Bloc>

          {/* Onboarding Replay */}
          <Bloc titre="Visite guidée" sousTitre="Rejouez le tutoriel d’introduction pour redécouvrir les fonctions de Mallettico.">
            <Bouton icone={GraduationCap}
              onClick={() => {
                try {
                  localStorage.removeItem('mallettico_onboarding_complete');
                  localStorage.removeItem('mallettico_onboarding_skipped');
                } catch { /* stockage indisponible : la visite ne sera pas rejouée */ }
                showToast('Rechargez la page pour relancer la visite guidée', 'info');
              }}
            >
              Relancer la visite guidée
            </Bouton>
          </Bloc>

          {/* Données gardées sur cet appareil */}
          <Bloc titre="Données gardées sur cet appareil" sousTitre="Certains réglages et brouillons sont gardés dans le navigateur de cet appareil.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.keys(localStorage).filter(k => k.startsWith('cp_') || k.startsWith('mallettico')).length > 0 && (
                <div className="p-3 rounded-xl bg-surface-2">
                  <p className="text-sm text-encre-3">Clés stockées</p>
                  <p className="text-lg font-bold tabular-nums text-encre">
                    {Object.keys(localStorage).filter(k => k.startsWith('cp_') || k.startsWith('mallettico')).length}
                  </p>
                </div>
              )}
              <div className="p-3 rounded-xl bg-surface-2">
                <p className="text-sm text-encre-3">Taille estimée</p>
                <p className="text-lg font-bold tabular-nums text-encre">
                  {(() => {
                    let total = 0;
                    Object.keys(localStorage).forEach(k => { total += (localStorage.getItem(k) || '').length; });
                    return total > 1024 * 1024 ? `${(total / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo` : `${Math.round(total / 1024)} Ko`;
                  })()}
                </p>
              </div>
            </div>
          </Bloc>

          {/* RGPD — Export données personnelles */}
          <Bloc titre="Vos droits RGPD" sousTitre="Conformément au RGPD, vous pouvez exporter ou supprimer vos données personnelles à tout moment.">
            <Bouton icone={Download} onClick={exporterDonneesRGPD}>Exporter toutes mes données</Bouton>
          </Bloc>

          {/* Danger Zone — Suppression de compte (RPC supprimer_mon_compte, migration 072) */}
          <SuppressionCompte isDark={isDark} showToast={showToast} onExporter={exporterDonneesRGPD} />
        </div>
      )}

      {/* Team Management Tab */}
      {tab === 'team' && (
        <TeamManagement isDark={isDark} couleur={entreprise.couleur || couleur} />
      )}

      {/* Multi-entreprise Tab */}
      {tab === 'multi' && (
        <EntrepriseSettingsPage
          isDark={isDark}
          couleur={entreprise.couleur || couleur}
          showToast={showToast}
        />
      )}

      {/* Administratif Tab */}
      {tab === 'administratif' && (
        <AdminHelp
          chantiers={chantiers}
          clients={clients}
          devis={devis}
          depenses={depenses}
          entreprise={entreprise}
          isDark={isDark}
          couleur={couleur}
        />
      )}
        </div>
      </div>

      <AssistantProfil
        ouvert={showSetupWizard}
        onFermer={() => setShowSetupWizard(false)}
        etape={wizardStep}
        setEtape={setWizardStep}
        entreprise={entreprise}
        updateEntreprise={updateEntreprise}
        formesJuridiques={FORMES_JURIDIQUES}
        completude={completude}
        relancesActives={relances.isEnabled}
        onLogo={handleLogoUpload}
        lookupSirene={lookupSIRENE}
        sireneEnCours={sireneLoading}
        onCompleter={(mention) => { setShowSetupWizard(false); allerAuChamp(mention.onglet, mention.champ); }}
        onOuvrirRelances={() => { setShowSetupWizard(false); ouvrirRubrique('relances'); }}
        onOuvrirCatalogue={() => { setShowSetupWizard(false); setPage?.('catalogue'); }}
        onTerminer={() => {
          setShowSetupWizard(false);
          try { localStorage.setItem('cp_wizard_done', '1'); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
          showToast('Configuration terminée !', 'success');
        }}
      />
    </div>
    </EnregistrementContext.Provider>
  );
}
