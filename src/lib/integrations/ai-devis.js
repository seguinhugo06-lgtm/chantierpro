/**
 * AI Devis Analysis Service
 * Voice/text transcript → structured devis lines via Claude API (Edge Function)
 * In demo mode, uses local mock analysis
 *
 * @module ai-devis
 */

import supabase, { isDemo } from '../../supabaseClient';

// ============================================================================
// Edge Function caller
// ============================================================================

async function callEdgeFunction(transcript, catalogue = []) {
  if (!supabase) throw new Error('Supabase non configuré');

  const { data, error } = await supabase.functions.invoke('ai-devis-analyse', {
    body: { transcript, catalogue },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Analyse a transcript (voice or typed) and generate structured devis lines
 * @param {string} transcript - Voice transcript or typed description
 * @param {Array} catalogue - User's catalogue items (for price matching)
 * @returns {Promise<Object>} { lignes, description, categorie, surfaceEstimee, confiance, totalHT, notes }
 */
export async function analyseTranscript(transcript, catalogue = []) {
  if (isDemo) {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
    return mockAnalyse(transcript);
  }

  try {
    return await callEdgeFunction(transcript, catalogue);
  } catch (err) {
    // Fallback to local mock if Edge Function not deployed or API key missing
    console.warn('[ai-devis] Edge Function failed, falling back to local analysis:', err.message);
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    const result = mockAnalyse(transcript);
    result.notes = 'Estimation locale (IA non configurée)';
    return result;
  }
}

// ============================================================================
// Mock analysis (demo/fallback)
// ============================================================================

const travauxDb = [
  {
    cat: 'demolition',
    items: [
      { designation: 'Dépose carrelage existant', unite: 'm²', prixMin: 15, prixMax: 25 },
      { designation: 'Évacuation gravats', unite: 'forfait', prixMin: 200, prixMax: 500 },
      { designation: 'Dépose sanitaires', unite: 'u', prixMin: 80, prixMax: 150 },
    ],
  },
  {
    cat: 'plomberie',
    items: [
      { designation: 'Fourniture et pose receveur de douche', unite: 'u', prixMin: 400, prixMax: 800 },
      { designation: 'Fourniture et pose WC suspendu', unite: 'u', prixMin: 500, prixMax: 900 },
      { designation: 'Fourniture et pose lavabo + robinetterie', unite: 'u', prixMin: 300, prixMax: 600 },
      { designation: 'Modification réseau eau chaude/froide', unite: 'forfait', prixMin: 300, prixMax: 700 },
    ],
  },
  {
    cat: 'carrelage',
    items: [
      { designation: 'Fourniture et pose carrelage sol', unite: 'm²', prixMin: 45, prixMax: 85 },
      { designation: 'Fourniture et pose faïence murale', unite: 'm²', prixMin: 50, prixMax: 90 },
      { designation: 'Réalisation joints', unite: 'm²', prixMin: 8, prixMax: 15 },
    ],
  },
  {
    cat: 'electricite',
    items: [
      { designation: 'Mise aux normes tableau électrique', unite: 'forfait', prixMin: 400, prixMax: 800 },
      { designation: 'Fourniture et pose spots LED', unite: 'u', prixMin: 45, prixMax: 85 },
      { designation: 'Point lumineux supplémentaire', unite: 'u', prixMin: 80, prixMax: 150 },
    ],
  },
  {
    cat: 'peinture',
    items: [
      { designation: 'Préparation murs (enduit + ponçage)', unite: 'm²', prixMin: 12, prixMax: 22 },
      { designation: 'Peinture murs 2 couches', unite: 'm²', prixMin: 15, prixMax: 28 },
      { designation: 'Peinture plafond', unite: 'm²', prixMin: 18, prixMax: 30 },
    ],
  },
  {
    cat: 'menuiserie',
    items: [
      { designation: 'Fourniture et pose porte intérieure', unite: 'u', prixMin: 250, prixMax: 500 },
      { designation: 'Fourniture et pose meuble vasque', unite: 'u', prixMin: 400, prixMax: 900 },
    ],
  },
];

function randBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function mockAnalyse(description) {
  const surface = parseFloat((description || '').match(/(\d+)\s*m²/)?.[1] || '12');
  const descLower = (description || '').toLowerCase();

  let relevantCats = [];
  if (/salle.de.bain|douche|baignoire|wc|lavabo|sanitaire|plomb/i.test(descLower)) {
    relevantCats.push('demolition', 'plomberie', 'carrelage', 'electricite');
  }
  if (/cuisine/i.test(descLower)) {
    relevantCats.push('demolition', 'plomberie', 'electricite', 'carrelage', 'menuiserie');
  }
  if (/peinture|mur|plafond|rafra/i.test(descLower)) {
    relevantCats.push('peinture');
  }
  if (/électr|spot|luminaire|tableau/i.test(descLower)) {
    relevantCats.push('electricite');
  }
  if (/carrelage|sol|faïence/i.test(descLower)) {
    relevantCats.push('carrelage');
  }
  if (/porte|fenêtre|menuiserie|meuble/i.test(descLower)) {
    relevantCats.push('menuiserie');
  }
  if (/rénovation|rénov/i.test(descLower) && relevantCats.length === 0) {
    relevantCats = ['demolition', 'plomberie', 'carrelage', 'electricite', 'peinture'];
  }
  if (relevantCats.length === 0) {
    relevantCats = travauxDb.map((c) => c.cat);
  }

  relevantCats = [...new Set(relevantCats)];

  const allRelevant = travauxDb
    .filter((c) => relevantCats.includes(c.cat))
    .flatMap((c) => c.items.map((item) => ({ ...item, cat: c.cat })));

  const count = Math.min(allRelevant.length, Math.floor(Math.random() * 4) + 4);
  const selected = pickRandom(allRelevant, count);

  const lignes = selected.map((item, i) => {
    let quantite;
    if (item.unite === 'm²') {
      quantite = Math.round(surface * (0.6 + Math.random() * 0.8) * 10) / 10;
    } else if (item.unite === 'u') {
      quantite = Math.floor(Math.random() * 3) + 1;
    } else {
      quantite = 1;
    }
    const prixUnitaire = randBetween(item.prixMin, item.prixMax);
    return {
      id: `ia_${i}_${Date.now()}`,
      designation: item.designation,
      quantite,
      unite: item.unite,
      prixUnitaire,
      totalHT: Math.round(quantite * prixUnitaire * 100) / 100,
    };
  });

  const totalHT = Math.round(lignes.reduce((s, t) => s + t.totalHT, 0) * 100) / 100;

  // Calcul de confiance basé sur des facteurs réels
  const confianceFactors = [];
  const hasSurface = /(\d+)\s*m²/.test(description || '');
  const hasSpecificRoom = /salle.de.bain|cuisine|chambre|salon|wc|garage|terrasse|balcon/i.test(description || '');
  const hasSpecificWork = /douche|baignoire|carrelage|peinture|plomberie|électr|menuiserie|isolation/i.test(description || '');
  const descLength = (description || '').trim().length;
  const matchedCatsCount = relevantCats.length;

  // Surface mentionnée → prix m² plus précis
  if (hasSurface) confianceFactors.push({ label: 'Surface détectée', points: 20 });
  else confianceFactors.push({ label: 'Surface estimée par défaut', points: 8 });

  // Pièce spécifique identifiée
  if (hasSpecificRoom) confianceFactors.push({ label: 'Pièce identifiée', points: 20 });
  else confianceFactors.push({ label: 'Type de pièce non précisé', points: 5 });

  // Travaux spécifiques mentionnés
  if (hasSpecificWork) confianceFactors.push({ label: 'Travaux identifiés', points: 20 });
  else confianceFactors.push({ label: 'Travaux déduits du contexte', points: 8 });

  // Description suffisamment détaillée
  if (descLength > 80) confianceFactors.push({ label: 'Description détaillée', points: 15 });
  else if (descLength > 30) confianceFactors.push({ label: 'Description correcte', points: 10 });
  else confianceFactors.push({ label: 'Description courte', points: 5 });

  // Nombre de catégories matchées (spécificité)
  if (matchedCatsCount >= 1 && matchedCatsCount <= 3) confianceFactors.push({ label: `${matchedCatsCount} corps de métier`, points: 15 });
  else if (matchedCatsCount > 3) confianceFactors.push({ label: `${matchedCatsCount} corps de métier`, points: 10 });
  else confianceFactors.push({ label: 'Estimation générale', points: 5 });

  // Prix basés sur le catalogue utilisateur vs prix moyens
  confianceFactors.push({ label: 'Prix moyens du marché', points: 10 });

  const confiance = Math.min(95, confianceFactors.reduce((s, f) => s + f.points, 0));

  return {
    lignes,
    description: description || 'Analyse automatique',
    categorie: relevantCats[0] || 'general',
    surfaceEstimee: surface,
    totalHT,
    confiance,
    confianceFactors,
    notes: null,
  };
}
