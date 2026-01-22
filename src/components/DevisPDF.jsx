// src/components/DevisPDF.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { generateFacturXML, isFacturXCompliant } from '../lib/facturx';
import QRCode from 'qrcode';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2 solid #f97316'
  },
  logo: {
    width: 80,
    height: 80
  },
  companyInfo: {
    textAlign: 'right'
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f97316',
    marginBottom: 5
  },
  companyDetails: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 20
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#f97316'
  },
  clientInfo: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5
  },
  clientDetail: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2
  },
  table: {
    marginTop: 20,
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f97316',
    padding: 10,
    color: 'white',
    fontWeight: 'bold'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    padding: 10
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1 solid #e5e7eb',
    padding: 10,
    backgroundColor: '#f9fafb'
  },
  colDesc: {
    width: '45%'
  },
  colQty: {
    width: '15%',
    textAlign: 'right'
  },
  colPrice: {
    width: '20%',
    textAlign: 'right'
  },
  colTotal: {
    width: '20%',
    textAlign: 'right',
    fontWeight: 'bold'
  },
  totals: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '40%'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderBottom: '1 solid #e5e7eb'
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#f97316',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    fontSize: 9
  },
  metaItem: {
    marginBottom: 5
  },
  metaLabel: {
    fontWeight: 'bold',
    color: '#666'
  },
  metaValue: {
    color: '#111'
  },
  facturxBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '4 8',
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 10
  },
  facturxBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5
  },
  qrCodeContainer: {
    position: 'absolute',
    bottom: 60,
    left: 40,
    width: 60,
    height: 60
  },
  qrCode: {
    width: 60,
    height: 60
  },
  qrCodeLabel: {
    fontSize: 6,
    color: '#999',
    textAlign: 'center',
    marginTop: 2
  }
});

export const DevisPDF = ({ devis, client, entreprise, showFacturXBadge = false, qrCodeDataUrl = null }) => {
  const typeLabel = devis.type === 'facture' ? 'FACTURE' : 'DEVIS';
  const isCompliant = showFacturXBadge || (devis.type === 'facture' && isFacturXCompliant(devis, client, entreprise));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {entreprise.logo_url && (
              <Image style={styles.logo} src={entreprise.logo_url} />
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{entreprise.nom}</Text>
            {entreprise.adresse && (
              <Text style={styles.companyDetails}>{entreprise.adresse}</Text>
            )}
            {entreprise.siret && (
              <Text style={styles.companyDetails}>SIRET: {entreprise.siret}</Text>
            )}
            {entreprise.email && (
              <Text style={styles.companyDetails}>Email: {entreprise.email}</Text>
            )}
            {entreprise.telephone && (
              <Text style={styles.companyDetails}>Tél: {entreprise.telephone}</Text>
            )}
          </View>
        </View>

        {/* Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Text style={[styles.title, { marginBottom: 0 }]}>{typeLabel} {devis.numero}</Text>
          {isCompliant && (
            <View style={styles.facturxBadge}>
              <Text>FACTUR-X 2026</Text>
            </View>
          )}
        </View>

        {/* Meta Info */}
        <View style={styles.metaInfo}>
          <View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date: </Text>
              <Text style={styles.metaValue}>
                {new Date(devis.date).toLocaleDateString('fr-FR')}
              </Text>
            </View>
            {devis.type === 'devis' && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Validité: </Text>
                <Text style={styles.metaValue}>30 jours</Text>
              </View>
            )}
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLIENT</Text>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>
              {client.nom} {client.prenom}
            </Text>
            {client.entreprise && (
              <Text style={styles.clientDetail}>{client.entreprise}</Text>
            )}
            <Text style={styles.clientDetail}>{client.adresse}</Text>
            <Text style={styles.clientDetail}>Email: {client.email}</Text>
            <Text style={styles.clientDetail}>Tél: {client.telephone}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DÉTAIL</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colDesc}>Désignation</Text>
              <Text style={styles.colQty}>Qté</Text>
              <Text style={styles.colPrice}>Prix HT</Text>
              <Text style={styles.colTotal}>Total HT</Text>
            </View>
            {devis.lignes.map((ligne, index) => (
              <View 
                key={index} 
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={styles.colDesc}>{ligne.description}</Text>
                <Text style={styles.colQty}>{ligne.quantite}</Text>
                <Text style={styles.colPrice}>{ligne.prixUnitaire.toFixed(2)}€</Text>
                <Text style={styles.colTotal}>{ligne.montant.toFixed(2)}€</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Total HT</Text>
            <Text>{devis.total_ht.toFixed(2)}€</Text>
          </View>
          {/* TVA breakdown by rate */}
          {(() => {
            // Group lignes by TVA rate
            const tvaByRate = {};
            const defaultRate = devis.tvaRate || entreprise.tva_percent || 10;

            devis.lignes.forEach(ligne => {
              const rate = ligne.tva !== undefined ? ligne.tva : defaultRate;
              if (!tvaByRate[rate]) {
                tvaByRate[rate] = 0;
              }
              tvaByRate[rate] += (ligne.montant || 0);
            });

            const rates = Object.keys(tvaByRate).map(Number).sort((a, b) => b - a);

            // If only one rate, show simple TVA line
            if (rates.length <= 1) {
              const rate = rates[0] || defaultRate;
              return (
                <View style={styles.totalRow}>
                  <Text>TVA ({rate}%)</Text>
                  <Text>{devis.tva.toFixed(2)}€</Text>
                </View>
              );
            }

            // Multiple rates: show breakdown
            return rates.map(rate => {
              const htForRate = tvaByRate[rate];
              const tvaAmount = htForRate * (rate / 100);
              return (
                <View key={rate} style={styles.totalRow}>
                  <Text>TVA {rate}% (sur {htForRate.toFixed(2)}€ HT)</Text>
                  <Text>{tvaAmount.toFixed(2)}€</Text>
                </View>
              );
            });
          })()}
          <View style={styles.totalRowFinal}>
            <Text>TOTAL TTC</Text>
            <Text>{devis.total_ttc.toFixed(2)}€</Text>
          </View>
        </View>

        {/* QR Code */}
        {qrCodeDataUrl && (
          <View style={styles.qrCodeContainer}>
            <Image style={styles.qrCode} src={qrCodeDataUrl} />
            <Text style={styles.qrCodeLabel}>Scanner pour details</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {entreprise.nom} - {entreprise.siret ? `SIRET: ${entreprise.siret} - ` : ''}
            {typeLabel} {devis.numero}
          </Text>
          {devis.type === 'facture' && (
            <Text style={{ marginTop: 5 }}>
              Facture à régler sous 30 jours. En cas de retard, pénalités de 3 fois le taux d'intérêt légal.
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

/**
 * Generate QR code data URL for document
 * @param {Object} devis - Document object
 * @param {Object} entreprise - Company object
 * @returns {Promise<string>} Base64 data URL
 */
async function generateQRCodeDataUrl(devis, entreprise) {
  // QR code contains structured document info
  const qrData = JSON.stringify({
    type: devis.type === 'facture' ? 'INV' : 'QUO',
    num: devis.numero,
    date: devis.date,
    ttc: devis.total_ttc,
    ent: entreprise.nom,
    siret: entreprise.siret || ''
  });

  try {
    return await QRCode.toDataURL(qrData, {
      width: 120,
      margin: 1,
      color: { dark: '#333333', light: '#ffffff' }
    });
  } catch (err) {
    console.warn('QR code generation failed:', err);
    return null;
  }
}

// Fonction helper pour générer et télécharger le PDF
export async function downloadDevisPDF(devis, client, entreprise) {
  const { pdf } = await import('@react-pdf/renderer');
  const isCompliant = devis.type === 'facture' && isFacturXCompliant(devis, client, entreprise);

  // Generate QR code
  const qrCodeDataUrl = await generateQRCodeDataUrl(devis, entreprise);

  const blob = await pdf(
    <DevisPDF
      devis={devis}
      client={client}
      entreprise={entreprise}
      showFacturXBadge={isCompliant}
      qrCodeDataUrl={qrCodeDataUrl}
    />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${devis.numero}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

// Fonction pour télécharger PDF + XML Factur-X (pour factures)
export async function downloadFacturXBundle(devis, client, entreprise) {
  // Generate PDF (includes QR code)
  await downloadDevisPDF(devis, client, entreprise);

  // Generate XML only for invoices
  if (devis.type === 'facture') {
    const xml = generateFacturXML(devis, client, entreprise);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${devis.numero}_facturx.xml`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// Export QR code generator for preview
export { generateQRCodeDataUrl };

// Export compliance check for UI usage
export { isFacturXCompliant } from '../lib/facturx';
