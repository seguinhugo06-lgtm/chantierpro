/**
 * ical-export — Public iCal feed endpoint
 *
 * Actions (authenticated):
 *   get_url → returns (or creates) the iCal subscription URL
 *   regenerate_token → revokes old token, creates new one
 *
 * Public endpoint:
 *   GET /ical-export?token=xxx → returns .ics file
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── CORS ────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// ── iCal Generation ─────────────────────────────────────────────────────────

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatICalDate(dateStr: string, timeStr?: string): string {
  const date = dateStr.replace(/-/g, '');
  if (timeStr) {
    const time = timeStr.replace(/:/g, '').substring(0, 4) + '00';
    return `${date}T${time}`;
  }
  return date;
}

function generateICalFeed(events: any[], calendarName: string): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BatiGesti//Agenda//FR',
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-TIMEZONE:Europe/Paris',
    // Timezone definition
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Paris',
    'BEGIN:STANDARD',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
  ];

  for (const event of events) {
    if (!event.date) continue;

    const uid = `${event.id}@batigesti.app`;
    const summary = escapeICalText(event.title || 'Événement');
    const dtStart = formatICalDate(event.date, event.time);
    const dtEnd = event.end_time
      ? formatICalDate(event.date, event.end_time)
      : event.time
        ? formatICalDate(event.date, addHour(event.time))
        : formatICalDate(event.date);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);

    if (event.time) {
      lines.push(`DTSTART;TZID=Europe/Paris:${dtStart}`);
      lines.push(`DTEND;TZID=Europe/Paris:${dtEnd}`);
    } else {
      // All-day event
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    }

    lines.push(`SUMMARY:${summary}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    }
    if (event.lieu) {
      lines.push(`LOCATION:${escapeICalText(event.lieu)}`);
    }

    // Type as category
    if (event.type) {
      lines.push(`CATEGORIES:${escapeICalText(event.type)}`);
    }

    // Timestamps
    const now = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 15) + 'Z';
    lines.push(`DTSTAMP:${now}`);
    if (event.created_at) {
      const created = new Date(event.created_at).toISOString().replace(/[-:.]/g, '').substring(0, 15) + 'Z';
      lines.push(`CREATED:${created}`);
    }
    if (event.updated_at) {
      const updated = new Date(event.updated_at).toISOString().replace(/[-:.]/g, '').substring(0, 15) + 'Z';
      lines.push(`LAST-MODIFIED:${updated}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

// ── Token Management ────────────────────────────────────────────────────────

async function getOrCreateToken(supabase: any, userId: string): Promise<string> {
  // Check for existing token in integrations table
  const { data: integration } = await supabase
    .from('integrations')
    .select('config')
    .eq('user_id', userId)
    .eq('provider', 'ical')
    .single();

  if (integration?.config?.ical_token) {
    return integration.config.ical_token;
  }

  // Generate new token
  const token = crypto.randomUUID() + '-' + crypto.randomUUID().split('-')[0];

  // Upsert integration record
  await supabase.from('integrations').upsert({
    user_id: userId,
    provider: 'ical',
    category: 'calendar',
    status: 'connected',
    config: { ical_token: token },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' });

  return token;
}

async function regenerateToken(supabase: any, userId: string): Promise<string> {
  const token = crypto.randomUUID() + '-' + crypto.randomUUID().split('-')[0];

  await supabase
    .from('integrations')
    .update({
      config: { ical_token: token },
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'ical');

  return token;
}

async function getUserIdFromToken(supabase: any, token: string): Promise<string | null> {
  const { data } = await supabase
    .from('integrations')
    .select('user_id')
    .eq('provider', 'ical')
    .eq('status', 'connected')
    .filter('config->>ical_token', 'eq', token)
    .single();

  return data?.user_id || null;
}

// ── MAIN HANDLER ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const supabase = getServiceClient();

  // ── Public GET endpoint: return .ics feed ──
  if (req.method === 'GET') {
    const token = url.searchParams.get('token');
    if (!token) {
      return new Response('Token requis', { status: 400 });
    }

    const userId = await getUserIdFromToken(supabase, token);
    if (!userId) {
      return new Response('Token invalide ou expiré', { status: 401 });
    }

    // Fetch events for the user (past 30 days + next 365 days)
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    const dateTo = new Date();
    dateTo.setDate(dateTo.getDate() + 365);

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('date', dateFrom.toISOString().split('T')[0])
      .lte('date', dateTo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('[ICAL-EXPORT] Events query error:', error);
      return new Response('Erreur serveur', { status: 500 });
    }

    // Generate iCal feed
    const icalContent = generateICalFeed(events || [], 'BatiGesti — Agenda');

    return new Response(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="batigesti-agenda.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...corsHeaders,
      },
    });
  }

  // ── Authenticated POST endpoints ──
  if (req.method === 'POST') {
    try {
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

      const { action } = await req.json();
      const baseUrl = Deno.env.get('SUPABASE_URL');

      if (action === 'get_url') {
        const token = await getOrCreateToken(supabase, user.id);
        return new Response(
          JSON.stringify({
            url: `${baseUrl}/functions/v1/ical-export?token=${token}`,
            token,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (action === 'regenerate_token') {
        const token = await regenerateToken(supabase, user.id);
        return new Response(
          JSON.stringify({
            url: `${baseUrl}/functions/v1/ical-export?token=${token}`,
            token,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ error: `Action inconnue: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );

    } catch (error: any) {
      console.error('[ICAL-EXPORT] Error:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Erreur interne' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});
