/**
 * Interrupteurs de fonctionnalités.
 *
 * ia — la dictée vocale (analysée par Claude) et toute mention « IA » dans
 * l'application et sur le site. Éteint tant que la fonction n'est pas prête
 * pour de vrais clients : rien n'est supprimé, tout est seulement masqué.
 * Passer à `true` pour tout réafficher.
 */
export const FONCTIONS = Object.freeze({
  ia: false,
});

export default FONCTIONS;
