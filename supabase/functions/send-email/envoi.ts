import { corsHeaders } from '../_shared/cors.ts';
import { identifierAppelant, type Utilisateur } from '../_shared/appelant.ts';
import { estEmail, nettoyerNom, normaliserEmail, surUneLigne } from '../_shared/adresses.ts';

export { estEmail, normaliserEmail };
export type { Utilisateur };

/**
 * Règles d'envoi de `send-email`, sans import distant : testables sous vitest
 * (src/lib/__tests__/envoiEmail.test.js), câblées dans index.ts.
 *
 * Avant (revue du 8 oct. 2026) : tout compte connecté, même gratuit, envoyait
 * depuis noreply@mallettico.fr le contenu, les pièces jointes et les
 * destinataires de son choix, sans limite → hameçonnage sous notre domaine.
 *
 * Désormais, pour un utilisateur :
 * - destinataires : ses clients (table clients lue avec SON jeton, donc sous
 *   RLS), sa propre adresse de compte, ou l'équipe (retours) ;
 * - plafond de destinataires par 24 h glissantes et par compte ;
 * - pièces jointes : uniquement des PDF, en base64, de taille bornée ;
 * - une seule action : send_email.
 * Le rôle serveur (relances planifiées) garde un envoi direct : ses
 * destinataires viennent de la base, pas d'un navigateur.
 */

export const ADRESSE_EQUIPE = 'contact@mallettico.fr';
export const LIMITE_JOUR_DEFAUT = 50;
export const MAX_DESTINATAIRES = 5;
export const MAX_SUJET = 250;
export const MAX_HTML = 200_000;
export const MAX_TEXTE = 50_000;
export const MAX_PIECES = 3;
export const MAX_PIECES_BASE64 = 14_000_000; // ≈ 10 Mo de PDF
const RE_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Motif ILIKE qui retrouve l'adresse, même entourée d'espaces dans la fiche client. */
export function motifRechercheClient(adresse: string): string {
  return `%${normaliserEmail(adresse).replace(/_/g, '\\_')}%`;
}

type PieceJointe = { filename: string; content: string };

export type Demande = {
  destinataires: string[];
  sujet: string;
  html?: string;
  texte?: string;
  nomExpediteur?: string;
  repondreA?: string;
  piecesJointes?: PieceJointe[];
};

/** Nom affiché de l'expéditeur, sans ce qui casserait l'en-tête From ni ce qui imite une adresse. */
export function nettoyerNomExpediteur(valeur: unknown): string | undefined {
  return nettoyerNom(valeur, 80);
}

/** Valide et normalise le corps de la requête. Renvoie un message d'erreur pour l'artisan, ou la demande. */
export function validerDemande(params: Record<string, unknown>): { erreur: string } | { demande: Demande } {
  const brut = params.to;
  const liste = Array.isArray(brut) ? brut : brut == null || brut === '' ? [] : [brut];
  if (liste.length === 0) return { erreur: 'Destinataire manquant.' };
  if (liste.length > MAX_DESTINATAIRES) return { erreur: `Trop de destinataires (${MAX_DESTINATAIRES} au plus).` };
  const destinataires: string[] = [];
  for (const valeur of liste) {
    const adresse = typeof valeur === 'string' ? valeur.trim() : '';
    if (!estEmail(adresse)) return { erreur: `Adresse e-mail invalide : ${String(valeur).slice(0, 80)}` };
    if (!destinataires.some((d) => normaliserEmail(d) === normaliserEmail(adresse))) destinataires.push(adresse);
  }

  const sujet = typeof params.subject === 'string' ? surUneLigne(params.subject).trim() : '';
  if (!sujet) return { erreur: 'Objet manquant.' };
  if (sujet.length > MAX_SUJET) return { erreur: `Objet trop long (${MAX_SUJET} caractères au plus).` };

  const html = params.html == null || params.html === '' ? undefined : params.html;
  const texte = params.text == null || params.text === '' ? undefined : params.text;
  if (html !== undefined && (typeof html !== 'string' || html.length > MAX_HTML)) return { erreur: 'Contenu du message invalide ou trop long.' };
  if (texte !== undefined && (typeof texte !== 'string' || texte.length > MAX_TEXTE)) return { erreur: 'Texte du message invalide ou trop long.' };

  // Une adresse de réponse mal saisie dans le profil ne doit pas bloquer l'envoi d'un devis : on l'ignore.
  const repondreA = typeof params.reply_to === 'string' && estEmail(params.reply_to.trim()) ? params.reply_to.trim() : undefined;

  let piecesJointes: PieceJointe[] | undefined;
  if (params.attachments != null) {
    if (!Array.isArray(params.attachments)) return { erreur: 'Pièces jointes invalides.' };
    if (params.attachments.length > MAX_PIECES) return { erreur: `Trop de pièces jointes (${MAX_PIECES} au plus).` };
    let total = 0;
    piecesJointes = [];
    for (const piece of params.attachments) {
      const nom = typeof piece?.filename === 'string' ? surUneLigne(piece.filename).trim() : '';
      const contenu = typeof piece?.content === 'string' ? piece.content : '';
      // Un PDF encodé en base64 commence par « JVBER » (« %PDF »).
      const estPdf = /\.pdf$/i.test(nom) && !/[/\\]/.test(nom) && nom.length <= 150
        && contenu.startsWith('JVBER') && RE_BASE64.test(contenu);
      if (!estPdf) return { erreur: 'Seuls des documents PDF peuvent être joints.' };
      total += contenu.length;
      if (total > MAX_PIECES_BASE64) return { erreur: 'Pièces jointes trop lourdes (10 Mo au plus).' };
      piecesJointes.push({ filename: nom, content: contenu });
    }
    if (piecesJointes.length === 0) piecesJointes = undefined;
  }

  return {
    demande: {
      destinataires,
      sujet,
      html: html as string | undefined,
      texte: texte as string | undefined,
      nomExpediteur: nettoyerNomExpediteur(params.from_name),
      repondreA,
      piecesJointes,
    },
  };
}

/** Le corps envoyé à Resend : construit champ par champ, rien d'autre ne passe (ni cc, ni bcc, ni path distant). */
export function construireMessageResend(demande: Demande, expediteur: string): Record<string, unknown> {
  const message: Record<string, unknown> = {
    from: demande.nomExpediteur ? `${demande.nomExpediteur} <${expediteur}>` : expediteur,
    to: demande.destinataires,
    subject: demande.sujet,
  };
  if (demande.html) message.html = demande.html;
  if (demande.texte) message.text = demande.texte;
  if (!demande.html && !demande.texte) message.text = demande.sujet;
  if (demande.repondreA) message.reply_to = demande.repondreA;
  if (demande.piecesJointes) message.attachments = demande.piecesJointes;
  return message;
}

/**
 * Destinataires qu'un utilisateur n'a pas le droit de viser.
 * `emailsClients(adresse)` renvoie les adresses des fiches clients que
 * l'utilisateur peut lire (sous RLS) et qui ressemblent à `adresse`.
 */
export async function destinatairesRefuses(
  destinataires: string[],
  emailCompte: string | null,
  emailsClients: (adresse: string) => Promise<string[]>,
): Promise<string[]> {
  const compte = emailCompte ? normaliserEmail(emailCompte) : null;
  const refuses: string[] = [];
  for (const adresse of destinataires) {
    const cible = normaliserEmail(adresse);
    if (cible === compte || cible === ADRESSE_EQUIPE) continue;
    const trouves = await emailsClients(adresse);
    if (!trouves.some((e) => typeof e === 'string' && normaliserEmail(e) === cible)) refuses.push(adresse);
  }
  return refuses;
}

export type Dependances = {
  expediteur: string;
  cleResend?: string;
  cleServeur?: string;
  limiteJour: number;
  /** Utilisateur du jeton, vérifié par le serveur d'authentification ; null si invalide ou expiré. */
  utilisateur: (jeton: string) => Promise<Utilisateur | null>;
  /** Adresses des fiches clients lisibles avec ce jeton (RLS) qui ressemblent à l'adresse. Lève si la lecture échoue. */
  emailsClients: (jeton: string, adresse: string) => Promise<string[]>;
  /** Réserve `nb` envois dans le plafond : id de la réservation, null si le plafond est atteint, `indisponible` si le compteur n'est pas installé. Lève sur toute autre erreur. */
  reserver: (userId: string, nb: number, limite: number) => Promise<{ id: number | null; indisponible?: boolean }>;
  /** Rend une réservation (envoi échoué). */
  liberer: (id: number) => Promise<void>;
  envoyer: (message: Record<string, unknown>) => Promise<{ ok: boolean; status: number; corps: Record<string, unknown> }>;
  journal?: (niveau: 'info' | 'erreur', message: string) => void;
};

function reponse(corps: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export async function traiterDemande(req: Request, dep: Dependances): Promise<Response> {
  const journal = dep.journal || (() => {});
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reponse({ error: 'Méthode non autorisée' }, 405);

  try {
    // La clé anon est publique et passe verify_jwt : on identifie l'appelant nous-mêmes.
    const appelant = await identifierAppelant(req, dep);
    if (!appelant) return reponse({ error: 'Authentification requise' }, 401);
    const estServeur = appelant.serveur;
    const utilisateur = appelant.serveur ? null : appelant.utilisateur;
    const jeton = appelant.serveur ? '' : appelant.jeton;

    let corps: Record<string, unknown>;
    try {
      corps = await req.json();
    } catch {
      return reponse({ error: 'Requête illisible' }, 400);
    }
    const { action, ...params } = corps || {};
    if (action !== 'send_email') return reponse({ error: `Action inconnue: ${String(action)}` }, 400);

    const validation = validerDemande(params);
    if ('erreur' in validation) return reponse({ error: validation.erreur }, 400);
    const { demande } = validation;

    if (!dep.cleResend) {
      return reponse({ error: 'Resend non configuré. Ajoutez RESEND_API_KEY dans les secrets Supabase.' }, 503);
    }

    let reservation: number | null = null;
    if (utilisateur) {
      let refuses: string[];
      try {
        refuses = await destinatairesRefuses(demande.destinataires, utilisateur.email, (adresse) => dep.emailsClients(jeton, adresse));
      } catch (e) {
        journal('erreur', `lecture des clients impossible : ${(e as Error)?.message || e}`);
        return reponse({ error: 'Vérification du destinataire impossible pour le moment. Réessayez dans un instant.' }, 503);
      }
      if (refuses.length > 0) {
        journal('info', `destinataire refusé (utilisateur ${utilisateur.id})`);
        return reponse({
          error: `Envoi refusé : ${refuses[0]} n'est l'adresse d'aucun de vos clients. Enregistrez-la sur la fiche du client, puis renvoyez.`,
          code: 'destinataire_non_client',
        }, 403);
      }

      const quota = await dep.reserver(utilisateur.id, demande.destinataires.length, dep.limiteJour);
      if (quota.indisponible) {
        // Migration 077 pas encore appliquée : le plafond manque, mais la restriction
        // des destinataires (la protection principale) s'applique. Visible dans les journaux.
        journal('erreur', 'plafond inactif : migration 077 (envois_email) non appliquée');
      } else if (quota.id == null) {
        return reponse({
          error: `Limite de ${dep.limiteJour} e-mails par 24 heures atteinte. Réessayez plus tard, ou écrivez à ${ADRESSE_EQUIPE} si vous avez besoin de plus.`,
          code: 'plafond_atteint',
        }, 429);
      } else {
        reservation = quota.id;
      }
    }

    let resultat: Awaited<ReturnType<Dependances['envoyer']>>;
    try {
      resultat = await dep.envoyer(construireMessageResend(demande, dep.expediteur));
    } catch (e) {
      if (reservation != null) await dep.liberer(reservation).catch(() => {});
      journal('erreur', `Resend injoignable : ${(e as Error)?.message || e}`);
      return reponse({ error: "Service d'envoi injoignable. Réessayez dans un instant." }, 502);
    }
    if (!resultat.ok) {
      if (reservation != null) await dep.liberer(reservation).catch(() => {});
      journal('erreur', `Resend ${resultat.status} : ${String(resultat.corps?.message || '')}`);
      return reponse({ error: String(resultat.corps?.message || 'Erreur Resend') }, 502);
    }

    journal('info', `envoyé (${demande.destinataires.length} destinataire(s), ${estServeur ? 'serveur' : `utilisateur ${utilisateur?.id}`}, id ${String(resultat.corps?.id)})`);
    return reponse({ success: true, id: resultat.corps?.id ?? null });
  } catch (e) {
    journal('erreur', `erreur interne : ${(e as Error)?.message || e}`);
    return reponse({ error: 'Erreur interne' }, 500);
  }
}
