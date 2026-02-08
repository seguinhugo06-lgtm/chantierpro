import React, { memo } from 'react';

const styles = {
  container: {
    background: '#fff',
    padding: '30px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    maxWidth: '1000px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '30px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#111'
  },
  ligneForm: {
    background: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr auto',
    gap: '12px',
    alignItems: 'end'
  },
  addButton: {
    padding: '10px 20px',
    background: '#f97316',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '18px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '20px'
  },
  tableHead: {
    background: '#f9fafb'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#666'
  },
  td: {
    padding: '12px',
    borderTop: '1px solid #e5e7eb'
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px'
  },
  totaux: {
    background: '#f9fafb',
    padding: '20px',
    borderTop: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '40px',
    fontSize: '16px'
  },
  totalTTC: {
    fontSize: '20px',
    color: '#f97316',
    fontWeight: 'bold'
  },
  submitButton: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600'
  },
  submitButtonDisabled: {
    width: '100%',
    padding: '16px',
    background: '#d1d5db',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'not-allowed',
    fontSize: '16px',
    fontWeight: '600'
  }
};

const DevisForm = memo(({
  devisForm,
  setDevisForm,
  currentLigne,
  setCurrentLigne,
  clients,
  onAddLigne,
  onDeleteLigne,
  onSubmit,
  calculerTotaux
}) => {
  
  const totaux = calculerTotaux(devisForm.lignes);
  const canSubmit = devisForm.clientId && devisForm.lignes.length > 0;

  const handleDevisChange = (field) => (e) => {
    setDevisForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleLigneChange = (field) => (e) => {
    const value = field === 'quantite' || field === 'prixUnitaire' 
      ? parseFloat(e.target.value) || 0 
      : e.target.value;
    setCurrentLigne(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Client *</label>
          <select 
            value={devisForm.clientId} 
            onChange={handleDevisChange('clientId')}
            required 
            style={styles.input}
          >
            <option value="">Sélectionner...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.nom} {c.prenom}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Date</label>
          <input 
            type="date" 
            value={devisForm.date} 
            onChange={handleDevisChange('date')}
            style={styles.input} 
          />
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Lignes du devis</h3>
      <div style={styles.ligneForm}>
        <input
          placeholder="Description"
          value={currentLigne.description}
          onChange={handleLigneChange('description')}
          style={styles.input}
        />
        <input
          type="number"
          placeholder="Qté"
          value={currentLigne.quantite}
          onChange={handleLigneChange('quantite')}
          min="1"
          style={styles.input}
        />
        <input
          type="number"
          placeholder="Prix HT"
          step="0.01"
          value={currentLigne.prixUnitaire}
          onChange={handleLigneChange('prixUnitaire')}
          min="0"
          style={styles.input}
        />
        <button onClick={onAddLigne} type="button" style={styles.addButton}>
          +
        </button>
      </div>

      {devisForm.lignes.length > 0 && (
        <div>
          <table style={styles.table} aria-label="Lignes du devis en cours">
            <thead style={styles.tableHead}>
              <tr>
                <th scope="col" style={styles.th}>Description</th>
                <th scope="col" style={{ ...styles.th, textAlign: 'right' }}>Qté</th>
                <th scope="col" style={{ ...styles.th, textAlign: 'right' }}>Prix HT</th>
                <th scope="col" style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                <th scope="col" style={{ ...styles.th, width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {devisForm.lignes.map((ligne, index) => (
                <tr key={index}>
                  <td style={styles.td}>{ligne.description}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{ligne.quantite}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{ligne.prixUnitaire.toFixed(2)}€</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600' }}>
                    {ligne.montant.toFixed(2)}€
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <button 
                      onClick={() => onDeleteLigne(index)} 
                      type="button" 
                      style={styles.deleteButton}
                    >
                      
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={styles.totaux}>
            <div>Total HT: <strong>{totaux.totalHT.toFixed(2)}€</strong></div>
            <div>TVA (20%): <strong>{totaux.tva.toFixed(2)}€</strong></div>
            <div style={styles.totalTTC}>
              Total TTC: <strong>{totaux.totalTTC.toFixed(2)}€</strong>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={onSubmit}
        disabled={!canSubmit}
        style={canSubmit ? styles.submitButton : styles.submitButtonDisabled}
      >
        Créer le devis
      </button>
    </div>
  );
});

DevisForm.displayName = 'DevisForm';

export default DevisForm;