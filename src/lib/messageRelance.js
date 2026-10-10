/**
 * Envoi et relance d'une facture : ce que le client lit. Recette du 9 oct. 2026 : « Relancer » renvoyait la
 * facture telle quelle (« voici votre facture … : 1 000 € ») — ni échéance dépassée, ni reste dû, ni lien de
 * paiement ; le client pouvait payer une seconde fois ce qu'il avait déjà réglé.
 */
import { resteAPayer, joursDeRetard, echeance } from './paiementsFacture';
import { euros as formatMoney } from './formatDocument';

const dateCourte = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/**
 * Une relance a-t-elle un sens pour ce document ? Une facture émise (ni brouillon, ni avoir) qui reste due.
 * @returns {{ reste: number, jours: number, echeance: Date|null } | null}
 */
export function relanceDe(doc, paiements = [], maintenant = new Date()) {
  if (doc?.type !== 'facture' || doc.facture_type === 'avoir' || doc.statut === 'brouillon') return null;
  const reste = resteAPayer(doc, paiements);
  if (reste <= 0.005) return null;
  return { reste, jours: joursDeRetard(doc, paiements, maintenant), echeance: echeance(doc) };
}

/** Message court (WhatsApp, SMS) : envoi d'un document, ou relance d'une facture due. */
export function texteCourt(doc, { relance = null, lienPaiement = '' } = {}) {
  const lien = lienPaiement ? ` Paiement en ligne : ${lienPaiement}` : '';
  if (relance) {
    const retard = relance.jours > 0 ? `, échue depuis ${relance.jours} jour${relance.jours > 1 ? 's' : ''}` : '';
    const ech = relance.echeance ? ` (échéance du ${dateCourte(relance.echeance)})` : '';
    return `Bonjour, sauf erreur de ma part, la facture ${doc.numero}${ech}${retard} reste à régler : ${formatMoney(relance.reste)}. Merci d'avance.${lien}`;
  }
  const genre = doc.type === 'facture' ? 'votre facture' : 'votre devis';
  return `Bonjour, voici ${genre} ${doc.numero} : ${formatMoney(doc.total_ttc)}.${doc.type === 'facture' ? lien : ''}`;
}

/** Numéro pour un lien wa.me : chiffres seuls, indicatif international (06… → 336…, +33 / 0033 → 33…). */
export function telInternational(tel) {
  let n = String(tel || '').replace(/[^\d+]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  else if (n.startsWith('00')) n = n.slice(2);
  else if (n.startsWith('0')) n = `33${n.slice(1)}`;
  return n.replace(/\D/g, '');
}
