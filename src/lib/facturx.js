/**
 * Factur-X XML Generator for French Invoice Compliance (2026)
 *
 * Implements Factur-X MINIMUM and BASIC profiles (EN16931)
 * Mandatory format for B2B invoices in France starting September 2026
 *
 * @see https://fnfe-mpe.org/factur-x/
 */

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Format a date to Factur-X format (YYYYMMDD)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * Format amount to 2 decimal places
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount
 */
const formatAmount = (amount) => {
  return (amount || 0).toFixed(2);
};

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
const escapeXml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Get document type code for Factur-X
 * @param {string} type - Document type ('facture' or 'devis')
 * @returns {string} Type code (380 = Invoice, 381 = Credit Note, 384 = Corrective, 389 = Quote)
 */
const getDocumentTypeCode = (type) => {
  switch (type) {
    case 'facture': return '380'; // Commercial Invoice
    case 'avoir': return '381';   // Credit Note
    case 'devis': return '389';   // Quote (not standard but useful)
    default: return '380';
  }
};

/**
 * Get VAT category code
 * @param {number} rate - VAT rate
 * @returns {string} Category code (S = Standard, Z = Zero, E = Exempt)
 */
const getVatCategoryCode = (rate) => {
  if (rate === 0) return 'E'; // Exempt (micro-entreprise)
  return 'S'; // Standard rate
};

/**
 * Extract postcode from French address
 * @param {string} address - Full address
 * @returns {string} Postcode or empty string
 */
function extractPostcode(address) {
  if (!address) return '';
  const match = address.match(/\b(\d{5})\b/);
  return match ? match[1] : '';
}

/**
 * Map French unit names to UN/ECE Recommendation 20 codes
 * @param {string} unite - French unit name
 * @returns {string} UN/ECE unit code
 */
const UNITE_MAP = {
  // Surface
  'm²': 'MTK',
  'm2': 'MTK',
  'mètres carrés': 'MTK',
  'metres carres': 'MTK',
  // Length
  'ml': 'LM',
  'm': 'MTR',
  'mètre': 'MTR',
  'mètres': 'MTR',
  'metre': 'MTR',
  'mètre linéaire': 'LM',
  'metre lineaire': 'LM',
  // Volume
  'm³': 'MTQ',
  'm3': 'MTQ',
  'litre': 'LTR',
  'l': 'LTR',
  // Weight
  'kg': 'KGM',
  'tonne': 'TNE',
  't': 'TNE',
  // Time
  'h': 'HUR',
  'heure': 'HUR',
  'heures': 'HUR',
  'jour': 'DAY',
  'jours': 'DAY',
  'j': 'DAY',
  // Count
  'unité': 'C62',
  'unite': 'C62',
  'u': 'C62',
  'pièce': 'C62',
  'piece': 'C62',
  'pce': 'C62',
  // Lump sum
  'forfait': 'C62',
  'ens': 'C62',
  'ensemble': 'C62',
  'lot': 'C62',
};

function getUniteCode(unite) {
  if (!unite) return 'C62';
  const normalized = unite.toLowerCase().trim();
  return UNITE_MAP[normalized] || 'C62'; // Default: "one" (piece)
}

// ─── MINIMUM Profile ──────────────────────────────────────────

/**
 * Generate Factur-X XML (MINIMUM profile)
 *
 * @param {Object} invoice - Invoice/devis object
 * @param {Object} client - Client object
 * @param {Object} entreprise - Company object
 * @returns {string} XML string conforming to Factur-X MINIMUM
 */
export function generateFacturXML(invoice, client, entreprise) {
  const docTypeCode = getDocumentTypeCode(invoice.type);
  const vatCategoryCode = getVatCategoryCode(invoice.tvaRate || 0);
  const currencyCode = 'EUR';

  // Payment due date (30 days default)
  const dueDate = new Date(invoice.date);
  dueDate.setDate(dueDate.getDate() + (invoice.validite || 30));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
    xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">

  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(invoice.numero)}</ram:ID>
    <ram:TypeCode>${docTypeCode}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDate(invoice.date)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>

    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(entreprise.nom || 'Entreprise')}</ram:Name>
        ${entreprise.siret ? `<ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${escapeXml(entreprise.siret)}</ram:ID>
        </ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(extractPostcode(entreprise.adresse))}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(entreprise.adresse || '')}</ram:LineOne>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        ${entreprise.email ? `<ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${escapeXml(entreprise.email)}</ram:URIID>
        </ram:URIUniversalCommunication>` : ''}
        ${entreprise.tvaIntra ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(entreprise.tvaIntra)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>

      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(client.nom || client.entreprise || 'Client')}</ram:Name>
        ${client.siret ? `<ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${escapeXml(client.siret)}</ram:ID>
        </ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(extractPostcode(client.adresse))}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(client.adresse || '')}</ram:LineOne>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        ${client.email ? `<ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${escapeXml(client.email)}</ram:URIID>
        </ram:URIUniversalCommunication>` : ''}
      </ram:BuyerTradeParty>

    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery/>

    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${currencyCode}</ram:InvoiceCurrencyCode>

      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDate(dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>

      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${formatAmount(invoice.tva || 0)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${formatAmount(invoice.total_ht || 0)}</ram:BasisAmount>
        <ram:CategoryCode>${vatCategoryCode}</ram:CategoryCode>
        <ram:RateApplicablePercent>${formatAmount(invoice.tvaRate || 0)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>

      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${formatAmount(invoice.total_ht || 0)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${formatAmount(invoice.total_ht || 0)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${currencyCode}">${formatAmount(invoice.tva || 0)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${formatAmount(invoice.total_ttc || 0)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${formatAmount(invoice.total_ttc || 0)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>

    </ram:ApplicableHeaderTradeSettlement>

  </rsm:SupplyChainTradeTransaction>

</rsm:CrossIndustryInvoice>`;

  return xml;
}

// ─── BASIC Profile ────────────────────────────────────────────

/**
 * Generate Factur-X XML (BASIC profile)
 * Extends MINIMUM with: line items, payment means (IBAN), delivery details
 *
 * @param {Object} invoice - Invoice/devis object with lignes[]
 * @param {Object} client - Client object
 * @param {Object} entreprise - Company object
 * @returns {string} XML string conforming to Factur-X BASIC
 */
export function generateFacturXMLBasic(invoice, client, entreprise) {
  const docTypeCode = getDocumentTypeCode(invoice.type);
  const currencyCode = 'EUR';
  const defaultTvaRate = invoice.tvaRate || entreprise?.tvaDefaut || 20;

  // Payment due date
  const dueDate = new Date(invoice.date);
  dueDate.setDate(dueDate.getDate() + (invoice.validite || entreprise?.delaiPaiement || 30));

  // Filter valid lines
  const lignes = (invoice.lignes || []).filter(l =>
    l.description && (l.prixUnitaire != null || l.prix_unitaire != null)
  );

  // Build TVA summary by rate
  const tvaByRate = {};
  lignes.forEach(l => {
    const rate = l.tva !== undefined ? l.tva : defaultTvaRate;
    const montant = (l.montant || 0) || ((l.quantite || 0) * (l.prixUnitaire || l.prix_unitaire || 0));
    if (!tvaByRate[rate]) tvaByRate[rate] = { base: 0, tax: 0 };
    tvaByRate[rate].base += montant;
    tvaByRate[rate].tax += montant * (rate / 100);
  });

  // Generate line items XML
  const lineItemsXml = lignes.map((l, i) => {
    const lineRate = l.tva !== undefined ? l.tva : defaultTvaRate;
    const lineVatCategory = getVatCategoryCode(lineRate);
    const prix = l.prixUnitaire || l.prix_unitaire || 0;
    const qte = l.quantite || 1;
    const montant = l.montant || (qte * prix);
    const uniteCode = getUniteCode(l.unite);

    return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${i + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(l.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${formatAmount(prix)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${uniteCode}">${formatAmount(qte)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${lineVatCategory}</ram:CategoryCode>
          <ram:RateApplicablePercent>${formatAmount(lineRate)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${formatAmount(montant)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  }).join('');

  // Generate TVA summary blocks
  const taxSummaryXml = Object.entries(tvaByRate).map(([rate, data]) => {
    const vatCategory = getVatCategoryCode(Number(rate));
    return `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${formatAmount(data.tax)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${formatAmount(data.base)}</ram:BasisAmount>
        <ram:CategoryCode>${vatCategory}</ram:CategoryCode>
        <ram:RateApplicablePercent>${formatAmount(Number(rate))}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`;
  }).join('');

  // Payment means
  const paymentMeansXml = entreprise.iban ? `
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${escapeXml(entreprise.iban.replace(/\s/g, ''))}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        ${entreprise.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>${escapeXml(entreprise.bic)}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>` : '';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
    xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">

  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(invoice.numero)}</ram:ID>
    <ram:TypeCode>${docTypeCode}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDate(invoice.date)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>

    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(entreprise.nom || 'Entreprise')}</ram:Name>
        ${entreprise.siret ? `<ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${escapeXml(entreprise.siret)}</ram:ID>
        </ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(extractPostcode(entreprise.adresse))}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(entreprise.adresse || '')}</ram:LineOne>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        ${entreprise.email ? `<ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${escapeXml(entreprise.email)}</ram:URIID>
        </ram:URIUniversalCommunication>` : ''}
        ${entreprise.tvaIntra ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(entreprise.tvaIntra)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
      </ram:SellerTradeParty>

      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(client.nom || client.entreprise || 'Client')}</ram:Name>
        ${client.siret ? `<ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${escapeXml(client.siret)}</ram:ID>
        </ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(extractPostcode(client.adresse))}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(client.adresse || '')}</ram:LineOne>
          <ram:CountryID>FR</ram:CountryID>
        </ram:PostalTradeAddress>
        ${client.email ? `<ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${escapeXml(client.email)}</ram:URIID>
        </ram:URIUniversalCommunication>` : ''}
      </ram:BuyerTradeParty>

    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery/>

    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${currencyCode}</ram:InvoiceCurrencyCode>
${paymentMeansXml}

      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDate(dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>

${taxSummaryXml}

      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${formatAmount(invoice.total_ht || 0)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${formatAmount(invoice.total_ht || 0)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${currencyCode}">${formatAmount(invoice.tva || 0)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${formatAmount(invoice.total_ttc || 0)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${formatAmount(invoice.total_ttc || 0)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>

    </ram:ApplicableHeaderTradeSettlement>
${lineItemsXml}

  </rsm:SupplyChainTradeTransaction>

</rsm:CrossIndustryInvoice>`;

  return xml;
}

// ─── Profile Selection ────────────────────────────────────────

/**
 * Auto-select the best achievable Factur-X profile
 * BASIC requires: IBAN + detailed line items
 * Falls back to MINIMUM otherwise
 *
 * @param {Object} invoice - Invoice object
 * @param {Object} client - Client object
 * @param {Object} entreprise - Company object
 * @returns {'basic'|'minimum'} Profile name
 */
export function selectProfile(invoice, client, entreprise) {
  const hasIban = !!entreprise?.iban?.trim();
  const hasDetailedLines = invoice.lignes?.length > 0 &&
    invoice.lignes.every(l => l.description && (l.prixUnitaire != null || l.prix_unitaire != null));

  if (hasIban && hasDetailedLines) return 'basic';
  return 'minimum';
}

// ─── Validation ───────────────────────────────────────────────

/**
 * Validate if invoice has minimum required fields for Factur-X
 * @param {Object} invoice - Invoice object
 * @param {Object} client - Client object
 * @param {Object} entreprise - Company object
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateFacturX(invoice, client, entreprise) {
  const errors = [];

  // Invoice checks
  if (!invoice.numero) errors.push('Numéro de facture manquant');
  if (!invoice.date) errors.push('Date de facture manquante');
  if (invoice.total_ht === undefined) errors.push('Total HT manquant');
  if (invoice.total_ttc === undefined) errors.push('Total TTC manquant');

  // Seller checks
  if (!entreprise.nom) errors.push('Nom entreprise manquant');
  if (!entreprise.siret) errors.push('SIRET manquant (obligatoire Factur-X)');
  if (!entreprise.adresse) errors.push('Adresse entreprise manquante');

  // Buyer checks
  if (!client.nom && !client.entreprise) errors.push('Nom client manquant');

  // For full compliance (optional but recommended)
  if (!entreprise.tvaIntra && (invoice.tvaRate || 0) > 0) {
    errors.push('Numéro TVA intracommunautaire recommandé');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if a document is Factur-X compliant
 * @param {Object} invoice - Invoice object
 * @param {Object} client - Client object
 * @param {Object} entreprise - Company object
 * @returns {boolean} True if compliant
 */
export function isFacturXCompliant(invoice, client, entreprise) {
  if (invoice.type !== 'facture') return false;
  const validation = validateFacturX(invoice, client, entreprise);
  return validation.valid;
}

// ─── Compliance Testing ───────────────────────────────────────

/**
 * Full Factur-X compliance test
 * Tests both entreprise readiness and actual XML generation
 *
 * @param {Object} invoice - Invoice/facture to test (or null for entreprise-only check)
 * @param {Object} client - Client object (or null)
 * @param {Object} entreprise - Company object
 * @returns {Object} Detailed compliance report
 */
export function testFacturXCompliance(invoice, client, entreprise) {
  const errors = [];
  const warnings = [];
  let score = 0;
  const maxScore = 100;

  // ── Part 1: Entreprise readiness (50 points) ──

  // SIRET (mandatory) — 10 pts
  if (entreprise?.siret?.trim()) {
    score += 10;
    // Validate SIRET format (14 digits)
    if (!/^\d{14}$/.test(entreprise.siret.replace(/\s/g, ''))) {
      warnings.push('Format SIRET invalide (14 chiffres attendus)');
      score -= 3;
    }
  } else {
    errors.push('SIRET manquant — obligatoire pour Factur-X');
  }

  // TVA Intracommunautaire — 10 pts
  if (entreprise?.tvaIntra?.trim()) {
    score += 10;
    if (!/^FR\d{11}$/.test(entreprise.tvaIntra.replace(/\s/g, ''))) {
      warnings.push('Format TVA intra. suspect (attendu: FR + 11 chiffres)');
      score -= 2;
    }
  } else {
    errors.push('N° TVA intracommunautaire manquant');
  }

  // Adresse — 8 pts
  if (entreprise?.adresse?.trim()) {
    score += 8;
    if (!extractPostcode(entreprise.adresse)) {
      warnings.push('Code postal non détecté dans l\'adresse');
      score -= 2;
    }
  } else {
    errors.push('Adresse entreprise manquante');
  }

  // Nom — 5 pts
  if (entreprise?.nom?.trim()) {
    score += 5;
  } else {
    errors.push('Nom entreprise manquant');
  }

  // IBAN (for BASIC profile) — 7 pts
  if (entreprise?.iban?.trim()) {
    score += 7;
    if (!/^FR\d{12}[A-Z0-9]{11}\d{2}$/.test(entreprise.iban.replace(/\s/g, ''))) {
      warnings.push('Format IBAN suspect');
      score -= 2;
    }
  } else {
    warnings.push('IBAN manquant — requis pour profil BASIC');
  }

  // RCS — 5 pts
  if (entreprise?.rcs?.trim()) {
    score += 5;
  } else {
    warnings.push('RCS manquant — recommandé');
  }

  // Email — 5 pts
  if (entreprise?.email?.trim()) {
    score += 5;
  } else {
    warnings.push('Email entreprise manquant');
  }

  // ── Part 2: Document-level validation (50 points) ──

  let profile = 'minimum';
  let xml = null;

  if (invoice && client) {
    // Basic fields — 15 pts
    const basicValidation = validateFacturX(invoice, client, entreprise);
    if (basicValidation.valid) {
      score += 15;
    } else {
      basicValidation.errors.forEach(e => {
        if (!errors.includes(e)) errors.push(e);
      });
      // Partial credit: some fields present
      score += Math.max(0, 15 - basicValidation.errors.length * 3);
    }

    // Profile detection — 10 pts
    profile = selectProfile(invoice, client, entreprise);
    if (profile === 'basic') {
      score += 10; // BASIC achievable = bonus
    } else {
      score += 5; // MINIMUM only
    }

    // Amount consistency — 10 pts
    if (invoice.lignes?.length > 0) {
      const sumLignes = invoice.lignes.reduce((sum, l) => {
        return sum + (l.montant || (l.quantite || 0) * (l.prixUnitaire || l.prix_unitaire || 0));
      }, 0);
      const diff = Math.abs(sumLignes - (invoice.total_ht || 0));
      if (diff < 0.02) {
        score += 10;
      } else if (diff < 1) {
        score += 5;
        warnings.push(`Écart de ${diff.toFixed(2)}€ entre somme des lignes et total HT`);
      } else {
        errors.push(`Incohérence: somme lignes (${sumLignes.toFixed(2)}€) ≠ total HT (${(invoice.total_ht || 0).toFixed(2)}€)`);
      }
    } else {
      score += 5; // No lines to validate
      warnings.push('Aucune ligne de détail — profil BASIC impossible');
    }

    // XML generation test — 15 pts
    try {
      xml = profile === 'basic'
        ? generateFacturXMLBasic(invoice, client, entreprise)
        : generateFacturXML(invoice, client, entreprise);

      // Basic XML well-formedness check
      if (xml.includes('<?xml') && xml.includes('</rsm:CrossIndustryInvoice>')) {
        score += 15;
      } else {
        score += 5;
        warnings.push('XML généré mais structure potentiellement incomplète');
      }
    } catch (err) {
      errors.push(`Erreur génération XML: ${err.message}`);
    }
  } else {
    // No invoice to test — only entreprise score counts (max 50)
    warnings.push('Aucune facture fournie pour test complet — score basé sur le profil entreprise uniquement');
  }

  // Clamp score
  const finalScore = Math.max(0, Math.min(maxScore, score));

  return {
    score: finalScore,
    profile,
    profileLabel: profile === 'basic' ? 'BASIC' : 'MINIMUM',
    errors,
    warnings,
    xml,
    isValid: errors.length === 0,
    isReady: finalScore >= 70,
  };
}

// ─── Legacy exports ───────────────────────────────────────────

/**
 * Generate a downloadable XML file
 * @param {Object} invoice - Invoice object
 * @param {Object} client - Client object
 * @param {Object} entreprise - Company object
 */
export function downloadFacturXML(invoice, client, entreprise) {
  const profile = selectProfile(invoice, client, entreprise);
  const xml = profile === 'basic'
    ? generateFacturXMLBasic(invoice, client, entreprise)
    : generateFacturXML(invoice, client, entreprise);

  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice.numero}_facturx.xml`;
  link.click();
  URL.revokeObjectURL(url);
}

export default {
  generateFacturXML,
  generateFacturXMLBasic,
  selectProfile,
  validateFacturX,
  isFacturXCompliant,
  testFacturXCompliance,
  downloadFacturXML,
};
