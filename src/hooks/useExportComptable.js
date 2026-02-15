/**
 * useExportComptable - Hook for accounting exports
 *
 * Generates CSV/FEC exports for accounting purposes.
 * Provides export functions for:
 * - CA3 TVA declaration (simplified)
 * - Grand livre comptable
 * - Journal des ventes / achats
 * - FEC (Fichier des Ecritures Comptables)
 */

import { useCallback } from 'react';

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {Object} options
 * @param {Array} options.devis - All devis
 * @param {Array} options.depenses - All depenses
 * @param {Array} options.reglements - All reglements
 * @param {Array} options.mouvements - All tresorerie mouvements
 * @param {Array} options.clients - All clients
 * @param {Object} options.entreprise - Entreprise info
 * @param {Object} options.tvaData - TVA computation results from useTVA
 */
export function useExportComptable({ devis = [], depenses = [], reglements = [], mouvements = [], clients = [], entreprise = {}, tvaData = {} } = {}) {

  // ── Export CA3 (TVA declaration) ────────────────────────────────────
  const exportCA3 = useCallback((year) => {
    const y = year || new Date().getFullYear();
    const ca3 = tvaData.ca3Data || {};

    const rows = [
      ['Déclaration CA3 simplifiée', '', ''],
      ['Entreprise', entreprise?.nom || 'ChantierPro', ''],
      ['N° TVA', entreprise?.numeroTva || '', ''],
      ['Année', y, ''],
      ['', '', ''],
      ['Ligne', 'Libellé', 'Montant (€)'],
      ['01', 'Ventes, prestations de services (HT)', (ca3.ligne01 || 0).toFixed(2)],
      ['08', 'Opérations imposables à 20%', (ca3.ligne08 || 0).toFixed(2)],
      ['09', 'Opérations imposables à 10%', (ca3.ligne09 || 0).toFixed(2)],
      ['9B', 'Opérations imposables à 5,5%', (ca3.ligne9B || 0).toFixed(2)],
      ['16', 'Total TVA brute', (ca3.ligne16 || 0).toFixed(2)],
      ['19', 'TVA déductible sur biens et services', (ca3.ligne19 || 0).toFixed(2)],
      ['23', 'Total TVA déductible', (ca3.ligne23 || 0).toFixed(2)],
      ['28', 'TVA nette due (ou crédit)', (ca3.ligne28 || 0).toFixed(2)],
    ];

    downloadCSV(rows, `declaration_tva_ca3_${y}.csv`);
  }, [tvaData, entreprise]);

  // ── Export Journal des ventes ────────────────────────────────────────
  const exportJournalVentes = useCallback((year) => {
    const y = year || new Date().getFullYear();
    const acceptedStatuts = ['accepte', 'signe', 'payee', 'paye'];
    const factures = devis.filter(d => {
      const dateYear = new Date(d.date || d.createdAt).getFullYear();
      return acceptedStatuts.includes(d.statut) && dateYear === y;
    });

    const rows = [
      ['Date', 'N° Facture', 'Client', 'Objet', 'HT (€)', 'TVA (€)', 'TTC (€)', 'Taux TVA (%)'],
    ];

    factures.forEach(f => {
      const client = clients.find(c => c.id === f.client_id);
      const clientName = client ? `${client.nom} ${client.prenom || ''}`.trim() : 'N/A';
      const rate = f.tvaRate || f.tva_rate || 20;
      const ht = f.total_ht || (f.total_ttc ? f.total_ttc / (1 + rate / 100) : 0);
      const tva = (f.total_ttc || 0) - ht;

      rows.push([
        f.date || '',
        f.numero || '',
        clientName,
        f.objet || f.titre || '',
        ht.toFixed(2),
        tva.toFixed(2),
        (f.total_ttc || 0).toFixed(2),
        rate,
      ]);
    });

    // Total row
    const totalHt = factures.reduce((s, f) => {
      const rate = f.tvaRate || f.tva_rate || 20;
      return s + (f.total_ht || (f.total_ttc ? f.total_ttc / (1 + rate / 100) : 0));
    }, 0);
    const totalTtc = factures.reduce((s, f) => s + (f.total_ttc || 0), 0);
    rows.push(['', '', '', 'TOTAL', totalHt.toFixed(2), (totalTtc - totalHt).toFixed(2), totalTtc.toFixed(2), '']);

    downloadCSV(rows, `journal_ventes_${y}.csv`);
  }, [devis, clients]);

  // ── Export Journal des achats ────────────────────────────────────────
  const exportJournalAchats = useCallback((year) => {
    const y = year || new Date().getFullYear();
    const yearDepenses = depenses.filter(d => {
      const dateYear = new Date(d.date || d.createdAt).getFullYear();
      return dateYear === y;
    });

    const rows = [
      ['Date', 'Fournisseur', 'Description', 'Catégorie', 'HT (€)', 'TVA (€)', 'TTC (€)', 'Taux TVA (%)'],
    ];

    yearDepenses.forEach(dep => {
      const rate = dep.tvaRate || dep.tauxTva || dep.tva_rate || 20;
      const montant = dep.montant || 0;
      const ht = dep.montantHt || montant / (1 + rate / 100);
      const tva = montant - ht;

      rows.push([
        dep.date || '',
        dep.fournisseur || '',
        dep.description || dep.libelle || '',
        dep.categorie || '',
        ht.toFixed(2),
        tva.toFixed(2),
        montant.toFixed(2),
        rate,
      ]);
    });

    const totalMontant = yearDepenses.reduce((s, d) => s + (d.montant || 0), 0);
    const totalHt = yearDepenses.reduce((s, d) => {
      const rate = d.tvaRate || d.tauxTva || d.tva_rate || 20;
      return s + (d.montantHt || (d.montant || 0) / (1 + rate / 100));
    }, 0);
    rows.push(['', '', '', 'TOTAL', totalHt.toFixed(2), (totalMontant - totalHt).toFixed(2), totalMontant.toFixed(2), '']);

    downloadCSV(rows, `journal_achats_${y}.csv`);
  }, [depenses]);

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
      const clientName = client ? `${client.nom} ${client.prenom || ''}`.trim() : 'N/A';

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

  // ── Export FEC (Fichier des Ecritures Comptables) ───────────────────
  const exportFEC = useCallback((year) => {
    const y = year || new Date().getFullYear();
    const acceptedStatuts = ['accepte', 'signe', 'payee', 'paye'];

    // FEC header per French regulation
    const rows = [
      ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcrtureLettrage', 'DateLettrage', 'ValidDate', 'Montantdevise', 'Idevise'],
    ];

    let ecritureNum = 1;

    // Journal VE (Ventes)
    const factures = devis.filter(d => {
      const dateYear = new Date(d.date || d.createdAt).getFullYear();
      return acceptedStatuts.includes(d.statut) && dateYear === y;
    });

    factures.forEach(f => {
      const client = clients.find(c => c.id === f.client_id);
      const clientName = client ? `${client.nom} ${client.prenom || ''}`.trim() : '';
      const rate = f.tvaRate || f.tva_rate || 20;
      const ht = f.total_ht || (f.total_ttc ? f.total_ttc / (1 + rate / 100) : 0);
      const tva = (f.total_ttc || 0) - ht;
      const dateStr = (f.date || '').replace(/-/g, '');
      const num = String(ecritureNum).padStart(6, '0');

      // Débit client (411)
      rows.push(['VE', 'Journal des ventes', num, dateStr, '411000', 'Clients', f.client_id || '', clientName, f.numero || '', dateStr, f.objet || 'Vente', (f.total_ttc || 0).toFixed(2), '0.00', '', '', dateStr, '', 'EUR']);
      // Crédit produit (706)
      rows.push(['VE', 'Journal des ventes', num, dateStr, '706000', 'Prestations de services', '', '', f.numero || '', dateStr, f.objet || 'Vente', '0.00', ht.toFixed(2), '', '', dateStr, '', 'EUR']);
      // Crédit TVA collectée (44571)
      if (tva > 0) {
        rows.push(['VE', 'Journal des ventes', num, dateStr, '445710', 'TVA collectée', '', '', f.numero || '', dateStr, `TVA ${rate}%`, '0.00', tva.toFixed(2), '', '', dateStr, '', 'EUR']);
      }
      ecritureNum++;
    });

    // Journal HA (Achats)
    const yearDepenses = depenses.filter(d => {
      const dateYear = new Date(d.date || d.createdAt).getFullYear();
      return dateYear === y;
    });

    yearDepenses.forEach(dep => {
      const rate = dep.tvaRate || dep.tauxTva || dep.tva_rate || 20;
      const montant = dep.montant || 0;
      const ht = dep.montantHt || montant / (1 + rate / 100);
      const tva = montant - ht;
      const dateStr = (dep.date || '').replace(/-/g, '');
      const num = String(ecritureNum).padStart(6, '0');

      // Débit charge (606)
      rows.push(['HA', 'Journal des achats', num, dateStr, '606000', 'Achats', '', dep.fournisseur || '', dep.numeroFacture || '', dateStr, dep.description || dep.libelle || 'Achat', ht.toFixed(2), '0.00', '', '', dateStr, '', 'EUR']);
      // Débit TVA déductible (44566)
      if (tva > 0) {
        rows.push(['HA', 'Journal des achats', num, dateStr, '445660', 'TVA déductible', '', '', dep.numeroFacture || '', dateStr, `TVA ${rate}%`, tva.toFixed(2), '0.00', '', '', dateStr, '', 'EUR']);
      }
      // Crédit fournisseur (401)
      rows.push(['HA', 'Journal des achats', num, dateStr, '401000', 'Fournisseurs', '', dep.fournisseur || '', dep.numeroFacture || '', dateStr, dep.description || dep.libelle || 'Achat', '0.00', montant.toFixed(2), '', '', dateStr, '', 'EUR']);
      ecritureNum++;
    });

    downloadCSV(rows, `FEC_${entreprise?.siret || 'ENTREPRISE'}_${y}0101_${y}1231.csv`);
  }, [devis, depenses, clients, entreprise]);

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
        m.tauxTva ?? 20,
        m.isRecurring ? 'Oui' : 'Non',
        m.notes || '',
      ]);
    });

    downloadCSV(rows, `tresorerie_mouvements_${y}.csv`);
  }, [mouvements]);

  return {
    exportCA3,
    exportJournalVentes,
    exportJournalAchats,
    exportReglements,
    exportFEC,
    exportMouvements,
  };
}
