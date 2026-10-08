import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import {
  admin, CLE_SERVEUR, clientUtilisateur, envoyerResend, journaliser, libererEnvoi, limiteJour, reserverEnvoi, utilisateurDuJeton,
} from '../_shared/branchements.ts';
import { traiterCycle, type Invitation } from './cycle.ts';

/**
 * send-lifecycle-email — e-mails de cycle de vie via Resend, signés « Mallettico ».
 *
 *   - welcome     : un utilisateur connecté, à sa propre adresse, une fois (app, première connexion)
 *   - invitation  : l'auteur d'une invitation d'équipe (TeamManagement), d'après la base
 *   - trial_ending, trial_expired, payment_success, payment_failed : clé de service seulement
 *
 * Les règles sont dans cycle.ts, les modèles dans modeles.ts ; ce fichier ne
 * fait que les brancher sur Supabase et Resend. Chaque réponse, erreurs
 * comprises, porte corsHeaders (posés par cycle.ts).
 * Secrets : RESEND_API_KEY, FROM_EMAIL (facultatif), EMAIL_LIMITE_JOUR (facultatif).
 */

serve((req) => traiterCycle(req, {
  expediteur: Deno.env.get('FROM_EMAIL') || 'noreply@mallettico.fr',
  cleResend: Deno.env.get('RESEND_API_KEY') || undefined,
  cleServeur: CLE_SERVEUR || undefined,
  limiteJour: limiteJour(),
  utilisateur: utilisateurDuJeton,

  async invitation(jeton, id) {
    const { data, error } = await clientUtilisateur(jeton)
      .from('invitations')
      .select('email, token, role, status, expires_at, organization_id, invited_by')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Invitation | null) ?? null;
  },

  async nomOrganisation(jeton, id) {
    const { data, error } = await clientUtilisateur(jeton).from('organizations').select('name').eq('id', id).maybeSingle();
    if (error) return null;
    return (data?.name as string | undefined) ?? null;
  },

  // app_metadata : seul le serveur l'écrit (l'utilisateur ne peut pas effacer la marque) ; fusionné, pas remplacé.
  async marquerBienvenue(userId, quand) {
    const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { bienvenue_envoyee_le: quand } });
    if (error) throw new Error(error.message);
  },

  reserver: reserverEnvoi,
  liberer: libererEnvoi,
  envoyer: envoyerResend,
  journal: journaliser('send-lifecycle-email'),
}));
