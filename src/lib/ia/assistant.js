/**
 * Point d'entrée unique de l'assistant : démo → simulateur local ; sinon → fonction Edge (contrat.js).
 *
 * Nom de la fonction : `assistant`, le nom que le socle (`cloud/ia-socle`, regles.ts) réserve déjà dans son compteur
 * (`usage_ia_log.fonction`) et qu'il refuse tant qu'aucun quota n'est décidé (Q-ia-gratuit). La fonction Edge
 * n'existe pas encore : étendre `voice-intent` ou créer `assistant` sur le même socle reste à arbitrer par Hugo.
 * Tant que `FONCTIONS.assistant` est éteint, aucun appel ne part hors démo : pas de « souci technique » trompeur
 * vers une fonction absente.
 */
import { supabase, isDemo } from '../../supabaseClient';
import { captureException } from '../sentry';
import { FONCTIONS } from '../fonctions';
import { construireRequete, lireReponse, erreurContrat, ERREURS, DELAI_MS } from './contrat';
import { comprendreDemo } from './simulateur';

export const FONCTION_EDGE = 'assistant';

/**
 * @param {object} entree — { texte, source, page, clients, chantiers, equipe, reponses, organisation }
 * @param {{ demo?: boolean, actif?: boolean, invoquer?: Function, enLigne?: boolean, delaiDemo?: number }} [options]
 *   injections pour les tests
 */
export async function comprendre(entree, options = {}) {
  const requete = construireRequete(entree);
  if (!requete.texte) return erreurContrat(ERREURS.VIDE);
  const demo = options.demo ?? isDemo;
  if (demo) {
    // Petit délai : l'artisan voit l'état « je prépare » comme avec le vrai service
    await new Promise((r) => setTimeout(r, options.delaiDemo ?? 350));
    return lireReponse(comprendreDemo(requete.texte, requete.repere), requete.repere);
  }
  const actif = options.actif ?? FONCTIONS.assistant;
  if (!actif) return erreurContrat(ERREURS.COUPURE);
  const enLigne = options.enLigne ?? (typeof navigator === 'undefined' || navigator.onLine !== false);
  if (!enLigne) return erreurContrat(ERREURS.HORS_LIGNE);
  const invoquer = options.invoquer || ((corps) => supabase.functions.invoke(FONCTION_EDGE, { body: corps }));
  let minuteur;
  try {
    const delai = new Promise((resolve) => { minuteur = setTimeout(() => resolve({ delai: true }), DELAI_MS); });
    const r = await Promise.race([invoquer(requete), delai]);
    if (r?.delai) return erreurContrat(ERREURS.LENT);
    // supabase-js ne lève pas : l'erreur est dans `error` (code HTTP ≠ 2xx) et le corps porte `{ error, code }` (socle)
    if (r?.error) {
      const corps = await Promise.resolve(r.error.context?.json?.()).catch(() => null);
      if (corps?.code) {
        if (corps.code !== ERREURS.QUOTA) captureException(r.error, { tags: { module: 'assistant' }, extra: { code: corps.code } });
        return erreurContrat(corps.code);
      }
      captureException(r.error, { tags: { module: 'assistant' } });
      return erreurContrat(ERREURS.PANNE);
    }
    return lireReponse(r?.data, requete.repere);
  } catch (e) {
    captureException(e, { tags: { module: 'assistant' } });
    return erreurContrat(ERREURS.PANNE);
  } finally {
    clearTimeout(minuteur);
  }
}
