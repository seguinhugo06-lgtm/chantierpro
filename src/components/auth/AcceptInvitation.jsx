// src/components/auth/AcceptInvitation.jsx
// Public page for accepting org invitations via token link
import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, AlertCircle, Loader2, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function AcceptInvitation({ token }) {
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [user, setUser] = useState(null);

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription?.unsubscribe();
  }, []);

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Token manquant');
        setLoading(false);
        return;
      }
      try {
        const { data, error: rpcError } = await supabase.rpc('get_invitation_by_token', {
          p_token: token
        });

        if (rpcError) throw rpcError;
        if (data?.error) {
          setError(data.error);
        } else {
          setInvitation(data);
        }
      } catch (err) {
        console.error('[AcceptInvitation] Error:', err);
        setError('Impossible de charger l\'invitation');
      } finally {
        setLoading(false);
      }
    };
    fetchInvitation();
  }, [token]);

  // Accept the invitation
  const handleAccept = async () => {
    if (!user || !invitation) return;
    setAccepting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('accept_invitation', {
        p_token: token,
        p_user_id: user.id,
      });

      if (rpcError) throw rpcError;
      if (data?.error) {
        setError(data.error);
        return;
      }

      setAccepted(true);
    } catch (err) {
      console.error('[AcceptInvitation] Error accepting:', err);
      setError('Erreur lors de l\'acceptation');
    } finally {
      setAccepting(false);
    }
  };

  // Redirect to app after acceptance
  const goToApp = () => {
    window.location.href = '/';
  };

  // Redirect to login
  const goToLogin = () => {
    // Store token in localStorage so we can redirect back after login
    localStorage.setItem('cp_pending_invitation', token);
    window.location.href = '/';
  };

  // Role label in French
  const roleLabels = {
    admin: 'Administrateur',
    comptable: 'Comptable',
    chef_chantier: 'Chef de chantier',
    ouvrier: 'Ouvrier',
    readonly: 'Lecture seule',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Chargement de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invitation non valide</h1>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button
            onClick={goToApp}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            Retour à BatiGesti
          </button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Bienvenue dans l'équipe !</h1>
          <p className="text-sm text-slate-500 mb-2">
            Vous avez rejoint <strong>{invitation?.organization_name}</strong> en tant que{' '}
            <strong>{roleLabels[invitation?.role] || invitation?.role}</strong>.
          </p>
          <button
            onClick={goToApp}
            className="mt-6 px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            Accéder à BatiGesti
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-orange-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Vous êtes invité !</h1>
          <p className="text-sm text-slate-500">
            <strong>{invitation?.invited_by_email}</strong> vous invite à rejoindre
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-lg font-bold text-slate-900">{invitation?.organization_name}</p>
          <p className="text-sm text-slate-500 mt-1">
            Rôle : <span className="font-medium text-orange-600">{roleLabels[invitation?.role] || invitation?.role}</span>
          </p>
        </div>

        {user ? (
          // User is logged in — show accept button
          <div className="space-y-3">
            <p className="text-xs text-slate-400 text-center">
              Connecté en tant que {user.email}
            </p>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {accepting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              Accepter l'invitation
            </button>
          </div>
        ) : (
          // User is not logged in — show login/signup options
          <div className="space-y-3">
            <p className="text-sm text-slate-500 text-center mb-4">
              Connectez-vous ou créez un compte pour rejoindre l'équipe.
            </p>
            <button
              onClick={goToLogin}
              className="w-full px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={16} /> Se connecter / Créer un compte
            </button>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Cette invitation expire le {invitation?.expires_at ? new Date(invitation.expires_at).toLocaleDateString('fr-FR') : '—'}
        </p>
      </div>
    </div>
  );
}
