/**
 * Adresse complète du siège d'une entreprise, sans répéter le code postal ni la ville. Copie, pour les fonctions Edge,
 * de `adresseComplete` de src/lib/adresseEntreprise.js (même règle, mêmes résultats :
 * src/lib/__tests__/adresseServeur.test.js). Sans import distant : testable sous vitest.
 *
 * Depuis le 26 oct. 2026, Paramètres enregistre l'adresse en trois champs : la colonne `adresse` garde l'adresse
 * complète (la rue, puis « code postal ville »), et `code_postal` / `ville` sont écrits en plus. Joindre les trois
 * répéterait « 33300 Bordeaux » ; une fiche plus ancienne (rue seule dans `adresse`, ou colonnes vides) reste lue
 * comme avant.
 */

export interface AdresseEntreprise {
  adresse?: string | null;
  code_postal?: string | null;
  codePostal?: string | null;
  ville?: string | null;
}

const nettoyer = (v: unknown) => String(v ?? '').trim();
const LIGNE_CP = /^(\d{5})(?:\s+(.*))?$/;
const COLLE = /^(.*?\S)[\s,]*(\d{5})\s*([^\d\n]*[^\d\s\n,][^\d\n]*)$/;
// COLLE coûte un temps quadratique sur une très longue ligne (relecture sécurité du 26 oct. 2026 : 80 ko, 5,6 s, le
// passage quotidien des rappels aurait été coupé) : jamais au-delà de 200 caractères, et l'entrée est tronquée à 500.
const LONGUEUR_LIGNE_COLLEE_MAX = 200;
const LONGUEUR_ADRESSE_MAX = 500;
const colle = (ligne: string) => (ligne.length <= LONGUEUR_LIGNE_COLLEE_MAX ? COLLE.exec(ligne) : null);
const normaliser = (s: string) => nettoyer(s).replace(/\s+/g, ' ').toLowerCase();

function champsAdresse(e: AdresseEntreprise) {
  const lignes = String(e?.adresse ?? '').slice(0, LONGUEUR_ADRESSE_MAX).replace(/\r/g, '').split('\n').map(nettoyer).filter(Boolean);
  const cp = nettoyer(e?.codePostal ?? e?.code_postal);
  const ville = nettoyer(e?.ville);

  if (cp || ville) {
    const attendue = normaliser(`${cp} ${ville}`);
    let i = -1;
    for (let k = lignes.length - 1; k >= 0; k--) {
      const m = LIGNE_CP.exec(lignes[k]);
      if (normaliser(lignes[k]) === attendue || (cp && m && m[1] === cp)) { i = k; break; }
    }
    if (i === -1) {
      // Adresse collée (« …Médoc33300Bordeaux ») avec les colonnes déjà remplies : la ville n'est pas répétée
      const derniere = lignes.length - 1;
      const m = derniere >= 0 ? colle(lignes[derniere]) : null;
      if (m && cp && m[2] === cp) {
        return { rue: [...lignes.slice(0, derniere), nettoyer(m[1]).replace(/,$/, '')].join('\n'), codePostal: cp, ville, suite: '' };
      }
      return { rue: lignes.join('\n'), codePostal: cp, ville, suite: '' };
    }
    return { rue: lignes.slice(0, i).join('\n'), codePostal: cp, ville, suite: lignes.slice(i + 1).join('\n') };
  }

  for (let k = lignes.length - 1; k >= 0; k--) {
    const m = LIGNE_CP.exec(lignes[k]);
    if (m) return { rue: lignes.slice(0, k).join('\n'), codePostal: m[1], ville: nettoyer(m[2]), suite: lignes.slice(k + 1).join('\n') };
  }
  const derniere = lignes.length - 1;
  const m = derniere >= 0 ? colle(lignes[derniere]) : null;
  if (m) {
    return { rue: [...lignes.slice(0, derniere), nettoyer(m[1]).replace(/,$/, '')].join('\n'), codePostal: m[2], ville: nettoyer(m[3]), suite: '' };
  }
  return { rue: lignes.join('\n'), codePostal: '', ville: '', suite: '' };
}

/** L'adresse complète, sur plusieurs lignes : la rue, « code postal ville », puis la suite éventuelle. */
export function adresseComplete(e: AdresseEntreprise): string {
  const { rue, codePostal, ville, suite } = champsAdresse(e || {});
  const ligneVille = [nettoyer(codePostal), nettoyer(ville)].filter(Boolean).join(' ');
  return [String(rue ?? '').replace(/\r/g, '').split('\n').map(nettoyer).filter(Boolean).join('\n'), ligneVille, nettoyer(suite)]
    .filter(Boolean)
    .join('\n');
}
