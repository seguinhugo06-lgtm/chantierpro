/**
 * Actions sur un compte rendu d'intervention et d'autocontrôle : le document, son PDF (partage depuis le téléphone ou
 * téléchargement), son envoi au client par e-mail (même chemin que l'attestation de ramonage), la facture tirée du compte
 * rendu. Séparées des écrans pour être testées à part.
 */
import { buildCompteRenduElectriciteHtml } from '../../lib/compteRenduElectriciteHtml';
import { ligneFactureCompteRendu, titreCompteRendu, NATURES, libelleDe } from '../../lib/electricite';
import { jourDe } from '../../lib/ramonage';
import { nomImprime } from '../../lib/identiteEntreprise';
import { echapperHtml as h } from '../../lib/echapperHtml';
import { dateLue, jourLocal } from '../../lib/dates';
import { calculerTotaux } from '../../lib/totauxDocument';
import { estFranchiseTva, tauxTvaParDefaut } from '../../lib/franchiseTva';

export function htmlCompteRendu({ compteRendu, entreprise, comptesRendus = [] }) {
  return buildCompteRenduElectriciteHtml({
    compteRendu,
    entreprise,
    remplace: compteRendu.remplace_id ? comptesRendus.find((r) => r.id === compteRendu.remplace_id) : null,
  });
}

export const nomFichierCompteRendu = (r) => `Compte-rendu-intervention-${r?.numero || 'brouillon'}.pdf`;

/** PDF du compte rendu, remis au téléphone (feuille de partage : e-mail, SMS, messagerie) ou téléchargé. */
export async function remettreCompteRendu({ html, compteRendu }) {
  const [{ pdfDepuisHtml }, { remettreFichier }] = await Promise.all([import('../../lib/pdfDepuisHtml'), import('../../lib/natif')]);
  const octets = await pdfDepuisHtml(html);
  return remettreFichier(octets, nomFichierCompteRendu(compteRendu), 'application/pdf', { titre: `${titreCompteRendu(compteRendu)} ${compteRendu.numero || ''}`.trim() });
}

const dateFr = (horodatage) => dateLue(jourDe(horodatage)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Corps de l'e-mail qui accompagne le compte rendu. Calqué sur celui de l'attestation de ramonage
 * (`corpsEmailAttestation`, actionsRamonage.js), sans ses deux phrases propres au ramonage (conservation, rappels).
 * Texte À RELIRE PAR LE JURISTE (décision d'Hugo du 5 nov. 2026, D-39) ; jamais « conforme » ni « certifié »
 * (`MOTS_INTERDITS`, testé).
 */
export function corpsEmailCompteRendu({ compteRendu, entreprise }) {
  const nom = nomImprime(entreprise);
  const contact = [entreprise?.tel || entreprise?.telephone, entreprise?.email].filter(Boolean).join(' · ');
  const titre = titreCompteRendu(compteRendu);
  const sousTitre = titre.charAt(0).toLowerCase() + titre.slice(1);
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.5;max-width:560px">
  <p>Bonjour,</p>
  <p>Veuillez trouver ci-joint le ${h(sousTitre)} n° ${h(compteRendu.numero || '')} du ${h(dateFr(compteRendu.realise_le))} (${h(libelleDe(NATURES, compteRendu.nature))}).</p>
  <p>Cordialement,<br>${h(nom)}${contact ? `<br>${h(contact)}` : ''}</p>
</div>`;
}

/**
 * Envoie le compte rendu au client (PDF joint) par la fonction `send-email`, exactement comme `envoyerAttestation`
 * (actionsRamonage.js) : même fonction d'envoi (`sendDocumentEmail`, src/lib/emailSender.js), mêmes contrôles côté
 * serveur (destinataire : un client de l'artisan, PDF seulement, plafond par jour). Aucune nouvelle fonction Edge. La
 * promesse est rejetée avec la vraie raison du serveur quand l'envoi est refusé : l'appelant ne dit « envoyé » qu'après.
 */
export async function envoyerCompteRendu({ html, compteRendu, entreprise, client }) {
  const { sendDocumentEmail } = await import('../../lib/emailSender');
  return sendDocumentEmail({
    to: client.email,
    subject: `${titreCompteRendu(compteRendu)} n° ${compteRendu.numero} — ${nomImprime(entreprise)}`,
    bodyHtml: corpsEmailCompteRendu({ compteRendu, entreprise }),
    fromName: nomImprime(entreprise) || undefined,
    replyTo: entreprise?.email || undefined,
    pdfHtml: html,
    pdfFilename: nomFichierCompteRendu(compteRendu),
  });
}

/**
 * Le brouillon de facture tiré d'un compte rendu : une ligne (nature, date, travaux, numéro du compte rendu) au taux
 * de TVA de l'entreprise (aucun en franchise), rattachée au chantier. Relu puis émis par le chemin habituel des
 * factures (numéro attribué par la base, contenu figé à l'émission) ; l'artisan y ajuste lignes et taux.
 */
export function donneesFactureCompteRendu({ compteRendu, entreprise, aujourdhui = jourLocal() }) {
  const franchise = estFranchiseTva(entreprise);
  const taux = tauxTvaParDefaut(entreprise);
  const l = ligneFactureCompteRendu(compteRendu);
  const lignes = [{ id: crypto.randomUUID(), ...l, montant: Math.round(l.quantite * l.prixUnitaire * 100) / 100, ...(franchise ? { tva: 0 } : {}) }];
  const t = calculerTotaux(lignes, { tauxDefaut: taux, franchise });
  return {
    type: 'facture',
    client_id: compteRendu.client_id,
    chantier_id: compteRendu.chantier_id || null,
    date: aujourdhui,
    statut: 'brouillon',
    tvaRate: taux,
    lignes,
    sections: [{ id: '1', titre: '', lignes }],
    remise: 0,
    total_ht: t.totalHT,
    tva: t.totalTVA,
    total_ttc: t.totalTTC,
    tvaParTaux: t.tvaParTaux,
    objet: 'Travaux d’électricité',
  };
}
