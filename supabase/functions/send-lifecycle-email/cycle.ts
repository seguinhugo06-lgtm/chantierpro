import { corsHeaders } from '../_shared/cors.ts';
import { identifierAppelant, type Utilisateur } from '../_shared/appelant.ts';
import { estEmail, nettoyerNom } from '../_shared/adresses.ts';
import { TEMPLATES } from './modeles.ts';

/**
 * Règles de `send-lifecycle-email`, sans import distant : testables sous vitest
 * (src/lib/__tests__/cycleEmail.test.js), câblées dans index.ts.
 *
 * Avant (revue du 8 oct. 2026) : aucune vérification de l'appelant — avec la seule
 * clé publique, n'importe qui envoyait un e-mail « Mallettico » à n'importe quelle
 * adresse, avec un nom d'organisation et un lien d'invitation de son choix.
 *
 * Désormais :
 * - welcome : un utilisateur connecté, à SA propre adresse, une seule fois, pour un
 *   compte de moins de 7 jours (l'inscription n'a souvent pas de session : l'app le
 *   demande à la première connexion) ;
 * - invitation : l'auteur de l'invitation, d'après la ligne `invitations` lue avec
 *   son jeton (RLS) ; destinataire, organisation, rôle et lien viennent de la base ;
 *   compté dans le plafond quotidien (migration 077) ;
 * - trial_*, payment_* : le serveur seul (aucun appelant aujourd'hui).
 */

export const SITE = 'https://mallettico.fr';
/** Les comptes créés avant cette date ont reçu la bienvenue à l'inscription (ancien envoi). */
export const BIENVENUE_DEPUIS = '2026-10-08T00:00:00Z';
const SEPT_JOURS = 7 * 24 * 3600 * 1000;
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES_SERVEUR = ['trial_ending', 'trial_expired', 'payment_success', 'payment_failed'];

const LIBELLES_ROLE: Record<string, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  comptable: 'Comptable',
  chef_chantier: 'Chef de chantier',
  ouvrier: 'Ouvrier',
  readonly: 'Lecture seule',
};

export type Invitation = {
  email: string | null;
  token: string;
  role: string;
  status: string | null;
  expires_at: string | null;
  organization_id: string;
  invited_by: string | null;
};

export type DependancesCycle = {
  expediteur: string;
  cleResend?: string;
  cleServeur?: string;
  limiteJour: number;
  maintenant?: () => Date;
  utilisateur: (jeton: string) => Promise<Utilisateur | null>;
  /** La ligne `invitations` lue avec le jeton de l'utilisateur (RLS) ; null si invisible. Lève si la lecture échoue. */
  invitation: (jeton: string, id: string) => Promise<Invitation | null>;
  /** Nom de l'organisation lu avec le jeton de l'utilisateur ; null si invisible. */
  nomOrganisation: (jeton: string, id: string) => Promise<string | null>;
  /** Note dans le compte (app_metadata, non modifiable par l'utilisateur) que la bienvenue est partie. */
  marquerBienvenue: (userId: string, quand: string) => Promise<void>;
  reserver: (userId: string, nb: number, limite: number) => Promise<{ id: number | null; indisponible?: boolean }>;
  liberer: (id: number) => Promise<void>;
  envoyer: (message: Record<string, unknown>) => Promise<{ ok: boolean; status: number; corps: Record<string, unknown> }>;
  journal?: (niveau: 'info' | 'erreur', message: string) => void;
};

function reponse(corps: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function dateFr(iso: string | null): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

/** La bienvenue est-elle due ? null si oui, sinon la raison. */
export function raisonSansBienvenue(u: Utilisateur, maintenant: Date): string | null {
  if (!u.email) return 'compte sans adresse';
  if (u.appMetadata?.bienvenue_envoyee_le) return 'déjà envoyée';
  const cree = u.creeLe ? new Date(u.creeLe).getTime() : NaN;
  if (Number.isNaN(cree)) return 'date de création inconnue';
  if (cree < new Date(BIENVENUE_DEPUIS).getTime()) return 'compte antérieur à l’envoi à la première connexion';
  if (maintenant.getTime() - cree > SEPT_JOURS) return 'compte de plus de 7 jours';
  return null;
}

export async function traiterCycle(req: Request, dep: DependancesCycle): Promise<Response> {
  const journal = dep.journal || (() => {});
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reponse({ error: 'Méthode non autorisée' }, 405);

  try {
    const appelant = await identifierAppelant(req, dep);
    if (!appelant) return reponse({ error: 'Authentification requise' }, 401);

    let corps: Record<string, unknown>;
    try {
      corps = await req.json();
    } catch {
      return reponse({ error: 'Requête illisible' }, 400);
    }
    const type = typeof corps?.type === 'string' ? corps.type : '';
    if (!dep.cleResend) return reponse({ error: 'RESEND_API_KEY not configured' }, 503);
    const maintenant = (dep.maintenant || (() => new Date()))();

    let destinataire: string;
    let sujet: string;
    let html: string;
    let reservation: number | null = null;

    if (type === 'welcome') {
      if (appelant.serveur) {
        if (!estEmail(corps.to)) return reponse({ error: 'Destinataire invalide' }, 400);
        destinataire = corps.to;
      } else {
        // Jamais l'adresse fournie par le navigateur : celle du compte connecté.
        const raison = raisonSansBienvenue(appelant.utilisateur, maintenant);
        if (raison) return reponse({ success: true, envoye: false, raison });
        destinataire = appelant.utilisateur.email as string;
        // Noté avant l'envoi : un échec de Resend ne sera pas retenté à chaque connexion. Pas
        // atomique (deux appels simultanés peuvent en envoyer deux), sans enjeu : adresse du
        // compte lui-même, contenu fixe.
        await dep.marquerBienvenue(appelant.utilisateur.id, maintenant.toISOString());
      }
      sujet = TEMPLATES.welcome.subject;
      html = TEMPLATES.welcome.html({});
    } else if (type === 'invitation') {
      if (appelant.serveur) return reponse({ error: 'Invitation : appel d’un utilisateur requis' }, 400);
      const id = typeof corps.invitationId === 'string' ? corps.invitationId : '';
      if (!RE_UUID.test(id)) return reponse({ error: 'Invitation manquante' }, 400);
      const { utilisateur, jeton } = appelant;
      const inv = await dep.invitation(jeton, id);
      // Seul l'auteur de l'invitation peut la faire envoyer.
      if (!inv || inv.invited_by !== utilisateur.id) return reponse({ error: 'Invitation introuvable' }, 404);
      const expiree = inv.expires_at ? new Date(inv.expires_at).getTime() <= maintenant.getTime() : false;
      if ((inv.status && inv.status !== 'pending') || expiree) return reponse({ error: 'Invitation expirée ou déjà utilisée' }, 409);
      if (!estEmail(inv.email)) return reponse({ error: 'Invitation sans adresse e-mail valide' }, 400);
      if (!RE_UUID.test(inv.token || '')) return reponse({ error: 'Invitation invalide' }, 400);

      const quota = await dep.reserver(utilisateur.id, 1, dep.limiteJour);
      if (quota.indisponible) journal('erreur', 'plafond inactif : migration 077 (envois_email) non appliquée');
      else if (quota.id == null) {
        return reponse({ error: `Limite de ${dep.limiteJour} e-mails par 24 heures atteinte. Réessayez plus tard.`, code: 'plafond_atteint' }, 429);
      } else reservation = quota.id;

      const nomOrg = nettoyerNom(await dep.nomOrganisation(jeton, inv.organization_id)) || 'une organisation';
      destinataire = inv.email;
      sujet = `Invitation à rejoindre ${nomOrg} sur Mallettico`;
      html = TEMPLATES.invitation.html({
        orgName: nomOrg,
        roleLabel: LIBELLES_ROLE[inv.role] || 'Membre',
        inviteLink: `${SITE}/invitation/${inv.token}`,
        expiresAt: dateFr(inv.expires_at),
      });
    } else if (TYPES_SERVEUR.includes(type)) {
      if (!appelant.serveur) return reponse({ error: 'Réservé au serveur' }, 403);
      if (!estEmail(corps.to)) return reponse({ error: 'Destinataire invalide' }, 400);
      destinataire = corps.to;
      sujet = TEMPLATES[type].subject;
      html = TEMPLATES[type].html(corps.data || {});
    } else {
      return reponse({ error: `Unknown template: ${type || '(aucun)'}` }, 400);
    }

    const resultat = await dep.envoyer({ from: `Mallettico <${dep.expediteur}>`, to: [destinataire], subject: sujet, html });
    if (!resultat.ok) {
      if (reservation != null) await dep.liberer(reservation).catch(() => {});
      journal('erreur', `Resend ${resultat.status} (${type})`);
      return reponse({ error: `Resend API error: ${resultat.status}` }, 502);
    }
    journal('info', `${type} envoyé (${appelant.serveur ? 'serveur' : `utilisateur ${appelant.utilisateur.id}`}, id ${String(resultat.corps?.id)})`);
    return reponse({ success: true, id: resultat.corps?.id ?? null });
  } catch (e) {
    journal('erreur', `erreur interne : ${(e as Error)?.message || e}`);
    return reponse({ error: 'Erreur interne' }, 500);
  }
}
