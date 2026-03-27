import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * sync-google-reviews — Edge Function pour synchroniser les avis Google
 *
 * Actions: sync_reviews, generate_response
 *
 * Requires: Google Business Profile API access token stored in avis_google_config
 * Can be called via cron (every 4h) or manually
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (action) {
      case 'sync_reviews': {
        const { entreprise_id } = params;

        if (!entreprise_id) {
          return new Response(
            JSON.stringify({ error: 'entreprise_id requis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get Google config for this entreprise
        const { data: config, error: configError } = await supabase
          .from('avis_google_config')
          .select('*')
          .eq('entreprise_id', entreprise_id)
          .single();

        if (configError || !config?.google_place_id || !config?.google_access_token) {
          return new Response(
            JSON.stringify({
              error: 'Configuration Google Business Profile manquante.',
              hint: 'Configurez votre Place ID et token dans Marketing > Avis > Configuration',
              needs_setup: true,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch reviews from Google Business Profile API
        const googleUrl = `https://mybusiness.googleapis.com/v4/accounts/me/locations/${config.google_place_id}/reviews`;
        const googleResponse = await fetch(googleUrl, {
          headers: {
            'Authorization': `Bearer ${config.google_access_token}`,
          },
        });

        if (!googleResponse.ok) {
          const errorBody = await googleResponse.text();
          console.error('[sync-google-reviews] Google API error:', errorBody);
          return new Response(
            JSON.stringify({
              error: 'Erreur API Google Business Profile',
              status: googleResponse.status,
              details: errorBody,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { reviews = [] } = await googleResponse.json();

        // Upsert reviews into Supabase
        let newCount = 0;
        for (const review of reviews) {
          const { data: existing } = await supabase
            .from('avis_google')
            .select('id')
            .eq('google_review_id', review.reviewId)
            .single();

          if (!existing) {
            const { error: insertError } = await supabase
              .from('avis_google')
              .insert({
                entreprise_id,
                google_review_id: review.reviewId,
                google_author: review.reviewer?.displayName || 'Anonyme',
                rating: review.starRating === 'FIVE' ? 5
                  : review.starRating === 'FOUR' ? 4
                  : review.starRating === 'THREE' ? 3
                  : review.starRating === 'TWO' ? 2
                  : 1,
                text: review.comment || '',
                date: review.createTime || new Date().toISOString(),
                responded: !!review.reviewReply,
                published_response: review.reviewReply?.comment || null,
                google_sync_at: new Date().toISOString(),
              });

            if (!insertError) newCount++;
          }
        }

        // Update sync timestamp
        await supabase
          .from('avis_google_config')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('entreprise_id', entreprise_id);

        console.log(`[sync-google-reviews] Synced ${reviews.length} reviews, ${newCount} new`);

        return new Response(
          JSON.stringify({
            success: true,
            total: reviews.length,
            new: newCount,
            synced_at: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'generate_response': {
        const { review_id, tone = 'professionnel' } = params;

        if (!review_id) {
          return new Response(
            JSON.stringify({ error: 'review_id requis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get review
        const { data: review, error: reviewError } = await supabase
          .from('avis_google')
          .select('*')
          .eq('id', review_id)
          .single();

        if (reviewError || !review) {
          return new Response(
            JSON.stringify({ error: 'Avis non trouvé' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate response based on rating (template-based for now, can be upgraded to Claude API later)
        let suggestion = '';
        const author = review.google_author || review.client_name || 'client';

        if (review.rating >= 4) {
          suggestion = tone === 'amical'
            ? `Merci beaucoup ${author} ! 🙏 Votre retour nous fait très plaisir. C'est un vrai bonheur de travailler avec des clients comme vous. N'hésitez pas à nous recommander !`
            : `Merci ${author} pour votre excellent retour. Votre satisfaction est notre priorité. Nous espérons avoir le plaisir de travailler à nouveau avec vous.`;
        } else if (review.rating === 3) {
          suggestion = `Merci ${author} pour votre avis. Nous prenons note de vos remarques et travaillons constamment à améliorer nos services. N'hésitez pas à nous contacter pour en discuter.`;
        } else {
          suggestion = `Merci ${author} pour votre retour. Nous sommes désolés que l'expérience n'ait pas été à la hauteur de vos attentes. Nous aimerions en discuter avec vous pour comprendre ce qui n'a pas fonctionné. Contactez-nous directement.`;
        }

        // Save suggestion
        await supabase
          .from('avis_google')
          .update({
            ai_suggested_response: suggestion,
            ai_response_status: 'pending',
          })
          .eq('id', review_id);

        return new Response(
          JSON.stringify({
            success: true,
            suggestion,
            review_id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Action inconnue: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[sync-google-reviews] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
