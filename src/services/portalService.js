/**
 * portalService.js — Gestion des tokens portail client
 */

// Générer un token unique pour un client
export async function generatePortalToken(supabase, { clientId, entrepriseId }) {
  if (!supabase || !clientId) return null;

  // Token aléatoire sécurisé
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 48);

  // Expiration dans 30 jours
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { data, error } = await supabase
    .from('client_portal_tokens')
    .insert({
      client_id: clientId,
      entreprise_id: entrepriseId,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.warn('[portalService] Failed to generate token:', error.message);
    return null;
  }

  return data;
}

// Récupérer les données du portail pour un token
export async function getPortalData(supabase, token) {
  if (!supabase || !token) return null;

  // Vérifier le token
  const { data: tokenData, error: tokenError } = await supabase
    .from('client_portal_tokens')
    .select('*')
    .eq('token', token)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (tokenError || !tokenData) return null;

  const { client_id, entreprise_id } = tokenData;

  // Charger les données du client
  const [clientRes, devisRes, chantiersRes, entrepriseRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', client_id).single(),
    supabase.from('devis').select('*').eq('client_id', client_id).order('date', { ascending: false }),
    supabase.from('chantiers').select('*').eq('client_id', client_id),
    supabase.from('entreprise').select('*').eq('id', entreprise_id).single(),
  ]);

  return {
    client: clientRes.data,
    devis: (devisRes.data || []).filter(d => d.type === 'devis'),
    factures: (devisRes.data || []).filter(d => d.type === 'facture'),
    chantiers: chantiersRes.data || [],
    entreprise: entrepriseRes.data,
    token: tokenData,
  };
}

// Envoyer l'invitation par email
export async function sendPortalInvite(supabase, { clientEmail, clientName, portalUrl, entrepriseName }) {
  if (!supabase || !clientEmail) return false;

  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        action: 'send_email',
        to: clientEmail,
        subject: `${entrepriseName} — Accédez à votre espace client`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">Votre espace client</h2>
            <p>Bonjour ${clientName},</p>
            <p>${entrepriseName} vous invite à accéder à votre espace client sécurisé.</p>
            <p>Vous pourrez y consulter :</p>
            <ul>
              <li>Vos devis et factures</li>
              <li>L'avancement de vos chantiers</li>
              <li>Télécharger vos documents PDF</li>
              <li>Nous contacter directement</li>
            </ul>
            <a href="${portalUrl}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Accéder à mon espace →
            </a>
            <p style="color: #888; font-size: 12px; margin-top: 24px;">
              Ce lien est valable 30 jours. Si vous n'avez pas demandé cet accès, ignorez cet email.
            </p>
          </div>
        `,
        from_name: entrepriseName,
      },
    });

    return !error;
  } catch (e) {
    console.warn('[portalService] Failed to send invite:', e.message);
    return false;
  }
}
