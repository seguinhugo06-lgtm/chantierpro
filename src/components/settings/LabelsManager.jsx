import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, X, Check, Award, AlertTriangle, Upload, Calendar } from 'lucide-react';
import { LABEL_TYPES, getDefaultLogo } from '../../data/labelLogos';

/**
 * LabelsManager — manage BTP certifications and labels
 * Used in Settings page, "Labels" tab
 */
export default function LabelsManager({ entreprise, updateEntreprise, isDark, couleur }) {
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: '',
    nom: '',
    numero: '',
    organisme: '',
    dateObtention: '',
    dateExpiration: '',
    logo: '',
    actif: true,
  });

  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300";

  const labels = entreprise?.labels || [];

  // One-time migration: convert old rge/rgeOrganisme to labels array
  useEffect(() => {
    if (entreprise?.rge && (!labels || labels.length === 0)) {
      const migratedLabel = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
        type: 'rge',
        nom: `RGE${entreprise.rgeOrganisme ? ` ${entreprise.rgeOrganisme}` : ''}`,
        numero: entreprise.rge,
        organisme: entreprise.rgeOrganisme || '',
        dateObtention: '',
        dateExpiration: '',
        logo: getDefaultLogo('rge'),
        actif: true,
      };
      updateEntreprise(p => ({ ...p, labels: [migratedLabel] }));
    }
  }, []);

  const handleTypeChange = (type) => {
    const info = LABEL_TYPES.find(l => l.type === type);
    if (info) {
      setForm(prev => ({
        ...prev,
        type,
        nom: info.nom,
        organisme: info.organisme,
        logo: info.defaultLogo,
      }));
    } else {
      setForm(prev => ({ ...prev, type, nom: '', organisme: '', logo: '' }));
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024) {
      alert('Image trop grande (max 100 KB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setForm(prev => ({ ...prev, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const saveLabel = () => {
    if (!form.nom.trim()) return;
    const newLabel = {
      ...form,
      id: editingId || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)),
      nom: form.nom.trim(),
      numero: form.numero.trim(),
      organisme: form.organisme.trim(),
    };

    let updatedLabels;
    if (editingId) {
      updatedLabels = labels.map(l => l.id === editingId ? newLabel : l);
    } else {
      updatedLabels = [...labels, newLabel];
    }

    updateEntreprise(p => ({ ...p, labels: updatedLabels }));
    resetForm();
  };

  const deleteLabel = (id) => {
    updateEntreprise(p => ({ ...p, labels: (p.labels || []).filter(l => l.id !== id) }));
  };

  const editLabel = (label) => {
    setForm({ ...label });
    setEditingId(label.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ type: '', nom: '', numero: '', organisme: '', dateObtention: '', dateExpiration: '', logo: '', actif: true });
    setEditingId(null);
    setShowForm(false);
  };

  const getExpirationStatus = (date) => {
    if (!date) return null;
    const exp = new Date(date);
    const now = new Date();
    const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { level: 'expired', text: `Expiré depuis ${Math.abs(daysLeft)} jours`, color: 'text-red-500' };
    if (daysLeft <= 60) return { level: 'warning', text: `Expire dans ${daysLeft} jours`, color: 'text-amber-500' };
    return { level: 'ok', text: `Valide jusqu'au ${exp.toLocaleDateString('fr-FR')}`, color: 'text-emerald-500' };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Labels & Certifications</h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Vos labels apparaissent sur les devis et factures</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-white rounded-xl text-sm hover:shadow-lg transition-all min-h-[44px]"
            style={{ background: couleur }}
          >
            <Plus size={16} />Ajouter
          </button>
        </div>

        {labels.length === 0 && !showForm && (
          <div className={`text-center py-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <Award size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Aucun label configuré</p>
            <p className="text-sm mt-1">Ajoutez vos certifications (RGE, Qualibat, etc.) pour les afficher sur vos documents.</p>
          </div>
        )}

        {/* Labels list */}
        <div className="space-y-3">
          {labels.map(label => {
            const expStatus = getExpirationStatus(label.dateExpiration);
            return (
              <div key={label.id} className={`flex items-center gap-4 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                {label.logo && (
                  <img src={label.logo} alt={label.nom} className="w-10 h-10 object-contain rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{label.nom}</p>
                    {label.numero && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>n°{label.numero}</span>}
                    {!label.actif && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-600 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>Inactif</span>}
                  </div>
                  <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {label.organisme && <span>{label.organisme}</span>}
                    {expStatus && (
                      <span className={`flex items-center gap-1 ${expStatus.color}`}>
                        {expStatus.level === 'expired' && <AlertTriangle size={11} />}
                        {expStatus.text}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => editLabel(label)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`}>
                    <Edit3 size={15} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
                  </button>
                  <button onClick={() => deleteLabel(label.id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}`}>
                    <Trash2 size={15} className="text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className={`${cardBg} rounded-xl sm:rounded-2xl border p-4 sm:p-6`}>
          <h3 className="font-semibold mb-4">{editingId ? 'Modifier le label' : 'Nouveau label'}</h3>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : ''}`}>Type de label</label>
              <select
                className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
                value={form.type}
                onChange={e => handleTypeChange(e.target.value)}
              >
                <option value="">— Sélectionner —</option>
                {LABEL_TYPES.map(lt => (
                  <option key={lt.type} value={lt.type}>{lt.nom} — {lt.description}</option>
                ))}
                <option value="custom">Autre (personnalisé)</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : ''}`}>Nom du label *</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="Ex: RGE Qualibat" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : ''}`}>Numéro de certification</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.numero} onChange={e => setForm(p => ({...p, numero: e.target.value}))} placeholder="Ex: E-12345" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : ''}`}>Organisme certificateur</label>
                <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.organisme} onChange={e => setForm(p => ({...p, organisme: e.target.value}))} placeholder="Ex: Qualibat" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : ''}`}>Logo</label>
                <div className="flex items-center gap-3">
                  {form.logo && <img src={form.logo} alt="Logo" className="w-10 h-10 object-contain rounded border" />}
                  <label className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl cursor-pointer text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                    <Upload size={14} />Changer
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : ''}`}>Date d'obtention</label>
                <input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.dateObtention} onChange={e => setForm(p => ({...p, dateObtention: e.target.value}))} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : ''}`}>Date d'expiration</label>
                <input type="date" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.dateExpiration} onChange={e => setForm(p => ({...p, dateExpiration: e.target.value}))} />
              </div>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <span className="text-sm font-medium">Label actif</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.actif !== false} onChange={e => setForm(p => ({...p, actif: e.target.checked}))} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={resetForm} className={`px-4 py-2.5 rounded-xl text-sm min-h-[44px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <X size={16} className="inline mr-1" />Annuler
              </button>
              <button onClick={saveLabel} disabled={!form.nom.trim()} className="px-6 py-2.5 text-white rounded-xl text-sm min-h-[44px] hover:shadow-lg transition-all disabled:opacity-50" style={{ background: couleur }}>
                <Check size={16} className="inline mr-1" />{editingId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expiration alerts */}
      {labels.filter(l => {
        if (!l.dateExpiration) return false;
        const daysLeft = Math.ceil((new Date(l.dateExpiration) - new Date()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 60;
      }).length > 0 && (
        <div className={`${isDark ? 'bg-amber-900/10 border-amber-800/30' : 'bg-amber-50 border-amber-200'} border rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h4 className={`font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Alertes certifications</h4>
          </div>
          <div className="space-y-1">
            {labels.filter(l => {
              if (!l.dateExpiration) return false;
              const daysLeft = Math.ceil((new Date(l.dateExpiration) - new Date()) / (1000 * 60 * 60 * 24));
              return daysLeft <= 60;
            }).map(l => {
              const daysLeft = Math.ceil((new Date(l.dateExpiration) - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <p key={l.id} className={`text-sm ${daysLeft < 0 ? 'text-red-600 font-medium' : isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  {daysLeft < 0
                    ? `⛔ ${l.nom} — expiré depuis ${Math.abs(daysLeft)} jours`
                    : `⚠️ ${l.nom} — expire dans ${daysLeft} jours (${new Date(l.dateExpiration).toLocaleDateString('fr-FR')})`
                  }
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
