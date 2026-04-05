/**
 * SubcontractorDetailPage.jsx — Full detail page for a single subcontractor
 *
 * 5 tabs: Infos, Évaluations, Chantiers, Documents, Conformité
 * Shows: header with avatar + rating + KPIs, tab content.
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  ArrowLeft, Star, Phone, Mail, MapPin, Globe, Building2, Shield, FileText,
  Plus, Trash2, Download, Upload, Edit3, Heart, Ban, CheckCircle, AlertTriangle,
  XCircle, Clock, Briefcase, Award, BarChart3, ExternalLink, Loader2,
} from 'lucide-react';
import supabase, { isDemo } from '../../supabaseClient';
import { useOrg } from '../../context/OrgContext';
import { useConfirm } from '../../context/AppContext';
import {
  getSubcontractor, updateSubcontractor, toggleFavori, archiveSubcontractor,
  getReviewStats, getDocuments, uploadDocument, deleteDocument,
  getComplianceScore, getComplianceStatus, DOCUMENT_TYPE_LABELS,
} from '../../services/subcontractorService';
import StarRating, { RatingBar } from '../ui/StarRating';
import SubcontractorReviewForm from './SubcontractorReviewForm';

const TABS = [
  { key: 'infos', label: 'Infos', icon: Building2 },
  { key: 'evaluations', label: 'Évaluations', icon: Star },
  { key: 'chantiers', label: 'Chantiers', icon: Briefcase },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'conformite', label: 'Conformité', icon: Shield },
];

const SubcontractorDetailPage = memo(function SubcontractorDetailPage({
  subcontractorId,
  onBack,
  onEdit,
  isDark = false,
  couleur = '#f97316',
  showToast,
  chantiers = [],
  modeDiscret = false,
}) {
  const { orgId } = useOrg();
  const { confirm } = useConfirm();
  const [st, setSt] = useState(null);
  const [activeTab, setActiveTab] = useState('infos');
  const [loading, setLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Load subcontractor
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSubcontractor(supabase, { id: subcontractorId });
      setSt(data);

      const stats = await getReviewStats(supabase, { subcontractorId });
      setReviewStats(stats);
    } catch (err) {
      console.error('[Detail] Load error:', err);
      showToast?.('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [subcontractorId, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handlers
  const handleToggleFavori = useCallback(async () => {
    try {
      const newStatut = await toggleFavori(supabase, { id: subcontractorId });
      setSt(prev => prev ? { ...prev, statut: newStatut } : prev);
      showToast?.(newStatut === 'favori' ? 'Ajouté aux favoris' : 'Retiré des favoris', 'success');
    } catch (err) {
      showToast?.('Erreur', 'error');
    }
  }, [subcontractorId, showToast]);

  const handleArchive = useCallback(async () => {
    if (!await confirm({ title: 'Archiver ce sous-traitant ?', message: 'Le sous-traitant sera archivé et masqué des listes.', confirmText: 'Archiver', cancelText: 'Annuler', variant: 'danger' })) return;
    try {
      await archiveSubcontractor(supabase, { id: subcontractorId });
      showToast?.('Sous-traitant archivé', 'success');
      onBack?.();
    } catch (err) {
      showToast?.('Erreur', 'error');
    }
  }, [subcontractorId, showToast, onBack]);

  const handleReviewSubmitted = useCallback(async () => {
    setShowReviewForm(false);
    await loadData();
    showToast?.('Évaluation enregistrée', 'success');
  }, [loadData, showToast]);

  const handleDocUpload = useCallback(async (file, type, metadata) => {
    try {
      const user = isDemo ? { id: 'demo-user-id' } : (await supabase.auth.getUser()).data?.user;
      await uploadDocument(supabase, {
        subcontractorId,
        file,
        type,
        metadata,
        userId: user?.id,
        orgId,
      });
      await loadData();
      showToast?.('Document ajouté', 'success');
    } catch (err) {
      showToast?.(`Erreur : ${err.message}`, 'error');
    }
  }, [subcontractorId, orgId, loadData, showToast]);

  const handleDocDelete = useCallback(async (docId, storagePath) => {
    if (!await confirm({ title: 'Supprimer ce document ?', message: 'Cette action est irréversible.', confirmText: 'Supprimer', cancelText: 'Annuler', variant: 'danger' })) return;
    try {
      await deleteDocument(supabase, { id: docId, storagePath });
      await loadData();
      showToast?.('Document supprimé', 'success');
    } catch (err) {
      showToast?.('Erreur', 'error');
    }
  }, [loadData, showToast]);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-900';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin" style={{ color: couleur }} />
      </div>
    );
  }

  if (!st) {
    return (
      <div className="text-center py-20">
        <p className={textMuted}>Sous-traitant non trouvé</p>
        <button onClick={onBack} className="mt-3 text-sm" style={{ color: couleur }}>Retour</button>
      </div>
    );
  }

  const displayName = modeDiscret
    ? `${(st.nom || '?').charAt(0)}.${(st.prenom || '').charAt(0) ? (st.prenom || '').charAt(0) + '.' : ''}`
    : (st.entreprise || `${st.nom} ${st.prenom || ''}`.trim());

  const complianceScore = getComplianceScore(st);
  const complianceItems = getComplianceStatus(st);
  const totalFacture = (st.assignments || []).reduce((s, a) => s + (a.montantFacture || 0), 0);
  const nbChantiers = (st.assignments || []).length;

  return (
    <div>
      {/* Header */}
      <div className={`rounded-2xl border ${cardBg} p-5 mb-4`}>
        <div className="flex items-start gap-4">
          {/* Back + Avatar */}
          <button onClick={onBack} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={18} className={textMuted} />
          </button>

          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0`}
            style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}cc)` }}>
            {(st.nom || '?').charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`text-lg font-bold ${textPrimary}`}>{displayName}</h2>
              {st.statut === 'favori' && <Heart size={16} className="text-red-500 fill-red-500" />}
              {st.statut === 'bloque' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Bloqué</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <StarRating value={st.noteMoyenne} readOnly size="sm" showValue showCount count={st.nombreEvaluations} isDark={isDark} />
              {st.rolePoste && <span className={`text-xs ${textMuted}`}>· {st.rolePoste}</span>}
              {st.typeContrat && <span className={`text-xs ${textMuted}`}>· {st.typeContrat}</span>}
            </div>
            {!modeDiscret && (
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {st.telephone && (
                  <a href={`tel:${st.telephone}`} className={`flex items-center gap-1 text-xs ${textMuted} hover:underline`}>
                    <Phone size={11} /> {st.telephone}
                  </a>
                )}
                {st.email && (
                  <a href={`mailto:${st.email}`} className={`flex items-center gap-1 text-xs ${textMuted} hover:underline`}>
                    <Mail size={11} /> {st.email}
                  </a>
                )}
                {st.siret && <span className={`text-xs ${textMuted}`}>SIRET: {st.siret}</span>}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit?.(st)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`} title="Modifier">
              <Edit3 size={16} />
            </button>
            <button onClick={handleToggleFavori} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`} title={st.statut === 'favori' ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
              <Heart size={16} className={st.statut === 'favori' ? 'text-red-500 fill-red-500' : textMuted} />
            </button>
            <button onClick={handleArchive} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`} title="Archiver">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Total facturé', value: modeDiscret ? '—' : `${totalFacture.toLocaleString('fr-FR')} €`, icon: '💰' },
            { label: 'Chantiers', value: nbChantiers, icon: '🏗' },
            { label: 'Note moyenne', value: st.noteMoyenne > 0 ? `${st.noteMoyenne.toFixed(1)}/5` : '—', icon: '⭐' },
            { label: 'Conformité', value: `${complianceScore}%`, icon: '🛡' },
          ].map(kpi => (
            <div key={kpi.label} className={`text-center p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
              <span className="text-lg">{kpi.icon}</span>
              <p className={`text-sm font-bold mt-0.5 ${textPrimary}`}>{kpi.value}</p>
              <p className={`text-[10px] ${textMuted}`}>{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 mb-4 overflow-x-auto scrollbar-hide pb-1`}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'
              }`}
              style={isActive ? { background: couleur } : {}}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'infos' && (
        <InfosTab st={st} isDark={isDark} couleur={couleur} modeDiscret={modeDiscret} textPrimary={textPrimary} textMuted={textMuted} cardBg={cardBg} />
      )}
      {activeTab === 'evaluations' && (
        <EvaluationsTab
          st={st} reviewStats={reviewStats} isDark={isDark} couleur={couleur}
          textPrimary={textPrimary} textMuted={textMuted} cardBg={cardBg}
          chantiers={chantiers} showReviewForm={showReviewForm}
          onShowReviewForm={() => setShowReviewForm(true)}
          onReviewSubmitted={handleReviewSubmitted}
          onCancelReview={() => setShowReviewForm(false)}
          modeDiscret={modeDiscret}
        />
      )}
      {activeTab === 'chantiers' && (
        <HistoryTab st={st} isDark={isDark} couleur={couleur} textPrimary={textPrimary} textMuted={textMuted} cardBg={cardBg} modeDiscret={modeDiscret} />
      )}
      {activeTab === 'documents' && (
        <DocumentsTab
          documents={st.documents || []} isDark={isDark} couleur={couleur}
          textPrimary={textPrimary} textMuted={textMuted} cardBg={cardBg}
          onUpload={handleDocUpload} onDelete={handleDocDelete}
          inputBg={inputBg}
        />
      )}
      {activeTab === 'conformite' && (
        <ComplianceTab
          st={st} complianceItems={complianceItems} complianceScore={complianceScore}
          isDark={isDark} couleur={couleur} textPrimary={textPrimary} textMuted={textMuted} cardBg={cardBg}
        />
      )}
    </div>
  );
});

// ── Infos Tab ───────────────────────────────────────────────────────────────────

const InfosTab = memo(function InfosTab({ st, isDark, couleur, modeDiscret, textPrimary, textMuted, cardBg }) {
  return (
    <div className="space-y-4">
      {/* Compétences */}
      {st.competences?.length > 0 && (
        <div className={`rounded-2xl border ${cardBg} p-4`}>
          <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>Compétences</h3>
          <div className="flex flex-wrap gap-1.5">
            {st.competences.map(c => (
              <span key={c} className={`text-[11px] px-2 py-1 rounded-lg font-medium ${
                isDark ? 'bg-blue-900/30 text-blue-300 border border-blue-700/50' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {st.certifications?.length > 0 && (
        <div className={`rounded-2xl border ${cardBg} p-4`}>
          <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>Certifications</h3>
          <div className="space-y-2">
            {st.certifications.map((cert, i) => {
              const isExpired = cert.dateExpiration && cert.dateExpiration < new Date().toISOString().split('T')[0];
              return (
                <div key={i} className={`flex items-center gap-2 text-xs ${textPrimary}`}>
                  <Award size={14} style={{ color: isExpired ? '#ef4444' : couleur }} />
                  <span className="font-medium">{cert.nom}</span>
                  {cert.organisme && <span className={textMuted}>({cert.organisme})</span>}
                  {cert.dateExpiration && (
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
                      isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {isExpired ? 'Expiré' : `exp. ${cert.dateExpiration}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tarification */}
      <div className={`rounded-2xl border ${cardBg} p-4`}>
        <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>Tarification</h3>
        {modeDiscret ? (
          <p className={textMuted}>—</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {st.tauxHoraire > 0 && (
              <div>
                <p className={`text-xs ${textMuted}`}>Taux horaire</p>
                <p className={`text-sm font-semibold ${textPrimary}`}>{st.tauxHoraire} €/h</p>
              </div>
            )}
            {st.coutHoraireCharge > 0 && (
              <div>
                <p className={`text-xs ${textMuted}`}>Coût chargé</p>
                <p className={`text-sm font-semibold ${textPrimary}`}>{st.coutHoraireCharge} €/h</p>
              </div>
            )}
            {st.tauxHoraire > 0 && st.coutHoraireCharge > 0 && (
              <div>
                <p className={`text-xs ${textMuted}`}>Marge/h</p>
                <p className={`text-sm font-semibold text-emerald-500`}>+{(st.tauxHoraire - st.coutHoraireCharge).toFixed(0)} €</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contact / Address */}
      {(st.adresse || st.siteWeb) && !modeDiscret && (
        <div className={`rounded-2xl border ${cardBg} p-4`}>
          <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>Coordonnées</h3>
          <div className="space-y-1.5">
            {st.adresse && (
              <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                <MapPin size={12} />
                <span>{st.adresse}{st.codePostal ? `, ${st.codePostal}` : ''}{st.ville ? ` ${st.ville}` : ''}</span>
              </div>
            )}
            {st.siteWeb && (
              <a href={st.siteWeb.startsWith('http') ? st.siteWeb : `https://${st.siteWeb}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-xs hover:underline`} style={{ color: couleur }}>
                <Globe size={12} />
                {st.siteWeb}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {st.notes && !modeDiscret && (
        <div className={`rounded-2xl border ${cardBg} p-4`}>
          <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>Notes</h3>
          <p className={`text-xs whitespace-pre-wrap ${textMuted}`}>{st.notes}</p>
        </div>
      )}
    </div>
  );
});

// ── Evaluations Tab ─────────────────────────────────────────────────────────────

const EvaluationsTab = memo(function EvaluationsTab({
  st, reviewStats, isDark, couleur, textPrimary, textMuted, cardBg, chantiers,
  showReviewForm, onShowReviewForm, onReviewSubmitted, onCancelReview, modeDiscret,
}) {
  if (showReviewForm) {
    return (
      <SubcontractorReviewForm
        subcontractorId={st.id}
        subcontractorName={st.entreprise || st.nom}
        chantiers={chantiers}
        onSubmit={onReviewSubmitted}
        onCancel={onCancelReview}
        isDark={isDark}
        couleur={couleur}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Rating breakdown */}
      {reviewStats && (
        <div className={`rounded-2xl border ${cardBg} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${textPrimary}`}>Détail des notes</h3>
            <span className={`text-xs ${textMuted}`}>{reviewStats.recommandationPct}% recommandent</span>
          </div>
          <div className="space-y-2">
            <RatingBar label="Qualité" value={reviewStats.moyenneQualite} isDark={isDark} couleur={couleur} />
            <RatingBar label="Délais" value={reviewStats.moyenneDelais} isDark={isDark} couleur={couleur} />
            <RatingBar label="Prix" value={reviewStats.moyennePrix} isDark={isDark} couleur={couleur} />
            <RatingBar label="Communication" value={reviewStats.moyenneCommunication} isDark={isDark} couleur={couleur} />
            <RatingBar label="Propreté" value={reviewStats.moyenneProprete} isDark={isDark} couleur={couleur} />
          </div>
        </div>
      )}

      {/* Add review button */}
      <button
        onClick={onShowReviewForm}
        className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2"
        style={{ background: couleur }}
      >
        <Plus size={16} />
        Ajouter une évaluation
      </button>

      {/* Review list */}
      {(st.reviews || []).length === 0 ? (
        <div className="text-center py-8">
          <Star size={32} className={textMuted} />
          <p className={`text-sm mt-2 ${textMuted}`}>Aucune évaluation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {st.reviews.map(review => (
            <div key={review.id} className={`rounded-2xl border ${cardBg} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <StarRating value={review.noteGlobale} readOnly size="sm" showValue isDark={isDark} />
                <span className={`text-[10px] ${textMuted}`}>{formatDate(review.dateEvaluation)}</span>
              </div>
              {review.chantierName && (
                <p className={`text-xs font-medium mb-1 ${textPrimary}`}>🏗 {review.chantierName}</p>
              )}
              {!modeDiscret && review.commentaire && (
                <p className={`text-xs ${textMuted} italic`}>"{review.commentaire}"</p>
              )}
              {review.recommande && (
                <span className="text-[10px] text-emerald-500 font-medium mt-1 inline-block">✓ Recommandé</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ── History Tab ─────────────────────────────────────────────────────────────────

const HistoryTab = memo(function HistoryTab({ st, isDark, couleur, textPrimary, textMuted, cardBg, modeDiscret }) {
  const totalFacture = (st.assignments || []).reduce((s, a) => s + (a.montantFacture || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      {(st.assignments || []).length > 0 && (
        <div className={`flex items-center justify-between px-2`}>
          <span className={`text-xs font-medium ${textPrimary}`}>Historique de collaboration</span>
          {!modeDiscret && (
            <span className={`text-xs font-semibold ${textPrimary}`}>Total : {totalFacture.toLocaleString('fr-FR')} €</span>
          )}
        </div>
      )}

      {(st.assignments || []).length === 0 ? (
        <div className="text-center py-8">
          <Briefcase size={32} className={textMuted} />
          <p className={`text-sm mt-2 ${textMuted}`}>Aucun chantier enregistré</p>
        </div>
      ) : (
        <div className="space-y-3">
          {st.assignments.map(assign => {
            const statusConfig = {
              affecte: { label: 'Affecté', color: 'text-blue-500 bg-blue-50' },
              en_cours: { label: 'En cours', color: 'text-amber-600 bg-amber-50' },
              termine: { label: 'Terminé', color: 'text-emerald-600 bg-emerald-50' },
              annule: { label: 'Annulé', color: 'text-gray-500 bg-gray-100' },
            };
            const s = statusConfig[assign.statut] || statusConfig.affecte;

            return (
              <div key={assign.id} className={`rounded-2xl border ${cardBg} p-4`}>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-sm font-semibold ${textPrimary}`}>🏗 {assign.chantierName || 'Chantier'}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                </div>
                <div className={`flex items-center gap-3 text-xs ${textMuted}`}>
                  {assign.roleSurChantier && <span>{assign.roleSurChantier}</span>}
                  {assign.dateDebut && <span>Depuis {formatDate(assign.dateDebut)}</span>}
                </div>
                {!modeDiscret && (
                  <div className={`flex items-center gap-4 mt-2 text-xs`}>
                    {assign.montantPrevu > 0 && (
                      <span className={textMuted}>Prévu : {assign.montantPrevu.toLocaleString('fr-FR')} €</span>
                    )}
                    {assign.montantFacture > 0 && (
                      <span className={`font-semibold ${textPrimary}`}>Facturé : {assign.montantFacture.toLocaleString('fr-FR')} €</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ── Documents Tab ───────────────────────────────────────────────────────────────

const DocumentsTab = memo(function DocumentsTab({ documents, isDark, couleur, textPrimary, textMuted, cardBg, onUpload, onDelete, inputBg }) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState('attestation_decennale');
  const [uploadName, setUploadName] = useState('');
  const [uploadExpiration, setUploadExpiration] = useState('');
  const fileInputRef = React.useRef(null);

  const handleFileSelected = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Fichier trop volumineux (max 10 MB)');
      return;
    }

    await onUpload?.(file, uploadType, {
      nom: uploadName || file.name,
      dateExpiration: uploadExpiration || null,
    });
    setShowUpload(false);
    setUploadName('');
    setUploadExpiration('');
    e.target.value = '';
  }, [uploadType, uploadName, uploadExpiration, onUpload]);

  const grouped = useMemo(() => {
    const groups = {};
    documents.forEach(doc => {
      const cat = DOCUMENT_TYPE_LABELS[doc.type] || 'Autre';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(doc);
    });
    return groups;
  }, [documents]);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1048576).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowUpload(!showUpload)}
        className="w-full py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2"
        style={{ background: couleur }}
      >
        <Upload size={16} />
        Ajouter un document
      </button>

      {showUpload && (
        <div className={`rounded-2xl border ${cardBg} p-4 space-y-3`}>
          <div>
            <label className={`text-xs font-medium ${textPrimary}`}>Type</label>
            <select value={uploadType} onChange={e => setUploadType(e.target.value)} className={`w-full mt-1 px-3 py-2 rounded-xl border text-xs ${inputBg}`}>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`text-xs font-medium ${textPrimary}`}>Nom du document</label>
            <input type="text" value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="ex: Attestation AXA 2027" className={`w-full mt-1 px-3 py-2 rounded-xl border text-xs ${inputBg}`} />
          </div>
          <div>
            <label className={`text-xs font-medium ${textPrimary}`}>Date d'expiration (optionnel)</label>
            <input type="date" value={uploadExpiration} onChange={e => setUploadExpiration(e.target.value)} className={`w-full mt-1 px-3 py-2 rounded-xl border text-xs ${inputBg}`} />
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileSelected} />
          <button onClick={() => fileInputRef.current?.click()} className={`w-full py-2 rounded-xl text-sm border-2 border-dashed ${isDark ? 'border-slate-600 hover:border-slate-500 text-slate-400' : 'border-gray-300 hover:border-gray-400 text-gray-500'}`}>
            📂 Choisir un fichier (max 10 MB)
          </button>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <FileText size={32} className={textMuted} />
          <p className={`text-sm mt-2 ${textMuted}`}>Aucun document</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, docs]) => (
          <div key={category}>
            <h4 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textMuted}`}>{category}</h4>
            <div className="space-y-2">
              {docs.map(doc => (
                <div key={doc.id} className={`rounded-xl border ${cardBg} p-3 flex items-center gap-3`}>
                  <FileText size={16} style={{ color: couleur }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${textPrimary}`}>{doc.nom}</p>
                    <p className={`text-[10px] ${textMuted}`}>
                      {formatSize(doc.fileSize)}
                      {doc.dateExpiration && ` · Exp: ${formatDate(doc.dateExpiration)}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {doc.fileUrl && doc.fileUrl !== '#' && (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                        <Download size={14} className={textMuted} />
                      </a>
                    )}
                    <button onClick={() => onDelete?.(doc.id, doc.storagePath)} className={`p-1.5 rounded-lg hover:bg-red-50 text-red-400`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
});

// ── Compliance Tab ──────────────────────────────────────────────────────────────

const ComplianceTab = memo(function ComplianceTab({ st, complianceItems, complianceScore, isDark, couleur, textPrimary, textMuted, cardBg }) {
  const statusIcons = {
    valid: { icon: CheckCircle, color: 'text-emerald-500', bgColor: isDark ? 'border-l-emerald-500' : 'border-l-emerald-500' },
    expiring: { icon: AlertTriangle, color: 'text-amber-500', bgColor: isDark ? 'border-l-amber-500' : 'border-l-amber-500' },
    expired: { icon: XCircle, color: 'text-red-500', bgColor: isDark ? 'border-l-red-500' : 'border-l-red-500' },
    missing: { icon: XCircle, color: 'text-red-500', bgColor: isDark ? 'border-l-red-500' : 'border-l-red-500' },
  };

  return (
    <div className="space-y-4">
      {/* Score bar */}
      <div className={`rounded-2xl border ${cardBg} p-4`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-sm font-semibold ${textPrimary}`}>🛡 Score de conformité</h3>
          <span className={`text-sm font-bold ${
            complianceScore >= 100 ? 'text-emerald-500' : complianceScore >= 67 ? 'text-amber-500' : 'text-red-500'
          }`}>{complianceScore}%</span>
        </div>
        <div className={`h-2.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${complianceScore}%`,
              background: complianceScore >= 100 ? '#22c55e' : complianceScore >= 67 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Compliance items */}
      {complianceItems.map(item => {
        const cfg = statusIcons[item.status];
        const Icon = cfg.icon;

        return (
          <div key={item.key} className={`rounded-2xl border ${cardBg} p-4 border-l-4 ${cfg.bgColor}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={cfg.color} />
              <h4 className={`text-sm font-semibold ${textPrimary}`}>{item.label}</h4>
            </div>
            <p className={`text-xs ${textMuted}`}>{item.message}</p>

            {/* Extra info for insurance items */}
            {item.key === 'decennale' && st.assureurDecennale && (
              <p className={`text-[10px] mt-1 ${textMuted}`}>
                {st.assureurDecennale} · {st.numeroPoliceDecennale}
              </p>
            )}
            {item.key === 'rcPro' && st.assureurRcPro && (
              <p className={`text-[10px] mt-1 ${textMuted}`}>
                {st.assureurRcPro} · {st.numeroPoliceRcPro}
                {st.montantGarantieRcPro && ` · Garantie: ${st.montantGarantieRcPro.toLocaleString('fr-FR')} €`}
              </p>
            )}
            {item.key === 'urssaf' && st.numeroAttestationUrssaf && (
              <p className={`text-[10px] mt-1 ${textMuted}`}>
                N° {st.numeroAttestationUrssaf}
              </p>
            )}
          </div>
        );
      })}

      {/* Legal notice */}
      <div className={`text-[10px] ${textMuted} px-2`}>
        <p>📋 <strong>Obligation légale</strong> : Vérification de vigilance tous les 6 mois (Art. L8222-1 Code du travail). Assurance décennale obligatoire (Art. L243-1 Code des assurances).</p>
      </div>
    </div>
  );
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export default SubcontractorDetailPage;
