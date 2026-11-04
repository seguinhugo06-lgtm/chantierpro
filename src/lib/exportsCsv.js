import { dateLue } from './dates';
import { margeBrute } from './margeArticle';

/**
 * Tableaux des exports CSV (liste des devis et factures, catalogue), en lignes de cellules. En franchise en base de TVA
 * (art. 293 B du CGI, estFranchiseTva) : ni « HT », ni « TTC », ni colonne de TVA — une colonne « Montant » ou
 * « Prix unitaire » (D-31, tâche 28 `franchise-restes`, 4 nov. 2026). Les montants ne changent pas.
 */

/** Devis et factures : en-tête puis une ligne par document. */
export function tableauExportDocuments(docs, { clients = [], franchise = false } = {}) {
  const enTete = ['Numéro', 'Type', 'Client', 'Date', 'Objet', ...(franchise ? ['Montant'] : ['Montant HT', 'TVA', 'Montant TTC']), 'Statut', 'Date envoi', 'Date signature', 'Date paiement'];
  const fmtDate = (v) => (v ? dateLue(v).toLocaleDateString('fr-FR') : '');
  const lignes = docs.map((d) => {
    const client = clients.find((c) => c.id === d.client_id);
    const clientName = client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : (d.client_nom || '');
    return [
      d.numero || '',
      d.type === 'facture' ? 'Facture' : 'Devis',
      clientName,
      fmtDate(d.date),
      (d.objet || '').replace(/;/g, ','),
      ...(franchise ? [] : [(d.total_ht || 0).toFixed(2), (d.tva || 0).toFixed(2)]),
      (d.total_ttc || d.montant_ttc || 0).toFixed(2),
      d.statut || '',
      fmtDate(d.date_envoi),
      fmtDate(d.date_signature),
      fmtDate(d.date_paiement),
    ];
  });
  return [enTete, ...lignes];
}

/** Catalogue (prix et marges : réservé à qui les voit). */
export function tableauExportCatalogue(catalogue, { franchise = false } = {}) {
  const enTete = ['Référence', 'Nom', 'Description', 'Catégorie', 'Unité', ...(franchise ? ['Prix unitaire', 'Prix d’achat'] : ['TVA %', 'Prix vente HT', 'Prix achat HT']), 'Marge %', 'Stock', 'Seuil alerte', 'Favori'];
  const lignes = catalogue.map((c) => {
    const marge = margeBrute(c.prix, c.prixAchat);
    return [c.reference || '', c.nom, c.description || '', c.categorie, c.unite, ...(franchise ? [] : [c.tva_rate ?? c.tva ?? 20]), c.prix, c.prixAchat ?? '', marge !== null ? marge.toFixed(1) : '', c.stock_actuel ?? '', c.stock_seuil_alerte ?? '', c.favori ? 'Oui' : ''];
  });
  return [enTete, ...lignes];
}
