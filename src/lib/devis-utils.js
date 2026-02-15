/**
 * Utility functions for devis/facture calculations
 */

/**
 * Round to 2 decimal places for euro calculations
 * Using Math.round with multiplication to avoid floating-point errors
 * @param {number} value
 * @returns {number}
 */
export function roundEuro(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Generate unique document number
 * @param {string} type - 'devis' or 'facture'
 * @param {Array} existingDocuments - Existing devis/factures to check for uniqueness
 * @returns {string} Generated numero (e.g., 'DEV-2024-00001')
 */
export function generateNumero(type, existingDocuments = []) {
  const prefix = type === 'facture' ? 'FAC' : 'DEV';
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);

  const maxSeq = existingDocuments
    .filter(d => (d.type || 'devis') === type)
    .map(d => { const m = (d.numero || '').match(pattern); return m ? parseInt(m[1], 10) : 0; })
    .reduce((max, n) => Math.max(max, n), 0);

  return `${prefix}-${year}-${String(maxSeq + 1).padStart(5, '0')}`;
}

/**
 * Calculate totals for a devis/facture
 * @param {Object} form - Form data with sections, lignes, remise, etc.
 * @param {boolean} isMicro - Whether entreprise is micro-entreprise (no TVA)
 * @returns {Object} Calculated totals
 */
export function calculateDevisTotals(form, isMicro = false) {
  let totalHT = 0;
  let totalCoutAchat = 0;
  const tvaParTaux = {};

  const sections = form.sections || [{ lignes: form.lignes || [] }];

  sections.forEach(s => (s.lignes || []).forEach(l => {
    // Round line amounts to avoid floating-point accumulation
    const montant = roundEuro(l.montant || (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaire) || 0));
    const taux = l.tva !== undefined ? l.tva : (form.tvaDefaut || 10);
    const coutAchat = roundEuro((l.prixAchat || 0) * (l.quantite || 0));

    totalHT += montant;
    totalCoutAchat += coutAchat;

    if (!tvaParTaux[taux]) tvaParTaux[taux] = { base: 0, montant: 0 };
    tvaParTaux[taux].base += montant;
    // Round TVA per line to ensure accuracy
    tvaParTaux[taux].montant += roundEuro(montant * (taux / 100));
  }));

  // Round accumulated totals
  totalHT = roundEuro(totalHT);
  totalCoutAchat = roundEuro(totalCoutAchat);

  const remisePercent = form.remise || 0;
  const remiseAmount = roundEuro(totalHT * (remisePercent / 100));
  const htApresRemise = roundEuro(totalHT - remiseAmount);

  // Recalculate TVA after discount (proportional) with proper rounding
  const ratioRemise = totalHT > 0 ? htApresRemise / totalHT : 1;
  Object.keys(tvaParTaux).forEach(taux => {
    tvaParTaux[taux].base = roundEuro(tvaParTaux[taux].base * ratioRemise);
    tvaParTaux[taux].montant = roundEuro(tvaParTaux[taux].montant * ratioRemise);
  });

  const totalTVA = isMicro ? 0 : roundEuro(Object.values(tvaParTaux).reduce((s, t) => s + t.montant, 0));

  // Margin calculation
  const marge = roundEuro(htApresRemise - totalCoutAchat);
  const tauxMarge = htApresRemise > 0 ? roundEuro((marge / htApresRemise) * 100) : 0;

  // Retention guarantee (5% of HT, not TTC - per French BTP law)
  // Note: Changed from TTC to HT for legal compliance
  const ttcBrut = roundEuro(htApresRemise + totalTVA);
  const retenueGarantie = form.retenueGarantie ? roundEuro(htApresRemise * 0.05) : 0;
  const ttcNet = roundEuro(ttcBrut - retenueGarantie);

  return {
    totalHT,
    totalCoutAchat,
    remiseAmount,
    htApresRemise,
    tvaParTaux,
    totalTVA,
    ttc: ttcBrut,
    retenueGarantie,
    ttcNet,
    marge,
    tauxMarge
  };
}

/**
 * Format money in French locale
 * @param {number} amount
 * @returns {string}
 */
export function formatMoney(amount) {
  return (amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';
}

/**
 * Status display configuration
 */
export const STATUS_CONFIG = {
  brouillon: { label: 'Brouillon', color: 'amber', order: 0 },
  envoye: { label: 'Envoyé', color: 'amber', order: 1 },
  vu: { label: 'Vu', color: 'blue', order: 1 },
  accepte: { label: 'Accepté', color: 'emerald', order: 2 },
  acompte_facture: { label: 'Acompte facturé', color: 'blue', order: 3 },
  facture: { label: 'Facturé', color: 'green', order: 4 },
  payee: { label: 'Payée', color: 'purple', order: 5 },
  refuse: { label: 'Refusé', color: 'red', order: 6 }
};

/**
 * Get status order for sorting
 * @param {string} status
 * @returns {number}
 */
export function getStatusOrder(status) {
  return STATUS_CONFIG[status]?.order ?? 99;
}

/**
 * Sort devis by different criteria
 * @param {Array} items
 * @param {string} sortBy - 'recent', 'status', or 'amount'
 * @returns {Array}
 */
export function sortDevis(items, sortBy = 'recent') {
  switch (sortBy) {
    case 'status':
      return [...items].sort((a, b) => getStatusOrder(a.statut) - getStatusOrder(b.statut));
    case 'amount':
      return [...items].sort((a, b) => (b.total_ttc || 0) - (a.total_ttc || 0));
    case 'recent':
    default:
      return [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

/**
 * Filter devis by type and status
 * @param {Array} items
 * @param {string} filter - 'all', 'devis', 'factures', 'attente'
 * @param {string} search - Search query for numero
 * @returns {Array}
 */
export function filterDevis(items, filter = 'all', search = '') {
  return items.filter(d => {
    if (filter === 'devis' && d.type !== 'devis') return false;
    if (filter === 'factures' && d.type !== 'facture') return false;
    if (filter === 'attente' && !['envoye', 'vu'].includes(d.statut)) return false;
    if (search && !d.numero?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
}

/**
 * Create default form state
 * @param {Object} entreprise - Company settings
 * @returns {Object}
 */
export function createDefaultDevisForm(entreprise = {}) {
  return {
    type: 'devis',
    clientId: '',
    chantierId: '',
    date: new Date().toISOString().split('T')[0],
    validite: entreprise?.validiteDevis || 30,
    sections: [{ id: '1', titre: '', lignes: [] }],
    tvaDefaut: entreprise?.tvaDefaut || 10,
    remise: 0,
    retenueGarantie: false,
    notes: ''
  };
}
