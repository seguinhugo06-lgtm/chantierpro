import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mediaType = 'image/jpeg', context = '' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 data required' });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Tu es un expert BTP qui analyse des photos de chantier pour aider les artisans francais.

${context ? `Contexte supplementaire: ${context}\n` : ''}

Analyse cette photo et fournis une estimation detaillee pour un devis.

Reponds UNIQUEMENT en JSON valide:
{
  "type_piece": "Type de piece ou zone (ex: salle de bain, cuisine, facade...)",
  "surface_m2": 0,
  "etat": "bon | moyen | a_renover | a_demolir",
  "description_etat": "Description de l'etat actuel",
  "travaux": [
    {
      "description": "Description du travail",
      "quantite": 0,
      "unite": "m2",
      "prix_estime": 0,
      "categorie": "demolition | gros_oeuvre | plomberie | electricite | revetement | peinture | menuiserie | autre",
      "justification": "Pourquoi cette estimation"
    }
  ],
  "duree_jours": 0,
  "total_estime_ht": 0,
  "notes": "Observations particulieres, risques potentiels",
  "confiance": "haute | moyenne | faible",
  "suggestion_message": "Message conversationnel pour l'artisan"
}`,
          },
        ],
      }],
    });

    const responseText = message.content[0]?.text || '';

    let parsed = null;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Return raw text if JSON parsing fails
    }

    return res.status(200).json({
      response: responseText,
      analysis: parsed,
      usage: message.usage,
    });
  } catch (error) {
    console.error('Photo Analysis Error:', error);
    return res.status(500).json({
      error: 'Erreur analyse photo',
      details: error.message,
    });
  }
}
