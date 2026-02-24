/**
 * Edge Function: ai-devis-analyse
 * Voice/text-to-devis proxy via Anthropic Claude API
 *
 * POST /functions/v1/ai-devis-analyse
 * Body: { transcript: string, catalogue?: Array }
 *
 * Deploy: supabase functions deploy ai-devis-analyse
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `Tu es un expert en devis BTP (bâtiment et travaux publics) en France.
Tu reçois la transcription vocale d'un artisan décrivant des travaux à réaliser.
Tu dois générer une liste structurée de postes de devis avec des prix réalistes du marché français.

RÈGLES :
- Extrais chaque poste de travail mentionné avec sa désignation claire et professionnelle
- Estime les quantités si elles ne sont pas explicitement mentionnées
- Les prix doivent être HT (hors taxes) et réalistes pour le marché français 2025-2026
- Les unités possibles sont : u, m², ml, m³, h, forfait, jour, kg, L, lot, ensemble
- Si le catalogue de l'artisan contient des articles similaires, utilise leurs prix en priorité
- Regroupe les travaux par corps de métier si possible
- Ajoute les fournitures ET la main d'œuvre séparément quand c'est pertinent

IMPORTANT : Réponds UNIQUEMENT avec du JSON valide, sans texte avant ni après.

Format de réponse :
{
  "lignes": [
    { "designation": "Description du poste", "quantite": 1, "unite": "m²", "prixUnitaire": 45.00 }
  ],
  "description": "Résumé court des travaux (1 phrase)",
  "categorie": "Catégorie principale (ex: Plomberie, Maçonnerie, Électricité...)",
  "surfaceEstimee": null,
  "confiance": 80,
  "notes": "Remarques ou hypothèses faites pour l'estimation"
}`;

// ============================================================================
// Helpers
// ============================================================================

function condenseCatalogue(catalogue: any[]): string {
  if (!catalogue || catalogue.length === 0) return '';

  // Prioritize favorites, then limit to 100 items
  const sorted = [...catalogue].sort((a, b) => {
    if (a.favori && !b.favori) return -1;
    if (!a.favori && b.favori) return 1;
    return 0;
  });

  const items = sorted.slice(0, 100).map(item => ({
    nom: item.nom || item.name,
    prix: item.prix || item.price,
    unite: item.unite || item.unit || 'u',
    categorie: item.categorie || item.category || '',
  }));

  return `\n\nCatalogue de l'artisan (utilise ces prix en priorité si un article correspond) :\n${JSON.stringify(items, null, 0)}`;
}

function parseClaudeResponse(text: string): any {
  // Try direct JSON parse
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try to find JSON object in text
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      return JSON.parse(objMatch[0]);
    }
    throw new Error('Impossible de parser la réponse IA');
  }
}

// ============================================================================
// Main handler
// ============================================================================

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user via Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check API key configured
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Clé API Anthropic non configurée. Contactez le support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const { transcript, catalogue = [] } = await req.json();

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Transcription trop courte (minimum 10 caractères)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build user message
    const catalogueContext = condenseCatalogue(catalogue);
    const userMessage = `Transcription vocale de l'artisan :\n"${transcript.trim()}"${catalogueContext}`;

    // Call Claude API
    const callClaude = async (retry = false): Promise<any> => {
      const messages: any[] = [{ role: 'user', content: userMessage }];

      if (retry) {
        messages.push(
          { role: 'assistant', content: 'Je vais générer le JSON structuré.' },
          { role: 'user', content: 'Ta réponse précédente n\'était pas du JSON valide. Réponds UNIQUEMENT avec du JSON valide, sans aucun texte avant ou après.' }
        );
      }

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API error:', response.status, errorText);

        if (response.status === 429) {
          throw new Error('Trop de requêtes. Réessayez dans quelques instants.');
        }
        if (response.status === 529) {
          throw new Error('Service IA temporairement surchargé. Réessayez dans un moment.');
        }
        throw new Error(`Erreur API IA (${response.status})`);
      }

      const data = await response.json();
      const content = data?.content?.[0]?.text;

      if (!content) {
        throw new Error('Réponse vide de l\'IA');
      }

      return content;
    };

    // First attempt
    let result: any;
    try {
      const text = await callClaude(false);
      result = parseClaudeResponse(text);
    } catch (parseError) {
      // Retry once with stricter instruction
      console.warn('First parse failed, retrying:', parseError);
      try {
        const text = await callClaude(true);
        result = parseClaudeResponse(text);
      } catch (retryError) {
        return new Response(
          JSON.stringify({ error: 'L\'IA n\'a pas pu générer un devis structuré. Réessayez avec une description plus détaillée.' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate and normalize result
    if (!result.lignes || !Array.isArray(result.lignes) || result.lignes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun poste de travail détecté. Décrivez plus précisément les travaux.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize each line
    const lignes = result.lignes.map((l: any, i: number) => ({
      id: `ia_${i}_${Date.now()}`,
      designation: String(l.designation || l.description || `Poste ${i + 1}`),
      quantite: Math.max(0.01, Number(l.quantite) || 1),
      unite: String(l.unite || 'u'),
      prixUnitaire: Math.max(0, Math.round((Number(l.prixUnitaire) || 0) * 100) / 100),
      totalHT: 0, // Will be recalculated
    }));

    // Calculate totals
    lignes.forEach((l: any) => {
      l.totalHT = Math.round(l.quantite * l.prixUnitaire * 100) / 100;
    });

    const totalHT = lignes.reduce((sum: number, l: any) => sum + l.totalHT, 0);

    return new Response(
      JSON.stringify({
        lignes,
        description: result.description || transcript.substring(0, 100),
        categorie: result.categorie || 'Général',
        surfaceEstimee: result.surfaceEstimee || null,
        confiance: Math.min(100, Math.max(0, Number(result.confiance) || 75)),
        totalHT: Math.round(totalHT * 100) / 100,
        notes: result.notes || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('ai-devis-analyse error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur interne du service IA' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
