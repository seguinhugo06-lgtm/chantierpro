/**
 * Clés du stockage de l'appareil propres au compte connecté : effacées à la déconnexion (src/supabaseClient.js, signOut).
 * Sur un téléphone partagé, le compte suivant ne doit ni les voir ni les reprendre.
 *
 * - recherches récentes, copie de la fiche entreprise, invitation en attente (avant le 26 oct. 2026) ;
 * - Équipe (relecture sécurité du 26 oct. 2026, S4) : congés, signatures de semaine, messages et épingles de « Contacter »,
 *   chronos de terrain et chrono en cours ;
 * - Paramètres › Post-chantier : la séquence de messages.
 *
 * Toute nouvelle donnée de compte gardée sur l'appareil s'ajoute ici (src/lib/__tests__/deconnexion.test.js vérifie que
 * chaque clé est bien celle qu'écrit son écran).
 */
export const CLES_PROPRES_AU_COMPTE = [
  'mallettico_recent_items', 'cp_entreprise', 'cp_entreprises', 'cp_pending_invitation',
  'mallettico_conges', 'mallettico_signatures', 'mallettico_chat', 'mallettico_chat_pins',
  'cp_terrain_timers', 'mallettico_equipe_timer', 'cp_post_chantier_sequence',
];
