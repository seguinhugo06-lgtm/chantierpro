/**
 * Les délais des scénarios de relance proposés par l'application (`src/lib/scenariosRelance.js`), dits en texte pour
 * le site : la FAQ et les pages de fonctionnalités les lisent ici, jamais recopiés. Testé dans
 * `__tests__/delaisRelance.test.js`.
 */
export { DEFAULT_DEVIS_STEPS, DEFAULT_FACTURE_STEPS } from '../../../lib/scenariosRelance';

/** « J+7, J+15 et J+30 » : tous les délais d'un scénario, dans l'ordre. */
export function delais(etapes) {
  const j = (etapes || []).map((e) => `J+${e.delay}`);
  return j.length > 1 ? `${j.slice(0, -1).join(', ')} et ${j[j.length - 1]}` : j[0] || '';
}

/** « de J+3 à J+45 » : le premier et le dernier délai d'un scénario. */
export function bornes(etapes) {
  const j = (etapes || []).map((e) => e.delay);
  if (!j.length) return '';
  return j.length > 1 ? `de J+${j[0]} à J+${j[j.length - 1]}` : `à J+${j[0]}`;
}
