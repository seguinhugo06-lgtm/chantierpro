/**
 * Actions sur une attestation d'entretien : le document (PDF), l'envoi au client par e-mail, la facture tirée de
 * l'attestation (taux de TVA proposé, jamais imposé : la facture reste un brouillon que l'artisan relit).
 */
import { buildAttestationEntretienHtml, informationRappelsEntretien } from '../../lib/attestationEntretienHtml';
import { categorie, ligneFacture, ligneDevisVisite, descriptionAppareil, jourDe, tauxPropose } from '../../lib/entretien';
import { nomImprime } from '../../lib/identiteEntreprise';
import { echapperHtml as h } from '../../lib/echapperHtml';
import { dateLue, jourLocal } from '../../lib/dates';
import { calculerTotaux } from '../../lib/totauxDocument';
import { estFranchiseTva } from '../../lib/franchiseTva';

const dateFr = (horodatage) => dateLue(jourDe(horodatage)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function htmlAttestation({ entretien, entreprise, entretiens = [], clients = [] }) {
  const client = clients.find((c) => c.id === entretien.client_id);
  return buildAttestationEntretienHtml({
    entretien,
    entreprise,
    remplace: entretien.remplace_id ? entretiens.find((x) => x.id === entretien.remplace_id) : null,
    rappelsRefuses: !!client?.rappels_refuses_le,
  });
}

export const nomFichierAttestation = (e) => `Attestation-entretien-${e?.numero || 'brouillon'}.pdf`;

export async function remettreAttestation({ html, entretien }) {
  const [{ pdfDepuisHtml }, { remettreFichier }] = await Promise.all([import('../../lib/pdfDepuisHtml'), import('../../lib/natif')]);
  const octets = await pdfDepuisHtml(html);
  return remettreFichier(octets, nomFichierAttestation(entretien), 'application/pdf', { titre: `${categorie(entretien.categorie)?.titre || 'Attestation d’entretien'} ${entretien.numero || ''}`.trim() });
}

export function corpsEmailAttestation({ entretien, entreprise, rappelsRefuses = false }) {
  const nom = nomImprime(entreprise);
  const c = categorie(entretien.categorie);
  const contact = [entreprise?.tel || entreprise?.telephone, entreprise?.email].filter(Boolean).join(' · ');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.5;max-width:560px">
  <p>Bonjour,</p>
  <p>Veuillez trouver ci-joint l’attestation d’entretien n° ${h(entretien.numero || '')} du ${h(dateFr(entretien.realise_le))} (${h(descriptionAppareil(entretien))}).</p>
  <p>${h(c?.pied || '')}</p>
  ${rappelsRefuses ? '' : `<p>${h(informationRappelsEntretien(nom))}</p>`}
  <p>Cordialement,<br>${h(nom)}${contact ? `<br>${h(contact)}` : ''}</p>
</div>`;
}

export async function envoyerAttestation({ html, entretien, entreprise, client }) {
  const { sendDocumentEmail } = await import('../../lib/emailSender');
  return sendDocumentEmail({
    to: client.email,
    subject: `Attestation d’entretien n° ${entretien.numero} — ${nomImprime(entreprise)}`,
    bodyHtml: corpsEmailAttestation({ entretien, entreprise, rappelsRefuses: !!client?.rappels_refuses_le }),
    fromName: nomImprime(entreprise) || undefined,
    replyTo: entreprise?.email || undefined,
    pdfHtml: html,
    pdfFilename: nomFichierAttestation(entretien),
  });
}

/**
 * La facture (brouillon) tirée d'une attestation : une ligne au taux proposé (10 %, 5,5 % si l'artisan a déclaré
 * l'appareil éligible, 20 % hors logement de plus de deux ans ; aucun en franchise). Émise par le chemin habituel.
 */
export function donneesFacture({ entretien, entreprise, aujourdhui = jourLocal() }) {
  const franchise = estFranchiseTva(entreprise);
  const taux = tauxPropose(entretien, { franchise });
  const l = ligneFacture(entretien, { franchise });
  const lignes = [{ id: crypto.randomUUID(), ...l, montant: Math.round(l.quantite * l.prixUnitaire * 100) / 100, ...(franchise ? { tva: 0 } : {}) }];
  const t = calculerTotaux(lignes, { tauxDefaut: taux, franchise });
  return {
    type: 'facture',
    client_id: entretien.client_id,
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
    objet: `Entretien — ${categorie(entretien.categorie)?.libelle || ''}`.trim(),
  };
}

/**
 * Le devis (brouillon) de la visite d'entretien, tiré d'une attestation (D-38, décision 2 : « devis en un geste »).
 * Arrêté du 24 janv. 2017, art. 4 : chez un particulier, une visite d'entretien payée à l'acte demande un devis détaillé
 * avant l'intervention (avis juriste-btp du 4 nov. 2026, § 6 et 7.7). Prérempli : le client, l'adresse de l'installation
 * et une ligne « Entretien de … » d'après l'appareil, au tarif de Paramètres → Entretien s'il existe (sinon sans prix), au
 * taux de TVA que les règles de l'entretien proposent (aucun en franchise). Il se crée par la création de devis habituelle
 * (`addDevis`, DataContext : numéro, limite du plan, conditions d'utilisation) puis s'ouvre dans l'éditeur ; il n'est
 * jamais envoyé d'ici.
 */
export function donneesDevis({ entretien, entreprise, aujourdhui = jourLocal() }) {
  const franchise = estFranchiseTva(entreprise);
  const taux = tauxPropose(entretien, { franchise });
  const l = ligneDevisVisite(entretien, { franchise, entreprise });
  const lignes = [{ id: crypto.randomUUID(), ...l, montant: Math.round(l.quantite * l.prixUnitaire * 100) / 100, ...(franchise ? { tva: 0 } : {}) }];
  const t = calculerTotaux(lignes, { tauxDefaut: taux, franchise });
  const validite = Number(entreprise?.validiteDevis || entreprise?.validite_devis);
  return {
    type: 'devis',
    client_id: entretien.client_id,
    date: aujourdhui,
    validite: validite > 0 ? validite : 30,
    statut: 'brouillon',
    tvaRate: taux,
    lignes,
    sections: [{ id: '1', titre: '', lignes }],
    remise: 0,
    total_ht: t.totalHT,
    tva: t.totalTVA,
    total_ttc: t.totalTTC,
    tvaParTaux: t.tvaParTaux,
    objet: `Entretien — ${categorie(entretien.categorie)?.libelle || ''}`.trim(),
  };
}
