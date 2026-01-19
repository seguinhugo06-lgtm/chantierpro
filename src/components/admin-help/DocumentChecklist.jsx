import { useState, useEffect } from 'react';
import {
  CheckSquare, Shield, FileText, Upload, Check,
  ChevronRight, Download, ArrowLeft
} from 'lucide-react';

const STORAGE_KEY = 'chantierpro_document_checklists';

/**
 * DocumentChecklist - Checklists documents obligatoires par chantier (simplifié)
 */

const CHECKLIST_TEMPLATE = [
  {
    category: 'Assurances obligatoires',
    icon: Shield,
    color: '#3b82f6',
    items: [
      { id: 'decennale', name: 'Attestation Décennale', required: true, description: 'En cours de validité' },
      { id: 'rcpro', name: 'RC Professionnelle', required: true, description: 'Responsabilité civile' },
    ]
  },
  {
    category: 'Documents administratifs',
    icon: FileText,
    color: '#22c55e',
    items: [
      { id: 'kbis', name: 'Extrait Kbis / INSEE', required: true, description: 'Moins de 3 mois' },
      { id: 'urssaf', name: 'Attestation URSSAF', required: true, description: 'Vigilance en cours' },
      { id: 'qualif', name: 'Qualification (RGE...)', required: false, description: 'Si travaux spécifiques' },
    ]
  },
  {
    category: 'Documents chantier',
    icon: CheckSquare,
    color: '#f59e0b',
    items: [
      { id: 'devis_signe', name: 'Devis signé', required: true, description: 'Accepté par le client' },
      { id: 'permis', name: 'Permis / DP', required: false, description: 'Si travaux soumis' },
    ]
  },
];

export default function DocumentChecklist({ isDark = false, couleur = '#f97316', chantiers = [] }) {
  const [selectedChantier, setSelectedChantier] = useState(null);

  // Load checklists from localStorage
  const [checklists, setChecklists] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checklists));
    } catch { /* ignore */ }
  }, [checklists]);

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  // Use real chantiers only
  const displayChantiers = chantiers.filter(c => c.statut === 'en_cours');

  const getChantierChecklist = (chantierId) => checklists[chantierId] || {};

  const toggleItem = (chantierId, itemId) => {
    const current = getChantierChecklist(chantierId);
    const newChecklist = {
      ...current,
      [itemId]: current[itemId] ? null : { checked: true, date: new Date().toISOString() }
    };
    setChecklists(prev => ({ ...prev, [chantierId]: newChecklist }));
  };

  const getCompletionRate = (chantierId) => {
    const checklist = getChantierChecklist(chantierId);
    const requiredItems = CHECKLIST_TEMPLATE.flatMap(c => c.items.filter(i => i.required));
    const completed = requiredItems.filter(item => checklist[item.id]?.checked);
    return Math.round((completed.length / requiredItems.length) * 100);
  };

  if (selectedChantier) {
    const checklist = getChantierChecklist(selectedChantier.id);
    const completion = getCompletionRate(selectedChantier.id);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedChantier(null)}
            className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h2 className={`font-bold ${textPrimary}`}>{selectedChantier.nom}</h2>
            <p className={`text-sm ${textMuted}`}>Documents obligatoires</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold" style={{ color: completion === 100 ? '#22c55e' : couleur }}>{completion}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${completion}%`, background: completion === 100 ? '#22c55e' : couleur }}
          />
        </div>

        {completion === 100 && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <Shield className="text-emerald-500 mx-auto mb-2" size={24} />
            <p className="font-medium text-emerald-700">Chantier conforme</p>
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-4">
          {CHECKLIST_TEMPLATE.map(category => (
            <div key={category.category} className={`p-4 rounded-xl ${cardBg} border ${borderColor}`}>
              <div className="flex items-center gap-2 mb-3">
                <category.icon size={18} style={{ color: category.color }} />
                <h3 className={`font-medium ${textPrimary}`}>{category.category}</h3>
              </div>

              <div className="space-y-2">
                {category.items.map(item => {
                  const isChecked = checklist[item.id]?.checked;

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(selectedChantier.id, item.id)}
                      className={`w-full p-3 rounded-lg flex items-center gap-3 text-left transition-all ${
                        isChecked
                          ? 'bg-emerald-50 border border-emerald-200'
                          : isDark ? 'bg-slate-700' : 'bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                        isChecked ? 'bg-emerald-500 text-white' : isDark ? 'bg-slate-600 border border-slate-500' : 'bg-white border border-slate-300'
                      }`}>
                        {isChecked && <Check size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isChecked ? 'text-emerald-700' : textPrimary}`}>
                          {item.name}
                          {item.required && <span className="text-red-500 ml-1">*</span>}
                        </p>
                        <p className={`text-xs ${isChecked ? 'text-emerald-600' : textMuted}`}>{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-bold ${textPrimary}`}>Checklists Documents</h2>
        <p className={`text-sm ${textMuted}`}>Documents obligatoires par chantier</p>
      </div>

      {displayChantiers.length === 0 ? (
        <div className={`p-8 rounded-xl ${cardBg} border ${borderColor} text-center`}>
          <CheckSquare size={32} className={`mx-auto mb-3 ${textMuted}`} />
          <p className={textMuted}>Aucun chantier en cours</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayChantiers.map(chantier => {
            const completion = getCompletionRate(chantier.id);

            return (
              <button
                key={chantier.id}
                onClick={() => setSelectedChantier(chantier)}
                className={`w-full p-4 rounded-xl ${cardBg} border ${borderColor} flex items-center justify-between transition-all hover:shadow-md`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    completion === 100 ? 'bg-emerald-100' : 'bg-amber-100'
                  }`}>
                    {completion === 100 ? (
                      <Shield className="text-emerald-500" size={20} />
                    ) : (
                      <CheckSquare className="text-amber-500" size={20} />
                    )}
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${textPrimary}`}>{chantier.nom}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-16 h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${completion}%`, background: completion === 100 ? '#22c55e' : couleur }}
                        />
                      </div>
                      <span className={`text-xs ${textMuted}`}>{completion}%</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className={textMuted} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
