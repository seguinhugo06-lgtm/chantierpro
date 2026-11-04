import { dateLue } from '../../lib/dates';
import { franchiseAppliquee } from '../../lib/franchiseTva';
import { libellesColonnesPrix, libelleTotalImprime, totauxDocument } from '../../lib/totauxDocument';

/**
 * Document imprimé du portail client (bouton « Télécharger » d'un devis ou d'une facture), en HTML. Sorti de
 * ClientPortal.jsx pour être testé (relecture du 4 nov. 2026) : en franchise en base de TVA, ni « HT » ni « TTC ».
 */
export function htmlDocumentPortail(doc, { entreprise = {}, client = {}, couleur = entreprise?.couleur || '#f97316' } = {}) {
  const isFacture = doc.type === 'facture';
  // Franchise en base de TVA (art. 293 B du CGI), même règle que les autres pièces : ni « HT » ni « TTC », pas de
  // ligne de TVA, et la mention obligatoire (CGI art. 293 E, II). Un document émis avec TVA garde ses libellés.
  const isMicro = franchiseAppliquee(doc, entreprise);
  const colonnes = libellesColonnesPrix(isMicro);

  const lignesHTML = (doc.lignes || []).map(l => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top">${l.description || ''}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.quantite || 1}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.unite || 'u'}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${(l.prixUnitaire || 0).toFixed(2)} \u20ac</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${(l.montant || 0).toFixed(2)} \u20ac</td>
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
  .logo { font-size: 16pt; font-weight: bold; color: ${couleur}; margin-bottom: 8px; }
  .entreprise-info { font-size: 8pt; color: #64748b; line-height: 1.5; }
  .doc-type { text-align: right; }
  .doc-type h1 { font-size: 22pt; color: ${couleur}; margin-bottom: 8px; }
  .doc-info { font-size: 9pt; color: #64748b; }
  .client-section { background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid ${couleur}; margin-bottom: 20px; }
  .client-section h3 { font-size: 8pt; color: #64748b; margin-bottom: 6px; text-transform: uppercase; }
  .client-section .name { font-weight: 600; font-size: 11pt; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
  thead { background: ${couleur}; color: white; }
  th { padding: 10px 8px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; }
  th:not(:first-child) { text-align: center; }
  th:last-child { text-align: right; }
  .totals { margin-left: auto; width: 260px; margin-top: 15px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 10pt; }
  .totals .row.sub { background: #f8fafc; border-radius: 4px; margin-bottom: 2px; }
  .totals .total { background: ${couleur}; color: white; padding: 12px; border-radius: 6px; font-size: 13pt; font-weight: bold; margin-top: 8px; }
  .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 7pt; color: #64748b; text-align: center; }
  @media print { body { padding: 15px; } @page { margin: 1cm; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">${entreprise.nom || 'Entreprise'}</div>
    <div class="entreprise-info">
      ${entreprise.adresse || ''}<br>
      ${entreprise.tel ? `Tel: ${entreprise.tel}` : ''} ${entreprise.email ? `&middot; ${entreprise.email}` : ''}
      ${entreprise.siret ? `<br>SIRET: ${entreprise.siret}` : ''}
    </div>
  </div>
  <div class="doc-type">
    <h1>${isFacture ? 'FACTURE' : 'DEVIS'}</h1>
    <div class="doc-info">
      <strong>N&deg; ${doc.numero}</strong><br>
      Date: ${dateLue(doc.created_at).toLocaleDateString('fr-FR')}
    </div>
  </div>
</div>

<div class="client-section">
  <h3>Client</h3>
  <div class="name">${client.prenom} ${client.nom}</div>
</div>

${doc.description ? `<p style="margin-bottom:15px;color:#475569">${doc.description}</p>` : ''}

${doc.lignes && doc.lignes.length > 0 ? `
<table aria-label="Detail des prestations">
  <thead>
    <tr>
      <th scope="col">Description</th>
      <th scope="col">Qte</th>
      <th scope="col">Unite</th>
      <th scope="col">${isMicro ? colonnes.pu : 'P.U. HT'}</th>
      <th scope="col">${colonnes.total}</th>
    </tr>
  </thead>
  <tbody>
    ${lignesHTML}
  </tbody>
</table>` : ''}

<div class="totals">
  ${isMicro ? '' : `<div class="row sub"><span>Total HT</span><span>${(doc.total_ht || 0).toFixed(2)} \u20ac</span></div>
  <div class="row sub"><span>TVA (${doc.tva_rate || 20}%)</span><span>${(doc.tva || 0).toFixed(2)} \u20ac</span></div>`}
  <div class="row total"><span>${libelleTotalImprime(doc, isMicro)}</span><span>${(isMicro ? totauxDocument(doc, { isMicro }).totalTTC : (doc.total_ttc || 0)).toFixed(2)} \u20ac</span></div>
</div>
${isMicro ? '<p style="margin-top:10px;font-size:8pt;color:#475569">TVA non applicable, article 293 B du CGI</p>' : ''}

<div class="footer">
  <strong>${entreprise.nom || ''}</strong>
  ${entreprise.siret ? ` &middot; SIRET: ${entreprise.siret}` : ''}
</div>
</body>
</html>`;
}
