/**
 * create-invoice-payment — Paiement en ligne d'une facture (Stripe Checkout).
 *
 * Endpoint public (appelé avec l'anon key depuis la page /pay/:token).
 * La sécurité repose sur la possession du payment_token (UUID non devinable).
 * L'argent va sur le compte Stripe de l'ARTISAN : sa clé secrète est lue
 * depuis Vault via la RPC get_stripe_secret_for_user (service_role).
 *
 * Actions :
 *   - create : { payment_token, amount_cents? }
 *       → crée une session Checkout (mode payment) et renvoie { url }.
 *       success_url = /pay/:token?session_id={CHECKOUT_SESSION_ID}
 *   - verify : { payment_token, session_id }
 *       → retrieve la session côté serveur avec la clé de l'artisan ;
 *         si payée : marque la facture payée (idempotent via events_log)
 *         et notifie l'artisan par email (Resend). PAS de webhook par artisan.
 *
 * Modèles de commission (stripe_config.commission_model) :
 *   - 'artisan'  → le client paie le TTC exact, l'artisan absorbe les frais
 *   - 'client'   → le client paie TTC + 1,7 %
 *   - 'partage'  → le client paie TTC + 0,85 %
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const APP_URL = Deno.env.get('APP_URL') || 'https://batigesti.fr';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/** Charge la facture par token + la clé Stripe de l'artisan. */
async function loadFacture(paymentToken: string) {
  const { data, error } = await supabaseAdmin.rpc('get_facture_for_payment', {
    p_token: paymentToken,
  });
  if (error) throw new Error(`RPC get_facture_for_payment: ${error.message}`);
  return data as {
    error?: string;
    facture?: Record<string, unknown>;
    client?: { nom?: string; prenom?: string; email?: string };
    entreprise?: { nom?: string; email?: string };
    stripe_enabled?: boolean;
    commission_model?: string;
  };
}

async function getArtisanStripe(userId: string): Promise<Stripe | null> {
  const { data: key, error } = await supabaseAdmin.rpc('get_stripe_secret_for_user', {
    p_user_id: userId,
  });
  if (error) console.error('[create-invoice-payment] Vault key error:', error.message);
  // Pas de fallback sur la clé plateforme : l'argent doit aller à l'artisan.
  if (!key) return null;
  return new Stripe(key as string, { apiVersion: '2023-10-16' });
}

// ────────────────────────────────────────────────────────────────────
// Action: create — session Checkout
// ────────────────────────────────────────────────────────────────────

async function handleCreate(req: Request, paymentToken: string, amountCents?: number) {
  const data = await loadFacture(paymentToken);
  if (data.error) return json({ error: data.error }, 404);

  const facture = data.facture as Record<string, unknown>;
  if (!data.stripe_enabled) {
    return json({ error: "Le paiement en ligne n'est pas activé pour cet artisan" }, 400);
  }
  if (facture.statut === 'payee') {
    return json({ error: 'Cette facture a déjà été payée' }, 400);
  }

  const stripe = await getArtisanStripe(facture.user_id as string);
  if (!stripe) return json({ error: 'Configuration Stripe incomplète' }, 400);

  // Montant : reste à payer par défaut, ou acompte fourni (borné au reste dû)
  const totalCents = Math.round(((facture.total_ttc as number) || 0) * 100);
  const dejaPayeCents = Math.round(((facture.montant_paye as number) || 0) * 100);
  const resteCents = Math.max(totalCents - dejaPayeCents, 0);
  let baseCents = resteCents;
  if (amountCents !== undefined) {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return json({ error: 'Montant invalide' }, 400);
    }
    baseCents = Math.min(amountCents, resteCents);
  }
  if (baseCents < 50) return json({ error: 'Montant minimum : 0,50 €' }, 400);

  const commissionModel = data.commission_model || 'artisan';
  let finalCents = baseCents;
  let feeSuffix = '';
  if (commissionModel === 'client') {
    finalCents = Math.round(baseCents * 1.017);
    feeSuffix = ' (frais de paiement inclus)';
  } else if (commissionModel === 'partage') {
    finalCents = Math.round(baseCents * 1.0085);
    feeSuffix = ' (frais de paiement partagés)';
  }

  const isPartial = baseCents < resteCents;
  const origin = req.headers.get('origin') || APP_URL;
  const payUrl = `${origin}/pay/${paymentToken}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: `${isPartial ? 'Acompte' : 'Paiement'} — Facture ${facture.numero}`,
          description: `${data.entreprise?.nom || 'Artisan'}${facture.objet ? ` — ${facture.objet}` : ''}${feeSuffix}`,
        },
        unit_amount: finalCents,
      },
      quantity: 1,
    }],
    customer_email: data.client?.email || undefined,
    success_url: `${payUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${payUrl}?canceled=true`,
    metadata: {
      facture_id: String(facture.id),
      user_id: String(facture.user_id),
      payment_token: paymentToken,
      amount_original_cents: String(baseCents),
      commission_model: commissionModel,
      payment_type: isPartial ? 'acompte' : 'solde',
    },
  });

  await supabaseAdmin
    .from('devis')
    .update({ stripe_session_id: session.id, payment_status: 'processing' })
    .eq('id', facture.id);

  return json({ url: session.url });
}

// ────────────────────────────────────────────────────────────────────
// Action: verify — confirmation serveur au retour de Checkout
// ────────────────────────────────────────────────────────────────────

async function handleVerify(paymentToken: string, sessionId: string) {
  const data = await loadFacture(paymentToken);
  if (data.error) return json({ error: data.error }, 404);

  const facture = data.facture as Record<string, unknown>;
  const factureId = facture.id as string;

  // Idempotence : cette session a-t-elle déjà été traitée ?
  const { data: already } = await supabaseAdmin
    .from('events_log')
    .select('id')
    .eq('event_type', 'stripe_payment_received')
    .eq('entity_id', factureId)
    .contains('metadata', { session_id: sessionId })
    .limit(1);
  if (already && already.length > 0) {
    return json({ status: 'paid', already: true, facture: { numero: facture.numero, statut: 'payee' } });
  }

  const stripe = await getArtisanStripe(facture.user_id as string);
  if (!stripe) return json({ error: 'Configuration Stripe incomplète' }, 400);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (_e) {
    return json({ error: 'Session de paiement introuvable' }, 404);
  }

  // La session doit bien avoir été créée pour CETTE facture
  if (session.metadata?.payment_token !== paymentToken
      || session.metadata?.facture_id !== String(factureId)) {
    return json({ error: 'Session invalide pour cette facture' }, 400);
  }

  if (session.payment_status !== 'paid') {
    return json({ status: session.payment_status || 'unpaid' });
  }

  // Montant crédité sur la facture = montant hors frais de commission client
  const creditCents = parseInt(session.metadata?.amount_original_cents || '', 10)
    || session.amount_total || 0;
  const totalTTC = (facture.total_ttc as number) || 0;
  const nouveauPaye = ((facture.montant_paye as number) || 0) + creditCents / 100;
  const fullyPaid = nouveauPaye >= totalTTC - 0.01;
  const now = new Date();

  const { error: updateError } = await supabaseAdmin
    .from('devis')
    .update({
      montant_paye: nouveauPaye,
      payment_status: 'succeeded',
      payment_completed_at: now.toISOString(),
      stripe_payment_intent_id: (session.payment_intent as string) || null,
      payment_metadata: {
        session_id: sessionId,
        amount_paid_cents: session.amount_total,
        amount_credited_cents: creditCents,
        commission_model: session.metadata?.commission_model || 'artisan',
        payment_type: session.metadata?.payment_type || 'solde',
      },
      ...(fullyPaid ? {
        statut: 'payee',
        date_paiement: now.toISOString().slice(0, 10),
        mode_paiement: 'cb',
      } : {}),
    })
    .eq('id', factureId);

  if (updateError) {
    console.error('[create-invoice-payment] update facture failed:', updateError.message);
    return json({ error: 'Paiement reçu mais mise à jour de la facture échouée' }, 500);
  }

  // Journal (sert aussi de dédup pour verify ET pour l'email artisan)
  await supabaseAdmin.from('events_log').insert([{
    event_type: 'stripe_payment_received',
    entity_type: 'facture',
    entity_id: factureId,
    success: true,
    metadata: {
      session_id: sessionId,
      numero: facture.numero,
      amount_cents: creditCents,
      fully_paid: fullyPaid,
    },
    triggered_at: now.toISOString(),
  }]);

  // Notification artisan (best effort — le paiement est déjà enregistré)
  try {
    await notifyArtisan(facture, data.client ?? {}, data.entreprise ?? {}, creditCents / 100, fullyPaid);
  } catch (e) {
    console.error('[create-invoice-payment] notification artisan échouée:', (e as Error).message);
  }

  return json({
    status: 'paid',
    facture: { numero: facture.numero, statut: fullyPaid ? 'payee' : facture.statut },
    amount: creditCents / 100,
  });
}

/** Email Resend à l'artisan — même pattern que notify-signature. */
async function notifyArtisan(
  facture: Record<string, unknown>,
  client: { nom?: string; prenom?: string },
  entreprise: { email?: string },
  montant: number,
  fullyPaid: boolean
) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) throw new Error('Resend non configuré');

  let artisanEmail: string | null = null;
  try {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(facture.user_id as string);
    artisanEmail = userData?.user?.email ?? null;
  } catch { /* fallback ci-dessous */ }
  if (!artisanEmail) artisanEmail = entreprise?.email ?? null;
  if (!artisanEmail) throw new Error('email artisan introuvable');

  const clientNom = [client?.prenom, client?.nom].filter(Boolean).join(' ') || 'Votre client';
  const montantFmt = fmtEUR(montant);
  const titre = fullyPaid ? 'Facture payée !' : 'Acompte reçu !';

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;max-width:560px;margin:0 auto">
    <div style="text-align:center;padding:24px 0 8px">
      <div style="font-size:40px">💰</div>
      <h2 style="margin:8px 0 0">${titre}</h2>
    </div>
    <p style="text-align:center;font-size:16px">
      <strong>${clientNom}</strong> vient de payer <strong>${montantFmt}</strong> en ligne
      sur la facture <strong>${facture.numero}</strong>.
    </p>
    <p style="text-align:center;font-size:14px;color:#475569">
      ${fullyPaid
        ? 'La facture a été marquée comme payée automatiquement.'
        : 'Le montant a été enregistré comme acompte sur la facture.'}
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px">
        Ouvrir BatiGesti
      </a>
    </div>
    <p style="font-size:13px;color:#64748b;text-align:center">
      L'argent arrive directement sur votre compte Stripe, puis sur votre compte bancaire.
    </p>
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `BatiGesti <${Deno.env.get('FROM_EMAIL') || 'noreply@batigesti.fr'}>`,
      to: [artisanEmail],
      subject: `💰 ${fullyPaid ? 'Facture' : 'Acompte sur facture'} ${facture.numero} — ${montantFmt} reçus`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend: ${await res.text()}`);
}

// ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action = 'create', payment_token, amount_cents, session_id } = await req.json();

    if (!payment_token || typeof payment_token !== 'string') {
      return json({ error: 'payment_token requis' }, 400);
    }

    if (action === 'create') {
      return await handleCreate(req, payment_token, amount_cents);
    }
    if (action === 'verify') {
      if (!session_id || typeof session_id !== 'string') {
        return json({ error: 'session_id requis' }, 400);
      }
      return await handleVerify(payment_token, session_id);
    }
    return json({ error: `Action inconnue : ${action}` }, 400);
  } catch (error) {
    console.error('[create-invoice-payment] Error:', error);
    return json({ error: (error as Error).message || 'Erreur interne' }, 500);
  }
});
