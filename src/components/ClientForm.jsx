import React, { memo } from 'react';

// Styles CSS fixes (ne changent jamais = pas de re-render)
const styles = {
  container: {
    background: '#fff',
    padding: '30px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    maxWidth: '800px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
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
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    resize: 'vertical',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  buttonRow: {
    display: 'flex',
    gap: '12px'
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500'
  },
  submitButton: {
    flex: 1,
    padding: '14px',
    background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600'
  }
};

const ClientForm = memo(({ 
  clientForm, 
  setClientForm, 
  onSubmit, 
  onCancel, 
  editingClient 
}) => {
  
  const handleChange = (field) => (e) => {
    setClientForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div style={styles.container}>
      <form onSubmit={onSubmit}>
        <div style={styles.formRow}>
          <div>
            <label style={styles.label}>Nom *</label>
            <input
              type="text"
              value={clientForm.nom}
              onChange={handleChange('nom')}
              required
              style={styles.input}
              autoComplete="off"
            />
          </div>
          <div>
            <label style={styles.label}>PrÃ©nom</label>
            <input
              type="text"
              value={clientForm.prenom}
              onChange={handleChange('prenom')}
              style={styles.input}
              autoComplete="off"
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Entreprise</label>
          <input
            type="text"
            value={clientForm.entreprise}
            onChange={handleChange('entreprise')}
            style={styles.input}
            autoComplete="off"
          />
        </div>

        <div style={styles.formRow}>
          <div>
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              value={clientForm.email}
              onChange={handleChange('email')}
              required
              style={styles.input}
              autoComplete="off"
            />
          </div>
          <div>
            <label style={styles.label}>TÃ©lÃ©phone *</label>
            <input
              type="tel"
              value={clientForm.telephone}
              onChange={handleChange('telephone')}
              required
              style={styles.input}
              autoComplete="off"
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Adresse *</label>
          <textarea
            value={clientForm.adresse}
            onChange={handleChange('adresse')}
            required
            rows={3}
            style={styles.textarea}
          />
        </div>

        <div style={styles.buttonRow}>
          <button type="button" onClick={onCancel} style={styles.cancelButton}>
            Annuler
          </button>
          <button type="submit" style={styles.submitButton}>
            {editingClient ? 'Modifier' : 'CrÃ©er'}
          </button>
        </div>
      </form>
    </div>
  );
});

ClientForm.displayName = 'ClientForm';

export default ClientForm;