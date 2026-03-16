/**
 * Attestation TVA réduite — CERFA 13948*05
 * Generates an HTML document that can be printed as PDF
 * Required when applying reduced VAT (5.5% or 10%) on renovation works
 */

/**
 * Generate the HTML for the CERFA 13948 attestation form
 * @param {Object} params
 * @param {Object} params.client - Client object
 * @param {Object} params.entreprise - Company config
 * @param {Object} params.devis - The devis/quote object
 * @param {Object} params.attestationData - Form data from the modal
 * @returns {string} Complete HTML document
 */
export function buildAttestationTvaHtml({ client, entreprise, devis, attestationData }) {
  const d = attestationData || {};
  const taux = d.tauxTva || 10;
  const isSimplifiee = d.type !== 'normale';

  const clientNom = [client?.prenom, client?.nom].filter(Boolean).join(' ') || '';
  const clientAdresse = client?.adresse || '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Attestation TVA réduite — CERFA 13948</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; color: #1e293b; padding: 20px 30px; line-height: 1.5; }
    h1 { font-size: 14pt; text-align: center; margin-bottom: 4px; color: #1e3a5f; }
    h2 { font-size: 11pt; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #1e3a5f; color: #1e3a5f; }
    .subtitle { text-align: center; font-size: 9pt; color: #64748b; margin-bottom: 16px; }
    .ref { text-align: center; font-size: 8pt; color: #94a3b8; margin-bottom: 10px; }
    .section { margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 140px 1fr; gap: 4px 12px; margin: 6px 0; }
    .grid .label { font-weight: 600; font-size: 8.5pt; color: #475569; }
    .grid .value { border-bottom: 1px dotted #cbd5e1; padding-bottom: 2px; min-height: 18px; }
    .checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 8px 0; }
    .checkbox-item { display: flex; align-items: flex-start; gap: 6px; font-size: 8.5pt; padding: 3px 0; }
    .checkbox-item .box { width: 12px; height: 12px; border: 1.5px solid #475569; border-radius: 2px; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; font-size: 8pt; }
    .checkbox-item .box.checked { background: #1e3a5f; border-color: #1e3a5f; color: white; }
    .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px 14px; font-size: 8.5pt; margin: 10px 0; color: #0c4a6e; }
    .warning-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; font-size: 8.5pt; margin: 10px 0; color: #78350f; }
    .signature-section { display: flex; gap: 30px; margin-top: 20px; }
    .signature-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; min-height: 100px; }
    .signature-box h4 { font-size: 9pt; margin-bottom: 6px; color: #475569; }
    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 7.5pt; color: #94a3b8; text-align: center; }
    @media print { body { padding: 10px 15px; } }
  </style>
</head>
<body>
  <h1>ATTESTATION ${isSimplifiee ? 'SIMPLIFIÉE' : 'NORMALE'}</h1>
  <div class="subtitle">Attestation de TVA à taux réduit (${taux}%)</div>
  <div class="ref">Référence CERFA 13948*05 — Article 279-0 bis du CGI</div>

  <div class="info-box">
    <strong>Objet :</strong> Cette attestation est obligatoire pour bénéficier du taux réduit de TVA à ${taux}% sur les travaux de rénovation dans les logements de plus de 2 ans. Elle doit être conservée par le prestataire et le client jusqu'au 31 décembre de la 5ème année suivant la facturation.
  </div>

  <!-- CASE 1 : Identité du client -->
  <h2>1. Identité du client ou de son représentant</h2>
  <div class="section">
    <div class="grid">
      <span class="label">Nom, Prénom :</span>
      <span class="value">${clientNom}</span>
      <span class="label">Adresse :</span>
      <span class="value">${clientAdresse}</span>
      <span class="label">Qualité :</span>
      <span class="value">${d.qualiteClient || 'Propriétaire occupant'}</span>
    </div>
  </div>

  <!-- CASE 2 : Nature de l'immeuble -->
  <h2>2. Nature et situation de l'immeuble</h2>
  <div class="section">
    <div class="grid">
      <span class="label">Adresse travaux :</span>
      <span class="value">${d.adresseTravaux || clientAdresse}</span>
      <span class="label">Nature :</span>
      <span class="value">${d.natureImmeuble || 'Maison individuelle'}</span>
      <span class="label">Achevé depuis :</span>
      <span class="value">${d.dateConstruction ? 'Plus de 2 ans (achevé le ' + d.dateConstruction + ')' : 'Plus de 2 ans'}</span>
      <span class="label">Affectation :</span>
      <span class="value">${d.affectation || 'Habitation'}</span>
    </div>
  </div>

  <!-- CASE 3 : Nature des travaux -->
  <h2>3. Nature des travaux</h2>
  <div class="section">
    <p style="font-size:8.5pt;color:#475569;margin-bottom:6px">
      ${isSimplifiee 
        ? 'Attestation simplifiée : travaux n\'affectant pas le gros œuvre, les fondations, le clos et le couvert, les réseaux et les équipements sanitaires.'
        : 'Attestation normale : les travaux portent sur les composants du gros œuvre, les fondations ou les éléments du clos et du couvert.'}
    </p>
    <div class="checkbox-grid">
      ${(d.travauxTypes || [
        { label: 'Peinture, revêtements muraux', checked: false },
        { label: 'Revêtements de sols', checked: false },
        { label: 'Plomberie, sanitaires', checked: false },
        { label: 'Électricité', checked: false },
        { label: 'Menuiseries intérieures', checked: false },
        { label: 'Chauffage, climatisation', checked: false },
        { label: 'Isolation thermique', checked: false },
        { label: 'Carrelage, faïence', checked: false },
        { label: 'Plâtrerie, cloisons', checked: false },
        { label: 'Menuiseries extérieures', checked: false },
        { label: 'Couverture, toiture', checked: false },
        { label: 'Maçonnerie', checked: false },
      ]).map(t => `
        <div class="checkbox-item">
          <div class="box ${t.checked ? 'checked' : ''}">${t.checked ? '✓' : ''}</div>
          <span>${t.label}</span>
        </div>
      `).join('')}
    </div>
    ${d.descriptionTravaux ? `<div style="margin-top:8px"><strong>Description :</strong> ${d.descriptionTravaux}</div>` : ''}
    ${devis?.numero ? `<div style="margin-top:4px;font-size:8.5pt;color:#475569">Référence devis : <strong>${devis.numero}</strong> du ${devis.date ? new Date(devis.date).toLocaleDateString('fr-FR') : ''} — Montant TTC : ${(devis.total_ttc || 0).toLocaleString('fr-FR', {minimumFractionDigits: 2})} €</div>` : ''}
  </div>

  <!-- CASE 4 : Attestation -->
  <h2>4. Attestation</h2>
  <div class="section">
    <p style="font-size:9pt">
      Je soussigné(e) <strong>${clientNom}</strong>, atteste que les travaux mentionnés ci-dessus sont réalisés dans un immeuble achevé depuis plus de deux ans et affecté à l'habitation, et remplissent les conditions pour bénéficier du taux réduit de TVA de <strong>${taux}%</strong>.
    </p>
    <p style="font-size:8pt;color:#475569;margin-top:8px">
      Je suis informé(e) que cette attestation engage ma responsabilité et que toute fausse déclaration est passible de sanctions pénales et fiscales conformément à l'article 1740 A du CGI.
    </p>
  </div>

  <div class="warning-box">
    <strong>Important :</strong> Le client doit conserver l'original signé. L'entreprise ${entreprise?.nom || ''} doit conserver une copie. Conservation obligatoire : jusqu'au 31/12 de la 5ème année suivant les travaux.
  </div>

  <!-- Signatures -->
  <div class="signature-section">
    <div class="signature-box">
      <h4>Le Client</h4>
      <p style="font-size:8pt;color:#64748b">
        Fait à : ________________________<br><br>
        Le : ${new Date().toLocaleDateString('fr-FR')}<br><br>
        Signature (précédée de la mention "Lu et approuvé") :<br><br><br><br>
      </p>
    </div>
    <div class="signature-box">
      <h4>L'Entreprise</h4>
      <p style="font-size:8pt;color:#64748b">
        <strong>${entreprise?.nom || ''}</strong><br>
        SIRET : ${entreprise?.siret || ''}<br>
        ${entreprise?.adresse || ''}<br><br>
        Cachet et signature :
      </p>
    </div>
  </div>

  <div class="footer">
    Attestation générée le ${new Date().toLocaleDateString('fr-FR')} — CERFA 13948*05 — Art. 279-0 bis du Code Général des Impôts<br>
    ${entreprise?.nom || ''} · SIRET ${entreprise?.siret || ''} · ${entreprise?.adresse || ''}
  </div>
</body>
</html>`;
}

/**
 * Open attestation in print window
 * @param {Object} params - Same params as buildAttestationTvaHtml
 */
export function printAttestationTva(params) {
  const html = buildAttestationTvaHtml(params);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }
}
