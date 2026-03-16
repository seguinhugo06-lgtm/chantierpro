/**
 * Nettoyage de transcription vocale — homophones BTP et mots parasites
 */

// Homophones et abréviations courantes en BTP
const BTP_HOMOPHONES = {
  'fil à 5': 'fil 2,5mm²',
  'fil a 5': 'fil 2,5mm²',
  'fil à cinq': 'fil 2,5mm²',
  'fil de 5': 'fil 2,5mm²',
  'C dix': 'C10',
  'c dix': 'C10',
  'C dix-six': 'C16',
  'C vingt': 'C20',
  'BA treize': 'BA13',
  'BA 13': 'BA13',
  'be a treize': 'BA13',
  'placo plâtre': 'Placo®',
  'placo platre': 'Placo®',
  'placoplatre': 'Placo®',
  'IPN': 'IPN (poutre acier)',
  'i p n': 'IPN',
  'haut-vé-u': 'HO7V-U',
  'HO sept V U': 'HO7V-U',
  'dix-six carrés': '16mm²',
  'deux cinq carrés': '2,5mm²',
  'six carrés': '6mm²',
  'agglo': 'parpaing/agglo',
  'aglo': 'parpaing/agglo',
  'ragréage': 'ragréage',
  'ragreage': 'ragréage',
  'mètre carré': 'm²',
  'mètres carrés': 'm²',
  'mètre linéaire': 'ml',
  'mètres linéaires': 'ml',
};

// Mots de remplissage à supprimer
const FILLER_PATTERNS = [
  /\b(voilà|euh|hein|bon ben|donc voilà|et voilà|bah|bref)\b/gi,
  /\b(faudrait que tu|il faudrait que|essaie de|je voudrais que tu)\b/gi,
  /\b(prépare-moi|fais-moi|trouve-moi|cherche-moi)\b/gi,
  /\b(oui oui|non non)\b/gi,
  // Mots doublés (hésitations)
  /\b(\w+)\s+\1\b/gi,
];

/**
 * Nettoie une transcription brute vocale.
 * @param {string} raw - Transcription brute
 * @returns {{ cleaned: string, corrections: Array<{from: string, to: string}> }}
 */
export function cleanTranscription(raw) {
  if (!raw) return { cleaned: '', corrections: [] };

  let text = raw;
  const corrections = [];

  // 1. Appliquer les corrections d'homophones BTP
  for (const [from, to] of Object.entries(BTP_HOMOPHONES)) {
    const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(text)) {
      corrections.push({ from, to });
      text = text.replace(regex, to);
    }
  }

  // 2. Supprimer les mots parasites
  for (const pattern of FILLER_PATTERNS) {
    text = text.replace(pattern, '');
  }

  // 3. Nettoyer les espaces multiples
  text = text.replace(/\s{2,}/g, ' ').trim();

  // 4. Capitaliser la première lettre
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return { cleaned: text, corrections };
}

/**
 * Détecte une ville/région dans le texte.
 * @param {string} text
 * @returns {string|null}
 */
export function detectLocation(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const cities = [
    'paris', 'lyon', 'marseille', 'bordeaux', 'toulouse', 'nantes',
    'strasbourg', 'lille', 'nice', 'montpellier', 'rennes', 'grenoble',
    'rouen', 'toulon', 'dijon', 'angers', 'clermont', 'brest',
  ];
  for (const city of cities) {
    if (lower.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }
  return null;
}
