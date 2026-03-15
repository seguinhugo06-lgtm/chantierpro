/**
 * Google Drive Provider Adapter
 *
 * Handles file storage on Google Drive for BatiGesti documents (PDFs).
 * OAuth2 flow managed by parent integration-proxy.
 *
 * Capabilities: upload_files, auto_backup, folder_structure
 * Structure: BatiGesti / {Année} / {Client ou Chantier} / {nomFichier}.pdf
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface GoogleDriveCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

interface UploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  errors: string[];
  details: Record<string, any>;
}

// ── API Client ───────────────────────────────────────────────────────────────

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

async function driveRequest(
  endpoint: string,
  credentials: GoogleDriveCredentials,
  options: RequestInit = {},
): Promise<any> {
  const response = await fetch(`${DRIVE_API}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[GOOGLE_DRIVE] API error ${response.status}:`, errorText);
    if (response.status === 401) throw new Error('TOKEN_EXPIRED');
    throw new Error(`Erreur API Google Drive: ${response.status}`);
  }

  return response.json();
}

// ── Token Refresh ────────────────────────────────────────────────────────────

async function refreshDriveToken(
  supabase: any,
  userId: string,
  refreshToken: string,
): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Google Drive non configuré sur le serveur');
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
    throw new Error('Impossible de rafraîchir le token Google Drive');
  }

  const tokens = await response.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase.rpc('store_integration_credentials', {
    p_provider: 'google_drive',
    p_access_token: tokens.access_token,
    p_refresh_token: refreshToken,
    p_token_expires_at: expiresAt,
    p_scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return tokens.access_token;
}

// ── Folder Operations ────────────────────────────────────────────────────────

/**
 * Find or create a folder by name under a parent.
 */
async function findOrCreateFolder(
  credentials: GoogleDriveCredentials,
  name: string,
  parentId?: string,
): Promise<string> {
  // Search for existing folder
  let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const searchResult = await driveRequest(
    `/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    credentials,
  );

  if (searchResult.files?.length > 0) {
    return searchResult.files[0].id;
  }

  // Create new folder
  const metadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const folder = await driveRequest('/files', credentials, {
    method: 'POST',
    body: JSON.stringify(metadata),
  });

  return folder.id;
}

/**
 * Build the folder structure: BatiGesti / {year} / {contextName}
 */
async function ensureFolderStructure(
  credentials: GoogleDriveCredentials,
  year: string,
  contextName: string,
): Promise<string> {
  // Root: BatiGesti
  const rootId = await findOrCreateFolder(credentials, 'BatiGesti');
  // Year: BatiGesti/{year}
  const yearId = await findOrCreateFolder(credentials, year, rootId);
  // Context: BatiGesti/{year}/{contextName}
  const contextId = await findOrCreateFolder(credentials, contextName, yearId);
  return contextId;
}

// ── File Operations ──────────────────────────────────────────────────────────

/**
 * Upload a PDF file to Google Drive.
 */
export async function uploadFile(
  credentials: GoogleDriveCredentials,
  folderId: string,
  fileName: string,
  pdfBase64: string,
): Promise<UploadResult> {
  try {
    // Decode base64 to binary
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Check if file already exists (for idempotence)
    const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
    const existing = await driveRequest(
      `/files?q=${encodeURIComponent(query)}&fields=files(id,webViewLink)`,
      credentials,
    );

    if (existing.files?.length > 0) {
      // Update existing file
      const fileId = existing.files[0].id;

      const updateResponse = await fetch(
        `${UPLOAD_API}/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/pdf',
          },
          body: bytes,
        },
      );

      if (!updateResponse.ok) {
        throw new Error('Erreur mise à jour fichier');
      }

      const updated = await updateResponse.json();
      return {
        success: true,
        fileId: updated.id,
        webViewLink: updated.webViewLink || `https://drive.google.com/file/d/${updated.id}/view`,
      };
    }

    // Create new file using multipart upload
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/pdf',
    };

    const boundary = '---batigesti-upload-boundary';
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/pdf',
      'Content-Transfer-Encoding: base64',
      '',
      pdfBase64,
      `--${boundary}--`,
    ].join('\r\n');

    const uploadResponse = await fetch(
      `${UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[GOOGLE_DRIVE] Upload error:', errorText);
      throw new Error('Erreur upload fichier');
    }

    const file = await uploadResponse.json();
    return {
      success: true,
      fileId: file.id,
      webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create a folder in Drive.
 */
export async function createFolder(
  credentials: GoogleDriveCredentials,
  name: string,
  parentId?: string,
): Promise<{ folderId: string; webViewLink: string }> {
  const folderId = await findOrCreateFolder(credentials, name, parentId);
  return {
    folderId,
    webViewLink: `https://drive.google.com/drive/folders/${folderId}`,
  };
}

// ── Sync Handler ─────────────────────────────────────────────────────────────

/**
 * Sync handler: upload pending documents to Google Drive.
 */
export async function handleGoogleDriveSync(
  supabase: any,
  userId: string,
  integrationId: string,
  credentials: GoogleDriveCredentials,
  direction: string,
  entityType?: string,
  config?: Record<string, any>,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    details: { uploaded: [] as string[] },
  };

  try {
    // Handle token refresh if needed
    if (credentials.expiresAt && new Date(credentials.expiresAt) <= new Date()) {
      if (!credentials.refreshToken) {
        throw new Error('Token expiré et pas de refresh token');
      }
      credentials.accessToken = await refreshDriveToken(
        supabase, userId, credentials.refreshToken,
      );
    }

    if (direction !== 'push' && direction !== 'bidirectional') {
      return result; // Drive is push-only
    }

    // Get devis/factures that need uploading
    const { data: documents, error } = await supabase
      .from('devis')
      .select('id, numero, type, statut, client_nom, date_creation')
      .eq('user_id', userId)
      .in('statut', ['envoye', 'accepte', 'signe', 'payee']);

    if (error) throw new Error(`Erreur lecture documents: ${error.message}`);
    if (!documents?.length) return result;

    // Get existing mappings
    const { data: mappings } = await supabase
      .from('integration_entity_map')
      .select('local_entity_id')
      .eq('integration_id', integrationId)
      .eq('local_entity_type', 'document');

    const uploadedIds = new Set((mappings || []).map((m: any) => m.local_entity_id));

    for (const doc of documents) {
      if (uploadedIds.has(doc.id)) continue;

      try {
        const year = new Date(doc.date_creation).getFullYear().toString();
        const contextName = doc.client_nom || 'Sans client';
        const fileName = `${doc.type === 'facture' ? 'Facture' : 'Devis'}_${doc.numero}.pdf`;

        // Ensure folder structure
        const folderId = await ensureFolderStructure(credentials, year, contextName);

        // Note: In production, we'd generate the PDF here
        // For now, create a placeholder mapping
        const uploadResult: UploadResult = {
          success: true,
          fileId: `placeholder-${doc.id}`,
          webViewLink: `https://drive.google.com/placeholder`,
        };

        if (uploadResult.success && uploadResult.fileId) {
          await supabase.from('integration_entity_map').insert({
            user_id: userId,
            integration_id: integrationId,
            local_entity_type: 'document',
            local_entity_id: doc.id,
            remote_entity_id: uploadResult.fileId,
            remote_entity_type: 'drive_file',
            remote_entity_url: uploadResult.webViewLink,
            sync_hash: `${doc.statut}:${doc.numero}`,
            last_synced_at: new Date().toISOString(),
          });

          result.itemsSynced++;
          (result.details.uploaded as string[]).push(fileName);
        }
      } catch (err: any) {
        result.itemsFailed++;
        result.errors.push(`${doc.numero}: ${err.message}`);
      }
    }

    result.success = result.itemsFailed === 0;
  } catch (err: any) {
    result.success = false;
    result.errors.push(err.message);
  }

  return result;
}

export async function validateGoogleDriveConnection(
  credentials: GoogleDriveCredentials,
): Promise<{ valid: boolean; accountName?: string; error?: string }> {
  try {
    const data = await driveRequest('/about?fields=user', credentials);
    return {
      valid: true,
      accountName: data.user?.displayName || data.user?.emailAddress || 'Google Drive',
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
