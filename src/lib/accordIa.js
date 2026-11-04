/**
 * Accord de l'artisan avant sa première dictée (IA) — décision d'Hugo du 4 nov. 2026, migration 109 (`accords_ia`).
 *
 * Le texte de l'écran est celui de juriste-btp (relu au texte officiel le 3 nov. 2026), posé mot pour mot. Sources :
 * - Apple App Review Guidelines 5.1.2(i) (accord explicite avant de partager des données personnelles avec une IA tierce) ;
 * - règlement (UE) 2024/1689, art. 50 § 1 et § 5 (dire qu'on interagit avec une IA, au plus tard à la première interaction) ;
 * - privacy.claude.com, article 7996866, mis à jour le 1er juillet 2026 (conservation : 30 jours, 2 ans si signalé).
 * Il doit dire la même chose que la politique de confidentialité, articles 2 et 4 (src/components/LegalPages.jsx).
 *
 * CHANGER CE TEXTE oblige à changer ACCORD_IA_VERSION, ici et dans supabase/functions/voice-intent/regles.ts (un test
 * compare les deux) : l'accord est alors redemandé à chacun, et le serveur refuse les anciens (403 ACCORD_REQUIS).
 *
 * Le serveur fait foi : voice-intent refuse une dictée sans accord en cours à cette version. L'app ne fait que montrer
 * l'écran avant d'ouvrir la dictée, et enregistrer l'accord (ou son retrait, dans Paramètres) en attendant la réponse de
 * la base (supabase-js ne lève pas : on teste `error`).
 */

export const ACCORD_IA_VERSION = '2026-11-03';

export const ACCORD_IA_TITRE = 'Avant votre première dictée';
export const ACCORD_IA_TEXTE = "Votre dictée est analysée par une intelligence artificielle : Claude, de la société Anthropic, qui stocke les données aux États-Unis (le calcul peut avoir lieu dans d'autres pays). Mallettico lui envoie le texte de la dictée, avec les noms de vos clients (60 au plus) et les libellés de votre catalogue (80 au plus). Mallettico ne reçoit pas le son : votre navigateur le transforme en texte (sur Chrome, par Google). Anthropic n'utilise pas ces données pour entraîner ses modèles et les efface sous 30 jours (jusqu'à 2 ans si ses contrôles de sécurité les signalent). L'IA peut se tromper : vous relisez tout, rien n'est créé sans votre validation.";
export const ACCORD_IA_ACCEPTER = "J'accepte et je dicte";
export const ACCORD_IA_REFUSER = 'Non, je saisis à la main';
export const ACCORD_IA_EN_SAVOIR_PLUS = 'En savoir plus (Politique de confidentialité, article 4)';
/** Ancre de l'article 4 de la politique de confidentialité (LegalPages.jsx). */
export const ACCORD_IA_LIEN = '/confidentialite#article-4';

const FONCTION = 'dictee';

/**
 * L'accord en cours de ce compte, à la version attendue.
 * @returns {Promise<{ accord: boolean, depuis: string|null, error: object|null }>} accord false en cas d'erreur (l'écran
 *   s'affiche alors ; accepter retentera l'écriture et dira si elle échoue). `depuis` : date de l'accord en cours.
 */
export async function lireAccordIa(client, userId) {
  if (!client || !userId) return { accord: false, depuis: null, error: { message: 'Connexion requise.' } };
  const { data, error } = await client
    .from('accords_ia').select('id, version, accepte_le')
    .eq('user_id', userId).eq('fonction', FONCTION).is('revoque_le', null);
  if (error) return { accord: false, depuis: null, error };
  const enCours = (data || []).find((a) => a.version === ACCORD_IA_VERSION);
  return { accord: !!enCours, depuis: enCours?.accepte_le || null, error: null };
}

/**
 * Enregistre l'accord (compte et date posés par la base, version par l'app). Un accord en cours à une ancienne version
 * est d'abord retiré (un seul accord en cours par compte).
 * @returns {Promise<{ ok: boolean, error: object|null }>}
 */
export async function donnerAccordIa(client, userId) {
  if (!client || !userId) return { ok: false, error: { message: 'Connexion requise.' } };
  const lu = await client.from('accords_ia').select('id, version')
    .eq('user_id', userId).eq('fonction', FONCTION).is('revoque_le', null);
  if (lu.error) return { ok: false, error: lu.error };
  const enCours = lu.data || [];
  if (enCours.some((a) => a.version === ACCORD_IA_VERSION)) return { ok: true, error: null };
  if (enCours.length) {
    const retrait = await retirerAccordIa(client, userId);
    if (!retrait.ok) return { ok: false, error: retrait.error };
  }
  const { data, error } = await client.from('accords_ia').insert({ version: ACCORD_IA_VERSION }).select('id, version').single();
  if (error) return { ok: false, error };
  if (!data?.id) return { ok: false, error: { message: 'Accord non enregistré.' } };
  return { ok: true, error: null };
}

/**
 * Retire l'accord en cours (la base pose la date du retrait). L'écran d'accord revient à la dictée suivante.
 * @returns {Promise<{ ok: boolean, retires: number, error: object|null }>}
 */
export async function retirerAccordIa(client, userId) {
  if (!client || !userId) return { ok: false, retires: 0, error: { message: 'Connexion requise.' } };
  const { data, error } = await client.from('accords_ia')
    .update({ revoque_le: new Date().toISOString() })
    .eq('user_id', userId).eq('fonction', FONCTION).is('revoque_le', null)
    .select('id');
  if (error) return { ok: false, retires: 0, error };
  // Un UPDATE refusé par une policy ne renvoie pas d'erreur : on relit pour constater qu'aucun accord n'est plus en cours.
  const relu = await client.from('accords_ia').select('id')
    .eq('user_id', userId).eq('fonction', FONCTION).is('revoque_le', null);
  if (relu.error) return { ok: false, retires: 0, error: relu.error };
  if ((relu.data || []).length) return { ok: false, retires: 0, error: { message: 'Accord toujours en cours après le retrait.' } };
  return { ok: true, retires: (data || []).length, error: null };
}
