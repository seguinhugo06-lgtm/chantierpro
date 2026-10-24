/**
 * Actions sur une attestation de ramonage : le document (PDF), l'envoi au client par e-mail, la facture tirée de
 * l'attestation. Séparées des écrans pour être relues et testées à part.
 */
import { buildAttestationRamonageHtml, informationRappels, PIED_CONSERVATION } from '../../lib/attestationRamonageHtml';
import { ramonagePrecedent, ligneFacture, descriptionAppareil, jourDe } from '../../lib/ramonage';
import { nomImprime } from '../../lib/identiteEntreprise';
import { echapperHtml as h } from '../../lib/echapperHtml';
import { dateLue, jourLocal } from '../../lib/dates';
import { calculerTotaux } from '../../lib/totauxDocument';
import { estFranchiseTva, tauxTvaParDefaut } from '../../lib/franchiseTva';

const dateFr = (horodatage) => dateLue(jourDe(horodatage)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Le document complet d'une attestation, avec le dernier ramonage connu et l'attestation qu'elle remplace. */
export function htmlAttestation({ ramonage, entreprise, ramonages = [], clients = [] }) {
  const client = clients.find((c) => c.id === ramonage.client_id);
  return buildAttestationRamonageHtml({
    ramonage,
    entreprise,
    precedent: ramonagePrecedent(ramonages, ramonage),
    remplace: ramonage.remplace_id ? ramonages.find((r) => r.id === ramonage.remplace_id) : null,
    rappelsRefuses: !!client?.rappels_refuses_le,
  });
}

export const nomFichierAttestation = (r) => `Attestation-ramonage-${r?.numero || 'brouillon'}.pdf`;

/** PDF de l'attestation, remis au téléphone (partage) ou téléchargé. */
export async function remettreAttestation({ html, ramonage }) {
  const [{ pdfDepuisHtml }, { remettreFichier }] = await Promise.all([import('../../lib/pdfDepuisHtml'), import('../../lib/natif')]);
  const octets = await pdfDepuisHtml(html);
  return remettreFichier(octets, nomFichierAttestation(ramonage), 'application/pdf', { titre: `Attestation de ramonage ${ramonage.numero || ''}`.trim() });
}

/** Corps de l'e-mail qui accompagne l'attestation (information sur les rappels comprise, comme sur le document). */
export function corpsEmailAttestation({ ramonage, entreprise, rappelsRefuses = false }) {
  const nom = nomImprime(entreprise);
  const contact = [entreprise?.tel || entreprise?.telephone, entreprise?.email].filter(Boolean).join(' · ');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.5;max-width:560px">
  <p>Bonjour,</p>
  <p>Veuillez trouver ci-joint l’attestation de ramonage n° ${h(ramonage.numero || '')} du ${h(dateFr(ramonage.realise_le))} (${h(descriptionAppareil(ramonage))}).</p>
  <p>${h(PIED_CONSERVATION)}</p>
  ${rappelsRefuses ? '' : `<p>${h(informationRappels(nom))}</p>`}
  <p>Cordialement,<br>${h(nom)}${contact ? `<br>${h(contact)}` : ''}</p>
</div>`;
}

/** Envoie l'attestation au client (PDF joint) par la fonction send-email (destinataire : un client de l'artisan). */
export async function envoyerAttestation({ html, ramonage, entreprise, client }) {
  const { sendDocumentEmail } = await import('../../lib/emailSender');
  return sendDocumentEmail({
    to: client.email,
    subject: `Attestation de ramonage n° ${ramonage.numero} — ${nomImprime(entreprise)}`,
    bodyHtml: corpsEmailAttestation({ ramonage, entreprise, rappelsRefuses: !!client?.rappels_refuses_le }),
    fromName: nomImprime(entreprise) || undefined,
    replyTo: entreprise?.email || undefined,
    pdfHtml: html,
    pdfFilename: nomFichierAttestation(ramonage),
  });
}

/**
 * La facture tirée d'une ou plusieurs attestations du même client : une ligne par attestation (date de la prestation,
 * appareil, numéro), au taux de TVA de l'entreprise (aucun en franchise). Un brouillon, relu puis émis par le chemin
 * habituel des factures (numéro attribué par la base, contenu figé à l'émission).
 */
export function donneesFacture({ ramonages, entreprise, aujourdhui = jourLocal() }) {
  const franchise = estFranchiseTva(entreprise);
  const taux = tauxTvaParDefaut(entreprise);
  const lignes = ramonages.map((r) => {
    const l = ligneFacture(r);
    return { id: crypto.randomUUID(), ...l, montant: Math.round(l.quantite * l.prixUnitaire * 100) / 100, ...(franchise ? { tva: 0 } : {}) };
  });
  const t = calculerTotaux(lignes, { tauxDefaut: taux, franchise });
  return {
    type: 'facture',
    client_id: ramonages[0]?.client_id,
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
    objet: ramonages.length > 1 ? 'Ramonages' : 'Ramonage',
  };
}
