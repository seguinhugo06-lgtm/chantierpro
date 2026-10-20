/**
 * L'objet du message d'une relance envoyée par l'app (moteur côté navigateur, src/lib/relanceEngine.js) : l'objet de
 * l'étape s'il y en a un, sinon « Relance : Devis <numéro> » (ou « Facture »), variables résolues.
 *
 * Fonction partagée avec le site public (exemple « Relances » de « Les fonctionnalités en action ») ; module à part,
 * léger, pour que le moteur ne tire pas les modèles de message (src/lib/scenariosRelance.js) dans le premier chargement.
 * La tâche programmée (supabase/functions/send-scheduled-relances, en Deno, qui ne lit pas src/) applique la même
 * règle. Test : src/lib/__tests__/scenariosRelance.test.js.
 */
import { resolveVariables } from './relanceUtils';

/**
 * @param {object} etape une étape d'un scénario (`objet_email` facultatif)
 * @param {object} doc le devis ou la facture relancé
 * @param {object} client
 * @param {object} entreprise
 * @returns {string}
 */
export function objetDeRelance(etape, doc, client, entreprise) {
  return resolveVariables(
    etape?.objet_email || `Relance : ${doc?.type === 'facture' ? 'Facture' : 'Devis'} ${doc?.numero}`,
    doc, client, entreprise,
  );
}

export default objetDeRelance;
