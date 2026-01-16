// src/components/DevisPDF.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

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
  }
});

export const DevisPDF = ({ devis, client, entreprise }) => {
  const typeLabel = devis.type === 'facture' ? 'FACTURE' : 'DEVIS';
  
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
              <Text style={styles.companyDetails}>TÃ©l: {entreprise.telephone}</Text>
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{typeLabel} {devis.numero}</Text>

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
                <Text style={styles.metaLabel}>ValiditÃ©: </Text>
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
            <Text style={styles.clientDetail}>TÃ©l: {client.telephone}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DÃ‰TAIL</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colDesc}>DÃ©signation</Text>
              <Text style={styles.colQty}>QtÃ©</Text>
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
                <Text style={styles.colPrice}>{ligne.prixUnitaire.toFixed(2)}â‚¬</Text>
                <Text style={styles.colTotal}>{ligne.montant.toFixed(2)}â‚¬</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Total HT</Text>
            <Text>{devis.total_ht.toFixed(2)}â‚¬</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>TVA ({entreprise.tva_percent}%)</Text>
            <Text>{devis.tva.toFixed(2)}â‚¬</Text>
          </View>
          <View style={styles.totalRowFinal}>
            <Text>TOTAL TTC</Text>
            <Text>{devis.total_ttc.toFixed(2)}â‚¬</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {entreprise.nom} - {entreprise.siret ? `SIRET: ${entreprise.siret} - ` : ''}
            {typeLabel} {devis.numero}
          </Text>
          {devis.type === 'facture' && (
            <Text style={{ marginTop: 5 }}>
              Facture Ã  rÃ©gler sous 30 jours. En cas de retard, pÃ©nalitÃ©s de 3 fois le taux d'intÃ©rÃªt lÃ©gal.
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

// Fonction helper pour gÃ©nÃ©rer et tÃ©lÃ©charger le PDF
export async function downloadDevisPDF(devis, client, entreprise) {
  const { pdf } = await import('@react-pdf/renderer');
  const blob = await pdf(<DevisPDF devis={devis} client={client} entreprise={entreprise} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${devis.numero}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
