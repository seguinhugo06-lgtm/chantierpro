/**
 * Interrupteurs de fonctionnalités.
 *
 * ia — la dictée vocale (analysée par Claude) et toute mention « IA » dans
 * l'application et sur le site. Éteint tant que la fonction n'est pas prête
 * pour de vrais clients : rien n'est supprimé, tout est seulement masqué.
 * Passer à `true` pour tout réafficher.
 *
 * facturesSituation — « Générer facture » et l'impression d'une situation de travaux. Éteint le 10 oct. 2026
 * (relecture juridique) : le générateur n'imprime pas le numéro de facture, imprime un net à payer différent
 * du montant enregistré, applique une retenue de 5 % d'office et facture la TVA d'une micro-entreprise. Le
 * suivi de l'avancement reste disponible. À rallumer avec la tâche [situations-conformes].
 *
 * portailClient — le lien du portail client et la page publique du portail. Éteint le 10 oct. 2026 (recette) :
 * en production, aucun lien n'a jamais été enregistré (la base refuse en silence, l'app disait « Lien portail
 * copié ! »), un visiteur ne peut rien lire, et sans données le portail montrait une entreprise fictive
 * (« Martin Rénovation », faux téléphone, faux lien d'avis). À rallumer avec la tâche [portail-client].
 */
export const FONCTIONS = Object.freeze({
  ia: false,
  facturesSituation: false,
  portailClient: false,
});

export default FONCTIONS;
