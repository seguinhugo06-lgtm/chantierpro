/**
 * Envoi et relance d'une facture : ce que le client lit.
 * - Recette du 9 oct. 2026 : « Relancer » renvoyait la facture telle quelle (« voici votre facture … :
 *   1 000 € ») — ni échéance, ni reste dû, ni lien de paiement.
 * - Relecture juridique du 10 oct. 2026 : une facture née « envoyée » (acompte, solde) ne doit pas partir
 *   en « Rappel » à son premier envoi : on ne relance qu'APRÈS l'échéance ; avant, un envoi normal avec la
 *   date limite (et le reste à régler si un acompte a été reçu).
 */
import { resteAPayer, joursDeRetard, echeance, dejaPaye } from './paiementsFacture';
import { euros } from './formatDocument';
import { dateLue } from './dates';

const dateCourte = (d) => (d ? dateLue(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/**
 * Où en est une facture émise (ni brouillon, ni avoir) : total, reste dû, échéance, retard.
 * @returns {{ total: number, reste: number, jours: number, echeance: Date|null, enRetard: boolean, acompteRecu: boolean } | null}
 */
export function soldeDe(doc, paiements = [], maintenant = new Date()) {
  if (doc?.type !== 'facture' || doc.facture_type === 'avoir' || doc.statut === 'brouillon') return null;
  const total = Number(doc.total_ttc) || 0;
  const reste = resteAPayer(doc, paiements);
  const jours = reste > 0.005 ? joursDeRetard(doc, paiements, maintenant) : 0;
  return {
    total, reste, jours, echeance: echeance(doc),
    enRetard: reste > 0.005 && jours > 0,
    acompteRecu: dejaPaye(doc, paiements) > 0.005 || (Number(doc.montant_credite) || 0) > 0.005,
  };
}

/** Une relance n'a de sens qu'après l'échéance, pour une facture qui reste due. */
export function relanceDe(doc, paiements = [], maintenant = new Date()) {
  const s = soldeDe(doc, paiements, maintenant);
  return s && s.enRetard ? s : null;
}

/** Message court (WhatsApp, SMS) : rappel d'une facture échue, ou envoi d'un document. */
export function texteCourt(doc, { solde = null, lienPaiement = '', lienSignature = '', entrepriseNom = '' } = {}) {
  const signature = entrepriseNom ? ` — ${entrepriseNom}` : '';
  const lien = lienPaiement && solde && solde.reste > 0.005 ? ` Paiement en ligne : ${lienPaiement}` : '';
  if (solde?.enRetard) {
    const ech = solde.echeance ? `, arrivée à échéance le ${dateCourte(solde.echeance)},` : '';
    return `Bonjour, sauf erreur de ma part, la facture ${doc.numero}${ech} n'est pas encore réglée : il reste ${euros(solde.reste)} à payer. Merci d'avance.${lien}${signature}`;
  }
  if (doc.type === 'facture' && solde) {
    if (solde.reste <= 0.005) return `Bonjour, voici votre facture ${doc.numero} : ${euros(solde.total)}, réglée.${signature}`;
    const limite = solde.echeance ? ` à régler au plus tard le ${dateCourte(solde.echeance)}` : ' à régler';
    return `Bonjour, voici votre facture ${doc.numero} : ${euros(solde.reste)}${limite}.${lien}${signature}`;
  }
  const genre = doc.type === 'facture' ? 'votre facture' : 'votre devis';
  const consulter = lienSignature && doc.type !== 'facture' ? ` Pour le consulter et le signer en ligne : ${lienSignature}` : '';
  return `Bonjour, voici ${genre} ${doc.numero} : ${euros(doc.total_ttc)}.${consulter}${signature}`;
}

// Départements et collectivités d'outre-mer : un 06 / 05 / 02 d'outre-mer n'est pas un numéro de France
// métropolitaine (+33) — le message partait vers un inconnu (relecture juridique du 10 oct. 2026).
const OUTRE_MER = {
  '0590': '590', '0690': '590', '0691': '590', // Guadeloupe, Saint-Barthélemy, Saint-Martin
  '0596': '596', '0696': '596', '0697': '596', // Martinique
  '0594': '594', '0694': '594', // Guyane
  '0262': '262', '0263': '262', '0692': '262', '0693': '262', // La Réunion
  '0269': '262', '0639': '262', // Mayotte
  '0508': '508', // Saint-Pierre-et-Miquelon
};

/** Numéro pour un lien wa.me : chiffres seuls, indicatif international (06… → 336…, 0690… → 590690…). */
export function telInternational(tel) {
  let n = String(tel || '').replace(/[^\d+]/g, '');
  if (n.startsWith('+')) return n.slice(1).replace(/\D/g, '');
  if (n.startsWith('00')) return n.slice(2).replace(/\D/g, '');
  if (n.startsWith('0')) {
    const indicatif = OUTRE_MER[n.slice(0, 4)];
    n = `${indicatif || '33'}${n.slice(1)}`;
  }
  return n.replace(/\D/g, '');
}
