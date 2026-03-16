/**
 * Edge Function: devis-ia
 * Proxy for OpenAI APIs (Whisper transcription + GPT-4o-mini analysis)
 *
 * POST /functions/v1/devis-ia
 * Body: { action: 'transcribe' | 'analyze' | 'refine', ...params }
 *
 * Deploy: supabase functions deploy devis-ia
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_BASE = 'https://api.openai.com/v1';

// ============================================================================
// OpenAI API helpers
// ============================================================================

async function getOpenAIKey(): Promise<string> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY non configurée');
  return key;
}

async function whisperTranscribe(apiKey: string, audioBase64: string): Promise<string> {
  // Decode base64 to binary
  const binaryString = atob(audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create form data with audio file
  const formData = new FormData();
  const audioBlob = new Blob([bytes], { type: 'audio/webm' });
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'fr');
  formData.append('response_format', 'json');

  const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err.error?.message || `Whisper error: ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}

async function gptAnalyze(
  apiKey: string,
  transcription: string,
  catalogue: any[],
  memories: any[],
  region: string | null,
  entreprise: any,
): Promise<any> {
  const catalogueStr = catalogue.length > 0
    ? catalogue.map((p: any) => `[CAT:${p.id}] ${p.nom} | ${p.unite} | ${p.prix}€ HT`).join('\n')
    : 'Aucun catalogue enregistré — génère des suggestions avec prix marché.';

  const memoriesStr = memories.length > 0
    ? memories.map((m: any) => `• ${m.key}: ${JSON.stringify(m.value)}`).join('\n')
    : 'Aucune mémoire enregistrée.';

  const regionStr = region
    ? `Région chantier détectée : ${region}. Adapte les prix à cette région.`
    : '';

  const systemPrompt = `Tu es un assistant expert BTP qui génère des devis professionnels pour les artisans français. Tu es précis, concis et orienté métier.

═══ CONTEXTE ARTISAN ═══
Entreprise : ${entreprise?.nom || 'Non renseigné'}
Localisation : ${entreprise?.ville || 'France'}
TVA par défaut : ${entreprise?.tvaDefaut || 20}%
${regionStr}

═══ CATALOGUE DE PRESTATIONS (PRIORITÉ ABSOLUE) ═══
${catalogueStr}

═══ MÉMOIRES ARTISAN ═══
${memoriesStr}

═══ INSTRUCTIONS ═══
1. NETTOIE la transcription :
   - Supprime mots parasites : "voilà", "euh", "donc", "bon", "ben"
   - Corrige homophones BTP : "fil à 5" → "fil 2,5mm²", "C dix" → "C10", "BA treize" → "BA13"
   - Ignore les instructions méta ("faudrait que tu trouves", "prépare-moi")
   - Extrais uniquement les éléments techniques

2. GÉNÈRE les postes du devis :
   - Cherche d'abord dans le CATALOGUE → utilise [CAT:id] si trouvé
   - Utilise les MÉMOIRES pour les préférences matériaux/tarifs
   - Si absent du catalogue → génère une suggestion avec prix marché [SUGGESTION]
   - Note les éléments non interprétables [NON_COMPRIS]

3. RETOURNE ce JSON strict (rien d'autre) :
{
  "cleanedTranscription": "version nettoyée",
  "summary": "Résumé 1 phrase max 15 mots",
  "detectedLocation": "ville si mentionnée ou null",
  "confidence": 84,
  "lines": [
    {
      "designation": "Pose prise Legrand Mosaic",
      "source": "catalogue",
      "catalogueId": "id ou null",
      "qty": 2,
      "unit": "u",
      "puHT": 45.00,
      "totalHT": 90.00,
      "confidence": 95,
      "notes": "Référence détectée"
    }
  ],
  "unrecognized": ["éléments non compris"],
  "suggestedMemories": [
    { "key": "nom_preference", "value": { "detail": "valeur" }, "type": "material" }
  ]
}`;

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Transcription à analyser :\n"${transcription}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err.error?.message || `GPT error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices[0]?.message?.content;
  return JSON.parse(content);
}

async function gptRefine(
  apiKey: string,
  message: string,
  currentLines: any[],
): Promise<{ updatedLines: any[]; explanation: string }> {
  const systemPrompt = `Tu es un assistant expert BTP. L'utilisateur affine un devis généré par IA.
Voici les postes actuels du devis :
${JSON.stringify(currentLines, null, 2)}

L'utilisateur va te demander de modifier, ajouter ou supprimer des postes.
Retourne TOUJOURS un JSON strict :
{
  "updatedLines": [/* tableau complet des lignes mises à jour */],
  "explanation": "Explication courte de ce qui a changé"
}`;

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err.error?.message || `GPT error: ${res.status}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0]?.message?.content);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = await getOpenAIKey();
    let result: any;

    switch (action) {
      case 'transcribe': {
        const { audio } = params;
        if (!audio) throw new Error('audio (base64) requis');
        const text = await whisperTranscribe(apiKey, audio);
        result = { text };
        break;
      }

      case 'analyze': {
        const { transcription, catalogue, memories, region, entreprise } = params;
        if (!transcription) throw new Error('transcription requise');
        result = await gptAnalyze(
          apiKey,
          transcription,
          catalogue || [],
          memories || [],
          region || null,
          entreprise || {},
        );
        break;
      }

      case 'refine': {
        const { message, currentLines } = params;
        if (!message) throw new Error('message requis');
        result = await gptRefine(apiKey, message, currentLines || []);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Action inconnue: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('[DEVIS-IA] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
