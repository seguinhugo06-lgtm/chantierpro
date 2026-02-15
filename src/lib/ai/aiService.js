/**
 * ChantierPro AI Service
 * Client-side service for communicating with Claude AI via Vercel serverless functions.
 * Handles both streaming and non-streaming responses.
 */

// API base URL - uses relative path on Vercel, configurable for dev
const API_BASE = import.meta.env.VITE_AI_API_URL || '/api/ai';

/**
 * Send a message to Claude and get a complete response
 */
export async function sendMessage(messages, options = {}) {
  const response = await fetch(`${API_BASE}/generate-devis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      stream: false,
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Send a message with streaming response
 * @param {Array} messages - Chat messages array
 * @param {Function} onChunk - Callback for each text chunk
 * @param {Function} onDone - Callback when stream completes
 * @param {Function} onError - Callback on error
 * @returns {AbortController} - Controller to cancel the stream
 */
export function streamMessage(messages, { onChunk, onDone, onError }) {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE}/generate-devis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, stream: true }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              onDone?.();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                onChunk?.(parsed.text);
              }
            } catch {
              // Skip invalid JSON chunks
            }
          }
        }
      }

      onDone?.();
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError?.(error);
      }
    }
  })();

  return controller;
}

/**
 * Analyze a photo for BTP estimation
 */
export async function analyzePhoto(imageBase64, mediaType = 'image/jpeg', context = '') {
  const response = await fetch(`${API_BASE}/analyze-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType, context }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Parse Claude's response to extract devis data
 */
export function parseDevisFromResponse(responseText) {
  try {
    let text = typeof responseText === 'string' ? responseText : JSON.stringify(responseText);

    // Strip markdown code blocks (```json ... ``` or ``` ... ```)
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      text = codeBlockMatch[1].trim();
    }

    // Extract JSON object from text (handles any surrounding text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { type: 'message', content: responseText };
    }

    const data = JSON.parse(jsonMatch[0]);

    if (data.type === 'devis' && data.lignes) {
      return {
        type: 'devis',
        data: {
          client_nom: data.client_nom || '',
          objet: data.objet || 'Nouveau devis',
          lignes: (data.lignes || []).map((l, i) => ({
            id: `ai-${i + 1}`,
            description: l.description || '',
            quantite: parseFloat(l.quantite) || 0,
            unite: l.unite || 'u',
            prixUnitaire: parseFloat(l.prixUnitaire || l.prix_unitaire || 0),
            tva: parseFloat(l.tva || data.tvaRate || 10),
            montant: (parseFloat(l.quantite) || 0) * parseFloat(l.prixUnitaire || l.prix_unitaire || 0),
          })),
          notes: data.notes || '',
          validite: data.validite || 30,
          tvaRate: data.tvaRate || 10,
        },
        message: data.suggestion_message || 'Voici votre devis.',
      };
    }
    if (data.type === 'message') {
      return {
        type: 'message',
        content: data.content || responseText,
        actions: data.suggestion_actions || [],
      };
    }
    return { type: 'message', content: responseText };
  } catch {
    return { type: 'message', content: responseText };
  }
}

/**
 * Convert photo analysis to devis line items
 */
export function photoAnalysisToDevisLignes(analysis) {
  if (!analysis?.travaux) return [];
  return analysis.travaux.map((t, i) => ({
    id: `photo-${i + 1}`,
    description: t.description,
    quantite: parseFloat(t.quantite) || 0,
    unite: t.unite || 'u',
    prixUnitaire: parseFloat(t.prix_estime) || 0,
    tva: 10,
    montant: (parseFloat(t.quantite) || 0) * (parseFloat(t.prix_estime) || 0),
  }));
}
