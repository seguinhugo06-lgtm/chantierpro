/**
 * Legal Compliance Verification System
 * Validates French legal requirements for quotes (devis) and invoices (factures)
 *
 * Sources:
 * - Code de commerce (Art. L441-3)
 * - Code de la consommation (Art. L111-1 à L111-3)
 * - Code général des impôts (Art. 278-0 bis, 279-0 bis)
 * - ANAH - MaPrimeRénov' 2024
 */

import { supabase } from '../supabaseClient';
import legalRules from '../data/legal-rules.json';

// ============ TYPE DEFINITIONS (JSDoc) ============

/**
 * @typedef {'error' | 'warning' | 'info'} Severity
 */

/**
 * @typedef {Object} ComplianceIssue
 * @property {Severity} severity - Issue severity level
 * @property {string} category - Category of the issue
 * @property {string} field - Field name
 * @property {string} message - Human-readable message
 * @property {string} [fix_suggestion] - Suggestion to fix the issue
 * @property {string} [current_value] - Current value
 * @property {string} [expected_format] - Expected format/pattern
 * @property {string} [article] - Legal article reference
 */

/**
 * @typedef {Object} ComplianceWarning
 * @property {Severity} severity - Warning severity
 * @property {string} message - Warning message
 * @property {*} [current_value] - Current value
 * @property {*} [suggested_value] - Suggested value
 * @property {string} [reason] - Reason for warning
 */

/**
 * @typedef {Object} ComplianceSuggestion
 * @property {string} type - Type of suggestion
 * @property {string} message - Suggestion message
 * @property {number} [potential_aide] - Potential aid amount
 * @property {string[]} [actions] - Recommended actions
 */

/**
 * @typedef {Object} MaPrimeRenovCheck
 * @property {boolean} eligible - Whether eligible for MaPrimeRénov
 * @property {string[]} [travaux_eligibles] - Eligible works
 * @property {string} [categorie_revenus] - Revenue category
 * @property {number} [montant_estime] - Estimated aid amount
 * @property {string[]} [documents_requis] - Required documents
 * @property {string[]} [raisons] - Reasons for ineligibility
 */

/**
 * @typedef {Object} TVACheck
 * @property {boolean} correct - Whether current TVA is correct
 * @property {number} suggested_rate - Suggested TVA rate
 * @property {string} reason - Explanation
 * @property {boolean} [attestation_required] - Whether attestation is needed
 * @property {string} [attestation_form] - Form reference
 */

/**
 * @typedef {Object} ComplianceReport
 * @property {string} devis_id - ID of the quote
 * @property {boolean} compliant - Whether fully compliant
 * @property {ComplianceIssue[]} issues - Blocking issues
 * @property {ComplianceWarning[]} warnings - Non-blocking warnings
 * @property {ComplianceSuggestion[]} suggestions - Recommendations
 * @property {MaPrimeRenovCheck} [maprimerenov] - MaPrimeRénov eligibility
 * @property {TVACheck} [tva] - TVA verification result
 * @property {Date} generated_at - Report generation timestamp
 * @property {Object} [metadata] - Additional metadata
 */

// ============ HELPER FUNCTIONS ============

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Source object
 * @param {string} path - Dot-notation path (e.g., 'company.siret')
 * @returns {*} Value at path or undefined
 */
export function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Set nested value in object using dot notation
 * @param {Object} obj - Target object
 * @param {string} path - Dot-notation path
 * @param {*} value - Value to set
 */
export function setNestedValue(obj, path, value) {
  if (!obj || !path) return;

  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) current[part] = {};
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Evaluate a condition string against context
 * @param {string} condition - Condition string
 * @param {Object} context - Context object with values
 * @returns {boolean} Condition result
 */
export function evaluateCondition(condition, context) {
  if (!condition) return true;

  try {
    // Create safe evaluation context
    const safeContext = {
      client: context.client || {},
      company: context.company || {},
      devis: context.devis || {},
      chantier: context.chantier || {},
      travaux_batiment: context.travaux_batiment ?? true,
      vente_hors_etablissement: context.vente_hors_etablissement ?? false,
      type_travaux: context.type_travaux || 'renovation',
      travaux_gros_oeuvre: context.travaux_gros_oeuvre ?? false,
      logement: context.logement || {}
    };

    // Replace context references
    let evalStr = condition;
    for (const [key, value] of Object.entries(safeContext)) {
      if (typeof value === 'object') {
        for (const [subKey, subValue] of Object.entries(value)) {
          const fullKey = `${key}.${subKey}`;
          evalStr = evalStr.replace(
            new RegExp(fullKey.replace('.', '\\.'), 'g'),
            JSON.stringify(subValue)
          );
        }
      }
      evalStr = evalStr.replace(new RegExp(key, 'g'), JSON.stringify(value));
    }

    // Evaluate safely using Function constructor
    // eslint-disable-next-line no-new-func
    return new Function(`return ${evalStr}`)();
  } catch {
    console.warn('Failed to evaluate condition:', condition);
    return true; // Default to true if evaluation fails
  }
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount || 0);
}

/**
 * Validate pattern against value
 * @param {string} pattern - Regex pattern
 * @param {string} value - Value to test
 * @returns {boolean} Whether value matches pattern
 */
export function validatePattern(pattern, value) {
  if (!pattern || !value) return true;
  try {
    return new RegExp(pattern).test(String(value).replace(/\s/g, ''));
  } catch {
    return true;
  }
}

// ============ DEMO DATA ============

const DEMO_DEVIS = {
  id: 'demo-devis-001',
  numero: 'DEV-2024-0042',
  created_at: new Date().toISOString(),
  validite: '30 jours',
  description: 'Travaux de rénovation énergétique - Isolation combles et pompe à chaleur',
  montant_ht: 15000,
  tva: 825,
  tva_rate: 5.5,
  montant_ttc: 15825,
  delai: '3 semaines',
  modalites_paiement: '30% à la commande, 70% à la livraison',
  type_travaux: 'renovation_energetique',
  lignes: [
    { description: 'Isolation des combles perdus - 80m²', quantite: 80, unite: 'm²', prix_unitaire: 45, total_ht: 3600 },
    { description: 'Pompe à chaleur air/eau Atlantic', quantite: 1, unite: 'u', prix_unitaire: 8500, total_ht: 8500 },
    { description: 'Main d\'oeuvre installation', quantite: 24, unite: 'h', prix_unitaire: 45, total_ht: 1080 },
    { description: 'Mise en service et réglages', quantite: 1, unite: 'forfait', prix_unitaire: 820, total_ht: 820 }
  ],
  client: {
    id: 'demo-client-001',
    nom: 'Dupont',
    prenom: 'Jean',
    adresse: '15 Rue des Lilas',
    code_postal: '69001',
    ville: 'Lyon',
    type: 'particulier',
    telephone: '06 12 34 56 78',
    email: 'jean.dupont@email.fr',
    revenus_fiscaux: 35000,
    nb_personnes_foyer: 3,
    logement_anciennete: 25,
    type_logement: 'residence_principale'
  },
  chantier: {
    adresse: '15 Rue des Lilas',
    code_postal: '69001',
    ville: 'Lyon'
  },
  company: {
    id: 'demo-company-001',
    nom: 'Réno Pro Services',
    forme_juridique: 'SARL',
    siret: '12345678901234',
    adresse: '25 Avenue de l\'Industrie',
    code_postal: '69002',
    ville: 'Lyon',
    rcs: 'Lyon B 123 456 789',
    capital: 10000,
    tva_intra: 'FR12345678901',
    telephone: '04 78 12 34 56',
    email: 'contact@renopro.fr',
    assurance_rc_pro: true,
    assurance_rc_numero: 'RC-2024-456789',
    assurance_rc_assureur: 'AXA France',
    assurance_decennale: true,
    assurance_decennale_numero: 'DEC-2024-123456',
    assurance_decennale_assureur: 'SMABTP',
    assurance_decennale_validite: '2025-12-31',
    rge: true,
    rge_numero: 'RGE-E1234567',
    qualibat: true,
    qualibat_numero: 'QB-2024-789',
    assujetti_tva: true,
    mediateur_nom: 'CM2C',
    mediateur_adresse: '14 rue Saint Jean, 75017 Paris',
    mediateur_site: 'www.cm2c.net'
  }
};

// ============ MAIN COMPLIANCE CHECK ============

/**
 * Check legal compliance of a devis
 * @param {string} devisId - ID of the devis to check
 * @param {Object} [options] - Check options
 * @param {boolean} [options.isDemo] - Use demo data
 * @param {boolean} [options.checkMaPrimeRenov] - Check MaPrimeRénov eligibility
 * @param {boolean} [options.checkTVA] - Check TVA rate
 * @returns {Promise<ComplianceReport>} Compliance report
 */
export async function checkDevisCompliance(devisId, options = {}) {
  const { isDemo = false, checkMaPrimeRenov = true, checkTVA = true } = options;

  /** @type {ComplianceReport} */
  const report = {
    devis_id: devisId,
    compliant: true,
    issues: [],
    warnings: [],
    suggestions: [],
    generated_at: new Date(),
    metadata: {}
  };

  // Fetch devis data
  let devis;

  if (isDemo) {
    devis = DEMO_DEVIS;
  } else {
    const { data, error } = await supabase
      .from('devis')
      .select(`
        *,
        client:client_id(*),
        chantier:chantier_id(*),
        user:user_id(
          company:companies(*)
        )
      `)
      .eq('id', devisId)
      .single();

    if (error || !data) {
      report.compliant = false;
      report.issues.push({
        severity: 'error',
        category: 'system',
        field: 'devis_id',
        message: 'Devis introuvable',
        fix_suggestion: 'Vérifiez l\'identifiant du devis'
      });
      return report;
    }

    // Normalize data structure
    devis = {
      ...data,
      client: data.client || {},
      chantier: data.chantier || {},
      company: data.user?.company || {}
    };
  }

  // Store normalized devis in report metadata
  report.metadata.devis = devis;

  // Build context for condition evaluation
  const context = {
    client: devis.client,
    company: devis.company,
    devis: devis,
    chantier: devis.chantier,
    logement: {
      anciennete_annees: devis.client?.logement_anciennete || 0
    },
    travaux_batiment: true,
    vente_hors_etablissement: devis.vente_hors_etablissement ?? false,
    type_travaux: devis.type_travaux || 'renovation',
    travaux_gros_oeuvre: devis.travaux_gros_oeuvre ?? false
  };

  // Check mandatory fields
  const rules = legalRules.mentions_obligatoires_devis;

  for (const [category, fields] of Object.entries(rules)) {
    for (const [fieldName, rule] of Object.entries(fields)) {
      // Skip if condition not met
      if (rule.condition && !evaluateCondition(rule.condition, context)) {
        continue;
      }

      const value = getNestedValue(devis, rule.field);

      // Check required fields
      if (rule.required && !value && value !== 0 && value !== false) {
        report.issues.push({
          severity: 'error',
          category: category,
          field: fieldName,
          message: rule.message_missing || `${rule.label || fieldName} obligatoire manquant`,
          fix_suggestion: `Ajoutez ${rule.label || fieldName} dans les paramètres`,
          article: rule.article
        });
        report.compliant = false;
      }

      // Check pattern if value exists
      if (rule.pattern && value && !validatePattern(rule.pattern, value)) {
        report.issues.push({
          severity: 'error',
          category: category,
          field: fieldName,
          message: rule.message_invalid || `Format ${rule.label || fieldName} invalide`,
          current_value: String(value),
          expected_format: rule.pattern,
          fix_suggestion: rule.message_invalid
        });
        report.compliant = false;
      }

      // Add recommended field warnings
      if (rule.recommended && !value) {
        report.warnings.push({
          severity: 'warning',
          message: rule.message_recommended || `${rule.label || fieldName} recommandé`,
          current_value: null,
          suggested_value: rule.default
        });
      }
    }
  }

  // Check specific mentions
  const specificMentions = legalRules.mentions_specifiques;

  for (const [mentionKey, mention] of Object.entries(specificMentions)) {
    if (mention.required && mention.condition) {
      if (evaluateCondition(mention.condition, context)) {
        // Check if mention text is present (would be in a mentions array or text field)
        const hasMention = devis.mentions?.includes(mentionKey) ||
                          devis.mentions_text?.includes(mention.text?.substring(0, 30));

        if (!hasMention) {
          report.warnings.push({
            severity: 'warning',
            message: `Mention obligatoire manquante: ${mention.label}`,
            suggested_value: mention.text,
            reason: `Article ${mention.article}`
          });
        }
      }
    }
  }

  // Check TVA rate
  if (checkTVA) {
    const tvaCheck = verifyTVARate(devis, context);
    report.tva = tvaCheck;

    if (!tvaCheck.correct) {
      report.warnings.push({
        severity: 'warning',
        message: 'Taux de TVA potentiellement incorrect',
        current_value: `${devis.tva_rate}%`,
        suggested_value: `${tvaCheck.suggested_rate}%`,
        reason: tvaCheck.reason
      });
    }

    if (tvaCheck.attestation_required) {
      report.suggestions.push({
        type: 'tva_attestation',
        message: `Une attestation ${tvaCheck.attestation_form} est requise pour appliquer le taux de ${tvaCheck.suggested_rate}%`,
        actions: [
          'Faire remplir l\'attestation par le client',
          'Conserver l\'attestation avec le devis',
          'Vérifier les conditions d\'application'
        ]
      });
    }
  }

  // Check MaPrimeRénov eligibility
  if (checkMaPrimeRenov) {
    const mprCheck = checkMaPrimeRenovEligibility(devis, context);
    report.maprimerenov = mprCheck;

    if (mprCheck.eligible) {
      report.suggestions.push({
        type: 'maprimerenov',
        message: `Ce client est potentiellement éligible à MaPrimeRénov' (${mprCheck.categorie_revenus})`,
        potential_aide: mprCheck.montant_estime,
        actions: [
          'Vérifier la qualification RGE',
          'Informer le client des aides possibles',
          'Générer un devis conforme RGE',
          'Préparer les documents requis'
        ]
      });
    }
  }

  // Check devis lines
  if (!devis.lignes || devis.lignes.length === 0) {
    report.issues.push({
      severity: 'error',
      category: 'devis',
      field: 'lignes',
      message: 'Le devis doit contenir au moins une ligne de prestation',
      fix_suggestion: 'Ajoutez des lignes détaillant les travaux'
    });
    report.compliant = false;
  } else {
    // Check each line has required fields
    devis.lignes.forEach((ligne, index) => {
      if (!ligne.description) {
        report.issues.push({
          severity: 'error',
          category: 'devis',
          field: `lignes[${index}].description`,
          message: `Ligne ${index + 1}: description manquante`
        });
        report.compliant = false;
      }
      if (ligne.prix_unitaire === undefined || ligne.prix_unitaire === null) {
        report.issues.push({
          severity: 'error',
          category: 'devis',
          field: `lignes[${index}].prix_unitaire`,
          message: `Ligne ${index + 1}: prix unitaire manquant`
        });
        report.compliant = false;
      }
      if (!ligne.quantite) {
        report.issues.push({
          severity: 'error',
          category: 'devis',
          field: `lignes[${index}].quantite`,
          message: `Ligne ${index + 1}: quantité manquante`
        });
        report.compliant = false;
      }
    });
  }

  // Verify totals
  const calculatedHT = devis.lignes?.reduce((sum, l) => sum + (l.total_ht || l.prix_unitaire * l.quantite || 0), 0) || 0;
  if (Math.abs(calculatedHT - (devis.montant_ht || 0)) > 0.01) {
    report.warnings.push({
      severity: 'warning',
      message: 'Le total HT ne correspond pas à la somme des lignes',
      current_value: formatCurrency(devis.montant_ht),
      suggested_value: formatCurrency(calculatedHT)
    });
  }

  const calculatedTVA = calculatedHT * ((devis.tva_rate || 20) / 100);
  if (Math.abs(calculatedTVA - (devis.tva || 0)) > 0.01) {
    report.warnings.push({
      severity: 'warning',
      message: 'Le montant de TVA semble incorrect',
      current_value: formatCurrency(devis.tva),
      suggested_value: formatCurrency(calculatedTVA)
    });
  }

  return report;
}

// ============ TVA VERIFICATION ============

/**
 * List of works qualifying for 5.5% VAT rate
 */
const TRAVAUX_RENOVATION_ENERGETIQUE = [
  'isolation', 'isolat',
  'pompe à chaleur', 'pac',
  'chaudière', 'chaudiere',
  'panneaux solaires', 'panneau solaire', 'photovoltaique',
  'vmc double flux',
  'fenêtre', 'fenetre', 'double vitrage', 'triple vitrage',
  'volet isolant',
  'calorifugeage',
  'chauffe-eau solaire', 'chauffe-eau thermodynamique'
];

/**
 * List of works qualifying for 10% VAT rate
 */
const TRAVAUX_AMELIORATION = [
  'peinture', 'carrelage', 'plomberie', 'électricité', 'electricite',
  'menuiserie', 'parquet', 'moquette', 'revêtement', 'revetement',
  'salle de bain', 'cuisine', 'cloison', 'plafond', 'faux-plafond'
];

/**
 * Check if works are energy renovation
 * @param {Array} lignes - Devis lines
 * @returns {boolean}
 */
export function isTravauxRenovationEnergetique(lignes) {
  if (!lignes || !Array.isArray(lignes)) return false;

  return lignes.some(ligne => {
    const desc = (ligne.description || '').toLowerCase();
    return TRAVAUX_RENOVATION_ENERGETIQUE.some(keyword => desc.includes(keyword));
  });
}

/**
 * Check if works are improvement works
 * @param {Array} lignes - Devis lines
 * @returns {boolean}
 */
export function isTravauxAmelioration(lignes) {
  if (!lignes || !Array.isArray(lignes)) return false;

  return lignes.some(ligne => {
    const desc = (ligne.description || '').toLowerCase();
    return TRAVAUX_AMELIORATION.some(keyword => desc.includes(keyword));
  });
}

/**
 * Verify TVA rate is correct for the devis
 * @param {Object} devis - Devis data
 * @param {Object} context - Evaluation context
 * @returns {TVACheck} TVA verification result
 */
export function verifyTVARate(devis, context = {}) {
  const lignes = devis.lignes || [];
  const logementAge = devis.client?.logement_anciennete || context.logement?.anciennete_annees || 0;
  const currentRate = devis.tva_rate || 20;

  // Default: 20%
  let suggested_rate = 20;
  let reason = 'Taux normal (20%)';
  let attestation_required = false;
  let attestation_form = null;

  // Check if housing is older than 2 years
  const logementEligible = logementAge >= 2;

  if (logementEligible) {
    // Check for energy renovation works (5.5%)
    if (isTravauxRenovationEnergetique(lignes)) {
      suggested_rate = 5.5;
      reason = 'Travaux de rénovation énergétique sur logement > 2 ans';
      attestation_required = true;
      attestation_form = 'CERFA 1301-SD (simplifiée) ou 1300-SD (normale)';
    }
    // Check for improvement works (10%)
    else if (isTravauxAmelioration(lignes)) {
      suggested_rate = 10;
      reason = 'Travaux d\'amélioration sur logement > 2 ans';
      attestation_required = true;
      attestation_form = 'CERFA 1301-SD';
    }
  }

  // Special case: DOM-TOM
  const codePostal = devis.chantier?.code_postal || devis.client?.code_postal || '';
  if (['971', '972', '973', '974', '976'].some(prefix => codePostal.startsWith(prefix))) {
    if (suggested_rate === 20) {
      suggested_rate = 8.5;
      reason = 'Taux applicable dans les DOM';
    }
  }

  // Check for construction works (always 20%)
  const isConstruction = lignes.some(l => {
    const desc = (l.description || '').toLowerCase();
    return desc.includes('construction neuve') ||
           desc.includes('extension') ||
           desc.includes('surélévation') ||
           desc.includes('piscine');
  });

  if (isConstruction) {
    suggested_rate = 20;
    reason = 'Travaux de construction neuve - taux normal obligatoire';
    attestation_required = false;
    attestation_form = null;
  }

  return {
    correct: currentRate === suggested_rate,
    suggested_rate,
    reason,
    attestation_required,
    attestation_form,
    current_rate: currentRate
  };
}

// ============ MAPRIMERENOV ELIGIBILITY ============

/**
 * Revenue categories for MaPrimeRénov
 */
export const REVENUE_CATEGORIES = {
  TRES_MODESTES: 'tres_modestes',
  MODESTES: 'modestes',
  INTERMEDIAIRES: 'intermediaires',
  SUPERIEURS: 'superieurs'
};

/**
 * Determine revenue category based on fiscal income
 * @param {number} revenuFiscal - Annual fiscal revenue
 * @param {number} nbPersonnes - Number of people in household
 * @param {boolean} isIDF - Is in Île-de-France
 * @returns {string} Revenue category
 */
export function determineRevenueCategory(revenuFiscal, nbPersonnes, isIDF) {
  const plafonds = legalRules.maprimerenov_eligibility.plafonds_revenus_2024;
  const zone = isIDF ? 'ile_de_france' : 'autres_regions';

  const getPlafond = (category) => {
    const catPlafonds = plafonds[category]?.[zone];
    if (!catPlafonds) return Infinity;

    if (nbPersonnes <= 5) {
      return catPlafonds[String(nbPersonnes)] || Infinity;
    }
    const base = catPlafonds['5'] || 0;
    const perPerson = catPlafonds.par_personne_supplementaire || 0;
    return base + (nbPersonnes - 5) * perPerson;
  };

  for (const category of ['tres_modestes', 'modestes', 'intermediaires']) {
    if (revenuFiscal <= getPlafond(category)) {
      return category;
    }
  }

  return 'superieurs';
}

/**
 * Check if postal code is in Île-de-France
 * @param {string} codePostal - Postal code
 * @returns {boolean}
 */
export function isIleDeFrance(codePostal) {
  if (!codePostal) return false;
  const deptIDF = ['75', '77', '78', '91', '92', '93', '94', '95'];
  return deptIDF.includes(String(codePostal).substring(0, 2));
}

/**
 * Check MaPrimeRénov eligibility for a devis
 * @param {Object} devis - Devis data
 * @param {Object} context - Evaluation context
 * @returns {MaPrimeRenovCheck} Eligibility check result
 */
export function checkMaPrimeRenovEligibility(devis, context = {}) {
  const { client, company, lignes } = devis;

  const failedConditions = [];

  // Check base conditions
  const conditions = {
    type_logement: client?.type_logement === 'residence_principale',
    anciennete: (client?.logement_anciennete || 0) >= 15,
    type_client: client?.type === 'particulier',
    entreprise_rge: company?.rge === true,
    domicile_fiscal: true // Assumed
  };

  // Check all conditions
  if (!conditions.type_logement) {
    failedConditions.push('Le logement doit être la résidence principale');
  }
  if (!conditions.anciennete) {
    failedConditions.push('Le logement doit avoir plus de 15 ans');
  }
  if (!conditions.type_client) {
    failedConditions.push('Réservé aux particuliers');
  }
  if (!conditions.entreprise_rge) {
    failedConditions.push('L\'entreprise doit être certifiée RGE');
  }

  if (failedConditions.length > 0) {
    return {
      eligible: false,
      raisons: failedConditions,
      conditions_verifiees: conditions
    };
  }

  // Check if works are eligible
  const travauxEligibles = legalRules.maprimerenov_eligibility.travaux_eligibles;
  const lignesEligibles = (lignes || []).filter(ligne => {
    const desc = (ligne.description || '').toLowerCase();
    return travauxEligibles.some(travail =>
      desc.includes(travail.toLowerCase())
    );
  });

  if (lignesEligibles.length === 0) {
    return {
      eligible: false,
      raisons: ['Aucun travail éligible à MaPrimeRénov\' détecté'],
      conditions_verifiees: conditions
    };
  }

  // Determine revenue category
  const revenuFiscal = client?.revenus_fiscaux || 0;
  const nbPersonnes = client?.nb_personnes_foyer || 1;
  const idf = isIleDeFrance(client?.code_postal);
  const categorieRevenus = determineRevenueCategory(revenuFiscal, nbPersonnes, idf);

  // Estimate aid amount (simplified calculation)
  let montantEstime = 0;
  const categorieLabels = {
    tres_modestes: 'Très modestes (Bleu)',
    modestes: 'Modestes (Jaune)',
    intermediaires: 'Intermédiaires (Violet)',
    superieurs: 'Supérieurs (Rose)'
  };

  // Basic estimation - in real implementation, use detailed rates from renovation-compliance.js
  const tauxAide = {
    tres_modestes: 0.25,
    modestes: 0.20,
    intermediaires: 0.15,
    superieurs: 0
  };

  const montantTravauxEligibles = lignesEligibles.reduce((sum, l) =>
    sum + (l.total_ht || l.prix_unitaire * l.quantite || 0), 0
  );

  montantEstime = Math.round(montantTravauxEligibles * (tauxAide[categorieRevenus] || 0));

  return {
    eligible: true,
    travaux_eligibles: lignesEligibles.map(l => l.description),
    categorie_revenus: categorieLabels[categorieRevenus] || categorieRevenus,
    montant_estime: montantEstime,
    montant_travaux_eligibles: montantTravauxEligibles,
    conditions_verifiees: conditions,
    documents_requis: [
      'Devis détaillé conforme',
      'Attestation sur l\'honneur',
      'Dernier avis d\'imposition',
      'Certificat RGE de l\'entreprise',
      'Justificatif de propriété'
    ]
  };
}

// ============ QUICK VALIDATION ============

/**
 * Quick check for essential fields only (faster)
 * @param {Object} devis - Devis data
 * @returns {Object} Quick check result
 */
export function quickComplianceCheck(devis) {
  const errors = [];

  // Essential company fields
  if (!devis.company?.siret) errors.push('SIRET manquant');
  if (!devis.company?.nom) errors.push('Raison sociale manquante');
  if (!devis.company?.adresse) errors.push('Adresse entreprise manquante');

  // Essential client fields
  if (!devis.client?.nom) errors.push('Nom client manquant');
  if (!devis.client?.adresse) errors.push('Adresse client manquante');

  // Essential devis fields
  if (!devis.numero) errors.push('Numéro de devis manquant');
  if (!devis.montant_ttc) errors.push('Montant TTC manquant');
  if (!devis.lignes || devis.lignes.length === 0) errors.push('Aucune ligne de prestation');

  return {
    valid: errors.length === 0,
    errors,
    can_send: errors.length === 0
  };
}

// ============ GENERATE COMPLIANCE TEXT ============

/**
 * Generate required legal mentions text for devis
 * @param {Object} devis - Devis data
 * @param {Object} context - Context with conditions
 * @returns {string[]} Array of required mention texts
 */
export function generateLegalMentions(devis, context = {}) {
  const mentions = [];
  const { client, company } = devis;

  // Validity
  mentions.push(`Devis valable ${devis.validite || '30 jours'} à compter de sa date d'émission.`);

  // Payment terms
  if (devis.modalites_paiement) {
    mentions.push(`Modalités de paiement : ${devis.modalites_paiement}`);
  }

  // Insurance
  if (company?.assurance_decennale) {
    mentions.push(
      `Assurance décennale : ${company.assurance_decennale_assureur || 'Voir attestation'} ` +
      `n°${company.assurance_decennale_numero || 'Voir attestation'}`
    );
  }
  if (company?.assurance_rc_pro) {
    mentions.push(
      `Assurance RC Professionnelle : ${company.assurance_rc_assureur || 'Voir attestation'} ` +
      `n°${company.assurance_rc_numero || 'Voir attestation'}`
    );
  }

  // RGE if applicable
  if (company?.rge) {
    mentions.push(`Qualification RGE n°${company.rge_numero || 'Voir certificat'}`);
  }

  // Consumer rights for individuals
  if (client?.type === 'particulier') {
    // Retractation for off-premises sales
    if (context.vente_hors_etablissement) {
      mentions.push(
        'Droit de rétractation : Conformément à l\'article L221-18 du Code de la consommation, ' +
        'vous disposez d\'un délai de 14 jours pour exercer votre droit de rétractation.'
      );
    }

    // Mediation
    if (company?.mediateur_nom) {
      mentions.push(
        `Médiation : En cas de litige, vous pouvez recourir gratuitement au service de médiation : ` +
        `${company.mediateur_nom}${company.mediateur_site ? ` - ${company.mediateur_site}` : ''}`
      );
    }
  }

  // Guarantees
  mentions.push(
    'Garanties légales : Garantie de parfait achèvement (1 an), ' +
    'garantie biennale (2 ans), garantie décennale (10 ans) selon articles 1792 et suivants du Code civil.'
  );

  // TVA attestation reminder
  const tvaCheck = verifyTVARate(devis, context);
  if (tvaCheck.attestation_required) {
    mentions.push(
      `TVA à taux réduit : L\'application du taux de ${tvaCheck.suggested_rate}% est subordonnée ` +
      `à la remise d\'une attestation (${tvaCheck.attestation_form}).`
    );
  }

  return mentions;
}

// ============ EXPORTS ============

export default {
  checkDevisCompliance,
  quickComplianceCheck,
  verifyTVARate,
  checkMaPrimeRenovEligibility,
  generateLegalMentions,
  determineRevenueCategory,
  isIleDeFrance,
  isTravauxRenovationEnergetique,
  isTravauxAmelioration,
  getNestedValue,
  setNestedValue,
  evaluateCondition,
  formatCurrency,
  validatePattern,
  REVENUE_CATEGORIES,
  legalRules
};
