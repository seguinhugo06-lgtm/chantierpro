/**
 * Edge Function: devis-ia
 * Proxy for Anthropic Claude API (analysis) + OpenAI Whisper (transcription)
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
// API key helpers
// ============================================================================

function getAnthropicKey(): string {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY non configuree');
  return key;
}

function getOpenAIKey(): string {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY non configuree');
  return key;
}

// ============================================================================
// Whisper transcription (still OpenAI — no Anthropic equivalent)
// ============================================================================

async function whisperTranscribe(apiKey: string, audioBase64: string): Promise<string> {
  const binaryString = atob(audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

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

// ============================================================================
// Claude analysis (Anthropic API)
// ============================================================================

async function claudeAnalyze(
  apiKey: string,
  transcription: string,
  catalogue: any[],
  memories: any[],
  region: string | null,
  entreprise: any,
): Promise<any> {
  const catalogueStr = catalogue.length > 0
    ? catalogue.map((p: any) => `[CAT:${p.id}] ${p.nom} | ${p.unite} | ${p.prix}\u20AC HT`).join('\n')
    : 'Aucun catalogue enregistre \u2014 genere des suggestions avec prix marche.';

  const memoriesStr = memories.length > 0
    ? memories.map((m: any) => `\u2022 ${m.key}: ${JSON.stringify(m.value)}`).join('\n')
    : 'Aucune memoire enregistree.';

  const regionStr = region
    ? `Region chantier detectee : ${region}. Adapte les prix a cette region.`
    : '';

  const systemPrompt = `Tu es un assistant expert BTP qui genere des devis professionnels pour les artisans francais. Tu es precis, concis et oriente metier.

=== CONTEXTE ARTISAN ===
Entreprise : ${entreprise?.nom || 'Non renseigne'}
Localisation : ${entreprise?.ville || 'France'}
TVA par defaut : ${entreprise?.tvaDefaut || 20}%
${regionStr}

=== CATALOGUE DE PRESTATIONS (PRIORITE ABSOLUE) ===
${catalogueStr}

=== MEMOIRES ARTISAN ===
${memoriesStr}

=== INSTRUCTIONS ===
1. NETTOIE la transcription :
   - Supprime mots parasites : "voila", "euh", "donc", "bon", "ben"
   - Corrige homophones BTP : "fil a 5" -> "fil 2,5mm2", "C dix" -> "C10", "BA treize" -> "BA13"
   - Ignore les instructions meta ("faudrait que tu trouves", "prepare-moi")
   - Extrais uniquement les elements techniques

2. GENERE les postes du devis :
   - Cherche d'abord dans le CATALOGUE -> utilise [CAT:id] si trouve
   - Utilise les MEMOIRES pour les preferences materiaux/tarifs
   - Si absent du catalogue -> genere une suggestion avec prix marche [SUGGESTION]
   - Note les elements non interpretables [NON_COMPRIS]

3. RETOURNE ce JSON strict (rien d'autre) :
{
  "cleanedTranscription": "version nettoyee",
  "summary": "Resume 1 phrase max 15 mots",
  "detectedLocation": "ville si mentionnee ou null",
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
      "notes": "Reference detectee"
    }
  ],
  "unrecognized": ["elements non compris"],
  "suggestedMemories": [
    { "key": "nom_preference", "value": { "detail": "valeur" }, "type": "material" }
  ]
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Transcription a analyser :\n"${transcription}"` },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[devis-ia] Anthropic API error:', errText);
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text || '';

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in Claude response');
  return JSON.parse(jsonMatch[0]);
}

// ============================================================================
// Claude refine (Anthropic API)
// ============================================================================

async function claudeRefine(
  apiKey: string,
  message: string,
  currentLines: any[],
): Promise<{ updatedLines: any[]; explanation: string }> {
  const systemPrompt = `Tu es un assistant expert BTP. L'utilisateur affine un devis genere par IA.
Voici les postes actuels du devis :
${JSON.stringify(currentLines, null, 2)}

L'utilisateur va te demander de modifier, ajouter ou supprimer des postes.
Retourne TOUJOURS un JSON strict :
{
  "updatedLines": [/* tableau complet des lignes mises a jour */],
  "explanation": "Explication courte de ce qui a change"
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[devis-ia] Anthropic refine error:', errText);
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in Claude refine response');
  return JSON.parse(jsonMatch[0]);
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
        JSON.stringify({ error: 'Non authentifie' }),
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
        JSON.stringify({ error: 'Non authentifie' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let result: any;

    switch (action) {
      case 'transcribe': {
        const openaiKey = getOpenAIKey();
        const { audio } = params;
        if (!audio) throw new Error('audio (base64) requis');
        const text = await whisperTranscribe(openaiKey, audio);
        result = { text };
        break;
      }

      case 'analyze': {
        const anthropicKey = getAnthropicKey();
        const { transcription, catalogue, memories, region, entreprise } = params;
        if (!transcription) throw new Error('transcription requise');
        result = await claudeAnalyze(
          anthropicKey,
          transcription,
          catalogue || [],
          memories || [],
          region || null,
          entreprise || {},
        );

        // Persist analysis to Supabase
        try {
          const totalHT = (result.lines || []).reduce(
            (s: number, l: any) => s + (l.totalHT || (l.qty || 0) * (l.puHT || 0)),
            0,
          );

          await userClient.from('ia_analyses').insert({
            user_id: user.id,
            source: 'text',
            description: result.summary || transcription.substring(0, 200),
            lignes: result.lines || [],
            confiance: result.confidence || 0,
            confiance_factors: null,
            total_ht: totalHT,
            mode: 'ai',
            statut: 'terminee',
            notes: result.unrecognized?.length
              ? `Elements non compris: ${result.unrecognized.join(', ')}`
              : null,
          });
        } catch (dbErr) {
          // Non-blocking — analysis still returned even if persistence fails
          console.error('[devis-ia] Failed to persist analysis:', dbErr);
        }

        break;
      }

      case 'refine': {
        const anthropicKey = getAnthropicKey();
        const { message, currentLines } = params;
        if (!message) throw new Error('message requis');
        result = await claudeRefine(anthropicKey, message, currentLines || []);
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
    console.error('[devis-ia] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
