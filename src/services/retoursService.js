/**
 * Retours utilisateurs : bug, idée, autre (table `retours`, migration 074).
 *
 * L'utilisateur voit le statut et la réponse de ses retours. Chaque envoi prévient aussi
 * contact@mallettico.fr par e-mail (sans bloquer : l'enregistrement en base fait foi).
 * En démo, tout reste dans le navigateur.
 */
import supabase, { isDemo } from '../supabaseClient';
import { captureException } from '../lib/sentry';

export const TYPES_RETOUR = {
  bug: 'Un problème',
  idee: 'Une idée',
  autre: 'Autre chose',
};

export const STATUTS_RETOUR = {
  nouveau: 'Envoyé',
  lu: 'Lu',
  en_cours: 'En cours',
  fait: 'Fait',
  refuse: 'Pas retenu',
};

const CLE_DEMO = 'mallettico_retours_demo';
const ADRESSE_EQUIPE = 'contact@mallettico.fr';

const lireDemo = () => {
  try { return JSON.parse(localStorage.getItem(CLE_DEMO) || '[]'); } catch { return []; }
};

/** Contexte technique joint au retour : de quoi reproduire un bug, rien de personnel. */
export function contexteTechnique() {
  if (typeof window === 'undefined') return {};
  return {
    largeur: window.innerWidth,
    hauteur: window.innerHeight,
    navigateur: navigator.userAgent,
    en_ligne: navigator.onLine,
    mode_sombre: document.documentElement.classList.contains('dark'),
    version: import.meta.env.VITE_APP_VERSION || null,
  };
}

const echapper = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * @param {{ type: 'bug'|'idee'|'autre', message: string, page?: string, organizationId?: string|null, email?: string }} retour
 * @returns {Promise<{ data: object|null, error: string|null }>}
 */
export async function envoyerRetour({ type, message, page, organizationId, email }) {
  const texte = String(message || '').trim();
  if (!TYPES_RETOUR[type]) return { data: null, error: 'Choisissez le type de retour.' };
  if (texte.length < 3) return { data: null, error: 'Décrivez en quelques mots, s’il vous plaît.' };
  if (texte.length > 5000) return { data: null, error: 'Message trop long (5 000 caractères au plus).' };

  const ligne = { type, message: texte, page: page || null, contexte: contexteTechnique() };

  if (isDemo || !supabase) {
    const enregistre = { ...ligne, id: `demo-${Date.now()}`, statut: 'nouveau', reponse: null, created_at: new Date().toISOString() };
    try { localStorage.setItem(CLE_DEMO, JSON.stringify([enregistre, ...lireDemo()].slice(0, 50))); } catch { /* stockage plein : le retour démo n'est simplement pas gardé */ }
    return { data: enregistre, error: null };
  }

  const { data, error } = await supabase
    .from('retours')
    .insert({ ...ligne, organization_id: organizationId || null })
    .select()
    .single();
  if (error) {
    captureException(error, { context: 'envoi d’un retour utilisateur' });
    if (/retours/.test(error.message || '') && /does not exist|could not find|PGRST205|42P01/i.test(`${error.message} ${error.code}`)) {
      return { data: null, error: `L’envoi des retours n’est pas encore activé. Écrivez-nous à ${ADRESSE_EQUIPE}.` };
    }
    return { data: null, error: 'Votre message n’a pas pu partir. Vérifiez votre connexion et réessayez.' };
  }

  // Prévenir l'équipe ; un échec ici ne doit pas faire croire à l'utilisateur que son retour est perdu.
  supabase.functions.invoke('send-email', {
    body: {
      action: 'send_email',
      to: ADRESSE_EQUIPE,
      subject: `[Retour ${TYPES_RETOUR[type].toLowerCase()}] ${texte.slice(0, 60)}`,
      reply_to: email || undefined,
      html: `<p><strong>${echapper(TYPES_RETOUR[type])}</strong> — page « ${echapper(page || '?')} » — ${echapper(email || 'utilisateur')}</p>`
        + `<p style="white-space:pre-line">${echapper(texte)}</p>`
        + `<pre style="font-size:11px;color:#64748b">${echapper(JSON.stringify(ligne.contexte, null, 1))}</pre>`
        + `<p style="font-size:12px;color:#64748b">Répondre : table « retours » (id ${echapper(data.id)}), colonnes statut et reponse.</p>`,
    },
  }).then(({ error: erreurMail }) => {
    if (erreurMail) captureException(erreurMail, { context: 'e-mail de retour utilisateur' });
  }).catch((err) => captureException(err, { context: 'e-mail de retour utilisateur' }));

  return { data, error: null };
}

/** Les retours de l'utilisateur, du plus récent au plus ancien. */
export async function listerMesRetours() {
  if (isDemo || !supabase) return { data: lireDemo(), error: null };
  const { data, error } = await supabase
    .from('retours')
    .select('id, type, message, page, statut, reponse, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return { data: [], error };
  return { data: data || [], error: null };
}
