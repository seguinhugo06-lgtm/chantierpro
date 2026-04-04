/**
 * NewChannelModal.jsx — Create a new chat channel
 *
 * Supports: equipe (team), custom channels.
 * User selects members from their team.
 */

import React, { useState, useMemo, memo, useCallback } from 'react';
import { X, Users, Hash, Check, Search, Building2, User } from 'lucide-react';

const NewChannelModal = memo(function NewChannelModal({
  onSubmit,
  onClose,
  isDark = false,
  couleur = '#f97316',
  equipe = [],
  demoUsers = null,
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('equipe');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  // Available members (team members or demo users)
  const availableMembers = useMemo(() => {
    if (demoUsers) {
      return demoUsers.filter(u => u.id !== 'demo-user-id').map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
      }));
    }
    return equipe.map(e => ({
      id: e.userId || e.id,
      name: `${e.prenom || ''} ${e.nom || ''}`.trim() || e.email,
      email: e.email,
    }));
  }, [equipe, demoUsers]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return availableMembers;
    const q = memberSearch.toLowerCase();
    return availableMembers.filter(m =>
      m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
    );
  }, [availableMembers, memberSearch]);

  const toggleMember = useCallback((memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  }, []);

  const [nameError, setNameError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setNameError('Le nom du canal est requis');
      return;
    }
    setNameError('');
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type,
        description: description.trim() || null,
        memberIds: selectedMembers,
      });
    } catch (err) {
      console.error('[NewChannelModal] Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, type, description, selectedMembers, onSubmit]);

  const types = [
    { id: 'equipe', icon: Users, label: 'Équipe', desc: 'Visible par les membres ajoutés' },
    { id: 'chantier', icon: Building2, label: 'Chantier', desc: 'Lié à un chantier spécifique' },
    { id: 'direct', icon: User, label: 'Direct', desc: 'Discussion privée 1-à-1' },
    { id: 'custom', icon: Hash, label: 'Canal', desc: 'Canal personnalisé' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl ${cardBg} max-h-[85vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b"
          style={{ borderColor: isDark ? 'rgb(51,65,85)' : 'rgb(229,231,235)' }}>
          <h2 className={`text-base font-semibold ${textPrimary}`}>Nouveau canal</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Channel type */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Type</label>
            <div className="flex gap-2">
              {types.map(t => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-current text-white'
                        : isDark ? 'border-slate-700 hover:border-slate-600 text-slate-300' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                    style={isSelected ? { borderColor: couleur, background: `${couleur}15` } : {}}
                  >
                    <Icon size={18} className="mx-auto mb-1" style={isSelected ? { color: couleur } : {}} />
                    <p className="text-xs font-medium">{t.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Nom du canal</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="ex: Discussion générale"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm ${nameError ? (isDark ? 'bg-slate-700 border-red-500 text-white placeholder-slate-500' : 'bg-white border-red-500 text-gray-900 placeholder-gray-400') : inputBg}`}
              autoFocus
            />
            {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
              Description <span className={textMuted}>(optionnel)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="À quoi sert ce canal ?"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg}`}
            />
          </div>

          {/* Members */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
              Membres ({selectedMembers.length} sélectionné{selectedMembers.length > 1 ? 's' : ''})
            </label>

            {/* Member search */}
            <div className="relative mb-2">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs ${inputBg}`}
              />
            </div>

            {/* Member list */}
            <div className={`max-h-40 overflow-y-auto rounded-xl border ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              {filteredMembers.length === 0 ? (
                <div className={`p-3 text-center text-xs ${textMuted}`}>
                  Aucun membre trouvé
                </div>
              ) : (
                filteredMembers.map(member => {
                  const isSelected = selectedMembers.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? isDark ? 'bg-slate-700' : 'bg-blue-50'
                          : isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        isSelected ? '' : 'bg-slate-400'
                      }`} style={isSelected ? { background: couleur } : {}}>
                        {isSelected ? <Check size={12} /> : member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${textPrimary} truncate`}>{member.name}</p>
                        {member.email && (
                          <p className={`text-[10px] ${textMuted} truncate`}>{member.email}</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            style={{ background: couleur }}
          >
            {isSubmitting ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Users size={16} />
                Créer le canal
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default NewChannelModal;
