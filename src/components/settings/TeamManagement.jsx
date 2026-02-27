// src/components/settings/TeamManagement.jsx
// Team management & invitation UI for org owners/admins
import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Mail, Phone, Shield, Trash2, Clock, Check, X, Copy, Loader2, AlertCircle, ChevronDown, RefreshCw } from 'lucide-react';
import { supabase, isDemo } from '../../supabaseClient';
import { useOrg } from '../../context/OrgContext';
import { usePermissions } from '../../hooks/usePermissions';
import { getRoleLabel, getRoleDescription, getInvitableRoles } from '../../lib/permissions';
import { useConfirm, useToast } from '../../context/AppContext';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

const INVITABLE_ROLES = getInvitableRoles();

export default function TeamManagement({ isDark, couleur = '#F97316' }) {
  const { orgId, orgName, members, refreshOrg } = useOrg();
  const { isOwner, isAdmin, canManageTeam } = usePermissions();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const checkLimit = useSubscriptionStore((s) => s.checkLimit);
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);

  // State (must be declared before derived values that reference them)
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', phone: '', role: 'ouvrier' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [changingRole, setChangingRole] = useState(null);

  // Check team member limit from plan
  const memberLimit = checkLimit('equipe');
  const nonOwnerCount = members.filter(m => m.role !== 'owner').length;
  const pendingCount = invitations.filter(i => i.status === 'pending').length;
  const teamLimitReached = memberLimit.limit !== -1 && (nonOwnerCount + pendingCount) >= memberLimit.limit;

  // Theme
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Load invitations
  const loadInvitations = useCallback(async () => {
    if (!orgId || isDemo || !supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (!error && data) setInvitations(data);
    } catch (err) {
      console.error('[TeamManagement] Error loading invitations:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { loadInvitations(); }, [loadInvitations]);

  // Send invitation
  const handleInvite = async () => {
    if (!inviteForm.email && !inviteForm.phone) {
      showToast('Veuillez saisir un email ou un numéro de téléphone', 'error');
      return;
    }
    if (teamLimitReached) {
      openUpgradeModal('equipe');
      return;
    }
    setInviteLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          organization_id: orgId,
          email: inviteForm.email || null,
          phone: inviteForm.phone || null,
          role: inviteForm.role,
          invited_by: (await supabase.auth.getUser()).data?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send invitation email
      if (data.email && data.token) {
        const inviteLink = `${window.location.origin}/invitation/${data.token}`;
        const roleLabel = getRoleLabel(data.role);
        let emailSent = false;

        // Try Edge Function first (if deployed with Resend)
        try {
          const { error: fnError } = await supabase.functions.invoke('send-lifecycle-email', {
            body: {
              type: 'invitation',
              to: data.email,
              data: {
                orgName: orgName || 'ChantierPro',
                roleLabel,
                inviteLink,
                expiresAt: new Date(data.expires_at).toLocaleDateString('fr-FR'),
              },
            },
          });
          if (!fnError) emailSent = true;
          else console.warn('[TeamManagement] Edge Function error:', fnError);
        } catch (fnErr) {
          console.warn('[TeamManagement] Edge Function unavailable:', fnErr.message);
        }

        // Fallback: open mailto: link so user can send manually
        if (!emailSent) {
          const subject = encodeURIComponent(`Invitation à rejoindre ${orgName || 'ChantierPro'}`);
          const body = encodeURIComponent(
            `Bonjour,\n\nVous êtes invité(e) à rejoindre ${orgName || 'notre organisation'} sur ChantierPro en tant que ${roleLabel}.\n\nCliquez sur ce lien pour accepter :\n${inviteLink}\n\nCette invitation expire le ${new Date(data.expires_at).toLocaleDateString('fr-FR')}.\n\nÀ bientôt !`
          );
          window.open(`mailto:${data.email}?subject=${subject}&body=${body}`, '_blank');
        }
      }

      showToast('Invitation envoyée !', 'success');
      setInviteForm({ email: '', phone: '', role: 'ouvrier' });
      setShowInviteForm(false);
      setInvitations(prev => [data, ...prev]);
    } catch (err) {
      console.error('[TeamManagement] Error sending invitation:', err);
      showToast('Erreur lors de l\'envoi de l\'invitation', 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  // Revoke invitation
  const handleRevoke = async (invId) => {
    const ok = await confirm({ title: 'Annuler l\'invitation ?', message: 'Cette invitation ne sera plus valide.' });
    if (!ok) return;
    try {
      const { error } = await supabase.rpc('revoke_invitation', { p_invitation_id: invId });
      if (error) throw error;
      setInvitations(prev => prev.map(i => i.id === invId ? { ...i, status: 'revoked' } : i));
      showToast('Invitation annulée', 'success');
    } catch (err) {
      showToast('Erreur', 'error');
    }
  };

  // Change member role
  const handleChangeRole = async (memberId, newRole) => {
    setChangingRole(memberId);
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);
      if (error) throw error;
      refreshOrg();
      showToast('Rôle modifié', 'success');
    } catch (err) {
      showToast('Erreur lors du changement de rôle', 'error');
    } finally {
      setChangingRole(null);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId, memberName) => {
    const ok = await confirm({
      title: 'Retirer ce membre ?',
      message: `${memberName} n'aura plus accès à l'organisation.`
    });
    if (!ok) return;
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      refreshOrg();
      showToast('Membre retiré', 'success');
    } catch (err) {
      showToast('Erreur', 'error');
    }
  };

  // Copy invitation link
  const copyInviteLink = (token) => {
    const url = `${window.location.origin}/invitation/${token}`;
    navigator.clipboard?.writeText(url)
      .then(() => showToast('Lien copié !', 'success'))
      .catch(() => showToast('Copie échouée', 'error'));
  };

  // Role badge color
  const roleBadge = (role) => {
    const colors = {
      owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      comptable: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
      chef_chantier: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
      ouvrier: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      readonly: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    };
    return colors[role] || colors.readonly;
  };

  if (isDemo) {
    return (
      <div className={`${cardBg} rounded-2xl border p-6 text-center`}>
        <Users size={32} className={textMuted} />
        <p className={`mt-2 font-medium ${textPrimary}`}>Gestion d'équipe</p>
        <p className={`text-sm ${textMuted}`}>Disponible avec un compte connecté</p>
      </div>
    );
  }

  const pendingInvitations = invitations.filter(i => i.status === 'pending');
  const pastInvitations = invitations.filter(i => i.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${textPrimary}`}>Équipe & Accès</h2>
          <p className={`text-sm ${textMuted}`}>
            {members.length} membre{members.length > 1 ? 's' : ''} dans {orgName || 'votre organisation'}
            {memberLimit.limit !== -1 && (
              <span className="ml-1">
                ({nonOwnerCount}/{memberLimit.limit} places utilisées)
              </span>
            )}
          </p>
        </div>
        {canManageTeam && (
          teamLimitReached ? (
            <button
              onClick={() => openUpgradeModal('equipe')}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 bg-amber-100 text-amber-800 hover:bg-amber-200 transition-all"
            >
              <UserPlus size={16} /> Limite atteinte — Upgrader
            </button>
          ) : (
            <button
              onClick={() => setShowInviteForm(true)}
              className="px-4 py-2.5 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
              style={{ background: couleur }}
            >
              <UserPlus size={16} /> Inviter
            </button>
          )
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className={`${cardBg} rounded-xl border p-4 space-y-3`}>
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${textPrimary}`}>Nouvelle invitation</h3>
            <button onClick={() => setShowInviteForm(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <X size={16} className={textMuted} />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Email</label>
              <div className="relative">
                <Mail size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="colleague@email.com"
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm ${inputBg}`}
                />
              </div>
            </div>
            <div>
              <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Téléphone (optionnel)</label>
              <div className="relative">
                <Phone size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  type="tel"
                  value={inviteForm.phone}
                  onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm ${inputBg}`}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={`text-xs font-medium ${textMuted} mb-1 block`}>Rôle</label>
            <select
              value={inviteForm.role}
              onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
            >
              {INVITABLE_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label} — {r.description}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowInviteForm(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Annuler
            </button>
            <button
              onClick={handleInvite}
              disabled={inviteLoading}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
              style={{ background: couleur }}
            >
              {inviteLoading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              Envoyer l'invitation
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className={`${cardBg} rounded-xl border overflow-hidden`}>
        <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className={`font-semibold text-sm ${textPrimary}`}>Membres actifs</h3>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {members.map(member => {
            const isCurrentUserOwner = member.role === 'owner';
            return (
              <div key={member.id} className={`px-4 py-3 flex items-center gap-3 ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} transition-colors`}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: member.role === 'owner' ? '#f59e0b' : couleur }}>
                  <Shield size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${textPrimary}`}>
                    {member.user_id?.slice(0, 8)}...
                    {isCurrentUserOwner && <span className={`ml-2 text-xs ${textMuted}`}>(vous)</span>}
                  </p>
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${roleBadge(member.role)}`}>
                    {getRoleLabel(member.role)}
                  </span>
                </div>
                {canManageTeam && !isCurrentUserOwner && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={member.role}
                      onChange={e => handleChangeRole(member.id, e.target.value)}
                      disabled={changingRole === member.id}
                      className={`text-xs px-2 py-1 rounded-lg border ${inputBg}`}
                    >
                      {INVITABLE_ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.id, member.user_id?.slice(0, 8))}
                      className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-red-900/50 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                      title="Retirer ce membre"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className={`${cardBg} rounded-xl border overflow-hidden`}>
          <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <h3 className={`font-semibold text-sm ${textPrimary}`}>
              Invitations en attente ({pendingInvitations.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {pendingInvitations.map(inv => (
              <div key={inv.id} className="px-4 py-3 flex items-center gap-3">
                <Clock size={16} className="text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${textPrimary}`}>{inv.email || inv.phone}</p>
                  <p className={`text-xs ${textMuted}`}>
                    {getRoleLabel(inv.role)} · Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyInviteLink(inv.token)}
                    className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    title="Copier le lien d'invitation"
                  >
                    <Copy size={14} />
                  </button>
                  {canManageTeam && (
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-red-900/50 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                      title="Annuler l'invitation"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Invitations (collapsed) */}
      {pastInvitations.length > 0 && (
        <details className={`${cardBg} rounded-xl border overflow-hidden`}>
          <summary className={`px-4 py-3 cursor-pointer ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
            <span className={`text-sm font-medium ${textMuted}`}>
              Historique ({pastInvitations.length})
            </span>
          </summary>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {pastInvitations.slice(0, 10).map(inv => (
              <div key={inv.id} className="px-4 py-2.5 flex items-center gap-3">
                {inv.status === 'accepted' ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <X size={14} className="text-red-400" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${textMuted}`}>{inv.email || inv.phone}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  inv.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                  inv.status === 'revoked' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {inv.status === 'accepted' ? 'Acceptée' : inv.status === 'revoked' ? 'Annulée' : 'Expirée'}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
