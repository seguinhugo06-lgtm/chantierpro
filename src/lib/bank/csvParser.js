/**
 * Universal French Bank CSV Parser
 *
 * Detects and parses CSV files from major French banks:
 * - Société Générale, BNP Paribas, CIC/Crédit Mutuel, Caisse d'Épargne,
 *   La Banque Postale, LCL, Hello Bank, Qonto, Shine, N26, Boursorama,
 *   Crédit Agricole, Revolut
 *
 * Returns normalized transactions: { date, libelle, montant, solde }
 * with SHA-256 hash for deduplication.
 */

// ---------------------------------------------------------------------------
// Bank format definitions
// ---------------------------------------------------------------------------

const BANK_FORMATS = [
  {
    id: 'societe_generale',
    name: 'Société Générale',
    detect: (headers) => matchHeaders(headers, ['date', 'libellé', 'débit', 'crédit', 'solde']),
    parse: (row, headers) => {
      const idx = indexMap(headers);
      const debit = parseAmount(row[idx['débit'] ?? idx['debit']]);
      const credit = parseAmount(row[idx['crédit'] ?? idx['credit']]);
      return {
        date: parseDate(row[idx['date']]),
        libelle: clean(row[idx['libellé'] ?? idx['libelle']]),
        montant: credit ? credit : debit ? -Math.abs(debit) : 0,
        solde: parseAmount(row[idx['solde']]),
      };
    },
  },
  {
    id: 'bnp_paribas',
    name: 'BNP Paribas',
    detect: (headers) => matchHeaders(headers, ['date opération', 'libellé', 'montant']) ||
                          matchHeaders(headers, ['date operation', 'libellé', 'montant']),
    parse: (row, headers) => {
      const idx = indexMap(headers);
      return {
        date: parseDate(row[idx['date opération'] ?? idx['date operation'] ?? idx['date']]),
        libelle: clean(row[idx['libellé'] ?? idx['libelle']]),
        montant: parseAmount(row[idx['montant']]),
        solde: parseAmount(row[idx['solde']]),
      };
    },
  },
  {
    id: 'cic_credit_mutuel',
    name: 'CIC / Crédit Mutuel',
    detect: (headers) => matchHeaders(headers, ['date', 'valeur', 'libellé', 'débit', 'crédit']) ||
                          matchHeaders(headers, ['date', 'date valeur', 'libellé', 'débit', 'crédit']),
    parse: (row, headers) => {
      const idx = indexMap(headers);
      const debit = parseAmount(row[idx['débit'] ?? idx['debit']]);
      const credit = parseAmount(row[idx['crédit'] ?? idx['credit']]);
      return {
        date: parseDate(row[idx['date']]),
        libelle: clean(row[idx['libellé'] ?? idx['libelle']]),
        montant: credit ? credit : debit ? -Math.abs(debit) : 0,
        solde: null,
      };
    },
  },
  {
    id: 'caisse_epargne',
    name: "Caisse d'Épargne",
    detect: (headers) => matchHeaders(headers, ['date', 'libellé', 'débit', 'crédit', 'solde']) &&
                          !matchHeaders(headers, ['valeur']),
    parse: (row, headers) => {
      const idx = indexMap(headers);
      const debit = parseAmount(row[idx['débit'] ?? idx['debit']]);
      const credit = parseAmount(row[idx['crédit'] ?? idx['credit']]);
      return {
        date: parseDate(row[idx['date']]),
        libelle: clean(row[idx['libellé'] ?? idx['libelle']]),
        montant: credit ? credit : debit ? -Math.abs(debit) : 0,
        solde: parseAmount(row[idx['solde']]),
      };
    },
  },
  {
    id: 'banque_postale',
    name: 'La Banque Postale',
    detect: (headers) => matchHeaders(headers, ['date', 'libellé', 'montant']) &&
                          headers.length <= 4,
    parse: (row, headers) => {
      const idx = indexMap(headers);
      return {
        date: parseDate(row[idx['date']]),
        libelle: clean(row[idx['libellé'] ?? idx['libelle']]),
        montant: parseAmount(row[idx['montant']]),
        solde: null,
      };
    },
  },
  {
    id: 'lcl',
    name: 'LCL',
    detect: (headers) => matchHeaders(headers, ['date', 'libellé', 'débit', 'crédit']) &&
                          !matchHeaders(headers, ['solde', 'valeur']),
    parse: (row, headers) => {
      const idx = indexMap(headers);
      const debit = parseAmount(row[idx['débit'] ?? idx['debit']]);
      const credit = parseAmount(row[idx['crédit'] ?? idx['credit']]);
      return {
        date: parseDate(row[idx['date']]),
        libelle: clean(row[idx['libellé'] ?? idx['libelle']]),
        montant: credit ? credit : debit ? -Math.abs(debit) : 0,
        solde: null,
      };
    },
  },
  {
    id: 'qonto',
    name: 'Qonto',
    detect: (headers) => matchHeaders(headers, ['date', 'libellé', 'montant ttc']) ||
                          matchHeaders(headers, ['date', 'libellé', 'montant ht']),
    parse: (row, headers) => {
      const idx = indexMap(headers);
      return {
        date: parseDate(row[idx['date']]),
        libelle: clean(row[idx['libellé'] ?? idx['libelle']]),
        montant: parseAmount(row[idx['montant ttc'] ?? idx['montant ht'] ?? idx['montant']]),
        solde: null,
      };
    },
  },
  {
    id: 'shine',
    name: 'Shine',
    detect: (headers) => matchHeaders(headers, ['date', 'label', 'amount']),
    parse: (row, headers) => {
      const idx = indexMap(headers);
      return {
        date: parseDate(row[idx['date']]),
        libelle: clean(row[idx['label']]),
        montant: parseAmount(row[idx['amount']]),
        solde: parseAmount(row[idx['balance']]),
      };
    },
  },
  {
    id: 'n26',
    name: 'N26',
    detect: (headers) => matchHeaders(headers, ['date', 'bénéficiaire', 'montant (eur)']) ||
                          matchHeaders(headers, ['date', 'beneficiaire', 'montant (eur)']),
    parse: (row, headers) => {
      const idx = indexMap(headers);
      return {
        date: parseDate(row[idx['date']]),
        libelle: clean(row[idx['bénéficiaire'] ?? idx['beneficiaire'] ?? idx['payee']]),
        montant: parseAmount(row[idx['montant (eur)'] ?? idx['amount (eur)']]),
        solde: parseAmount(row[idx['solde (eur)'] ?? idx['balance (eur)']]),
      };
    },
  },
  {
    id: 'boursorama',
    name: 'Boursorama',
    detect: (headers) => matchHeaders(headers, ['dateop', 'libelle', 'montant']) ||
                          matchHeaders(headers, ['date op', 'libelle', 'montant']),
    parse: (row, headers) => {
      const idx = indexMap(headers);
      return {
        date: parseDate(row[idx['dateop'] ?? idx['date op'] ?? idx['date']]),
        libelle: clean(row[idx['libelle'] ?? idx['libellé']]),
        montant: parseAmount(row[idx['montant']]),
        solde: null,
      };
    },
  },
  {
    id: 'credit_agricole',
    name: 'Crédit Agricole',
    detect: (headers) => matchHeaders(headers, ['date', 'libellé', 'débit euros', 'crédit euros']) ||
                          matchHeaders(headers, ['date', 'libelle', 'debit euros', 'credit euros']),
    parse: (row, headers) => {
      const idx = indexMap(headers);
      const debit = parseAmount(row[idx['débit euros'] ?? idx['debit euros']]);
      const credit = parseAmount(row[idx['crédit euros'] ?? idx['credit euros']]);
      return {
        date: parseDate(row[idx['date']]),
        libelle: clean(row[idx['libellé'] ?? idx['libelle']]),
        montant: credit ? credit : debit ? -Math.abs(debit) : 0,
        solde: null,
      };
    },
  },
  {
    id: 'revolut',
    name: 'Revolut',
    detect: (headers) => matchHeaders(headers, ['date', 'description', 'amount']),
    parse: (row, headers) => {
      const idx = indexMap(headers);
      return {
        date: parseDate(row[idx['started date'] ?? idx['date']]),
        libelle: clean(row[idx['description']]),
        montant: parseAmount(row[idx['amount']]),
        solde: parseAmount(row[idx['balance']]),
      };
    },
  },
];

// Fallback: generic format with heuristic column detection
const GENERIC_FORMAT = {
  id: 'generique',
  name: 'Format générique',
  parse: (row, headers) => {
    const idx = indexMap(headers);
    // Try to find date, libelle, montant columns by common names
    const dateCol = findCol(idx, ['date', 'date opération', 'date operation', 'dateop', 'date op', 'started date']);
    const libelleCol = findCol(idx, ['libellé', 'libelle', 'label', 'description', 'bénéficiaire', 'beneficiaire', 'payee', 'objet']);
    const montantCol = findCol(idx, ['montant', 'amount', 'montant ttc', 'montant (eur)', 'amount (eur)']);
    const debitCol = findCol(idx, ['débit', 'debit', 'débit euros', 'debit euros']);
    const creditCol = findCol(idx, ['crédit', 'credit', 'crédit euros', 'credit euros']);
    const soldeCol = findCol(idx, ['solde', 'balance', 'solde (eur)', 'balance (eur)']);

    let montant = 0;
    if (montantCol !== null) {
      montant = parseAmount(row[montantCol]);
    } else if (debitCol !== null || creditCol !== null) {
      const debit = debitCol !== null ? parseAmount(row[debitCol]) : 0;
      const credit = creditCol !== null ? parseAmount(row[creditCol]) : 0;
      montant = credit ? credit : debit ? -Math.abs(debit) : 0;
    }

    return {
      date: dateCol !== null ? parseDate(row[dateCol]) : null,
      libelle: libelleCol !== null ? clean(row[libelleCol]) : row[1] || '',
      montant,
      solde: soldeCol !== null ? parseAmount(row[soldeCol]) : null,
    };
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize header string for matching */
function normalizeHeader(h) {
  return (h || '')
    .toLowerCase()
    .trim()
    .replace(/[""]/g, '')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove accents for matching
}

/** Check if headers contain all expected fields (accent-insensitive) */
function matchHeaders(headers, expected) {
  const normalized = headers.map(normalizeHeader);
  return expected.every(e => normalized.some(h => h.includes(normalizeHeader(e))));
}

/** Build { normalizedHeader: index } map */
function indexMap(headers) {
  const map = {};
  headers.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (key) map[key] = i;
  });
  return map;
}

/** Find first matching column index */
function findCol(idx, candidates) {
  for (const c of candidates) {
    const normalized = normalizeHeader(c);
    for (const [key, index] of Object.entries(idx)) {
      if (key.includes(normalized)) return index;
    }
  }
  return null;
}

/** Parse amount string → number (handles French number formatting) */
function parseAmount(val) {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val)
    .replace(/[""]/g, '')
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/EUR/gi, '')
    .trim();
  if (!s) return null;
  // French format: 1.234,56 → 1234.56
  // Also handles: 1 234,56
  let cleaned = s;
  // If comma is present as decimal separator
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, ''); // remove thousand sep
    cleaned = cleaned.replace(',', '.'); // comma → dot
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/** Parse date string → YYYY-MM-DD */
function parseDate(val) {
  if (!val) return null;
  const s = String(val).replace(/[""]/g, '').trim();

  // DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;

  // YYYY-MM-DD (ISO)
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // DD/MM/YY
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
  if (m) {
    const year = parseInt(m[3]) > 50 ? `19${m[3]}` : `20${m[3]}`;
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }

  // Try native Date parsing as last resort
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

/** Clean libelle string */
function clean(s) {
  if (!s) return '';
  return String(s)
    .replace(/[""]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Generate SHA-256 hash for deduplication */
async function generateHash(date, libelle, montant) {
  const str = `${date}|${libelle}|${montant}`;
  // Use SubtleCrypto if available (browser), otherwise fallback to simple hash
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Simple fallback hash (for environments without SubtleCrypto)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + '_' + str.length;
}

// ---------------------------------------------------------------------------
// CSV tokenizer — handles ; and , separators, quoted fields
// ---------------------------------------------------------------------------

function detectSeparator(lines) {
  // Check first few lines for separator
  const candidates = [';', ',', '\t'];
  const scores = candidates.map(sep => {
    const counts = lines.slice(0, 5).map(line => {
      // Count separator occurrences outside of quotes
      let count = 0;
      let inQuote = false;
      for (const ch of line) {
        if (ch === '"') inQuote = !inQuote;
        else if (ch === sep && !inQuote) count++;
      }
      return count;
    });
    // Check consistency: all lines should have similar count
    const consistent = counts.length > 1 && counts.every(c => c === counts[0] && c > 0);
    return { sep, avg: counts.reduce((a, b) => a + b, 0) / counts.length, consistent };
  });

  // Prefer consistent separator with highest average
  const consistent = scores.filter(s => s.consistent);
  if (consistent.length > 0) return consistent.sort((a, b) => b.avg - a.avg)[0].sep;
  return scores.sort((a, b) => b.avg - a.avg)[0].sep;
}

function splitCSVLine(line, separator) {
  const fields = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === separator && !inQuote) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ---------------------------------------------------------------------------
// Auto-categorization heuristics
// ---------------------------------------------------------------------------

const CATEGORY_RULES = [
  { pattern: /loyer|bail|agence immo|foncier/i, cat: 'Loyer' },
  { pattern: /assurance|maif|axa|allianz|matmut|decennale|rc pro/i, cat: 'Assurance' },
  { pattern: /salaire|paie|urssaf|csg|pole emploi|france travail|cotisation/i, cat: 'Salaires & charges' },
  { pattern: /point p|leroy merlin|bricoman|cedeo|brossette|materiaux|casto|bricomarché|brico\s?depot/i, cat: 'Matériaux' },
  { pattern: /sous.?trait|st\s|prestation\s/i, cat: 'Sous-traitance' },
  { pattern: /carburant|total\s|shell|bp\s|esso|peage|autoroute|parking/i, cat: 'Véhicule & déplacements' },
  { pattern: /orange|sfr|bouygues|free|internet|telecom|ovh/i, cat: 'Télécom & internet' },
  { pattern: /edf|engie|eau|gaz|electricite|veolia/i, cat: 'Énergie & eau' },
  { pattern: /impot|taxe|cfe|cvae|tva|dgfip|tresor public/i, cat: 'Impôts & taxes' },
  { pattern: /banque|agios|commission|frais bancaire/i, cat: 'Frais bancaires' },
  { pattern: /virement recu|vir\s.*recu|encaissement/i, cat: 'Encaissement client' },
];

function autoCategorie(libelle) {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(libelle)) return rule.cat;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse a bank CSV string and return normalized transactions
 *
 * @param {string} csvContent - Raw CSV file content
 * @returns {Promise<{ transactions: Array, banqueDetectee: string, erreurs: string[] }>}
 */
export async function parseBankCSV(csvContent) {
  const erreurs = [];

  if (!csvContent || typeof csvContent !== 'string') {
    return { transactions: [], banqueDetectee: null, erreurs: ['Fichier vide ou invalide'] };
  }

  // Normalize line endings and split
  const lines = csvContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    return { transactions: [], banqueDetectee: null, erreurs: ['Le fichier doit contenir au moins 2 lignes (en-tête + données)'] };
  }

  // Skip BOM if present
  if (lines[0].charCodeAt(0) === 0xFEFF) {
    lines[0] = lines[0].slice(1);
  }

  // Detect separator
  const separator = detectSeparator(lines);

  // Parse header row
  const headers = splitCSVLine(lines[0], separator);

  // Detect bank format
  let detectedFormat = null;
  for (const fmt of BANK_FORMATS) {
    if (fmt.detect(headers)) {
      detectedFormat = fmt;
      break;
    }
  }

  const bankName = detectedFormat ? detectedFormat.name : 'Format générique';
  const parser = detectedFormat || GENERIC_FORMAT;

  // Parse data rows
  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const row = splitCSVLine(lines[i], separator);
      if (row.length < 2 || row.every(cell => !cell)) continue; // skip empty rows

      const parsed = parser.parse(row, headers);

      // Validate required fields
      if (!parsed.date) {
        erreurs.push(`Ligne ${i + 1}: date invalide`);
        continue;
      }
      if (!parsed.libelle) {
        erreurs.push(`Ligne ${i + 1}: libellé manquant`);
        continue;
      }
      if (parsed.montant === null || parsed.montant === undefined || isNaN(parsed.montant)) {
        erreurs.push(`Ligne ${i + 1}: montant invalide`);
        continue;
      }

      // Round montant to 2 decimals
      parsed.montant = Math.round(parsed.montant * 100) / 100;
      if (parsed.solde !== null) {
        parsed.solde = Math.round(parsed.solde * 100) / 100;
      }

      // Auto-categorize
      parsed.categorie = autoCategorie(parsed.libelle);

      // Generate dedup hash
      parsed.hash = await generateHash(parsed.date, parsed.libelle, parsed.montant);

      transactions.push(parsed);
    } catch (err) {
      erreurs.push(`Ligne ${i + 1}: ${err.message}`);
    }
  }

  return {
    transactions,
    banqueDetectee: bankName,
    erreurs,
  };
}

/**
 * Read a File object and parse it as bank CSV
 *
 * @param {File} file - CSV file from file input or drag & drop
 * @returns {Promise<{ transactions: Array, banqueDetectee: string, erreurs: string[] }>}
 */
export async function parseBankFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const result = await parseBankCSV(content);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    // Try UTF-8 first, most common encoding
    reader.readAsText(file, 'UTF-8');
  });
}

export { autoCategorie, parseAmount, parseDate, generateHash };
