/**
 * Module d'import Excel/CSV pour ChantierPro
 * Permet d'importer clients, devis, dépenses, équipe depuis fichiers Excel/CSV
 */

// Types de données importables
export const IMPORT_TYPES = {
  CLIENTS: {
    id: 'clients',
    label: 'Clients',
    icon: 'Users',
    requiredFields: ['nom'],
    optionalFields: ['email', 'telephone', 'adresse', 'ville', 'codePostal', 'notes'],
    mapping: {
      // Aliases pour les colonnes
      'nom': ['nom', 'name', 'client', 'raison sociale', 'société', 'entreprise'],
      'email': ['email', 'mail', 'e-mail', 'courriel'],
      'telephone': ['telephone', 'tel', 'téléphone', 'phone', 'mobile', 'portable'],
      'adresse': ['adresse', 'address', 'rue', 'voie'],
      'ville': ['ville', 'city', 'commune'],
      'codePostal': ['code postal', 'cp', 'zip', 'code'],
      'notes': ['notes', 'commentaire', 'remarque', 'observation']
    }
  },
  DEPENSES: {
    id: 'depenses',
    label: 'Dépenses',
    icon: 'Receipt',
    requiredFields: ['description', 'montant'],
    optionalFields: ['date', 'fournisseur', 'categorie', 'chantier', 'numeroFacture', 'tauxTVA'],
    mapping: {
      'description': ['description', 'libellé', 'libelle', 'intitulé', 'designation', 'désignation'],
      'montant': ['montant', 'amount', 'total', 'prix', 'ht', 'montant ht', 'total ht'],
      'date': ['date', 'date facture', 'date dépense'],
      'fournisseur': ['fournisseur', 'supplier', 'vendeur', 'magasin'],
      'categorie': ['categorie', 'catégorie', 'category', 'type'],
      'chantier': ['chantier', 'projet', 'project', 'affaire'],
      'numeroFacture': ['numero facture', 'n° facture', 'ref', 'référence', 'reference'],
      'tauxTVA': ['tva', 'taux tva', 'taux', '%tva']
    }
  },
  EQUIPE: {
    id: 'equipe',
    label: 'Équipe',
    icon: 'HardHat',
    requiredFields: ['nom'],
    optionalFields: ['prenom', 'role', 'email', 'telephone', 'tauxHoraire', 'competences'],
    mapping: {
      'nom': ['nom', 'name', 'lastname', 'nom de famille'],
      'prenom': ['prenom', 'prénom', 'firstname', 'first name'],
      'role': ['role', 'rôle', 'poste', 'fonction', 'métier', 'metier'],
      'email': ['email', 'mail', 'e-mail'],
      'telephone': ['telephone', 'tel', 'téléphone', 'phone', 'mobile'],
      'tauxHoraire': ['taux horaire', 'taux', 'tarif', 'cout horaire', 'coût horaire', 'salaire'],
      'competences': ['competences', 'compétences', 'skills', 'qualifications']
    }
  },
  DEVIS: {
    id: 'devis',
    label: 'Devis',
    icon: 'FileText',
    requiredFields: ['client', 'montant'],
    optionalFields: ['numero', 'date', 'description', 'statut', 'validite'],
    mapping: {
      'client': ['client', 'nom client', 'customer'],
      'montant': ['montant', 'total', 'amount', 'montant ht', 'total ht'],
      'numero': ['numero', 'numéro', 'n°', 'ref', 'référence', 'reference'],
      'date': ['date', 'date devis', 'date création'],
      'description': ['description', 'objet', 'intitulé', 'titre'],
      'statut': ['statut', 'status', 'état', 'etat'],
      'validite': ['validite', 'validité', 'durée validité', 'jours']
    }
  }
};

// Catégories de dépenses pour mapping
const EXPENSE_CATEGORIES = {
  'materiel': ['materiel', 'matériel', 'matériaux', 'materials', 'fourniture'],
  'outillage': ['outillage', 'outil', 'outils', 'tools', 'equipement'],
  'carburant': ['carburant', 'essence', 'gasoil', 'fuel', 'gas'],
  'location': ['location', 'rental', 'leasing'],
  'sous-traitance': ['sous-traitance', 'sous traitance', 'subcontractor'],
  'autre': ['autre', 'other', 'divers']
};

/**
 * Parse un fichier CSV en tableau d'objets
 */
export const parseCSV = (csvText, separator = null) => {
  // Auto-detect separator
  if (!separator) {
    const firstLine = csvText.split('\n')[0];
    if (firstLine.includes(';')) separator = ';';
    else if (firstLine.includes('\t')) separator = '\t';
    else separator = ',';
  }

  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return { success: false, error: 'Le fichier doit contenir au moins un en-tête et une ligne de données' };
  }

  // Parse header
  const headers = parseCSVLine(lines[0], separator).map(h => h.toLowerCase().trim());

  // Parse data rows
  const data = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i], separator);
      if (values.length === 0 || values.every(v => !v.trim())) continue;

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      data.push(row);
    } catch (err) {
      errors.push(`Ligne ${i + 1}: ${err.message}`);
    }
  }

  return {
    success: true,
    headers,
    data,
    errors,
    rowCount: data.length
  };
};

/**
 * Parse une ligne CSV en tenant compte des guillemets
 */
const parseCSVLine = (line, separator) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
};

/**
 * Trouve le meilleur mapping entre colonnes CSV et champs attendus
 */
export const findColumnMapping = (headers, importType) => {
  const config = IMPORT_TYPES[importType.toUpperCase()];
  if (!config) return null;

  const mapping = {};
  const unmapped = [];
  const suggestions = {};

  // Pour chaque champ de l'import type
  const allFields = [...config.requiredFields, ...config.optionalFields];

  allFields.forEach(field => {
    const aliases = config.mapping[field] || [field];

    // Chercher une correspondance exacte ou partielle
    let found = false;
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      for (const alias of aliases) {
        const normalizedAlias = alias.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (normalizedHeader === normalizedAlias ||
            normalizedHeader.includes(normalizedAlias) ||
            normalizedAlias.includes(normalizedHeader)) {
          mapping[field] = header;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found && config.requiredFields.includes(field)) {
      unmapped.push(field);
      // Suggérer les colonnes non mappées
      suggestions[field] = headers.filter(h => !Object.values(mapping).includes(h));
    }
  });

  return {
    mapping,
    unmapped,
    suggestions,
    isComplete: unmapped.length === 0
  };
};

/**
 * Applique le mapping et convertit les données
 */
export const applyMapping = (data, mapping, importType) => {
  const config = IMPORT_TYPES[importType.toUpperCase()];
  const result = [];
  const errors = [];

  data.forEach((row, index) => {
    try {
      const converted = {};

      // Appliquer le mapping
      Object.entries(mapping).forEach(([field, column]) => {
        let value = row[column] || '';

        // Conversions spécifiques selon le champ
        if (field === 'montant' || field === 'tauxHoraire' || field === 'tauxTVA') {
          value = parseNumber(value);
        } else if (field === 'date') {
          value = parseDate(value);
        } else if (field === 'categorie') {
          value = mapCategory(value);
        } else if (field === 'statut') {
          value = mapStatus(value);
        }

        converted[field] = value;
      });

      // Vérifier les champs requis
      const missingFields = config.requiredFields.filter(f => !converted[f] && converted[f] !== 0);
      if (missingFields.length > 0) {
        errors.push(`Ligne ${index + 2}: Champs manquants: ${missingFields.join(', ')}`);
        return;
      }

      // Ajouter un ID temporaire
      converted._importId = `import_${Date.now()}_${index}`;
      converted._rowNumber = index + 2;

      result.push(converted);
    } catch (err) {
      errors.push(`Ligne ${index + 2}: ${err.message}`);
    }
  });

  return { data: result, errors };
};

/**
 * Parse un nombre depuis une chaîne (format FR ou EN)
 */
const parseNumber = (str) => {
  if (!str || str === '') return 0;

  // Nettoyer la chaîne
  let cleaned = str.toString()
    .replace(/[€$\s]/g, '')
    .replace(/\s/g, '');

  // Format français: 1 234,56
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // Format mixte: 1,234.56
  else if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/,/g, '');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * Parse une date depuis différents formats
 */
const parseDate = (str) => {
  if (!str) return new Date().toISOString().split('T')[0];

  // Formats courants
  const patterns = [
    // DD/MM/YYYY ou DD-MM-YYYY
    { regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, format: 'dmy' },
    // DD/MM/YY
    { regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/, format: 'dmy2' },
    // YYYY-MM-DD (ISO)
    { regex: /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, format: 'ymd' },
    // MM/DD/YYYY
    { regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, format: 'mdy' }
  ];

  for (const { regex, format } of patterns) {
    const match = str.match(regex);
    if (match) {
      let year, month, day;

      if (format === 'dmy') {
        [, day, month, year] = match;
      } else if (format === 'dmy2') {
        [, day, month, year] = match;
        year = '20' + year;
      } else if (format === 'ymd') {
        [, year, month, day] = match;
      } else if (format === 'mdy') {
        [, month, day, year] = match;
      }

      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Essayer Date.parse en dernier recours
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
};

/**
 * Mappe une catégorie textuelle vers notre système
 */
const mapCategory = (str) => {
  if (!str) return 'autre';

  const normalized = str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const [category, aliases] of Object.entries(EXPENSE_CATEGORIES)) {
    if (aliases.some(alias => normalized.includes(alias))) {
      return category;
    }
  }

  return 'autre';
};

/**
 * Mappe un statut textuel vers notre système
 */
const mapStatus = (str) => {
  if (!str) return 'brouillon';

  const normalized = str.toLowerCase();

  if (['accepté', 'accepte', 'accepted', 'signé', 'signe', 'validé', 'valide'].some(s => normalized.includes(s))) {
    return 'accepte';
  }
  if (['refusé', 'refuse', 'refused', 'rejected', 'perdu'].some(s => normalized.includes(s))) {
    return 'refuse';
  }
  if (['envoyé', 'envoye', 'sent', 'en attente', 'pending'].some(s => normalized.includes(s))) {
    return 'envoye';
  }

  return 'brouillon';
};

/**
 * Génère un fichier template CSV pour un type d'import
 */
export const generateTemplate = (importType) => {
  const config = IMPORT_TYPES[importType.toUpperCase()];
  if (!config) return null;

  const headers = [...config.requiredFields, ...config.optionalFields];
  const exampleRow = generateExampleRow(importType);

  const csv = [
    headers.join(';'),
    exampleRow.join(';')
  ].join('\n');

  return {
    filename: `template_${importType.toLowerCase()}.csv`,
    content: csv,
    headers
  };
};

/**
 * Génère une ligne d'exemple pour le template
 */
const generateExampleRow = (importType) => {
  switch (importType.toUpperCase()) {
    case 'CLIENTS':
      return ['Dupont SA', 'contact@dupont.fr', '0612345678', '123 rue Example', 'Paris', '75001', 'Client fidèle'];
    case 'DEPENSES':
      return ['Achat matériaux', '1250.50', '15/01/2024', 'Point P', 'materiel', 'Rénovation Dupont', 'FA-2024-001', '20'];
    case 'EQUIPE':
      return ['Martin', 'Jean', 'Chef de chantier', 'jean.martin@email.com', '0698765432', '35', 'Maçonnerie, Carrelage'];
    case 'DEVIS':
      return ['Dupont SA', '15000', 'DEV-2024-001', '10/01/2024', 'Rénovation complète cuisine', 'brouillon', '30'];
    default:
      return [];
  }
};

/**
 * Valide les données importées avant insertion
 */
export const validateImportData = (data, importType, existingData = {}) => {
  const warnings = [];
  const valid = [];

  data.forEach(item => {
    const itemWarnings = [];

    // Vérifications spécifiques par type
    switch (importType.toUpperCase()) {
      case 'CLIENTS':
        // Vérifier les doublons par nom
        if (existingData.clients?.some(c =>
          c.nom.toLowerCase() === item.nom.toLowerCase()
        )) {
          itemWarnings.push('Client avec ce nom existe déjà');
        }
        // Valider email
        if (item.email && !isValidEmail(item.email)) {
          itemWarnings.push('Format email invalide');
        }
        break;

      case 'DEPENSES':
        // Vérifier montant positif
        if (item.montant <= 0) {
          itemWarnings.push('Montant doit être positif');
        }
        // Vérifier taux TVA valide
        if (item.tauxTVA && ![0, 2.1, 5.5, 10, 20].includes(item.tauxTVA)) {
          itemWarnings.push('Taux TVA inhabituel');
        }
        break;

      case 'EQUIPE':
        // Vérifier doublon par nom complet
        if (existingData.equipe?.some(e =>
          `${e.nom} ${e.prenom}`.toLowerCase() === `${item.nom} ${item.prenom || ''}`.toLowerCase()
        )) {
          itemWarnings.push('Membre avec ce nom existe déjà');
        }
        break;

      case 'DEVIS':
        // Vérifier que le client existe
        if (item.client && existingData.clients) {
          const clientExists = existingData.clients.some(c =>
            c.nom.toLowerCase().includes(item.client.toLowerCase()) ||
            item.client.toLowerCase().includes(c.nom.toLowerCase())
          );
          if (!clientExists) {
            itemWarnings.push('Client non trouvé dans la base');
          }
        }
        break;
    }

    item._warnings = itemWarnings;
    if (itemWarnings.length > 0) {
      warnings.push({ item, warnings: itemWarnings });
    }
    valid.push(item);
  });

  return {
    valid,
    warnings,
    hasWarnings: warnings.length > 0
  };
};

/**
 * Valide un format email
 */
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Convertit les données importées vers le format final
 */
export const convertToFinalFormat = (data, importType, existingData = {}) => {
  return data.map((item, index) => {
    const baseId = Date.now() + index;

    switch (importType.toUpperCase()) {
      case 'CLIENTS':
        return {
          id: baseId,
          nom: item.nom,
          email: item.email || '',
          telephone: item.telephone || '',
          adresse: item.adresse || '',
          ville: item.ville || '',
          codePostal: item.codePostal || '',
          notes: item.notes || '',
          createdAt: new Date().toISOString(),
          source: 'import'
        };

      case 'DEPENSES':
        return {
          id: baseId,
          description: item.description,
          montant: item.montant,
          date: item.date || new Date().toISOString().split('T')[0],
          fournisseur: item.fournisseur || '',
          categorie: item.categorie || 'autre',
          chantierId: findChantierByName(item.chantier, existingData.chantiers),
          numeroFacture: item.numeroFacture || '',
          tauxTVA: item.tauxTVA || 20,
          createdAt: new Date().toISOString(),
          source: 'import'
        };

      case 'EQUIPE':
        return {
          id: baseId,
          nom: item.nom,
          prenom: item.prenom || '',
          role: item.role || 'Ouvrier',
          email: item.email || '',
          telephone: item.telephone || '',
          tauxHoraire: item.tauxHoraire || 0,
          competences: item.competences ? item.competences.split(',').map(c => c.trim()) : [],
          actif: true,
          createdAt: new Date().toISOString(),
          source: 'import'
        };

      case 'DEVIS':
        const clientId = findClientByName(item.client, existingData.clients);
        return {
          id: baseId,
          numero: item.numero || `DEV-IMP-${baseId}`,
          clientId: clientId,
          date: item.date || new Date().toISOString().split('T')[0],
          description: item.description || '',
          montant: item.montant,
          statut: item.statut || 'brouillon',
          validiteJours: parseInt(item.validite) || 30,
          lignes: [{
            id: 1,
            description: item.description || 'Import',
            quantite: 1,
            unite: 'forfait',
            prixUnitaire: item.montant,
            tva: 20
          }],
          createdAt: new Date().toISOString(),
          source: 'import'
        };

      default:
        return item;
    }
  });
};

/**
 * Trouve un chantier par son nom
 */
const findChantierByName = (name, chantiers) => {
  if (!name || !chantiers) return null;

  const normalized = name.toLowerCase();
  const found = chantiers.find(c =>
    c.nom?.toLowerCase().includes(normalized) ||
    normalized.includes(c.nom?.toLowerCase())
  );

  return found?.id || null;
};

/**
 * Trouve un client par son nom
 */
const findClientByName = (name, clients) => {
  if (!name || !clients) return null;

  const normalized = name.toLowerCase();
  const found = clients.find(c =>
    c.nom?.toLowerCase().includes(normalized) ||
    normalized.includes(c.nom?.toLowerCase())
  );

  return found?.id || null;
};

export default {
  IMPORT_TYPES,
  parseCSV,
  findColumnMapping,
  applyMapping,
  generateTemplate,
  validateImportData,
  convertToFinalFormat
};
