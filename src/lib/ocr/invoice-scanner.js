/**
 * Module de scan OCR pour factures fournisseurs
 * Permet d'extraire automatiquement les informations d'une facture
 * En production, utiliser un service OCR comme Google Vision, AWS Textract, ou Mindee
 */

// Categories de depenses auto-detectees
export const EXPENSE_CATEGORIES = {
  MATERIEL: { id: 'materiel', label: 'Materiel', keywords: ['brico', 'leroy', 'castorama', 'point p', 'cedeo', 'prolians', 'rexel', 'sonepar'] },
  OUTILLAGE: { id: 'outillage', label: 'Outillage', keywords: ['bosch', 'makita', 'dewalt', 'hilti', 'milwaukee', 'metabo'] },
  CARBURANT: { id: 'carburant', label: 'Carburant', keywords: ['total', 'shell', 'bp', 'esso', 'avia', 'intermarche', 'leclerc carburant'] },
  LOCATION: { id: 'location', label: 'Location', keywords: ['loxam', 'kiloutou', 'hertz', 'europcar', 'location'] },
  FOURNITURES: { id: 'fournitures', label: 'Fournitures', keywords: ['office depot', 'staples', 'bureau vallee', 'raja'] },
  RESTAURANT: { id: 'restaurant', label: 'Restaurant', keywords: ['restaurant', 'brasserie', 'cafe', 'traiteur'] },
  AUTRE: { id: 'autre', label: 'Autre', keywords: [] }
};

// Regex patterns pour extraction
const PATTERNS = {
  // Montants
  TOTAL_TTC: /total\s*(?:ttc|t\.t\.c\.?)?\s*:?\s*€?\s*([\d\s]+[,.]?\d{0,2})\s*€?/i,
  TOTAL_HT: /(?:total\s*)?(?:h\.?t\.?|ht|hors\s*taxes?)\s*:?\s*€?\s*([\d\s]+[,.]?\d{0,2})\s*€?/i,
  TVA: /(?:tva|t\.v\.a\.?)\s*(?:\d{1,2}(?:[,.]?\d{0,2})?\s*%?)?\s*:?\s*€?\s*([\d\s]+[,.]?\d{0,2})\s*€?/i,
  TAUX_TVA: /(?:tva|t\.v\.a\.?)\s*(\d{1,2}(?:[,.]?\d{0,2})?)\s*%/i,

  // Dates
  DATE_FR: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,
  DATE_TEXT: /(\d{1,2})\s*(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s*(\d{4})/i,

  // Fournisseur
  SIRET: /siret\s*:?\s*(\d{3}\s*\d{3}\s*\d{3}\s*\d{5})/i,
  TVA_INTRA: /(?:tva\s*)?(?:intra)?(?:communautaire)?\s*:?\s*(fr\s*\d{2}\s*\d{3}\s*\d{3}\s*\d{3})/i,

  // Numero facture
  FACTURE_NUM: /(?:facture|fact\.?|fa|n°)\s*(?:n°|num|numero)?\s*:?\s*([A-Z0-9\-\/]+)/i
};

// Mois en francais
const MOIS_FR = {
  'janvier': '01', 'fevrier': '02', 'mars': '03', 'avril': '04',
  'mai': '05', 'juin': '06', 'juillet': '07', 'aout': '08',
  'septembre': '09', 'octobre': '10', 'novembre': '11', 'decembre': '12'
};

/**
 * Parse un montant francais (1 234,56 ou 1234.56)
 */
const parseAmount = (str) => {
  if (!str) return 0;
  // Remove spaces, replace comma with dot
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Parse une date au format FR
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;

  // Try DD/MM/YYYY format
  const matchDMY = dateStr.match(PATTERNS.DATE_FR);
  if (matchDMY) {
    let [, day, month, year] = matchDMY;
    if (year.length === 2) year = '20' + year;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try textual format
  const matchText = dateStr.match(PATTERNS.DATE_TEXT);
  if (matchText) {
    const [, day, monthName, year] = matchText;
    const month = MOIS_FR[monthName.toLowerCase()];
    if (month) {
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }

  return null;
};

/**
 * Detecte la categorie de depense basee sur le texte
 */
const detectCategory = (text) => {
  const lowerText = text.toLowerCase();

  for (const [key, category] of Object.entries(EXPENSE_CATEGORIES)) {
    if (category.keywords.some(kw => lowerText.includes(kw))) {
      return category.id;
    }
  }

  return EXPENSE_CATEGORIES.AUTRE.id;
};

/**
 * Extrait les informations d'une facture a partir du texte OCR
 * @param {string} ocrText - Texte extrait par OCR
 * @returns {Object} Donnees extraites
 */
export const extractInvoiceData = (ocrText) => {
  if (!ocrText || typeof ocrText !== 'string') {
    return { success: false, error: 'Texte OCR invalide' };
  }

  const result = {
    success: true,
    confidence: 0,
    data: {
      numero: null,
      date: null,
      fournisseur: null,
      siret: null,
      tvaIntra: null,
      totalHT: null,
      totalTTC: null,
      montantTVA: null,
      tauxTVA: null,
      categorie: null,
      description: null
    },
    rawText: ocrText
  };

  let confidencePoints = 0;
  const maxPoints = 10;

  // Extract invoice number
  const numMatch = ocrText.match(PATTERNS.FACTURE_NUM);
  if (numMatch) {
    result.data.numero = numMatch[1].trim();
    confidencePoints += 1;
  }

  // Extract date
  const dateMatch = ocrText.match(PATTERNS.DATE_FR) || ocrText.match(PATTERNS.DATE_TEXT);
  if (dateMatch) {
    result.data.date = parseDate(dateMatch[0]);
    if (result.data.date) confidencePoints += 1.5;
  }

  // Extract SIRET
  const siretMatch = ocrText.match(PATTERNS.SIRET);
  if (siretMatch) {
    result.data.siret = siretMatch[1].replace(/\s/g, '');
    confidencePoints += 0.5;
  }

  // Extract TVA number
  const tvaIntraMatch = ocrText.match(PATTERNS.TVA_INTRA);
  if (tvaIntraMatch) {
    result.data.tvaIntra = tvaIntraMatch[1].toUpperCase().replace(/\s/g, '');
    confidencePoints += 0.5;
  }

  // Extract amounts
  const ttcMatch = ocrText.match(PATTERNS.TOTAL_TTC);
  if (ttcMatch) {
    result.data.totalTTC = parseAmount(ttcMatch[1]);
    if (result.data.totalTTC > 0) confidencePoints += 2;
  }

  const htMatch = ocrText.match(PATTERNS.TOTAL_HT);
  if (htMatch) {
    result.data.totalHT = parseAmount(htMatch[1]);
    if (result.data.totalHT > 0) confidencePoints += 2;
  }

  const tvaMatch = ocrText.match(PATTERNS.TVA);
  if (tvaMatch) {
    result.data.montantTVA = parseAmount(tvaMatch[1]);
    confidencePoints += 0.5;
  }

  const tauxMatch = ocrText.match(PATTERNS.TAUX_TVA);
  if (tauxMatch) {
    result.data.tauxTVA = parseAmount(tauxMatch[1]);
    confidencePoints += 0.5;
  }

  // Calculate missing values
  if (result.data.totalTTC && result.data.totalHT && !result.data.montantTVA) {
    result.data.montantTVA = result.data.totalTTC - result.data.totalHT;
  }
  if (result.data.totalTTC && !result.data.totalHT && result.data.tauxTVA) {
    result.data.totalHT = result.data.totalTTC / (1 + result.data.tauxTVA / 100);
    result.data.montantTVA = result.data.totalTTC - result.data.totalHT;
  }
  if (result.data.totalHT && !result.data.totalTTC && result.data.tauxTVA) {
    result.data.montantTVA = result.data.totalHT * (result.data.tauxTVA / 100);
    result.data.totalTTC = result.data.totalHT + result.data.montantTVA;
  }

  // Default TVA rate if we have both amounts
  if (!result.data.tauxTVA && result.data.totalHT && result.data.totalTTC) {
    const calculatedRate = ((result.data.totalTTC / result.data.totalHT) - 1) * 100;
    // Round to nearest standard rate
    if (calculatedRate >= 18 && calculatedRate <= 22) result.data.tauxTVA = 20;
    else if (calculatedRate >= 8 && calculatedRate <= 12) result.data.tauxTVA = 10;
    else if (calculatedRate >= 4 && calculatedRate <= 7) result.data.tauxTVA = 5.5;
    else if (calculatedRate >= 1 && calculatedRate <= 3) result.data.tauxTVA = 2.1;
  }

  // Extract supplier name (usually in first lines)
  const lines = ocrText.split('\n').filter(l => l.trim().length > 2);
  if (lines.length > 0) {
    // First non-empty line is often the company name
    const firstLine = lines[0].trim();
    if (firstLine.length > 3 && firstLine.length < 60) {
      result.data.fournisseur = firstLine;
      confidencePoints += 1;
    }
  }

  // Detect category
  result.data.categorie = detectCategory(ocrText);
  confidencePoints += 0.5;

  // Generate description
  const descParts = [];
  if (result.data.fournisseur) descParts.push(result.data.fournisseur);
  if (result.data.numero) descParts.push(`Fact. ${result.data.numero}`);
  result.data.description = descParts.join(' - ') || 'Depense scannee';

  // Calculate confidence
  result.confidence = Math.min(100, Math.round((confidencePoints / maxPoints) * 100));

  return result;
};

/**
 * Simule un appel OCR vers un service externe
 * En production, remplacer par un vrai appel API (Google Vision, AWS Textract, Mindee, etc.)
 */
export const processImageOCR = async (imageData) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // In production, this would call a real OCR API
  // For demo, we return simulated extracted text
  console.log('Processing OCR for image:', imageData.substring(0, 50) + '...');

  // Simulated OCR text response
  const simulatedText = `
    POINT P MATERIAUX
    123 Avenue du Batiment
    75001 Paris

    SIRET: 123 456 789 00012
    TVA Intracommunautaire: FR12345678901

    Facture N° FA-2024-00156
    Date: 15/01/2024

    Designation                    Quantite    Prix Unit.    Total HT
    -----------------------------------------------------------------
    Ciment CEM II 32.5 25kg           10        8,50         85,00
    Sable 0/4 (tonne)                 2       45,00         90,00
    Gravier 4/20 (tonne)              1       52,00         52,00
    Fer a beton 10mm (barre)         20        4,50         90,00

    -----------------------------------------------------------------
    Total HT:                                              317,00 EUR
    TVA 20%:                                                63,40 EUR
    Total TTC:                                             380,40 EUR

    Reglement a 30 jours
    Merci de votre confiance
  `;

  return {
    success: true,
    text: simulatedText,
    processingTime: 1500
  };
};

/**
 * Pipeline complet: image -> OCR -> extraction
 */
export const scanInvoice = async (imageData) => {
  try {
    // Step 1: OCR
    const ocrResult = await processImageOCR(imageData);
    if (!ocrResult.success) {
      return { success: false, error: 'Echec OCR' };
    }

    // Step 2: Extract data
    const extractedData = extractInvoiceData(ocrResult.text);

    return {
      ...extractedData,
      ocrTime: ocrResult.processingTime
    };
  } catch (error) {
    console.error('Scan error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Valide et formate les donnees extraites pour creation depense
 */
export const formatAsExpense = (extractedData, chantierId = null) => {
  if (!extractedData || !extractedData.success) {
    return null;
  }

  const data = extractedData.data;

  return {
    date: data.date || new Date().toISOString().split('T')[0],
    description: data.description || 'Depense scannee',
    fournisseur: data.fournisseur || '',
    montant: data.totalHT || data.totalTTC || 0,
    montantTTC: data.totalTTC || 0,
    tauxTVA: data.tauxTVA || 20,
    montantTVA: data.montantTVA || 0,
    categorie: data.categorie || 'autre',
    chantierId: chantierId,
    numeroFacture: data.numero || '',
    siret: data.siret || '',
    scanConfidence: extractedData.confidence || 0,
    scannedAt: new Date().toISOString()
  };
};

export default {
  EXPENSE_CATEGORIES,
  extractInvoiceData,
  processImageOCR,
  scanInvoice,
  formatAsExpense
};
