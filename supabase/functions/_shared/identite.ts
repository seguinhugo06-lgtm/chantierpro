/**
 * Nom de l'entreprise tel qu'il figure sur ses correspondances : un entrepreneur individuel porte la mention « EI »
 * (« EIRL ») juste après son nom (C. com. R526-27). Copie, pour les fonctions Edge, de `nomImprime` de
 * src/lib/identiteEntreprise.js (même règle, mêmes résultats : src/lib/__tests__/identiteServeur.test.js).
 * Sans import distant : testable sous vitest. Relecture juriste-btp du 17 oct. 2026 (l'accusé de rétractation et
 * l'exemplaire signé partaient sans « EI » quand le serveur les envoyait).
 */

export interface Identite {
  nom?: string | null;
  forme_juridique?: string | null;
  formeJuridique?: string | null;
  nomEntrepreneur?: string | null;
}

const sansAccent = (t: unknown) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();

const formeDe = (e: Identite) => String(e?.formeJuridique || e?.forme_juridique || '').trim();

export function estEirl(e: Identite): boolean {
  const n = sansAccent(formeDe(e));
  return n === 'eirl' || (n.includes('responsabilite limitee') && n.includes('entrepreneur individuel'));
}

export function estEntrepreneurIndividuel(e: Identite): boolean {
  if (estEirl(e)) return false;
  const n = sansAccent(formeDe(e));
  return n === 'ei' || n.startsWith('entreprise individuelle') || n.startsWith('entrepreneur individuel')
    || n.includes('micro') || n.includes('auto entrepreneur') || n.includes('autoentrepreneur');
}

const echapperRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function nomImprime(e: Identite): string {
  const nom = String(e?.nom || '').trim();
  const eirl = estEirl(e);
  if (!eirl && !estEntrepreneurIndividuel(e)) return nom;
  const mention = eirl ? 'EIRL' : 'EI';
  const dejaMentionne = eirl
    ? /(^|[\s(,])EIRL($|[\s).,])|entrepreneur individuel à responsabilité limitée/i
    : /(^|[\s(,])EI($|[\s).,])|entrepreneur individuel/i;
  if (dejaMentionne.test(nom)) return nom;
  const personne = String(e?.nomEntrepreneur || '').trim();
  if (!personne) return nom ? `${nom} ${mention}` : '';
  if (!nom || sansAccent(nom) === sansAccent(personne)) return `${personne} ${mention}`;
  const dansLeNom = new RegExp(echapperRegex(personne), 'i').exec(nom);
  if (dansLeNom) {
    const fin = dansLeNom.index + dansLeNom[0].length;
    return `${nom.slice(0, fin)} ${mention}${nom.slice(fin)}`;
  }
  return `${nom} — ${personne} ${mention}`;
}
