import { useState, useMemo } from 'react';
import {
  Shield, AlertTriangle, Check, X, ChevronRight, Download,
  FileText, TrendingUp, ArrowLeft
} from 'lucide-react';
import { useToast } from '../../context/AppContext';

/**
 * ConformityReport - Audit conformité simplifié
 */

const CONFORMITY_CATEGORIES = [
  {
    id: 'assurances',
    name: 'Assurances',
    icon: Shield,
    color: '#3b82f6',
    items: [
      { id: 'decennale', name: 'Assurance décennale', required: true },
      { id: 'rcpro', name: 'RC Professionnelle', required: true },
    ]
  },
  {
    id: 'social',
    name: 'Obligations sociales',
    icon: FileText,
    color: '#22c55e',
    items: [
      { id: 'dsn', name: 'DSN à jour', required: true },
      { id: 'urssaf', name: 'Cotisations URSSAF', required: true },
    ]
  },
  {
    id: 'fiscal',
    name: 'Obligations fiscales',
    icon: FileText,
    color: '#f59e0b',
    items: [
      { id: 'tva', name: 'Déclarations TVA', required: true },
      { id: 'comptabilite', name: 'Comptabilité à jour', required: true },
    ]
  },
  {
    id: 'securite',
    name: 'Sécurité',
    icon: Shield,
    color: '#ef4444',
    items: [
      { id: 'duer', name: 'Document unique (DUER)', required: true },
      { id: 'epi', name: 'EPI fournis', required: true },
    ]
  },
];

export default function ConformityReport({ isDark = false, couleur = '#f97316' }) {
  const { showToast } = useToast();
  const [checkedItems, setCheckedItems] = useState({});
  const [expandedCategory, setExpandedCategory] = useState('assurances');

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const borderColor = isDark ? 'border-slate-700' : 'border-slate-200';

  // Calculate score
  const { score, missing } = useMemo(() => {
    const allItems = CONFORMITY_CATEGORIES.flatMap(c => c.items);
    const requiredItems = allItems.filter(i => i.required);
    const checkedRequired = requiredItems.filter(i => checkedItems[i.id]);
    const missingItems = CONFORMITY_CATEGORIES.flatMap(c =>
      c.items.filter(i => i.required && !checkedItems[i.id]).map(i => ({ ...i, category: c.name }))
    );

    return {
      score: requiredItems.length > 0 ? Math.round((checkedRequired.length / requiredItems.length) * 100) : 0,
      missing: missingItems
    };
  }, [checkedItems]);

  const getScoreColor = () => {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const handleToggleItem = (itemId) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-bold ${textPrimary}`}>Audit Conformité</h2>
        <p className={`text-sm ${textMuted}`}>Vérifiez votre conformité réglementaire</p>
      </div>

      {/* Score */}
      <div className={`p-5 rounded-xl ${cardBg} border ${borderColor}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${textMuted}`}>Score de conformité</p>
            <p className="text-3xl font-bold" style={{ color: getScoreColor() }}>{score}%</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center" style={{ borderColor: getScoreColor() }}>
            {score === 100 ? (
              <Check size={24} style={{ color: getScoreColor() }} />
            ) : (
              <span className="text-lg font-bold" style={{ color: getScoreColor() }}>{score}</span>
            )}
          </div>
        </div>
        {score === 100 && (
          <p className="text-sm text-emerald-600 mt-3">Bravo, vous êtes en conformité !</p>
        )}
      </div>

      {/* Missing items alert */}
      {missing.length > 0 && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-red-900/30' : 'bg-red-50'} border ${isDark ? 'border-red-700' : 'border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-red-500" />
            <p className={`font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
              {missing.length} élément{missing.length > 1 ? 's' : ''} manquant{missing.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-1">
            {missing.slice(0, 3).map((item, i) => (
              <p key={i} className={`text-sm ${isDark ? 'text-red-200' : 'text-red-600'}`}>
                • {item.name} ({item.category})
              </p>
            ))}
            {missing.length > 3 && (
              <p className={`text-sm ${textMuted}`}>et {missing.length - 3} autres...</p>
            )}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-3">
        {CONFORMITY_CATEGORIES.map(cat => {
          const isExpanded = expandedCategory === cat.id;
          const catChecked = cat.items.filter(i => checkedItems[i.id]).length;

          return (
            <div key={cat.id} className={`rounded-xl ${cardBg} border ${borderColor} overflow-hidden`}>
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <cat.icon size={18} style={{ color: cat.color }} />
                  <span className={`font-medium ${textPrimary}`}>{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${textMuted}`}>{catChecked}/{cat.items.length}</span>
                  <ChevronRight size={16} className={`${textMuted} transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className={`px-4 pb-4 border-t ${borderColor}`}>
                  <div className="pt-3 space-y-2">
                    {cat.items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleToggleItem(item.id)}
                        className={`w-full p-3 rounded-lg flex items-center gap-3 text-left ${
                          checkedItems[item.id]
                            ? 'bg-emerald-50 border border-emerald-200'
                            : isDark ? 'bg-slate-700' : 'bg-slate-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                          checkedItems[item.id]
                            ? 'bg-emerald-500 text-white'
                            : isDark ? 'bg-slate-600 border border-slate-500' : 'bg-white border border-slate-300'
                        }`}>
                          {checkedItems[item.id] && <Check size={12} />}
                        </div>
                        <span className={`text-sm ${checkedItems[item.id] ? 'text-emerald-700' : textPrimary}`}>
                          {item.name}
                          {item.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className={`text-xs ${textMuted}`}>* Éléments obligatoires</p>
    </div>
  );
}
