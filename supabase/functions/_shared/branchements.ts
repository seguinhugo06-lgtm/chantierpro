import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Utilisateur } from './appelant.ts';

/**
 * Branchements Supabase et Resend communs aux fonctions qui envoient des e-mails
 * (send-email, send-lifecycle-email). Les règles vivent dans des modules purs,
 * testés sous vitest ; ce fichier ne fait que les relier aux services.
 */

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
export const CLE_SERVEUR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const sansSession = { auth: { persistSession: false, autoRefreshToken: false } };
export const admin = createClient(SUPABASE_URL, CLE_SERVEUR, sansSession);
const anonyme = createClient(SUPABASE_URL, ANON_KEY, sansSession);

/** Plafond quotidien par compte : secret EMAIL_LIMITE_JOUR, 50 par défaut. */
export function limiteJour(): number {
  const lue = Number.parseInt(Deno.env.get('EMAIL_LIMITE_JOUR') ?? '', 10);
  return Number.isFinite(lue) && lue > 0 ? lue : 50;
}

/** Client qui agit AVEC le jeton de l'utilisateur : la RLS décide de ce qu'il voit, comme dans l'app. */
export function clientUtilisateur(jeton: string) {
  return createClient(SUPABASE_URL, ANON_KEY, { ...sansSession, global: { headers: { Authorization: `Bearer ${jeton}` } } });
}

/** Jeton validé par le serveur d'authentification. */
export async function utilisateurDuJeton(jeton: string): Promise<Utilisateur | null> {
  const { data, error } = await anonyme.auth.getUser(jeton);
  if (error || !data?.user) return null;
  const u = data.user;
  return {
    id: u.id,
    email: u.email ?? null,
    creeLe: u.created_at ?? null,
    anonyme: u.is_anonymous === true,
    appMetadata: u.app_metadata ?? {},
  };
}

// Compteur absent (migration 077 pas appliquée) : fonction ou table introuvable.
const COMPTEUR_ABSENT = /PGRST202|PGRST205|42883|42P01/;

export async function reserverEnvoi(userId: string, nb: number, limite: number): Promise<{ id: number | null; indisponible?: boolean }> {
  const { data, error } = await admin.rpc('reserver_envoi_email', { p_user_id: userId, p_nb: nb, p_limite: limite });
  if (error) {
    if (COMPTEUR_ABSENT.test(`${error.code} ${error.message}`)) return { id: null, indisponible: true };
    throw new Error(error.message);
  }
  return { id: data == null ? null : Number(data) };
}

export async function libererEnvoi(id: number): Promise<void> {
  const { error } = await admin.from('envois_email').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function envoyerResend(message: Record<string, unknown>) {
  const resultat = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  const corps = await resultat.json().catch(() => ({}));
  return { ok: resultat.ok, status: resultat.status, corps };
}

export function journaliser(prefixe: string) {
  return (niveau: 'info' | 'erreur', message: string) => {
    if (niveau === 'erreur') console.error(`[${prefixe}] ${message}`);
    else console.log(`[${prefixe}] ${message}`);
  };
}
