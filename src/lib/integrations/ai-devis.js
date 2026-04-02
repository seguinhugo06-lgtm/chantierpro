/**
 * AI Devis Analysis Service
 * Voice/text transcript -> structured devis lines via Claude API (Edge Function)
 * In demo mode, uses local mock analysis
 *
 * Persistence: analyses are saved server-side by the Edge Function in ia_analyses table.
 * Frontend can also load/save via loadAnalysesFromSupabase / saveAnalysisToSupabase.
 *
 * @module ai-devis
 */

import supabase, { isDemo } from '../../supabaseClient';

// ============================================================================
// Edge Function caller
// ============================================================================

async function callEdgeFunction(action, params = {}) {
  if (!supabase) throw new Error('Supabase non configure');

  const { data, error } = await supabase.functions.invoke('devis-ia', {
    body: { action, ...params },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ============================================================================
// Supabase persistence helpers
// ============================================================================

/**
 * Load analyses from Supabase ia_analyses table
 * @param {string} userId
 * @returns {Promise<Array>} analyses sorted by created_at desc
 */
export async function loadAnalysesFromSupabase(userId) {
  if (isDemo || !supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('ia_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ai-devis] Failed to load analyses from Supabase:', error.message);
      return null;
    }

    // Map from snake_case DB to camelCase local
    return (data || []).map(fromSupabase);
  } catch (e) {
    console.warn('[ai-devis] Supabase load error:', e.message);
    return null;
  }
}

/**
 * Save a single analysis to Supabase
 * @param {Object} analysis - local analysis object
 * @param {string} userId
 * @param {string} orgId
 * @returns {Promise<Object|null>} saved row or null on failure
 */
export async function saveAnalysisToSupabase(analysis, userId, orgId) {
  if (isDemo || !supabase || !userId) return null;

  try {
    const row = {
      user_id: userId,
      organization_id: orgId || null,
      source: analysis.source || 'text',
      description: analysis.description || '',
      lignes: analysis.analyse_resultat?.lignes || analysis.lignes || [],
      confiance: analysis.confiance || analysis.analyse_resultat?.confiance || 0,
      confiance_factors: analysis.analyse_resultat?.confianceFactors || null,
      total_ht: analysis.analyse_resultat?.totalHT || 0,
      mode: analysis.mode || 'local',
      statut: analysis.statut || 'terminee',
      notes: analysis.analyse_resultat?.notes || null,
    };

    const { data, error } = await supabase
      .from('ia_analyses')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.warn('[ai-devis] Failed to save analysis to Supabase:', error.message);
      return null;
    }
    return data ? fromSupabase(data) : null;
  } catch (e) {
    console.warn('[ai-devis] Supabase save error:', e.message);
    return null;
  }
}

/**
 * Update analysis status in Supabase (e.g. mark as 'appliquee')
 * @param {string} analysisId - UUID
 * @param {Object} updates - fields to update
 */
export async function updateAnalysisInSupabase(analysisId, updates) {
  if (isDemo || !supabase || !analysisId) return;

  try {
    const row = {};
    if (updates.statut) row.statut = updates.statut;
    if (updates.devisId) row.devis_id = updates.devisId;
    row.updated_at = new Date().toISOString();

    await supabase
      .from('ia_analyses')
      .update(row)
      .eq('id', analysisId);
  } catch (e) {
    console.warn('[ai-devis] Supabase update error:', e.message);
  }
}

/**
 * Delete analysis from Supabase
 */
export async function deleteAnalysisFromSupabase(analysisId) {
  if (isDemo || !supabase || !analysisId) return;

  try {
    await supabase
      .from('ia_analyses')
      .delete()
      .eq('id', analysisId);
  } catch (e) {
    console.warn('[ai-devis] Supabase delete error:', e.message);
  }
}

// ============================================================================
// DB mapping helpers
// ============================================================================

function fromSupabase(row) {
  return {
    id: row.id,
    description: row.description,
    source: row.source,
    statut: row.statut,
    confiance: row.confiance,
    mode: row.mode,
    devisId: row.devis_id,
    analyse_resultat: {
      lignes: row.lignes || [],
      totalHT: parseFloat(row.total_ht) || 0,
      confiance: row.confiance,
      confianceFactors: row.confiance_factors,
      notes: row.notes,
      description: row.description,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Analyse a transcript (voice or typed) and generate structured devis lines
 * @param {string} transcript - Voice transcript or typed description
 * @param {Array} catalogue - User's catalogue items (for price matching)
 * @param {Object} options - { memories, region, entreprise }
 * @returns {Promise<Object>} { lignes, description, categorie, surfaceEstimee, confiance, totalHT, notes, mode }
 */
export async function analyseTranscript(transcript, catalogue = [], options = {}) {
  if (isDemo) {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
    const result = mockAnalyse(transcript);
    result.mode = 'local';
    return result;
  }

  try {
    const aiResult = await callEdgeFunction('analyze', {
      transcription: transcript,
      catalogue,
      memories: options.memories || [],
      region: options.region || null,
      entreprise: options.entreprise || {},
    });

    // Normalize the AI response to match frontend expected shape
    const lines = aiResult.lines || [];
    const lignes = lines.map((l, i) => ({
      id: l.catalogueId || `ia_${i}_${Date.now()}`,
      designation: l.designation,
      quantite: l.qty || l.quantite || 1,
      unite: l.unit || l.unite || 'u',
      prixUnitaire: l.puHT || l.prixUnitaire || 0,
      totalHT: l.totalHT || Math.round((l.qty || 1) * (l.puHT || 0) * 100) / 100,
      source: l.source || 'suggestion',
      catalogueId: l.catalogueId || null,
    }));

    const totalHT = Math.round(lignes.reduce((s, l) => s + l.totalHT, 0) * 100) / 100;

    return {
      lignes,
      description: aiResult.summary || aiResult.cleanedTranscription || transcript.substring(0, 100),
      categorie: 'auto',
      surfaceEstimee: null,
      totalHT,
      confiance: aiResult.confidence || 80,
      confianceFactors: [],
      notes: aiResult.unrecognized?.length
        ? `Elements non compris: ${aiResult.unrecognized.join(', ')}`
        : null,
      mode: 'ai',
    };
  } catch (err) {
    // Fallback to local mock if Edge Function not deployed or API key missing
    console.warn('[ai-devis] Edge Function failed, falling back to local analysis:', err.message);
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    const result = mockAnalyse(transcript);
    result.notes = 'Estimation locale (IA non configuree)';
    result.mode = 'local';
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
      { designation: 'Depose carrelage existant', unite: 'm2', prixMin: 15, prixMax: 25 },
      { designation: 'Evacuation gravats', unite: 'forfait', prixMin: 200, prixMax: 500 },
      { designation: 'Depose sanitaires', unite: 'u', prixMin: 80, prixMax: 150 },
    ],
  },
  {
    cat: 'plomberie',
    items: [
      { designation: 'Fourniture et pose receveur de douche', unite: 'u', prixMin: 400, prixMax: 800 },
      { designation: 'Fourniture et pose WC suspendu', unite: 'u', prixMin: 500, prixMax: 900 },
      { designation: 'Fourniture et pose lavabo + robinetterie', unite: 'u', prixMin: 300, prixMax: 600 },
      { designation: 'Modification reseau eau chaude/froide', unite: 'forfait', prixMin: 300, prixMax: 700 },
    ],
  },
  {
    cat: 'carrelage',
    items: [
      { designation: 'Fourniture et pose carrelage sol', unite: 'm2', prixMin: 45, prixMax: 85 },
      { designation: 'Fourniture et pose faience murale', unite: 'm2', prixMin: 50, prixMax: 90 },
      { designation: 'Realisation joints', unite: 'm2', prixMin: 8, prixMax: 15 },
    ],
  },
  {
    cat: 'electricite',
    items: [
      { designation: 'Mise aux normes tableau electrique', unite: 'forfait', prixMin: 400, prixMax: 800 },
      { designation: 'Fourniture et pose spots LED', unite: 'u', prixMin: 45, prixMax: 85 },
      { designation: 'Point lumineux supplementaire', unite: 'u', prixMin: 80, prixMax: 150 },
    ],
  },
  {
    cat: 'peinture',
    items: [
      { designation: 'Preparation murs (enduit + poncage)', unite: 'm2', prixMin: 12, prixMax: 22 },
      { designation: 'Peinture murs 2 couches', unite: 'm2', prixMin: 15, prixMax: 28 },
      { designation: 'Peinture plafond', unite: 'm2', prixMin: 18, prixMax: 30 },
    ],
  },
  {
    cat: 'menuiserie',
    items: [
      { designation: 'Fourniture et pose porte interieure', unite: 'u', prixMin: 250, prixMax: 500 },
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
  const surface = parseFloat((description || '').match(/(\d+)\s*m/)?.[1] || '12');
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
  if (/electr|spot|luminaire|tableau/i.test(descLower)) {
    relevantCats.push('electricite');
  }
  if (/carrelage|sol|faience/i.test(descLower)) {
    relevantCats.push('carrelage');
  }
  if (/porte|fenetre|menuiserie|meuble/i.test(descLower)) {
    relevantCats.push('menuiserie');
  }
  if (/renovation|renov/i.test(descLower) && relevantCats.length === 0) {
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
    if (item.unite === 'm2') {
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

  // Calcul de confiance base sur des facteurs reels
  const confianceFactors = [];
  const hasSurface = /(\d+)\s*m/.test(description || '');
  const hasSpecificRoom = /salle.de.bain|cuisine|chambre|salon|wc|garage|terrasse|balcon/i.test(description || '');
  const hasSpecificWork = /douche|baignoire|carrelage|peinture|plomberie|electr|menuiserie|isolation/i.test(description || '');
  const descLength = (description || '').trim().length;
  const matchedCatsCount = relevantCats.length;

  if (hasSurface) confianceFactors.push({ label: 'Surface detectee', points: 20 });
  else confianceFactors.push({ label: 'Surface estimee par defaut', points: 8 });

  if (hasSpecificRoom) confianceFactors.push({ label: 'Piece identifiee', points: 20 });
  else confianceFactors.push({ label: 'Type de piece non precise', points: 5 });

  if (hasSpecificWork) confianceFactors.push({ label: 'Travaux identifies', points: 20 });
  else confianceFactors.push({ label: 'Travaux deduits du contexte', points: 8 });

  if (descLength > 80) confianceFactors.push({ label: 'Description detaillee', points: 15 });
  else if (descLength > 30) confianceFactors.push({ label: 'Description correcte', points: 10 });
  else confianceFactors.push({ label: 'Description courte', points: 5 });

  if (matchedCatsCount >= 1 && matchedCatsCount <= 3) confianceFactors.push({ label: `${matchedCatsCount} corps de metier`, points: 15 });
  else if (matchedCatsCount > 3) confianceFactors.push({ label: `${matchedCatsCount} corps de metier`, points: 10 });
  else confianceFactors.push({ label: 'Estimation generale', points: 5 });

  confianceFactors.push({ label: 'Prix moyens du marche', points: 10 });

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
    mode: 'local',
  };
}
