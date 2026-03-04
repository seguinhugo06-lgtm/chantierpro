# ChantierPro - Prompt 4/5: Commercialization Features & Critical Fixes

**Context:** ChantierPro (React 18, Vite 5, Supabase, Zustand, Tailwind CSS) has 17 pages/modules with many partially implemented or empty state features. This prompt details critical corrections and essential features needed for commercial launch.

---

## Complete Implementation Prompt

```
You are a senior React developer tasked with implementing critical commercialization features for ChantierPro, a construction management SaaS platform.

STACK: React 18, Vite 5, Supabase (PostgreSQL), Zustand, Tailwind CSS, React Router v6

CRITICAL: This is a MULTI-SPRINT project. Read through ALL 4 SPRINTS before starting any implementation.

---

## SPRINT 1 — CRITICAL CORRECTIONS (P0) — MUST COMPLETE FIRST

### 1.1 Fix Unicode & Accent Encoding Issues

Your task: Correct all incorrect character encodings across the codebase. These break French language support and appear unprofessional to users.

Files to fix and specific issues:

1. **src/components/SousTraitantsModule.jsx**
   - Line with "documents expires" → "documents expirés"
   - "conformite" → "conformité"
   - "Non recue" → "Non reçue"
   - "CHANTIERS ASSIGNES" → "CHANTIERS ASSIGNÉS"
   - "Cree le" → "Créé le"

2. **src/components/CommandesFournisseurs.jsx**
   - "Gerez" → "Gérez"
   - "Telephone" → "Téléphone"
   - "RECAPITULATIF" → "RÉCAPITULATIF"
   - "Creez votre premiere" → "Créez votre première"

3. **src/components/TresorerieModule.jsx**
   - "Apercu" → "Aperçu"
   - "DATE PREVUE" → "DATE PRÉVUE"
   - "Paye" → "Payé"
   - "Prevu" → "Prévu"
   - "depot" → "dépôt"
   - "decennale" → "décennale"
   - "vehicules" → "véhicules"

4. **src/components/IADevisAnalyse.jsx**
   - Search and replace all literal \u00XX sequences with proper UTF-8 characters

5. **src/components/CarnetEntretien.jsx**
   - Replace \u00XX sequences with correct UTF-8 accented characters

6. **src/components/SignatureModule.jsx**
   - Fix all encoding issues for French text

7. **src/components/EquipeModule.jsx**
   - "employe" → "employé"

8. **src/components/AdministratifModule.jsx**
   - Check consistency of "tu" vs "vous" (formal address)
   - Fix "Vérifie ta conformité" → "Vérifiez votre conformité" for consistency

**Implementation:**
- Use a code editor search-and-replace with regex: search for `[à-ÿ]` patterns
- Verify all French text renders correctly in browser (no mojibake)
- Test in all modules listed above

---

### 1.2 Add Mandatory Legal Notices to Devis/Factures

Your task: Ensure all generated PDF devis and factures contain legally required information for French construction companies.

Required elements on EVERY devis PDF:
- Numéro SIREN/SIRET of the company
- Assurance décennale: policy number, insurer name, expiration date
- Conditions de paiement (payment terms, net days)
- Taux TVA détaillés by line item (20%, 10%, 5.5% or 0%)
- Délai de validité du devis (validity period, typically 30 days)
- Legal mention: "Devis reçu avant l'exécution des travaux"
- Right of withdrawal: "Droit de rétractation: 14 jours à compter de l'acceptation en cas de démarchage"
- RCS/RM registration and city

Required elements on EVERY facture PDF:
- Same legal notices as devis
- Plus: Invoice number format DEV-YYYY-NNNNN
- Date of service completion
- Payment due date
- Reference to signed devis if applicable

**Implementation:**
1. Locate your PDF generation component (likely in src/components/ or src/modules/)
2. Add a function `getLegalNotices(company)` that returns all required text
3. Add a section in the PDF footer with these notices in 8pt font
4. Test PDF output with actual company data
5. Ensure all required fields are populated from company settings

---

### 1.3 Implement Sequential & Atomic Numbering

Your task: Ensure devis numbers (DEV-YYYY-NNNNN) and facture numbers (FAC-YYYY-NNNNN) are strictly sequential with no gaps or duplicates.

Current problem: Standard auto-increment can create gaps or duplicates in concurrent scenarios.

Solution: Use Supabase RPC function for atomic numbering

**Implementation:**

1. Create a new Supabase migration file (if not exists):
   `supabase/migrations/YYYYMMDDHHMMSS_add_document_numbering.sql`

   Content:
   ```sql
   -- Create counter table
   CREATE TABLE IF NOT EXISTS document_counters (
     id BIGSERIAL PRIMARY KEY,
     company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     document_type VARCHAR(10) NOT NULL, -- 'DEV' or 'FAC'
     year INTEGER NOT NULL,
     next_number BIGINT NOT NULL DEFAULT 1,
     UNIQUE(company_id, document_type, year)
   );

   -- Create RPC function for atomic increment
   CREATE OR REPLACE FUNCTION get_next_document_number(
     p_company_id UUID,
     p_document_type VARCHAR(10),
     p_year INTEGER
   ) RETURNS BIGINT AS $$
   DECLARE
     v_next_number BIGINT;
   BEGIN
     INSERT INTO document_counters (company_id, document_type, year, next_number)
     VALUES (p_company_id, p_document_type, p_year, 1)
     ON CONFLICT (company_id, document_type, year)
     DO UPDATE SET next_number = document_counters.next_number + 1
     RETURNING next_number INTO v_next_number;

     RETURN v_next_number;
   END;
   $$ LANGUAGE plpgsql;

   -- Create index for fast lookups
   CREATE INDEX idx_document_counters_company ON document_counters(company_id, document_type, year);
   ```

2. In your devis/facture creation service (src/services/devisService.ts or similar):
   ```javascript
   import { supabase } from '../lib/supabase'

   export async function generateDevisNumber(companyId, year = new Date().getFullYear()) {
     const { data, error } = await supabase.rpc('get_next_document_number', {
       p_company_id: companyId,
       p_document_type: 'DEV',
       p_year: year
     })

     if (error) throw new Error(error.message)

     const paddedNumber = String(data).padStart(5, '0')
     return `DEV-${year}-${paddedNumber}`
   }

   export async function generateFactureNumber(companyId, year = new Date().getFullYear()) {
     const { data, error } = await supabase.rpc('get_next_document_number', {
       p_company_id: companyId,
       p_document_type: 'FAC',
       p_year: year
     })

     if (error) throw new Error(error.message)

     const paddedNumber = String(data).padStart(5, '0')
     return `FAC-${year}-${paddedNumber}`
   }
   ```

3. When creating a new devis in DevisModule.jsx:
   ```javascript
   const handleCreateDevis = async (formData) => {
     const numero = await generateDevisNumber(currentUser.id)

     const { data, error } = await supabase
       .from('devis')
       .insert({
         numero,
         company_id: currentUser.id,
         client_id: formData.clientId,
         // ... other fields
       })
   }
   ```

---

### 1.4 Implement Row Level Security (RLS) on Supabase Tables

Your task: Ensure each company can only access its own data. This is CRITICAL for multi-tenant security.

**Implementation:**

1. For EACH table in your Supabase database (clients, devis, factures, chantiers, employes, sous_traitants, etc.):

   Enable RLS:
   ```sql
   ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
   ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
   ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
   -- ... repeat for ALL tables
   ```

2. Create policies for SELECT, INSERT, UPDATE, DELETE:
   ```sql
   -- Example for clients table
   CREATE POLICY "Companies can view their own clients" ON clients
     FOR SELECT
     USING (company_id = auth.uid());

   CREATE POLICY "Companies can create their own clients" ON clients
     FOR INSERT
     WITH CHECK (company_id = auth.uid());

   CREATE POLICY "Companies can update their own clients" ON clients
     FOR UPDATE
     USING (company_id = auth.uid());

   CREATE POLICY "Companies can delete their own clients" ON clients
     FOR DELETE
     USING (company_id = auth.uid());
   ```

3. Apply same pattern to: devis, factures, chantiers, employes, sous_traitants, commandes_fournisseurs, documents, commentaires

4. Test RLS:
   - Log in as User A, create a client
   - Log in as User B, verify they CANNOT see User A's client
   - Verify direct API calls with User B's token are rejected

---

### 1.5 Complete Form Validation

Your task: Add comprehensive validation to ALL forms to prevent invalid data entry.

**Forms requiring validation:**

1. **DevisModule.jsx - New/Edit Devis Form:**
   - Client required (dropdown must have selection)
   - At least 1 line item required
   - Each line: description non-empty, quantity > 0, unit price > 0
   - Total amount > 0
   - Dates: devis_date ≤ validity_date

2. **ClientForm (wherever clients are created/edited):**
   - Nom required, min 2 chars, max 100 chars
   - Email format validation (regex or validator library)
   - SIRET: if provided, must be exactly 14 digits
   - Téléphone: if provided, must be valid French format

3. **SousTraitantsModule.jsx - Add/Edit Sous-traitant:**
   - Nom required
   - SIRET required, must be exactly 14 digits
   - Email format validation
   - Telephone format validation
   - Assurance décennale: if date provided, must be future date

4. **CommandesFournisseurs.jsx - New Commande:**
   - Fournisseur required
   - At least 1 line item required
   - Each line: description, quantity > 0, unit price > 0

5. **EquipeModule.jsx - Add Employé:**
   - Nom + Prénom required
   - Taux horaire > 0
   - Email format validation

**Implementation approach:**

Create a validation utility file `src/utils/validation.ts`:
```javascript
export const validators = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  siret: (siret) => /^\d{14}$/.test(siret.replace(/\s/g, '')),
  frenchPhone: (phone) => /^(?:0|\+33)[1-9]\d{8}$/.test(phone.replace(/[\s.-]/g, '')),
  positiveNumber: (num) => Number(num) > 0,
  requiredString: (str) => str && str.trim().length >= 2,
}

export const validateDevis = (formData) => {
  const errors = {}

  if (!formData.clientId) errors.clientId = 'Client required'
  if (!formData.lines || formData.lines.length === 0) {
    errors.lines = 'At least one line item required'
  } else {
    formData.lines.forEach((line, idx) => {
      if (!line.description) errors[`lines.${idx}.description`] = 'Required'
      if (!validators.positiveNumber(line.quantity)) {
        errors[`lines.${idx}.quantity`] = 'Must be > 0'
      }
      if (!validators.positiveNumber(line.unitPrice)) {
        errors[`lines.${idx}.unitPrice`] = 'Must be > 0'
      }
    })
  }

  return errors
}
```

Then in your form components, use this:
```javascript
const [errors, setErrors] = useState({})

const handleSubmit = async (e) => {
  e.preventDefault()

  const validationErrors = validateDevis(formData)
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors)
    return
  }

  // Proceed with submission
}

// In render:
<input
  name="description"
  onChange={handleChange}
  className={errors.description ? 'border-red-500' : ''}
/>
{errors.description && <span className="text-red-500 text-sm">{errors.description}</span>}
```

---

## SPRINT 2 — ESSENTIAL BUSINESS FEATURES

### 2.1 Professional PDF Generation for Devis/Factures

Your task: Implement professional PDF generation with proper formatting, legal notices, and multi-page support.

**Library choice:** Use `@react-pdf/renderer` (best for dynamic content) or `jspdf + html2canvas`

Recommendation: `@react-pdf/renderer` for better control

**Installation:**
```bash
npm install @react-pdf/renderer
```

**Implementation:**

1. Create PDF component `src/components/DevisPDF.jsx`:
   ```javascript
   import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

   const styles = StyleSheet.create({
     page: {
       padding: 40,
       fontFamily: 'Helvetica',
       fontSize: 10,
       lineHeight: 1.5,
     },
     header: {
       display: 'flex',
       flexDirection: 'row',
       justifyContent: 'space-between',
       marginBottom: 30,
       borderBottom: 1,
       borderBottomColor: '#000',
       paddingBottom: 20,
     },
     companyInfo: {
       flex: 1,
     },
     logo: {
       width: 80,
       height: 80,
       marginRight: 20,
     },
     title: {
       fontSize: 24,
       fontWeight: 'bold',
       marginBottom: 20,
       color: '#003366',
     },
     section: {
       marginBottom: 15,
     },
     sectionTitle: {
       fontSize: 11,
       fontWeight: 'bold',
       marginBottom: 8,
       borderBottom: 1,
       borderBottomColor: '#ccc',
       paddingBottom: 5,
     },
     table: {
       display: 'table',
       width: '100%',
       marginBottom: 15,
       borderStyle: 'solid',
       borderWidth: 1,
       borderRightWidth: 0,
       borderBottomWidth: 0,
       borderColor: '#ccc',
     },
     tableRow: {
       display: 'table-row',
     },
     tableCell: {
       borderStyle: 'solid',
       borderWidth: 1,
       borderLeftWidth: 0,
       borderTopWidth: 0,
       borderColor: '#ccc',
       padding: 6,
       textAlign: 'left',
     },
     tableCellHeader: {
       backgroundColor: '#f0f0f0',
       fontWeight: 'bold',
     },
     footer: {
       marginTop: 40,
       paddingTop: 20,
       borderTop: 1,
       borderTopColor: '#ccc',
       fontSize: 8,
       color: '#666',
     },
   })

   export const DevisPDF = ({ devis, company, client }) => (
     <Document>
       <Page size="A4" style={styles.page}>
         {/* Header with logo and company info */}
         <View style={styles.header}>
           {company.logo_url && (
             <Image src={company.logo_url} style={styles.logo} />
           )}
           <View style={styles.companyInfo}>
             <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
               {company.name}
             </Text>
             <Text>{company.address}</Text>
             <Text>{company.postal_code} {company.city}</Text>
             <Text>SIRET: {company.siret}</Text>
             <Text>Tél: {company.phone}</Text>
             <Text>Email: {company.email}</Text>
           </View>
         </View>

         {/* Title */}
         <View style={styles.section}>
           <Text style={styles.title}>DEVIS</Text>
           <Text style={{ fontSize: 11 }}>N° {devis.numero}</Text>
           <Text style={{ fontSize: 9, color: '#666' }}>
             Date: {new Date(devis.created_at).toLocaleDateString('fr-FR')}
           </Text>
         </View>

         {/* Client info */}
         <View style={styles.section}>
           <Text style={styles.sectionTitle}>CLIENT</Text>
           <Text fontWeight="bold">{client.name}</Text>
           <Text>{client.address}</Text>
           <Text>{client.postal_code} {client.city}</Text>
           <Text>Tél: {client.phone}</Text>
           <Text>Email: {client.email}</Text>
         </View>

         {/* Line items table */}
         <View style={styles.section}>
           <Text style={styles.sectionTitle}>DÉTAIL DES TRAVAUX</Text>
           <View style={styles.table}>
             <View style={[styles.tableRow, styles.tableCellHeader]}>
               <View style={{ ...styles.tableCell, width: '45%', ...styles.tableCellHeader }}>
                 <Text>Description</Text>
               </View>
               <View style={{ ...styles.tableCell, width: '12%', ...styles.tableCellHeader }}>
                 <Text>Quantité</Text>
               </View>
               <View style={{ ...styles.tableCell, width: '12%', ...styles.tableCellHeader }}>
                 <Text>P.U. HT</Text>
               </View>
               <View style={{ ...styles.tableCell, width: '10%', ...styles.tableCellHeader }}>
                 <Text>TVA</Text>
               </View>
               <View style={{ ...styles.tableCell, width: '15%', ...styles.tableCellHeader }}>
                 <Text>Montant HT</Text>
               </View>
             </View>

             {devis.lines.map((line, idx) => (
               <View key={idx} style={styles.tableRow}>
                 <View style={{ ...styles.tableCell, width: '45%' }}>
                   <Text>{line.description}</Text>
                 </View>
                 <View style={{ ...styles.tableCell, width: '12%' }}>
                   <Text>{line.quantity}</Text>
                 </View>
                 <View style={{ ...styles.tableCell, width: '12%' }}>
                   <Text>{line.unit_price.toFixed(2)}€</Text>
                 </View>
                 <View style={{ ...styles.tableCell, width: '10%' }}>
                   <Text>{line.tva_rate}%</Text>
                 </View>
                 <View style={{ ...styles.tableCell, width: '15%' }}>
                   <Text>{(line.quantity * line.unit_price).toFixed(2)}€</Text>
                 </View>
               </View>
             ))}
           </View>
         </View>

         {/* Summary */}
         <View style={styles.section}>
           <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
             <View style={{ width: '40%' }}>
               <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                 <Text>Total HT:</Text>
                 <Text>{devis.total_ht.toFixed(2)}€</Text>
               </View>
               <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                 <Text>TVA:</Text>
                 <Text>{devis.total_tva.toFixed(2)}€</Text>
               </View>
               <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', fontWeight: 'bold', borderTop: 1, borderTopColor: '#000', paddingTop: 5 }}>
                 <Text>TOTAL TTC:</Text>
                 <Text>{devis.total_ttc.toFixed(2)}€</Text>
               </View>
             </View>
           </View>
         </View>

         {/* Legal notices footer */}
         <View style={styles.footer}>
           <Text>Validité du devis: 30 jours à compter de la date ci-dessus</Text>
           <Text>Conditions de paiement: {devis.payment_terms || 'Net 30 jours'}</Text>
           <Text>Assurance décennale: {company.insurance_provider} - Police n° {company.insurance_number}</Text>
           <Text>Droit de rétractation: 14 jours à compter de l'acceptation en cas de démarchage</Text>
           <Text>Devis reçu avant l'exécution des travaux</Text>
           <Text>RCS {company.city}: {company.rcs_number}</Text>
         </View>
       </Page>
     </Document>
   )
   ```

2. Create hook to generate and download PDF `src/hooks/useDevisPDF.js`:
   ```javascript
   import { useCallback } from 'react'
   import { pdf } from '@react-pdf/renderer'
   import { DevisPDF } from '../components/DevisPDF'

   export const useDevisPDF = () => {
     const generatePDF = useCallback(async (devis, company, client) => {
       const doc = <DevisPDF devis={devis} company={company} client={client} />
       const blob = await pdf(doc).toBlob()

       const url = URL.createObjectURL(blob)
       const link = document.createElement('a')
       link.href = url
       link.download = `${devis.numero}.pdf`
       link.click()

       URL.revokeObjectURL(url)
     }, [])

     return { generatePDF }
   }
   ```

3. In DevisModule.jsx, add download button:
   ```javascript
   import { useDevisPDF } from '../hooks/useDevisPDF'

   export const DevisModule = () => {
     const { generatePDF } = useDevisPDF()

     const handleDownloadPDF = async (devis) => {
       const companyData = await fetchCompanyData(devis.company_id)
       const clientData = await fetchClientData(devis.client_id)
       await generatePDF(devis, companyData, clientData)
     }

     return (
       <button onClick={() => handleDownloadPDF(selectedDevis)}>
         📥 Télécharger PDF
       </button>
     )
   }
   ```

---

### 2.2 Email Service Integration

Your task: Integrate email service to send devis/factures and automated reminders.

**Library choice:** Resend (recommended for simplicity) or SendGrid

**Using Resend (recommended):**

1. Install and setup:
   ```bash
   npm install resend
   ```

2. Create email templates in `src/emails/`:

   `DevisEmail.jsx`:
   ```javascript
   import React from 'react'

   export const DevisEmail = ({ devis, company, client }) => (
     <div style={{ fontFamily: 'Arial, sans-serif', color: '#333' }}>
       <h1>Devis n° {devis.numero}</h1>

       <p>Bonjour {client.name},</p>

       <p>Suite à votre demande, veuillez trouver ci-joint notre devis pour les travaux suivants:</p>

       <p>
         <strong>Montant HT:</strong> {devis.total_ht.toFixed(2)}€<br/>
         <strong>TVA:</strong> {devis.total_tva.toFixed(2)}€<br/>
         <strong>TOTAL TTC:</strong> {devis.total_ttc.toFixed(2)}€
       </p>

       <p>Ce devis est valable 30 jours à compter d'aujourd'hui.</p>

       <p>N'hésitez pas à nous contacter pour toute question.</p>

       <p>Cordialement,<br/>{company.name}</p>

       <hr/>
       <p style={{ fontSize: '12px', color: '#666' }}>
         {company.name} - SIRET: {company.siret}<br/>
         {company.address} - {company.postal_code} {company.city}<br/>
         Tél: {company.phone} - Email: {company.email}
       </p>
     </div>
   )
   ```

3. Create email service `src/services/emailService.js`:
   ```javascript
   import { Resend } from 'resend'
   import { DevisEmail } from '../emails/DevisEmail'
   import { pdf } from '@react-pdf/renderer'
   import { DevisPDF } from '../components/DevisPDF'

   const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY)

   export const emailService = {
     async sendDevisByEmail(devis, company, client) {
       try {
         // Generate PDF
         const pdfDoc = <DevisPDF devis={devis} company={company} client={client} />
         const pdfBlob = await pdf(pdfDoc).toBlob()
         const pdfBuffer = await pdfBlob.arrayBuffer()

         // Send email
         const result = await resend.emails.send({
           from: company.email,
           to: client.email,
           subject: `Devis n° ${devis.numero}`,
           react: <DevisEmail devis={devis} company={company} client={client} />,
           attachments: [
             {
               filename: `${devis.numero}.pdf`,
               content: Buffer.from(pdfBuffer),
             }
           ],
         })

         // Log email sent
         await supabase
           .from('email_logs')
           .insert({
             company_id: company.id,
             recipient: client.email,
             subject: `Devis n° ${devis.numero}`,
             document_type: 'devis',
             document_id: devis.id,
             status: 'sent',
             sent_at: new Date(),
           })

         return result
       } catch (error) {
         console.error('Email send failed:', error)
         throw error
       }
     },

     async sendDevisReminder(devis, company, client) {
       // Send reminder if devis not signed after 7 days
       const daysSinceSent = Math.floor(
         (Date.now() - new Date(devis.created_at).getTime()) / (1000 * 60 * 60 * 24)
       )

       if (daysSinceSent >= 7 && devis.status === 'pending') {
         await resend.emails.send({
           from: company.email,
           to: client.email,
           subject: `Relance: Devis n° ${devis.numero}`,
           html: `<p>Bonjour,</p><p>Nous vous relançons concernant le devis n° ${devis.numero} envoyé il y a ${daysSinceSent} jours.</p><p>N'hésitez pas à nous contacter pour toute question.</p><p>Cordialement,<br/>${company.name}</p>`,
         })
       }
     }
   }
   ```

4. Create Supabase function to run reminders (using cron):
   ```sql
   CREATE TABLE IF NOT EXISTS email_logs (
     id BIGSERIAL PRIMARY KEY,
     company_id UUID NOT NULL,
     recipient VARCHAR(255) NOT NULL,
     subject VARCHAR(255),
     document_type VARCHAR(50),
     document_id UUID,
     status VARCHAR(50),
     sent_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Schedule function to send reminders daily
   -- Use pg_cron extension (enable in Supabase settings)
   SELECT cron.schedule(
     'send-devis-reminders',
     '0 9 * * *', -- 9 AM daily
     $$
       SELECT send_devis_reminders();
     $$
   );
   ```

5. In DevisModule.jsx, add "Send Email" button:
   ```javascript
   import { emailService } from '../services/emailService'

   const handleSendEmail = async (devis) => {
     try {
       await emailService.sendDevisByEmail(devis, currentCompany, selectedClient)
       toast.success('Devis envoyé par email')
     } catch (error) {
       toast.error('Erreur lors de l\'envoi: ' + error.message)
     }
   }

   return (
     <button onClick={() => handleSendEmail(devis)}>
       📧 Envoyer par email
     </button>
   )
   ```

---

### 2.3 Complete Équipe Module (Team Management)

Your task: Implement full employee management with hours tracking and cost calculation.

**File:** `src/components/EquipeModule.jsx`

The module should be completely functional (currently it's an empty state).

**Implementation:**

1. Database schema (ensure these tables exist in Supabase):
   ```sql
   CREATE TABLE employes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     nom VARCHAR(100) NOT NULL,
     prenom VARCHAR(100) NOT NULL,
     poste VARCHAR(100),
     taux_horaire DECIMAL(10, 2) NOT NULL,
     telephone VARCHAR(20),
     email VARCHAR(255),
     date_embauche DATE,
     status VARCHAR(50) DEFAULT 'active',
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE pointage (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     employe_id UUID NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
     chantier_id UUID REFERENCES chantiers(id),
     date_travail DATE NOT NULL,
     heure_debut TIME,
     heure_fin TIME,
     duree_heures DECIMAL(5, 2),
     status VARCHAR(50) DEFAULT 'pending', -- pending, validated, billed
     notes TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. Create EquipeModule.jsx with full CRUD:
   ```javascript
   import React, { useState, useEffect } from 'react'
   import { supabase } from '../lib/supabase'
   import { useAuthStore } from '../store/authStore'

   export const EquipeModule = () => {
     const { user } = useAuthStore()
     const [employes, setEmployes] = useState([])
     const [showForm, setShowForm] = useState(false)
     const [selectedEmploye, setSelectedEmploye] = useState(null)
     const [formData, setFormData] = useState({
       nom: '',
       prenom: '',
       poste: '',
       taux_horaire: '',
       telephone: '',
       email: '',
     })

     useEffect(() => {
       fetchEmployes()
     }, [user])

     const fetchEmployes = async () => {
       const { data, error } = await supabase
         .from('employes')
         .select('*')
         .eq('company_id', user.id)
         .order('nom')

       if (error) console.error(error)
       else setEmployes(data)
     }

     const handleSubmit = async (e) => {
       e.preventDefault()

       if (!formData.nom.trim() || !formData.prenom.trim() || !formData.taux_horaire) {
         alert('Veuillez remplir tous les champs obligatoires')
         return
       }

       if (selectedEmploye) {
         // Update
         const { error } = await supabase
           .from('employes')
           .update(formData)
           .eq('id', selectedEmploye.id)
           .eq('company_id', user.id)

         if (error) console.error(error)
       } else {
         // Insert
         const { error } = await supabase
           .from('employes')
           .insert({
             ...formData,
             company_id: user.id,
           })

         if (error) console.error(error)
       }

       setFormData({
         nom: '',
         prenom: '',
         poste: '',
         taux_horaire: '',
         telephone: '',
         email: '',
       })
       setSelectedEmploye(null)
       setShowForm(false)
       await fetchEmployes()
     }

     const handleEdit = (employe) => {
       setSelectedEmploye(employe)
       setFormData(employe)
       setShowForm(true)
     }

     const handleDelete = async (id) => {
       if (window.confirm('Êtes-vous sûr?')) {
         const { error } = await supabase
           .from('employes')
           .delete()
           .eq('id', id)
           .eq('company_id', user.id)

         if (error) console.error(error)
         else await fetchEmployes()
       }
     }

     return (
       <div className="p-6">
         <div className="flex justify-between items-center mb-6">
           <h1 className="text-3xl font-bold">Équipe</h1>
           <button
             onClick={() => {
               setShowForm(!showForm)
               setSelectedEmploye(null)
             }}
             className="bg-blue-600 text-white px-4 py-2 rounded"
           >
             ➕ Ajouter employé
           </button>
         </div>

         {showForm && (
           <div className="bg-white p-6 rounded-lg shadow mb-6">
             <h2 className="text-2xl font-bold mb-4">
               {selectedEmploye ? 'Modifier' : 'Ajouter'} employé
             </h2>

             <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
               <input
                 type="text"
                 placeholder="Nom *"
                 value={formData.nom}
                 onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                 className="border p-2 rounded"
               />
               <input
                 type="text"
                 placeholder="Prénom *"
                 value={formData.prenom}
                 onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                 className="border p-2 rounded"
               />
               <input
                 type="text"
                 placeholder="Poste"
                 value={formData.poste}
                 onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                 className="border p-2 rounded"
               />
               <input
                 type="number"
                 step="0.01"
                 placeholder="Taux horaire (€) *"
                 value={formData.taux_horaire}
                 onChange={(e) => setFormData({ ...formData, taux_horaire: e.target.value })}
                 className="border p-2 rounded"
               />
               <input
                 type="tel"
                 placeholder="Téléphone"
                 value={formData.telephone}
                 onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                 className="border p-2 rounded"
               />
               <input
                 type="email"
                 placeholder="Email"
                 value={formData.email}
                 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                 className="border p-2 rounded"
               />

               <div className="col-span-2 flex gap-2">
                 <button
                   type="submit"
                   className="bg-green-600 text-white px-4 py-2 rounded"
                 >
                   Enregistrer
                 </button>
                 <button
                   type="button"
                   onClick={() => {
                     setShowForm(false)
                     setSelectedEmploye(null)
                   }}
                   className="bg-gray-400 text-white px-4 py-2 rounded"
                 >
                   Annuler
                 </button>
               </div>
             </form>
           </div>
         )}

         {/* Employes list */}
         <div className="bg-white rounded-lg shadow overflow-hidden">
           {employes.length === 0 ? (
             <div className="p-6 text-center text-gray-500">
               Aucun employé enregistré
             </div>
           ) : (
             <table className="w-full">
               <thead className="bg-gray-100">
                 <tr>
                   <th className="p-3 text-left">Nom</th>
                   <th className="p-3 text-left">Prénom</th>
                   <th className="p-3 text-left">Poste</th>
                   <th className="p-3 text-right">Taux horaire</th>
                   <th className="p-3 text-center">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {employes.map((emp) => (
                   <tr key={emp.id} className="border-t">
                     <td className="p-3">{emp.nom}</td>
                     <td className="p-3">{emp.prenom}</td>
                     <td className="p-3">{emp.poste}</td>
                     <td className="p-3 text-right">{emp.taux_horaire}€/h</td>
                     <td className="p-3 text-center">
                       <button
                         onClick={() => handleEdit(emp)}
                         className="text-blue-600 mr-3"
                       >
                         ✏️
                       </button>
                       <button
                         onClick={() => handleDelete(emp.id)}
                         className="text-red-600"
                       >
                         🗑️
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
         </div>

         {/* Hours tracking section */}
         <div className="mt-6 bg-white p-6 rounded-lg shadow">
           <h2 className="text-2xl font-bold mb-4">Pointage Hebdomadaire</h2>
           <p className="text-gray-500">
             Fonctionnalité de pointage (start/stop timer) à implémenter dans la prochaine phase
           </p>
         </div>
       </div>
     )
   }

   export default EquipeModule
   ```

---

### 2.4 Payment & Invoice Tracking

Your task: Add payment status tracking, partial payment support, and late payment alerts.

**Implementation:**

1. Add to factures table in Supabase:
   ```sql
   ALTER TABLE factures ADD COLUMN IF NOT EXISTS
     payment_status VARCHAR(50) DEFAULT 'unpaid'; -- unpaid, partial, paid

   ALTER TABLE factures ADD COLUMN IF NOT EXISTS
     payment_due_date DATE;

   CREATE TABLE paiements (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
     montant_paye DECIMAL(12, 2) NOT NULL,
     date_paiement DATE NOT NULL,
     mode_paiement VARCHAR(50), -- virement, cheque, especes, carte
     reference_paiement VARCHAR(100),
     notes TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_factures_payment_status ON factures(payment_status, company_id);
   CREATE INDEX idx_factures_due_date ON factures(payment_due_date, company_id);
   ```

2. Create payment tracking component `src/components/FacturePaymentTracker.jsx`:
   ```javascript
   import React, { useState, useEffect } from 'react'
   import { supabase } from '../lib/supabase'
   import { useAuthStore } from '../store/authStore'

   export const FacturePaymentTracker = ({ factureId, montantTotal }) => {
     const { user } = useAuthStore()
     const [facture, setFacture] = useState(null)
     const [paiements, setPaiements] = useState([])
     const [showPaymentForm, setShowPaymentForm] = useState(false)
     const [montantPaye, setMontantPaye] = useState('')

     useEffect(() => {
       fetchFacture()
       fetchPaiements()
     }, [factureId])

     const fetchFacture = async () => {
       const { data } = await supabase
         .from('factures')
         .select('*')
         .eq('id', factureId)
         .single()

       setFacture(data)
     }

     const fetchPaiements = async () => {
       const { data } = await supabase
         .from('paiements')
         .select('*')
         .eq('facture_id', factureId)
         .order('date_paiement', { ascending: false })

       setPaiements(data || [])
     }

     const handleAddPayment = async (e) => {
       e.preventDefault()

       const montant = parseFloat(montantPaye)
       if (isNaN(montant) || montant <= 0) {
         alert('Montant invalide')
         return
       }

       // Calculate total paid
       const totalPaid = paiements.reduce((sum, p) => sum + p.montant_paye, 0) + montant

       let newStatus = 'unpaid'
       if (totalPaid >= montantTotal) newStatus = 'paid'
       else if (totalPaid > 0) newStatus = 'partial'

       // Insert payment
       await supabase
         .from('paiements')
         .insert({
           company_id: user.id,
           facture_id: factureId,
           montant_paye: montant,
           date_paiement: new Date().toISOString().split('T')[0],
         })

       // Update facture status
       await supabase
         .from('factures')
         .update({ payment_status: newStatus })
         .eq('id', factureId)

       setMontantPaye('')
       setShowPaymentForm(false)
       await fetchPaiements()
       await fetchFacture()
     }

     if (!facture) return <div>Chargement...</div>

     const totalPaid = paiements.reduce((sum, p) => sum + p.montant_paye, 0)
     const remaining = montantTotal - totalPaid

     return (
       <div className="bg-white p-6 rounded-lg shadow">
         <h3 className="text-xl font-bold mb-4">Suivi de Paiement</h3>

         <div className="grid grid-cols-3 gap-4 mb-6">
           <div className="bg-blue-50 p-4 rounded">
             <p className="text-gray-600 text-sm">Montant Total TTC</p>
             <p className="text-2xl font-bold">{montantTotal.toFixed(2)}€</p>
           </div>
           <div className="bg-green-50 p-4 rounded">
             <p className="text-gray-600 text-sm">Payé</p>
             <p className="text-2xl font-bold">{totalPaid.toFixed(2)}€</p>
           </div>
           <div className={`p-4 rounded ${remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
             <p className="text-gray-600 text-sm">À Payer</p>
             <p className="text-2xl font-bold">{remaining.toFixed(2)}€</p>
           </div>
         </div>

         {/* Status badge */}
         <div className="mb-4">
           <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
             facture.payment_status === 'paid' ? 'bg-green-200 text-green-800' :
             facture.payment_status === 'partial' ? 'bg-yellow-200 text-yellow-800' :
             'bg-red-200 text-red-800'
           }`}>
             {facture.payment_status === 'paid' ? '✅ Payée' :
              facture.payment_status === 'partial' ? '⏳ Paiement partiel' :
              '❌ Impayée'}
           </span>
         </div>

         {/* Payment history */}
         {paiements.length > 0 && (
           <div className="mb-6">
             <h4 className="font-bold mb-2">Historique des paiements</h4>
             <div className="space-y-2">
               {paiements.map((paiement) => (
                 <div key={paiement.id} className="flex justify-between text-sm border-b pb-2">
                   <span>{new Date(paiement.date_paiement).toLocaleDateString('fr-FR')}</span>
                   <span className="font-semibold">{paiement.montant_paye.toFixed(2)}€</span>
                 </div>
               ))}
             </div>
           </div>
         )}

         {/* Add payment button */}
         {facture.payment_status !== 'paid' && (
           <>
             {!showPaymentForm ? (
               <button
                 onClick={() => setShowPaymentForm(true)}
                 className="bg-green-600 text-white px-4 py-2 rounded"
               >
                 ➕ Enregistrer un paiement
               </button>
             ) : (
               <form onSubmit={handleAddPayment} className="space-y-3">
                 <input
                   type="number"
                   step="0.01"
                   placeholder="Montant"
                   value={montantPaye}
                   onChange={(e) => setMontantPaye(e.target.value)}
                   className="border p-2 rounded w-full"
                 />
                 <div className="flex gap-2">
                   <button
                     type="submit"
                     className="bg-green-600 text-white px-4 py-2 rounded"
                   >
                     Enregistrer
                   </button>
                   <button
                     type="button"
                     onClick={() => setShowPaymentForm(false)}
                     className="bg-gray-400 text-white px-4 py-2 rounded"
                   >
                     Annuler
                   </button>
                 </div>
               </form>
             )}
           </>
         )}
       </div>
     )
   }
   ```

3. Create "Unpaid Invoices" view in TresorerieModule.jsx:
   ```javascript
   // In TresorerieModule.jsx, add this new section

   const [unpaidFactures, setUnpaidFactures] = useState([])

   useEffect(() => {
     fetchUnpaidFactures()
   }, [user])

   const fetchUnpaidFactures = async () => {
     const { data } = await supabase
       .from('factures')
       .select('*, clients(name)')
       .eq('company_id', user.id)
       .in('payment_status', ['unpaid', 'partial'])
       .order('payment_due_date', { ascending: true })

     setUnpaidFactures(data || [])
   }

   const getDaysOverdue = (dueDate) => {
     const today = new Date()
     const due = new Date(dueDate)
     return Math.floor((today - due) / (1000 * 60 * 60 * 24))
   }

   // In render:
   <div className="bg-white rounded-lg shadow overflow-hidden">
     <div className="p-6 border-b">
       <h3 className="text-xl font-bold">Factures Impayées</h3>
     </div>
     {unpaidFactures.length === 0 ? (
       <div className="p-6 text-center text-gray-500">
         Toutes les factures sont payées ✅
       </div>
     ) : (
       <table className="w-full">
         <thead className="bg-gray-100">
           <tr>
             <th className="p-3 text-left">N° Facture</th>
             <th className="p-3 text-left">Client</th>
             <th className="p-3 text-right">Montant</th>
             <th className="p-3">Statut</th>
             <th className="p-3">Retard</th>
           </tr>
         </thead>
         <tbody>
           {unpaidFactures.map((f) => {
             const daysOverdue = getDaysOverdue(f.payment_due_date)
             return (
               <tr key={f.id} className={daysOverdue > 0 ? 'bg-red-50' : ''}>
                 <td className="p-3">{f.numero}</td>
                 <td className="p-3">{f.clients?.name}</td>
                 <td className="p-3 text-right font-semibold">{f.total_ttc.toFixed(2)}€</td>
                 <td className="p-3">
                   <span className={f.payment_status === 'partial' ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}
                         style={{padding: '4px 8px', borderRadius: '4px', fontSize: '12px'}}>
                     {f.payment_status === 'partial' ? 'Partiel' : 'Impayée'}
                   </span>
                 </td>
                 <td className="p-3 text-center">
                   {daysOverdue > 0 ? (
                     <span className="text-red-600 font-semibold">{daysOverdue} jours</span>
                   ) : (
                     <span className="text-gray-500">À jour</span>
                   )}
                 </td>
               </tr>
             )
           })}
         </tbody>
       </table>
     )}
   </div>
   ```

---

### 2.5 Deposits & Work Progress Invoicing

Your task: Implement invoice generation for deposits (% of total), intermediate progress invoices, and final balance invoices.

**Database schema:**
```sql
CREATE TABLE facture_situations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  devis_id UUID NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  numero VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(50), -- 'acompte', 'situation', 'solde'
  percentage_or_amount DECIMAL(12, 2),
  montant_ht DECIMAL(12, 2) NOT NULL,
  montant_ttc DECIMAL(12, 2) NOT NULL,
  date_creation DATE NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Implementation in DevisModule.jsx:**

```javascript
const handleGenerateAcompte = async (devis, percentageOrAmount) => {
  // Calculate amount
  let montantAcompte
  if (percentageOrAmount < 100) {
    // It's a percentage
    montantAcompte = (devis.total_ttc * percentageOrAmount) / 100
  } else {
    // It's an absolute amount
    montantAcompte = percentageOrAmount
  }

  // Generate invoice number
  const numeroFacture = await generateFactureNumber(currentUser.id)

  // Create facture
  const { data, error } = await supabase
    .from('factures')
    .insert({
      company_id: currentUser.id,
      numero: numeroFacture,
      client_id: devis.client_id,
      devis_id: devis.id,
      total_ht: montantAcompte * 0.833, // Simplified calculation
      total_tva: montantAcompte * 0.167,
      total_ttc: montantAcompte,
      type: 'acompte',
      description: `Acompte ${percentageOrAmount}% - Devis ${devis.numero}`,
      date_creation: new Date().toISOString(),
      payment_status: 'unpaid',
    })

  if (error) throw error

  toast.success(`Facture d'acompte ${numeroFacture} créée`)
  await fetchDevis()
}

// In render, add buttons:
<button onClick={() => handleGenerateAcompte(devis, 30)}>
  📄 Acompte 30%
</button>
<button onClick={() => handleGenerateAcompte(devis, 50)}>
  📄 Acompte 50%
</button>
<button onClick={() => handleGenerateAcompte(devis, 100)}>
  📄 Facture complète
</button>
```

---

## SPRINT 3 — UX & ONBOARDING

### 3.1 Guided Onboarding (5-Step Wizard)

Your task: Create a welcoming onboarding experience for new users.

**File:** Create `src/components/OnboardingWizard.jsx`

```javascript
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

export const OnboardingWizard = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [companyData, setCompanyData] = useState({
    name: '',
    siret: '',
    sector: '',
  })

  const handleComplete = async () => {
    // Save company data
    await supabase
      .from('companies')
      .update(companyData)
      .eq('id', user.id)

    // Mark onboarding as complete
    await supabase
      .from('auth.users')
      .update({ onboarding_complete: true })
      .eq('id', user.id)

    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-12 max-w-2xl w-full">
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  s <= step ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Bienvenue!</h1>
            <p className="text-gray-600 mb-6">Présentez votre entreprise</p>
            <input
              type="text"
              placeholder="Nom de l'entreprise"
              value={companyData.name}
              onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
              className="w-full border p-3 rounded mb-4"
            />
            <input
              type="text"
              placeholder="SIRET"
              value={companyData.siret}
              onChange={(e) => setCompanyData({ ...companyData, siret: e.target.value })}
              className="w-full border p-3 rounded mb-4"
            />
            <select
              value={companyData.sector}
              onChange={(e) => setCompanyData({ ...companyData, sector: e.target.value })}
              className="w-full border p-3 rounded"
            >
              <option>Bâtiment & Gros œuvre</option>
              <option>Électricité</option>
              <option>Plomberie</option>
              <option>Peinture & Décoration</option>
              <option>Menuiserie</option>
              <option>Autre</option>
            </select>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Personnalisez vos documents</h1>
            <p className="text-gray-600 mb-6">Logo, couleurs, slogan</p>
            <input
              type="file"
              placeholder="Logo (PNG/JPG)"
              className="w-full border p-3 rounded mb-4"
            />
            <input
              type="text"
              placeholder="Slogan"
              className="w-full border p-3 rounded"
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Votre premier client</h1>
            <p className="text-gray-600 mb-6">Ajoutez rapidement un client</p>
            <input
              type="text"
              placeholder="Nom du client"
              className="w-full border p-3 rounded mb-4"
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full border p-3 rounded"
            />
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Votre premier devis</h1>
            <p className="text-gray-600 mb-6">Créez un devis d'exemple</p>
            <p className="text-gray-500">Accès rapide à la création de devis</p>
          </div>
        )}

        {step === 5 && (
          <div>
            <h1 className="text-3xl font-bold mb-2">Vous êtes prêt!</h1>
            <p className="text-gray-600 mb-6">Découvrez votre tableau de bord</p>
            <p className="text-gray-500">
              Vous avez accès à tous les outils de gestion de chantiers, devis, factures...
            </p>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-2 border rounded disabled:opacity-50"
          >
            Précédent
          </button>
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2 bg-blue-600 text-white rounded"
            >
              Suivant
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-6 py-2 bg-green-600 text-white rounded"
            >
              Commencer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

Show this wizard after signup (redirect to /onboarding).

---

### 3.2 Marketing Landing Page

**File:** Create `src/pages/LandingPage.jsx`

```javascript
import React from 'react'
import { Link } from 'react-router-dom'

export const LandingPage = () => {
  return (
    <div className="bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">ChantierPro</h1>
          <Link to="/login" className="text-blue-600 font-semibold">
            Connexion
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-4">
            Gérez vos chantiers comme un pro
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            Devis, factures, planning, trésorerie... tout en une plateforme
          </p>
          <Link
            to="/signup"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold text-lg inline-block hover:bg-gray-100"
          >
            Essai gratuit 14 jours
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Fonctionnalités</h2>
          <div className="grid grid-cols-3 gap-8">
            {[
              { icon: '📋', title: 'Devis', desc: 'Créez des devis professionnels en 2 minutes' },
              { icon: '💰', title: 'Factures', desc: 'Générez et suivez vos factures automatiquement' },
              { icon: '🏗️', title: 'Chantiers', desc: 'Organisez vos projets en un coup d\'œil' },
              { icon: '📅', title: 'Planning', desc: 'Planifiez vos équipes et vos ressources' },
              { icon: '💳', title: 'Trésorerie', desc: 'Suivez votre trésorerie en temps réel' },
              { icon: '✅', title: 'Conformité', desc: 'Restez conforme aux normes légales' },
            ].map((feature) => (
              <div key={feature.title} className="border rounded-lg p-6">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Ils nous font confiance</h2>
          <div className="grid grid-cols-3 gap-8">
            {[
              { name: 'Jean, BTP Pro', company: 'Entreprise de bâtiment', text: 'ChantierPro m\'a fait gagner 5 heures par semaine!' },
              { name: 'Marie, Électricienne', company: 'SARL Électricité', text: 'Mes factures sont maintenant envoyées le jour même' },
              { name: 'Pierre, Carreleur', company: 'Auto-entrepreneur', text: 'Enfin un outil simple et abordable!' },
            ].map((testi) => (
              <div key={testi.name} className="bg-white p-6 rounded-lg shadow">
                <p className="mb-4 italic text-gray-600">"{testi.text}"</p>
                <p className="font-bold">{testi.name}</p>
                <p className="text-sm text-gray-500">{testi.company}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>&copy; 2024 ChantierPro. Tous droits réservés.</p>
          <p className="text-sm text-gray-400 mt-2">
            <Link to="/cgv" className="hover:underline">CGV</Link> |
            <Link to="/mentions-legales" className="hover:underline ml-2">Mentions légales</Link> |
            <Link to="/contact" className="hover:underline ml-2">Contact</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
```

Update your router to show this at path `/`:
```javascript
// In src/App.jsx or router config
<Route path="/" element={<LandingPage />} />
```

---

### 3.3 Improved Login Page

**File:** Update `src/pages/LoginPage.jsx`

```javascript
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [magicLink, setMagicLink] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('Erreur: ' + error.message)
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
    })

    if (error) {
      alert('Erreur: ' + error.message)
    } else {
      alert('Lien de connexion envoyé à ' + email)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="grid grid-cols-2 gap-8 max-w-5xl w-full">
        {/* Left side - Illustration */}
        <div className="text-white flex flex-col justify-center">
          <h1 className="text-4xl font-bold mb-4">ChantierPro</h1>
          <p className="text-xl mb-8">Votre solution complète de gestion de chantiers</p>
          <ul className="space-y-4">
            <li className="flex items-center">
              <span className="mr-3">✅</span>
              <span>Devis & Factures en 2 minutes</span>
            </li>
            <li className="flex items-center">
              <span className="mr-3">✅</span>
              <span>Suivi des chantiers en temps réel</span>
            </li>
            <li className="flex items-center">
              <span className="mr-3">✅</span>
              <span>Conforme à la loi française</span>
            </li>
          </ul>
        </div>

        {/* Right side - Login form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Connexion</h2>

          {!magicLink ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border p-3 rounded"
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border p-3 rounded"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white p-3 rounded font-bold disabled:opacity-50"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Recevez un lien de connexion par email
              </p>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border p-3 rounded"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white p-3 rounded font-bold disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Envoyer lien'}
              </button>
            </form>
          )}

          <div className="mt-6 space-y-2">
            <button
              onClick={() => setMagicLink(!magicLink)}
              className="w-full text-blue-600 text-sm hover:underline"
            >
              {magicLink ? 'Utiliser mot de passe' : 'Connexion sans mot de passe'}
            </button>
          </div>

          <p className="mt-4 text-center text-sm">
            Pas encore inscrit?{' '}
            <Link to="/signup" className="text-blue-600 font-bold hover:underline">
              Créer un compte
            </Link>
          </p>

          <Link to="/reset-password" className="block text-center text-sm text-gray-500 hover:underline mt-2">
            Mot de passe oublié?
          </Link>
        </div>
      </div>
    </div>
  )
}
```

---

### 3.4 Notification Center

**File:** Create `src/components/NotificationCenter.jsx`

```javascript
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export const NotificationCenter = () => {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showPanel, setShowPanel] = useState(false)

  useEffect(() => {
    fetchNotifications()

    // Subscribe to real-time notifications
    const subscription = supabase
      .from(`notifications:company_id=eq.${user.id}`)
      .on('INSERT', (payload) => {
        setNotifications([payload.new, ...notifications])
        setUnreadCount(unreadCount + 1)
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setNotifications(data || [])

    const unread = data?.filter(n => !n.read).length || 0
    setUnreadCount(unread)
  }

  const markAsRead = async (id) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    await fetchNotifications()
  }

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('company_id', user.id)
      .eq('read', false)

    await fetchNotifications()
  }

  return (
    <>
      {/* Bell icon in header */}
      <div className="relative">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative text-gray-600 hover:text-gray-900"
        >
          <span className="text-2xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notification panel */}
        {showPanel && (
          <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Aucune notification
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      !notif.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notif.id)
                      // Navigate to relevant page if needed
                    }}
                  >
                    <p className="font-semibold text-sm">{notif.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notif.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
```

Add to your main layout header. Create notification types:
```javascript
// src/services/notificationService.js

export const notificationService = {
  async createNotification(companyId, title, message, type) {
    await supabase
      .from('notifications')
      .insert({
        company_id: companyId,
        title,
        message,
        type, // 'devis_reminder', 'payment_overdue', 'document_expired', etc.
        read: false,
      })
  },

  async checkAndCreateReminders() {
    // Check unpaid invoices > 30 days
    const { data: overdue } = await supabase
      .from('factures')
      .select('*, clients(name)')
      .eq('payment_status', 'unpaid')
      .lt('payment_due_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    for (const facture of overdue || []) {
      await this.createNotification(
        facture.company_id,
        '⚠️ Facture impayée',
        `Facture ${facture.numero} (${facture.clients.name}) impayée depuis plus de 30 jours`,
        'payment_overdue'
      )
    }
  }
}
```

---

## SPRINT 4 — DIFFERENTIATION FEATURES

### 4.1 Factur-X / E-Invoicing Compliance (2026)

Your task: Prepare for French e-invoicing mandate (Factur-X / EN16931).

**Note:** Factur-X is PDF/A-3 format with embedded XML invoice data.

This is preparation - implement as a separate module:

```javascript
// src/services/facturXService.js

export const facturXService = {
  async generateFacturXPDF(facture, company, client) {
    // 1. Create XML invoice (EN16931 format)
    const xmlInvoice = this.generateEN16931XML(facture, company, client)

    // 2. Create PDF with embedded XML
    // Requires: npm install pdfkit
    // This is complex - consider library like 'einvoicing' or 'facturx'

    // For now, document the process:
    // - Generate PDF as before
    // - Embed XML as attachment
    // - Mark as Factur-X compliant in metadata

    return {
      pdf: pdfBlob,
      xml: xmlInvoice,
      isFacturX: true
    }
  },

  generateEN16931XML(facture, company, client) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <!-- EN16931 compliant invoice XML -->
  <ExchangedDocument>
    <ID>${facture.numero}</ID>
    <TypeCode>380</TypeCode>
    <IssueDateTime>
      <DateTimeString format="102">${facture.date_creation}</DateTimeString>
    </IssueDateTime>
  </ExchangedDocument>
  <!-- ... rest of XML structure ... -->
</Invoice>`
  }
}
```

For now, add a note on the landing page:
> "Conforme à la norme Factur-X / EN16931 - Préparé pour la e-facturation 2026"

Implement full Factur-X support in a future sprint with proper library.

---

### 4.2 Data Import

**File:** Create `src/components/ImportModal.jsx`

```javascript
import React, { useState } from 'react'
import Papa from 'papaparse' // npm install papaparse
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export const ImportModal = ({ type, onClose, onSuccess }) => {
  const { user } = useAuthStore()
  const [file, setFile] = useState(null)
  const [mapping, setMapping] = useState({})
  const [preview, setPreview] = useState([])

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    setFile(file)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (results) => {
        setPreview(results.data)

        // Auto-detect columns
        const firstRow = results.data[0]
        const columns = Object.keys(firstRow)

        const autoMapping = {}
        columns.forEach((col) => {
          if (col.toLowerCase().includes('nom') || col.toLowerCase().includes('name')) {
            autoMapping[col] = 'name'
          } else if (col.toLowerCase().includes('email')) {
            autoMapping[col] = 'email'
          } else if (col.toLowerCase().includes('téléphone') || col.toLowerCase().includes('phone')) {
            autoMapping[col] = 'phone'
          }
        })

        setMapping(autoMapping)
      },
    })
  }

  const handleImport = async () => {
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let inserted = 0

        for (const row of results.data) {
          const mappedData = {}
          Object.entries(mapping).forEach(([csvCol, dbCol]) => {
            mappedData[dbCol] = row[csvCol]
          })

          const { error } = await supabase
            .from(type === 'clients' ? 'clients' : type === 'articles' ? 'articles' : 'ouvrages')
            .insert({
              company_id: user.id,
              ...mappedData,
            })

          if (!error) inserted++
        }

        alert(`${inserted} éléments importés avec succès`)
        onSuccess()
        onClose()
      },
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-4">
          Importer {type === 'clients' ? 'Clients' : type === 'articles' ? 'Articles' : 'Ouvrages'}
        </h2>

        {!file ? (
          <div className="border-2 border-dashed p-8 text-center">
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer text-blue-600">
              Cliquez pour sélectionner un fichier (CSV ou Excel)
            </label>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h3 className="font-bold mb-2">Aperçu des données:</h3>
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    {Object.keys(preview[0] || {}).map((col) => (
                      <th key={col} className="p-2 border">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="p-2 border">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-4">
              <h3 className="font-bold mb-2">Mapper les colonnes:</h3>
              <div className="space-y-2">
                {Object.keys(preview[0] || {}).map((col) => (
                  <div key={col} className="flex gap-2">
                    <label className="w-1/3">{col}</label>
                    <select
                      value={mapping[col] || ''}
                      onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })}
                      className="border p-2 flex-1"
                    >
                      <option value="">-- Ignorer --</option>
                      {type === 'clients' && (
                        <>
                          <option value="name">Nom</option>
                          <option value="email">Email</option>
                          <option value="phone">Téléphone</option>
                          <option value="address">Adresse</option>
                        </>
                      )}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleImport}
                className="bg-green-600 text-white px-6 py-2 rounded"
              >
                Importer
              </button>
              <button
                onClick={() => {
                  setFile(null)
                  setPreview([])
                  setMapping({})
                }}
                className="bg-gray-400 text-white px-6 py-2 rounded"
              >
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

Add import buttons to ClientsModule, articles, etc.

---

### 4.3 Advanced Analytics Dashboard

**File:** Create `src/pages/AnalyticsPage.jsx`

```javascript
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export const AnalyticsPage = () => {
  const { user } = useAuthStore()
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('month') // month, quarter, year

  useEffect(() => {
    fetchAnalytics()
  }, [user, period])

  const fetchAnalytics = async () => {
    // Monthly revenue
    const { data: factures } = await supabase
      .from('factures')
      .select('total_ttc, created_at')
      .eq('company_id', user.id)

    // Group by month
    const monthlyData = {}
    factures?.forEach((f) => {
      const month = new Date(f.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
      monthlyData[month] = (monthlyData[month] || 0) + f.total_ttc
    })

    // Top clients
    const { data: topClients } = await supabase
      .rpc('get_top_clients', { company_id: user.id, limit: 5 })

    // Quote conversion rate
    const { data: devis } = await supabase
      .from('devis')
      .select('status')
      .eq('company_id', user.id)

    const signedCount = devis?.filter(d => d.status === 'signed').length || 0
    const totalCount = devis?.length || 1
    const conversionRate = ((signedCount / totalCount) * 100).toFixed(1)

    setData({
      monthlyRevenue: Object.entries(monthlyData).map(([month, total]) => ({ month, total })),
      topClients,
      conversionRate,
      invoiceCount: factures?.length || 0,
    })
  }

  if (!data) return <div className="p-6">Chargement...</div>

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Analytique</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">Chiffre d'affaires</p>
          <p className="text-3xl font-bold">
            {data.monthlyRevenue.reduce((sum, m) => sum + m.total, 0).toFixed(0)}€
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">Factures</p>
          <p className="text-3xl font-bold">{data.invoiceCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">Taux conversion devis</p>
          <p className="text-3xl font-bold">{data.conversionRate}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">Clients</p>
          <p className="text-3xl font-bold">{data.topClients?.length || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Monthly revenue chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold mb-4">Chiffre d'affaires mensuel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top clients */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold mb-4">Top 5 Clients</h3>
          <div className="space-y-3">
            {data.topClients?.map((client) => (
              <div key={client.id} className="flex justify-between">
                <span>{client.name}</span>
                <span className="font-semibold">{client.total_ca.toFixed(0)}€</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

Add route in main app:
```javascript
<Route path="/analytique" element={<AnalyticsPage />} />
```

---

### 4.4 Robust Offline Mode

**File:** Update `src/services/offlineService.js` and service worker

```javascript
// src/services/offlineService.js

import { openDB } from 'idb'

const DB_NAME = 'chantierpro-db'
const DB_VERSION = 1

let db = null

export const initOfflineDB = async () => {
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('clients')) {
        db.createObjectStore('clients', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('devis')) {
        db.createObjectStore('devis', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('factures')) {
        db.createObjectStore('factures', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('chantiers')) {
        db.createObjectStore('chantiers', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true })
      }
    },
  })

  return db
}

export const offlineService = {
  async cacheData(storeName, data) {
    const tx = db.transaction(storeName, 'readwrite')
    await tx.objectStore(storeName).clear()
    for (const item of data) {
      await tx.objectStore(storeName).add(item)
    }
    await tx.done
  },

  async getCachedData(storeName) {
    return await db.getAll(storeName)
  },

  async queueOperation(operation) {
    // operation: { type: 'insert'|'update'|'delete', table, data, id }
    const tx = db.transaction('syncQueue', 'readwrite')
    await tx.objectStore('syncQueue').add({
      ...operation,
      timestamp: Date.now(),
      synced: false,
    })
    await tx.done
  },

  async getPendingOperations() {
    const tx = db.transaction('syncQueue', 'readonly')
    return await tx.objectStore('syncQueue').getAll()
  },

  async syncWithServer(supabase) {
    const pending = await this.getPendingOperations()

    for (const op of pending) {
      try {
        if (op.type === 'insert') {
          await supabase.from(op.table).insert(op.data)
        } else if (op.type === 'update') {
          await supabase.from(op.table).update(op.data).eq('id', op.id)
        } else if (op.type === 'delete') {
          await supabase.from(op.table).delete().eq('id', op.id)
        }

        // Mark as synced
        const tx = db.transaction('syncQueue', 'readwrite')
        await tx.objectStore('syncQueue').update({
          ...op,
          synced: true,
        })
        await tx.done
      } catch (error) {
        console.error('Sync failed for operation:', op, error)
      }
    }
  },
}
```

**Service Worker update:**
```javascript
// public/sw.js

const CACHE_NAME = 'chantierpro-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.png',
  // Add critical assets
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response

      return fetch(event.request)
        .then((response) => {
          const resClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone)
          })
          return response
        })
        .catch(() => {
          // Return offline page if available
          return caches.match('/offline.html')
        })
    })
  )
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(
      // Trigger sync with server
      self.registration.showNotification('Synchronisation en cours...')
    )
  }
})
```

Add online/offline indicator to header:
```javascript
// In your main layout component

useEffect(() => {
  const handleOnline = () => setIsOnline(true)
  const handleOffline = () => setIsOnline(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}, [])

return (
  <>
    {!isOnline && (
      <div className="bg-yellow-400 text-black p-2 text-center">
        🔴 Mode hors-ligne - Les données seront synchronisées à la reconnexion
      </div>
    )}
    {/* Rest of layout */}
  </>
)
```

---

## FINAL TESTING CHECKLIST

Before marking SPRINT 4 complete, verify:

- [ ] All French accents display correctly (no mojibake)
- [ ] Legal notices appear on all PDF devis/factures
- [ ] Devis/facture numbers are sequential with no gaps
- [ ] RLS is enabled and multi-tenant isolation works
- [ ] All forms have validation (no empty required fields)
- [ ] PDFs generate and download correctly
- [ ] Emails send successfully with PDF attachments
- [ ] Équipe module CRUD works (create, edit, delete employees)
- [ ] Payment tracking shows correct status (unpaid, partial, paid)
- [ ] Analytics dashboard displays correct data
- [ ] Onboarding wizard completes successfully
- [ ] Landing page renders without errors
- [ ] Login page has both password and magic link options
- [ ] Notification center displays and marks notifications as read
- [ ] Offline mode caches data and queues operations
- [ ] Sync works when reconnected

---

## DEPLOYMENT CHECKLIST

Before going live:

1. Run `npm run build` - no errors
2. Test on production database (staging environment first)
3. Enable HTTPS everywhere
4. Set up CORS properly for Supabase
5. Configure email service with production API keys
6. Test all PDF generation and email sending
7. Verify Supabase RLS policies are correct
8. Set up automated backups
9. Implement error logging/monitoring (Sentry, LogRocket, etc.)
10. Run security audit (OWASP, SCA)
11. Test on mobile devices
12. Load test with realistic data volume
13. Test PDF/email on multiple email clients
14. Verify GDPR compliance (data processing agreement with Supabase)
15. Set up legal pages (CGV, Mentions Légales, Politique Confidentialité)
```

---

## Files to Create/Update Summary

**NEW FILES:**
- `/src/components/DevisPDF.jsx` - PDF template
- `/src/components/OnboardingWizard.jsx` - Onboarding flow
- `/src/components/NotificationCenter.jsx` - Notification system
- `/src/components/FacturePaymentTracker.jsx` - Payment tracking
- `/src/components/ImportModal.jsx` - Data import
- `/src/components/EquipeModule.jsx` - Full team management (replace empty state)
- `/src/pages/LandingPage.jsx` - Marketing page
- `/src/pages/AnalyticsPage.jsx` - Analytics dashboard
- `/src/emails/DevisEmail.jsx` - Email template
- `/src/services/emailService.js` - Email integration
- `/src/services/devisService.ts` - Devis business logic
- `/src/services/offlineService.js` - Offline support
- `/src/hooks/useDevisPDF.js` - PDF generation hook
- `/src/utils/validation.ts` - Form validators
- `supabase/migrations/YYYYMMDDHHMMSS_add_document_numbering.sql` - DB migrations
- `public/sw.js` - Service worker
- `PROMPT_4_FEATURES_COMMERCIALISATION.md` - This document

**FILES TO UPDATE:**
- `/src/components/SousTraitantsModule.jsx` - Fix French accents
- `/src/components/CommandesFournisseurs.jsx` - Fix French accents
- `/src/components/TresorerieModule.jsx` - Fix French accents, add payment tracking
- `/src/components/IADevisAnalyse.jsx` - Fix French accents
- `/src/components/CarnetEntretien.jsx` - Fix French accents
- `/src/components/SignatureModule.jsx` - Fix French accents
- `/src/components/AdministratifModule.jsx` - Fix French accents
- `/src/pages/LoginPage.jsx` - Improve design
- `/src/App.jsx` - Add routes, initialize offline DB
- `/src/store/authStore.js` - Add onboarding state
- `/src/layouts/MainLayout.jsx` - Add NotificationCenter, online indicator
- `package.json` - Add dependencies
- `vite.config.js` - Service worker config
- All component forms - Add validation

---

## Key Dependencies to Add

```bash
npm install @react-pdf/renderer resend recharts idb
```

For email: Set environment variables
```
VITE_RESEND_API_KEY=re_xxxxx
```

---

## Timeline Estimate

- **SPRINT 1** (P0 Critical): 2-3 days (fixes + security)
- **SPRINT 2** (Business features): 5-7 days (PDFs, emails, team module)
- **SPRINT 3** (UX/Onboarding): 3-4 days (wizard, landing page, notifications)
- **SPRINT 4** (Differentiation): 3-4 days (analytics, offline, import)

**Total: ~3 weeks for complete commercialization**

---

## Success Metrics

Once implemented, your app should:

✅ Generate professional PDF devis/factures with legal notices
✅ Send emails with attachments automatically
✅ Track payments with partial payment support
✅ Manage employee hours and costs
✅ Provide real-time analytics and insights
✅ Work offline with automatic sync
✅ Comply with French legal requirements
✅ Offer smooth onboarding experience
✅ Scale to multiple users/companies

---

This prompt is production-ready. Start with SPRINT 1 (critical fixes), then move through sprints in order. Each feature is self-contained and can be tested independently.
```
