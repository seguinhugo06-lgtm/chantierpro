import { useState, useEffect, useMemo } from 'react';
import { tauxTvaParDefaut, estFranchiseTva } from '../lib/franchiseTva';
import {
  X, ChevronRight, ChevronLeft, Check, Search, Sparkles, Users,
  ChevronDown, Zap, Plus, UserPlus
} from 'lucide-react';
import {
  SMART_TEMPLATES,
  getMetiers,
  getMissions,
  getDefaultPrice,
  formatPriceRange
} from '../lib/templates/smart-templates';
import { jourLocal } from '../lib/dates';

/**
 * Smart Template Wizard - Devis express
 * Redesigned for speed and visual appeal
 */
export default function SmartTemplateWizard({
  isOpen,
  onClose,
  onCreateDevis,
  clients = [],
  addClient,
  entreprise,
  isDark = false,
  couleur = '#f97316'
}) {
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedMetier, setSelectedMetier] = useState(null);
  const [selectedMission, setSelectedMission] = useState(null);
  const [expandedMetier, setExpandedMetier] = useState(null);
  const [prix, setPrix] = useState(0);
  // Taux de l'entreprise (0 en franchise, 0 % compris) : partait de 10 % (relecture juriste-btp du 16 oct. 2026)
  const [tva, setTva] = useState(() => tauxTvaParDefaut(entreprise));
  const [clientSearch, setClientSearch] = useState('');
  const [metierSearch, setMetierSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClient, setNewClient] = useState({ nom: '', telephone: '', email: '', adresse: '' });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedClient(null);
      setSelectedMetier(null);
      setSelectedMission(null);
      setExpandedMetier(null);
      setPrix(0);
      setTva(tauxTvaParDefaut(entreprise));
      setClientSearch('');
      setMetierSearch('');
      setShowNewClientForm(false);
      setNewClient({ nom: '', telephone: '', email: '', adresse: '' });
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedMission) {
      setPrix(getDefaultPrice(selectedMission));
    }
  }, [selectedMission]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 20);
    const search = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.nom?.toLowerCase().includes(search) ||
      c.telephone?.includes(search)
    ).slice(0, 20);
  }, [clients, clientSearch]);

  const metiers = getMetiers();
  const filteredMetiers = useMemo(() => {
    if (!metierSearch.trim()) return metiers;
    const search = metierSearch.toLowerCase();
    return metiers.filter(m => m.nom.toLowerCase().includes(search));
  }, [metiers, metierSearch]);

  const formatMoney = (n) =>
    (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setStep(2);
  };

  const handleCreateClient = async () => {
    if (!newClient.nom.trim()) return;

    const clientData = {
      nom: newClient.nom.trim(),
      telephone: newClient.telephone.trim(),
      email: newClient.email.trim(),
      adresse: newClient.adresse.trim(),
      type: 'particulier',
    };

    // addClient returns the created client with its final ID
    let createdClient = clientData;
    if (addClient) {
      createdClient = await addClient(clientData);
    }

    setSelectedClient(createdClient);
    setShowNewClientForm(false);
    setNewClient({ nom: '', telephone: '', email: '', adresse: '' });
    setStep(2);
  };

  const handleSelectMission = (metier, mission) => {
    setSelectedMetier(metier);
    setSelectedMission(mission);
    setPrix(getDefaultPrice(mission));
    setStep(3);
  };

  const handleCreateDevis = async () => {
    if (!selectedClient || !selectedMission) return;
    setIsCreating(true);

    const totalHT = prix;
    const totalTVA = totalHT * (tva / 100);
    const totalTTC = totalHT + totalTVA;
    const metierData = SMART_TEMPLATES[selectedMetier.id];

    const devisData = {
      type: 'devis',
      clientId: selectedClient.id,
      client: selectedClient,
      date: jourLocal(),
      validite: entreprise?.validiteDevis || 30,
      sections: [{
        id: `section_${Date.now()}`,
        titre: metierData.nom,
        lignes: [{
          id: `ligne_${Date.now()}`,
          description: selectedMission.nom,
          quantite: 1,
          unite: selectedMission.unite,
          prixUnitaire: prix,
          montant: prix,
          tva: tva
        }]
      }],
      tvaDefaut: tva,
      remise: 0,
      // Plus de mention « crédit d'impôt 50 % » (relecture juridique du 16 oct. 2026) : il ne vise que les petits
      // travaux de jardinage d'un prestataire déclaré services à la personne (CGI 199 sexdecies, C. trav. D7231-1),
      // pas la création ou l'aménagement d'un jardin ; l'imprimer sur le devis serait une promesse fiscale trompeuse.
      notes: '',
      total_ht: totalHT,
      total_tva: totalTVA,
      total_ttc: totalTTC,
      template: {
        metierId: selectedMetier.id,
        missionId: selectedMission.id,
        missionNom: selectedMission.nom
      }
    };

    await onCreateDevis(devisData);
    setIsCreating(false);
  };

  if (!isOpen) return null;

  const cardBg = 'bg-surface';
  const textPrimary = 'text-encre';
  const textMuted = 'text-encre-2';
  const inputBg = 'bg-surface border-bord-fort';
  const hoverBg = 'hover:bg-surface-2';

  const totalHT = prix;
  const totalTVA = totalHT * (tva / 100);
  const totalTTC = totalHT + totalTVA;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] ${cardBg} sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up`}>
        {/* Header */}
        <div className="p-4 text-white shrink-0" style={{ background: `linear-gradient(135deg, ${couleur}, #dc2626)` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Devis express</h2>
                <p className="text-sm text-white/80">
                  {step === 1 ? 'Choisir le client' : step === 2 ? 'Choisir la prestation' : 'Fixer le prix'}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="p-2.5 min-w-[44px] min-h-[44px] hover:bg-white/20 rounded-full transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-1 mt-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Client */}
          {step === 1 && (
            <div className="p-4 space-y-3">
              {!showNewClientForm ? (
                <>
                  {/* Search and New Client button */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                      <input
                        type="text"
                        placeholder="Rechercher un client..."
                        aria-label="Rechercher un client"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${inputBg} ${textPrimary}`}
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => setShowNewClientForm(true)}
                      className="px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] shrink-0 bg-accent text-sur-accent"
                    >
                      <UserPlus className="w-5 h-5" />
                      <span className="hidden sm:inline">Nouveau</span>
                    </button>
                  </div>

                  {filteredClients.length === 0 ? (
                    <div className={`text-center py-8 ${textMuted}`}>
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium mb-2">Aucun client</p>
                      <button
                        onClick={() => setShowNewClientForm(true)}
                        className="text-sm font-medium hover:underline text-accent-texte"
                      >
                        Créer votre premier client
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          className={`p-3 rounded-xl border border-bord ${hoverBg} text-left transition-all active:scale-[0.98]`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-accent text-sur-accent"
                            >
                              {client.nom?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className={`font-medium text-sm truncate ${textPrimary}`}>{client.nom}</p>
                              <p className={`text-xs truncate ${textMuted}`}>{client.telephone || 'Pas de tel'}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* New Client Form */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${textPrimary}`}>Nouveau client</h3>
                    <button
                      onClick={() => setShowNewClientForm(false)}
                      className={`p-2 rounded-lg ${hoverBg}`}
                    >
                      <X className={`w-4 h-4 ${textMuted}`} />
                    </button>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Nom *</label>
                    <input
                      type="text"
                      value={newClient.nom}
                      onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                      placeholder="Nom du client"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg} ${textPrimary}`}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Téléphone</label>
                    <input
                      type="tel"
                      value={newClient.telephone}
                      onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg} ${textPrimary}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Email</label>
                    <input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      placeholder="client@email.com"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg} ${textPrimary}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Adresse</label>
                    <input
                      type="text"
                      value={newClient.adresse}
                      onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })}
                      placeholder="Adresse du client"
                      className={`w-full px-4 py-3 rounded-xl border ${inputBg} ${textPrimary}`}
                    />
                  </div>

                  <button
                    onClick={handleCreateClient}
                    disabled={!newClient.nom.trim()}
                    className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 bg-accent text-sur-accent"
                  >
                    <Check className="w-5 h-5" />
                    Creer et continuer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Metier & Mission - Visual Grid */}
          {step === 2 && (
            <div className="p-4 space-y-4">
              <button onClick={() => setStep(1)} className={`flex items-center gap-1 text-sm ${textMuted} -ml-1`}>
                <ChevronLeft className="w-4 h-4" /> {selectedClient?.nom}
              </button>

              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  aria-label="Rechercher"
                  value={metierSearch}
                  onChange={(e) => setMetierSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${inputBg} ${textPrimary}`}
                />
              </div>

              {/* Metiers Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {filteredMetiers.map((metier) => (
                  <button
                    key={metier.id}
                    onClick={() => setExpandedMetier(expandedMetier === metier.id ? null : metier.id)}
                    className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                      expandedMetier === metier.id
                        ? 'border-current shadow-lg scale-[1.02]'
                        : 'border-bord'
                    }`}
                    style={expandedMetier === metier.id ? { borderColor: metier.color, backgroundColor: `${metier.color}10` } : {}}
                  >
                    <span className="text-2xl block mb-1">{metier.icon}</span>
                    <p className={`text-xs font-medium ${textPrimary} leading-tight`}>{metier.nom}</p>
                  </button>
                ))}
              </div>

              {/* Expanded Missions */}
              {expandedMetier && (
                <div className={`rounded-xl border-2 overflow-hidden border-bord bg-fond`}>
                  <div className="p-3 flex items-center gap-2" style={{ backgroundColor: `${SMART_TEMPLATES[expandedMetier].color}15` }}>
                    <span className="text-xl">{SMART_TEMPLATES[expandedMetier].icon}</span>
                    <span className={`font-semibold ${textPrimary}`}>{SMART_TEMPLATES[expandedMetier].nom}</span>
                  </div>
                  <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-200'}`}>
                    {getMissions(expandedMetier).map((mission) => (
                      <button
                        key={mission.id}
                        onClick={() => handleSelectMission({ id: expandedMetier, ...SMART_TEMPLATES[expandedMetier] }, mission)}
                        className={`w-full p-3 ${hoverBg} flex items-center gap-3 transition-all active:scale-[0.99] text-left`}
                      >
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${textPrimary}`}>{mission.nom}</p>
                          <p className={`text-xs font-medium mt-0.5 text-accent-texte`}>
                            {formatPriceRange(mission)}
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${textMuted}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!expandedMetier && (
                <p className={`text-center text-sm ${textMuted} py-4`}>
                  Sélectionnez un métier pour voir les prestations
                </p>
              )}
            </div>
          )}

          {/* Step 3: Price */}
          {step === 3 && selectedMission && (
            <div className="p-4 space-y-4">
              <button onClick={() => setStep(2)} className={`flex items-center gap-1 text-sm ${textMuted} -ml-1`}>
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>

              {/* Summary card */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gradient-to-r from-slate-100 to-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${selectedMetier.color}20` }}>
                    {selectedMetier.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${textPrimary} truncate`}>{selectedMission.nom}</p>
                    <p className={`text-sm ${textMuted}`}>Pour {selectedClient?.nom}</p>
                  </div>
                </div>
              </div>

              {/* Price input - BIG and editable */}
              <div className={`p-5 rounded-xl border-2 border-bord`}>
                <label className={`block text-sm font-medium ${textMuted} mb-2 text-center`}>Montant HT</label>
                <div className="relative">
                  <input
                    type="number"
                    value={prix || ''}
                    onChange={(e) => setPrix(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full text-center text-4xl font-bold py-4 rounded-xl border-0 bg-transparent ${textPrimary} focus:outline-none focus:ring-2 focus:ring-accent`}
                    placeholder="0"
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-2xl ${textMuted}`}>€</span>
                </div>

                {/* Quick price buttons */}
                <div className="flex gap-2 mt-3 justify-center flex-wrap">
                  {[selectedMission.prixMin, getDefaultPrice(selectedMission), selectedMission.prixMax].map((p, i) => (
                    <button
                      key={p}
                      onClick={() => setPrix(p)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        prix === p
                          ? 'text-white'
                          : 'bg-surface-2 text-encre-2'
                      }`}
                      style={prix === p ? { backgroundColor: couleur } : {}}
                    >
                      {i === 0 ? 'Min ' : i === 1 ? 'Moyen ' : 'Max '}{formatMoney(p)}
                    </button>
                  ))}
                </div>
              </div>

              {/* TVA : pas de choix de taux en franchise (art. 293 B du CGI) — relecture juriste-btp du 17 oct. 2026 */}
              {estFranchiseTva(entreprise) ? (
                <p className={`text-sm text-encre-2`}>TVA non applicable, art. 293 B du CGI</p>
              ) : (
              <div className="flex gap-2">
                {[
                  { value: 20, label: '20%' },
                  { value: 10, label: '10%' },
                  { value: 5.5, label: '5,5%' },
                  { value: 0, label: '0%' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTva(opt.value)}
                    className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                      tva === opt.value ? 'text-white shadow-lg' : 'bg-surface-2 text-encre-3'
                    }`}
                    style={tva === opt.value ? { backgroundColor: couleur } : {}}
                  >
                    TVA {opt.label}
                  </button>
                ))}
              </div>
              )}

              {/* Total */}
              <div className={`p-4 rounded-xl bg-surface-2`}>
                <div className="flex justify-between text-sm mb-2">
                  <span className={textMuted}>HT</span>
                  <span className={textPrimary}>{formatMoney(totalHT)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className={textMuted}>TVA {tva}%</span>
                  <span className={textPrimary}>{formatMoney(totalTVA)}</span>
                </div>
                <div className={`flex justify-between pt-2 border-t border-bord-fort`}>
                  <span className={`font-bold ${textPrimary}`}>Total TTC</span>
                  <span className="font-bold text-2xl text-accent-texte">{formatMoney(totalTTC)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 3 && (
          <div className={`p-4 border-t border-bord shrink-0`}>
            <button
              onClick={handleCreateDevis}
              disabled={isCreating || !prix}
              className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 bg-accent text-sur-accent"
            >
              {isCreating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Créer le devis
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .animate-slide-up {
          animation: slideUp 0.25s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
