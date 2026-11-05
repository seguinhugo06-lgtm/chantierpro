/**
 * Remise du devis avant sa signature sur place (C. conso. L221-8). Logique sans React ni Supabase, testée dans
 * src/lib/__tests__/remiseDevis.test.js ; DevisPage.jsx s'en sert pour « Faire signer » sur un brouillon.
 *
 * Règle (décision d'Hugo du 5 nov. 2026, D-40) : un devis jamais remis au client ne se fait pas signer. Hors
 * établissement (chez le client, même à sa demande), l'information avant contrat, dont le devis détaillé, est remise
 * sur papier ou, avec l'accord du client, sur un autre support durable (C. conso. L221-8 ; docs/metier-btp.md § 2).
 * Deux voies :
 * - le PDF remis (imprimé ou partagé), puis l'artisan confirme « Devis remis au client » : la remise est ENREGISTRÉE
 *   (statut « envoyé », jour de la remise) avant que la fenêtre de signature s'ouvre ;
 * - l'envoi par e-mail, avec l'accord du client : l'envoi enregistre la même chose (statut « envoyé », jour d'envoi).
 * La date de remise est celle de la remise, jamais celle de la signature.
 */
import { jourLocal } from './dates';

/** Statuts d'un devis dont la remise au client est enregistrée : envoyé (e-mail, message, main propre), puis vu. */
const STATUTS_REMIS = ['envoye', 'vu'];

/** La remise du devis est-elle enregistrée ? Seul un devis remis se fait signer. */
export const devisRemis = (doc) => !!doc && STATUTS_REMIS.includes(doc.statut);

/**
 * Ce qu'on enregistre quand l'artisan confirme la remise : le statut « envoyé » et le jour de la remise (comme un
 * envoi : la première date est gardée).
 */
export const remiseDuDevis = (doc, jour = jourLocal()) => ({ statut: 'envoye', date_envoi: doc?.date_envoi || jour });

/**
 * Textes des fenêtres et messages de la remise. Rédaction de la session de correction du 5 nov. 2026, reprise des
 * fenêtres de la relecture du 4 nov. (juriste-btp, sans Légifrance) : à relire au texte de L221-8 par juriste-btp.
 * `variant: 'info'` : une confirmation qui ne détruit rien n'est pas rouge.
 */
export const TEXTES_REMISE = {
  avant: {
    title: 'Remettez d’abord le devis',
    message: 'Avant de signer, le client doit recevoir le devis sur papier, ou sur un autre support durable (e-mail) s’il est d’accord (article L221-8 du Code de la consommation). Le montrer à l’écran ne suffit pas. Le PDF va s’ouvrir : imprimez-le ou envoyez-le-lui.',
    confirmText: 'Ouvrir le PDF',
    variant: 'info',
  },
  apres: {
    title: 'Le client a-t-il reçu le devis ?',
    message: 'Imprimé, ou envoyé avec son accord. Le devis sera enregistré comme remis aujourd’hui, puis le client pourra le signer.',
    confirmText: 'Devis remis au client',
    variant: 'info',
  },
  nonEnregistree: 'La remise du devis n’a pas été enregistrée. Réessayez.',
  nonRemis: 'Remettez d’abord le devis au client.',
};

/**
 * « Faire signer » sur un brouillon : le devis est remis, la remise est enregistrée, puis la signature s'ouvre.
 * La signature ne s'ouvre JAMAIS avant que la remise soit enregistrée : tant que l'artisan n'a pas confirmé la remise,
 * ou que l'enregistrement n'a pas réussi, rien ne s'ouvre.
 *
 * @param {object} p
 * @param {object} p.doc                                   le devis (brouillon)
 * @param {(options: object) => Promise<boolean>} p.confirm  fenêtre de confirmation (true = confirmé)
 * @param {(doc: object) => Promise<void>} p.remettre        ouvre le PDF : impression ou partage
 * @param {(maj: object) => Promise<boolean|symbol>} p.enregistrer  écrit la remise ; faux si la base la refuse
 * @param {(doc: object) => unknown} p.ouvrirSignature       ouvre la fenêtre de signature (le devis remis)
 * @param {(message: string) => void} p.signaler             dit une erreur à l'artisan
 * @returns {Promise<boolean>} true si la signature a été ouverte
 */
export async function remettreAvantSignature({ doc, confirm, remettre, enregistrer, ouvrirSignature, signaler }) {
  // Déjà remis (envoyé par e-mail, remis hier) : rien à enregistrer
  if (devisRemis(doc)) { ouvrirSignature(doc); return true; }
  if (!(await confirm(TEXTES_REMISE.avant))) return false;
  await remettre(doc);
  if (!(await confirm(TEXTES_REMISE.apres))) return false;
  const maj = remiseDuDevis(doc);
  if (!(await enregistrer(maj))) { signaler(TEXTES_REMISE.nonEnregistree); return false; }
  ouvrirSignature({ ...doc, ...maj });
  return true;
}
