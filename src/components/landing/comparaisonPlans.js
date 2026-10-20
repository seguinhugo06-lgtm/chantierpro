/**
 * comparaisonPlans — les lignes du tableau « Comparer les plans en détail », construites depuis `PLANS`
 * (src/stores/subscriptionStore.js, décision D-29) : aucune ligne n'est écrite en dur dans le site.
 *
 * Deux groupes :
 *   - Limites : les cinq ressources dont la limite est réellement appliquée par l'application (devis par mois,
 *     clients, chantiers, photos de chantier, collaborateurs invités ; `autoriserCreation` de DataContext, la limite de
 *     photos de Chantiers.jsx et le plafond d'équipe de TeamManagement.jsx). Les valeurs sont celles de `limits` :
 *     -1 se lit « Illimité », la limite d'équipe ne compte pas le titulaire (« Vous + 1 »).
 *     Les autres clés de `limits` (catalogue, signatures : illimitées partout ; stockage : non appliquée ; ressource
 *     d'une fonction éteinte) n'ont pas de ligne : une limite annoncée est une limite appliquée.
 *   - Fonctions : les libellés de `featureLabels` qui ne disent pas une limite. Un plan dont la liste commence par
 *     « Tout le plan … » reprend toutes les fonctions du plan précédent ; sinon il n'a que les siennes. Chaque
 *     fonction est donc incluse à partir du plan qui l'annonce.
 *
 * Un libellé « dit une limite » quand il nomme une des ressources ci-dessus ET porte une quantité (un chiffre,
 * « illimité » ou « Vous + ») : « 5 devis par mois » est une limite, « Signature en ligne des devis » est une fonction.
 * Le test `comparaisonPlans.test.js` fige le résultat pour les plans d'aujourd'hui : un libellé ajouté à `PLANS`
 * que cette règle classerait de travers fait échouer le test, il ne disparaît pas du tableau en silence.
 */

/** Ressources limitées : clé de `limits`, ligne du tableau, mot qui la désigne dans les libellés. */
export const LIMITES_AFFICHEES = [
  { cle: 'devis', libelle: 'Devis', mot: /devis/i },
  { cle: 'clients', libelle: 'Clients', mot: /clients?/i },
  { cle: 'chantiers', libelle: 'Chantiers', mot: /chantiers?/i },
  { cle: 'photos', libelle: 'Photos de chantier', mot: /photos?/i },
  { cle: 'equipe', libelle: 'Collaborateurs', mot: /collaborateurs?/i },
];

const HERITE_DU_PRECEDENT = /^tout le plan\b/i;
const PORTE_UNE_QUANTITE = /\d|illimit|^vous \+/i;

/** Vrai quand le libellé annonce une limite chiffrée (ou son absence) d'une des ressources limitées. */
export function ditUneLimite(nom) {
  return LIMITES_AFFICHEES.some((l) => l.mot.test(nom)) && PORTE_UNE_QUANTITE.test(nom);
}

/** « 5 par mois », « 10 », « Vous + 1 », « Illimité » : la valeur de `limits` telle qu'on la lit. */
export function valeurDeLimite(cle, valeur) {
  if (valeur < 0) return 'Illimité';
  if (cle === 'equipe') return `Vous + ${valeur}`;
  if (cle === 'devis') return `${valeur} par mois`;
  return String(valeur);
}

/**
 * @param {Record<string, object>} plans  `PLANS`
 * @param {string[]} ordre                `PLAN_ORDER`
 * @returns {{
 *   plans: { id: string, nom: string }[],
 *   limites: { cle: string, libelle: string, valeurs: string[] }[],
 *   fonctions: { libelle: string, inclus: boolean[] }[],
 * }}
 */
export function lignesDeComparaison(plans, ordre) {
  const liste = ordre.map((id) => plans[id]).filter(Boolean);

  const limites = LIMITES_AFFICHEES.map(({ cle, libelle }) => ({
    cle,
    libelle,
    valeurs: liste.map((plan) => valeurDeLimite(cle, plan.limits?.[cle] ?? 0)),
  }));

  // Fonctions de chaque plan, cumulées quand sa liste commence par « Tout le plan … »
  const libellesDesFonctions = [];
  const cumuls = [];
  liste.forEach((plan, i) => {
    const labels = (plan.featureLabels || []).filter((f) => f.included);
    const propres = labels.map((f) => f.name).filter((nom) => !HERITE_DU_PRECEDENT.test(nom) && !ditUneLimite(nom));
    const herite = i > 0 && labels.some((f) => HERITE_DU_PRECEDENT.test(f.name));
    cumuls.push(new Set([...(herite ? cumuls[i - 1] : []), ...propres]));
    for (const nom of propres) {
      if (!libellesDesFonctions.includes(nom)) libellesDesFonctions.push(nom);
    }
  });
  const fonctions = libellesDesFonctions.map((libelle) => ({ libelle, inclus: cumuls.map((c) => c.has(libelle)) }));

  return { plans: liste.map((p) => ({ id: p.id, nom: p.name })), limites, fonctions };
}
