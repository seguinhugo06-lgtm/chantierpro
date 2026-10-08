import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  CLE_SERVEUR, clientUtilisateur, envoyerResend, journaliser, libererEnvoi, limiteJour, reserverEnvoi, utilisateurDuJeton,
} from '../_shared/branchements.ts';
import { motifRechercheClient, traiterDemande } from './envoi.ts';

/**
 * send-email — envoi d'un e-mail via Resend, depuis noreply@mallettico.fr.
 *
 * Action unique : send_email { to, subject, html?, text?, from_name?, reply_to?, attachments? }.
 * Appelants : l'app (devis, factures, reçus, relances manuelles, invitation au
 * portail, retours vers l'équipe) avec le jeton de l'utilisateur, et
 * send-scheduled-relances avec la clé de service.
 *
 * Les règles (destinataires autorisés, plafond, pièces jointes) sont dans
 * envoi.ts ; ce fichier ne fait que les brancher sur Supabase et Resend.
 * Chaque réponse, erreurs comprises, porte corsHeaders (posés par envoi.ts).
 * Plafond : secret EMAIL_LIMITE_JOUR (défaut 50 destinataires par 24 h et par
 * compte), compteur de la migration 077.
 */

serve((req) => traiterDemande(req, {
  expediteur: Deno.env.get('FROM_EMAIL') || 'noreply@mallettico.fr',
  cleResend: Deno.env.get('RESEND_API_KEY') || undefined,
  cleServeur: CLE_SERVEUR || undefined,
  limiteJour: limiteJour(),
  utilisateur: utilisateurDuJeton,

  // Lecture AVEC le jeton de l'utilisateur : la RLS de `clients` décide de ce qu'il voit.
  async emailsClients(jeton, adresse) {
    const { data, error } = await clientUtilisateur(jeton)
      .from('clients')
      .select('email')
      .ilike('email', motifRechercheClient(adresse))
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data || []).map((ligne: { email: string | null }) => ligne.email || '');
  },

  reserver: reserverEnvoi,
  liberer: libererEnvoi,
  envoyer: envoyerResend,
  journal: journaliser('send-email'),
}));
