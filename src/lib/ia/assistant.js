/**
 * Point d'entrée unique de l'assistant : démo → simulateur local ; sinon → fonction Edge (contrat.js).
 * Le nom de la fonction Edge est provisoire : la session `cloud/ia-socle` le fixe ; seul ce fichier change alors.
 */
import { supabase, isDemo } from '../../supabaseClient';
import { captureException } from '../sentry';
import { construireRequete, lireReponse, ERREURS, MESSAGES_ERREUR, DELAI_MS } from './contrat';
import { comprendreDemo } from './simulateur';

export const FONCTION_EDGE = 'assistant';

const erreur = (code) => ({ ok: false, code, message: MESSAGES_ERREUR[code] });

/**
 * @param {object} entree — { texte, source, page, clients, chantiers, equipe, reponses }
 * @param {{ demo?: boolean, invoquer?: Function, enLigne?: boolean }} [options] — injections pour les tests
 */
export async function comprendre(entree, options = {}) {
  const requete = construireRequete(entree);
  if (!requete.texte) return erreur(ERREURS.REFUS);
  const demo = options.demo ?? isDemo;
  if (demo) {
    // Petit délai : l'artisan voit l'état « je prépare » comme avec le vrai service
    await new Promise((r) => setTimeout(r, options.delaiDemo ?? 350));
    return lireReponse(comprendreDemo(requete.texte, requete.repere), requete.repere);
  }
  const enLigne = options.enLigne ?? (typeof navigator === 'undefined' || navigator.onLine !== false);
  if (!enLigne) return erreur(ERREURS.HORS_LIGNE);
  const invoquer = options.invoquer || ((corps) => supabase.functions.invoke(FONCTION_EDGE, { body: corps }));
  let minuteur;
  try {
    const delai = new Promise((resolve) => { minuteur = setTimeout(() => resolve({ delai: true }), DELAI_MS); });
    const r = await Promise.race([invoquer(requete), delai]);
    if (r?.delai) return erreur(ERREURS.LENT);
    // supabase-js ne lève pas : l'erreur est dans `error` (code HTTP ≠ 2xx) et le corps peut porter le code du contrat
    if (r?.error) {
      const corps = await r.error.context?.json?.().catch(() => null);
      if (corps?.code) return lireReponse({ ok: false, code: corps.code }, requete.repere);
      captureException(r.error, { tags: { module: 'assistant' } });
      return erreur(ERREURS.PANNE);
    }
    return lireReponse(r?.data, requete.repere);
  } catch (e) {
    captureException(e, { tags: { module: 'assistant' } });
    return erreur(ERREURS.PANNE);
  } finally {
    clearTimeout(minuteur);
  }
}
