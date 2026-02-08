import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Loader2,
  UserPlus,
  Wrench,
  Zap,
  Hammer,
  Paintbrush,
  Building2,
  HardHat,
  Search,
  MoreVertical,
  Eye,
  Copy,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import { supabase } from '../../supabaseClient';

/**
 * @typedef {Object} Membre
 * @property {string} nom - Member name
 * @property {string} role - Member role
 * @property {string} [telephone] - Phone number
 * @property {string} [email] - Email
 */

/**
 * @typedef {Object} Equipe
 * @property {string} id
 * @property {string} nom
 * @property {string} [specialite]
 * @property {string} [couleur]
 * @property {Membre[]} membres
 * @property {number} capacite_heures_semaine
 * @property {number} [taux_horaire]
 * @property {string} [notes]
 * @property {boolean} actif
 * @property {Object} [charge]
 * @property {number} [chantiers_count]
 */

/**
 * @typedef {Object} EquipeChantier
 * @property {string} id
 * @property {string} nom
 * @property {string} date_debut
 * @property {string} date_fin
 * @property {number} heures_estimees
 * @property {string} statut
 * @property {string} [client_nom]
 * @property {string} [client_prenom]
 */

/**
 * @typedef {Object} EquipesManagerProps
 * @property {string} userId - User ID
 * @property {(equipeId: string) => void} [onViewPlanning] - View planning callback
 * @property {string} [className]
 */

// Specialite options with icons
const SPECIALITES = [
  { value: 'plomberie', label: 'Plomberie', icon: Wrench, color: '#3b82f6' },
  { value: 'electricite', label: 'Electricite', icon: Zap, color: '#eab308' },
  { value: 'maconnerie', label: 'Maconnerie', icon: Building2, color: '#6b7280' },
  { value: 'peinture', label: 'Peinture', icon: Paintbrush, color: '#8b5cf6' },
  { value: 'menuiserie', label: 'Menuiserie', icon: Hammer, color: '#84cc16' },
  { value: 'couverture', label: 'Couverture', icon: HardHat, color: '#f97316' },
  { value: 'general', label: 'General', icon: Users, color: '#64748b' },
];

// Role options for members
const ROLES = [
  'Chef d\'equipe',
  'Ouvrier qualifie',
  'Apprenti',
  'Aide',
  'Sous-traitant',
];

// Default colors
const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

/**
 * Progress bar for capacity
 */
function CapacityBar({ percentage, overloaded }) {
  const cappedPercentage = Math.min(100, percentage);

  let colorClass = 'bg-green-500';
  if (percentage >= 100) {
    colorClass = 'bg-red-500';
  } else if (percentage >= 80) {
    colorClass = 'bg-amber-500';
  }

  return (
    <div className="relative">
      <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', colorClass)}
          style={{ width: `${cappedPercentage}%` }}
        />
      </div>
      {overloaded && (
        <div className="absolute -right-1 -top-1">
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
      )}
    </div>
  );
}

/**
 * Equipe card component
 */
function EquipeCard({
  equipe,
  chantiers,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onViewPlanning,
  isDeleting,
}) {
  const specialiteInfo = SPECIALITES.find((s) => s.value === equipe.specialite) || SPECIALITES[6];
  const IconComponent = specialiteInfo.icon;
  const membresCount = equipe.membres?.length || 0;
  const charge = equipe.charge || { percentage: 0, total_hours: 0, capacite: 40 };

  const formatDateRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : startDate;
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    if (startDate.toDateString() === endDate.toDateString()) {
      return days[startDate.getDay()];
    }
    return `${days[startDate.getDay()]}-${days[endDate.getDay()]}`;
  };

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden transition-all',
        'bg-white dark:bg-slate-900',
        'border-gray-200 dark:border-slate-700',
        expanded && 'ring-2 ring-primary-500/20'
      )}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="p-2.5 rounded-lg flex-shrink-0"
            style={{ backgroundColor: `${equipe.couleur || specialiteInfo.color}20` }}
          >
            <IconComponent
              className="w-5 h-5"
              style={{ color: equipe.couleur || specialiteInfo.color }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {equipe.nom}
              </h3>
              {charge.overloaded && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                  Surcharge
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Capacite : {equipe.capacite_heures_semaine}h/sem • {membresCount} membre{membresCount > 1 ? 's' : ''}
            </p>
          </div>

          {/* Expand icon */}
          <div className="flex-shrink-0">
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Capacity bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Cette semaine : {charge.total_hours || 0}h planifiees</span>
            <span>{Math.round(charge.percentage || 0)}%</span>
          </div>
          <CapacityBar percentage={charge.percentage || 0} overloaded={charge.overloaded} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-slate-700">
          {/* Members */}
          {equipe.membres && equipe.membres.length > 0 && (
            <div className="p-4 border-b border-gray-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Membres
              </p>
              <div className="space-y-1.5">
                {equipe.membres.map((membre, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    <span className="text-gray-900 dark:text-white">{membre.nom}</span>
                    <span className="text-gray-500 dark:text-gray-400">({membre.role})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chantiers */}
          <div className="p-4 border-b border-gray-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Chantiers assignés ({chantiers?.length || 0})
            </p>
            {chantiers && chantiers.length > 0 ? (
              <div className="space-y-2">
                {chantiers.slice(0, 5).map((chantier) => (
                  <div
                    key={chantier.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {chantier.nom}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {chantier.client_prenom} {chantier.client_nom}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateRange(chantier.date_debut, chantier.date_fin)}
                      </span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {chantier.heures_estimees || 8}h
                      </span>
                    </div>
                  </div>
                ))}
                {chantiers.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    +{chantiers.length - 5} autres chantiers
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Aucun chantier assigné
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(equipe)}>
              <Edit2 className="w-4 h-4 mr-1" />
              Modifier
            </Button>
            {onViewPlanning && (
              <Button variant="outline" size="sm" onClick={() => onViewPlanning(equipe.id)}>
                <Calendar className="w-4 h-4 mr-1" />
                Voir planning
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(equipe)}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Member input row
 */
function MembreInput({ membre, index, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={membre.nom}
        onChange={(e) => onChange(index, { ...membre, nom: e.target.value })}
        placeholder="Nom"
        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
      />
      <select
        value={membre.role}
        onChange={(e) => onChange(index, { ...membre, role: e.target.value })}
        className="w-40 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>{role}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Equipe form modal
 */
function EquipeFormModal({ isOpen, onClose, equipe, onSave, isSaving }) {
  const [form, setForm] = useState({
    nom: '',
    specialite: 'general',
    couleur: COLORS[0],
    membres: [{ nom: '', role: 'Ouvrier qualifie' }],
    capacite_heures_semaine: 40,
    taux_horaire: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  // Initialize form when equipe changes
  useEffect(() => {
    if (equipe) {
      setForm({
        nom: equipe.nom || '',
        specialite: equipe.specialite || 'general',
        couleur: equipe.couleur || COLORS[0],
        membres: equipe.membres?.length > 0 ? equipe.membres : [{ nom: '', role: 'Ouvrier qualifie' }],
        capacite_heures_semaine: equipe.capacite_heures_semaine || 40,
        taux_horaire: equipe.taux_horaire || '',
        notes: equipe.notes || '',
      });
    } else {
      setForm({
        nom: '',
        specialite: 'general',
        couleur: COLORS[Math.floor(Math.random() * COLORS.length)],
        membres: [{ nom: '', role: 'Ouvrier qualifie' }],
        capacite_heures_semaine: 40,
        taux_horaire: '',
        notes: '',
      });
    }
    setErrors({});
  }, [equipe, isOpen]);

  const handleMembreChange = (index, membre) => {
    const newMembres = [...form.membres];
    newMembres[index] = membre;
    setForm({ ...form, membres: newMembres });
  };

  const handleAddMembre = () => {
    setForm({
      ...form,
      membres: [...form.membres, { nom: '', role: 'Ouvrier qualifie' }],
    });
  };

  const handleRemoveMembre = (index) => {
    if (form.membres.length > 1) {
      const newMembres = form.membres.filter((_, i) => i !== index);
      setForm({ ...form, membres: newMembres });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }
    const validMembres = form.membres.filter((m) => m.nom.trim());
    if (validMembres.length === 0) {
      newErrors.membres = 'Au moins un membre est requis';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const validMembres = form.membres.filter((m) => m.nom.trim());
    onSave({
      ...form,
      membres: validMembres,
      capacite_heures_semaine: parseInt(form.capacite_heures_semaine) || 40,
      taux_horaire: form.taux_horaire ? parseFloat(form.taux_horaire) : null,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>{equipe ? 'Modifier l\'equipe' : 'Nouvelle equipe'}</ModalTitle>
      </ModalHeader>
      <ModalBody className="space-y-4">
        {/* Name & Specialite */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom de l'équipe *
            </label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex: Equipe Plomberie"
              className={cn(
                'w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white',
                errors.nom ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              )}
            />
            {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Specialite
            </label>
            <select
              value={form.specialite}
              onChange={(e) => setForm({ ...form, specialite: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              {SPECIALITES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Color & Capacity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Couleur
            </label>
            <div className="flex items-center gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, couleur: color })}
                  className={cn(
                    'w-8 h-8 rounded-full transition-transform',
                    form.couleur === color && 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Capacite (h/semaine)
            </label>
            <input
              type="number"
              value={form.capacite_heures_semaine}
              onChange={(e) => setForm({ ...form, capacite_heures_semaine: e.target.value })}
              min="1"
              max="168"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Hourly rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Taux horaire (EUR/h) - optionnel
          </label>
          <input
            type="number"
            value={form.taux_horaire}
            onChange={(e) => setForm({ ...form, taux_horaire: e.target.value })}
            placeholder="45.00"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Members */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Membres *
            </label>
            <Button variant="ghost" size="sm" onClick={handleAddMembre}>
              <UserPlus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>
          <div className="space-y-2">
            {form.membres.map((membre, index) => (
              <MembreInput
                key={index}
                membre={membre}
                index={index}
                onChange={handleMembreChange}
                onRemove={handleRemoveMembre}
              />
            ))}
          </div>
          {errors.membres && <p className="text-xs text-red-500 mt-1">{errors.membres}</p>}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            placeholder="Notes supplémentaires..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-none"
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              {equipe ? 'Enregistrer' : 'Creer'}
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Delete confirmation modal
 */
function DeleteConfirmModal({ isOpen, onClose, equipe, onConfirm, isDeleting }) {
  if (!equipe) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader>
        <ModalTitle>Supprimer l'équipe</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p className="text-gray-600 dark:text-gray-400">
          Êtes-vous sûr de vouloir supprimer l'équipe <span className="font-medium text-gray-900 dark:text-white">"{equipe.nom}"</span> ?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Les chantiers assignés à cette équipe ne seront plus associés.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
          Annuler
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
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
 * EquipesManager - Main component for managing teams
 *
 * @param {EquipesManagerProps} props
 */
export default function EquipesManager({ userId, onViewPlanning, className }) {
  // State
  const [loading, setLoading] = useState(true);
  const [equipes, setEquipes] = useState([]);
  const [chantiersMap, setChantiersMap] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  // Modal state
  const [formModal, setFormModal] = useState({ isOpen: false, equipe: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, equipe: null });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch equipes with load
  const fetchEquipes = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Use the RPC function that includes load calculation
      const { data, error } = await supabase.rpc('get_equipes_with_load', {
        p_user_id: userId,
        p_week_start: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;
      setEquipes(data || []);

      // Fetch chantiers for each equipe
      const chantierPromises = (data || []).map(async (equipe) => {
        const { data: chantiers } = await supabase.rpc('get_equipe_chantiers', {
          p_equipe_id: equipe.id,
        });
        return { equipeId: equipe.id, chantiers: chantiers || [] };
      });

      const chantiersResults = await Promise.all(chantierPromises);
      const newChantiersMap = {};
      chantiersResults.forEach(({ equipeId, chantiers }) => {
        newChantiersMap[equipeId] = chantiers;
      });
      setChantiersMap(newChantiersMap);
    } catch (error) {
      console.error('Error fetching equipes:', error);
      // Fallback: direct query without RPC
      const { data, error: directError } = await supabase
        .from('equipes')
        .select('*')
        .eq('user_id', userId)
        .eq('actif', true)
        .order('nom');

      if (!directError) {
        setEquipes(data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchEquipes();
  }, [fetchEquipes]);

  // Filter equipes
  const filteredEquipes = useMemo(() => {
    if (!search) return equipes;
    const searchLower = search.toLowerCase();
    return equipes.filter(
      (e) =>
        e.nom.toLowerCase().includes(searchLower) ||
        e.specialite?.toLowerCase().includes(searchLower) ||
        e.membres?.some((m) => m.nom.toLowerCase().includes(searchLower))
    );
  }, [equipes, search]);

  // Handle save equipe
  const handleSaveEquipe = async (formData) => {
    setIsSaving(true);
    try {
      if (formModal.equipe) {
        // Update
        const { error } = await supabase
          .from('equipes')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', formModal.equipe.id);

        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from('equipes').insert([
          {
            ...formData,
            user_id: userId,
          },
        ]);

        if (error) throw error;
      }

      await fetchEquipes();
      setFormModal({ isOpen: false, equipe: null });
    } catch (error) {
      console.error('Error saving equipe:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete equipe
  const handleDeleteEquipe = async () => {
    if (!deleteModal.equipe) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('equipes')
        .update({ actif: false })
        .eq('id', deleteModal.equipe.id);

      if (error) throw error;

      await fetchEquipes();
      setDeleteModal({ isOpen: false, equipe: null });
    } catch (error) {
      console.error('Error deleting equipe:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle expand
  const handleToggle = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mes Equipes
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {equipes.length} equipe{equipes.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setFormModal({ isOpen: true, equipe: null })}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nouvelle equipe
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une equipe..."
          aria-label="Rechercher une equipe"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Equipes list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : filteredEquipes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            {search ? 'Aucune equipe trouvee' : 'Aucune equipe'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search
              ? 'Modifiez votre recherche'
              : 'Créez votre première équipe pour organiser vos chantiers'}
          </p>
          {!search && (
            <Button variant="primary" onClick={() => setFormModal({ isOpen: true, equipe: null })}>
              <Plus className="w-4 h-4 mr-1.5" />
              Creer une equipe
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEquipes.map((equipe) => (
            <EquipeCard
              key={equipe.id}
              equipe={equipe}
              chantiers={chantiersMap[equipe.id] || []}
              expanded={expandedId === equipe.id}
              onToggle={() => handleToggle(equipe.id)}
              onEdit={(e) => setFormModal({ isOpen: true, equipe: e })}
              onDelete={(e) => setDeleteModal({ isOpen: true, equipe: e })}
              onViewPlanning={onViewPlanning}
              isDeleting={isDeleting && deleteModal.equipe?.id === equipe.id}
            />
          ))}
        </div>
      )}

      {/* Overload summary */}
      {equipes.some((e) => e.charge?.overloaded) && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Equipes surchargees cette semaine
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {equipes.filter((e) => e.charge?.overloaded).map((e) => e.nom).join(', ')}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Suggestion : Reprogrammez certains chantiers ou assignez-les à d'autres équipes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <EquipeFormModal
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, equipe: null })}
        equipe={formModal.equipe}
        onSave={handleSaveEquipe}
        isSaving={isSaving}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, equipe: null })}
        equipe={deleteModal.equipe}
        onConfirm={handleDeleteEquipe}
        isDeleting={isDeleting}
      />
    </div>
  );
}

/**
 * EquipeSelector - Dropdown to select an equipe (for chantier forms)
 */
export function EquipeSelector({ userId, value, onChange, className, showLoad = true }) {
  const [equipes, setEquipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEquipes = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase.rpc('get_equipes_with_load', {
          p_user_id: userId,
        });

        if (error) throw error;
        setEquipes(data || []);
      } catch (error) {
        // Fallback
        const { data } = await supabase
          .from('equipes')
          .select('*')
          .eq('user_id', userId)
          .eq('actif', true)
          .order('nom');
        setEquipes(data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipes();
  }, [userId]);

  if (loading) {
    return (
      <div className={cn('px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg', className)}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg',
        'bg-white dark:bg-slate-800 text-gray-900 dark:text-white',
        className
      )}
    >
      <option value="">Aucune equipe</option>
      {equipes.map((equipe) => (
        <option key={equipe.id} value={equipe.id}>
          {equipe.nom}
          {showLoad && equipe.charge && ` (${equipe.charge.percentage || 0}% charge)`}
        </option>
      ))}
    </select>
  );
}
