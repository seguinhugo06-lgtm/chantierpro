/**
 * Qui appelle une fonction Edge ? La clé anon est publique et passe verify_jwt :
 * le rôle lu dans un JWT non vérifié ne prouve rien. On reconnaît donc
 * - le serveur : jeton strictement égal à SUPABASE_SERVICE_ROLE_KEY ;
 * - un utilisateur : jeton validé par le serveur d'authentification (auth.getUser),
 *   compte non anonyme.
 * Sans import distant : testable sous vitest.
 */

export type Utilisateur = {
  id: string;
  email: string | null;
  creeLe?: string | null;
  anonyme?: boolean;
  appMetadata?: Record<string, unknown>;
};

export type Appelant =
  | { serveur: true }
  | { serveur: false; utilisateur: Utilisateur; jeton: string };

export function jetonDe(req: Request): string {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

/** Comparaison à temps constant (la clé de service ne doit pas se deviner caractère par caractère). */
export function egalSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** L'appelant, ou null s'il n'est ni le serveur ni un utilisateur connecté (→ 401). */
export async function identifierAppelant(
  req: Request,
  dep: { cleServeur?: string; utilisateur: (jeton: string) => Promise<Utilisateur | null> },
): Promise<Appelant | null> {
  const jeton = jetonDe(req);
  if (!jeton) return null;
  if (dep.cleServeur && egalSecret(jeton, dep.cleServeur)) return { serveur: true };
  const utilisateur = await dep.utilisateur(jeton);
  if (!utilisateur || utilisateur.anonyme) return null;
  return { serveur: false, utilisateur, jeton };
}
