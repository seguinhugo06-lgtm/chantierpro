/**
 * Utilitaire de génération HTML pour devis/factures
 * Conforme législation française (mentions obligatoires, CGV, garanties, eIDAS)
 *
 * Utilisé par:
 * - DevisPage.jsx (downloadPDF, previewPDF)
 * - DevisSignaturePage.jsx (aperçu lecture seule)
 */

/**
 * Formatte un RCS complet
 */
function getRCSComplet(entreprise) {
  if (!entreprise?.rcsVille && !entreprise?.rcs_ville) return '';
  const ville = entreprise.rcsVille || entreprise.rcs_ville || '';
  const numero = entreprise.rcsNumero || entreprise.rcs_numero || '';
  const type = entreprise.rcsType || entreprise.rcs_type || 'B';
  if (!ville || !numero) return '';
  return `RCS ${ville} ${type} ${numero}`;
}

/**
 * Génère le HTML complet d'un devis/facture
 *
 * @param {Object} params
 * @param {Object} params.doc - Le devis ou facture
 * @param {Object} params.client - Le client
 * @param {Object} params.chantier - Le chantier (optionnel)
 * @param {Object} params.entreprise - L'entreprise
 * @param {string} params.couleur - Couleur accent (défaut: #f97316)
 * @returns {string} HTML complet
 */
export function buildDevisHtml({ doc, client, chantier, entreprise, couleur }) {
  const color = couleur || entreprise?.couleur || '#f97316';
  const isFacture = doc.type === 'facture';
  const isMicro = (entreprise?.formeJuridique || entreprise?.forme_juridique) === 'Micro-entreprise';

  const dateValidite = new Date(doc.date);
  dateValidite.setDate(dateValidite.getDate() + (doc.validite || entreprise?.validiteDevis || entreprise?.validite_devis || 30));

  // Calculate TVA details from lignes
  const calculatedTvaDetails = doc.tvaDetails || (() => {
    const details = {};
    const defaultRate = doc.tvaRate || doc.tva_rate || entreprise?.tvaDefaut || 10;
    (doc.lignes || []).forEach(l => {
      const rate = l.tva !== undefined ? l.tva : defaultRate;
      if (!details[rate]) {
        details[rate] = { base: 0, montant: 0 };
      }
      details[rate].base += (l.montant || 0);
      details[rate].montant += (l.montant || 0) * (rate / 100);
    });
    return details;
  })();

  // Parse lignes if stored as JSON string
  let lignes = doc.lignes || [];
  if (typeof lignes === 'string') {
    try { lignes = JSON.parse(lignes); } catch { lignes = []; }
  }

  const lignesHTML = lignes.map(l => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top">${l.description || ''}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.quantite || ''}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.unite || 'unité'}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${(l.prixUnitaire || 0).toFixed(2)} €</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${isMicro ? '-' : (l.tva !== undefined ? l.tva : (doc.tvaRate || doc.tva_rate || 10)) + '%'}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;${(l.montant || 0) < 0 ? 'color:#dc2626;' : ''}">${(l.montant || 0).toFixed(2)} €</td>
    </tr>
  `).join('');

  const totalHT = doc.total_ht || 0;
  const totalTTC = doc.total_ttc || 0;
  const tva = doc.tva || doc.total_tva || 0;
  const remise = doc.remise || doc.remise_globale || 0;
  const acomptePct = doc.acompte_pct || doc.acompte_percent || 0;

  // Entreprise fields (handle both camelCase and snake_case)
  const e = {
    nom: entreprise?.nom || '',
    formeJuridique: entreprise?.formeJuridique || entreprise?.forme_juridique || '',
    capital: entreprise?.capital || '',
    adresse: entreprise?.adresse || '',
    ville: entreprise?.ville || '',
    codePostal: entreprise?.code_postal || entreprise?.codePostal || '',
    tel: entreprise?.tel || entreprise?.telephone || '',
    email: entreprise?.email || '',
    siret: entreprise?.siret || '',
    codeApe: entreprise?.codeApe || entreprise?.code_ape || '',
    rcs: entreprise?.rcs || '',
    tvaIntra: entreprise?.tvaIntra || entreprise?.tva_intra || '',
    iban: entreprise?.iban || '',
    bic: entreprise?.bic || '',
    delaiPaiement: entreprise?.delaiPaiement || entreprise?.delai_paiement || 30,
    cgv: entreprise?.cgv || '',
    rcProAssureur: entreprise?.rcProAssureur || entreprise?.rc_pro_assureur || '',
    rcProNumero: entreprise?.rcProNumero || entreprise?.rc_pro_numero || '',
    rcProValidite: entreprise?.rcProValidite || entreprise?.rc_pro_validite || '',
    decennaleAssureur: entreprise?.decennaleAssureur || entreprise?.decennale_assureur || '',
    decennaleNumero: entreprise?.decennaleNumero || entreprise?.decennale_numero || '',
    decennaleValidite: entreprise?.decennaleValidite || entreprise?.decennale_validite || '',
  };

  // Client fields (handle both formats)
  const cl = {
    prenom: client?.prenom || '',
    nom: client?.nom || '',
    entreprise: client?.entreprise || '',
    adresse: client?.adresse || '',
    codePostal: client?.code_postal || client?.codePostal || '',
    ville: client?.ville || '',
    telephone: client?.telephone || '',
    email: client?.email || '',
  };

  const rcsComplet = getRCSComplet(entreprise);

  // Signature block
  let signatureBlock = '';
  if (doc.signature_data || doc.signature) {
    const sigData = doc.signature_data || doc.signature;
    const sigDate = doc.signature_date || doc.signatureDate;
    const sigNom = doc.signataire_nom || doc.signataire || '';
    signatureBlock = `
      <div style="margin-top:10px">
        <img src="${sigData}" style="max-height:80px;max-width:200px;border:1px solid #e2e8f0;border-radius:4px;padding:4px;background:white" alt="Signature" />
        <div style="font-size:8pt;color:#16a34a;font-weight:bold;margin-top:4px">
          ✓ Signé électroniquement le ${sigDate ? new Date(sigDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
          ${sigNom ? ` par ${sigNom}` : ''}
        </div>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isFacture ? 'Facture' : 'Devis'} ${doc.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; padding: 25px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid ${color}; }
    .logo-section { max-width: 55%; }
    .logo { font-size: 16pt; font-weight: bold; color: ${color}; margin-bottom: 8px; }
    .entreprise-info { font-size: 8pt; color: #64748b; line-height: 1.5; }
    .entreprise-legal { font-size: 7pt; color: #94a3b8; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
    .doc-type { text-align: right; }
    .doc-type h1 { font-size: 22pt; color: ${color}; margin-bottom: 8px; letter-spacing: 1px; }
    .doc-info { font-size: 9pt; color: #64748b; }
    .doc-info strong { color: #1e293b; }
    .client-section { display: flex; gap: 20px; margin-bottom: 20px; }
    .info-block { flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid ${color}; }
    .info-block h3 { font-size: 8pt; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-block .name { font-weight: 600; font-size: 11pt; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
    thead { background: ${color}; color: white; }
    th { padding: 10px 8px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; }
    th:not(:first-child) { text-align: center; }
    th:last-child { text-align: right; }
    .totals { margin-left: auto; width: 260px; margin-top: 15px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 10pt; }
    .totals .row.sub { background: #f8fafc; border-radius: 4px; margin-bottom: 2px; }
    .totals .total { background: ${color}; color: white; padding: 12px; border-radius: 6px; font-size: 13pt; font-weight: bold; margin-top: 8px; }
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
      <div class="logo">${e.nom}</div>
      <div class="entreprise-info">
        ${e.formeJuridique ? `<strong>${e.formeJuridique}</strong>${e.capital ? ` - Capital: ${e.capital} €` : ''}<br>` : ''}
        ${e.adresse ? e.adresse.replace(/\n/g, '<br>') : ''}<br>
        ${e.tel ? `Tél: ${e.tel}` : ''} ${e.email ? `· ${e.email}` : ''}
      </div>
      <div class="entreprise-legal">
        ${e.siret ? `SIRET: ${e.siret}` : ''}
        ${e.codeApe ? ` · APE: ${e.codeApe}` : ''}
        ${e.rcs || rcsComplet ? `<br>RCS: ${rcsComplet || e.rcs}` : ''}
        ${e.tvaIntra ? `<br>TVA Intra: ${e.tvaIntra}` : ''}
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
      <div class="name">${cl.prenom} ${cl.nom}</div>
      ${cl.entreprise ? `<div style="font-size:9pt;color:#64748b">${cl.entreprise}</div>` : ''}
      <div style="font-size:9pt">${cl.adresse}</div>
      <div style="font-size:9pt">${cl.codePostal} ${cl.ville}</div>
      ${cl.telephone ? `<div style="font-size:8pt;color:#64748b;margin-top:4px">Tél: ${cl.telephone}</div>` : ''}
      ${cl.email ? `<div style="font-size:8pt;color:#64748b">${cl.email}</div>` : ''}
    </div>
    ${chantier ? `
    <div class="info-block">
      <h3>Lieu d'exécution</h3>
      <div class="name">${chantier.nom || ''}</div>
      <div style="font-size:9pt">${chantier.adresse || cl.adresse || ''}</div>
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
    <div class="row sub"><span>Total HT</span><span>${totalHT.toFixed(2)} €</span></div>
    ${remise ? `<div class="row sub" style="color:#dc2626"><span>Remise ${remise}%</span><span>-${(totalHT * remise / 100).toFixed(2)} €</span></div>` : ''}
    ${!isMicro ? (Object.keys(calculatedTvaDetails).length > 0
      ? Object.entries(calculatedTvaDetails).filter(([_, data]) => data.base > 0).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([taux, data]) =>
        `<div class="row sub"><span>TVA ${taux}%${Object.keys(calculatedTvaDetails).length > 1 ? ` (base: ${data.base.toFixed(2)} €)` : ''}</span><span>${data.montant.toFixed(2)} €</span></div>`
      ).join('')
      : `<div class="row sub"><span>TVA ${doc.tvaRate || doc.tva_rate || 10}%</span><span>${tva.toFixed(2)} €</span></div>`
    ) : ''}
    <div class="row total"><span>Total TTC</span><span>${totalTTC.toFixed(2)} €</span></div>
    ${acomptePct ? `
    <div class="row sub" style="margin-top:8px;border-top:1px dashed #ccc;padding-top:8px"><span>Acompte ${acomptePct}%</span><span>${(totalTTC * acomptePct / 100).toFixed(2)} €</span></div>
    <div class="row sub"><span>Solde à régler</span><span>${(totalTTC * (100 - acomptePct) / 100).toFixed(2)} €</span></div>
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
        · Chèque à l'ordre de ${e.nom}<br>
        · Espèces (max 1 000 € pour particulier)<br>
        ${e.iban ? `<br><strong>IBAN:</strong> ${e.iban}` : ''}
        ${e.bic ? ` · <strong>BIC:</strong> ${e.bic}` : ''}
      </div>
      <div>
        <strong>Délai de paiement</strong><br>
        ${e.delaiPaiement} jours à compter de la date ${isFacture ? 'de facture' : 'de réception des travaux'}.<br><br>
        <strong>Pénalités de retard</strong><br>
        Taux BCE + 10 points (soit ~13% annuel).<br>
        Indemnité forfaitaire de recouvrement: 40 €
      </div>
    </div>
  </div>

  ${!isFacture ? `
  <!-- GARANTIES LÉGALES -->
  <div class="garanties">
    <h4>GARANTIES LÉGALES (Code civil & Code de la construction)</h4>
    <strong>1. Garantie de parfait achèvement</strong> - 1 an à compter de la réception des travaux<br>
    <strong>2. Garantie de bon fonctionnement</strong> - 2 ans (équipements dissociables)<br>
    <strong>3. Garantie décennale</strong> - 10 ans (solidité de l'ouvrage)
  </div>
  ` : ''}

  ${!isFacture ? `
  <!-- DROIT DE RÉTRACTATION -->
  <div class="retractation">
    <strong>DROIT DE RÉTRACTATION</strong> (Art. L221-18 du Code de la consommation)<br>
    Vous disposez d'un délai de <strong>14 jours</strong> pour exercer votre droit de rétractation sans justification ni pénalité.
    Le délai court à compter de la signature du présent devis.
    Pour l'exercer, envoyez une lettre recommandée AR à: ${e.adresse?.split('\\n')[0] || e.adresse?.split('\n')[0] || '[Adresse]'}
  </div>
  ` : ''}

  ${e.cgv ? `
  <!-- CGV PERSONNALISÉES -->
  <div class="conditions" style="margin-top:10px">
    <h4>CONDITIONS PARTICULIÈRES</h4>
    ${e.cgv}
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
      ${signatureBlock}
    </div>
  </div>
  ` : ''}

  <!-- FOOTER -->
  ${buildFooterHtml(e, rcsComplet, !isFacture)}
</body>
</html>`;
}

/**
 * Bloc footer réutilisable
 */
function buildFooterHtml(e, rcsComplet, isDevis = false) {
  return `<div class="footer">
    <strong>${e.nom}</strong>
    ${e.formeJuridique ? ` · ${e.formeJuridique}` : ''}
    ${e.capital ? ` · Capital: ${e.capital} €` : ''}<br>
    ${e.siret ? `SIRET: ${e.siret}` : '<em style="color:#999">[SIRET à compléter dans Paramètres]</em>'}
    ${e.codeApe ? ` · APE: ${e.codeApe}` : ''}
    ${rcsComplet ? ` · ${rcsComplet}` : ''}<br>
    ${e.tvaIntra ? `TVA Intracommunautaire: ${e.tvaIntra}<br>` : '<em style="color:#999">[N° TVA à compléter dans Paramètres]</em><br>'}
    <div class="assurances">
      ${e.decennaleAssureur ? `Assurance décennale: ${e.decennaleAssureur} N°${e.decennaleNumero}${e.decennaleValidite ? ` (Valide: ${new Date(e.decennaleValidite).toLocaleDateString('fr-FR')})` : ''}` : '<em style="color:#999">[Assurance décennale à compléter dans Paramètres > Assurances]</em>'}
      ${e.decennaleAssureur && e.rcProAssureur ? '<br>' : ''}
      ${e.rcProAssureur ? `RC Pro: ${e.rcProAssureur} N°${e.rcProNumero}${e.rcProValidite ? ` (Valide: ${new Date(e.rcProValidite).toLocaleDateString('fr-FR')})` : ''}` : ''}
    </div>
    ${isDevis ? '<div style="margin-top:6px;font-size:9px;color:#666">Devis reçu avant l\'exécution des travaux. Conditions de paiement et pénalités de retard conformes aux articles L441-10 et L441-6 du Code de commerce.</div>' : ''}
  </div>`;
}

/**
 * Bloc entreprise réutilisable
 */
function buildEntrepriseFields(entreprise) {
  return {
    nom: entreprise?.nom || '',
    formeJuridique: entreprise?.formeJuridique || entreprise?.forme_juridique || '',
    capital: entreprise?.capital || '',
    adresse: entreprise?.adresse || '',
    ville: entreprise?.ville || '',
    codePostal: entreprise?.code_postal || entreprise?.codePostal || '',
    tel: entreprise?.tel || entreprise?.telephone || '',
    email: entreprise?.email || '',
    siret: entreprise?.siret || '',
    codeApe: entreprise?.codeApe || entreprise?.code_ape || '',
    rcs: entreprise?.rcs || '',
    tvaIntra: entreprise?.tvaIntra || entreprise?.tva_intra || '',
    iban: entreprise?.iban || '',
    bic: entreprise?.bic || '',
    delaiPaiement: entreprise?.delaiPaiement || entreprise?.delai_paiement || 30,
    rcProAssureur: entreprise?.rcProAssureur || entreprise?.rc_pro_assureur || '',
    rcProNumero: entreprise?.rcProNumero || entreprise?.rc_pro_numero || '',
    rcProValidite: entreprise?.rcProValidite || entreprise?.rc_pro_validite || '',
    decennaleAssureur: entreprise?.decennaleAssureur || entreprise?.decennale_assureur || '',
    decennaleNumero: entreprise?.decennaleNumero || entreprise?.decennale_numero || '',
    decennaleValidite: entreprise?.decennaleValidite || entreprise?.decennale_validite || '',
  };
}

/**
 * Génère le HTML d'une facture de situation BTP
 * Tableau 8 colonnes avec avancement cumulé, retenue de garantie, déduction acomptes
 *
 * @param {Object} params
 * @param {Object} params.situation - La situation de travaux
 * @param {Object} params.parentDevis - Le devis/marché source
 * @param {Object} params.client - Le client
 * @param {Object} params.chantier - Le chantier
 * @param {Object} params.entreprise - L'entreprise
 * @param {string} params.couleur - Couleur accent
 * @returns {string} HTML complet
 */
export function buildSituationFactureHtml({ situation, parentDevis, client, chantier, entreprise, couleur }) {
  const color = couleur || entreprise?.couleur || '#f97316';
  const e = buildEntrepriseFields(entreprise);
  const rcsComplet = getRCSComplet(entreprise);

  const cl = {
    prenom: client?.prenom || '',
    nom: client?.nom || '',
    entreprise: client?.entreprise || '',
    adresse: client?.adresse || '',
    codePostal: client?.code_postal || client?.codePostal || '',
    ville: client?.ville || '',
  };

  const lignes = situation.lignes || [];
  const defaultTvaRate = situation.tvaRate || parentDevis?.tvaRate || parentDevis?.tva_rate || 10;

  // Calculate totals from lignes with multi-TVA support
  let totalMarcheHT = 0;
  let totalCumuleHT = 0;
  let totalPrecedentHT = 0;
  const tvaParTaux = {}; // { 10: { base: 0, montant: 0 }, 20: { base: 0, montant: 0 } }

  const lignesHTML = lignes.map(l => {
    const marcheHT = (l.quantite || 0) * (l.prixUnitaire || 0);
    const cumuleHT = marcheHT * (l.cumulActuel || 0) / 100;
    const precedentHT = marcheHT * (l.cumulPrecedent || 0) / 100;
    const situationHT = cumuleHT - precedentHT;
    const taux = l.tva !== undefined ? parseFloat(l.tva) : defaultTvaRate;

    totalMarcheHT += marcheHT;
    totalCumuleHT += cumuleHT;
    totalPrecedentHT += precedentHT;

    // Aggregate TVA per rate on situation amounts
    if (!tvaParTaux[taux]) tvaParTaux[taux] = { base: 0, montant: 0 };
    tvaParTaux[taux].base += situationHT;
    tvaParTaux[taux].montant += situationHT * (taux / 100);

    return `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:8pt">${l.description || ''}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:center">${l.quantite || ''} ${l.unite || ''}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:right">${(l.prixUnitaire || 0).toFixed(2)} €</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:right">${marcheHT.toFixed(2)} €</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;color:${color}">${(l.cumulActuel || 0).toFixed(0)}%</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:right">${cumuleHT.toFixed(2)} €</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b">${precedentHT.toFixed(2)} €</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${situationHT.toFixed(2)} €</td>
    </tr>`;
  }).join('');

  const totalSituationHT = totalCumuleHT - totalPrecedentHT;
  const totalTVA = Object.values(tvaParTaux).reduce((s, d) => s + d.montant, 0);
  const totalSituationTTC = totalSituationHT + totalTVA;
  const retenueGarantiePct = situation.retenueGarantiePct || 0;
  const retenueGarantie = totalSituationTTC * retenueGarantiePct / 100;
  const acompteVerse = situation.acompteVerse || 0;
  const netAPayer = totalSituationTTC - retenueGarantie - acompteVerse;

  // Build TVA rows (one per rate)
  const tvaRates = Object.entries(tvaParTaux).filter(([, d]) => d.base > 0).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
  const tvaRowsHTML = tvaRates.length > 1
    ? tvaRates.map(([taux, data]) => `<div class="totals-row sub"><span>TVA ${taux}% (base ${data.base.toFixed(2)} €)</span><span>${data.montant.toFixed(2)} €</span></div>`).join('')
    : `<div class="totals-row sub"><span>TVA ${tvaRates.length > 0 ? tvaRates[0][0] : defaultTvaRate}%</span><span>${totalTVA.toFixed(2)} €</span></div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture de Situation n°${situation.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9pt; color: #1e293b; padding: 20px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid ${color}; }
    .logo-section { max-width: 55%; }
    .logo { font-size: 16pt; font-weight: bold; color: ${color}; margin-bottom: 8px; }
    .entreprise-info { font-size: 8pt; color: #64748b; line-height: 1.5; }
    .entreprise-legal { font-size: 7pt; color: #94a3b8; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
    .doc-type { text-align: right; }
    .doc-type h1 { font-size: 18pt; color: ${color}; margin-bottom: 4px; letter-spacing: 1px; }
    .doc-type h2 { font-size: 12pt; color: #475569; margin-bottom: 8px; }
    .doc-info { font-size: 9pt; color: #64748b; }
    .doc-info strong { color: #1e293b; }
    .client-section { display: flex; gap: 20px; margin-bottom: 15px; }
    .info-block { flex: 1; background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid ${color}; }
    .info-block h3 { font-size: 8pt; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-block .name { font-weight: 600; font-size: 11pt; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 8pt; }
    thead { background: ${color}; color: white; }
    th { padding: 8px 6px; text-align: left; font-weight: 600; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.3px; }
    th:not(:first-child) { text-align: center; }
    th:last-child { text-align: right; }
    tfoot td { padding: 8px 6px; font-weight: 700; background: #f1f5f9; }
    .totals-section { margin-left: auto; width: 320px; margin-top: 15px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 9pt; }
    .totals-row.sub { background: #f8fafc; border-radius: 4px; margin-bottom: 2px; }
    .totals-row.sep { border-top: 1px dashed #cbd5e1; margin-top: 6px; padding-top: 10px; }
    .totals-row.deduction { color: #dc2626; }
    .totals-row.grand-total { background: ${color}; color: white; padding: 12px; border-radius: 6px; font-size: 13pt; font-weight: bold; margin-top: 8px; }
    .conditions { background: #f1f5f9; padding: 12px; border-radius: 6px; margin-top: 15px; font-size: 7.5pt; line-height: 1.6; }
    .conditions h4 { font-size: 8pt; margin-bottom: 8px; color: #475569; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 7pt; color: #64748b; text-align: center; line-height: 1.6; }
    .assurances { font-size: 7pt; color: #64748b; margin-top: 8px; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="logo-section">
      <div class="logo">${e.nom}</div>
      <div class="entreprise-info">
        ${e.formeJuridique ? `<strong>${e.formeJuridique}</strong>${e.capital ? ` - Capital: ${e.capital} €` : ''}<br>` : ''}
        ${e.adresse ? e.adresse.replace(/\n/g, '<br>') : ''}<br>
        ${e.tel ? `Tél: ${e.tel}` : ''} ${e.email ? `· ${e.email}` : ''}
      </div>
      <div class="entreprise-legal">
        ${e.siret ? `SIRET: ${e.siret}` : ''}
        ${e.codeApe ? ` · APE: ${e.codeApe}` : ''}
        ${e.rcs || rcsComplet ? `<br>RCS: ${rcsComplet || e.rcs}` : ''}
        ${e.tvaIntra ? `<br>TVA Intra: ${e.tvaIntra}` : ''}
      </div>
    </div>
    <div class="doc-type">
      <h1>FACTURE DE SITUATION</h1>
      <h2>Situation n°${situation.numero}</h2>
      <div class="doc-info">
        ${parentDevis?.numero ? `<strong>Marché n° ${parentDevis.numero}</strong> du ${parentDevis.date ? new Date(parentDevis.date).toLocaleDateString('fr-FR') : ''}<br>` : ''}
        Date: ${new Date(situation.date || new Date()).toLocaleDateString('fr-FR')}
      </div>
    </div>
  </div>

  <!-- CLIENT & CHANTIER -->
  <div class="client-section">
    <div class="info-block">
      <h3>Client</h3>
      <div class="name">${cl.prenom} ${cl.nom}</div>
      ${cl.entreprise ? `<div style="font-size:9pt;color:#64748b">${cl.entreprise}</div>` : ''}
      <div style="font-size:9pt">${cl.adresse}</div>
      <div style="font-size:9pt">${cl.codePostal} ${cl.ville}</div>
    </div>
    ${chantier ? `
    <div class="info-block">
      <h3>Chantier</h3>
      <div class="name">${chantier.nom || ''}</div>
      <div style="font-size:9pt">${chantier.adresse || ''}</div>
    </div>
    ` : ''}
  </div>

  <!-- TABLEAU SITUATION 8 COLONNES -->
  <table>
    <thead>
      <tr>
        <th style="width:24%">Désignation</th>
        <th style="width:9%">Qté marché</th>
        <th style="width:10%">PU HT</th>
        <th style="width:12%">Mt marché</th>
        <th style="width:8%">% Avanc.</th>
        <th style="width:12%">Mt cumulé</th>
        <th style="width:12%">Mt précédent</th>
        <th style="width:13%">Mt situation</th>
      </tr>
    </thead>
    <tbody>
      ${lignesHTML}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align:right">TOTAUX</td>
        <td style="text-align:right">${totalMarcheHT.toFixed(2)} €</td>
        <td></td>
        <td style="text-align:right">${totalCumuleHT.toFixed(2)} €</td>
        <td style="text-align:right">${totalPrecedentHT.toFixed(2)} €</td>
        <td style="text-align:right;font-weight:700">${totalSituationHT.toFixed(2)} €</td>
      </tr>
    </tfoot>
  </table>

  <!-- TOTAUX -->
  <div class="totals-section">
    <div class="totals-row sub"><span>Total marché HT</span><span>${totalMarcheHT.toFixed(2)} €</span></div>
    <div class="totals-row sub"><span>Travaux cumulés HT</span><span>${totalCumuleHT.toFixed(2)} €</span></div>
    <div class="totals-row sub"><span>Travaux précédents HT</span><span style="color:#64748b">${totalPrecedentHT.toFixed(2)} €</span></div>
    <div class="totals-row sep"><span><strong>Travaux de la situation HT</strong></span><span><strong>${totalSituationHT.toFixed(2)} €</strong></span></div>
    ${tvaRowsHTML}
    <div class="totals-row sub"><span><strong>Montant situation TTC</strong></span><span><strong>${totalSituationTTC.toFixed(2)} €</strong></span></div>
    ${retenueGarantiePct > 0 ? `<div class="totals-row deduction"><span>Retenue de garantie (${retenueGarantiePct}%)</span><span>- ${retenueGarantie.toFixed(2)} €</span></div>` : ''}
    ${acompteVerse > 0 ? `<div class="totals-row deduction"><span>Acomptes déjà versés</span><span>- ${acompteVerse.toFixed(2)} €</span></div>` : ''}
    <div class="totals-row grand-total"><span>NET À PAYER</span><span>${netAPayer.toFixed(2)} €</span></div>
  </div>

  <!-- CONDITIONS -->
  <div class="conditions">
    <h4>CONDITIONS DE RÈGLEMENT</h4>
    Paiement à ${e.delaiPaiement} jours à compter de la date de facture.<br>
    ${e.iban ? `<strong>IBAN:</strong> ${e.iban}` : ''} ${e.bic ? ` · <strong>BIC:</strong> ${e.bic}` : ''}<br>
    Pénalités de retard: taux BCE + 10 points. Indemnité forfaitaire de recouvrement: 40 €.
    ${retenueGarantiePct > 0 ? `<br><br><strong>Retenue de garantie:</strong> ${retenueGarantiePct}% retenus conformément à la loi n°71-584 du 16 juillet 1971. Libérable 1 an après la réception des travaux sauf réserves.` : ''}
  </div>

  <!-- FOOTER -->
  ${buildFooterHtml(e, rcsComplet)}
</body>
</html>`;
}

/**
 * Ouvre une fenêtre d'impression pour une facture de situation
 */
export function printSituationFacture(params) {
  const html = buildSituationFactureHtml(params);
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}
