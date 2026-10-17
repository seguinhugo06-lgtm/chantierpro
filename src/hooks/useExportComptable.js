/**
 * useExportComptable - Hook for accounting exports
 *
 * Exports CSV de la trésorerie : journal des ventes, journal des achats, règlements, mouvements.
 * Le FEC est produit par Finances › Export comptable (src/components/export/ExportComptable.jsx).
 */

import { useCallback } from 'react';
import { formatClientName } from '../lib/formatters';
import { remettreFichier } from '../lib/natif';
import { facturesEmises } from '../lib/ventes';
import { totauxDocument } from '../lib/totauxDocument';
import { estFranchiseTva } from '../lib/franchiseTva';
import { montantsDepense } from '../lib/tvaDepenses';

function downloadCSV(rows, filename) {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const csvContent = BOM + rows.map(r => r.map(cell => {
    const str = String(cell ?? '');
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  return remettreFichier(blob, filename);
}

/**
 * @param {Object} options
 * @param {Array} options.devis - All devis
 * @param {Array} options.depenses - All depenses
 * @param {Array} options.reglements - All reglements
 * @param {Array} options.mouvements - All tresorerie mouvements
 * @param {Array} options.clients - All clients
 * @param {Object} options.entreprise - Entreprise info
 */
export function useExportComptable({ devis = [], depenses = [], reglements = [], mouvements = [], clients = [], entreprise = {} } = {}) {

  // ── Export Journal des ventes ────────────────────────────────────────
  const exportJournalVentes = useCallback((year) => {
    const y = year || new Date().getFullYear();
    // Factures et avoirs émis de l'année (src/lib/ventes.js) : avant, des devis signés passaient pour des ventes
    // et les factures envoyées non payées manquaient (recette du 9 oct. 2026).
    const factures = facturesEmises(devis, { du: `${y}-01-01`, au: `${y}-12-31` });

    const rows = [
      ['Date', 'N° Facture', 'Client', 'Objet', 'HT (€)', 'TVA (€)', 'TTC (€)', 'Taux TVA (%)'],
    ];

    factures.forEach(f => {
      const client = clients.find(c => c.id === f.client_id);
      const clientName = formatClientName(client, 'N/A');
      const t = totauxDocument(f);
      const ht = Number(f.total_ht) || 0;
      const ttc = Number(f.total_ttc) || 0;

      rows.push([
        f.date || '',
        f.numero || '',
        clientName,
        f.objet || f.titre || '',
        ht.toFixed(2),
        (ttc - ht).toFixed(2),
        ttc.toFixed(2),
        t.tva.map(x => x.taux).join(' / '),
      ]);
    });

    // Total row
    const totalHt = factures.reduce((s, f) => s + (Number(f.total_ht) || 0), 0);
    const totalTtc = factures.reduce((s, f) => s + (Number(f.total_ttc) || 0), 0);
    rows.push(['', '', '', 'TOTAL', totalHt.toFixed(2), (totalTtc - totalHt).toFixed(2), totalTtc.toFixed(2), '']);

    downloadCSV(rows, `journal_ventes_${y}.csv`);
  }, [devis, clients]);

  // ── Export Journal des achats ────────────────────────────────────────
  // Le montant d'une dépense est HT ; sa TVA est celle saisie (taux ou montant), sinon « non saisie » : colonnes TVA
  // et TTC vides, rien d'inventé (avant, relecture juriste-btp du 17 oct. 2026 : le montant pris pour un TTC à 20 %).
  // En franchise, la TVA payée ne se déduit pas : le montant est la charge.
  const exportJournalAchats = useCallback((year) => {
    const y = year || new Date().getFullYear();
    const franchise = estFranchiseTva(entreprise);
    const yearDepenses = depenses.filter(d => {
      const dateYear = new Date(d.date || d.createdAt).getFullYear();
      return dateYear === y;
    });

    const rows = [
      ['Date', 'Fournisseur', 'Description', 'Catégorie', franchise ? 'Montant payé (€)' : 'HT (€)', 'TVA (€)', 'TTC (€)', 'Taux TVA (%)', 'Remarque'],
    ];

    let totalHt = 0;
    let totalTva = 0;
    let sansTva = 0;
    yearDepenses.forEach(dep => {
      const m = montantsDepense(dep, { franchise });
      totalHt += m.ht;
      if (m.connue) totalTva += m.tva; else sansTva += 1;
      rows.push([
        dep.date || '',
        dep.fournisseur || '',
        dep.description || dep.libelle || '',
        dep.categorie || '',
        m.ht.toFixed(2),
        m.connue && !franchise ? m.tva.toFixed(2) : '',
        m.connue && !franchise ? m.ttc.toFixed(2) : '',
        m.taux ?? '',
        franchise ? 'Franchise : TVA non déductible' : (m.connue ? '' : 'TVA non saisie'),
      ]);
    });

    rows.push([
      '', '', '', 'TOTAL', totalHt.toFixed(2), franchise ? '' : totalTva.toFixed(2), sansTva || franchise ? '' : (totalHt + totalTva).toFixed(2), '',
      sansTva ? `dont ${sansTva} dépense${sansTva > 1 ? 's' : ''} sans TVA saisie (non comptée)` : '',
    ]);

    downloadCSV(rows, `journal_achats_${y}.csv`);
  }, [depenses, entreprise]);

  // ── Export Règlements ─────────────────────────────────────────────────
  const exportReglements = useCallback((year) => {
    const y = year || new Date().getFullYear();
    const yearReglements = reglements.filter(r => {
      const d = new Date(r.dateReglement || r.date || r.createdAt);
      return d.getFullYear() === y;
    });

    const rows = [
      ['Date', 'N° Devis/Facture', 'Client', 'Montant (€)', 'Mode de paiement', 'Type', 'Référence', 'Notes'],
    ];

    yearReglements.forEach(r => {
      const linkedDevis = devis.find(d => d.id === r.devisId);
      const client = linkedDevis ? clients.find(c => c.id === linkedDevis.client_id) : null;
      const clientName = formatClientName(client, 'N/A');

      rows.push([
        r.dateReglement || r.date || '',
        linkedDevis?.numero || '',
        clientName,
        (r.montant || 0).toFixed(2),
        r.modePaiement || 'virement',
        r.type || 'paiement',
        r.reference || '',
        r.notes || '',
      ]);
    });

    downloadCSV(rows, `reglements_${y}.csv`);
  }, [reglements, devis, clients]);

  // ── Export Trésorerie Mouvements ────────────────────────────────────
  const exportMouvements = useCallback((year) => {
    const y = year || new Date().getFullYear();
    const yearMouvements = mouvements.filter(m => {
      const d = new Date(m.date);
      return d.getFullYear() === y;
    });

    const rows = [
      ['Date', 'Description', 'Type', 'Catégorie', 'Statut', 'HT (€)', 'TVA (€)', 'TTC (€)', 'Taux TVA (%)', 'Récurrent', 'Notes'],
    ];

    yearMouvements.forEach(m => {
      rows.push([
        m.date || '',
        m.description || '',
        m.type === 'entree' ? 'Entrée' : 'Sortie',
        m.categorie || '',
        m.statut || '',
        (m.montantHt || 0).toFixed(2),
        (m.montantTva || 0).toFixed(2),
        (m.montant || 0).toFixed(2),
        m.tauxTva ?? '',
        m.isRecurring ? 'Oui' : 'Non',
        m.notes || '',
      ]);
    });

    downloadCSV(rows, `tresorerie_mouvements_${y}.csv`);
  }, [mouvements]);

  return {
    exportJournalVentes,
    exportJournalAchats,
    exportReglements,
    exportMouvements,
  };
}
