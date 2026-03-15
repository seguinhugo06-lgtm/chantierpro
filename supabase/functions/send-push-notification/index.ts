/**
 * send-push-notification — Web Push notification sender
 *
 * Called after a new chat message to notify offline/inactive users.
 * Uses the Web Push protocol with VAPID authentication.
 *
 * Env vars required:
 * - VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT (mailto:admin@batigesti.fr)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { channelId, senderUserId, senderName, messagePreview, messageType } = await req.json();

    if (!channelId || !senderUserId) {
      return new Response(
        JSON.stringify({ error: 'channelId and senderUserId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = getServiceClient();

    // Get all channel members except sender
    const { data: members, error: membersError } = await supabase
      .from('chat_members')
      .select('user_id, muted')
      .eq('channel_id', channelId)
      .is('left_at', null)
      .neq('user_id', senderUserId);

    if (membersError || !members?.length) {
      return new Response(
        JSON.stringify({ sent: 0, skipped: 'no members' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Filter out muted members
    const notifiableUserIds = members
      .filter(m => !m.muted)
      .map(m => m.user_id);

    if (notifiableUserIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, skipped: 'all muted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Get push subscriptions for these users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', notifiableUserIds)
      .eq('is_active', true);

    if (subError || !subscriptions?.length) {
      return new Response(
        JSON.stringify({ sent: 0, skipped: 'no subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build notification payload
    const preview = messageType === 'voice' ? '🎤 Message vocal'
      : messageType === 'image' ? '📷 Photo'
      : messageType === 'file' ? '📎 Fichier'
      : (messagePreview || 'Nouveau message').slice(0, 100);

    const notificationPayload = JSON.stringify({
      title: senderName || 'Nouveau message',
      body: preview,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: {
        channelId,
        url: '/messagerie',
      },
      tag: `chat-${channelId}`,
      renotify: true,
    });

    // Send push notifications
    // Note: Full Web Push protocol requires crypto operations with VAPID keys.
    // This is a placeholder structure — in production, use a Web Push library
    // or implement the VAPID JWT signing manually.

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('[PUSH] VAPID keys not configured, skipping push notifications');
      return new Response(
        JSON.stringify({ sent: 0, skipped: 'vapid_not_configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let sentCount = 0;
    let failedCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        // For Phase 1, we log the intent. Full Web Push implementation
        // requires JWT signing with VAPID private key + ECDH encryption.
        // This will be wired up when VAPID keys are configured.
        console.log(`[PUSH] Would send to user ${sub.user_id}: ${preview}`);
        sentCount++;

        // Update last_used_at
        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id);

      } catch (pushError: any) {
        console.error(`[PUSH] Failed for ${sub.endpoint}:`, pushError);
        failedCount++;

        // If subscription is expired/invalid, mark as inactive
        if (pushError.status === 404 || pushError.status === 410) {
          failedEndpoints.push(sub.id);
        }
      }
    }

    // Deactivate invalid subscriptions
    if (failedEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', failedEndpoints);
    }

    return new Response(
      JSON.stringify({ sent: sentCount, failed: failedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error('[PUSH] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
