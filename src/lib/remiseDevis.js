/**
 * Remise du devis avant sa signature sur place (C. conso. L221-8). Logique sans React ni Supabase, testée dans
 * src/lib/__tests__/remiseDevis.test.js ; DevisPage.jsx s'en sert pour « Faire signer » sur un brouillon.
 *
 * Règle (décision d'Hugo du 5 nov. 2026, D-40) : un devis jamais remis au client ne se fait pas signer. Hors
 * établissement (chez le client, même à sa demande), l'information avant contrat, dont le devis détaillé, est remise
 * sur papier ou, avec l'accord du client, sur un autre support durable (C. conso. L221-8 ; docs/metier-btp.md § 2).
 * Deux voies :
 * - le PDF remis (imprimé ou partagé), puis l'artisan confirme « Devis remis au client » en disant comment : la remise
 *   est ENREGISTRÉE (statut « envoyé », jour de la remise, preuve) avant que la fenêtre de signature s'ouvre ;
 * - l'envoi par e-mail, avec l'accord du client : l'envoi enregistre la même chose (statut « envoyé », jour d'envoi,
 *   preuve en mode « envoyé », canal e-mail).
 * La date de remise est celle de la remise, jamais celle de la signature.
 *
 * Preuve (C. conso. L221-7 : la preuve de l'information pèse sur le professionnel ; avis juriste-btp du 5 nov. 2026,
 * lu au texte) : l'instant de la remise et son mode, rangés sur le devis dans `remise_au_client` = { le, mode, canal? }.
 * Elle repose sur la parole de l'artisan : l'app ne prouve pas que le client a reçu le devis. Stockage : la colonne JSON
 * existante `devis.payment_metadata`, sous la clé `remise_au_client` (src/hooks/useSupabaseSync.js), sans migration.
 */
import { jourLocal } from './dates';

/** Statuts d'un devis dont la remise au client est enregistrée : envoyé (e-mail, message, main propre), puis vu. */
const STATUTS_REMIS = ['envoye', 'vu'];

/** La remise du devis est-elle enregistrée ? Seul un devis remis se fait signer. */
export const devisRemis = (doc) => !!doc && STATUTS_REMIS.includes(doc.statut);

/**
 * Modes de remise proposés dans la 2e fenêtre (libellés de l'avis juriste-btp du 5 nov. 2026, point 7) : le devis a été
 * remis sur papier, ou envoyé (e-mail ou message, avec le fichier joint et l'accord du client).
 */
export const MODES_REMISE = [
  { valeur: 'papier', libelle: 'Imprimé et remis' },
  { valeur: 'envoye', libelle: 'Envoyé par e-mail ou par message' },
];

export const estModeRemise = (mode) => MODES_REMISE.some((m) => m.valeur === mode);

/**
 * La preuve de la remise : l'instant (ISO, UTC) et le mode, et le canal quand l'app le sait (envoi par e-mail).
 * @param {{ mode: 'papier'|'envoye', canal?: string, le?: Date|string|number }} p
 * @returns {{ le: string, mode: string, canal?: string }}
 */
export function preuveRemise({ mode, canal, le = new Date() } = {}) {
  if (!estModeRemise(mode)) throw new Error(`mode de remise inconnu : ${mode}`);
  const instant = le instanceof Date ? le : new Date(le);
  if (Number.isNaN(instant.getTime())) throw new Error('instant de remise illisible');
  return { le: instant.toISOString(), mode, ...(canal ? { canal } : {}) };
}

/**
 * Ce qu'on enregistre quand l'artisan confirme la remise : le statut « envoyé », le jour de la remise (comme un envoi :
 * la première date est gardée) et la preuve (instant et mode).
 */
export function remiseDuDevis(doc, { mode, canal, le = new Date() } = {}) {
  return {
    statut: 'envoye',
    date_envoi: doc?.date_envoi || jourLocal(le instanceof Date ? le : new Date(le)),
    remise_au_client: preuveRemise({ mode, canal, le }),
  };
}

/**
 * La preuve à joindre au premier envoi d'un devis par e-mail (mode « envoyé », canal e-mail) : `{}` pour une facture
 * (la preuve ne vaut que pour un devis) et quand une preuve existe déjà (la première remise est celle qui compte).
 */
export function preuveEnvoiParEmail(doc, le = new Date()) {
  if (!doc || doc.type === 'facture' || doc.remise_au_client) return {};
  return { remise_au_client: preuveRemise({ mode: 'envoye', canal: 'email', le }) };
}

/**
 * Textes des fenêtres et messages de la remise. Les deux messages des fenêtres, le bouton « Devis remis au client » et
 * l'annulation « Pas encore » sont ceux de l'avis juriste-btp du 5 nov. 2026 (relu au texte de L221-8, point 7) ; les
 * titres et « Ouvrir le PDF » n'ont pas changé. Les trois messages d'erreur sont de la session de correction : à relire.
 * `variant: 'info'` : une confirmation qui ne détruit rien n'est pas rouge.
 */
export const TEXTES_REMISE = {
  avant: {
    title: 'Remettez d’abord le devis',
    message: 'Avant de signer chez lui, le client doit avoir reçu le devis sur papier ou, s’il est d’accord, sur un autre support durable : le PDF envoyé par e-mail ou par message, qu’il peut garder (article L221-8 du Code de la consommation). Le montrer sur votre écran ne suffit pas. Le PDF va s’ouvrir : imprimez-le, ou envoyez-le-lui.',
    confirmText: 'Ouvrir le PDF',
    variant: 'info',
  },
  apres: {
    title: 'Le client a-t-il reçu le devis ?',
    message: 'Répondez oui seulement s’il l’a reçu : imprimé, ou envoyé par e-mail ou par message avec son accord.',
    confirmText: 'Devis remis au client',
    cancelText: 'Pas encore',
  },
  nonEnregistree: 'La remise du devis n’a pas été enregistrée. Réessayez.',
  nonRemis: 'Remettez d’abord le devis au client.',
  // La base a refusé d'enregistrer la signature : le devis n'est pas signé (pas de faux « Devis signé et accepté »)
  signatureNonEnregistree: 'La signature n’a pas été enregistrée : le devis n’est pas signé. Refaites-le signer.',
};

/**
 * « Faire signer » sur un brouillon : le devis est remis, la remise est enregistrée (avec sa preuve), puis la signature
 * s'ouvre. La signature ne s'ouvre JAMAIS avant que la remise soit enregistrée : tant que l'artisan n'a pas confirmé la
 * remise en disant comment, ou que l'enregistrement n'a pas réussi, rien ne s'ouvre.
 *
 * @param {object} p
 * @param {object} p.doc                                   le devis (brouillon)
 * @param {(options: object) => Promise<boolean>} p.confirm  1re fenêtre (true = confirmé)
 * @param {(textes: object) => Promise<string|null>} p.choisirMode  2e fenêtre : 'papier' ou 'envoye', null si « Pas encore »
 * @param {(doc: object) => Promise<void>} p.remettre        ouvre le PDF : impression ou partage
 * @param {(maj: object) => Promise<boolean|string>} p.enregistrer  écrit la remise ; faux si la base la refuse
 * @param {(doc: object) => unknown} p.ouvrirSignature       ouvre la fenêtre de signature (le devis remis)
 * @param {(message: string) => void} p.signaler             dit une erreur à l'artisan
 * @param {() => Date} [p.maintenant]                        l'heure (testable)
 * @returns {Promise<boolean>} true si la signature a été ouverte
 */
export async function remettreAvantSignature({ doc, confirm, choisirMode, remettre, enregistrer, ouvrirSignature, signaler, maintenant = () => new Date() }) {
  // Déjà remis (envoyé par e-mail, remis hier) : rien à enregistrer
  if (devisRemis(doc)) { ouvrirSignature(doc); return true; }
  if (!(await confirm(TEXTES_REMISE.avant))) return false;
  await remettre(doc);
  const mode = await choisirMode(TEXTES_REMISE.apres);
  if (!estModeRemise(mode)) return false; // « Pas encore » : rien n'est enregistré
  const maj = remiseDuDevis(doc, { mode, le: maintenant() });
  if (!(await enregistrer(maj))) { signaler(TEXTES_REMISE.nonEnregistree); return false; }
  ouvrirSignature({ ...doc, ...maj });
  return true;
}
