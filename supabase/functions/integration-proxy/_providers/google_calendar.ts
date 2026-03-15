/**
 * Google Calendar Provider Adapter
 *
 * Bidirectional sync between BatiGesti events and Google Calendar.
 * OAuth2 flow managed by parent integration-proxy.
 *
 * Capabilities: sync_events, import_events
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface GoogleCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  errors: string[];
  details: Record<string, any>;
}

interface BatiGestiEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  type: string;
  description?: string;
  lieu?: string;
  employeId?: string;
  chantierId?: string;
  clientId?: string;
}

// ── API Client ───────────────────────────────────────────────────────────────

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

async function googleCalendarRequest(
  endpoint: string,
  credentials: GoogleCredentials,
  options: RequestInit = {},
): Promise<any> {
  const response = await fetch(`${GOOGLE_CALENDAR_API}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[GOOGLE_CALENDAR] API error ${response.status}:`, errorText);

    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }
    throw new Error(`Erreur API Google Calendar: ${response.status}`);
  }

  if (response.status === 204) return {};
  return response.json();
}

// ── Token Refresh ────────────────────────────────────────────────────────────

async function refreshGoogleToken(
  supabase: any,
  userId: string,
  integrationId: string,
  refreshToken: string,
): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar non configuré sur le serveur');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error('Impossible de rafraîchir le token Google');
  }

  const tokens = await response.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Update Vault with new access token
  await supabase.rpc('store_integration_credentials', {
    p_provider: 'google_calendar',
    p_access_token: tokens.access_token,
    p_refresh_token: refreshToken,
    p_token_expires_at: expiresAt,
    p_scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });

  return tokens.access_token;
}

// ── Converters ───────────────────────────────────────────────────────────────

function batiGestiToGoogleEvent(event: BatiGestiEvent): any {
  const startDate = event.date;
  const startTime = event.time || '09:00';
  const endTime = event.endTime || addHour(startTime);

  const googleEvent: any = {
    summary: event.title,
    description: [
      event.description || '',
      `[BatiGesti] Type: ${event.type}`,
      event.chantierId ? `Chantier: ${event.chantierId}` : '',
    ].filter(Boolean).join('\n'),
    start: {
      dateTime: `${startDate}T${startTime}:00`,
      timeZone: 'Europe/Paris',
    },
    end: {
      dateTime: `${startDate}T${endTime}:00`,
      timeZone: 'Europe/Paris',
    },
    extendedProperties: {
      private: {
        batigesti_id: event.id,
        batigesti_type: event.type,
      },
    },
  };

  if (event.lieu) {
    googleEvent.location = event.lieu;
  }

  return googleEvent;
}

function googleEventToBatiGesti(googleEvent: any, userId: string): Partial<BatiGestiEvent> {
  const start = googleEvent.start?.dateTime || googleEvent.start?.date;
  const end = googleEvent.end?.dateTime || googleEvent.end?.date;

  let date = '';
  let time = '';
  let endTime = '';

  if (start?.includes('T')) {
    date = start.split('T')[0];
    time = start.split('T')[1]?.substring(0, 5) || '';
  } else {
    date = start || '';
  }

  if (end?.includes('T')) {
    endTime = end.split('T')[1]?.substring(0, 5) || '';
  }

  return {
    title: googleEvent.summary || 'Événement Google',
    date,
    time,
    endTime,
    type: mapGoogleEventType(googleEvent),
    description: cleanDescription(googleEvent.description),
    lieu: googleEvent.location,
  };
}

function mapGoogleEventType(googleEvent: any): string {
  const summary = (googleEvent.summary || '').toLowerCase();
  if (summary.includes('chantier') || summary.includes('visite')) return 'chantier';
  if (summary.includes('rdv') || summary.includes('rendez')) return 'rdv';
  if (summary.includes('livraison') || summary.includes('commande')) return 'livraison';
  return 'rdv';
}

function cleanDescription(desc?: string): string {
  if (!desc) return '';
  // Remove BatiGesti metadata from description
  return desc.split('\n')
    .filter(line => !line.startsWith('[BatiGesti]'))
    .join('\n')
    .trim();
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const newH = Math.min(h + 1, 23);
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Sync Handlers ────────────────────────────────────────────────────────────

/**
 * Push BatiGesti events to Google Calendar
 */
async function syncEventsPush(
  supabase: any,
  userId: string,
  integrationId: string,
  credentials: GoogleCredentials,
  calendarId: string = 'primary',
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    details: { pushed: [] as string[], updated: [] as string[] },
  };

  // Get BatiGesti events from the last 30 days + next 90 days
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 90);

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('date', dateFrom.toISOString().split('T')[0])
    .lte('date', dateTo.toISOString().split('T')[0]);

  if (error) {
    throw new Error(`Erreur lecture événements: ${error.message}`);
  }

  if (!events?.length) return result;

  // Get existing mappings
  const { data: mappings } = await supabase
    .from('integration_entity_map')
    .select('*')
    .eq('integration_id', integrationId)
    .eq('local_entity_type', 'event');

  const mappingsByLocalId = new Map(
    (mappings || []).map((m: any) => [m.local_entity_id, m]),
  );

  for (const event of events) {
    try {
      const googleEvent = batiGestiToGoogleEvent(event);
      const existing = mappingsByLocalId.get(event.id);

      // Check if event has changed since last sync
      const currentHash = JSON.stringify({ title: event.title, date: event.date, time: event.time });

      if (existing) {
        if (existing.sync_hash === currentHash) continue; // No changes

        // Update existing Google event
        await googleCalendarRequest(
          `/calendars/${calendarId}/events/${existing.remote_entity_id}`,
          credentials,
          { method: 'PUT', body: JSON.stringify(googleEvent) },
        );

        // Update mapping hash
        await supabase
          .from('integration_entity_map')
          .update({ sync_hash: currentHash, last_synced_at: new Date().toISOString() })
          .eq('id', existing.id);

        result.itemsSynced++;
        (result.details.updated as string[]).push(event.title);
      } else {
        // Create new Google event
        const created = await googleCalendarRequest(
          `/calendars/${calendarId}/events`,
          credentials,
          { method: 'POST', body: JSON.stringify(googleEvent) },
        );

        // Store mapping
        await supabase.from('integration_entity_map').insert({
          user_id: userId,
          integration_id: integrationId,
          local_entity_type: 'event',
          local_entity_id: event.id,
          remote_entity_id: created.id,
          remote_entity_type: 'google_event',
          remote_entity_url: created.htmlLink,
          sync_hash: currentHash,
          last_synced_at: new Date().toISOString(),
        });

        result.itemsSynced++;
        (result.details.pushed as string[]).push(event.title);
      }
    } catch (err: any) {
      result.itemsFailed++;
      result.errors.push(`Event "${event.title}": ${err.message}`);
    }
  }

  result.success = result.itemsFailed === 0;
  return result;
}

/**
 * Pull Google Calendar events to BatiGesti
 */
async function syncEventsPull(
  supabase: any,
  userId: string,
  integrationId: string,
  credentials: GoogleCredentials,
  calendarId: string = 'primary',
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    details: { pulled: [] as string[] },
  };

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 7);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 90);

  try {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100',
    });

    const data = await googleCalendarRequest(
      `/calendars/${calendarId}/events?${params}`,
      credentials,
    );

    const googleEvents = data.items || [];

    // Get existing mappings by remote ID
    const { data: mappings } = await supabase
      .from('integration_entity_map')
      .select('remote_entity_id')
      .eq('integration_id', integrationId)
      .eq('local_entity_type', 'event');

    const syncedRemoteIds = new Set(
      (mappings || []).map((m: any) => m.remote_entity_id),
    );

    for (const googleEvent of googleEvents) {
      // Skip events already synced or created by BatiGesti
      if (syncedRemoteIds.has(googleEvent.id)) continue;
      if (googleEvent.extendedProperties?.private?.batigesti_id) continue;

      try {
        const batiEvent = googleEventToBatiGesti(googleEvent, userId);

        const { data: created, error: insertErr } = await supabase
          .from('events')
          .insert({
            user_id: userId,
            ...batiEvent,
            source: 'google_calendar',
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        await supabase.from('integration_entity_map').insert({
          user_id: userId,
          integration_id: integrationId,
          local_entity_type: 'event',
          local_entity_id: created.id,
          remote_entity_id: googleEvent.id,
          remote_entity_type: 'google_event',
          remote_entity_url: googleEvent.htmlLink,
          last_synced_at: new Date().toISOString(),
        });

        result.itemsSynced++;
        (result.details.pulled as string[]).push(googleEvent.summary || 'Sans titre');
      } catch (err: any) {
        result.itemsFailed++;
        result.errors.push(`Google event "${googleEvent.summary}": ${err.message}`);
      }
    }
  } catch (err: any) {
    if (err.message === 'TOKEN_EXPIRED') throw err;
    result.errors.push(err.message);
    result.success = false;
  }

  return result;
}

// ── Main Export ──────────────────────────────────────────────────────────────

export async function handleGoogleCalendarSync(
  supabase: any,
  userId: string,
  integrationId: string,
  credentials: GoogleCredentials,
  direction: string,
  entityType?: string,
  config?: Record<string, any>,
): Promise<SyncResult> {
  const calendarId = config?.calendarId || 'primary';

  const results: SyncResult = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    details: {},
  };

  try {
    // Handle token refresh if needed
    let activeToken = credentials.accessToken;
    if (credentials.expiresAt && new Date(credentials.expiresAt) <= new Date()) {
      if (!credentials.refreshToken) {
        throw new Error('Token expiré et pas de refresh token disponible');
      }
      activeToken = await refreshGoogleToken(
        supabase, userId, integrationId, credentials.refreshToken,
      );
      credentials.accessToken = activeToken;
    }

    if (direction === 'push' || direction === 'bidirectional') {
      const pushResult = await syncEventsPush(supabase, userId, integrationId, credentials, calendarId);
      results.itemsSynced += pushResult.itemsSynced;
      results.itemsFailed += pushResult.itemsFailed;
      results.errors.push(...pushResult.errors);
      results.details.push = pushResult.details;
    }

    if (direction === 'pull' || direction === 'bidirectional') {
      const pullResult = await syncEventsPull(supabase, userId, integrationId, credentials, calendarId);
      results.itemsSynced += pullResult.itemsSynced;
      results.itemsFailed += pullResult.itemsFailed;
      results.errors.push(...pullResult.errors);
      results.details.pull = pullResult.details;
    }

    results.success = results.itemsFailed === 0;
  } catch (err: any) {
    results.success = false;
    results.errors.push(err.message);
  }

  return results;
}

export async function listGoogleCalendars(
  credentials: GoogleCredentials,
): Promise<Array<{ id: string; summary: string; primary: boolean }>> {
  const data = await googleCalendarRequest('/users/me/calendarList', credentials);
  return (data.items || []).map((cal: any) => ({
    id: cal.id,
    summary: cal.summary,
    primary: cal.primary || false,
  }));
}

export async function validateGoogleCalendarConnection(
  credentials: GoogleCredentials,
): Promise<{ valid: boolean; accountName?: string; error?: string }> {
  try {
    const data = await googleCalendarRequest('/users/me/calendarList?maxResults=1', credentials);
    const primary = (data.items || []).find((c: any) => c.primary);
    return {
      valid: true,
      accountName: primary?.summary || 'Google Calendar',
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
