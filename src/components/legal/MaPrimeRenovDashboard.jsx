/**
 * MaPrimeRénov' Dashboard
 * Tracking and management of all MaPrimeRénov' applications
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { calculateTotalAide } from '../../lib/compliance/renovation-compliance';
import MaPrimeRenovAssistant, { STATUS_COLORS, CategoryBadge } from './MaPrimeRenovAssistant';

// ============ DEMO DATA ============

const DEMO_DOSSIERS = [
  {
    id: 'demo-1',
    client_nom: 'Martin Dupont',
    client_email: 'martin.dupont@email.fr',
    status: 'accepte',
    montant_aide_estime: 4500,
    montant_aide_accorde: 4200,
    categorie_revenus: 'modeste',
    travaux: 'Isolation combles + PAC air/eau',
    numero_dossier: 'MPR-2024-123456',
    date_depot: '2024-01-10',
    date_decision: '2024-01-28',
    notes: 'Dossier traité rapidement. Client satisfait.',
    created_at: '2024-01-05'
  },
  {
    id: 'demo-2',
    client_nom: 'Sophie Bernard',
    client_email: 'sophie.bernard@email.fr',
    status: 'en_instruction',
    montant_aide_estime: 8000,
    montant_aide_accorde: null,
    categorie_revenus: 'tres_modeste',
    travaux: 'PAC géothermique + Isolation murs',
    numero_dossier: 'MPR-2024-234567',
    date_depot: '2024-01-20',
    date_decision: null,
    notes: '',
    created_at: '2024-01-15'
  },
  {
    id: 'demo-3',
    client_nom: 'Pierre Leroy',
    client_email: 'pierre.leroy@email.fr',
    status: 'depose',
    montant_aide_estime: 2500,
    montant_aide_accorde: null,
    categorie_revenus: 'intermediaire',
    travaux: 'VMC double flux',
    numero_dossier: null,
    date_depot: '2024-01-25',
    date_decision: null,
    notes: 'En attente de validation client pour dépôt.',
    created_at: '2024-01-22'
  },
  {
    id: 'demo-4',
    client_nom: 'Marie Durand',
    client_email: 'marie.durand@email.fr',
    status: 'en_preparation',
    montant_aide_estime: 5500,
    montant_aide_accorde: null,
    categorie_revenus: 'modeste',
    travaux: 'Isolation combles perdus',
    numero_dossier: null,
    date_depot: null,
    date_decision: null,
    notes: '',
    created_at: '2024-01-26'
  },
  {
    id: 'demo-5',
    client_nom: 'Jean-Paul Martin',
    client_email: 'jp.martin@email.fr',
    status: 'refuse',
    montant_aide_estime: 3000,
    montant_aide_accorde: 0,
    categorie_revenus: 'superieur',
    travaux: 'Fenêtres double vitrage',
    numero_dossier: 'MPR-2024-345678',
    date_depot: '2024-01-08',
    date_decision: '2024-01-22',
    notes: 'Refus: revenus au-dessus des plafonds pour ce type de travaux.',
    created_at: '2024-01-02'
  }
];

// ============ HELPER COMPONENTS ============

/**
 * Status badge component
 */
function StatusBadge({ status, isDark }) {
  const config = STATUS_COLORS[status] || STATUS_COLORS.en_preparation;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

/**
 * Statistics card
 */
function StatCard({ icon, label, value, subvalue, color, isDark }) {
  return (
    <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
          {icon}
        </div>
        <div>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {label}
          </p>
          {subvalue && (
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {subvalue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Dossier row component
 */
function DossierRow({ dossier, isDark, onView, onAction }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const daysInStatus = useMemo(() => {
    const startDate = dossier.date_depot || dossier.created_at;
    if (!startDate) return 0;
    return Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24));
  }, [dossier]);

  return (
    <tr className={`border-b ${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
      <td className="px-4 py-3">
        <div>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {dossier.client_nom}
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {dossier.client_email}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={dossier.status} isDark={isDark} />
        {dossier.status === 'en_instruction' && daysInStatus > 21 && (
          <p className="text-xs text-yellow-600 mt-1">⚠️ {daysInStatus} jours</p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {dossier.travaux}
        </p>
      </td>
      <td className="px-4 py-3 text-right">
        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {formatCurrency(dossier.montant_aide_estime)}
        </p>
        {dossier.montant_aide_accorde !== null && dossier.montant_aide_accorde !== dossier.montant_aide_estime && (
          <p className={`text-xs ${dossier.montant_aide_accorde > 0 ? 'text-green-600' : 'text-red-600'}`}>
            Accordé: {formatCurrency(dossier.montant_aide_accorde)}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {formatDate(dossier.date_depot || dossier.created_at)}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => onView(dossier)}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
            title="Voir détails"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          {(dossier.status === 'en_preparation' || dossier.status === 'depose') && (
            <button
              onClick={() => onAction(dossier, 'relancer')}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-600 text-blue-400' : 'hover:bg-blue-50 text-blue-600'}`}
              title="Relancer client"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Dossier detail modal
 */
function DossierDetailModal({ dossier, isDark, onClose, onUpdateStatus }) {
  const [notes, setNotes] = useState(dossier.notes || '');
  const [numeroDossier, setNumeroDossier] = useState(dossier.numero_dossier || '');
  const [saving, setSaving] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    onClose();
  };

  const statusActions = {
    en_preparation: [{ status: 'depose', label: 'Marquer comme déposé' }],
    depose: [{ status: 'en_instruction', label: 'Marquer en instruction' }],
    en_instruction: [
      { status: 'accepte', label: 'Marquer accepté', color: 'bg-green-500' },
      { status: 'refuse', label: 'Marquer refusé', color: 'bg-red-500' }
    ],
    accepte: [],
    refuse: []
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-2xl rounded-xl shadow-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between sticky top-0 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Dossier {dossier.client_nom}
            </h2>
            <StatusBadge status={dossier.status} isDark={isDark} />
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Client info */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Informations client
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Nom</p>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{dossier.client_nom}</p>
              </div>
              <div>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Email</p>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{dossier.client_email}</p>
              </div>
              <div>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Catégorie revenus</p>
                <CategoryBadge category={dossier.categorie_revenus} isDark={isDark} />
              </div>
              <div>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Travaux</p>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{dossier.travaux}</p>
              </div>
            </div>
          </div>

          {/* Financial info */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Aide MaPrimeRénov'
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-600' : 'bg-white'} border ${isDark ? 'border-gray-500' : 'border-gray-200'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Montant estimé</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(dossier.montant_aide_estime)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-600' : 'bg-white'} border ${isDark ? 'border-gray-500' : 'border-gray-200'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Montant accordé</p>
                <p className={`text-xl font-bold ${
                  dossier.montant_aide_accorde > 0
                    ? 'text-green-600 dark:text-green-400'
                    : dossier.montant_aide_accorde === 0
                      ? 'text-red-600 dark:text-red-400'
                      : isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {dossier.montant_aide_accorde !== null ? formatCurrency(dossier.montant_aide_accorde) : 'En attente'}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              Chronologie
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Création dossier</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(dossier.created_at)}</p>
                </div>
              </div>
              {dossier.date_depot && (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Dépôt ANAH</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(dossier.date_depot)}</p>
                  </div>
                </div>
              )}
              {dossier.date_decision && (
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${dossier.status === 'accepte' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Décision: {dossier.status === 'accepte' ? 'Accepté' : 'Refusé'}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(dossier.date_decision)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Numéro dossier ANAH */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Numéro de dossier ANAH
            </label>
            <input
              type="text"
              value={numeroDossier}
              onChange={(e) => setNumeroDossier(e.target.value)}
              placeholder="MPR-2024-XXXXXX"
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ajouter des notes sur ce dossier..."
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* Status actions */}
          {statusActions[dossier.status]?.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Actions
              </label>
              <div className="flex flex-wrap gap-2">
                {statusActions[dossier.status].map(action => (
                  <button
                    key={action.status}
                    onClick={() => onUpdateStatus(dossier.id, action.status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                      action.color || 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-3`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium ${
              isDark
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Fermer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

/**
 * MaPrimeRénov' Dashboard
 * @param {Object} props
 * @param {boolean} props.isDark - Dark mode
 * @param {boolean} [props.isDemo] - Demo mode
 * @param {Function} [props.onCreateNew] - Callback to create new dossier
 */
export default function MaPrimeRenovDashboard({
  isDark = false,
  isDemo = true,
  onCreateNew
}) {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(!isDemo);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [showAssistant, setShowAssistant] = useState(false);

  // Load dossiers
  useEffect(() => {
    if (isDemo) {
      setDossiers(DEMO_DOSSIERS);
      return;
    }

    const loadDossiers = async () => {
      try {
        const { data } = await supabase
          .from('maprimerenov_dossiers')
          .select('*')
          .order('created_at', { ascending: false });

        if (data) {
          setDossiers(data);
        }
      } catch (err) {
        console.error('Error loading dossiers:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDossiers();
  }, [isDemo]);

  // Statistics
  const stats = useMemo(() => {
    const total = dossiers.length;
    const enCours = dossiers.filter(d => ['en_preparation', 'depose', 'en_instruction'].includes(d.status)).length;
    const acceptes = dossiers.filter(d => d.status === 'accepte').length;
    const totalAideEstimee = dossiers.reduce((sum, d) => sum + (d.montant_aide_estime || 0), 0);
    const totalAideAccordee = dossiers.filter(d => d.montant_aide_accorde).reduce((sum, d) => sum + (d.montant_aide_accorde || 0), 0);

    return { total, enCours, acceptes, totalAideEstimee, totalAideAccordee };
  }, [dossiers]);

  // Filtered dossiers
  const filteredDossiers = useMemo(() => {
    let result = dossiers;

    if (filter !== 'all') {
      result = result.filter(d => d.status === filter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(d =>
        d.client_nom?.toLowerCase().includes(searchLower) ||
        d.client_email?.toLowerCase().includes(searchLower) ||
        d.travaux?.toLowerCase().includes(searchLower) ||
        d.numero_dossier?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [dossiers, filter, search]);

  const handleUpdateStatus = useCallback((dossierId, newStatus) => {
    setDossiers(prev =>
      prev.map(d =>
        d.id === dossierId
          ? {
              ...d,
              status: newStatus,
              date_depot: newStatus === 'depose' ? new Date().toISOString() : d.date_depot,
              date_decision: ['accepte', 'refuse'].includes(newStatus) ? new Date().toISOString() : d.date_decision
            }
          : d
      )
    );
    setSelectedDossier(null);
  }, []);

  const handleAction = useCallback((dossier, action) => {
    if (action === 'relancer') {
      // Simulate email
      alert(`Email de relance envoyé à ${dossier.client_email}`);
    }
  }, []);

  const handleAssistantComplete = useCallback((data) => {
    setShowAssistant(false);
    // Add new dossier
    const newDossier = {
      id: `new-${Date.now()}`,
      client_nom: `${data.client?.prenom || ''} ${data.client?.nom || ''}`.trim(),
      client_email: data.client?.email,
      status: 'en_preparation',
      montant_aide_estime: calculateTotalAide(
        (data.travaux || []).map(t => ({ travailId: t.id, quantite: t.quantite })),
        data.categorieRevenus?.id || 'intermediaire'
      ).totalAide,
      montant_aide_accorde: null,
      categorie_revenus: data.categorieRevenus?.id,
      travaux: (data.travaux || []).map(t => t.id).join(', '),
      numero_dossier: null,
      date_depot: null,
      date_decision: null,
      notes: '',
      created_at: new Date().toISOString()
    };
    setDossiers(prev => [newDossier, ...prev]);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-12 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        <svg className="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Chargement...
      </div>
    );
  }

  if (showAssistant) {
    return (
      <MaPrimeRenovAssistant
        isDark={isDark}
        isDemo={isDemo}
        onComplete={handleAssistantComplete}
        onCancel={() => setShowAssistant(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🏡 MaPrimeRénov'
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Suivi des dossiers d'aide à la rénovation énergétique
          </p>
        </div>
        <button
          onClick={() => setShowAssistant(true)}
          className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau dossier
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="📁"
          label="Dossiers totaux"
          value={stats.total}
          color="bg-blue-100 dark:bg-blue-900/30"
          isDark={isDark}
        />
        <StatCard
          icon="⏳"
          label="En cours"
          value={stats.enCours}
          color="bg-yellow-100 dark:bg-yellow-900/30"
          isDark={isDark}
        />
        <StatCard
          icon="✅"
          label="Acceptés"
          value={stats.acceptes}
          subvalue={`${stats.total > 0 ? Math.round((stats.acceptes / stats.total) * 100) : 0}% de réussite`}
          color="bg-green-100 dark:bg-green-900/30"
          isDark={isDark}
        />
        <StatCard
          icon="💰"
          label="Aides obtenues"
          value={formatCurrency(stats.totalAideAccordee)}
          subvalue={`sur ${formatCurrency(stats.totalAideEstimee)} estimées`}
          color="bg-emerald-100 dark:bg-emerald-900/30"
          isDark={isDark}
        />
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className={`absolute left-3 top-2.5 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par client, email, travaux..."
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Tous' },
              { value: 'en_preparation', label: 'Préparation' },
              { value: 'depose', label: 'Déposés' },
              { value: 'en_instruction', label: 'Instruction' },
              { value: 'accepte', label: 'Acceptés' },
              { value: 'refuse', label: 'Refusés' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === opt.value
                    ? 'bg-emerald-500 text-white'
                    : isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Client
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Statut
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Travaux
                </th>
                <th className={`px-4 py-3 text-right text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Aide estimée
                </th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Date
                </th>
                <th className={`px-4 py-3 text-right text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDossiers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="text-4xl mb-4">📭</div>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      {search || filter !== 'all' ? 'Aucun dossier trouvé' : 'Aucun dossier MaPrimeRénov\''}
                    </p>
                    {!search && filter === 'all' && (
                      <button
                        onClick={() => setShowAssistant(true)}
                        className="mt-4 px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                      >
                        Créer le premier dossier
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDossiers.map(dossier => (
                  <DossierRow
                    key={dossier.id}
                    dossier={dossier}
                    isDark={isDark}
                    onView={setSelectedDossier}
                    onAction={handleAction}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts section */}
      {dossiers.some(d => d.status === 'en_instruction' && ((new Date() - new Date(d.date_depot)) / (1000 * 60 * 60 * 24)) > 21) && (
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-medium text-yellow-700 dark:text-yellow-400">
                Dossiers en attente prolongée
              </p>
              <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-600'}`}>
                Certains dossiers sont en instruction depuis plus de 3 semaines. Pensez à relancer les clients ou contacter l'ANAH.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedDossier && (
        <DossierDetailModal
          dossier={selectedDossier}
          isDark={isDark}
          onClose={() => setSelectedDossier(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
}

// ============ NAMED EXPORTS ============

export { StatusBadge, StatCard, DossierRow, DossierDetailModal };
