/**
 * Yousign Provider Adapter
 *
 * Handles e-signature workflows via Yousign API v3.
 * Auth: API key stored in Vault.
 *
 * Capabilities: create_signature, check_status, download_signed
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface YousignCredentials {
  apiKey: string;
  sandbox?: boolean;
}

interface SignatureRequest {
  documentName: string;
  documentBase64: string;
  signataires: Array<{
    name: string;
    email: string;
    phone?: string;
  }>;
  externalId?: string;
  message?: string;
}

interface SignatureResult {
  success: boolean;
  signatureRequestId?: string;
  status?: string;
  error?: string;
  signerLinks?: Array<{ name: string; url: string }>;
}

interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  errors: string[];
  details: Record<string, any>;
}

// ── API Client ───────────────────────────────────────────────────────────────

function getBaseUrl(sandbox: boolean): string {
  return sandbox
    ? 'https://api-sandbox.yousign.app/v3'
    : 'https://api.yousign.app/v3';
}

async function yousignRequest(
  endpoint: string,
  credentials: YousignCredentials,
  options: RequestInit = {},
): Promise<any> {
  const baseUrl = getBaseUrl(credentials.sandbox || false);

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[YOUSIGN] API error ${response.status}:`, errorText);

    if (response.status === 401 || response.status === 403) {
      throw new Error('CLÉ_API_INVALIDE');
    }
    throw new Error(`Erreur API Yousign: ${response.status}`);
  }

  if (response.status === 204) return {};
  return response.json();
}

// ── Signature Operations ─────────────────────────────────────────────────────

/**
 * Create a signature request for a document (devis/facture PDF)
 */
export async function createSignatureRequest(
  credentials: YousignCredentials,
  request: SignatureRequest,
): Promise<SignatureResult> {
  try {
    // Step 1: Create signature request
    const signatureReq = await yousignRequest('/signature_requests', credentials, {
      method: 'POST',
      body: JSON.stringify({
        name: `Signature — ${request.documentName}`,
        delivery_mode: 'email',
        timezone: 'Europe/Paris',
        external_id: request.externalId,
        custom_experience_id: null,
        email_notification: {
          sender: {
            type: 'organization',
          },
          custom_note: request.message || 'Merci de signer ce document.',
        },
      }),
    });

    const requestId = signatureReq.id;

    // Step 2: Upload document
    const uploadResponse = await fetch(
      `${getBaseUrl(credentials.sandbox || false)}/signature_requests/${requestId}/documents`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nature: 'signable_document',
          file_name: `${request.documentName}.pdf`,
          file_content: request.documentBase64,
          parse_anchors: false,
        }),
      },
    );

    if (!uploadResponse.ok) {
      throw new Error('Erreur upload document');
    }

    const document = await uploadResponse.json();

    // Step 3: Add signers
    const signerLinks: Array<{ name: string; url: string }> = [];

    for (const signataire of request.signataires) {
      const signer = await yousignRequest(
        `/signature_requests/${requestId}/signers`,
        credentials,
        {
          method: 'POST',
          body: JSON.stringify({
            info: {
              first_name: signataire.name.split(' ')[0] || signataire.name,
              last_name: signataire.name.split(' ').slice(1).join(' ') || '',
              email: signataire.email,
              phone_number: signataire.phone ? { country_code: '+33', number: signataire.phone } : undefined,
              locale: 'fr',
            },
            signature_level: 'electronic_signature',
            signature_authentication_mode: 'no_otp',
            fields: [{
              document_id: document.id,
              type: 'signature',
              page: 1,
              x: 50,
              y: 700,
              width: 200,
              height: 60,
            }],
          }),
        },
      );

      if (signer.signature_link) {
        signerLinks.push({ name: signataire.name, url: signer.signature_link });
      }
    }

    // Step 4: Activate the signature request
    await yousignRequest(
      `/signature_requests/${requestId}/activate`,
      credentials,
      { method: 'POST' },
    );

    return {
      success: true,
      signatureRequestId: requestId,
      status: 'activated',
      signerLinks,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Get the status of a signature request
 */
export async function getSignatureStatus(
  credentials: YousignCredentials,
  signatureRequestId: string,
): Promise<{
  status: string;
  signers: Array<{ name: string; status: string; signedAt?: string }>;
  completedAt?: string;
}> {
  const data = await yousignRequest(
    `/signature_requests/${signatureRequestId}`,
    credentials,
  );

  return {
    status: data.status, // draft, activated, done, expired, canceled
    signers: (data.signers || []).map((s: any) => ({
      name: `${s.info?.first_name || ''} ${s.info?.last_name || ''}`.trim(),
      status: s.status,
      signedAt: s.signed_at,
    })),
    completedAt: data.status === 'done' ? data.completed_at : undefined,
  };
}

/**
 * Download the signed document PDF
 */
export async function downloadSignedDocument(
  credentials: YousignCredentials,
  signatureRequestId: string,
): Promise<{ pdfBase64: string; fileName: string }> {
  const baseUrl = getBaseUrl(credentials.sandbox || false);

  // Get documents list
  const docsData = await yousignRequest(
    `/signature_requests/${signatureRequestId}/documents`,
    credentials,
  );

  const signableDoc = (docsData || []).find((d: any) => d.nature === 'signable_document');
  if (!signableDoc) {
    throw new Error('Document signé non trouvé');
  }

  // Download signed version
  const response = await fetch(
    `${baseUrl}/signature_requests/${signatureRequestId}/documents/${signableDoc.id}/download`,
    {
      headers: { 'Authorization': `Bearer ${credentials.apiKey}` },
    },
  );

  if (!response.ok) {
    throw new Error('Erreur téléchargement document signé');
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const pdfBase64 = btoa(binary);

  return {
    pdfBase64,
    fileName: signableDoc.file_name || 'document-signe.pdf',
  };
}

// ── Sync Handler ─────────────────────────────────────────────────────────────

/**
 * Sync handler for checking signature statuses
 */
export async function handleYousignSync(
  supabase: any,
  userId: string,
  integrationId: string,
  credentials: YousignCredentials,
  direction: string,
  _entityType?: string,
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    details: { statusUpdates: [] as string[] },
  };

  try {
    // Get all pending signature entity mappings
    const { data: mappings } = await supabase
      .from('integration_entity_map')
      .select('*')
      .eq('integration_id', integrationId)
      .eq('remote_entity_type', 'signature_request');

    if (!mappings?.length) return result;

    for (const mapping of mappings) {
      try {
        const status = await getSignatureStatus(credentials, mapping.remote_entity_id);

        // Update devis if signature completed
        if (status.status === 'done') {
          // Download signed PDF
          const signedDoc = await downloadSignedDocument(credentials, mapping.remote_entity_id);

          // Update the devis with signed status
          await supabase
            .from('devis')
            .update({
              statut: 'accepte',
              signature: `data:application/pdf;base64,${signedDoc.pdfBase64}`.substring(0, 100) + '...',
              signataire: status.signers[0]?.name || 'Signataire',
              signature_date: status.completedAt || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', mapping.local_entity_id);

          // Update mapping
          await supabase
            .from('integration_entity_map')
            .update({
              sync_hash: `done:${status.completedAt}`,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', mapping.id);

          result.itemsSynced++;
          (result.details.statusUpdates as string[]).push(
            `${mapping.local_entity_id} → signé`,
          );
        }
      } catch (err: any) {
        result.itemsFailed++;
        result.errors.push(`Signature ${mapping.remote_entity_id}: ${err.message}`);
      }
    }

    result.success = result.itemsFailed === 0;
  } catch (err: any) {
    result.success = false;
    result.errors.push(err.message);
  }

  return result;
}

export async function validateYousignConnection(
  credentials: YousignCredentials,
): Promise<{ valid: boolean; accountName?: string; error?: string }> {
  try {
    const data = await yousignRequest('/signature_requests?limit=1', credentials);
    return {
      valid: true,
      accountName: 'Yousign',
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
