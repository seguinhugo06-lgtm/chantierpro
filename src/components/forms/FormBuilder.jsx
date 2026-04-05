import React, { useState, useRef, useCallback } from 'react';
import { Plus, GripVertical, Trash2, X, Type, Hash, Calendar, Camera, PenTool, CheckSquare, List, MessageSquare, FileText, ChevronDown, Copy, AlertCircle } from 'lucide-react';

const FIELD_TYPES = [
  { value: 'texte', label: 'Texte', icon: Type },
  { value: 'nombre', label: 'Nombre', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'photo', label: 'Photo', icon: Camera },
  { value: 'signature', label: 'Signature', icon: PenTool },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'selection', label: 'Sélection', icon: List },
  { value: 'remarque', label: 'Remarque', icon: MessageSquare },
];

const CATEGORIES = [
  'Intervention',
  'Réception',
  'Visite',
  'Sécurité',
  'Livraison',
  'Autre',
];

const TEMPLATES = [
  {
    name: 'PV de réception',
    categorie: 'Réception',
    champs: [
      { id: '1', type: 'texte', label: 'Chantier', obligatoire: true },
      { id: '2', type: 'texte', label: 'Client', obligatoire: true },
      { id: '3', type: 'date', label: 'Date de réception', obligatoire: true },
      { id: '4', type: 'texte', label: 'Réserves constatées', obligatoire: false },
      { id: '5', type: 'photo', label: 'Photos', obligatoire: false },
      { id: '6', type: 'checkbox', label: 'Travaux conformes', obligatoire: true },
      { id: '7', type: 'signature', label: 'Signature client', obligatoire: true },
      { id: '8', type: 'signature', label: 'Signature technicien', obligatoire: true },
    ],
  },
  {
    name: 'Fiche d\'intervention',
    categorie: 'Intervention',
    champs: [
      { id: '1', type: 'texte', label: 'Technicien', obligatoire: true },
      { id: '2', type: 'date', label: 'Date', obligatoire: true },
      { id: '3', type: 'selection', label: 'Type d\'intervention', obligatoire: true, options: ['Dépannage', 'Installation', 'Maintenance', 'Réparation', 'Autre'] },
      { id: '4', type: 'texte', label: 'Description travaux', obligatoire: true },
      { id: '5', type: 'texte', label: 'Matériaux utilisés', obligatoire: false },
      { id: '6', type: 'photo', label: 'Photos avant', obligatoire: false },
      { id: '7', type: 'photo', label: 'Photos après', obligatoire: false },
      { id: '8', type: 'nombre', label: 'Durée intervention (h)', obligatoire: true },
      { id: '9', type: 'signature', label: 'Signature client', obligatoire: true },
    ],
  },
  {
    name: 'Rapport de visite',
    categorie: 'Visite',
    champs: [
      { id: '1', type: 'texte', label: 'Objet visite', obligatoire: true },
      { id: '2', type: 'date', label: 'Date', obligatoire: true },
      { id: '3', type: 'texte', label: 'État des lieux', obligatoire: true },
      { id: '4', type: 'texte', label: 'Points d\'attention', obligatoire: false },
      { id: '5', type: 'texte', label: 'Recommandations', obligatoire: false },
      { id: '6', type: 'photo', label: 'Photos', obligatoire: false },
      { id: '7', type: 'date', label: 'Prochaine visite', obligatoire: false },
    ],
  },
  {
    name: 'Bon de livraison',
    categorie: 'Livraison',
    champs: [
      { id: '1', type: 'texte', label: 'Fournisseur', obligatoire: true },
      { id: '2', type: 'texte', label: 'N° commande', obligatoire: false },
      { id: '3', type: 'date', label: 'Date de livraison', obligatoire: true },
      { id: '4', type: 'texte', label: 'Articles livrés', obligatoire: true },
      { id: '5', type: 'nombre', label: 'Quantité', obligatoire: true },
      { id: '6', type: 'checkbox', label: 'Conforme à la commande', obligatoire: false },
      { id: '7', type: 'texte', label: 'Remarques', obligatoire: false },
      { id: '8', type: 'photo', label: 'Photo du bon', obligatoire: false },
      { id: '9', type: 'signature', label: 'Signature réceptionnaire', obligatoire: true },
    ],
  },
  {
    name: 'Fiche sécurité chantier',
    categorie: 'Sécurité',
    champs: [
      { id: '1', type: 'texte', label: 'Nom du chantier', obligatoire: true },
      { id: '2', type: 'date', label: 'Date', obligatoire: true },
      { id: '3', type: 'checkbox', label: 'EPI portés (casque, gants, chaussures)', obligatoire: true },
      { id: '4', type: 'checkbox', label: 'Zone de travail sécurisée', obligatoire: true },
      { id: '5', type: 'checkbox', label: 'Extincteur accessible', obligatoire: false },
      { id: '6', type: 'checkbox', label: 'Signalisation en place', obligatoire: false },
      { id: '7', type: 'texte', label: 'Risques identifiés', obligatoire: false },
      { id: '8', type: 'photo', label: 'Photo des conditions', obligatoire: false },
      { id: '9', type: 'signature', label: 'Signature responsable sécurité', obligatoire: true },
    ],
  },
];

let nextFieldId = 100;
const genId = () => String(nextFieldId++);

export default function FormBuilder({ isDark, couleur, showToast, onSave, initialTemplate }) {
  const [nom, setNom] = useState(initialTemplate?.name || '');
  const [categorie, setCategorie] = useState(initialTemplate?.categorie || 'Intervention');
  const [champs, setChamps] = useState(
    initialTemplate?.champs?.map(c => ({ ...c, id: c.id || genId() })) || []
  );
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingOptions, setEditingOptions] = useState(null);
  const [optionInput, setOptionInput] = useState('');
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Theme
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

  const addField = useCallback((type) => {
    const fieldType = FIELD_TYPES.find(f => f.value === type);
    setChamps(prev => [...prev, {
      id: genId(),
      type,
      label: fieldType?.label || type,
      obligatoire: false,
      ...(type === 'selection' ? { options: ['Option 1', 'Option 2'] } : {}),
    }]);
    setShowTypeDropdown(false);
  }, []);

  const removeField = useCallback((id) => {
    setChamps(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateField = useCallback((id, updates) => {
    setChamps(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const items = [...champs];
    const draggedItem = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, draggedItem);
    setChamps(items);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const applyTemplate = (template) => {
    setNom(template.name);
    setCategorie(template.categorie);
    setChamps(template.champs.map(c => ({ ...c, id: genId() })));
    setShowTemplateMenu(false);
    showToast?.(`Template "${template.name}" appliqué`, 'success');
  };

  const handleSave = () => {
    if (!nom.trim()) {
      setFormError('Le nom du formulaire est requis');
      showToast?.('Veuillez donner un nom au formulaire', 'error');
      return;
    }
    if (champs.length === 0) {
      setFormError('Ajoutez au moins un champ au formulaire');
      showToast?.('Ajoutez au moins un champ', 'error');
      return;
    }
    setFormError('');
    const template = {
      id: initialTemplate?.id || `form_${Date.now()}`,
      name: nom.trim(),
      categorie,
      champs: champs.map(({ id, ...rest }) => ({ ...rest, id })),
      createdAt: initialTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave?.(template);
    showToast?.('Formulaire enregistré', 'success');
  };

  const addOption = (fieldId) => {
    if (!optionInput.trim()) return;
    setChamps(prev => prev.map(c => {
      if (c.id === fieldId) {
        return { ...c, options: [...(c.options || []), optionInput.trim()] };
      }
      return c;
    }));
    setOptionInput('');
  };

  const removeOption = (fieldId, optIndex) => {
    setChamps(prev => prev.map(c => {
      if (c.id === fieldId) {
        const opts = [...(c.options || [])];
        opts.splice(optIndex, 1);
        return { ...c, options: opts };
      }
      return c;
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>
          {initialTemplate ? 'Modifier le formulaire' : 'Nouveau formulaire'}
        </h2>
        <div className="relative">
          <button
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${cardBg} ${textSecondary} ${hoverBg}`}
          >
            <Copy size={16} />
            <span className="hidden sm:inline">Utiliser un template</span>
            <ChevronDown size={14} />
          </button>
          {showTemplateMenu && (
            <div className={`absolute right-0 top-full mt-1 w-64 rounded-xl border shadow-xl z-20 ${cardBg}`}>
              {TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(t)}
                  className={`w-full text-left px-4 py-3 text-sm ${hoverBg} ${textPrimary} ${i === 0 ? 'rounded-t-xl' : ''} ${i === TEMPLATES.length - 1 ? 'rounded-b-xl' : ''} border-b last:border-b-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}
                >
                  <div className="font-medium">{t.name}</div>
                  <div className={`text-xs mt-0.5 ${textSecondary}`}>{t.champs.length} champs — {t.categorie}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Name + Category */}
      <div className={`rounded-xl border p-4 space-y-3 ${cardBg}`}>
        <div>
          <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Nom du formulaire</label>
          <input
            type="text"
            value={nom}
            onChange={(e) => { setNom(e.target.value); if (formError) setFormError(''); }}
            placeholder="Ex: PV de réception chantier"
            className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
            style={formError && !nom.trim() ? { borderColor: '#ef4444', focusRingColor: couleur } : { focusRingColor: couleur }}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${textSecondary}`}>Catégorie</label>
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fields list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${textPrimary}`}>Champs ({champs.length})</h3>
        </div>

        {champs.length === 0 && (
          <div className={`rounded-xl border border-dashed p-8 text-center ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
            <FileText size={32} className={`mx-auto mb-2 ${textSecondary}`} />
            <p className={`text-sm ${textSecondary}`}>Aucun champ. Ajoutez des champs ou utilisez un template.</p>
          </div>
        )}

        {champs.map((champ, index) => {
          const FieldIcon = FIELD_TYPES.find(f => f.value === champ.type)?.icon || Type;
          return (
            <div
              key={champ.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`rounded-xl border p-3 flex flex-col gap-2 transition-all ${cardBg}`}
            >
              <div className="flex items-center gap-2">
                <GripVertical size={16} className={`cursor-grab flex-shrink-0 ${textSecondary}`} />
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${couleur}15` }}
                >
                  <FieldIcon size={14} style={{ color: couleur }} />
                </div>
                <input
                  type="text"
                  value={champ.label}
                  onChange={(e) => updateField(champ.id, { label: e.target.value })}
                  className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg border text-sm ${inputBg} focus:outline-none`}
                  placeholder="Nom du champ"
                />
                <span className={`text-xs px-2 py-1 rounded-lg flex-shrink-0 ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  {FIELD_TYPES.find(f => f.value === champ.type)?.label}
                </span>
                <label className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
                  <span className={`text-xs ${textSecondary}`}>Requis</span>
                  <button
                    type="button"
                    onClick={() => updateField(champ.id, { obligatoire: !champ.obligatoire })}
                    className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${champ.obligatoire ? '' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}
                    style={champ.obligatoire ? { background: couleur } : {}}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${champ.obligatoire ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </label>
                <button
                  onClick={() => removeField(champ.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Options editor for selection fields */}
              {champ.type === 'selection' && (
                <div className="ml-10 space-y-1.5">
                  <p className={`text-xs font-medium ${textSecondary}`}>Options :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(champ.options || []).map((opt, oi) => (
                      <span key={oi} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        {opt}
                        <button onClick={() => removeOption(champ.id, oi)} className="text-red-400 hover:text-red-500">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  {editingOptions === champ.id ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(champ.id); } }}
                        placeholder="Nouvelle option"
                        className={`flex-1 px-2 py-1.5 rounded-lg border text-xs ${inputBg} focus:outline-none`}
                        autoFocus
                      />
                      <button
                        onClick={() => addOption(champ.id)}
                        className="px-2 py-1.5 rounded-lg text-white text-xs"
                        style={{ background: couleur }}
                      >
                        OK
                      </button>
                      <button
                        onClick={() => { setEditingOptions(null); setOptionInput(''); }}
                        className={`px-2 py-1.5 rounded-lg text-xs ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
                      >
                        Fermer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingOptions(champ.id)}
                      className={`text-xs font-medium ${hoverBg} px-2 py-1 rounded-lg transition-colors`}
                      style={{ color: couleur }}
                    >
                      + Ajouter une option
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add field button */}
      <div className="relative">
        <button
          onClick={() => setShowTypeDropdown(!showTypeDropdown)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-all"
          style={{ borderColor: `${couleur}40`, color: couleur }}
        >
          <Plus size={16} />
          Ajouter un champ
        </button>
        {showTypeDropdown && (
          <div className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-20 grid grid-cols-2 sm:grid-cols-4 gap-1 p-2 ${cardBg}`}>
            {FIELD_TYPES.map(ft => (
              <button
                key={ft.value}
                onClick={() => addField(ft.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${hoverBg} ${textPrimary} transition-colors`}
              >
                <ft.icon size={14} style={{ color: couleur }} />
                {ft.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error message */}
      {formError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-500 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {formError}
        </div>
      )}

      {/* Save */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-white font-medium text-sm shadow-lg transition-all active:scale-95"
          style={{ background: couleur }}
        >
          Enregistrer le formulaire
        </button>
      </div>
    </div>
  );
}
