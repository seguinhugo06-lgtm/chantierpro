import { useState, useEffect } from 'react';
import {
  CheckSquare, Shield, FileText, Upload, Check,
  ChevronRight, Download, ArrowLeft
} from 'lucide-react';

const STORAGE_KEY = 'mallettico_document_checklists';

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

export default function DocumentChecklist({ isDark: _isDark = false, couleur: _couleur, chantiers = [] }) {
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

  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-2';
  const cardBg = 'bg-surface';
  const borderColor = 'border-bord';

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
            className={`p-2 rounded-xl bg-surface-2`}
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h2 className={`font-bold ${textPrimary}`}>{selectedChantier.nom}</h2>
            <p className={`text-sm ${textMuted}`}>Documents obligatoires</p>
          </div>
          <div className="text-right">
            <p className={`text-xl font-bold ${completion === 100 ? 'text-succes-texte' : 'text-accent-texte'}`}>{completion}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className={`h-2 rounded-full overflow-hidden bg-bord`}>
          <div
            className={`h-full rounded-full transition-all ${completion === 100 ? 'bg-succes-point' : 'bg-accent'}`}
            style={{ width: `${completion}%` }}
          />
        </div>

        {completion === 100 && (
          <div className="p-4 rounded-xl bg-succes-fond border border-succes-point/40 text-center">
            <Shield className="text-succes-texte mx-auto mb-2" size={24} />
            <p className="font-medium text-succes-texte">Chantier conforme</p>
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
                          ? 'bg-succes-fond border border-succes-point/40'
                          : 'bg-fond'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                        isChecked ? 'bg-succes-point text-white' : 'bg-surface border border-bord-fort'
                      }`}>
                        {isChecked && <Check size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isChecked ? 'text-succes-texte' : textPrimary}`}>
                          {item.name}
                          {item.required && <span className="text-encre-2 font-bold ml-1">*</span>}
                        </p>
                        <p className={`text-xs ${isChecked ? 'text-succes-texte' : textMuted}`}>{item.description}</p>
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
                    completion === 100 ? 'bg-succes-fond' : 'bg-alerte-fond'
                  }`}>
                    {completion === 100 ? (
                      <Shield className="text-succes-texte" size={20} />
                    ) : (
                      <CheckSquare className="text-alerte-texte" size={20} />
                    )}
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${textPrimary}`}>{chantier.nom}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-16 h-1.5 rounded-full bg-bord`}>
                        <div
                          className={`h-full rounded-full ${completion === 100 ? 'bg-succes-point' : 'bg-accent'}`}
                          style={{ width: `${completion}%` }}
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
