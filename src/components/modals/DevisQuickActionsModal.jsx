import * as React from 'react';

import {
  Mail,
  CheckCircle,
  Receipt,
  Copy,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  User,
  Euro,
  Clock,
  FileText,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDevis, useClients } from '../../context/DataContext';
import { useToast } from '../../context/AppContext';
import { DEVIS_STATUS, DEVIS_STATUS_LABELS, DEVIS_STATUS_COLORS } from '../../lib/constants';
import { generateNumero } from '../../lib/devis-utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import Modal, {
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '../ui/Modal';
import supabase, { isDemo } from '../../supabaseClient';

/**
 * @typedef {Object} DevisQuickActionsModalProps
 * @property {string} devisId - ID of the devis to display
 * @property {boolean} isOpen - Controls modal visibility
 * @property {() => void} onClose - Called when modal should close
 * @property {() => void} [onUpdate] - Called after any update action
 */

/**
 * Format currency in French
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Calculate days since a date
 */
function daysSince(dateString) {
  if (!dateString) return 0;
  const date = new Date(dateString);
  const now = new Date();
  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}

/**
 * Get status info
 */
function getStatusInfo(statut, createdAt) {
  const days = daysSince(createdAt);
  const label = DEVIS_STATUS_LABELS[statut] || statut;
  const colors = DEVIS_STATUS_COLORS[statut] || { bg: 'bg-gray-100', text: 'text-gray-600' };

  let daysLabel = '';
  if ([DEVIS_STATUS.ENVOYE, DEVIS_STATUS.VU].includes(statut) && days > 0) {
    daysLabel = ` (${days} jour${days > 1 ? 's' : ''})`;
  }

  return { label, daysLabel, colors };
}

/**
 * ActionButton - Full-width action button with icon
 */
function ActionButton({
  icon: Icon,
  label,
  onClick,
  loading,
  disabled,
  variant = 'outline',
  danger = false,
}) {
  return (
    <Button
      variant={danger ? 'danger' : variant}
      className="w-full justify-start"
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? (
        <RefreshCw className="w-4 h-4 mr-3 animate-spin" />
      ) : (
        <Icon className="w-4 h-4 mr-3" />
      )}
      {label}
    </Button>
  );
}

/**
 * DeleteConfirmModal - Confirmation modal for deletion
 */
function DeleteConfirmModal({ isOpen, onClose, onConfirm, loading, devisNumero }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader>
        <ModalTitle>Supprimer le devis</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-gray-900 dark:text-white">
              Voulez-vous vraiment supprimer le devis <strong>{devisNumero}</strong> ?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Cette action est irréversible.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Suppression...
            </>
          ) : (
            'Supprimer'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * ConvertToFactureModal - Modal to convert devis to facture
 */
function ConvertToFactureModal({ isOpen, onClose, onConfirm, loading, devis }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader>
        <ModalTitle>Convertir en facture</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Une facture sera créée à partir du devis <strong>{devis?.numero}</strong> avec les mêmes lignes et montants.
        </p>
        <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <p className="text-sm text-gray-900 dark:text-white font-medium">
            Montant TTC : {formatCurrency(devis?.total_ttc)}
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Création...
            </>
          ) : (
            <>
              <Receipt className="w-4 h-4 mr-2" />
              Créer la facture
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * DevisQuickActionsModal - Quick actions modal for a devis
 *
 * @param {DevisQuickActionsModalProps} props
 */
export default function DevisQuickActionsModal({
  devisId,
  isOpen,
  onClose,
  onUpdate,
  setPage,
  setSelectedDevis,
}) {
  const { devis: allDevis, getDevis, updateDevis, deleteDevis, addDevis } = useDevis();
  const { getClient } = useClients();
  const { showToast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [devisData, setDevisData] = React.useState(null);
  const [clientData, setClientData] = React.useState(null);
  const [actionLoading, setActionLoading] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showConvertModal, setShowConvertModal] = React.useState(false);

  // Fetch devis data
  React.useEffect(() => {
    if (!isOpen || !devisId) return;

    setLoading(true);

    const fetchData = async () => {
      try {
        if (isDemo || !supabase) {
          // Demo mode: get from context
          const devis = getDevis(devisId);
          if (devis) {
            setDevisData(devis);
            const client = getClient(devis.client_id);
            setClientData(client);
          }
        } else {
          // Real Supabase query
          const { data, error } = await supabase
            .from('devis')
            .select(`
              *,
              client:clients(*)
            `)
            .eq('id', devisId)
            .single();

          if (error) throw error;

          setDevisData(data);
          setClientData(data.client);
        }
      } catch (err) {
        console.error('Error fetching devis:', err);
        showToast('Erreur lors du chargement du devis', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, devisId, getDevis, getClient, showToast]);

  // Action: Relancer client
  const handleRelance = async () => {
    setActionLoading('relance');

    try {
      // Simulate sending reminder
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update devis with reminder info
      const updates = {
        last_reminder_sent_at: new Date().toISOString(),
        reminder_count: (devisData.reminder_count || 0) + 1,
      };

      if (isDemo || !supabase) {
        updateDevis(devisId, updates);
      } else {
        await supabase.from('devis').update(updates).eq('id', devisId);
      }

      showToast('Relance envoyée au client', 'success');
      onUpdate?.();
    } catch (err) {
      console.error('Error sending reminder:', err);
      showToast('Erreur lors de l\'envoi de la relance', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Marquer accepté
  const handleMarkAccepted = async () => {
    setActionLoading('accept');

    try {
      const updates = {
        statut: DEVIS_STATUS.ACCEPTE,
        date_acceptation: new Date().toISOString(),
      };

      if (isDemo || !supabase) {
        updateDevis(devisId, updates);
      } else {
        await supabase.from('devis').update(updates).eq('id', devisId);
      }

      showToast('Devis marqué comme accepté', 'success');
      setDevisData(prev => ({ ...prev, ...updates }));
      onUpdate?.();

      // Propose to convert to facture
      setShowConvertModal(true);
    } catch (err) {
      console.error('Error accepting devis:', err);
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Convertir en facture
  const handleConvertToFacture = async () => {
    setActionLoading('convert');

    try {
      const newNumero = generateNumero('facture', allDevis);

      const facture = {
        ...devisData,
        id: undefined, // Let DB generate new ID
        type: 'facture',
        numero: newNumero,
        statut: DEVIS_STATUS.ENVOYE,
        devis_source_id: devisData.id,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      // Remove fields that shouldn't be copied
      delete facture.date_acceptation;
      delete facture.reminder_count;
      delete facture.last_reminder_sent_at;

      let newFactureId;

      if (isDemo || !supabase) {
        const created = addDevis(facture);
        newFactureId = created.id;
      } else {
        const { data, error } = await supabase
          .from('devis')
          .insert([facture])
          .select()
          .single();

        if (error) throw error;
        newFactureId = data.id;
      }

      showToast(`Facture ${newNumero} créée`, 'success');
      onClose();
      // Navigate to the new facture
      if (newFactureId) {
        const newFacture = { id: newFactureId, numero: newNumero };
        setSelectedDevis?.(newFacture);
        setPage?.('devis');
      }
    } catch (err) {
      console.error('Error converting to facture:', err);
      showToast('Erreur lors de la création de la facture', 'error');
    } finally {
      setActionLoading(null);
      setShowConvertModal(false);
    }
  };

  // Action: Dupliquer
  const handleDuplicate = async () => {
    setActionLoading('duplicate');

    try {
      const newNumero = generateNumero('devis', allDevis);

      const duplicated = {
        ...devisData,
        id: undefined,
        numero: newNumero,
        statut: DEVIS_STATUS.BROUILLON,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      // Remove fields that shouldn't be copied
      delete duplicated.date_acceptation;
      delete duplicated.reminder_count;
      delete duplicated.last_reminder_sent_at;
      delete duplicated.devis_source_id;

      let newDevisId;

      if (isDemo || !supabase) {
        const created = addDevis(duplicated);
        newDevisId = created.id;
      } else {
        const { data, error } = await supabase
          .from('devis')
          .insert([duplicated])
          .select()
          .single();

        if (error) throw error;
        newDevisId = data.id;
      }

      showToast(`Devis ${newNumero} créé`, 'success');
      onClose();
      // Navigate to the new devis
      if (newDevisId) {
        const newDevis = { id: newDevisId, numero: newNumero };
        setSelectedDevis?.(newDevis);
        setPage?.('devis');
      }
    } catch (err) {
      console.error('Error duplicating devis:', err);
      showToast('Erreur lors de la duplication', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Supprimer
  const handleDelete = async () => {
    setActionLoading('delete');

    try {
      if (isDemo || !supabase) {
        deleteDevis(devisId);
      } else {
        // Soft delete
        await supabase
          .from('devis')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', devisId);
      }

      showToast('Devis supprimé', 'info');
      onUpdate?.();
      onClose();
    } catch (err) {
      console.error('Error deleting devis:', err);
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setActionLoading(null);
      setShowDeleteModal(false);
    }
  };

  // View detail
  const handleViewDetail = () => {
    onClose();
    if (devisData) {
      setSelectedDevis?.(devisData);
      setPage?.('devis');
    }
  };

  if (!isOpen) return null;

  const statusInfo = devisData ? getStatusInfo(devisData.statut, devisData.createdAt || devisData.date) : null;
  const canRelance = devisData && [DEVIS_STATUS.ENVOYE, DEVIS_STATUS.VU].includes(devisData.statut);
  const canMarkAccepted = devisData && [DEVIS_STATUS.ENVOYE, DEVIS_STATUS.VU].includes(devisData.statut);
  const canConvert = devisData && devisData.statut === DEVIS_STATUS.ACCEPTE && devisData.type === 'devis';
  const isFacture = devisData?.type === 'facture';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalHeader>
          <ModalTitle>
            {isFacture ? 'Facture' : 'Devis'} {devisData?.numero || `#${devisId?.slice(-6)}`}
          </ModalTitle>
        </ModalHeader>

        <ModalBody>
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-20 bg-gray-100 dark:bg-slate-800 rounded-lg" />
            </div>
          ) : devisData ? (
            <div className="space-y-4">
              {/* Devis Info Card */}
              <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg space-y-3">
                {/* Client */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Client :</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {clientData?.nom || clientData?.entreprise || 'Client inconnu'}
                    {clientData?.prenom && ` ${clientData.prenom}`}
                  </span>
                </div>

                {/* Montant */}
                <div className="flex items-center gap-2 text-sm">
                  <Euro className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Montant :</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {formatCurrency(devisData.total_ttc)}
                  </span>
                </div>

                {/* Statut */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Statut :</span>
                  <Badge
                    variant="secondary"
                    className={cn(statusInfo?.colors.bg, statusInfo?.colors.text)}
                  >
                    {statusInfo?.label}{statusInfo?.daysLabel}
                  </Badge>
                </div>
              </div>

              {/* Lignes preview */}
              {devisData.lignes && devisData.lignes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Lignes
                  </p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {devisData.lignes.slice(0, 5).map((ligne, index) => (
                      <div
                        key={ligne.id || index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
                          • {ligne.description || ligne.designation || 'Ligne'}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium whitespace-nowrap">
                          {formatCurrency(ligne.montant || ligne.total)}
                        </span>
                      </div>
                    ))}
                    {devisData.lignes.length > 5 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        + {devisData.lignes.length - 5} autres lignes
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Actions rapides
                </p>
                <div className="space-y-2">
                  {canRelance && (
                    <ActionButton
                      icon={Mail}
                      label="Relancer client"
                      onClick={handleRelance}
                      loading={actionLoading === 'relance'}
                    />
                  )}

                  {canMarkAccepted && (
                    <ActionButton
                      icon={CheckCircle}
                      label="Marquer accepté"
                      onClick={handleMarkAccepted}
                      loading={actionLoading === 'accept'}
                    />
                  )}

                  {canConvert && (
                    <ActionButton
                      icon={Receipt}
                      label="Convertir en facture"
                      onClick={() => setShowConvertModal(true)}
                      loading={actionLoading === 'convert'}
                    />
                  )}

                  <ActionButton
                    icon={Copy}
                    label="Dupliquer"
                    onClick={handleDuplicate}
                    loading={actionLoading === 'duplicate'}
                  />

                  <ActionButton
                    icon={Trash2}
                    label="Supprimer"
                    onClick={() => setShowDeleteModal(true)}
                    danger
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Devis introuvable
            </p>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleViewDetail}>
            <FileText className="w-4 h-4 mr-2" />
            Voir détail
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        loading={actionLoading === 'delete'}
        devisNumero={devisData?.numero || `#${devisId?.slice(-6)}`}
      />

      {/* Convert to Facture Modal */}
      <ConvertToFactureModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onConfirm={handleConvertToFacture}
        loading={actionLoading === 'convert'}
        devis={devisData}
      />
    </>
  );
}
