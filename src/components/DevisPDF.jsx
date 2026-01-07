// Version simplifiée - génère un PDF basique
export async function downloadDevisPDF(devis, client, entreprise) {
  // Pour l'instant, on génère un HTML que le navigateur peut imprimer en PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${devis.numero}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
    .company { text-align: right; }
    .company h1 { color: #f97316; margin: 0; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .client-info { background: #f9fafb; padding: 15px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f97316; color: white; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .totaux { text-align: right; margin-top: 20px; }
    .total-ttc { font-size: 20px; color: #f97316; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2>🏗️ ChantierPro</h2>
    </div>
    <div class="company">
      <h1>${entreprise.nom}</h1>
      <p>${entreprise.adresse || ''}</p>
      <p>${entreprise.email || ''}</p>
      <p>${entreprise.telephone || ''}</p>
    </div>
  </div>
  
  <div class="title">${devis.type === 'facture' ? 'FACTURE' : 'DEVIS'} ${devis.numero}</div>
  
  <p><strong>Date:</strong> ${new Date(devis.date).toLocaleDateString('fr-FR')}</p>
  
  <div class="client-info">
    <h3>CLIENT</h3>
    <p><strong>${client.nom} ${client.prenom}</strong></p>
    ${client.entreprise ? `<p>${client.entreprise}</p>` : ''}
    <p>${client.adresse}</p>
    <p>Email: ${client.email}</p>
    <p>Tél: ${client.telephone}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qté</th>
        <th>Prix HT</th>
        <th>Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${devis.lignes.map(ligne => `
        <tr>
          <td>${ligne.description}</td>
          <td>${ligne.quantite}</td>
          <td>${ligne.prixUnitaire.toFixed(2)}€</td>
          <td>${ligne.montant.toFixed(2)}€</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="totaux">
    <p>Total HT: <strong>${devis.total_ht.toFixed(2)}€</strong></p>
    <p>TVA (20%): <strong>${devis.tva.toFixed(2)}€</strong></p>
    <p class="total-ttc">TOTAL TTC: <strong>${devis.total_ttc.toFixed(2)}€</strong></p>
  </div>
</body>
</html>
  `;
  
  // Ouvre dans une nouvelle fenêtre pour impression
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Lance l'impression automatiquement
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
