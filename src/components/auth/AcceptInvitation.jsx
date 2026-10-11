// src/components/auth/AcceptInvitation.jsx
// Page publique d'une invitation à rejoindre une équipe (/invitation/:jeton).
//
// Recette du 11 oct. 2026 (une ouvrière invitée, sur iPhone) : « Se connecter / Créer un compte »
// menait à la vitrine, sans retour à l'invitation ; l'inscription créait un espace vide ouvert
// ensuite à la place de l'équipe. Désormais : l'invitation est gardée pendant l'inscription
// (src/lib/organisationActive.js), l'e-mail de confirmation ramène ici, et l'équipe rejointe est
// celle que l'app ouvre.
import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, AlertCircle, Loader2, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { supabase, lienEmail } from '../../supabaseClient';
import { dateLue } from '../../lib/dates';
import { getRoleLabel, getRoleDescription } from '../../lib/permissions';
import { memoriserInvitation, oublierInvitation, memoriserOrganisation } from '../../lib/organisationActive';
import { traduireErreurAuth } from '../../lib/authErreurs';
import { Bouton } from '../ui/Bouton';
import Carte from '../ui/Carte';
import LogoMallettico from '../ui/LogoMallettico';

function Cadre({ children }) {
  return (
    <div className="min-h-screen bg-fond flex flex-col items-center justify-center px-4 py-10">
      <div className="flex items-center gap-2 mb-6 text-encre font-bold text-lg">
        <LogoMallettico taille={36} titre="" />
        <span>Mallettico</span>
      </div>
      <Carte marge="large" className="max-w-md w-full">{children}</Carte>
    </div>
  );
}

export default function AcceptInvitation({ token }) {
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [user, setUser] = useState(null);
  const [authPret, setAuthPret] = useState(false);
  // Lien de confirmation expiré ou déjà utilisé (#error=… dans l'adresse)
  const [erreurLien] = useState(() => (lienEmail.erreur ? traduireErreurAuth(lienEmail.erreur) : ''));

  // Compte connecté (le lien de confirmation d'e-mail ouvre la session en arrivant ici)
  useEffect(() => {
    let actif = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!actif) return;
      setUser(data?.user || null);
      setAuthPret(true);
    }, () => { if (actif) setAuthPret(true); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setAuthPret(true);
    });
    return () => { actif = false; subscription?.unsubscribe(); };
  }, []);

  // L'invitation
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Lien d’invitation incomplet.');
        setLoading(false);
        return;
      }
      try {
        const { data, error: rpcError } = await supabase.rpc('get_invitation_by_token', {
          p_token: token
        });
        if (rpcError) throw rpcError;
        if (data?.error) {
          // Acceptée, expirée ou retirée : elle ne doit plus détourner les connexions suivantes
          oublierInvitation();
          setError(data.error);
        } else {
          setInvitation(data);
        }
      } catch (err) {
        console.error('[AcceptInvitation] Error:', err);
        setError('Impossible de charger l’invitation. Vérifiez votre connexion puis rechargez la page.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!user || !invitation) return;
    setAccepting(true);
    try {
      // L'invitation est acceptée pour le compte connecté (auth.uid() côté base, migration 078).
      // p_user_id reste exigé par la fonction d'avant 078 ; 078 vérifie qu'il désigne bien le
      // compte connecté. À retirer une fois 078 constatée appliquée (docs/etat-production.md).
      const { data, error: rpcError } = await supabase.rpc('accept_invitation', {
        p_token: token,
        p_user_id: user.id,
      });

      if (rpcError) throw rpcError;
      if (data?.error) {
        oublierInvitation();
        setError(data.error);
        return;
      }
      // L'app ouvrira cette équipe sur cet appareil (sinon l'équipe rejointe le plus récemment)
      if (data?.organization_id) memoriserOrganisation(user.id, data.organization_id);
      oublierInvitation();
      setAccepted(true);
    } catch (err) {
      console.error('[AcceptInvitation] Error accepting:', err);
      setError('L’invitation n’a pas pu être acceptée. Vérifiez votre connexion puis réessayez.');
    } finally {
      setAccepting(false);
    }
  };

  const ouvrirApp = () => { window.location.href = '/'; };

  // L'invité crée son compte (ou se connecte) puis revient ici : l'invitation est gardée sur l'appareil
  const allerVers = (chemin) => {
    memoriserInvitation({ token, organisation: invitation?.organization_name, role: invitation?.role });
    window.location.href = chemin;
  };

  const changerDeCompte = async () => {
    try { await supabase.auth.signOut(); } catch { /* la session locale part quand même */ }
    setUser(null);
  };

  const pasMaintenant = () => {
    oublierInvitation();
    ouvrirApp();
  };

  if (loading || !authPret) {
    return (
      <Cadre>
        <div className="text-center py-6" role="status">
          <Loader2 size={28} className="animate-spin text-encre-3 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-encre-2">Chargement de l’invitation…</p>
        </div>
      </Cadre>
    );
  }

  if (error) {
    return (
      <Cadre>
        <div className="text-center">
          <AlertCircle size={40} className="text-danger-texte mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-lg font-bold text-encre mb-2">Cette invitation n’est plus valable</h1>
          <p className="text-sm text-encre-2 mb-2">{error}</p>
          <p className="text-sm text-encre-2 mb-6">
            {user
              ? 'Si vous l’avez déjà acceptée, l’équipe vous attend dans Mallettico. Sinon, demandez-en une nouvelle à la personne qui vous l’a envoyée.'
              : 'Elle a peut-être déjà été acceptée, ou elle a expiré (7 jours). Connectez-vous, ou demandez-en une nouvelle à la personne qui vous l’a envoyée.'}
          </p>
          {user ? (
            <Bouton variante="principal" pleineLargeur iconeFin={ArrowRight} onClick={ouvrirApp}>Ouvrir Mallettico</Bouton>
          ) : (
            <Bouton variante="principal" pleineLargeur icone={LogIn} onClick={() => { window.location.href = '/connexion'; }}>Se connecter</Bouton>
          )}
        </div>
      </Cadre>
    );
  }

  const nomEquipe = invitation?.organization_name || 'l’équipe';
  const role = invitation?.role;

  if (accepted) {
    return (
      <Cadre>
        <div className="text-center">
          <CheckCircle size={40} className="text-succes-texte mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-lg font-bold text-encre mb-2">Vous faites partie de l’équipe</h1>
          <p className="text-sm text-encre-2 mb-1">
            Vous avez rejoint <strong className="text-encre">{nomEquipe}</strong> en tant que{' '}
            <strong className="text-encre">{getRoleLabel(role)}</strong>.
          </p>
          {getRoleDescription(role) && <p className="text-sm text-encre-3 mb-6">{getRoleDescription(role)}.</p>}
          <Bouton variante="principal" pleineLargeur iconeFin={ArrowRight} onClick={ouvrirApp}>
            Ouvrir {nomEquipe}
          </Bouton>
        </div>
      </Cadre>
    );
  }

  return (
    <Cadre>
      <div className="text-center mb-5">
        <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto mb-3">
          <Users size={24} className="text-encre-2" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-encre">Rejoindre {nomEquipe}</h1>
        {invitation?.invited_by_email && (
          <p className="text-sm text-encre-2 mt-1">Invitation de {invitation.invited_by_email}</p>
        )}
      </div>

      <div className="rounded-xl bg-surface-2 p-4 mb-5">
        <p className="text-sm text-encre-3">Votre rôle</p>
        <p className="text-base font-semibold text-encre">{getRoleLabel(role)}</p>
        {getRoleDescription(role) && <p className="text-sm text-encre-2 mt-1">{getRoleDescription(role)}.</p>}
      </div>

      {erreurLien && (
        <div role="alert" className="mb-4 rounded-xl bg-danger-fond text-danger-texte text-sm p-3">{erreurLien}</div>
      )}

      {user ? (
        <div className="space-y-3">
          <p className="text-sm text-encre-2 text-center">
            Connecté avec <strong className="text-encre break-all">{user.email}</strong>
          </p>
          <Bouton variante="principal" taille="grande" pleineLargeur icone={CheckCircle} chargement={accepting} onClick={handleAccept}>
            Rejoindre l’équipe
          </Bouton>
          <div className="flex flex-wrap justify-center gap-x-2">
            <Bouton variante="discret" onClick={changerDeCompte}>Ce n’est pas vous ? Changer de compte</Bouton>
            <Bouton variante="discret" onClick={pasMaintenant}>Pas maintenant</Bouton>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <ol className="text-sm text-encre-2 space-y-1.5 mb-4 list-decimal pl-5">
            <li>Créez votre compte (gratuit) avec votre adresse e-mail.</li>
            <li>Ouvrez le lien de confirmation reçu par e-mail : il vous ramène ici.</li>
            <li>Touchez « Rejoindre l’équipe ».</li>
          </ol>
          <Bouton variante="principal" taille="grande" pleineLargeur icone={UserPlus} onClick={() => allerVers('/inscription')}>
            Créer mon compte
          </Bouton>
          <Bouton variante="secondaire" pleineLargeur icone={LogIn} onClick={() => allerVers('/connexion')}>
            J’ai déjà un compte
          </Bouton>
        </div>
      )}

      <p className="text-xs text-encre-3 text-center mt-6">
        Invitation valable jusqu’au {invitation?.expires_at ? dateLue(invitation.expires_at).toLocaleDateString('fr-FR') : '—'}
      </p>
    </Cadre>
  );
}
