/**
 * Nom et forme de l'entreprise tels qu'imprimés sur les devis, factures, avoirs et e-mails.
 *
 * Entrepreneur individuel (EI, micro-entreprise) : sur ses documents, son « nom ou nom d'usage » est « précédé
 * ou suivi immédiatement » des mots « entrepreneur individuel » ou des initiales « EI » (C. com. art. R526-27,
 * pris pour l'art. L526-22 issu de la loi n° 2022-172 du 14 févr. 2022). C'est le nom de la PERSONNE qui porte
 * la mention, pas le nom commercial : « Hugo Séguin — Électricien EI » accolait EI au métier (relecture
 * juridique du 10 oct. 2026). D'où le réglage « nomEntrepreneur » (prénom et nom), imprimé « Hugo Séguin EI ».
 * L'EIRL (régime fermé aux créations depuis 2022, encore porté par des entreprises existantes) a la même
 * exigence avec « EIRL » (ancien art. L526-6).
 */

const sansAccent = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();

const formeDe = (entreprise) => String(entreprise?.formeJuridique || entreprise?.forme_juridique || '').trim();

/** L'entreprise est une EIRL (mention « EIRL » à côté du nom). */
export function estEirl(entreprise) {
  const n = sansAccent(formeDe(entreprise));
  return n === 'eirl' || (n.includes('responsabilite limitee') && n.includes('entrepreneur individuel'));
}

/** L'entreprise est une entreprise individuelle (EI, micro-entreprise, auto-entrepreneur), hors EIRL. */
export function estEntrepreneurIndividuel(entreprise) {
  if (estEirl(entreprise)) return false;
  const n = sansAccent(formeDe(entreprise));
  return n === 'ei' || n.startsWith('entreprise individuelle') || n.startsWith('entrepreneur individuel')
    || n.includes('micro') || n.includes('auto entrepreneur') || n.includes('autoentrepreneur');
}

const echapperRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Nom imprimé. Entrepreneur individuel (ou EIRL) : la mention suit le nom de la personne.
 * - nom de l'entrepreneur renseigné et présent dans le nom commercial : la mention s'insère juste après
 *   (« Hugo Séguin — Électricien » → « Hugo Séguin EI — Électricien ») ;
 * - renseigné mais absent du nom commercial : « Électricité du Sud — Hugo Séguin EI » ;
 * - non renseigné : la mention suit le nom commercial (repli ; Paramètres signale le champ manquant).
 * Un nom qui porte déjà la mention n'est pas modifié.
 */
export function nomImprime(entreprise) {
  const nom = String(entreprise?.nom || '').trim();
  const eirl = estEirl(entreprise);
  if (!eirl && !estEntrepreneurIndividuel(entreprise)) return nom;
  const mention = eirl ? 'EIRL' : 'EI';
  const dejaMentionne = eirl
    ? /(^|[\s(,])EIRL($|[\s).,])|entrepreneur individuel à responsabilité limitée/i
    : /(^|[\s(,])EI($|[\s).,])|entrepreneur individuel/i;
  if (dejaMentionne.test(nom)) return nom;
  const personne = String(entreprise?.nomEntrepreneur || '').trim();
  if (!personne) return nom ? `${nom} ${mention}` : '';
  if (!nom || sansAccent(nom) === sansAccent(personne)) return `${personne} ${mention}`;
  const dansLeNom = new RegExp(echapperRegex(personne), 'i').exec(nom);
  if (dansLeNom) {
    const fin = dansLeNom.index + dansLeNom[0].length;
    return `${nom.slice(0, fin)} ${mention}${nom.slice(fin)}`;
  }
  return `${nom} — ${personne} ${mention}`;
}

/** Forme juridique imprimée (texte brut) : « Entrepreneur individuel (micro-entreprise) » plutôt que le régime seul. */
export function formeImprimee(entreprise) {
  const forme = formeDe(entreprise);
  if (estEirl(entreprise)) return 'Entrepreneur individuel à responsabilité limitée (EIRL)';
  if (!estEntrepreneurIndividuel(entreprise)) return forme;
  const n = sansAccent(forme);
  return n.includes('micro') || n.includes('auto') ? 'Entrepreneur individuel (micro-entreprise)' : 'Entrepreneur individuel';
}
