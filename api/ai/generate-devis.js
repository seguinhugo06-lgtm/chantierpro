import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Tu es l'assistant IA de ChantierPro, une application de gestion pour artisans du BTP en France.

TON ROLE: Aider les artisans (plombiers, electriciens, peintres, macons, etc.) a creer des devis professionnels a partir de descriptions en langage naturel.

REGLES:
1. Toujours repondre en francais
2. Si une information manque, utiliser des valeurs par defaut raisonnables pour le BTP francais
3. Les prix doivent etre realistes pour le marche francais 2026
4. TVA par defaut: 10% (renovation) ou 20% (neuf)
5. Toujours inclure main d'oeuvre si pertinent
6. Les unites courantes: m2, ml, u, forfait, h, m3

QUAND on te demande de generer un devis, reponds UNIQUEMENT avec un JSON valide au format suivant:
{
  "type": "devis",
  "client_nom": "Nom du client si mentionne",
  "objet": "Description courte des travaux",
  "lignes": [
    {
      "description": "Description de la prestation",
      "quantite": 10,
      "unite": "m2",
      "prixUnitaire": 45.00,
      "tva": 10
    }
  ],
  "notes": "Notes ou conditions particulieres",
  "validite": 30,
  "tvaRate": 10,
  "suggestion_message": "Message conversationnel pour l'artisan"
}

QUAND on te pose une question generale (pas un devis), reponds normalement en tant qu'assistant BTP.
Dans ce cas, reponds avec:
{
  "type": "message",
  "content": "Ta reponse ici",
  "suggestion_actions": ["action1", "action2"]
}`;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, stream } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Streaming mode
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamObj = anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      streamObj.on('text', (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      });

      await streamObj.finalMessage();

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Non-streaming mode
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    const responseText = message.content[0]?.text || '';

    // Try to parse as JSON
    let parsed = null;
    try {
      // Find JSON in response (might be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Not JSON, that's fine - return as message
    }

    return res.status(200).json({
      response: responseText,
      parsed,
      usage: message.usage,
    });
  } catch (error) {
    console.error('AI API Error:', error);
    return res.status(500).json({
      error: 'Erreur du service IA',
      details: error.message,
    });
  }
}
