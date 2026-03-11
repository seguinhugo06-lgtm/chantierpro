/**
 * track-relance — Supabase Edge Function
 *
 * Handles relance tracking: email opens, link clicks, and unsubscribe requests.
 *
 * Routes:
 *   GET /track-relance?action=open&token=UUID     → Tracking pixel (1x1 GIF), updates opened_at
 *   GET /track-relance?action=click&token=UUID&url=...  → Updates clicked_at, redirects to URL
 *   GET /track-relance?action=unsubscribe&token=UUID    → Creates exclusion, shows confirmation
 *
 * Environment variables:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — auto-provided
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// 1x1 transparent GIF pixel
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate unsubscribe confirmation HTML page
 */
function buildUnsubscribePage(success: boolean, entrepriseName?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Désinscription${entrepriseName ? ` - ${entrepriseName}` : ''}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 400px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #1a1a1a; font-size: 20px; margin: 0 0 12px; }
    p { color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; }
    .note { margin-top: 16px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    ${success ? `
      <div class="icon">✅</div>
      <h1>Désinscription confirmée</h1>
      <p>Vous ne recevrez plus de relances automatiques${entrepriseName ? ` de ${entrepriseName}` : ''}.</p>
      <p class="note">Si vous pensez qu'il s'agit d'une erreur, contactez directement l'entreprise.</p>
    ` : `
      <div class="icon">⚠️</div>
      <h1>Lien invalide</h1>
      <p>Ce lien de désinscription est invalide ou a déjà été utilisé.</p>
    `}
  </div>
</body>
</html>`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Support both URL param style and path style:
    // /track-relance?action=open&token=UUID
    // /track-relance/open/UUID
    let action = url.searchParams.get('action');
    let token = url.searchParams.get('token');
    let redirectUrl = url.searchParams.get('url');

    // Path-style routing: /track-relance/open/UUID
    if (!action && pathParts.length >= 2) {
      const funcIdx = pathParts.indexOf('track-relance');
      if (funcIdx >= 0 && pathParts[funcIdx + 1]) {
        action = pathParts[funcIdx + 1];
        token = pathParts[funcIdx + 2] || null;
      }
    }

    if (!token || !action) {
      return new Response('Missing parameters', { status: 400, headers: corsHeaders });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return new Response('Invalid token', { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the execution by tracking token
    const { data: execution, error: findError } = await supabase
      .from('relance_executions')
      .select('id, user_id, organization_id, document_id, client_id, opened_at, clicked_at')
      .eq('tracking_token', token)
      .maybeSingle();

    if (findError || !execution) {
      if (action === 'open') {
        // Return pixel anyway (don't break email rendering)
        return new Response(TRANSPARENT_GIF, {
          headers: { ...corsHeaders, 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
        });
      }
      if (action === 'unsubscribe') {
        return new Response(buildUnsubscribePage(false), {
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return new Response('Not found', { status: 404, headers: corsHeaders });
    }

    // Handle each action
    switch (action) {
      case 'open': {
        // Update opened_at (only if first open)
        if (!execution.opened_at) {
          await supabase
            .from('relance_executions')
            .update({
              opened_at: new Date().toISOString(),
              status: 'opened',
            })
            .eq('id', execution.id);
        }

        return new Response(TRANSPARENT_GIF, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }

      case 'click': {
        // Update clicked_at (only if first click)
        if (!execution.clicked_at) {
          await supabase
            .from('relance_executions')
            .update({
              clicked_at: new Date().toISOString(),
              status: 'clicked',
            })
            .eq('id', execution.id);
        }

        // Also mark as opened if not already
        if (!execution.opened_at) {
          await supabase
            .from('relance_executions')
            .update({ opened_at: new Date().toISOString() })
            .eq('id', execution.id);
        }

        // Redirect to target URL
        if (redirectUrl) {
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, 'Location': redirectUrl },
          });
        }

        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      case 'unsubscribe': {
        // Create an exclusion for the client
        if (execution.client_id) {
          // Check if exclusion already exists
          const { data: existing } = await supabase
            .from('relance_exclusions')
            .select('id')
            .eq('client_id', execution.client_id)
            .eq('scope', 'client')
            .eq('reason', 'unsubscribe')
            .maybeSingle();

          if (!existing) {
            await supabase
              .from('relance_exclusions')
              .insert({
                user_id: execution.user_id,
                organization_id: execution.organization_id,
                scope: 'client',
                client_id: execution.client_id,
                reason: 'unsubscribe',
                notes: `Désinscription via lien email le ${new Date().toLocaleDateString('fr-FR')}`,
                created_by: 'unsubscribe_link',
              });
          }
        }

        // Get entreprise name for the confirmation page
        let entrepriseName: string | undefined;
        if (execution.user_id) {
          const { data: ent } = await supabase
            .from('entreprise')
            .select('nom')
            .eq('user_id', execution.user_id)
            .maybeSingle();
          entrepriseName = ent?.nom;
        }

        return new Response(buildUnsubscribePage(true, entrepriseName), {
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      default:
        return new Response('Unknown action', { status: 400, headers: corsHeaders });
    }
  } catch (error: any) {
    console.error('track-relance error:', error);

    // For open action, always return the pixel
    if (new URL(req.url).searchParams.get('action') === 'open') {
      return new Response(TRANSPARENT_GIF, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
      });
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
