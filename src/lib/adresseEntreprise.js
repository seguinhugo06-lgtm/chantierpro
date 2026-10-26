/**
 * Adresse du siège de l'entreprise, saisie en trois champs : adresse (numéro et rue), code postal, ville.
 *
 * Retours d'Hugo sur son compte (21-23 oct. 2026) : l'assistant de démarrage montrait « 127 cours du Médoc33300Bordeaux ».
 * L'adresse était une seule zone de texte sur plusieurs lignes dans Paramètres, et un champ d'une ligne dans
 * l'assistant : le champ d'une ligne effaçait le retour à la ligne, et une saisie y collait la rue au code postal.
 *
 * Stockage, sans migration :
 * - `adresse` (colonne adresse) garde l'adresse complète, sur plusieurs lignes : la rue, puis « code postal ville ».
 *   C'est ce que lisent depuis toujours les deux générateurs de devis et de factures, les autres documents
 *   (mise en demeure, rétractation, Factur-X), les fonctions serveur (relances, rappels) et les pages publiques :
 *   aucun n'a à changer ;
 * - `codePostal` et `ville` (colonnes code_postal, ville) sont écrits en plus, pour les lecteurs qui les joignent à
 *   l'adresse : ceux-là passent par `adresseComplete`, qui ne répète pas la ligne « code postal ville ».
 *
 * Relecture d'une adresse plus ancienne (colonnes vides) : la dernière ligne « 33300 Bordeaux » donne le code postal
 * et la ville ; à défaut, une adresse d'une ligne qui se termine par cinq chiffres et un nom de ville (« 3 RUE DES
 * LILAS 33000 BORDEAUX », réponse du répertoire SIRENE, ou « …Médoc33300Bordeaux ») est coupée au code postal.
 * Les lignes qui suivent la ligne de la ville (« FRANCE ») sont gardées telles quelles, à leur place.
 */

const nettoyer = (v) => String(v ?? '').trim();
const LIGNE_CP = /^(\d{5})(?:\s+(.*))?$/;
const COLLE = /^(.*?\S)[\s,]*(\d{5})\s*([^\d\n]*[^\d\s\n,][^\d\n]*)$/;
const normaliser = (s) => nettoyer(s).replace(/\s+/g, ' ').toLowerCase();

/**
 * Les trois champs (et ce qui suit la ligne de la ville) d'une fiche entreprise.
 * @returns {{ rue: string, codePostal: string, ville: string, suite: string }}
 */
export function champsAdresse(entreprise) {
  const e = entreprise || {};
  const lignes = String(e.adresse ?? '').replace(/\r/g, '').split('\n').map(nettoyer).filter(Boolean);
  const cp = nettoyer(e.codePostal ?? e.code_postal);
  const ville = nettoyer(e.ville);

  if (cp || ville) {
    // Colonnes renseignées : la ligne « code postal ville » de l'adresse complète est retirée de la rue
    const attendue = normaliser(`${cp} ${ville}`);
    let i = -1;
    for (let k = lignes.length - 1; k >= 0; k--) {
      const m = LIGNE_CP.exec(lignes[k]);
      if (normaliser(lignes[k]) === attendue || (cp && m && m[1] === cp)) { i = k; break; }
    }
    if (i === -1) return { rue: lignes.join('\n'), codePostal: cp, ville, suite: '' };
    return { rue: lignes.slice(0, i).join('\n'), codePostal: cp, ville, suite: lignes.slice(i + 1).join('\n') };
  }

  for (let k = lignes.length - 1; k >= 0; k--) {
    const m = LIGNE_CP.exec(lignes[k]);
    if (m) return { rue: lignes.slice(0, k).join('\n'), codePostal: m[1], ville: nettoyer(m[2]), suite: lignes.slice(k + 1).join('\n') };
  }
  const derniere = lignes.length - 1;
  const m = derniere >= 0 ? COLLE.exec(lignes[derniere]) : null;
  if (m) {
    return { rue: [...lignes.slice(0, derniere), nettoyer(m[1]).replace(/,$/, '')].join('\n'), codePostal: m[2], ville: nettoyer(m[3]), suite: '' };
  }
  return { rue: lignes.join('\n'), codePostal: '', ville: '', suite: '' };
}

/** L'adresse complète, sur plusieurs lignes : la rue, « code postal ville », puis la suite éventuelle. */
export function adresseComposee({ rue = '', codePostal = '', ville = '', suite = '' } = {}) {
  const ligneVille = [nettoyer(codePostal), nettoyer(ville)].filter(Boolean).join(' ');
  return [String(rue ?? '').replace(/\r/g, '').split('\n').map(nettoyer).filter(Boolean).join('\n'), ligneVille, nettoyer(suite)]
    .filter(Boolean)
    .join('\n');
}

/** L'adresse complète d'une fiche, quelle que soit sa forme d'enregistrement (sans répéter le code postal ni la ville). */
export function adresseComplete(entreprise) {
  return adresseComposee(champsAdresse(entreprise));
}

/**
 * Les champs à enregistrer quand l'artisan modifie l'un des trois champs (`champ` : 'rue' | 'codePostal' | 'ville').
 * `adresse` est l'adresse complète (lue par les documents), `codePostal` et `ville` les colonnes.
 */
export function majAdresse(entreprise, champ, valeur) {
  const a = { ...champsAdresse(entreprise), [champ]: valeur };
  return { adresse: adresseComposee(a), codePostal: nettoyer(a.codePostal), ville: nettoyer(a.ville) };
}
