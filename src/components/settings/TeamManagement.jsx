// src/components/settings/TeamManagement.jsx
// Team management & invitation UI for org owners/admins
import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Mail, Phone, Trash2, Clock, X, Copy } from 'lucide-react';
import { supabase, isDemo } from '../../supabaseClient';
import { useOrg } from '../../context/OrgContext';
import { usePermissions } from '../../hooks/usePermissions';
import { getRoleLabel, getInvitableRoles } from '../../lib/permissions';
import { useConfirm, useToast } from '../../context/AppContext';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { urlPublique } from '../../lib/urlPublique';
import { captureException } from '../../lib/sentry';
import { messageErreurFonction } from '../../lib/emailSender';
import { dateLue } from '../../lib/dates';
import Carte from '../ui/Carte';
import Pastille from '../ui/Pastille';
import ChampChoix from '../ui/ChampChoix';
import { Avatar } from '../ui/LigneListe';
import { Bouton, BoutonIcone } from '../ui/Bouton';

const INVITABLE_ROLES = getInvitableRoles();

function getMemberDisplayName(member, currentUserEmail) {
  // Try equipe join data first
  if (member.equipe?.nom || member.equipe?.prenom) {
    return [member.equipe.prenom, member.equipe.nom].filter(Boolean).join(' ');
  }
  if (member.equipe?.email) return member.equipe.email;
  // If this is the current user, show their email
  if (currentUserEmail && member.isCurrentUser) return currentUserEmail;
  // Fallback
  return member.user_id?.slice(0, 8) + '...';
}

// isDark et couleur restent acceptés : les jetons du thème suivent le clair, le sombre et l'accent d'eux-mêmes
export default function TeamManagement({ isDark: _isDark, couleur: _couleur }) {
  const { orgId, orgName, members, refreshOrg } = useOrg();
  const { canManageTeam } = usePermissions();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const checkLimit = useSubscriptionStore((s) => s.checkLimit);
  const openUpgradeModal = useSubscriptionStore((s) => s.openUpgradeModal);

  // Get current user email for display fallback
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => {
      setCurrentUserEmail(data?.user?.email || '');
      setCurrentUserId(data?.user?.id || '');
    });
  }, []);

  // State (must be declared before derived values that reference them)
  const [invitations, setInvitations] = useState([]);
  const [, setLoading] = useState(false);
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
  const inputBg = 'bg-surface border-bord-fort';
  const textMuted = 'text-encre-3';

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

      // Send invitation email via Edge Function (Resend). Un seul toast à la fois : celui
      // de succès ne doit pas recouvrir l'échec de l'e-mail (l'artisan croirait l'invité prévenu).
      let echecEmail = null;
      if (data.email && data.token) {
        const inviteLink = urlPublique(`/invitation/${data.token}`);
        const roleLabel = getRoleLabel(data.role);

        try {
          // La fonction relit l'invitation en base (destinataire, organisation, lien) et vérifie
          // que vous en êtes l'auteur. `to` et `data` ne servent qu'à l'ancienne version encore
          // déployée ; la nouvelle les ignore (à retirer une fois send-lifecycle-email redéployée).
          const { error: fnError } = await supabase.functions.invoke('send-lifecycle-email', {
            body: {
              type: 'invitation',
              invitationId: data.id,
              to: data.email,
              data: {
                orgName: orgName || 'Mallettico',
                roleLabel,
                inviteLink,
                expiresAt: dateLue(data.expires_at).toLocaleDateString('fr-FR'),
              },
            },
          });
          if (fnError) echecEmail = await messageErreurFonction(fnError);
        } catch (fnErr) {
          echecEmail = fnErr?.message || 'service indisponible';
        }
      }

      if (echecEmail) {
        captureException(new Error(echecEmail), { context: 'e-mail d’invitation d’équipe' });
        showToast(`Invitation créée, mais l'e-mail n'est pas parti : ${echecEmail}. Copiez le lien d'invitation pour l'envoyer vous-même.`, 'warning');
      } else {
        showToast('Invitation envoyée !', 'success');
      }
      setInviteForm({ email: '', phone: '', role: 'ouvrier' });
      setShowInviteForm(false);
      setInvitations(prev => [data, ...prev]);
    } catch (err) {
      console.error('[TeamManagement] Error sending invitation:', err);
      // Refus de la base (42501) : équipe complète pour l'abonnement (migration 087, compté aussi côté
      // serveur) ou droit d'inviter retiré entre-temps
      if (err?.code === '42501') {
        showToast('Invitation refusée : votre équipe est complète pour votre abonnement, ou vous n\'avez plus le droit d\'inviter.', 'error');
        loadInvitations();
      } else {
        showToast('Erreur lors de l\'envoi de l\'invitation', 'error');
      }
    } finally {
      setInviteLoading(false);
    }
  };

  // Revoke invitation
  const handleRevoke = async (invId) => {
    const ok = await confirm({ title: 'Annuler l\'invitation ?', message: 'Cette invitation ne sera plus valide.' });
    if (!ok) return;
    try {
      // La fonction répond { error } sans erreur HTTP quand elle refuse (invitation déjà utilisée,
      // ou vous n'êtes plus propriétaire ni administrateur) : ne pas annoncer une annulation qui n'a pas eu lieu.
      const { data, error } = await supabase.rpc('revoke_invitation', { p_invitation_id: invId });
      if (error) throw error;
      if (data?.error) { showToast(`Invitation non annulée : ${data.error}`, 'error'); loadInvitations(); return; }
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
      // .select() : un refus de la base (RLS) ne lève pas d'erreur, il modifie 0 ligne.
      const { data, error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('modification refusée');
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
      message: `${memberName} n'aura plus accès à l'organisation. Ses devis, factures et clients restent à l'entreprise : ils passent au nom du propriétaire.`
    });
    if (!ok) return;
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('retrait refusé');
      refreshOrg();
      showToast('Membre retiré', 'success');
    } catch (err) {
      captureException(err, { context: 'retrait d\'un membre' });
      showToast(`Membre non retiré : ${err?.message || 'erreur inconnue'}`, 'error');
    }
  };

  // Copy invitation link
  const copyInviteLink = (token) => {
    const url = urlPublique(`/invitation/${token}`);
    navigator.clipboard?.writeText(url)
      .then(() => showToast('Lien d’invitation copié', 'success'))
      .catch(() => showToast('Copie échouée', 'error'));
  };

  if (isDemo) {
    return (
      <Carte className="text-center">
        <Users size={32} aria-hidden="true" className="mx-auto text-encre-3" />
        <p className="mt-2 font-semibold text-encre">Gestion d’équipe</p>
        <p className="text-sm text-encre-3">Disponible avec un compte connecté</p>
      </Carte>
    );
  }

  const pendingInvitations = invitations.filter(i => i.status === 'pending');
  const pastInvitations = invitations.filter(i => i.status !== 'pending');
  const optionsRoles = INVITABLE_ROLES.map((r) => ({ valeur: r.value, libelle: r.label, detail: r.description }));

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-encre">Équipe et accès</h2>
          <p className="text-sm text-encre-3">
            {members.length} membre{members.length > 1 ? 's' : ''} dans {orgName || 'votre organisation'}
            {memberLimit.limit !== -1 && (
              <span className="ml-1">
                ({nonOwnerCount} sur {memberLimit.limit} places utilisées)
              </span>
            )}
          </p>
        </div>
        {canManageTeam && (
          teamLimitReached ? (
            <Bouton icone={UserPlus} onClick={() => openUpgradeModal('equipe')}>Limite atteinte : voir les offres</Bouton>
          ) : (
            <Bouton icone={UserPlus} onClick={() => setShowInviteForm(true)}>Inviter</Bouton>
          )
        )}
      </div>

      {/* Invitation */}
      {showInviteForm && (
        <Carte className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-encre">Nouvelle invitation</h3>
            <BoutonIcone icone={X} libelle="Fermer l’invitation" taille={18} className="-my-2 -mr-2" onClick={() => setShowInviteForm(false)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="invitation-email" className="block mb-1.5 text-sm font-medium text-encre-2">E-mail</label>
              <div className="relative">
                <Mail size={16} aria-hidden="true" className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  id="invitation-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="prenom@exemple.fr"
                  className={`w-full h-12 pl-9 pr-3 border rounded-xl text-base sm:text-sm ${inputBg}`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="invitation-tel" className="block mb-1.5 text-sm font-medium text-encre-2">Téléphone <span className="font-normal text-encre-3">(facultatif)</span></label>
              <div className="relative">
                <Phone size={16} aria-hidden="true" className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input
                  id="invitation-tel"
                  type="tel"
                  value={inviteForm.phone}
                  onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                  className={`w-full h-12 pl-9 pr-3 border rounded-xl text-base sm:text-sm ${inputBg}`}
                />
              </div>
            </div>
          </div>

          <div>
            <label id="invitation-role-libelle" htmlFor="invitation-role" className="block mb-1.5 text-sm font-medium text-encre-2">Rôle</label>
            <ChampChoix id="invitation-role" idLibelle="invitation-role-libelle" titre="Rôle de la personne invitée"
              options={optionsRoles} valeur={inviteForm.role} onChange={(v) => setInviteForm(f => ({ ...f, role: v }))} />
            <p className="mt-1.5 text-sm text-encre-3">{INVITABLE_ROLES.find((r) => r.value === inviteForm.role)?.description}</p>
          </div>

          <p className="text-sm text-encre-3">
            La personne invitée reçoit un e-mail de Mallettico avec un lien valable 7 jours. Votre adresse e-mail y figure : elle sait qui l’invite et peut vous répondre.
          </p>

          <div className="flex justify-end gap-2">
            <Bouton variante="discret" onClick={() => setShowInviteForm(false)}>Annuler</Bouton>
            <Bouton variante="principal" icone={Mail} chargement={inviteLoading} onClick={handleInvite}>Envoyer l’invitation</Bouton>
          </div>
        </Carte>
      )}

      {/* Membres */}
      <Carte marge="aucun" className="overflow-hidden">
        <h3 className="px-4 py-3 border-b border-bord font-semibold text-sm text-encre">Membres actifs</h3>
        <ul className="divide-y divide-bord">
          {members.map(member => {
            const isMe = member.user_id === currentUserId;
            const displayName = getMemberDisplayName({ ...member, isCurrentUser: isMe }, currentUserEmail);
            const idRole = `role-membre-${member.id}`;
            return (
              <li key={member.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <Avatar nom={displayName} taille={40} />
                <div className="flex-1 min-w-0">
                  <p id={`${idRole}-libelle`} className="text-sm font-semibold truncate text-encre">
                    {displayName}
                    {isMe && <span className="ml-2 text-sm font-normal text-encre-3">(vous)</span>}
                  </p>
                  <Pastille className="mt-1">{getRoleLabel(member.role)}</Pastille>
                </div>
                {canManageTeam && member.role !== 'owner' && (
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <div className="flex-1 sm:w-48">
                      <ChampChoix id={idRole} idLibelle={`${idRole}-libelle`} titre={`Rôle de ${displayName}`} options={optionsRoles}
                        valeur={member.role} onChange={(v) => handleChangeRole(member.id, v)} disabled={changingRole === member.id} className="!h-11" />
                    </div>
                    <BoutonIcone icone={Trash2} taille={18} libelle="Retirer ce membre" className="!text-danger-texte hover:!bg-danger-fond"
                      onClick={() => handleRemoveMember(member.id, displayName)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Carte>

      {/* Invitations en attente */}
      {pendingInvitations.length > 0 && (
        <Carte marge="aucun" className="overflow-hidden">
          <h3 className="px-4 py-3 border-b border-bord font-semibold text-sm text-encre">
            Invitations en attente ({pendingInvitations.length})
          </h3>
          <ul className="divide-y divide-bord">
            {pendingInvitations.map(inv => (
              <li key={inv.id} className="px-4 py-3 flex items-center gap-3">
                <Clock size={18} aria-hidden="true" className="text-encre-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-encre">{inv.email || inv.phone}</p>
                  <p className="text-sm text-encre-3">
                    {getRoleLabel(inv.role)} · expire le {dateLue(inv.expires_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <BoutonIcone icone={Copy} taille={18} libelle="Copier le lien d'invitation" onClick={() => copyInviteLink(inv.token)} />
                  {canManageTeam && (
                    <BoutonIcone icone={X} taille={18} libelle="Annuler l'invitation" className="!text-danger-texte hover:!bg-danger-fond" onClick={() => handleRevoke(inv.id)} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {/* Historique (replié) */}
      {pastInvitations.length > 0 && (
        <details className="bg-surface border border-bord rounded-2xl shadow-e1 overflow-hidden">
          <summary className="px-4 min-h-[48px] flex items-center cursor-pointer hover:bg-surface-2">
            <span className="text-sm font-semibold text-encre-2">
              Historique des invitations ({pastInvitations.length})
            </span>
          </summary>
          <ul className="divide-y divide-bord">
            {pastInvitations.slice(0, 10).map(inv => (
              <li key={inv.id} className="px-4 py-2.5 flex items-center gap-3">
                <p className="flex-1 min-w-0 text-sm truncate text-encre-2">{inv.email || inv.phone}</p>
                <Pastille ton={inv.status === 'accepted' ? 'succes' : 'neutre'}>
                  {inv.status === 'accepted' ? 'Acceptée' : inv.status === 'revoked' ? 'Annulée' : 'Expirée'}
                </Pastille>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
