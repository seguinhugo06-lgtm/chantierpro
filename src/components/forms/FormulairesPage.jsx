import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, ArrowLeft, Trash2, Edit3, ClipboardCheck, Calendar, Tag, Clock, ChevronRight, Search } from 'lucide-react';
import FormBuilder from './FormBuilder';
import FormFiller from './FormFiller';
import supabase, { isDemo } from '../../supabaseClient';

const STORAGE_KEY = 'cp_form_templates';
const SUBMISSIONS_KEY = 'cp_form_submissions';

function loadTemplatesLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveTemplatesLocal(templates) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch { /* silent */ }
}

function loadSubmissionsLocal() {
  try {
    return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]');
  } catch { return []; }
}

const CATEGORIE_COLORS = {
  Intervention: '#3b82f6',
  'Réception': '#22c55e',
  Visite: '#f59e0b',
  'Sécurité': '#ef4444',
  Livraison: '#8b5cf6',
  Autre: '#6b7280',
};

export default function FormulairesPage({ isDark, couleur, showToast, user, entreprise, chantiers, clients }) {
  const [templates, setTemplates] = useState(loadTemplatesLocal);
  const [submissions, setSubmissions] = useState(loadSubmissionsLocal);
  const [view, setView] = useState('list'); // 'list' | 'builder' | 'filler' | 'submissions'
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [fillingTemplate, setFillingTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load from Supabase
  useEffect(() => {
    async function loadFromSupabase() {
      if (isDemo || !supabase || !user?.id) return;

      try {
        const [tplRes, subRes] = await Promise.all([
          supabase.from('form_templates').select('*').order('created_at', { ascending: false }),
          supabase.from('form_submissions').select('*').order('created_at', { ascending: false }),
        ]);

        if (tplRes.error && !tplRes.error.message?.includes('schema cache')) {
          console.warn('[Forms] Templates load:', tplRes.error.message);
        }
        if (subRes.error && !subRes.error.message?.includes('schema cache')) {
          console.warn('[Forms] Submissions load:', subRes.error.message);
        }
        if (!tplRes.error && tplRes.data?.length > 0) {
          setTemplates(tplRes.data.map(t => ({
            id: t.id,
            name: t.name,
            categorie: t.categorie,
            champs: typeof t.champs === 'string' ? JSON.parse(t.champs) : t.champs,
            updatedAt: t.updated_at,
          })));
        }

        if (!subRes.error && subRes.data?.length > 0) {
          setSubmissions(subRes.data.map(s => ({
            id: s.id,
            templateId: s.template_id,
            templateName: s.template_name,
            responses: typeof s.responses === 'string' ? JSON.parse(s.responses) : s.responses,
            chantierId: s.chantier_id,
            status: s.status,
            createdAt: s.created_at,
          })));
        }
      } catch (e) {
        console.warn('[FormulairesPage] Load failed:', e.message);
      }
    }
    loadFromSupabase();
  }, [user?.id]);

  // Theme
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

  // Sync templates to localStorage
  useEffect(() => {
    saveTemplatesLocal(templates);
  }, [templates]);

  const handleSaveTemplate = async (template) => {
    setTemplates(prev => {
      const exists = prev.findIndex(t => t.id === template.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = template;
        return updated;
      }
      return [...prev, template];
    });
    setView('list');
    setEditingTemplate(null);

    // Persist to Supabase
    if (!isDemo && supabase && user?.id) {
      try {
        await supabase.from('form_templates').upsert({
          id: template.id,
          user_id: user.id,
          entreprise_id: entreprise?.id,
          name: template.name,
          categorie: template.categorie,
          champs: JSON.stringify(template.champs || []),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (e) {
        console.warn('[FormulairesPage] Save template failed:', e.message);
      }
    }
  };

  const handleDeleteTemplate = async (id) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    showToast?.('Formulaire supprimé', 'success');

    if (!isDemo && supabase && user?.id) {
      try {
        await supabase.from('form_templates').delete().eq('id', id);
      } catch (e) {
        console.warn('[FormulairesPage] Delete template failed:', e.message);
      }
    }
  };

  const handleSubmitForm = async (submission) => {
    setSubmissions(prev => {
      const next = [...prev, submission];
      try { localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setView('list');
    setFillingTemplate(null);

    // Persist to Supabase
    if (!isDemo && supabase && user?.id) {
      try {
        await supabase.from('form_submissions').upsert({
          id: submission.id,
          user_id: user.id,
          entreprise_id: entreprise?.id,
          template_id: submission.templateId,
          template_name: submission.templateName,
          responses: JSON.stringify(submission.responses || {}),
          chantier_id: submission.chantierId || null,
          status: submission.status || 'soumis',
          created_at: submission.createdAt || new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (e) {
        // Silently handle missing table — localStorage is the primary store
        if (!e?.message?.includes('schema cache')) {
          console.warn('[Forms] Save submission:', e?.message);
        }
      }
    }
  };

  const filteredTemplates = templates.filter(t =>
    !searchQuery ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.categorie || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const templateSubmissionCount = (templateId) => {
    return submissions.filter(s => s.templateId === templateId).length;
  };

  // Builder view
  if (view === 'builder') {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => { setView('list'); setEditingTemplate(null); }}
          className={`flex items-center gap-2 mb-4 text-sm font-medium ${textSecondary} ${hoverBg} px-3 py-2 rounded-xl transition-colors`}
        >
          <ArrowLeft size={16} />
          Retour aux formulaires
        </button>
        <FormBuilder
          isDark={isDark}
          couleur={couleur}
          showToast={showToast}
          onSave={handleSaveTemplate}
          initialTemplate={editingTemplate}
        />
      </div>
    );
  }

  // Filler view
  if (view === 'filler' && fillingTemplate) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => { setView('list'); setFillingTemplate(null); }}
          className={`flex items-center gap-2 mb-4 text-sm font-medium ${textSecondary} ${hoverBg} px-3 py-2 rounded-xl transition-colors`}
        >
          <ArrowLeft size={16} />
          Retour aux formulaires
        </button>
        <FormFiller
          template={fillingTemplate}
          isDark={isDark}
          couleur={couleur}
          showToast={showToast}
          onSubmit={handleSubmitForm}
          chantiers={chantiers || []}
        />
      </div>
    );
  }

  // Submissions view
  if (view === 'submissions') {
    const sorted = [...submissions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return (
      <div>
        <button
          onClick={() => setView('list')}
          className={`flex items-center gap-2 mb-4 text-sm font-medium ${textSecondary} ${hoverBg} px-3 py-2 rounded-xl transition-colors`}
        >
          <ArrowLeft size={16} />
          Retour aux formulaires
        </button>
        <h2 className={`text-lg font-bold mb-4 ${textPrimary}`}>Soumissions ({sorted.length})</h2>
        {sorted.length === 0 ? (
          <div className={`rounded-xl border p-8 text-center ${cardBg}`}>
            <ClipboardCheck size={32} className={`mx-auto mb-2 ${textMuted}`} />
            <p className={`text-sm ${textSecondary}`}>Aucune soumission pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map(sub => (
              <div key={sub.id} className={`rounded-xl border p-4 ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{sub.templateName}</p>
                    <p className={`text-xs ${textSecondary}`}>
                      {new Date(sub.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-lg font-medium ${sub.status === 'soumis' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}
                  >
                    {sub.status === 'soumis' ? 'Soumis' : 'Brouillon'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // List view (default)
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Formulaires terrain</h1>
          <p className={`text-sm mt-0.5 ${textSecondary}`}>{templates.length} formulaire{templates.length !== 1 ? 's' : ''} — {submissions.length} soumission{submissions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {submissions.length > 0 && (
            <button
              onClick={() => setView('submissions')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${cardBg} ${textSecondary} ${hoverBg}`}
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Soumissions</span>
            </button>
          )}
          <button
            onClick={() => { setEditingTemplate(null); setView('builder'); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg transition-all active:scale-95"
            style={{ background: couleur }}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nouveau formulaire</span>
          </button>
        </div>
      </div>

      {/* Search */}
      {templates.length > 3 && (
        <div className="relative mb-4">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un formulaire..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
          />
        </div>
      )}

      {/* Templates grid */}
      {filteredTemplates.length === 0 && templates.length === 0 ? (
        <div className={`rounded-xl border border-dashed p-8 sm:p-12 text-center ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
          <ClipboardCheck size={40} className={`mx-auto mb-3 ${textMuted}`} />
          <h3 className={`text-base font-semibold mb-1 ${textPrimary}`}>Aucun formulaire</h3>
          <p className={`text-sm mb-4 ${textSecondary}`}>
            Créez votre premier formulaire terrain ou partez d'un template.
          </p>
          <button
            onClick={() => { setEditingTemplate(null); setView('builder'); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg transition-all active:scale-95"
            style={{ background: couleur }}
          >
            <Plus size={16} />
            Créer un formulaire
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTemplates.map(template => {
            const catColor = CATEGORIE_COLORS[template.categorie] || couleur;
            const subCount = templateSubmissionCount(template.id);
            return (
              <div
                key={template.id}
                className={`rounded-xl border p-4 transition-all cursor-pointer ${cardBg} ${hoverBg} group`}
                onClick={() => { setFillingTemplate(template); setView('filler'); }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${catColor}15` }}
                  >
                    <ClipboardCheck size={18} style={{ color: catColor }} />
                  </div>
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditingTemplate(template); setView('builder'); }}
                      className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
                      title="Modifier"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className={`text-sm font-semibold mb-1 ${textPrimary}`}>{template.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${catColor}15`, color: catColor }}
                  >
                    {template.categorie}
                  </span>
                  <span className={`text-xs ${textMuted}`}>{template.champs?.length || 0} champs</span>
                  {subCount > 0 && (
                    <span className={`text-xs ${textMuted}`}>{subCount} soumission{subCount > 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className={`flex items-center gap-1 mt-3 text-xs ${textMuted}`}>
                  <Clock size={12} />
                  {template.updatedAt
                    ? new Date(template.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                    : 'Récent'}
                </div>
              </div>
            );
          })}

          {/* New form card */}
          <button
            onClick={() => { setEditingTemplate(null); setView('builder'); }}
            className={`rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-2 min-h-[140px] transition-all ${isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-300 hover:border-slate-400'}`}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${couleur}15` }}
            >
              <Plus size={18} style={{ color: couleur }} />
            </div>
            <span className={`text-sm font-medium ${textSecondary}`}>Nouveau formulaire</span>
          </button>
        </div>
      )}
    </div>
  );
}
