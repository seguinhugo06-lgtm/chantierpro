/**
 * DicteeModal — L'atout malin : l'artisan parle, la mallette remplit.
 *
 * Une seule dictée peut produire un client, un chantier et un devis d'un coup :
 * c'est ainsi qu'un artisan décrit son affaire, en une phrase, sans penser en
 * « fiches ». On analyse, on montre ce qu'on a compris, il corrige, il valide.
 *
 * Rien n'est jamais créé sans relecture : une erreur de prix ou de quantité
 * partirait sinon dans un document à valeur contractuelle.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Mic, MicOff, X, Loader2, Check, User, HardHat, FileText,
  Trash2, Plus, AlertTriangle, Sparkles, RotateCcw,
} from 'lucide-react';
import useDictation from '../../hooks/useDictation';
import { analyserDictee, rapprocherClient, enrichirLignes } from '../../lib/voiceIntent';

const UNITES = ['u', 'm²', 'm³', 'ml', 'h', 'j', 'forfait', 'pièce', 'sac', 'pot', 'kg', 'lot'];

const EXEMPLES = [
  "Madame Dupont, 12 rue des Lilas à Bordeaux, 06 12 34 56 78. Elle veut refaire sa salle de bain : 15 m² de carrelage à 45 euros, la plomberie 800 euros.",
  "Nouveau chantier chez Monsieur Martin : rénovation de la façade, 80 m² de ravalement à 38 euros le mètre carré.",
  "Facture pour Madame Leroy : dépannage plomberie 150 euros, 2 heures de main d'œuvre à 45 euros.",
];

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
function Carte({ icone: Icone, titre, sousTitre, actif, onToggle, isDark, couleur, children, badge }) {
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
      {actif && children && <div className="px-3 pb-4 sm:px-4">{children}</div>}
    </div>
  );
}

export default function DicteeModal({
  isOpen,
  onClose,
  isDark = false,
  couleur = '#f97316',
  showToast,
  clients = [],
  catalogue = [],
  addClient,
  addChantier,
  addDevis,
  setPage,
  setSelectedDevis,
}) {
  const dictation = useDictation();
  const [etape, setEtape] = useState('parler');   // parler | analyse | relecture
  const [erreur, setErreur] = useState(null);
  const [source, setSource] = useState('ia');
  const [resume, setResume] = useState('');
  const [creation, setCreation] = useState(false);

  // Données relues/éditables
  const [client, setClient] = useState(null);
  const [clientExistant, setClientExistant] = useState(null);
  const [chantier, setChantier] = useState(null);
  const [doc, setDoc] = useState(null);
  const [actifs, setActifs] = useState({ client: true, chantier: true, document: true });

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  const reinitialiser = useCallback(() => {
    dictation.stop();
    dictation.reset();
    setEtape('parler');
    setErreur(null);
    setResume('');
    setClient(null); setClientExistant(null); setChantier(null); setDoc(null);
    setActifs({ client: true, chantier: true, document: true });
  }, [dictation]);

  useEffect(() => { if (isOpen) reinitialiser(); /* eslint-disable-next-line */ }, [isOpen]);

  // Échap pour fermer
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape' && !creation) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, creation, onClose]);

  const texteDicte = dictation.texte;

  // ── Analyse ────────────────────────────────────────────────────────────────
  const lancerAnalyse = async () => {
    dictation.stop();
    const texte = (texteDicte || '').trim();
    if (texte.length < 3) { setErreur('Dictez d’abord votre demande.'); return; }

    setEtape('analyse');
    setErreur(null);
    try {
      const { intention, source: src } = await analyserDictee(texte, { clients, catalogue });
      setSource(src);
      setResume(intention.resume || '');

      const dejaConnu = intention.client ? rapprocherClient(intention.client, clients) : null;
      setClientExistant(dejaConnu);
      setClient(intention.client || null);
      setChantier(intention.chantier || null);
      setDoc(
        intention.document
          ? { ...intention.document, lignes: enrichirLignes(intention.document.lignes || [], catalogue) }
          : null
      );
      setActifs({
        client: !!intention.client && !dejaConnu, // un client déjà connu n'est pas recréé
        chantier: !!intention.chantier,
        document: !!intention.document,
      });
      setEtape('relecture');
    } catch (e) {
      setErreur(e.message);
      setEtape('parler');
    }
  };

  // ── Totaux ─────────────────────────────────────────────────────────────────
  const totaux = useMemo(() => {
    const lignes = doc?.lignes || [];
    const ht = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
    const tva = lignes.reduce(
      (s, l) => s + ((Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0) * ((l.tvaRate ?? 20) / 100)),
      0
    );
    return { ht, tva, ttc: ht + tva };
  }, [doc]);

  const lignesSansPrix = (doc?.lignes || []).filter((l) => !l.prixUnitaire).length;

  // ── Création ───────────────────────────────────────────────────────────────
  const creer = async () => {
    setCreation(true);
    setErreur(null);
    try {
      const cree = [];

      // 1. Client — soit celui reconnu, soit un nouveau
      let clientId = clientExistant?.id || null;
      if (actifs.client && client?.nom) {
        const nouveau = await addClient({
          nom: client.nom,
          prenom: client.prenom || '',
          email: client.email || '',
          telephone: client.telephone || '',
          adresse: client.adresse || '',
          codePostal: client.codePostal || '',
          ville: client.ville || '',
        });
        clientId = nouveau?.id || null;
        if (clientId) cree.push('client');
      }

      // 2. Chantier — rattaché au client s'il y en a un
      let chantierId = null;
      if (actifs.chantier && chantier?.nom) {
        const nouveau = await addChantier({
          nom: chantier.nom,
          client_id: clientId || undefined,
          clientId: clientId || undefined,
          adresse: chantier.adresse || client?.adresse || '',
          ville: chantier.ville || client?.ville || '',
          description: chantier.description || '',
        });
        chantierId = nouveau?.id || null;
        if (chantierId) cree.push('chantier');
      }

      // 3. Devis / facture — exige un client (garde-fou de addDevis)
      let devisCree = null;
      if (actifs.document && doc?.lignes?.length) {
        if (!clientId) {
          setErreur("Un devis a besoin d'un client. Activez la fiche client ou choisissez-en un existant.");
          setCreation(false);
          return;
        }
        const lignes = doc.lignes.map((l, i) => ({
          id: `${Date.now()}-${i}`,
          description: l.description,
          quantite: Number(l.quantite) || 0,
          unite: l.unite || 'u',
          prixUnitaire: Number(l.prixUnitaire) || 0,
          prixAchat: l.prixAchat,
          montant: (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0),
        }));
        devisCree = await addDevis({
          type: doc.type === 'facture' ? 'facture' : 'devis',
          client_id: clientId,
          chantier_id: chantierId || undefined,
          date: new Date().toISOString().split('T')[0],
          statut: 'brouillon',
          tvaRate: 20,
          lignes,
          sections: [{ id: '1', titre: '', lignes }],
          notes: doc.notes || '',
          total_ht: Math.round(totaux.ht * 100) / 100,
          tva: Math.round(totaux.tva * 100) / 100,
          total_ttc: Math.round(totaux.ttc * 100) / 100,
        });
        if (devisCree) cree.push(doc.type === 'facture' ? 'facture' : 'devis');
      }

      if (!cree.length) {
        setErreur('Rien à créer — activez au moins une fiche.');
        setCreation(false);
        return;
      }

      showToast?.(`${cree.join(' + ')} créé${cree.length > 1 ? 's' : ''} depuis la dictée`, 'success');
      onClose?.();

      // On ouvre le document créé : l'artisan finit toujours par vouloir le relire
      if (devisCree) {
        setSelectedDevis?.(devisCree);
        setPage?.('devis');
      } else if (chantierId) {
        setPage?.('chantiers');
      } else if (clientId) {
        setPage?.('clients');
      }
    } catch (e) {
      setErreur(e.message || "La création a échoué. Vos données dictées sont conservées ci-dessus.");
    } finally {
      setCreation(false);
    }
  };

  if (!isOpen) return null;

  const majLigne = (i, champ, val) =>
    setDoc((d) => ({ ...d, lignes: d.lignes.map((l, j) => (j === i ? { ...l, [champ]: val } : l)) }));

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Dictée vocale"
    >
      <div className={`w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl border ${cardBg} max-h-[92vh] flex flex-col`}>
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

        <div className="overflow-y-auto p-4 space-y-4 flex-1">
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
                  onClick={dictation.toggle}
                  disabled={!dictation.supported}
                  aria-label={dictation.listening ? 'Arrêter la dictée' : 'Démarrer la dictée'}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 disabled:opacity-40"
                  style={{
                    background: couleur,
                    boxShadow: dictation.listening ? `0 0 0 12px ${couleur}22` : 'none',
                  }}
                >
                  {dictation.listening ? <MicOff size={30} /> : <Mic size={30} />}
                </button>
                <p className={`mt-3 text-sm font-medium ${dictation.listening ? '' : textMuted}`}
                   style={dictation.listening ? { color: couleur } : undefined}>
                  {dictation.listening ? 'Je vous écoute…' : dictation.supported ? 'Appuyez et parlez' : 'Micro indisponible'}
                </p>
              </div>

              <textarea
                value={texteDicte}
                onChange={(e) => { dictation.setTranscript(e.target.value); }}
                rows={4}
                placeholder="Ou écrivez ici : « Madame Dupont, 12 rue des Lilas, 15 m² de carrelage à 45 euros… »"
                className={`w-full px-3 py-2 rounded-xl border text-sm ${
                  isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                         : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />

              {(dictation.error || erreur) && (
                <div className={`rounded-xl p-3 text-sm ${isDark ? 'bg-red-500/10 text-red-200' : 'bg-red-50 text-red-700'}`}>
                  {dictation.error || erreur}
                </div>
              )}

              {!texteDicte && (
                <div>
                  <p className={`text-xs font-medium mb-2 ${textMuted}`}>Exemples de ce que vous pouvez dire</p>
                  <div className="space-y-2">
                    {EXEMPLES.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => dictation.setTranscript(ex)}
                        className={`w-full text-left text-xs p-2.5 rounded-lg border ${
                          isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-700/50'
                                 : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        « {ex} »
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Étape 2 : analyse ──────────────────────────────────────────── */}
          {etape === 'analyse' && (
            <div className="flex flex-col items-center py-10 gap-3">
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

              {clientExistant && (
                <div className={`rounded-xl p-3 text-sm ${isDark ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-800'}`}>
                  Client reconnu : <strong>{[clientExistant.prenom, clientExistant.nom].filter(Boolean).join(' ')}</strong>.
                  Aucun doublon ne sera créé.
                </div>
              )}

              {/* Client */}
              {client && !clientExistant && (
                <Carte
                  icone={User} titre="Nouveau client"
                  sousTitre={[client.prenom, client.nom].filter(Boolean).join(' ')}
                  actif={actifs.client} onToggle={() => setActifs((a) => ({ ...a, client: !a.client }))}
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

              {/* Chantier */}
              {chantier && (
                <Carte
                  icone={HardHat} titre="Chantier" sousTitre={chantier.nom}
                  actif={actifs.chantier} onToggle={() => setActifs((a) => ({ ...a, chantier: !a.chantier }))}
                  isDark={isDark} couleur={couleur}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <Champ label="Nom du chantier" value={chantier.nom} onChange={(v) => setChantier({ ...chantier, nom: v })} isDark={isDark} largeur="col-span-2" />
                    <Champ label="Adresse des travaux" value={chantier.adresse} onChange={(v) => setChantier({ ...chantier, adresse: v })} isDark={isDark} placeholder={client?.adresse || ''} />
                    <Champ label="Ville" value={chantier.ville} onChange={(v) => setChantier({ ...chantier, ville: v })} isDark={isDark} placeholder={client?.ville || ''} />
                  </div>
                </Carte>
              )}

              {/* Devis / facture */}
              {doc && (
                <Carte
                  icone={FileText}
                  titre={doc.type === 'facture' ? 'Facture' : 'Devis'}
                  sousTitre={`${doc.lignes.length} ligne${doc.lignes.length > 1 ? 's' : ''} · ${totaux.ttc.toFixed(2)} € TTC`}
                  badge={lignesSansPrix ? `${lignesSansPrix} prix à compléter` : null}
                  actif={actifs.document} onToggle={() => setActifs((a) => ({ ...a, document: !a.document }))}
                  isDark={isDark} couleur={couleur}
                >
                  <div className="space-y-2">
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
                            {(((Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0))).toFixed(2)} €
                          </div>
                        </div>
                        {l._source && (
                          <div className={`text-[11px] mt-1.5 ${textMuted}`}>
                            Prix repris du catalogue : {l._source}
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      onClick={() => setDoc((d) => ({ ...d, lignes: [...d.lignes, { description: '', quantite: 1, unite: 'u', prixUnitaire: null }] }))}
                      className={`w-full py-2 rounded-xl border border-dashed text-sm flex items-center justify-center gap-1.5 ${
                        isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700/50' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Plus size={15} /> Ajouter une ligne
                    </button>

                    <div className={`flex justify-between pt-2 text-sm font-semibold ${textPrimary}`}>
                      <span>Total TTC</span>
                      <span>{totaux.ttc.toFixed(2)} €</span>
                    </div>
                  </div>
                </Carte>
              )}

              {!client && !chantier && !doc && (
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
              onClick={lancerAnalyse}
              disabled={!texteDicte || texteDicte.trim().length < 3}
              className="flex-1 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
              style={{ background: couleur }}
            >
              Analyser ma dictée
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
              <button
                onClick={creer}
                disabled={creation || (!actifs.client && !actifs.chantier && !actifs.document)}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: couleur }}
              >
                {creation ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {creation ? 'Création…' : 'Créer'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
