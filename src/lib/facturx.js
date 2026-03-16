/**
 * Factur-X XML Generator for French Invoice Compliance (2026)
 *
 * Implements the Factur-X MINIMUM profile (EN16931)
 * This is the mandatory format for B2B invoices in France starting 2026
 *
 * @see https://fnfe-mpe.org/factur-x/
 */

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
 * Generate Factur-X XML (MINIMUM profile)
 *
 * @param {Object} invoice - Invoice/devis object
 * @param {Object} client - Client object
 * @param {Object} entreprise - Company object
 * @returns {string} XML string conforming to Factur-X MINIMUM
 */
export function generateFacturXML(invoice, client, entreprise) {
  const now = new Date();
  const docTypeCode = getDocumentTypeCode(invoice.type);
  const vatCategoryCode = getVatCategoryCode(invoice.tvaRate || 0);

  // Currency code (always EUR for French businesses)
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

  <!-- Exchange Document Context -->
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <!-- Exchanged Document (Invoice Header) -->
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(invoice.numero)}</ram:ID>
    <ram:TypeCode>${docTypeCode}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDate(invoice.date)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <!-- Supply Chain Trade Transaction -->
  <rsm:SupplyChainTradeTransaction>

    <!-- Trade Agreement (Seller & Buyer) -->
    <ram:ApplicableHeaderTradeAgreement>

      <!-- Seller (Your Company) -->
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

      <!-- Buyer (Client) -->
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

    <!-- Trade Delivery -->
    <ram:ApplicableHeaderTradeDelivery/>

    <!-- Trade Settlement (Payment & Totals) -->
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${currencyCode}</ram:InvoiceCurrencyCode>

      <!-- Payment Terms -->
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDate(dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>

      <!-- Tax Summary -->
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${formatAmount(invoice.tva || 0)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${formatAmount(invoice.total_ht || 0)}</ram:BasisAmount>
        <ram:CategoryCode>${vatCategoryCode}</ram:CategoryCode>
        <ram:RateApplicablePercent>${formatAmount(invoice.tvaRate || 0)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>

      <!-- Monetary Summary -->
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

/**
 * Extract postcode from French address
 * @param {string} address - Full address
 * @returns {string} Postcode or empty string
 */
function extractPostcode(address) {
  if (!address) return '';
  // Match French postcodes (5 digits)
  const match = address.match(/\b(\d{5})\b/);
  return match ? match[1] : '';
}

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
  if (!invoice.numero) errors.push('Numero de facture manquant');
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
    errors.push('Numero TVA intracommunautaire recommande');
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
  // Only invoices (not quotes) can be Factur-X compliant
  if (invoice.type !== 'facture') return false;

  const validation = validateFacturX(invoice, client, entreprise);
  return validation.valid;
}

/**
 * Generate a downloadable XML file
 * @param {Object} invoice - Invoice object
 * @param {Object} client - Client object
 * @param {Object} entreprise - Company object
 */
export function downloadFacturXML(invoice, client, entreprise) {
  const xml = generateFacturXML(invoice, client, entreprise);
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
  validateFacturX,
  isFacturXCompliant,
  downloadFacturXML
};
