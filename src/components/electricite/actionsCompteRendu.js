/**
 * Actions sur un compte rendu d'intervention et d'autocontrôle : le document, son PDF (partage depuis le téléphone ou
 * téléchargement), la facture tirée du compte rendu. Séparées des écrans pour être testées à part.
 */
import { buildCompteRenduElectriciteHtml } from '../../lib/compteRenduElectriciteHtml';
import { ligneFactureCompteRendu, TITRE_COMPTE_RENDU } from '../../lib/electricite';
import { jourLocal } from '../../lib/dates';
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
  return remettreFichier(octets, nomFichierCompteRendu(compteRendu), 'application/pdf', { titre: `${TITRE_COMPTE_RENDU} ${compteRendu.numero || ''}`.trim() });
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
