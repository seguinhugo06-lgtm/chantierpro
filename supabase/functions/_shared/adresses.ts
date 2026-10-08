/**
 * Adresses, textes et HTML des e-mails envoyés depuis noreply@mallettico.fr.
 * Sans import distant : testable sous vitest.
 */

// Adresse nue en ASCII, sans nom affiché ni liste : « Nom <a@b.fr> », « a@b.fr, c@d.fr »
// et les caractères Unicode qui changent à la mise en minuscules (signe kelvin…) sont
// refusés ; `%` et `*` aussi (jokers de la recherche ILIKE côté base).
const RE_EMAIL = /^[A-Za-z0-9.!#$&'+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
// eslint-disable-next-line no-control-regex
const RE_CONTROLE = /[\u0000-\u001f\u007f]/g;

export function estEmail(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && valeur.length <= 254 && RE_EMAIL.test(valeur);
}

export function normaliserEmail(valeur: string): string {
  return valeur.trim().toLowerCase();
}

/** Texte sur une ligne : caractères de contrôle (retours à la ligne compris) remplacés par des espaces. */
export function surUneLigne(valeur: string): string {
  return valeur.replace(RE_CONTROLE, ' ');
}

/** Nom affiché d'expéditeur ou d'organisation, sans ce qui casserait un en-tête ni ce qui imite une adresse. */
export function nettoyerNom(valeur: unknown, max = 80): string | undefined {
  if (typeof valeur !== 'string') return undefined;
  const nom = surUneLigne(valeur).replace(/[<>"\\,;:@]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();
  return nom || undefined;
}

export function echapperHtml(valeur: unknown): string {
  return String(valeur ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
