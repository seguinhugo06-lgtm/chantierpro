/**
 * DicteeModal — L'atout malin : l'artisan parle, la mallette remplit.
 *
 * Une seule dictée peut produire un client, plusieurs chantiers et un devis :
 * c'est ainsi qu'un artisan décrit sa journée, en une phrase, sans penser en
 * « fiches ». On analyse, on montre ce qu'on a compris, il corrige, il valide.
 *
 * Deux principes qui gouvernent tout le fichier :
 *   1. Rien n'est jamais créé sans relecture — une erreur de prix partirait
 *      sinon dans un document à valeur contractuelle.
 *   2. Rien n'est jamais créé en double — on rapproche client et chantier de
 *      l'existant avant de proposer d'en créer de nouveaux.
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Mic, MicOff, X, Loader2, Check, User, HardHat, FileText,
  Trash2, Plus, AlertTriangle, Sparkles, RotateCcw, Link2, Keyboard,
} from 'lucide-react';
import useDictation from '../../hooks/useDictation';
import { toast } from '../../stores/toastStore';
import { useSubscriptionStore, PLANS } from '../../stores/subscriptionStore';
import { quotaDictee, compterDictee } from '../../lib/dicteeQuota';
import {
  analyserDictee, rapprocherClient, rapprocherChantier, enrichirLignes,
} from '../../lib/voiceIntent';

const UNITES = ['u', 'm²', 'm³', 'ml', 'h', 'j', 'forfait', 'pièce', 'sac', 'pot', 'kg', 'lot'];

/**
 * Délai de silence après lequel on analyse tout seul. Assez long pour laisser
 * l'artisan chercher un chiffre en cours de phrase ; s'il est coupé trop tôt,
 * « Redicter » lui rend son texte et il reprend le micro là où il en était.
 */
const SILENCE_AVANT_ANALYSE = 3500;

const EXEMPLES = [
  {
    titre: 'Un client + un devis',
    texte: "Madame Dupont, 12 rue des Lilas à Bordeaux, 06 12 34 56 78. Elle veut refaire sa salle de bain : 15 m² de carrelage à 45 euros, la plomberie 800 euros.",
  },
  {
    titre: 'Une tournée, plusieurs chantiers',
    texte: "J'ai trois nouveaux chantiers : rénovation de la façade chez Martin, pose d'un parquet rue de la Paix, et le dépannage plomberie chez Leroy.",
  },
  {
    titre: 'Une facture rapide',
    texte: "Facture pour Madame Leroy : dépannage plomberie 150 euros, 2 heures de main d'œuvre à 45 euros.",
  },
];

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** 1770 → « 1 770,00 € » — un artisan ne lit pas « 1770.00 € ». */
const euros = (n) =>
  (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

/** Taux de TVA proposés dans le bâtiment. */
const TAUX_TVA = [20, 10, 5.5, 0];

/** Champ de saisie compact, aligné sur les conventions du reste de l'app. */
function Champ({ label, value, onChange, isDark, type = 'text', placeholder, largeur = '' }) {
  const inputBg = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  return (
    <label className={`block ${largeur}`}>
      <span className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}
      />
    </label>
  );
}

/** Bloc repliable avec interrupteur « je crée / je ne crée pas ». */
function Carte({ icone: Icone, titre, sousTitre, actif, onToggle, isDark, couleur, children, badge, liaison }) {
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  return (
    <div className={`rounded-2xl border ${cardBg} overflow-hidden transition-opacity ${actif ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${couleur}18`, color: couleur }}
        >
          <Icone size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {titre}
            {badge && (
              <span
                className="ml-2 text-[11px] font-medium px-2 py-0.5 rounded-full align-middle"
                style={{ background: `${couleur}18`, color: couleur }}
              >
                {badge}
              </span>
            )}
          </div>
          {sousTitre && (
            <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{sousTitre}</div>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={actif}
          aria-label={`${actif ? 'Ne pas créer' : 'Créer'} : ${titre}`}
          onClick={onToggle}
          className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
            actif ? '' : isDark ? 'bg-slate-600' : 'bg-slate-300'
          }`}
          style={actif ? { background: couleur } : undefined}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${actif ? 'left-[22px]' : 'left-0.5'}`}
          />
        </button>
      </div>
      {/* Le rattachement est la source d'erreur n°1 : on l'affiche toujours, en clair. */}
      {actif && liaison && (
        <div className={`mx-3 sm:mx-4 mb-3 flex items-start gap-1.5 text-xs rounded-lg px-2.5 py-2 ${
          liaison.ok
            ? isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-50 text-slate-600'
            : isDark ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-800'
        }`}>
          {liaison.ok ? <Link2 size={13} className="shrink-0 mt-0.5" /> : <AlertTriangle size={13} className="shrink-0 mt-0.5" />}
          <span>{liaison.texte}</span>
        </div>
      )}
      {actif && children && <div className="px-3 pb-4 sm:px-4">{children}</div>}
    </div>
  );
}

export default function DicteeModal({
  isOpen,
  onClose,
  isDark = false,
  couleur = '#f97316',
  clients = [],
  chantiers = [],
  catalogue = [],
  entreprise,
  addClient,
  addChantier,
  addDevis,
  deleteClient,
  deleteChantier,
  deleteDevis,
  setPage,
  setSelectedDevis,
  setSelectedChantier,
  setEditDevisId,
}) {
  const dictation = useDictation();
  const [etape, setEtape] = useState('parler');   // parler | analyse | relecture
  const [erreur, setErreur] = useState(null);
  const [source, setSource] = useState('ia');
  const [resume, setResume] = useState('');
  const [incertitudes, setIncertitudes] = useState([]);
  const [creation, setCreation] = useState(false);

  // Données relues/éditables
  const [client, setClient] = useState(null);
  const [clientExistant, setClientExistant] = useState(null);
  const [listeChantiers, setListeChantiers] = useState([]);  // [{ data, existant, actif }]
  const [doc, setDoc] = useState(null);
  const [docChantierIdx, setDocChantierIdx] = useState(0);
  const [clientActif, setClientActif] = useState(true);
  const [docActif, setDocActif] = useState(true);

  const analyseLanceeRef = useRef(false);
  // Ce qui a déjà été enregistré pendant une tentative de création. Si le devis
  // échoue après la création du client, un second clic sur « Créer » ne doit
  // pas refabriquer le client et le chantier : il reprend là où ça s'est arrêté.
  const dejaCreeRef = useRef({ clientId: null, chantierIds: {}, devis: null });
  const panneauRef = useRef(null);  // pour enfermer le focus clavier
  const microRef = useRef(null);    // pour donner le focus à l'ouverture

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  const reinitialiser = useCallback(() => {
    dictation.stop();
    dictation.reset();
    setEtape('parler');
    setErreur(null);
    setResume(''); setIncertitudes([]);
    setClient(null); setClientExistant(null); setListeChantiers([]); setDoc(null);
    setDocChantierIdx(0);
    setClientActif(true); setDocActif(true);
    analyseLanceeRef.current = false;
    dejaCreeRef.current = { clientId: null, chantierIds: {}, devis: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictation.stop, dictation.reset]);

  useEffect(() => { if (isOpen) reinitialiser(); /* eslint-disable-next-line */ }, [isOpen]);

  // Échap pour fermer, et Tab qui reste dans la modale (sinon le focus part
  // se promener dans la page derrière, invisible pour l'utilisateur au clavier).
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !creation) { onClose?.(); return; }
      if (e.key !== 'Tab') return;
      const cibles = panneauRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]'
      );
      if (!cibles?.length) return;
      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
      else if (!panneauRef.current?.contains(document.activeElement)) { e.preventDefault(); premier.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, creation, onClose]);

  // Empêche la page de défiler derrière la modale : sans ça, arriver au bout de
  // la liste fait glisser l'arrière-plan, très déroutant sur mobile.
  useEffect(() => {
    if (!isOpen) return undefined;
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = avant; };
  }, [isOpen]);

  // Le micro prend le focus à l'ouverture : la dictée démarre alors à la barre
  // d'espace ou à Entrée, sans toucher la souris.
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => microRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  const texteDicte = dictation.texte;

  // ── Analyse ────────────────────────────────────────────────────────────────
  const lancerAnalyse = useCallback(async (texteBrut) => {
    const texte = (texteBrut ?? '').trim();
    if (texte.length < 3) { setErreur('Dictez d’abord votre demande.'); return; }
    if (analyseLanceeRef.current) return;

    // Le quota se vérifie ici : c'est l'analyse qui appelle Claude, pas le micro.
    // On laisse donc toujours parler, et on n'arrête que devant le coût réel.
    const { planId, openUpgradeModal } = useSubscriptionStore.getState();
    const limite = (PLANS[planId] || PLANS.gratuit).limits?.dictees ?? -1;
    if (!quotaDictee(limite).autorise) {
      dictation.stop();
      openUpgradeModal('dictees_limit');
      onClose?.();
      return;
    }

    analyseLanceeRef.current = true;

    dictation.stop();
    setEtape('analyse');
    setErreur(null);
    try {
      const { intention, source: src } = await analyserDictee(texte, { clients, catalogue });
      setSource(src);
      setResume(intention.resume || '');
      setIncertitudes(intention.incertitudes || []);

      const dejaConnu = intention.client ? rapprocherClient(intention.client, clients) : null;
      setClientExistant(dejaConnu);
      setClient(intention.client || null);
      setClientActif(!!intention.client && !dejaConnu);

      // Chaque chantier est rapproché de l'existant du même client
      const idClientPourRapprochement = dejaConnu?.id || null;
      setListeChantiers(
        (intention.chantiers || []).map((c) => {
          const existant = rapprocherChantier(c, chantiers, idClientPourRapprochement);
          return { data: c, existant, actif: !existant };
        })
      );
      setDocChantierIdx(0);

      setDoc(
        intention.document
          ? { ...intention.document, lignes: enrichirLignes(intention.document.lignes || [], catalogue) }
          : null
      );
      setDocActif(!!intention.document);
      compterDictee();
      setEtape('relecture');
    } catch (e) {
      setErreur(e.message);
      setEtape('parler');
    } finally {
      analyseLanceeRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, chantiers, catalogue, dictation.stop]);

  // Analyse automatique après un silence : l'artisan a fini de parler, il n'a
  // pas à chercher un bouton. Il peut aussi couper le micro pour partir tout de suite.
  useEffect(() => {
    if (!isOpen || etape !== 'parler' || !dictation.listening) return undefined;
    if (!dictation.dernierMot || dictation.texte.trim().length < 3) return undefined;
    const restant = SILENCE_AVANT_ANALYSE - (Date.now() - dictation.dernierMot);
    const t = setTimeout(() => lancerAnalyse(dictation.texte), Math.max(restant, 300));
    return () => clearTimeout(t);
  }, [isOpen, etape, dictation.listening, dictation.dernierMot, dictation.texte, lancerAnalyse]);

  // ── TVA ────────────────────────────────────────────────────────────────────
  // Le taux par défaut de l'artisan, pas 20 % : en rénovation c'est souvent 10 %,
  // et forcer 20 % gonflerait le devis envoyé au client.
  const tvaDefaut = Number(entreprise?.tvaDefaut ?? 10);
  const [tvaDoc, setTvaDoc] = useState(tvaDefaut);
  useEffect(() => { setTvaDoc(tvaDefaut); }, [tvaDefaut]);

  /** Taux applicable à une ligne : celui du catalogue s'il existe, sinon celui du document. */
  const tauxLigne = useCallback((l) => Number(l.tva ?? tvaDoc), [tvaDoc]);

  // ── Totaux ─────────────────────────────────────────────────────────────────
  const totaux = useMemo(() => {
    const lignes = doc?.lignes || [];
    const ht = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
    const tva = lignes.reduce(
      (s, l) => s + ((Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0) * (tauxLigne(l) / 100)),
      0
    );
    return { ht, tva, ttc: ht + tva };
  }, [doc, tauxLigne]);

  const lignesSansPrix = (doc?.lignes || []).filter((l) => !l.prixUnitaire).length;
  const chantiersActifs = listeChantiers.filter((c) => c.actif);
  const nomClient = clientExistant
    ? [clientExistant.prenom, clientExistant.nom].filter(Boolean).join(' ')
    : clientActif && client?.nom
      ? [client.prenom, client.nom].filter(Boolean).join(' ')
      : null;

  // Récap : ce qui sera réellement créé, visible sans scroller
  const recap = useMemo(() => {
    const parts = [];
    if (clientActif && client?.nom) parts.push('1 client');
    if (chantiersActifs.length) parts.push(`${chantiersActifs.length} chantier${chantiersActifs.length > 1 ? 's' : ''}`);
    if (docActif && doc) {
      parts.push(
        doc.lignes.length
          ? `${doc.type === 'facture' ? 'Facture' : 'Devis'} ${euros(totaux.ttc)}`
          : `${doc.type === 'facture' ? 'Facture' : 'Devis'} à chiffrer`
      );
    }
    return parts;
  }, [clientActif, client, chantiersActifs.length, docActif, doc, totaux.ttc]);

  const rienASoumettre = !recap.length;

  // Cas fréquent : tout ce qui a été dicté existe déjà (client connu, chantier
  // connu). Il n'y a rien à créer, mais laisser un bouton grisé serait une
  // impasse — on propose la suite logique plutôt que rien.
  const chantierConnu = listeChantiers.find((c) => c.existant)?.existant || null;
  const suiteLogique = !rienASoumettre ? null
    : clientExistant && !doc
      ? {
          label: `Faire un devis pour ${[clientExistant.prenom, clientExistant.nom].filter(Boolean).join(' ')}`,
          action: () => { setDoc({ type: 'devis', lignes: [], notes: null }); setDocActif(true); },
        }
      : chantierConnu
        ? {
            label: `Ouvrir le chantier « ${chantierConnu.nom} »`,
            action: () => { setSelectedChantier?.(chantierConnu); setPage?.('chantiers'); onClose?.(); },
          }
        : null;

  // ── Création ───────────────────────────────────────────────────────────────
  const creer = async () => {
    setCreation(true);
    setErreur(null);
    // Trace de ce qui a été créé — sert à l'annulation et à la reprise
    const cree = { clientId: null, chantierIds: [], devis: null, libelles: [] };
    const acquis = dejaCreeRef.current;
    try {
      // 1. Client — soit celui reconnu, soit un nouveau
      let clientId = clientExistant?.id || acquis.clientId || null;
      if (clientActif && client?.nom && !acquis.clientId) {
        const nouveau = await addClient({
          nom: client.nom,
          prenom: client.prenom || '',
          email: client.email || '',
          telephone: client.telephone || '',
          adresse: client.adresse || '',
          codePostal: client.codePostal || '',
          ville: client.ville || '',
        });
        // Sans id, tout ce qui suit serait rattaché dans le vide : on s'arrête net.
        if (!nouveau?.id) throw new Error("La fiche client n'a pas pu être enregistrée. Rien d'autre n'a été créé.");
        clientId = nouveau.id;
        acquis.clientId = clientId;
        cree.clientId = clientId;
        cree.libelles.push('client');
      }

      // 2. Chantiers — rattachés au client s'il y en a un
      const idsChantiers = [];
      for (let i = 0; i < listeChantiers.length; i++) {
        const item = listeChantiers[i];
        if (item.existant) { idsChantiers.push(item.existant.id); continue; }
        if (!item.actif) { idsChantiers.push(null); continue; }
        if (acquis.chantierIds[i]) { idsChantiers.push(acquis.chantierIds[i]); continue; }
        const c = item.data;
        const nouveau = await addChantier({
          nom: c.nom,
          client_id: clientId || undefined,
          clientId: clientId || undefined,
          adresse: c.adresse || client?.adresse || '',
          ville: c.ville || client?.ville || '',
          description: c.description || '',
        });
        if (!nouveau?.id) throw new Error(`Le chantier « ${c.nom} » n'a pas pu être enregistré.`);
        acquis.chantierIds[i] = nouveau.id;
        idsChantiers.push(nouveau.id);
        cree.chantierIds.push(nouveau.id);
      }
      const nbChantiersCrees = cree.chantierIds.length;
      if (nbChantiersCrees) cree.libelles.push(`${nbChantiersCrees} chantier${nbChantiersCrees > 1 ? 's' : ''}`);

      // 3. Devis / facture — exige un client (garde-fou de addDevis)
      let devisCree = null;
      if (docActif && doc) {
        if (!clientId) {
          throw new Error("Un devis a besoin d'un client. Activez la fiche client ou choisissez-en un existant.");
        }
        const lignes = doc.lignes.map((l, i) => ({
          id: `${Date.now()}-${i}`,
          description: l.description,
          quantite: Number(l.quantite) || 0,
          unite: l.unite || 'u',
          prixUnitaire: Number(l.prixUnitaire) || 0,
          prixAchat: l.prixAchat,
          tva: tauxLigne(l), // sans ce champ, l'éditeur et le PDF retomberaient sur le défaut
          montant: (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0),
        }));
        devisCree = await addDevis({
          type: doc.type === 'facture' ? 'facture' : 'devis',
          client_id: clientId,
          chantier_id: idsChantiers[docChantierIdx] || undefined,
          date: new Date().toISOString().split('T')[0],
          statut: 'brouillon',
          tvaRate: tvaDoc,
          lignes,
          sections: [{ id: '1', titre: '', lignes }],
          notes: doc.notes || '',
          total_ht: Math.round(totaux.ht * 100) / 100,
          tva: Math.round(totaux.tva * 100) / 100,
          total_ttc: Math.round(totaux.ttc * 100) / 100,
        });
        if (devisCree) {
          cree.devis = devisCree;
          cree.libelles.push(doc.type === 'facture' ? 'facture' : 'devis');
        }
      }

      if (!cree.libelles.length) {
        setErreur('Rien à créer — activez au moins une fiche.');
        setCreation(false);
        return;
      }

      // Annulation : l'artisan vient de créer plusieurs enregistrements d'un
      // geste, il doit pouvoir tout défaire aussi vite s'il s'est trompé.
      // On supprime dans l'ordre inverse des dépendances.
      const annuler = async () => {
        try {
          if (cree.devis?.id) await deleteDevis?.(cree.devis.id);
          for (const id of cree.chantierIds) await deleteChantier?.(id);
          if (cree.clientId) await deleteClient?.(cree.clientId);
          toast.info('Création annulée', 'Tout a été supprimé.');
        } catch {
          toast.error("L'annulation a échoué", 'Supprimez les fiches à la main.');
        }
      };
      toast.success(
        `${cree.libelles.join(' + ')} créé${cree.libelles.length > 1 ? 's' : ''}`,
        'Depuis votre dictée.',
        {
          duration: 20000, // le temps de parcourir le document avant de se raviser
          action: { label: 'Annuler', onClick: annuler },
        }
      );
      onClose?.();

      // On ouvre le document créé : l'artisan finit toujours par vouloir le relire
      if (devisCree) {
        setSelectedDevis?.(devisCree);
        setPage?.('devis');
        // Devis sans prix : il a demandé à le chiffrer, on l'amène dans l'éditeur
        // plutôt que sur une fiche vide en lecture seule.
        if (!doc.lignes.length) setEditDevisId?.(devisCree.id);
      } else if (cree.chantierIds.length) {
        setPage?.('chantiers');
      } else if (cree.clientId) {
        setPage?.('clients');
      }
    } catch (e) {
      const partiel = acquis.clientId || Object.keys(acquis.chantierIds).length;
      setErreur(
        (e.message || 'La création a échoué.') +
        (partiel
          ? " Ce qui a déjà été enregistré est conservé : réessayez, rien ne sera créé en double."
          : ' Vos données dictées sont conservées ci-dessus.')
      );
    } finally {
      setCreation(false);
    }
  };

  if (!isOpen) return null;

  const majLigne = (i, champ, val) =>
    setDoc((d) => ({ ...d, lignes: d.lignes.map((l, j) => (j === i ? { ...l, [champ]: val } : l)) }));

  const majChantier = (idx, champ, val) =>
    setListeChantiers((liste) =>
      liste.map((it, j) => (j === idx ? { ...it, data: { ...it.data, [champ]: val } } : it))
    );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Dictée vocale"
    >
      <div ref={panneauRef} className={`w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl border ${cardBg} max-h-[92vh] flex flex-col`}>
        {/* En-tête */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-200/20 shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${couleur}18`, color: couleur }}
          >
            <Mic size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`font-bold ${textPrimary}`}>Dictée</h2>
            <p className={`text-xs ${textMuted}`}>
              {etape === 'relecture' ? 'Relisez, corrigez, validez' : 'Parlez, la mallette remplit'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={creation}
            aria-label="Fermer"
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} disabled:opacity-40`}
          >
            <X size={20} className={textMuted} />
          </button>
        </div>

        {/* Récap collant — ce qui sera créé, sans avoir à scroller */}
        {etape === 'relecture' && !rienASoumettre && (
          <div
            className={`px-4 py-2.5 border-b border-slate-200/20 flex items-center gap-2 flex-wrap shrink-0 ${
              isDark ? 'bg-slate-800/60' : 'bg-slate-50'
            }`}
          >
            <span className={`text-xs font-medium ${textMuted}`}>À créer :</span>
            {recap.map((r) => (
              <span
                key={r}
                className="text-xs font-semibold px-2 py-1 rounded-lg"
                style={{ background: `${couleur}18`, color: couleur }}
              >
                {r}
              </span>
            ))}
          </div>
        )}

        <div className="overflow-y-auto overscroll-contain p-4 space-y-4 flex-1">
          {/* ── Micro non supporté ─────────────────────────────────────────── */}
          {!dictation.supported && etape === 'parler' && (
            <div className={`rounded-xl p-3 text-sm flex gap-2 ${isDark ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-800'}`}>
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong>La dictée vocale n'est pas disponible sur ce navigateur.</strong>
                <div className="mt-1">
                  Elle fonctionne sur Chrome (ordinateur et Android). Vous pouvez tout de même
                  écrire votre demande ci-dessous : l'analyse fonctionne pareil.
                </div>
              </div>
            </div>
          )}

          {/* ── Étape 1 : parler ───────────────────────────────────────────── */}
          {etape === 'parler' && (
            <>
              <div className="flex flex-col items-center py-2">
                <button
                  ref={microRef}
                  onClick={dictation.toggle}
                  disabled={!dictation.supported}
                  aria-label={dictation.listening ? 'Arrêter la dictée' : 'Démarrer la dictée'}
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 disabled:opacity-40 ${
                    dictation.listening ? 'animate-pulse' : ''
                  }`}
                  style={{
                    background: couleur,
                    boxShadow: dictation.listening ? `0 0 0 12px ${couleur}22` : 'none',
                  }}
                >
                  {dictation.listening ? <MicOff size={30} /> : <Mic size={30} />}
                </button>

                {/* Retour visuel réel : chrono et nombre de mots entendus */}
                <p
                  className={`mt-3 text-sm font-medium ${dictation.listening ? '' : textMuted}`}
                  style={dictation.listening ? { color: couleur } : undefined}
                  aria-live="polite"
                >
                  {dictation.listening
                    ? `Je vous écoute… ${mmss(dictation.duree)}`
                    : dictation.supported ? 'Appuyez et parlez' : 'Micro indisponible'}
                </p>
                {dictation.listening && (
                  <p className={`mt-0.5 text-xs ${textMuted}`}>
                    {dictation.motsCount > 0
                      ? `${dictation.motsCount} mot${dictation.motsCount > 1 ? 's' : ''} · j'analyse dès que vous vous arrêtez`
                      : 'Décrivez votre affaire à voix haute'}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="dictee-texte"
                  className={`flex items-center gap-1.5 text-xs font-medium mb-1.5 ${textMuted}`}
                >
                  <Keyboard size={13} />
                  {texteDicte ? 'Ce que j’ai entendu — corrigez si besoin' : 'Ou tapez directement'}
                </label>
                <textarea
                  id="dictee-texte"
                  value={texteDicte}
                  onChange={(e) => { dictation.setTranscript(e.target.value); }}
                  rows={4}
                  placeholder="« Madame Dupont, 12 rue des Lilas, 15 m² de carrelage à 45 euros… »"
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                           : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                {/* L'analyse refuse au-delà de 5 000 caractères : on prévient avant
                    de laisser quelqu'un parler dix minutes pour rien. */}
                {texteDicte.length > 3500 && (
                  <p className={`text-xs mt-1 ${texteDicte.length > 4800 ? 'text-amber-600' : textMuted}`}>
                    {texteDicte.length} / 5 000 caractères
                    {texteDicte.length > 4800 && ' — coupez en deux dictées'}
                  </p>
                )}
              </div>

              {(dictation.error || erreur) && (
                <div className={`rounded-xl p-3 text-sm ${isDark ? 'bg-red-500/10 text-red-200' : 'bg-red-50 text-red-700'}`}>
                  {dictation.error || erreur}
                </div>
              )}

              {!texteDicte && (
                <div>
                  <p className={`text-xs font-medium mb-2 ${textMuted}`}>Exemples de ce que vous pouvez dire</p>
                  <div className="space-y-2">
                    {EXEMPLES.map((ex) => (
                      <button
                        key={ex.titre}
                        onClick={() => dictation.setTranscript(ex.texte)}
                        className={`w-full text-left p-2.5 rounded-lg border ${
                          isDark ? 'border-slate-700 hover:bg-slate-700/50'
                                 : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-xs font-semibold mb-0.5" style={{ color: couleur }}>
                          {ex.titre}
                        </span>
                        <span className={`block text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          « {ex.texte} »
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Étape 2 : analyse ──────────────────────────────────────────── */}
          {etape === 'analyse' && (
            <div className="flex flex-col items-center py-10 gap-3" role="status" aria-live="polite">
              <Loader2 size={32} className="animate-spin" style={{ color: couleur }} />
              <p className={`text-sm ${textMuted}`}>Je démêle tout ça…</p>
            </div>
          )}

          {/* ── Étape 3 : relecture ────────────────────────────────────────── */}
          {etape === 'relecture' && (
            <>
              {resume && (
                <div className={`rounded-xl p-3 text-sm flex gap-2 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: couleur }} />
                  <div className={textMuted}>
                    {resume}
                    {source === 'local' && (
                      <div className="mt-1 text-xs opacity-80">
                        Mode démonstration : analyse simplifiée, sans IA.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Les doutes de l'analyse, dits franchement plutôt que masqués */}
              {incertitudes.length > 0 && (
                <div className={`rounded-xl p-3 text-sm ${isDark ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-800'}`}>
                  <div className="flex gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-1">À vérifier avant de valider</strong>
                      <ul className="list-disc list-inside space-y-0.5">
                        {incertitudes.map((inc, i) => <li key={i}>{inc}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {clientExistant && (
                <div className={`rounded-xl p-3 text-sm ${isDark ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-800'}`}>
                  Client reconnu : <strong>{[clientExistant.prenom, clientExistant.nom].filter(Boolean).join(' ')}</strong>.
                  Aucun doublon ne sera créé.
                  {/* Homonymes, conjoints, frères : l'artisan doit pouvoir dire non. */}
                  <button
                    onClick={() => { setClientExistant(null); setClientActif(true); }}
                    className="block mt-1 underline font-medium"
                  >
                    Ce n’est pas lui — créer une nouvelle fiche
                  </button>
                </div>
              )}

              {/* Client */}
              {client && !clientExistant && (
                <Carte
                  icone={User} titre="Nouveau client"
                  sousTitre={[client.prenom, client.nom].filter(Boolean).join(' ')}
                  actif={clientActif} onToggle={() => setClientActif((v) => !v)}
                  isDark={isDark} couleur={couleur}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Champ label="Prénom" value={client.prenom} onChange={(v) => setClient({ ...client, prenom: v })} isDark={isDark} />
                    <Champ label="Nom" value={client.nom} onChange={(v) => setClient({ ...client, nom: v })} isDark={isDark} />
                    <Champ label="Téléphone" value={client.telephone} onChange={(v) => setClient({ ...client, telephone: v })} isDark={isDark} />
                    <Champ label="Email" type="email" value={client.email} onChange={(v) => setClient({ ...client, email: v })} isDark={isDark} />
                    <Champ label="Adresse" value={client.adresse} onChange={(v) => setClient({ ...client, adresse: v })} isDark={isDark} largeur="col-span-2" />
                    <Champ label="Code postal" value={client.codePostal} onChange={(v) => setClient({ ...client, codePostal: v })} isDark={isDark} />
                    <Champ label="Ville" value={client.ville} onChange={(v) => setClient({ ...client, ville: v })} isDark={isDark} />
                  </div>
                </Carte>
              )}

              {/* Chantiers — un par travaux évoqué */}
              {listeChantiers.map((item, idx) => (
                item.existant ? (
                  <div
                    key={idx}
                    className={`rounded-xl p-3 text-sm ${isDark ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-800'}`}
                  >
                    Chantier reconnu : <strong>{item.existant.nom}</strong>. Aucun doublon ne sera créé.
                  </div>
                ) : (
                  <Carte
                    key={idx}
                    icone={HardHat}
                    titre={listeChantiers.length > 1 ? `Chantier ${idx + 1}` : 'Chantier'}
                    sousTitre={item.data.nom}
                    actif={item.actif}
                    onToggle={() =>
                      setListeChantiers((l) => l.map((it, j) => (j === idx ? { ...it, actif: !it.actif } : it)))
                    }
                    isDark={isDark} couleur={couleur}
                    liaison={
                      nomClient
                        ? { ok: true, texte: `Sera rattaché à ${nomClient}.` }
                        : { ok: false, texte: 'Aucun client rattaché — le chantier sera créé seul.' }
                    }
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <Champ label="Nom du chantier" value={item.data.nom} onChange={(v) => majChantier(idx, 'nom', v)} isDark={isDark} largeur="col-span-2" />
                      <Champ label="Adresse des travaux" value={item.data.adresse} onChange={(v) => majChantier(idx, 'adresse', v)} isDark={isDark} placeholder={client?.adresse || ''} />
                      <Champ label="Ville" value={item.data.ville} onChange={(v) => majChantier(idx, 'ville', v)} isDark={isDark} placeholder={client?.ville || ''} />
                    </div>
                  </Carte>
                )
              ))}

              {/* Devis / facture */}
              {doc && (
                <Carte
                  icone={FileText}
                  titre={doc.type === 'facture' ? 'Facture' : 'Devis'}
                  sousTitre={
                    doc.lignes.length
                      ? `${doc.lignes.length} ligne${doc.lignes.length > 1 ? 's' : ''} · ${euros(totaux.ttc)} TTC`
                      : 'Aucun prix dicté — à chiffrer ensuite'
                  }
                  badge={lignesSansPrix ? `${lignesSansPrix} prix à compléter` : null}
                  actif={docActif} onToggle={() => setDocActif((v) => !v)}
                  isDark={isDark} couleur={couleur}
                  liaison={
                    nomClient
                      ? { ok: true, texte: `Au nom de ${nomClient}.` }
                      : { ok: false, texte: 'Un devis a besoin d’un client — activez la fiche client ci-dessus.' }
                  }
                >
                  <div className="space-y-2">
                    {/* Quand plusieurs chantiers sont créés, il faut savoir à quel
                        chantier le devis se rattache — sinon le choix est arbitraire. */}
                    {chantiersActifs.length > 1 && (
                      <label className="block">
                        <span className={`block text-xs mb-1 ${textMuted}`}>Chantier concerné</span>
                        <select
                          value={docChantierIdx}
                          onChange={(e) => setDocChantierIdx(Number(e.target.value))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${
                            isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'
                          }`}
                        >
                          {listeChantiers.map((it, j) => (
                            <option key={j} value={j}>{it.data.nom}</option>
                          ))}
                        </select>
                      </label>
                    )}

                    {doc.lignes.map((l, i) => (
                      <div key={i} className={`rounded-xl p-2.5 border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="flex gap-2 items-start">
                          <input
                            value={l.description}
                            onChange={(e) => majLigne(i, 'description', e.target.value)}
                            aria-label={`Désignation ligne ${i + 1}`}
                            className={`flex-1 px-2 py-1.5 rounded-lg border text-sm ${
                              isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'
                            }`}
                          />
                          <button
                            onClick={() => setDoc((d) => ({ ...d, lignes: d.lignes.filter((_, j) => j !== i) }))}
                            aria-label={`Supprimer la ligne ${i + 1}`}
                            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          <input
                            type="text" inputMode="decimal" value={l.quantite ?? ''}
                            onChange={(e) => majLigne(i, 'quantite', e.target.value.replace(',', '.'))}
                            aria-label="Quantité" placeholder="Qté"
                            className={`px-2 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'}`}
                          />
                          <select
                            value={l.unite || 'u'} onChange={(e) => majLigne(i, 'unite', e.target.value)}
                            aria-label="Unité"
                            className={`px-2 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'}`}
                          >
                            {[...new Set([l.unite || 'u', ...UNITES])].map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input
                            type="text" inputMode="decimal" value={l.prixUnitaire ?? ''}
                            onChange={(e) => majLigne(i, 'prixUnitaire', e.target.value.replace(',', '.'))}
                            aria-label="Prix unitaire" placeholder="Prix €"
                            className={`px-2 py-1.5 rounded-lg border text-sm ${
                              !l.prixUnitaire ? 'border-amber-400' : isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'
                            } ${isDark ? 'bg-slate-700 text-white' : 'bg-white'}`}
                          />
                          <div className={`px-2 py-1.5 text-sm text-right font-medium ${textPrimary}`}>
                            {euros((Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0))}
                          </div>
                        </div>
                        {l._source && (
                          <div className={`text-[11px] mt-1.5 ${textMuted}`}>
                            Prix repris du catalogue : {l._source}
                          </div>
                        )}
                      </div>
                    ))}

                    {!doc.lignes.length && (
                      <p className={`text-xs ${textMuted}`}>
                        Vous avez demandé un {doc.type === 'facture' ? 'e facture' : ' devis'} sans donner de prix.
                        Il sera créé vide : vous le chiffrerez dans l'éditeur, catalogue à portée de main.
                      </p>
                    )}

                    <button
                      onClick={() => setDoc((d) => ({ ...d, lignes: [...d.lignes, { description: '', quantite: 1, unite: 'u', prixUnitaire: null }] }))}
                      className={`w-full py-2 rounded-xl border border-dashed text-sm flex items-center justify-center gap-1.5 ${
                        isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700/50' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Plus size={15} /> Ajouter une ligne
                    </button>

                    {doc.lignes.length > 0 && (
                      <div className={`pt-2 space-y-1 text-sm ${textPrimary}`}>
                        <div className={`flex justify-between ${textMuted}`}>
                          <span>Total HT</span>
                          <span>{euros(totaux.ht)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <label htmlFor="dictee-tva" className={textMuted}>TVA</label>
                          <div className="flex items-center gap-2">
                            <select
                              id="dictee-tva"
                              value={tvaDoc}
                              onChange={(e) => setTvaDoc(Number(e.target.value))}
                              className={`px-2 py-1 rounded-lg border text-sm ${
                                isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'
                              }`}
                            >
                              {[...new Set([tvaDefaut, ...TAUX_TVA])].sort((a, b) => b - a).map((t) => (
                                <option key={t} value={t}>{String(t).replace('.', ',')} %</option>
                              ))}
                            </select>
                            <span className={textMuted}>{euros(totaux.tva)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between font-semibold pt-1">
                          <span>Total TTC</span>
                          <span>{euros(totaux.ttc)}</span>
                        </div>
                        {doc.lignes.some((l) => l.tva !== undefined && Number(l.tva) !== tvaDoc) && (
                          <p className={`text-[11px] ${textMuted}`}>
                            Certaines lignes gardent le taux de votre catalogue.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Carte>
              )}

              {!client && !listeChantiers.length && !doc && (
                <div className={`rounded-xl p-4 text-sm text-center ${isDark ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                  Je n'ai rien reconnu dans cette dictée. Reformulez en donnant le nom du
                  client, les travaux et les prix.
                </div>
              )}

              {erreur && (
                <div className={`rounded-xl p-3 text-sm ${isDark ? 'bg-red-500/10 text-red-200' : 'bg-red-50 text-red-700'}`}>
                  {erreur}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pied : actions */}
        <div className="p-4 border-t border-slate-200/20 flex gap-2 shrink-0">
          {etape === 'parler' && (
            <button
              onClick={() => lancerAnalyse(texteDicte)}
              disabled={!texteDicte || texteDicte.trim().length < 3}
              className="flex-1 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
              style={{ background: couleur }}
            >
              {dictation.listening ? 'Terminé, analyser' : 'Analyser ma dictée'}
            </button>
          )}

          {etape === 'relecture' && (
            <>
              <button
                onClick={() => { setEtape('parler'); setErreur(null); }}
                disabled={creation}
                className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 ${
                  isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <RotateCcw size={15} /> Redicter
              </button>
              {suiteLogique ? (
                <button
                  onClick={suiteLogique.action}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: couleur }}
                >
                  {suiteLogique.label}
                </button>
              ) : (
                <button
                  onClick={creer}
                  disabled={creation || rienASoumettre}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: couleur }}
                >
                  {creation ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {creation ? 'Création…' : rienASoumettre ? 'Rien de nouveau à créer' : `Créer ${recap.join(' + ')}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
