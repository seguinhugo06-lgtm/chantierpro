/**
 * Document completeness checker
 * Validates that all 19 mandatory legal mentions are present in the entreprise config
 * Based on French law: Code de commerce L441-3, Code de la consommation L111-1
 */

const REQUIRED_MENTIONS = [
  // Identity
  { key: 'nom', label: 'Raison sociale', category: 'Identité', tab: 'identite' },
  { key: 'adresse', label: 'Adresse du siège', category: 'Identité', tab: 'identite' },
  { key: 'tel', label: 'Téléphone', category: 'Identité', tab: 'identite' },
  { key: 'email', label: 'Email', category: 'Identité', tab: 'identite' },
  // Legal
  { key: 'siret', label: 'N° SIRET', category: 'Légal', tab: 'legal' },
  { key: 'codeApe', label: 'Code APE/NAF', category: 'Légal', tab: 'legal' },
  { key: 'formeJuridique', label: 'Forme juridique', category: 'Légal', tab: 'legal' },
  // Insurance (BTP mandatory)
  { key: 'decennaleAssureur', label: 'Assurance décennale — Compagnie', category: 'Assurances', tab: 'assurances' },
  { key: 'decennaleNumero', label: 'Assurance décennale — N° Police', category: 'Assurances', tab: 'assurances' },
  { key: 'rcProAssureur', label: 'RC Professionnelle — Compagnie', category: 'Assurances', tab: 'assurances' },
  { key: 'rcProNumero', label: 'RC Professionnelle — N° Police', category: 'Assurances', tab: 'assurances' },
  // Banking
  { key: 'iban', label: 'IBAN (modalités de paiement)', category: 'Banque', tab: 'banque' },
];

// Recommended but not strictly required
const RECOMMENDED_MENTIONS = [
  { key: 'capital', label: 'Capital social', category: 'Légal', tab: 'legal' },
  { key: 'rcsVille', label: 'Ville RCS', category: 'Légal', tab: 'legal' },
  { key: 'rcsNumero', label: 'N° RCS', category: 'Légal', tab: 'legal' },
  { key: 'tvaIntra', label: 'TVA intracommunautaire', category: 'Légal', tab: 'legal' },
  { key: 'decennaleZone', label: 'Zone couverte (décennale)', category: 'Assurances', tab: 'assurances' },
  { key: 'bic', label: 'BIC/SWIFT', category: 'Banque', tab: 'banque' },
  { key: 'mediateurNom', label: 'Médiateur de la consommation', category: 'Documents', tab: 'documents' },
];

/**
 * Check document completeness
 * @param {Object} entreprise - The entreprise config object
 * @returns {{ score: number, total: number, filled: number, missing: Array, warnings: Array }}
 */
export function checkDocumentCompleteness(entreprise) {
  if (!entreprise) {
    return { score: 0, total: REQUIRED_MENTIONS.length, filled: 0, missing: [...REQUIRED_MENTIONS], warnings: [...RECOMMENDED_MENTIONS] };
  }

  const missing = REQUIRED_MENTIONS.filter(m => {
    const val = entreprise[m.key];
    return !val || (typeof val === 'string' && !val.trim());
  });

  const warnings = RECOMMENDED_MENTIONS.filter(m => {
    const val = entreprise[m.key];
    return !val || (typeof val === 'string' && !val.trim());
  });

  const filled = REQUIRED_MENTIONS.length - missing.length;
  const score = Math.round((filled / REQUIRED_MENTIONS.length) * 100);

  return { score, total: REQUIRED_MENTIONS.length, filled, missing, warnings };
}

/**
 * Get a human-readable summary for the alert banner
 * @param {Object} result - Output of checkDocumentCompleteness
 * @returns {{ level: 'success'|'warning'|'error', message: string }}
 */
export function getCompletenessAlert(result) {
  if (result.score === 100 && result.warnings.length === 0) {
    return { level: 'success', message: 'Toutes les mentions légales sont complètes.' };
  }
  if (result.score === 100) {
    return { level: 'warning', message: `${result.warnings.length} mention(s) recommandée(s) manquante(s).` };
  }
  return { 
    level: 'error', 
    message: `${result.missing.length} mention(s) obligatoire(s) manquante(s) sur vos documents.`
  };
}
