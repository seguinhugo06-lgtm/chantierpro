/**
 * EntrepriseFormModal.jsx — Create/Edit entreprise form modal
 *
 * Multi-tab form: Identité, Légal, Assurances, Banque, Documents
 */

import React, { useState, useCallback, memo } from 'react';
import { X, Building2, FileText, Shield, CreditCard, Settings } from 'lucide-react';

const TABS = [
  { key: 'identite', label: 'Identité', icon: Building2 },
  { key: 'legal', label: 'Légal', icon: FileText },
  { key: 'assurances', label: 'Assurances', icon: Shield },
  { key: 'banque', label: 'Banque', icon: CreditCard },
  { key: 'documents', label: 'Documents', icon: Settings },
];

const COULEURS_PRESET = [
  '#f97316', '#ef4444', '#3b82f6', '#10b981',
  '#8b5cf6', '#ec4899', '#06b6d4', '#eab308',
];

/**
 * Format SIRET with spaces: 12345678901234 → 123 456 789 01234
 */
function formatSiret(val) {
  const clean = (val || '').replace(/\D/g, '');
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return clean.slice(0, 3) + ' ' + clean.slice(3);
  if (clean.length <= 9) return clean.slice(0, 3) + ' ' + clean.slice(3, 6) + ' ' + clean.slice(6);
  return clean.slice(0, 3) + ' ' + clean.slice(3, 6) + ' ' + clean.slice(6, 9) + ' ' + clean.slice(9, 14);
}

const EntrepriseFormModal = memo(function EntrepriseFormModal({
  entreprise = null, // null = create, object = edit
  onSave,
  onClose,
  isDark = false,
  couleur = '#f97316',
  isProcessing = false,
}) {
  const isEdit = !!entreprise;

  const [tab, setTab] = useState('identite');
  const [form, setForm] = useState({
    nom: entreprise?.nom || '',
    nomCourt: entreprise?.nomCourt || '',
    couleur: entreprise?.couleur || '#f97316',
    logo: entreprise?.logo || '',
    slogan: entreprise?.slogan || '',
    // Coordonnées
    adresse: entreprise?.adresse || '',
    codePostal: entreprise?.codePostal || '',
    ville: entreprise?.ville || '',
    tel: entreprise?.tel || '',
    email: entreprise?.email || '',
    siteWeb: entreprise?.siteWeb || '',
    // Légal
    formeJuridique: entreprise?.formeJuridique || '',
    capital: entreprise?.capital || '',
    siret: entreprise?.siret || '',
    codeApe: entreprise?.codeApe || '',
    rcs: entreprise?.rcs || '',
    rcsVille: entreprise?.rcsVille || '',
    tvaIntra: entreprise?.tvaIntra || '',
    // Assurances
    assuranceDecennaleNumero: entreprise?.assuranceDecennaleNumero || '',
    assuranceDecennaleCompagnie: entreprise?.assuranceDecennaleCompagnie || '',
    assuranceDecennaleValidite: entreprise?.assuranceDecennaleValidite || '',
    assuranceRcProNumero: entreprise?.assuranceRcProNumero || '',
    assuranceRcProCompagnie: entreprise?.assuranceRcProCompagnie || '',
    assuranceRcProValidite: entreprise?.assuranceRcProValidite || '',
    // Banque
    iban: entreprise?.iban || '',
    bic: entreprise?.bic || '',
    banqueNom: entreprise?.banqueNom || '',
    // Documents
    prefixeDevis: entreprise?.prefixeDevis || 'DEV',
    prefixeFacture: entreprise?.prefixeFacture || 'FAC',
    prefixeAvoir: entreprise?.prefixeAvoir || 'AVC',
    tvaDefaut: entreprise?.tvaDefaut ?? 10,
    validiteDevis: entreprise?.validiteDevis ?? 30,
    delaiPaiement: entreprise?.delaiPaiement ?? 30,
    acompteDefaut: entreprise?.acompteDefaut ?? 30,
    tauxFraisStructure: entreprise?.tauxFraisStructure ?? 15,
    cgv: entreprise?.cgv || '',
    mentionDevis: entreprise?.mentionDevis || '',
    mentionFacture: entreprise?.mentionFacture || '',
  });

  const updateField = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    onSave(form);
  };

  const tc = {
    card: isDark ? 'bg-slate-800' : 'bg-white',
    input: isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300 text-gray-900',
    text: isDark ? 'text-white' : 'text-gray-900',
    textMuted: isDark ? 'text-slate-400' : 'text-gray-500',
    label: isDark ? 'text-slate-300' : 'text-gray-700',
    border: isDark ? 'border-slate-700' : 'border-gray-200',
  };

  const inputCls = `w-full px-3 py-2 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${tc.input}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col ${tc.card}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${tc.border}`}>
          <h2 className={`text-lg font-semibold ${tc.text}`}>
            {isEdit ? `Modifier ${entreprise.nom}` : 'Nouvelle entreprise'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 px-6 pt-4 overflow-x-auto scrollbar-none`}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                whitespace-nowrap transition-colors flex-shrink-0
                ${tab === t.key
                  ? 'text-white'
                  : isDark
                    ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
              style={tab === t.key ? { background: couleur } : undefined}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {tab === 'identite' && (
            <>
              {/* Nom */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={e => updateField('nom', e.target.value)}
                  className={inputCls}
                  placeholder="Ex: Martin Renovation SARL"
                  required
                  style={{ '--tw-ring-color': couleur }}
                />
              </div>

              {/* Nom court */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                  Nom court
                </label>
                <input
                  type="text"
                  value={form.nomCourt}
                  onChange={e => updateField('nomCourt', e.target.value)}
                  className={inputCls}
                  placeholder="Ex: Martin Renov"
                />
              </div>

              {/* Couleur */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${tc.label}`}>
                  Couleur
                </label>
                <div className="flex items-center gap-2">
                  {COULEURS_PRESET.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateField('couleur', c)}
                      className={`w-8 h-8 rounded-lg transition-transform ${form.couleur === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                      style={{ background: c, '--tw-ring-color': c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.couleur}
                    onChange={e => updateField('couleur', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    title="Couleur personnalisée"
                  />
                </div>
              </div>

              {/* Slogan */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                  Slogan
                </label>
                <input
                  type="text"
                  value={form.slogan}
                  onChange={e => updateField('slogan', e.target.value)}
                  className={inputCls}
                  placeholder="Qualité et confiance depuis 2010"
                />
              </div>

              {/* Address row */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                  Adresse
                </label>
                <input
                  type="text"
                  value={form.adresse}
                  onChange={e => updateField('adresse', e.target.value)}
                  className={inputCls}
                  placeholder="12 rue des Artisans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={form.codePostal}
                    onChange={e => updateField('codePostal', e.target.value)}
                    className={inputCls}
                    placeholder="75001"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Ville
                  </label>
                  <input
                    type="text"
                    value={form.ville}
                    onChange={e => updateField('ville', e.target.value)}
                    className={inputCls}
                    placeholder="Paris"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={form.tel}
                    onChange={e => updateField('tel', e.target.value)}
                    className={inputCls}
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => updateField('email', e.target.value)}
                    className={inputCls}
                    placeholder="contact@martin-renov.fr"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                  Site web
                </label>
                <input
                  type="url"
                  value={form.siteWeb}
                  onChange={e => updateField('siteWeb', e.target.value)}
                  className={inputCls}
                  placeholder="https://martin-renov.fr"
                />
              </div>
            </>
          )}

          {tab === 'legal' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Forme juridique
                  </label>
                  <select
                    value={form.formeJuridique}
                    onChange={e => updateField('formeJuridique', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Auto-entrepreneur">Auto-entrepreneur</option>
                    <option value="EI">EI</option>
                    <option value="EIRL">EIRL</option>
                    <option value="EURL">EURL</option>
                    <option value="SARL">SARL</option>
                    <option value="SAS">SAS</option>
                    <option value="SASU">SASU</option>
                    <option value="SA">SA</option>
                    <option value="SCI">SCI</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Capital
                  </label>
                  <input
                    type="text"
                    value={form.capital}
                    onChange={e => updateField('capital', e.target.value)}
                    className={inputCls}
                    placeholder="10 000 €"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                  SIRET
                </label>
                <input
                  type="text"
                  value={formatSiret(form.siret)}
                  onChange={e => updateField('siret', e.target.value.replace(/\D/g, '').slice(0, 14))}
                  className={inputCls}
                  placeholder="123 456 789 01234"
                  maxLength={17}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Code APE
                  </label>
                  <input
                    type="text"
                    value={form.codeApe}
                    onChange={e => updateField('codeApe', e.target.value)}
                    className={inputCls}
                    placeholder="4399C"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    N° TVA intracommunautaire
                  </label>
                  <input
                    type="text"
                    value={form.tvaIntra}
                    onChange={e => updateField('tvaIntra', e.target.value)}
                    className={inputCls}
                    placeholder="FR12345678901"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    RCS
                  </label>
                  <input
                    type="text"
                    value={form.rcs}
                    onChange={e => updateField('rcs', e.target.value)}
                    className={inputCls}
                    placeholder="123 456 789"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Ville RCS
                  </label>
                  <input
                    type="text"
                    value={form.rcsVille}
                    onChange={e => updateField('rcsVille', e.target.value)}
                    className={inputCls}
                    placeholder="Paris"
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'assurances' && (
            <>
              {/* Décennale */}
              <h3 className={`text-sm font-semibold ${tc.text}`}>Assurance décennale</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    N° de police
                  </label>
                  <input
                    type="text"
                    value={form.assuranceDecennaleNumero}
                    onChange={e => updateField('assuranceDecennaleNumero', e.target.value)}
                    className={inputCls}
                    placeholder="DEC-2024-001234"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Compagnie
                  </label>
                  <input
                    type="text"
                    value={form.assuranceDecennaleCompagnie}
                    onChange={e => updateField('assuranceDecennaleCompagnie', e.target.value)}
                    className={inputCls}
                    placeholder="SMABTP"
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                  Date de validité
                </label>
                <input
                  type="date"
                  value={form.assuranceDecennaleValidite}
                  onChange={e => updateField('assuranceDecennaleValidite', e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* RC Pro */}
              <h3 className={`text-sm font-semibold mt-4 ${tc.text}`}>RC Professionnelle</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    N° de police
                  </label>
                  <input
                    type="text"
                    value={form.assuranceRcProNumero}
                    onChange={e => updateField('assuranceRcProNumero', e.target.value)}
                    className={inputCls}
                    placeholder="RCP-2024-005678"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Compagnie
                  </label>
                  <input
                    type="text"
                    value={form.assuranceRcProCompagnie}
                    onChange={e => updateField('assuranceRcProCompagnie', e.target.value)}
                    className={inputCls}
                    placeholder="AXA"
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                  Date de validité
                </label>
                <input
                  type="date"
                  value={form.assuranceRcProValidite}
                  onChange={e => updateField('assuranceRcProValidite', e.target.value)}
                  className={inputCls}
                />
              </div>
            </>
          )}

          {tab === 'banque' && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                  IBAN
                </label>
                <input
                  type="text"
                  value={form.iban}
                  onChange={e => updateField('iban', e.target.value)}
                  className={inputCls}
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    BIC
                  </label>
                  <input
                    type="text"
                    value={form.bic}
                    onChange={e => updateField('bic', e.target.value)}
                    className={inputCls}
                    placeholder="BNPAFRPP"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Nom de la banque
                  </label>
                  <input
                    type="text"
                    value={form.banqueNom}
                    onChange={e => updateField('banqueNom', e.target.value)}
                    className={inputCls}
                    placeholder="BNP Paribas"
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'documents' && (
            <>
              {/* Préfixes */}
              <h3 className={`text-sm font-semibold ${tc.text}`}>Numérotation</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Préfixe devis
                  </label>
                  <input
                    type="text"
                    value={form.prefixeDevis}
                    onChange={e => updateField('prefixeDevis', e.target.value.toUpperCase())}
                    className={inputCls}
                    placeholder="DEV"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Préfixe facture
                  </label>
                  <input
                    type="text"
                    value={form.prefixeFacture}
                    onChange={e => updateField('prefixeFacture', e.target.value.toUpperCase())}
                    className={inputCls}
                    placeholder="FAC"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Préfixe avoir
                  </label>
                  <input
                    type="text"
                    value={form.prefixeAvoir}
                    onChange={e => updateField('prefixeAvoir', e.target.value.toUpperCase())}
                    className={inputCls}
                    placeholder="AVC"
                    maxLength={5}
                  />
                </div>
              </div>

              {/* Paramètres métier */}
              <h3 className={`text-sm font-semibold mt-4 ${tc.text}`}>Paramètres par défaut</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    TVA par défaut (%)
                  </label>
                  <input
                    type="number"
                    value={form.tvaDefaut}
                    onChange={e => updateField('tvaDefaut', parseFloat(e.target.value) || 0)}
                    className={inputCls}
                    step="0.5"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Validité devis (jours)
                  </label>
                  <input
                    type="number"
                    value={form.validiteDevis}
                    onChange={e => updateField('validiteDevis', parseInt(e.target.value) || 30)}
                    className={inputCls}
                    min="1"
                    max="365"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Délai paiement (jours)
                  </label>
                  <input
                    type="number"
                    value={form.delaiPaiement}
                    onChange={e => updateField('delaiPaiement', parseInt(e.target.value) || 30)}
                    className={inputCls}
                    min="0"
                    max="365"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Acompte par défaut (%)
                  </label>
                  <input
                    type="number"
                    value={form.acompteDefaut}
                    onChange={e => updateField('acompteDefaut', parseInt(e.target.value) || 0)}
                    className={inputCls}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                  Taux frais de structure (%)
                </label>
                <input
                  type="number"
                  value={form.tauxFraisStructure}
                  onChange={e => updateField('tauxFraisStructure', parseFloat(e.target.value) || 0)}
                  className={inputCls}
                  step="0.5"
                  min="0"
                  max="100"
                />
              </div>

              {/* CGV */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                  Conditions générales de vente
                </label>
                <textarea
                  value={form.cgv}
                  onChange={e => updateField('cgv', e.target.value)}
                  className={`${inputCls} min-h-[100px]`}
                  placeholder="Conditions générales..."
                  rows={4}
                />
              </div>

              {/* Mentions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Mention devis
                  </label>
                  <textarea
                    value={form.mentionDevis}
                    onChange={e => updateField('mentionDevis', e.target.value)}
                    className={inputCls}
                    placeholder="Mention libre sur les devis"
                    rows={3}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${tc.label}`}>
                    Mention facture
                  </label>
                  <textarea
                    value={form.mentionFacture}
                    onChange={e => updateField('mentionFacture', e.target.value)}
                    className={inputCls}
                    placeholder="Mention libre sur les factures"
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${tc.border}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.nom.trim() || isProcessing}
            className="px-6 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: couleur }}
          >
            {isProcessing ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default EntrepriseFormModal;
