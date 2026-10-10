/**
 * Factur-X PDF/A-3 Pipeline
 *
 * Generates a real PDF/A-3 compliant document with embedded Factur-X XML.
 * Pipeline: HTML → jspdf → pdf-lib (PDF/A-3 markers + XML embed) → download
 *
 * 100% client-side — no server required.
 *
 * @see https://fnfe-mpe.org/factur-x/
 * @see https://pdf-lib.js.org/
 */

import { PDFDocument, PDFName, PDFString, PDFHexString, PDFDict, PDFArray, PDFNumber, PDFRawStream } from 'pdf-lib';
import { generateFacturXML, generateFacturXMLBasic, selectProfile, validateFacturX } from './facturx';
import { remettreFichier } from './natif';

/**
 * Embed Factur-X XML into a PDF and add PDF/A-3 metadata
 *
 * @param {Uint8Array|ArrayBuffer} basePdfBytes - Base PDF bytes (from jspdf)
 * @param {Object} invoice - Invoice object
 * @param {Object} client - Client object
 * @param {Object} entreprise - Company object
 * @param {Object} [options] - Options
 * @param {string} [options.profile] - Force profile ('minimum' or 'basic'), auto-detected if omitted
 * @returns {Promise<Uint8Array>} PDF/A-3 bytes with embedded XML
 */
export async function generateFacturXPDF(basePdfBytes, invoice, client, entreprise, options = {}) {
  // Determine profile
  const profile = options.profile || selectProfile(invoice, client, entreprise);

  // Generate XML based on profile
  const xmlString = profile === 'basic'
    ? generateFacturXMLBasic(invoice, client, entreprise)
    : generateFacturXML(invoice, client, entreprise);

  const xmlBytes = new Uint8Array(new TextEncoder().encode(xmlString));

  // Load the base PDF
  const pdfDoc = await PDFDocument.load(basePdfBytes, {
    updateMetadata: false, // We'll set metadata manually
  });

  // === 1. Embed XML using pdfDoc.attach() ===
  // pdf-lib 1.16+ has a built-in attach() method for embedded files
  await pdfDoc.attach(xmlBytes, 'factur-x.xml', {
    mimeType: 'text/xml',
    description: 'Factur-X XML invoice data',
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  // === 2. Add PDF/A-3 specific entries to catalog ===

  const context = pdfDoc.context;
  const catalog = pdfDoc.catalog;

  // Find the Filespec that attach() created, and add AFRelationship
  const namesDict = catalog.lookup(PDFName.of('Names'));
  if (namesDict instanceof PDFDict) {
    const embeddedFilesDict = namesDict.lookup(PDFName.of('EmbeddedFiles'));
    if (embeddedFilesDict instanceof PDFDict) {
      const namesArray = embeddedFilesDict.lookup(PDFName.of('Names'));
      if (namesArray instanceof PDFArray) {
        // Names array format: [name1, ref1, name2, ref2, ...]
        // Find the ref for factur-x.xml
        for (let i = 0; i < namesArray.size(); i += 2) {
          const nameEntry = namesArray.lookup(i);
          if (nameEntry && nameEntry.toString().includes('factur-x.xml')) {
            const fileSpecRef = namesArray.get(i + 1);
            if (fileSpecRef) {
              // Add AFRelationship to the Filespec
              const fileSpec = context.lookup(fileSpecRef);
              if (fileSpec instanceof PDFDict) {
                fileSpec.set(PDFName.of('AFRelationship'), PDFName.of('Alternative'));
              }
              // Add /AF (Associated Files) array to catalog — required for PDF/A-3
              catalog.set(PDFName.of('AF'), context.obj([fileSpecRef]));
            }
            break;
          }
        }
      }
    }
  }

  // Mark as PDF/A-3 with MarkInfo
  catalog.set(PDFName.of('MarkInfo'), context.obj({
    Marked: true,
  }));

  // === 3. Add OutputIntent for PDF/A-3 ===

  const outputIntentDict = context.obj({
    Type: PDFName.of('OutputIntent'),
    S: PDFName.of('GTS_PDFA1'),
    RegistryName: PDFString.of('http://www.color.org'),
    OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
    Info: PDFString.of('sRGB IEC61966-2.1'),
  });
  const outputIntentRef = context.register(outputIntentDict);
  catalog.set(PDFName.of('OutputIntents'), context.obj([outputIntentRef]));

  // === 4. Add PDF/A-3 XMP Metadata ===

  const conformanceLevel = profile === 'basic' ? 'BASIC' : 'MINIMUM';
  const xmpMetadata = buildXmpMetadata({
    title: `${invoice.type === 'facture' ? 'Facture' : 'Devis'} ${invoice.numero}`,
    creator: entreprise?.nom || 'Mallettico',
    producer: 'Mallettico / pdf-lib',
    conformanceLevel,
    documentType: invoice.type === 'facture' ? 'INVOICE' : 'QUOTE',
    documentFileName: 'factur-x.xml',
    version: '1.0',
  });

  const xmpBytes = new Uint8Array(new TextEncoder().encode(xmpMetadata));

  // Create XMP metadata stream
  try {
    const metadataDict = new Map();
    metadataDict.set(PDFName.of('Type'), PDFName.of('Metadata'));
    metadataDict.set(PDFName.of('Subtype'), PDFName.of('XML'));
    metadataDict.set(PDFName.of('Length'), PDFNumber.of(xmpBytes.length));

    const dictObj = PDFDict.fromMapWithContext(metadataDict, context);
    const stream = PDFRawStream.of(dictObj, xmpBytes);
    const metadataRef = context.register(stream);
    catalog.set(PDFName.of('Metadata'), metadataRef);
  } catch (err) {
    // If XMP stream creation fails, basic metadata (set below) still provides value
    console.warn('Could not create XMP metadata stream:', err.message);
  }

  // === 5. Set standard document metadata ===

  pdfDoc.setTitle(`${invoice.type === 'facture' ? 'Facture' : 'Devis'} ${invoice.numero}`);
  pdfDoc.setAuthor(entreprise?.nom || 'Mallettico');
  pdfDoc.setCreator('Mallettico');
  pdfDoc.setProducer('Mallettico / pdf-lib + jspdf');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Convert HTML content to PDF bytes using jspdf
 *
 * @param {string} htmlContent - Full HTML document string
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function htmlToPdfBytes(htmlContent) {
  // Même rendu que l'e-mail (src/lib/pdfDepuisHtml.js). L'ancienne voie jsPDF.html() posait le texte
  // hors de la page : PDF blanc (recette du 9 oct. 2026).
  const { pdfDepuisHtml } = await import('./pdfDepuisHtml.js');
  return pdfDepuisHtml(htmlContent);
}

/**
 * Main entry point: generates Factur-X PDF/A-3 and triggers download
 * Called by printPDF() in DevisPage.jsx for invoices
 *
 * @param {Object} invoice - Invoice/facture object
 * @param {Object} client - Client object
 * @param {Object} entreprise - Company object
 * @param {string} [htmlContent] - HTML generated by downloadPDF(). If omitted, generates basic PDF
 * @returns {Promise<void>}
 */
export async function generateAndDownloadFacturX(invoice, client, entreprise, htmlContent) {
  // Step 1: Validate minimum requirements
  const validation = validateFacturX(invoice, client || {}, entreprise || {});
  if (!validation.valid) {
    console.warn('Factur-X validation warnings:', validation.errors);
    // Continue anyway — we generate with available data
  }

  // Step 2: Generate base PDF from HTML
  let basePdfBytes;
  if (htmlContent) {
    basePdfBytes = await htmlToPdfBytes(htmlContent);
  } else {
    // Fallback: generate a minimal PDF with jspdf
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFontSize(16);
    doc.text(`Facture ${invoice.numero}`, 20, 30);
    doc.setFontSize(10);
    doc.text(`Total TTC: ${(invoice.total_ttc || 0).toFixed(2)} EUR`, 20, 45);
    basePdfBytes = new Uint8Array(doc.output('arraybuffer'));
  }

  // Step 3: Embed XML and add PDF/A-3 metadata
  const facturxPdfBytes = await generateFacturXPDF(basePdfBytes, invoice, client || {}, entreprise || {});

  // Step 4: remettre le fichier (feuille de partage sur téléphone et dans l'app, téléchargement sur ordinateur)
  const blob = new Blob([facturxPdfBytes], { type: 'application/pdf' });
  const filename = `${invoice.facture_type === 'avoir' ? 'Avoir' : 'Facture'}_${invoice.numero}.pdf`;
  return remettreFichier(blob, filename, 'application/pdf', { titre: `Facture ${invoice.numero}` });
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Build XMP metadata XML for PDF/A-3 + Factur-X
 */
function buildXmpMetadata({ title, creator, producer, conformanceLevel, documentType, documentFileName, version }) {
  const now = new Date().toISOString();

  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">

    <!-- PDF/A-3 identification -->
    <rdf:Description rdf:about=""
        xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>

    <!-- Dublin Core -->
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapeXmlAttr(title)}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>${escapeXmlAttr(creator)}</rdf:li>
        </rdf:Seq>
      </dc:creator>
    </rdf:Description>

    <!-- XMP Basic -->
    <rdf:Description rdf:about=""
        xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreatorTool>Mallettico</xmp:CreatorTool>
      <xmp:CreateDate>${now}</xmp:CreateDate>
      <xmp:ModifyDate>${now}</xmp:ModifyDate>
    </rdf:Description>

    <!-- PDF producer -->
    <rdf:Description rdf:about=""
        xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>${escapeXmlAttr(producer)}</pdf:Producer>
    </rdf:Description>

    <!-- Factur-X / ZUGFeRD extension -->
    <rdf:Description rdf:about=""
        xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <fx:DocumentType>${documentType}</fx:DocumentType>
      <fx:DocumentFileName>${documentFileName}</fx:DocumentFileName>
      <fx:Version>${version}</fx:Version>
      <fx:ConformanceLevel>${conformanceLevel}</fx:ConformanceLevel>
    </rdf:Description>

    <!-- PDF/A Extension Schema (required for Factur-X namespace declaration) -->
    <rdf:Description rdf:about=""
        xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
        xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
        xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>fx</pdfaSchema:prefix>
            <pdfaSchema:property>
              <rdf:Seq>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentFileName</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>The name of the embedded XML document</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentType</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>The type of the hybrid document</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>Version</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>The version of the Factur-X schema</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>ConformanceLevel</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>The conformance level of the Factur-X data</pdfaProperty:description>
                </rdf:li>
              </rdf:Seq>
            </pdfaSchema:property>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>

  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Escape string for use in XML attributes/content
 */
function escapeXmlAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Simple mobile detection
 */
function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 768);
}

export default {
  generateFacturXPDF,
  htmlToPdfBytes,
  generateAndDownloadFacturX,
};
