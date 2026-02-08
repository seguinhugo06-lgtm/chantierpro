/**
 * Shared PDF HTML builder for devis/factures
 * Extracted from DevisPage.jsx downloadPDF() for reuse in useQuickActions
 */

import { subscription } from '../stores/subscriptionStore';

/**
 * Get entreprise data from localStorage
 * @returns {Object} entreprise config
 */
export function getEntrepriseFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('cp_entreprise') || '{}');
  } catch {
    return {};
  }
}

/**
 * Format RCS complet string
 * @param {Object} entreprise
 * @returns {string}
 */
function getRCSComplet(entreprise) {
  if (!entreprise?.rcsVille || !entreprise?.rcsNumero) return '';
  return `RCS ${entreprise.rcsVille} ${entreprise.rcsType || 'B'} ${entreprise.rcsNumero}`;
}

/**
 * Build full HTML string for a devis/facture document
 * Conforme législation française (mentions obligatoires, garanties, rétractation)
 *
 * @param {Object} doc - The devis/facture document
 * @param {Object} client - The client object
 * @param {Object} [chantier] - The chantier object (optional)
 * @param {Object} [entreprise] - Entreprise config (defaults to localStorage)
 * @returns {string} Complete HTML document string
 */
export function buildDocumentHTML(doc, client, chantier, entreprise) {
  if (!entreprise) {
    entreprise = getEntrepriseFromStorage();
  }

  const couleur = entreprise?.couleur || '#f97316';
  const isFacture = doc.type === 'facture';
  const isMicro = entreprise?.formeJuridique === 'Micro-entreprise';
  const dateValidite = new Date(doc.date);
  dateValidite.setDate(dateValidite.getDate() + (doc.validite || entreprise?.validiteDevis || 30));

  // Calculate TVA details from lignes if not present in doc
  const calculatedTvaDetails = doc.tvaDetails || (() => {
    const details = {};
    const defaultRate = doc.tvaRate || entreprise?.tvaDefaut || 10;
    (doc.lignes || []).forEach(l => {
      const rate = l.tva !== undefined ? l.tva : defaultRate;
      if (!details[rate]) {
        details[rate] = { base: 0, montant: 0 };
      }
      const lineMontant = l.montant || (l.quantite || 0) * (l.prixUnitaire || 0);
      details[rate].base += lineMontant;
      details[rate].montant += lineMontant * (rate / 100);
    });
    return details;
  })();

  const lignesHTML = (doc.lignes || []).map(l => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top">${l.description || ''}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.quantite || 0}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.unite || 'unité'}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${(l.prixUnitaire || 0).toFixed(2)} €</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${isMicro ? '-' : (l.tva !== undefined ? l.tva : (doc.tvaRate || 10)) + '%'}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;${(l.montant || (l.quantite || 0) * (l.prixUnitaire || 0)) < 0 ? 'color:#dc2626;' : ''}">${(l.montant || (l.quantite || 0) * (l.prixUnitaire || 0)).toFixed(2)} €</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${isFacture ? 'Facture' : 'Devis'} ${doc.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; padding: 25px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid ${couleur}; }
    .logo-section { max-width: 55%; }
    .logo { font-size: 16pt; font-weight: bold; color: ${couleur}; margin-bottom: 8px; }
    .entreprise-info { font-size: 8pt; color: #64748b; line-height: 1.5; }
    .entreprise-legal { font-size: 7pt; color: #94a3b8; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
    .doc-type { text-align: right; }
    .doc-type h1 { font-size: 22pt; color: ${couleur}; margin-bottom: 8px; letter-spacing: 1px; }
    .doc-info { font-size: 9pt; color: #64748b; }
    .doc-info strong { color: #1e293b; }
    .client-section { display: flex; gap: 20px; margin-bottom: 20px; }
    .info-block { flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid ${couleur}; }
    .info-block h3 { font-size: 8pt; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-block .name { font-weight: 600; font-size: 11pt; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
    thead { background: ${couleur}; color: white; }
    th { padding: 10px 8px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; }
    th:not(:first-child) { text-align: center; }
    th:last-child { text-align: right; }
    .totals { margin-left: auto; width: 260px; margin-top: 15px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 10pt; }
    .totals .row.sub { background: #f8fafc; border-radius: 4px; margin-bottom: 2px; }
    .totals .total { background: ${couleur}; color: white; padding: 12px; border-radius: 6px; font-size: 13pt; font-weight: bold; margin-top: 8px; }
    .conditions { background: #f1f5f9; padding: 12px; border-radius: 6px; margin-top: 20px; font-size: 7.5pt; line-height: 1.6; }
    .conditions h4 { font-size: 8pt; margin-bottom: 8px; color: #475569; }
    .conditions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .garanties { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 10px; border-radius: 6px; margin-top: 15px; font-size: 7.5pt; }
    .garanties h4 { color: #065f46; margin-bottom: 6px; }
    .retractation { background: #fef3c7; border: 1px solid #fcd34d; padding: 10px; border-radius: 6px; margin-top: 10px; font-size: 7.5pt; color: #92400e; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 25px; gap: 20px; }
    .signature-box { width: 48%; border: 1px solid #cbd5e1; padding: 12px; min-height: 90px; border-radius: 6px; }
    .signature-box h4 { font-size: 9pt; margin-bottom: 4px; }
    .signature-box p { font-size: 7pt; color: #64748b; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 7pt; color: #64748b; text-align: center; line-height: 1.6; }
    .assurances { font-size: 7pt; color: #64748b; margin-top: 8px; }
    .micro-mention { background: #dbeafe; padding: 8px; border-radius: 4px; font-size: 8pt; color: #1e40af; margin-top: 10px; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="logo-section">
      <div class="logo">${entreprise?.nom || 'Mon Entreprise'}</div>
      <div class="entreprise-info">
        ${entreprise?.formeJuridique ? `<strong>${entreprise.formeJuridique}</strong>${entreprise?.capital ? ` - Capital: ${entreprise.capital} €` : ''}<br>` : ''}
        ${entreprise?.adresse?.replace(/\n/g, '<br>') || ''}<br>
        ${entreprise?.tel ? `Tél: ${entreprise.tel}` : ''} ${entreprise?.email ? `· ${entreprise.email}` : ''}
      </div>
      <div class="entreprise-legal">
        ${entreprise?.siret ? `SIRET: ${entreprise.siret}` : ''}
        ${entreprise?.codeApe ? ` · APE: ${entreprise.codeApe}` : ''}
        ${entreprise?.rcs ? `<br>RCS: ${entreprise.rcs}` : ''}
        ${entreprise?.tvaIntra ? `<br>TVA Intra: ${entreprise.tvaIntra}` : ''}
        ${isMicro ? '<br><em>TVA non applicable, art. 293 B du CGI</em>' : ''}
      </div>
    </div>
    <div class="doc-type">
      <h1>${isFacture ? 'FACTURE' : 'DEVIS'}</h1>
      <div class="doc-info">
        <strong>N° ${doc.numero}</strong><br>
        Date: ${new Date(doc.date).toLocaleDateString('fr-FR')}<br>
        ${!isFacture ? `<strong>Valable jusqu'au: ${dateValidite.toLocaleDateString('fr-FR')}</strong>` : ''}
      </div>
    </div>
  </div>

  <!-- CLIENT & CHANTIER -->
  <div class="client-section">
    <div class="info-block">
      <h3>Client</h3>
      <div class="name">${client?.prenom || ''} ${client?.nom || ''}</div>
      ${client?.entreprise ? `<div style="font-size:9pt;color:#64748b">${client.entreprise}</div>` : ''}
      <div style="font-size:9pt">${client?.adresse || ''}</div>
      <div style="font-size:9pt">${client?.code_postal || ''} ${client?.ville || ''}</div>
      ${client?.telephone ? `<div style="font-size:8pt;color:#64748b;margin-top:4px">Tél: ${client.telephone}</div>` : ''}
      ${client?.email ? `<div style="font-size:8pt;color:#64748b">${client.email}</div>` : ''}
    </div>
    ${chantier ? `
    <div class="info-block">
      <h3>Lieu d'exécution</h3>
      <div class="name">${chantier.nom}</div>
      <div style="font-size:9pt">${chantier.adresse || client?.adresse || ''}</div>
    </div>
    ` : ''}
  </div>

  <!-- TABLEAU PRESTATIONS -->
  <table>
    <thead>
      <tr>
        <th style="width:40%">Description</th>
        <th style="width:10%">Qté</th>
        <th style="width:10%">Unité</th>
        <th style="width:15%">PU HT</th>
        <th style="width:10%">TVA</th>
        <th style="width:15%">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${lignesHTML}
    </tbody>
  </table>

  <!-- TOTAUX -->
  <div class="totals">
    <div class="row sub"><span>Total HT</span><span>${(doc.total_ht || 0).toFixed(2)} €</span></div>
    ${doc.remise ? `<div class="row sub" style="color:#dc2626"><span>Remise ${doc.remise}%</span><span>-${((doc.total_ht || 0) * doc.remise / 100).toFixed(2)} €</span></div>` : ''}
    ${!isMicro ? (Object.keys(calculatedTvaDetails).length > 0
      ? Object.entries(calculatedTvaDetails).filter(([_, data]) => data.base > 0).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([taux, data]) =>
        `<div class="row sub"><span>TVA ${taux}%${Object.keys(calculatedTvaDetails).length > 1 ? ` (base: ${data.base.toFixed(2)} €)` : ''}</span><span>${data.montant.toFixed(2)} €</span></div>`
      ).join('')
      : `<div class="row sub"><span>TVA ${doc.tvaRate || 10}%</span><span>${(doc.tva || 0).toFixed(2)} €</span></div>`
    ) : ''}
    <div class="row total"><span>Total TTC</span><span>${(doc.total_ttc || 0).toFixed(2)} €</span></div>
    ${doc.acompte_pct ? `
    <div class="row sub" style="margin-top:8px;border-top:1px dashed #ccc;padding-top:8px"><span>Acompte ${doc.acompte_pct}%</span><span>${((doc.total_ttc || 0) * doc.acompte_pct / 100).toFixed(2)} €</span></div>
    <div class="row sub"><span>Solde à régler</span><span>${((doc.total_ttc || 0) * (100 - doc.acompte_pct) / 100).toFixed(2)} €</span></div>
    ` : ''}
  </div>

  ${isMicro ? '<div class="micro-mention">TVA non applicable, article 293 B du Code Général des Impôts</div>' : ''}

  <!-- CONDITIONS -->
  <div class="conditions">
    <h4>CONDITIONS GÉNÉRALES</h4>
    <div class="conditions-grid">
      <div>
        <strong>Modalités de paiement</strong><br>
        · Virement bancaire<br>
        · Chèque à l'ordre de ${entreprise?.nom || '[Entreprise]'}<br>
        · Espèces (max 1 000 € pour particulier)<br>
        ${entreprise?.iban ? `<br><strong>IBAN:</strong> ${entreprise.iban}` : ''}
        ${entreprise?.bic ? ` · <strong>BIC:</strong> ${entreprise.bic}` : ''}
      </div>
      <div>
        <strong>Délai de paiement</strong><br>
        ${entreprise?.delaiPaiement || 30} jours à compter de la date ${isFacture ? 'de facture' : 'de réception des travaux'}.<br><br>
        <strong>Pénalités de retard</strong><br>
        Taux BCE + 10 points (soit ~13% annuel).<br>
        Indemnité forfaitaire de recouvrement: 40 €
      </div>
    </div>
  </div>

  ${!isFacture && (entreprise?.mentionGaranties !== false) ? `
  <!-- GARANTIES LÉGALES -->
  <div class="garanties">
    <h4>GARANTIES LÉGALES (Code civil & Code de la construction)</h4>
    <strong>1. Garantie de parfait achèvement</strong> - 1 an à compter de la réception des travaux<br>
    <strong>2. Garantie de bon fonctionnement</strong> - 2 ans (équipements dissociables)<br>
    <strong>3. Garantie décennale</strong> - 10 ans (solidité de l'ouvrage)
  </div>
  ` : ''}

  ${!isFacture && (entreprise?.mentionRetractation !== false) ? `
  <!-- DROIT DE RÉTRACTATION -->
  <div class="retractation">
    <strong>⚠️ DROIT DE RÉTRACTATION</strong> (Art. L221-18 du Code de la consommation)<br>
    Vous disposez d'un délai de <strong>14 jours</strong> pour exercer votre droit de rétractation sans justification ni pénalité.
    Le délai court à compter de la signature du présent devis.
    Pour l'exercer, envoyez une lettre recommandée AR à: ${entreprise?.adresse?.split('\\n')[0] || '[Adresse]'}
  </div>
  ` : ''}

  ${entreprise?.cgv ? `
  <!-- CGV PERSONNALISÉES -->
  <div class="conditions" style="margin-top:10px">
    <h4>CONDITIONS PARTICULIÈRES</h4>
    ${entreprise.cgv}
  </div>
  ` : ''}

  ${!isFacture ? `
  <!-- SIGNATURES -->
  <div class="signature-section">
    <div class="signature-box">
      <h4>L'Entreprise</h4>
      <p>Bon pour accord<br>Date et signature</p>
    </div>
    <div class="signature-box">
      <h4>Le Client</h4>
      <p>Signature précédée de la mention manuscrite:<br><strong>"Bon pour accord"</strong> + Date</p>
      ${doc.signature ? '<div style="margin-top:15px;color:#16a34a;font-weight:bold">[OK] Signé électroniquement le ' + new Date(doc.signatureDate).toLocaleDateString('fr-FR') + '</div>' : ''}
    </div>
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <strong>${entreprise?.nom || ''}</strong>
    ${entreprise?.formeJuridique ? ` · ${entreprise.formeJuridique}` : ''}
    ${entreprise?.capital ? ` · Capital: ${entreprise.capital} €` : ''}<br>
    ${entreprise?.siret ? `SIRET: ${entreprise.siret}` : ''}
    ${entreprise?.codeApe ? ` · APE: ${entreprise.codeApe}` : ''}
    ${getRCSComplet(entreprise) ? ` · ${getRCSComplet(entreprise)}` : ''}<br>
    ${entreprise?.tvaIntra ? `TVA Intracommunautaire: ${entreprise.tvaIntra}<br>` : ''}
    <div class="assurances">
      ${entreprise?.rcProAssureur ? `RC Pro: ${entreprise.rcProAssureur} N°${entreprise.rcProNumero}${entreprise.rcProValidite ? ` (Valide: ${new Date(entreprise.rcProValidite).toLocaleDateString('fr-FR')})` : ''}` : ''}
      ${entreprise?.rcProAssureur && entreprise?.decennaleAssureur ? '<br>' : ''}
      ${entreprise?.decennaleAssureur ? `Décennale: ${entreprise.decennaleAssureur} N°${entreprise.decennaleNumero}${entreprise.decennaleValidite ? ` (Valide: ${new Date(entreprise.decennaleValidite).toLocaleDateString('fr-FR')})` : ''}` : ''}
    </div>
  </div>
  ${subscription.isFree() ? `
  <div style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999;display:flex;align-items:center;justify-content:center;">
    <div style="transform:rotate(-35deg);font-size:80px;font-weight:bold;color:rgba(249,115,22,0.08);white-space:nowrap;user-select:none;">
      ChantierPro — Version Gratuite
    </div>
  </div>
  <div style="text-align:center;padding:8px;background:#fff7ed;border-top:2px solid #f97316;font-size:11px;color:#c2410c;margin-top:20px;">
    Document généré avec ChantierPro — Plan Découverte (gratuit) · Passez au plan Artisan pour supprimer ce message
  </div>
  ` : ''}
</body>
</html>`;
}

/**
 * Open a print window with the document HTML
 * @param {Object} doc - The devis/facture document
 * @param {Object} client - The client object
 * @param {Object} [chantier] - The chantier object
 * @param {Object} [entreprise] - Entreprise config
 */
export function printDocument(doc, client, chantier, entreprise) {
  const htmlContent = buildDocumentHTML(doc, client, chantier, entreprise);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(htmlContent);
    win.document.close();
    win.onload = () => win.print();
  } else {
    throw new Error('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les pop-ups ne sont pas bloqués.');
  }
}
