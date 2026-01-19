/**
 * Module de vérification conformité MaPrimeRénov' et RE2020
 * Pour les travaux de rénovation énergétique en France
 */

// Catégories de revenus MaPrimeRénov' 2024
export const REVENUE_CATEGORIES = {
  TRES_MODESTE: {
    id: 'tres_modeste',
    label: 'Très modeste',
    color: '#3b82f6', // Bleu
    colorName: 'Bleu',
    plafonds: {
      idf: {  // Île-de-France
        1: 23541,
        2: 34551,
        3: 41493,
        4: 48447,
        5: 55427,
        plus: 6970
      },
      autres: { // Autres régions
        1: 17009,
        2: 24875,
        3: 29917,
        4: 34948,
        5: 40002,
        plus: 5045
      }
    }
  },
  MODESTE: {
    id: 'modeste',
    label: 'Modeste',
    color: '#eab308', // Jaune
    colorName: 'Jaune',
    plafonds: {
      idf: {
        1: 28657,
        2: 42058,
        3: 50513,
        4: 58981,
        5: 67473,
        plus: 8486
      },
      autres: {
        1: 21805,
        2: 31889,
        3: 38349,
        4: 44802,
        5: 51281,
        plus: 6462
      }
    }
  },
  INTERMEDIAIRE: {
    id: 'intermediaire',
    label: 'Intermédiaire',
    color: '#a855f7', // Violet
    colorName: 'Violet',
    plafonds: {
      idf: {
        1: 40018,
        2: 58827,
        3: 70382,
        4: 82839,
        5: 94844,
        plus: 11966
      },
      autres: {
        1: 30549,
        2: 44907,
        3: 54071,
        4: 63235,
        5: 72400,
        plus: 9165
      }
    }
  },
  SUPERIEUR: {
    id: 'superieur',
    label: 'Supérieur',
    color: '#ec4899', // Rose
    colorName: 'Rose',
    plafonds: null // Au-dessus des plafonds intermédiaires
  }
};

// Types de travaux éligibles MaPrimeRénov'
export const TRAVAUX_ELIGIBLES = {
  ISOLATION: {
    MURS_EXT: {
      id: 'isolation_murs_ext',
      label: 'Isolation des murs par l\'extérieur',
      category: 'isolation',
      montants: {
        tres_modeste: 75,
        modeste: 60,
        intermediaire: 40,
        superieur: 15
      },
      unite: '€/m²',
      plafond: 100, // m²
      conditions: ['Résistance thermique R ≥ 3,7 m².K/W']
    },
    MURS_INT: {
      id: 'isolation_murs_int',
      label: 'Isolation des murs par l\'intérieur',
      category: 'isolation',
      montants: {
        tres_modeste: 25,
        modeste: 20,
        intermediaire: 15,
        superieur: 7
      },
      unite: '€/m²',
      plafond: 100,
      conditions: ['Résistance thermique R ≥ 3,7 m².K/W']
    },
    TOITURE: {
      id: 'isolation_toiture',
      label: 'Isolation des rampants de toiture',
      category: 'isolation',
      montants: {
        tres_modeste: 25,
        modeste: 20,
        intermediaire: 15,
        superieur: 7
      },
      unite: '€/m²',
      plafond: 100,
      conditions: ['Résistance thermique R ≥ 6 m².K/W']
    },
    COMBLES: {
      id: 'isolation_combles',
      label: 'Isolation des combles perdus',
      category: 'isolation',
      montants: {
        tres_modeste: 25,
        modeste: 20,
        intermediaire: 15,
        superieur: 7
      },
      unite: '€/m²',
      plafond: 100,
      conditions: ['Résistance thermique R ≥ 7 m².K/W']
    },
    PLANCHER_BAS: {
      id: 'isolation_plancher',
      label: 'Isolation d\'un plancher bas',
      category: 'isolation',
      montants: {
        tres_modeste: 25,
        modeste: 20,
        intermediaire: 15,
        superieur: 7
      },
      unite: '€/m²',
      plafond: 100,
      conditions: ['Résistance thermique R ≥ 3 m².K/W']
    }
  },
  CHAUFFAGE: {
    PAC_AIR_EAU: {
      id: 'pac_air_eau',
      label: 'Pompe à chaleur air/eau',
      category: 'chauffage',
      montants: {
        tres_modeste: 5000,
        modeste: 4000,
        intermediaire: 3000,
        superieur: 0
      },
      unite: '€',
      plafond: 1,
      conditions: ['ETAS ≥ 126%', 'Certification NF PAC ou équivalent']
    },
    PAC_GEOTHERMIE: {
      id: 'pac_geothermie',
      label: 'Pompe à chaleur géothermique',
      category: 'chauffage',
      montants: {
        tres_modeste: 11000,
        modeste: 9000,
        intermediaire: 6000,
        superieur: 0
      },
      unite: '€',
      plafond: 1,
      conditions: ['ETAS ≥ 126%', 'Certification NF PAC']
    },
    CHAUDIERE_GRANULES: {
      id: 'chaudiere_granules',
      label: 'Chaudière à granulés',
      category: 'chauffage',
      montants: {
        tres_modeste: 10000,
        modeste: 8000,
        intermediaire: 4000,
        superieur: 0
      },
      unite: '€',
      plafond: 1,
      conditions: ['Rendement ≥ 87%', 'Label Flamme Verte 7*']
    },
    POELE_GRANULES: {
      id: 'poele_granules',
      label: 'Poêle à granulés',
      category: 'chauffage',
      montants: {
        tres_modeste: 2500,
        modeste: 2000,
        intermediaire: 1500,
        superieur: 0
      },
      unite: '€',
      plafond: 1,
      conditions: ['Rendement ≥ 87%', 'Label Flamme Verte 7*']
    },
    POELE_BOIS: {
      id: 'poele_bois',
      label: 'Poêle à bois bûches',
      category: 'chauffage',
      montants: {
        tres_modeste: 2500,
        modeste: 2000,
        intermediaire: 1000,
        superieur: 0
      },
      unite: '€',
      plafond: 1,
      conditions: ['Rendement ≥ 75%', 'Label Flamme Verte 7*']
    },
    CHAUFFE_EAU_SOLAIRE: {
      id: 'chauffe_eau_solaire',
      label: 'Chauffe-eau solaire individuel',
      category: 'chauffage',
      montants: {
        tres_modeste: 4000,
        modeste: 3000,
        intermediaire: 2000,
        superieur: 0
      },
      unite: '€',
      plafond: 1,
      conditions: ['Certification CSTBat ou Solar Keymark']
    },
    CHAUFFE_EAU_THERMO: {
      id: 'chauffe_eau_thermo',
      label: 'Chauffe-eau thermodynamique',
      category: 'chauffage',
      montants: {
        tres_modeste: 1200,
        modeste: 800,
        intermediaire: 400,
        superieur: 0
      },
      unite: '€',
      plafond: 1,
      conditions: ['COP ≥ 2,5']
    }
  },
  FENETRES: {
    FENETRE: {
      id: 'fenetre',
      label: 'Fenêtre ou porte-fenêtre',
      category: 'fenetres',
      montants: {
        tres_modeste: 100,
        modeste: 80,
        intermediaire: 40,
        superieur: 0
      },
      unite: '€/équipement',
      plafond: 10,
      conditions: ['Uw ≤ 1,3 W/m².K', 'Sw ≥ 0,3 ou Sw ≥ 0,36']
    }
  },
  VENTILATION: {
    VMC_DOUBLE_FLUX: {
      id: 'vmc_double_flux',
      label: 'VMC double flux',
      category: 'ventilation',
      montants: {
        tres_modeste: 2500,
        modeste: 2000,
        intermediaire: 1500,
        superieur: 0
      },
      unite: '€',
      plafond: 1,
      conditions: ['Classe énergétique A', 'Rendement ≥ 85%']
    }
  },
  AUDIT: {
    AUDIT_ENERGETIQUE: {
      id: 'audit_energetique',
      label: 'Audit énergétique',
      category: 'audit',
      montants: {
        tres_modeste: 500,
        modeste: 400,
        intermediaire: 300,
        superieur: 0
      },
      unite: '€',
      plafond: 1,
      conditions: ['Réalisé par un professionnel certifié']
    }
  }
};

// Exigences RE2020 pour construction neuve
export const RE2020_EXIGENCES = {
  BBIO: {
    id: 'bbio',
    label: 'Besoin bioclimatique (Bbio)',
    description: 'Mesure le besoin en énergie du bâtiment avant tout système',
    seuils: {
      maison: { max: 63, unit: 'points' },
      collectif: { max: 65, unit: 'points' }
    },
    conseils: [
      'Optimiser l\'orientation du bâtiment',
      'Maximiser les apports solaires passifs',
      'Renforcer l\'isolation de l\'enveloppe'
    ]
  },
  CEP: {
    id: 'cep',
    label: 'Consommation d\'énergie primaire (Cep)',
    description: 'Consommation conventionnelle d\'énergie primaire',
    seuils: {
      maison: { max: 75, unit: 'kWh/m².an' },
      collectif: { max: 85, unit: 'kWh/m².an' }
    },
    conseils: [
      'Choisir des équipements performants',
      'Privilégier les énergies renouvelables',
      'Installer une VMC performante'
    ]
  },
  CEP_NR: {
    id: 'cep_nr',
    label: 'Cep non renouvelable (Cep,nr)',
    description: 'Part non renouvelable de la consommation',
    seuils: {
      maison: { max: 55, unit: 'kWh/m².an' },
      collectif: { max: 70, unit: 'kWh/m².an' }
    },
    conseils: [
      'Bannir les énergies fossiles',
      'Installer des panneaux solaires',
      'Privilégier pompe à chaleur ou biomasse'
    ]
  },
  IC_ENERGIE: {
    id: 'ic_energie',
    label: 'Impact carbone énergie (Ic énergie)',
    description: 'Émissions de gaz à effet de serre liées à l\'énergie',
    seuils: {
      maison: { max: 160, unit: 'kgCO2/m².an' },
      collectif: { max: 560, unit: 'kgCO2/m².an' }
    },
    conseils: [
      'Éliminer le gaz et le fioul',
      'Privilégier l\'électricité décarbonée',
      'Envisager le réseau de chaleur urbain'
    ]
  },
  IC_CONSTRUCTION: {
    id: 'ic_construction',
    label: 'Impact carbone construction (Ic construction)',
    description: 'Émissions liées aux matériaux et à la construction',
    seuils: {
      maison: { max: 640, unit: 'kgCO2/m²' },
      collectif: { max: 740, unit: 'kgCO2/m²' }
    },
    conseils: [
      'Utiliser des matériaux biosourcés',
      'Privilégier le bois construction',
      'Optimiser les quantités de béton'
    ]
  },
  DH: {
    id: 'dh',
    label: 'Confort d\'été (DH)',
    description: 'Degrés-heures d\'inconfort',
    seuils: {
      maison: { max: 1250, unit: 'DH' },
      collectif: { max: 1250, unit: 'DH' }
    },
    conseils: [
      'Prévoir des protections solaires',
      'Assurer une inertie thermique',
      'Permettre le rafraîchissement nocturne'
    ]
  }
};

/**
 * Détermine la catégorie de revenus d'un ménage
 */
export const determineRevenueCategory = (revenuFiscal, nbPersonnes, isIDF) => {
  const zone = isIDF ? 'idf' : 'autres';

  // Calculer le plafond effectif selon le nombre de personnes
  const getPlafond = (category) => {
    const plafonds = category.plafonds[zone];
    if (nbPersonnes <= 5) {
      return plafonds[nbPersonnes];
    }
    return plafonds[5] + (nbPersonnes - 5) * plafonds.plus;
  };

  // Tester chaque catégorie dans l'ordre
  for (const cat of ['TRES_MODESTE', 'MODESTE', 'INTERMEDIAIRE']) {
    const category = REVENUE_CATEGORIES[cat];
    const plafond = getPlafond(category);
    if (revenuFiscal <= plafond) {
      return category;
    }
  }

  return REVENUE_CATEGORIES.SUPERIEUR;
};

/**
 * Calcule le montant d'aide MaPrimeRénov' pour un travail
 */
export const calculateAideAmount = (travailId, categoryId, quantite = 1) => {
  // Trouver le travail
  let travail = null;
  for (const cat of Object.values(TRAVAUX_ELIGIBLES)) {
    for (const t of Object.values(cat)) {
      if (t.id === travailId) {
        travail = t;
        break;
      }
    }
    if (travail) break;
  }

  if (!travail) return { aide: 0, error: 'Travail non trouvé' };

  const montantUnitaire = travail.montants[categoryId] || 0;
  const quantiteEffective = Math.min(quantite, travail.plafond);

  return {
    aide: montantUnitaire * quantiteEffective,
    montantUnitaire,
    quantite: quantiteEffective,
    plafondAtteint: quantite > travail.plafond,
    unite: travail.unite,
    conditions: travail.conditions
  };
};

/**
 * Calcule l'aide totale pour une liste de travaux
 */
export const calculateTotalAide = (travaux, categoryId) => {
  let totalAide = 0;
  const details = [];

  for (const { travailId, quantite } of travaux) {
    const result = calculateAideAmount(travailId, categoryId, quantite);
    totalAide += result.aide;
    details.push({
      travailId,
      ...result
    });
  }

  return {
    totalAide,
    details,
    categoryId
  };
};

/**
 * Vérifie l'éligibilité aux aides
 */
export const checkEligibility = (projet) => {
  const checks = [];
  let isEligible = true;

  // Vérification 1: Logement de plus de 15 ans
  if (projet.anneeConstruction) {
    const age = new Date().getFullYear() - projet.anneeConstruction;
    const check = {
      id: 'age_logement',
      label: 'Ancienneté du logement (> 15 ans)',
      passed: age >= 15,
      detail: `Construction: ${projet.anneeConstruction} (${age} ans)`
    };
    checks.push(check);
    if (!check.passed) isEligible = false;
  }

  // Vérification 2: Résidence principale
  if (projet.typeUsage) {
    const check = {
      id: 'residence_principale',
      label: 'Résidence principale',
      passed: projet.typeUsage === 'principale',
      detail: projet.typeUsage === 'principale' ? 'Oui' : 'Non éligible (secondaire/locatif)'
    };
    checks.push(check);
    if (!check.passed) isEligible = false;
  }

  // Vérification 3: Professionnel RGE
  if (projet.artisanRGE !== undefined) {
    const check = {
      id: 'artisan_rge',
      label: 'Artisan certifié RGE',
      passed: projet.artisanRGE === true,
      detail: projet.artisanRGE ? 'Certifié' : 'Non certifié - obligatoire'
    };
    checks.push(check);
    if (!check.passed) isEligible = false;
  }

  // Vérification 4: Situation fiscale France
  const checkFiscal = {
    id: 'domicile_fiscal',
    label: 'Domicile fiscal en France',
    passed: true, // Assumé par défaut
    detail: 'Obligatoire pour bénéficier des aides'
  };
  checks.push(checkFiscal);

  return {
    isEligible,
    checks,
    message: isEligible
      ? 'Votre projet semble éligible à MaPrimeRénov\''
      : 'Certaines conditions ne sont pas remplies'
  };
};

/**
 * Vérifie la conformité RE2020
 */
export const checkRE2020Compliance = (valeurs, typeBatiment = 'maison') => {
  const results = [];
  let totalOK = 0;
  let total = 0;

  for (const [key, exigence] of Object.entries(RE2020_EXIGENCES)) {
    if (valeurs[exigence.id] !== undefined) {
      total++;
      const valeur = valeurs[exigence.id];
      const seuil = exigence.seuils[typeBatiment];

      const passed = valeur <= seuil.max;
      if (passed) totalOK++;

      results.push({
        id: exigence.id,
        label: exigence.label,
        valeur,
        seuil: seuil.max,
        unite: seuil.unit,
        passed,
        ecart: valeur - seuil.max,
        ecartPourcent: Math.round(((valeur - seuil.max) / seuil.max) * 100),
        conseils: passed ? [] : exigence.conseils
      });
    }
  }

  return {
    results,
    totalOK,
    total,
    isCompliant: totalOK === total && total > 0,
    score: total > 0 ? Math.round((totalOK / total) * 100) : 0
  };
};

/**
 * Génère un récapitulatif pour devis
 */
export const generateComplianceSummary = (projet, travaux, categoryId) => {
  const eligibility = checkEligibility(projet);
  const aides = calculateTotalAide(travaux, categoryId);
  const category = Object.values(REVENUE_CATEGORIES).find(c => c.id === categoryId);

  return {
    eligibility,
    aides,
    category,
    summary: {
      totalTravaux: travaux.length,
      montantAideEstime: aides.totalAide,
      categorieClient: category?.label || 'Non déterminée',
      couleurMPR: category?.colorName || 'N/A',
      dateSimulation: new Date().toISOString()
    },
    disclaimer: 'Simulation indicative. Le montant définitif sera déterminé après instruction du dossier par l\'ANAH.'
  };
};

/**
 * Recherche les travaux par catégorie
 */
export const getTravauxByCategory = (category) => {
  const categoryMap = {
    isolation: TRAVAUX_ELIGIBLES.ISOLATION,
    chauffage: TRAVAUX_ELIGIBLES.CHAUFFAGE,
    fenetres: TRAVAUX_ELIGIBLES.FENETRES,
    ventilation: TRAVAUX_ELIGIBLES.VENTILATION,
    audit: TRAVAUX_ELIGIBLES.AUDIT
  };

  const result = categoryMap[category];
  return result ? Object.values(result) : [];
};

/**
 * Obtient tous les travaux sous forme de liste plate
 */
export const getAllTravaux = () => {
  const all = [];
  for (const cat of Object.values(TRAVAUX_ELIGIBLES)) {
    for (const travail of Object.values(cat)) {
      all.push(travail);
    }
  }
  return all;
};

export default {
  REVENUE_CATEGORIES,
  TRAVAUX_ELIGIBLES,
  RE2020_EXIGENCES,
  determineRevenueCategory,
  calculateAideAmount,
  calculateTotalAide,
  checkEligibility,
  checkRE2020Compliance,
  generateComplianceSummary,
  getTravauxByCategory,
  getAllTravaux
};
