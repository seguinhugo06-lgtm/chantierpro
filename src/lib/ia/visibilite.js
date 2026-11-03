/**
 * Quand le prototype de l'assistant (« Demander ») s'affiche — bouton, Ctrl+J et fenêtre (App.jsx).
 *
 * Décision en attente Q-ia-demo (option « cache », recommandée) : le prototype n'existe que pour qui le demande.
 *   - `FONCTIONS.assistant` : son propre interrupteur, éteint. Il ne dépend PAS de `FONCTIONS.ia` : rallumer la
 *     dictée du socle ne doit pas ouvrir l'assistant aux vrais comptes (pas d'écran d'accord, pas de fonction Edge,
 *     pas de textes légaux pour lui).
 *   - sinon, seulement en démonstration ET avec `?apercu=ia` dans l'adresse : un visiteur qui suit « Voir la démo »
 *     du site (`/?demo=true`) ne le voit pas (D-07, aucune mention de l'IA sur le site tant qu'elle est éteinte).
 */
import { FONCTIONS } from '../fonctions';

/** `?apercu=ia` dans l'adresse. */
export function apercuIaDemande(recherche = '') {
  try {
    return new URLSearchParams(recherche).get('apercu') === 'ia';
  } catch {
    return false;
  }
}

/**
 * @param {{ fonctions?: { assistant?: boolean }, demo?: boolean, recherche?: string }} contexte
 * @returns {boolean}
 */
export function assistantVisible({ fonctions = FONCTIONS, demo = false, recherche = '' } = {}) {
  if (fonctions.assistant === true) return true;
  return demo === true && apercuIaDemande(recherche);
}
