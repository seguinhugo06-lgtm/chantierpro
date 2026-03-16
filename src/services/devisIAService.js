/**
 * Service Devis IA — appels Edge Function + demo fallback
 */

import { cleanTranscription, detectLocation } from '../lib/voice-cleanup';
import { captureException } from '../lib/sentry';

// ── Demo data ────────────────────────────────────────────────────────

const DEMO_TRANSCRIPTION = 'Pose 2 prises électriques Legrand Mosaic, disjoncteur C10, fil 2,5mm², 2h main d\'œuvre, prix adaptés Bordeaux';

const DEMO_ANALYSIS = {
  cleanedTranscription: 'Pose 2 prises électriques Legrand Mosaic, disjoncteur C10, fil 2,5mm², 2h main d\'œuvre, prix adaptés Bordeaux',
  summary: 'Chantier électricité — 2 prises Legrand + disjoncteur C10',
  detectedLocation: 'Bordeaux',
  confidence: 84,
  lines: [
    {
      id: 'demo-1',
      designation: 'Fourniture et pose prise Legrand Mosaic double',
      source: 'suggestion',
      catalogueId: null,
      qty: 2,
      unit: 'u',
      puHT: 45.00,
      totalHT: 90.00,
      confidence: 92,
      notes: 'Référence Legrand détectée',
    },
    {
      id: 'demo-2',
      designation: 'Disjoncteur C10 fourni et posé',
      source: 'suggestion',
      catalogueId: null,
      qty: 1,
      unit: 'u',
      puHT: 28.00,
      totalHT: 28.00,
      confidence: 78,
      notes: '',
    },
    {
      id: 'demo-3',
      designation: 'Câble HO7V-U 2,5mm² (10m)',
      source: 'suggestion',
      catalogueId: null,
      qty: 1,
      unit: 'lot',
      puHT: 15.00,
      totalHT: 15.00,
      confidence: 70,
      notes: 'Fil 2,5mm² déduit de la dictée',
    },
    {
      id: 'demo-4',
      designation: 'Main d\'œuvre électricité',
      source: 'suggestion',
      catalogueId: null,
      qty: 2,
      unit: 'h',
      puHT: 45.00,
      totalHT: 90.00,
      confidence: 95,
      notes: 'Tarif Bordeaux',
    },
  ],
  unrecognized: ['Georgie (nom de contact ?)'],
  suggestedMemories: [
    { key: 'marque_prise', value: { brand: 'Legrand', gamme: 'Mosaic' }, type: 'material' },
    { key: 'taux_horaire_elec', value: { price: 45, unit: 'h' }, type: 'pricing' },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────

function generateId() {
  return `ia-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function addIdsToLines(lines) {
  return (lines || []).map((l) => ({
    ...l,
    id: l.id || generateId(),
  }));
}

// ── Service ────────────────────────────────────────────────────────

/**
 * Transcrit un blob audio via Whisper API.
 * @param {object} supabase - Client Supabase
 * @param {Blob} audioBlob - Audio enregistré
 * @param {boolean} isDemo - Mode demo
 * @returns {Promise<{ text: string }>}
 */
export async function transcribeAudio(supabase, audioBlob, isDemo) {
  if (isDemo || !supabase) {
    // Simuler un délai
    await new Promise((r) => setTimeout(r, 1500));
    return { text: DEMO_TRANSCRIPTION };
  }

  try {
    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const { data, error } = await supabase.functions.invoke('devis-ia', {
      body: { action: 'transcribe', audio: base64 },
    });

    if (error) throw error;
    return { text: data.text };
  } catch (err) {
    captureException(err, { context: 'devisIA.transcribe' });
    throw err;
  }
}

/**
 * Analyse une transcription via GPT-4o-mini.
 * @param {object} supabase
 * @param {object} params
 * @param {boolean} isDemo
 * @returns {Promise<object>} Analyse structurée
 */
export async function analyzeTranscription(supabase, { text, catalogue, memories, region, entreprise }, isDemo) {
  // Nettoyage côté client d'abord
  const { cleaned, corrections } = cleanTranscription(text);
  const detectedCity = detectLocation(text) || region;

  if (isDemo || !supabase) {
    await new Promise((r) => setTimeout(r, 2000));
    return {
      ...DEMO_ANALYSIS,
      lines: addIdsToLines(DEMO_ANALYSIS.lines),
      clientCleanup: { cleaned, corrections },
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('devis-ia', {
      body: {
        action: 'analyze',
        transcription: cleaned,
        catalogue: (catalogue || []).map((c) => ({
          id: c.id,
          nom: c.nom,
          unite: c.unite,
          prix: c.prix,
          categorie: c.categorie,
        })),
        memories: memories || [],
        region: detectedCity,
        entreprise,
      },
    });

    if (error) throw error;
    return {
      ...data,
      lines: addIdsToLines(data.lines),
      clientCleanup: { cleaned, corrections },
    };
  } catch (err) {
    captureException(err, { context: 'devisIA.analyze' });
    throw err;
  }
}

/**
 * Affine les lignes via chat IA.
 * @param {object} supabase
 * @param {object} params
 * @param {boolean} isDemo
 * @returns {Promise<{ updatedLines: Array, explanation: string }>}
 */
export async function refineLines(supabase, { message, currentLines }, isDemo) {
  if (isDemo || !supabase) {
    await new Promise((r) => setTimeout(r, 1000));
    return {
      updatedLines: addIdsToLines(currentLines),
      explanation: `Modification appliquée : "${message}" (demo mode)`,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('devis-ia', {
      body: { action: 'refine', message, currentLines },
    });

    if (error) throw error;
    return {
      ...data,
      updatedLines: addIdsToLines(data.updatedLines),
    };
  } catch (err) {
    captureException(err, { context: 'devisIA.refine' });
    throw err;
  }
}
