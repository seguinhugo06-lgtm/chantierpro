/**
 * miseEnDemeureBuilder.js — Generates a formal "Mise en Demeure" (formal notice) HTML
 * document for late invoice payment, compliant with French commercial law.
 *
 * Art. L441-10 Code de commerce (pénalités de retard)
 * Art. D441-5 Code de commerce (indemnité forfaitaire de recouvrement 40€)
 *
 * @module miseEnDemeureBuilder
 */

import { calculatePenalties, DEFAULT_PENALTY_RATE } from './relanceUtils';

/**
 * Format a number as euros (French locale)
 */
function fmtEuro(n) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

/**
 * Format a date in French long format
 */
function fmtDate(d) {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Build the full HTML document for a Mise en Demeure.
 *
 * @param {Object} params
 * @param {Object} params.doc - The invoice document
 * @param {Object} params.client - The client
 * @param {Object} params.entreprise - Company data
 * @param {Array} [params.executions] - Previous relance executions for this doc
 * @param {number} [params.penaltyRate] - Custom penalty rate (default: 11.62%)
 * @param {string} [params.couleur] - Accent color
 * @returns {string} Complete HTML document
 */
export function buildMiseEnDemeureHtml({
  doc,
  client,
  entreprise,
  executions = [],
  penaltyRate = DEFAULT_PENALTY_RATE,
  couleur = '#f97316',
}) {
  const now = new Date();
  const dateFacture = doc.date ? new Date(doc.date) : now;
  const dateEcheance = doc.date_echeance || doc.dateEcheance
    ? new Date(doc.date_echeance || doc.dateEcheance)
    : new Date(dateFacture.getTime() + 30 * 24 * 60 * 60 * 1000);

  const joursRetard = Math.max(0, Math.floor((now - dateEcheance) / (1000 * 60 * 60 * 24)));
  const montantTTC = doc.total_ttc || doc.montant_ttc || 0;
  const penalties = calculatePenalties(montantTTC, joursRetard, penaltyRate);

  // Previous relances summary
  const sentRelances = executions.filter(e => e.status !== 'cancelled' && e.status !== 'failed');
  const relanceSummary = sentRelances.length > 0
    ? sentRelances.map(e => {
        const date = new Date(e.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const channel = e.channel === 'email' ? 'email' : e.channel === 'sms' ? 'SMS' : e.channel === 'email_sms' ? 'email et SMS' : e.channel;
        return `${date} (par ${channel})`;
      }).join(', ')
    : null;

  // Company info
  const entNom = entreprise?.nom || 'Notre entreprise';
  const entAdresse = entreprise?.adresse || '';
  const entSiret = entreprise?.siret || '';
  const entTel = entreprise?.tel || entreprise?.telephone || '';
  const entEmail = entreprise?.email || '';
  const entRCS = getRCSComplet(entreprise);
  const entCapital = entreprise?.capitalSocial || '';
  const entForme = entreprise?.formeJuridique || '';

  // Client info
  const clientNom = client?.nom
    ? `${client.prenom || ''} ${client.nom}`.trim()
    : client?.entreprise || 'Le client';
  const clientAdresse = client?.adresse || '';
  const clientEntreprise = client?.entreprise || '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mise en Demeure - ${doc.numero || ''}</title>
<style>
  @page { margin: 20mm 15mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a1a;
    background: #fff;
    padding: 40px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 3px solid ${couleur};
  }
  .company-info { max-width: 55%; }
  .company-name {
    font-size: 16pt;
    font-weight: 700;
    color: ${couleur};
    margin-bottom: 4px;
  }
  .company-details {
    font-size: 9pt;
    color: #555;
    line-height: 1.5;
  }
  .recipient {
    text-align: right;
    max-width: 40%;
  }
  .recipient-label {
    font-size: 9pt;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .recipient-name {
    font-size: 12pt;
    font-weight: 600;
  }
  .recipient-details {
    font-size: 10pt;
    color: #444;
  }
  .date-lieu {
    text-align: right;
    font-size: 10pt;
    color: #555;
    margin-bottom: 30px;
  }
  .title {
    font-size: 16pt;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #c0392b;
    margin-bottom: 10px;
    padding: 15px;
    border: 2px solid #c0392b;
    background: #fef2f2;
  }
  .ref-line {
    text-align: center;
    font-size: 10pt;
    color: #555;
    margin-bottom: 30px;
  }
  .body-text {
    margin-bottom: 16px;
    text-align: justify;
  }
  .body-text strong { color: #1a1a1a; }
  .relance-history {
    margin: 20px 0;
    padding: 12px 16px;
    background: #f8f9fa;
    border-left: 3px solid ${couleur};
    font-size: 10pt;
  }
  .relance-history-title {
    font-weight: 600;
    margin-bottom: 4px;
  }
  .penalty-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 10pt;
  }
  .penalty-table th {
    background: #f1f5f9;
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #e2e8f0;
  }
  .penalty-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
  }
  .penalty-table .total-row td {
    font-weight: 700;
    font-size: 11pt;
    border-top: 2px solid #1a1a1a;
    background: #fef2f2;
    color: #c0392b;
  }
  .legal-notice {
    margin: 20px 0;
    padding: 12px 16px;
    background: #fffbeb;
    border: 1px solid #fbbf24;
    border-radius: 4px;
    font-size: 9pt;
    color: #92400e;
  }
  .legal-notice strong {
    display: block;
    margin-bottom: 4px;
    font-size: 10pt;
  }
  .signature-block {
    margin-top: 40px;
    text-align: right;
  }
  .signature-name {
    font-weight: 600;
    font-size: 11pt;
  }
  .footer {
    margin-top: 60px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 8pt;
    color: #888;
    text-align: center;
    line-height: 1.4;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div class="company-info">
    <div class="company-name">${entNom}</div>
    <div class="company-details">
      ${entForme ? `${entForme}<br>` : ''}
      ${entAdresse ? `${entAdresse}<br>` : ''}
      ${entSiret ? `SIRET : ${entSiret}<br>` : ''}
      ${entRCS ? `${entRCS}<br>` : ''}
      ${entCapital ? `Capital : ${entCapital} €<br>` : ''}
      ${entTel ? `Tél : ${entTel}` : ''}${entEmail ? ` · ${entEmail}` : ''}
    </div>
  </div>
  <div class="recipient">
    <div class="recipient-label">Destinataire</div>
    <div class="recipient-name">${clientNom}</div>
    <div class="recipient-details">
      ${clientEntreprise && clientEntreprise !== clientNom ? `${clientEntreprise}<br>` : ''}
      ${clientAdresse || ''}
    </div>
  </div>
</div>

<!-- Date & Lieu -->
<div class="date-lieu">
  ${entreprise?.ville ? `${entreprise.ville}, le ` : 'Le '}${fmtDate(now)}
</div>

<!-- Title -->
<div class="title">MISE EN DEMEURE DE PAYER</div>
<div class="ref-line">
  Facture n° <strong>${doc.numero || 'N/A'}</strong> du ${fmtDate(dateFacture)}
  — Montant : <strong>${fmtEuro(montantTTC)}</strong> TTC
</div>

<!-- Body -->
<p class="body-text">Madame, Monsieur,</p>

<p class="body-text">
  Par la présente, nous vous mettons en demeure de régler, dans un délai de <strong>huit (8) jours</strong>
  à compter de la réception de ce courrier, la facture n° <strong>${doc.numero || 'N/A'}</strong>
  d'un montant de <strong>${fmtEuro(montantTTC)} TTC</strong>, émise le ${fmtDate(dateFacture)}
  et arrivée à échéance le <strong>${fmtDate(dateEcheance)}</strong>.
</p>

<p class="body-text">
  À ce jour, soit <strong>${joursRetard} jours</strong> après l'échéance, cette facture demeure impayée
  malgré nos précédentes relances.
</p>

${relanceSummary ? `
<div class="relance-history">
  <div class="relance-history-title">Rappels précédents envoyés :</div>
  ${relanceSummary}
</div>
` : ''}

<p class="body-text">
  Conformément aux dispositions des articles L.441-10 et D.441-5 du Code de commerce,
  des pénalités de retard et une indemnité forfaitaire de recouvrement sont désormais exigibles.
</p>

<!-- Penalty Table -->
<table class="penalty-table">
  <thead>
    <tr>
      <th>Désignation</th>
      <th style="text-align:right">Montant</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Montant initial de la facture TTC</td>
      <td style="text-align:right">${fmtEuro(montantTTC)}</td>
    </tr>
    <tr>
      <td>
        Pénalités de retard (${penaltyRate}% annuel × ${joursRetard} jours)
        <br><small style="color:#666">Art. L441-10 Code de commerce</small>
      </td>
      <td style="text-align:right">${fmtEuro(penalties.penalites)}</td>
    </tr>
    <tr>
      <td>
        Indemnité forfaitaire de recouvrement
        <br><small style="color:#666">Art. D441-5 Code de commerce</small>
      </td>
      <td style="text-align:right">${fmtEuro(penalties.indemnite)}</td>
    </tr>
    <tr class="total-row">
      <td>TOTAL DÛ</td>
      <td style="text-align:right">${fmtEuro(penalties.totalDu)}</td>
    </tr>
  </tbody>
</table>

<div class="legal-notice">
  <strong>Fondement juridique</strong>
  En application de l'article L.441-10 du Code de commerce, tout retard de paiement entraîne de plein droit,
  le jour suivant la date de règlement figurant sur la facture, l'exigibilité de pénalités de retard
  calculées sur la base d'un taux annuel de ${penaltyRate}% (soit trois fois le taux d'intérêt légal).
  L'article D.441-5 prévoit en outre une indemnité forfaitaire de 40 € pour frais de recouvrement.
</div>

<p class="body-text">
  <strong>À défaut de règlement dans le délai imparti de huit (8) jours</strong>,
  nous serons contraints de transmettre ce dossier à notre service contentieux
  et/ou à un cabinet de recouvrement, ce qui entraînera des frais supplémentaires
  à votre charge.
</p>

<p class="body-text">
  Nous vous invitons à procéder au règlement de la somme de <strong>${fmtEuro(penalties.totalDu)}</strong>
  par tout moyen à votre convenance (virement bancaire, chèque) dès réception de la présente.
</p>

<p class="body-text">
  Dans l'hypothèse où votre règlement se serait croisé avec le présent courrier,
  nous vous prions de ne pas tenir compte de cette mise en demeure.
</p>

<p class="body-text" style="margin-top:8px">
  Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.
</p>

<!-- Signature -->
<div class="signature-block">
  <div class="signature-name">${entNom}</div>
  <div style="font-size:10pt;color:#555;margin-top:4px">
    ${entreprise?.gerant || ''}
  </div>
</div>

<!-- Footer -->
<div class="footer">
  ${entNom}${entForme ? ` — ${entForme}` : ''}${entSiret ? ` — SIRET ${entSiret}` : ''}${entRCS ? ` — ${entRCS}` : ''}
  <br>
  ${entAdresse ? `${entAdresse} — ` : ''}${entTel ? `Tél : ${entTel}` : ''}${entEmail ? ` — ${entEmail}` : ''}
  <br>
  Document généré le ${fmtDate(now)} — Ce document constitue une mise en demeure au sens de l'article 1344 du Code civil.
</div>

</body>
</html>`;
}

/**
 * Helper for RCS formatting
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
 * Opens a print dialog for the Mise en Demeure.
 * Pattern matches devisHtmlBuilder.js printSituationFacture.
 *
 * @param {Object} params - Same params as buildMiseEnDemeureHtml
 */
export function printMiseEnDemeure(params) {
  const html = buildMiseEnDemeureHtml(params);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

export default { buildMiseEnDemeureHtml, printMiseEnDemeure };
