import React, { useState, useMemo } from 'react';
import { X, FileText, Download, Printer } from 'lucide-react';
import { printAttestationTva } from '../../lib/attestationTvaBuilder';

const QUALITE_OPTIONS = [
  'Propriétaire occupant',
  'Propriétaire bailleur',
  'Locataire',
  'Syndicat de copropriétaires',
  'Société civile immobilière',
];

const NATURE_OPTIONS = [
  'Maison individuelle',
  'Appartement',
  'Immeuble collectif',
  'Local mixte (habitation + professionnel)',
];

const AFFECTATION_OPTIONS = [
  'Habitation',
  'Habitation et usage professionnel',
];

const TRAVAUX_TYPES = [
  { label: 'Peinture, revêtements muraux', category: 'second_oeuvre' },
  { label: 'Revêtements de sols', category: 'second_oeuvre' },
  { label: 'Plomberie, sanitaires', category: 'second_oeuvre' },
  { label: 'Électricité', category: 'second_oeuvre' },
  { label: 'Menuiseries intérieures', category: 'second_oeuvre' },
  { label: 'Chauffage, climatisation', category: 'equipement' },
  { label: 'Isolation thermique', category: 'amelioration' },
  { label: 'Carrelage, faïence', category: 'second_oeuvre' },
  { label: 'Plâtrerie, cloisons', category: 'second_oeuvre' },
  { label: 'Menuiseries extérieures (fenêtres, volets)', category: 'clos_couvert' },
  { label: 'Couverture, toiture', category: 'gros_oeuvre' },
  { label: 'Maçonnerie', category: 'gros_oeuvre' },
];

/**
 * Modal for generating a CERFA 13948 attestation for reduced VAT
 */
export default function AttestationTVA({ devis, client, entreprise, onClose, isDark, couleur }) {
  const tvaRate = devis?.tva_rate || devis?.tvaRate || 10;

  const [form, setForm] = useState({
    type: 'simplifiee',
    tauxTva: tvaRate,
    qualiteClient: 'Propriétaire occupant',
    adresseTravaux: client?.adresse || '',
    natureImmeuble: 'Maison individuelle',
    dateConstruction: '',
    affectation: 'Habitation',
    travauxTypes: TRAVAUX_TYPES.map(t => ({ ...t, checked: false })),
    descriptionTravaux: devis?.objet || '',
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleTravaux = (index) => {
    setForm(prev => ({
      ...prev,
      travauxTypes: prev.travauxTypes.map((t, i) => i === index ? { ...t, checked: !t.checked } : t),
    }));
  };

  const hasGrosOeuvre = useMemo(() => {
    return form.travauxTypes.some(t => t.checked && (t.category === 'gros_oeuvre' || t.category === 'clos_couvert'));
  }, [form.travauxTypes]);

  const handleGenerate = () => {
    printAttestationTva({
      client,
      entreprise,
      devis,
      attestationData: form,
    });
  };

  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl ${cardBg} my-4 max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: isDark ? '#334155' : '#e2e8f0', background: isDark ? '#1e293b' : 'white' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20`, color: couleur }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Attestation TVA réduite</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>CERFA 13948*05 — TVA {form.tauxTva}%</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <X size={20} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : ''}`}>Type d'attestation</label>
            <div className="flex gap-3">
              {[
                { key: 'simplifiee', label: 'Simplifiée', desc: 'Travaux de second œuvre' },
                { key: 'normale', label: 'Normale', desc: 'Travaux de gros œuvre / structure' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => update('type', opt.key)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all ${form.type === opt.key
                    ? 'border-2 shadow-sm' : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  style={form.type === opt.key ? { borderColor: couleur, background: `${couleur}08` } : {}}
                >
                  <p className={`font-medium text-sm ${isDark ? 'text-slate-100' : ''}`}>{opt.label}</p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
            {hasGrosOeuvre && form.type === 'simplifiee' && (
              <p className="text-xs text-amber-600 mt-2">⚠️ Vous avez coché des travaux de gros œuvre — l'attestation normale peut être requise.</p>
            )}
          </div>

          {/* TVA Rate */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : ''}`}>Taux de TVA</label>
            <div className="flex gap-3">
              {[
                { rate: 5.5, label: '5,5%', desc: 'Travaux de rénovation énergétique' },
                { rate: 10, label: '10%', desc: 'Travaux d\'amélioration / transformation' },
              ].map(opt => (
                <button
                  key={opt.rate}
                  onClick={() => update('tauxTva', opt.rate)}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all ${form.tauxTva === opt.rate
                    ? 'border-2 shadow-sm' : isDark ? 'border-slate-600' : 'border-slate-200'
                  }`}
                  style={form.tauxTva === opt.rate ? { borderColor: couleur, background: `${couleur}08` } : {}}
                >
                  <p className={`font-bold text-sm ${isDark ? 'text-slate-100' : ''}`}>{opt.label}</p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Client info */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : ''}`}>Informations du client</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select className={`w-full px-3 py-2.5 border rounded-xl text-sm ${inputBg}`} value={form.qualiteClient} onChange={e => update('qualiteClient', e.target.value)}>
                {QUALITE_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <input className={`w-full px-3 py-2.5 border rounded-xl text-sm ${inputBg}`} value={form.adresseTravaux} onChange={e => update('adresseTravaux', e.target.value)} placeholder="Adresse des travaux" />
            </div>
          </div>

          {/* Immeuble */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : ''}`}>Nature de l'immeuble</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select className={`w-full px-3 py-2.5 border rounded-xl text-sm ${inputBg}`} value={form.natureImmeuble} onChange={e => update('natureImmeuble', e.target.value)}>
                {NATURE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select className={`w-full px-3 py-2.5 border rounded-xl text-sm ${inputBg}`} value={form.affectation} onChange={e => update('affectation', e.target.value)}>
                {AFFECTATION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input type="text" className={`w-full px-3 py-2.5 border rounded-xl text-sm ${inputBg}`} value={form.dateConstruction} onChange={e => update('dateConstruction', e.target.value)} placeholder="Année construction" />
            </div>
          </div>

          {/* Nature des travaux */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : ''}`}>Nature des travaux</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {form.travauxTypes.map((t, i) => (
                <label key={i} className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${t.checked ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50') : ''} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={t.checked} onChange={() => toggleTravaux(i)} className="rounded border-slate-300" />
                  <span className={`text-sm ${isDark ? 'text-slate-200' : ''}`}>{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : ''}`}>Description complémentaire</label>
            <textarea className={`w-full px-3 py-2.5 border rounded-xl text-sm ${inputBg}`} rows={2} value={form.descriptionTravaux} onChange={e => update('descriptionTravaux', e.target.value)} placeholder="Description des travaux..." />
          </div>
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 px-6 py-4 border-t flex gap-3 justify-end ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <button onClick={onClose} className={`px-4 py-2.5 rounded-xl text-sm min-h-[44px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
            Annuler
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-2.5 text-white rounded-xl text-sm min-h-[44px] hover:shadow-lg transition-all flex items-center gap-2"
            style={{ background: couleur }}
          >
            <Printer size={16} />Générer l'attestation
          </button>
        </div>
      </div>
    </div>
  );
}
