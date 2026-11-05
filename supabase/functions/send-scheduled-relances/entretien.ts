/**
 * Rappels automatiques du prochain entretien (chaudière, PAC, poêle ; D-33, migration 113) : quels rappels partent
 * aujourd'hui, et l'e-mail envoyé au client. Sans import distant : testé sous vitest
 * (src/lib/__tests__/rappelsEntretienServeur.test.js), avec la même règle que l'app (src/lib/entretien.js).
 *
 * Prospection d'un client existant (CPCE L. 34-5), comme le rappel de ramonage : identité de l'expéditeur, objet avec le
 * nom de l'entreprise, lien de désinscription sans compte et réponse STOP, jamais à un client qui a refusé, un rappel
 * par échéance, pas d'e-mail après la date conseillée. Formules de l'avis juriste-btp du 4 nov. 2026 (§ 4.5) :
 * l'obligation s'énonce dans le corps, avec son article, seulement si ses conditions sont connues (puissance), jamais
 * dans l'objet, et la date conseillée n'est jamais présentée comme une échéance légale.
 */

import { estEmail } from '../_shared/adresses.ts';
import { jourParis, decalerJour, echapper, type ClientServeur, type EntrepriseServeur } from './ramonage.ts';

export interface EntretienServeur {
  id: string;
  client_id: string | null;
  appareil_ref: string;
  categorie: string;
  realise_le: string;
  prochain_avant: string;
  puissance_kw?: number | string | null;
  contrat_performance?: boolean | null;
  local?: string | null;
  appareils?: { marque?: string; modele?: string; type?: string; energie?: string; hydraulique?: boolean }[] | null;
  annulee_le?: string | null;
  rappel_fait_le?: string | null;
  jeton_rappel?: string;
}

export function rappelsAEnvoyerEntretien(
  entretiens: EntretienServeur[],
  clients: ClientServeur[],
  { jours = 30, aujourdhui = jourParis() }: { jours?: number; aujourdhui?: string } = {},
): { entretien: EntretienServeur; client: ClientServeur }[] {
  const parClient = new Map(clients.map((c) => [c.id, c]));
  const derniers = new Map<string, EntretienServeur>();
  for (const e of entretiens) {
    if (e.annulee_le || !e.appareil_ref) continue;
    const actuel = derniers.get(e.appareil_ref);
    if (!actuel || String(e.realise_le) > String(actuel.realise_le)) derniers.set(e.appareil_ref, e);
  }
  const delai = Math.min(120, Math.max(1, Math.round(Number(jours) || 30)));
  const dus: { entretien: EntretienServeur; client: ClientServeur }[] = [];
  for (const e of derniers.values()) {
    const client = e.client_id ? parClient.get(e.client_id) : undefined;
    if (!client || client.rappels_refuses_le || e.rappel_fait_le || !e.prochain_avant) continue;
    if (!estEmail(String(client.email || '').trim())) continue;
    const prochain = String(e.prochain_avant).slice(0, 10);
    if (aujourdhui < decalerJour(prochain, -delai) || aujourdhui > prochain) continue;
    dus.push({ entretien: e, client });
  }
  return dus.sort((a, b) => String(a.entretien.prochain_avant).localeCompare(String(b.entretien.prochain_avant)));
}

const dateFr = (jour: string) => {
  const [a, m, j] = String(jour).slice(0, 10).split('-');
  return `${j}/${m}/${a}`;
};
const NOMS: Record<string, string> = { chaudiere: 'chaudière', pac: 'pompe à chaleur', poele: 'poêle ou insert' };

/** Jour de la visite à Paris (la date de la visite est un horodatage). */
const jourVisite = (realiseLe: string) => jourParis(new Date(realiseLe));

/** Même règle que obligationConnue (src/lib/entretien.js). */
export function obligationConnueServeur(e: EntretienServeur): boolean {
  const brut = e.puissance_kw;
  const p = brut === null || brut === undefined || String(brut).trim() === '' ? null : Number(String(brut).replace(',', '.'));
  const ok = p !== null && Number.isFinite(p);
  if (e.categorie === 'chaudiere') return ok && (p as number) >= 4 && (p as number) <= 400;
  if (e.categorie === 'pac') return ok && (p as number) >= 4 && (p as number) <= 70 && !e.contrat_performance;
  return e.categorie === 'poele' && !(e.appareils || []).some((a) => a?.energie === 'autre_biomasse' || a?.hydraulique);
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 4 novembre 2028 », « 1er mars 2028 » depuis « AAAA-MM-JJ » : même texte que dateEnLettres (src/lib/entretien.js). */
export function dateEnLettresServeur(jour: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(jour || ''));
  if (!m) return '';
  const j = Number(m[3]);
  const mois = MOIS[Number(m[2]) - 1];
  if (!mois || j < 1 || j > 31) return '';
  return `${j === 1 ? '1er' : j} ${mois} ${m[1]}`;
}

/** « AAAA-MM-JJ » décalé de n mois, le jour ramené au dernier du mois s'il n'existe pas (même règle que ajouterMois, src/lib/dates.js). */
export function ajouterMoisServeur(jour: string, n: number): string {
  const [a, m, j] = String(jour || '').slice(0, 10).split('-').map(Number);
  if (!a || !m || !j) return '';
  const cible = m - 1 + n;
  const annee = a + Math.floor(cible / 12);
  const mois = ((cible % 12) + 12) % 12;
  const dernier = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
  return `${String(annee).padStart(4, '0')}-${String(mois + 1).padStart(2, '0')}-${String(Math.min(j, dernier)).padStart(2, '0')}`;
}

/**
 * Même texte que phraseObligation (src/lib/entretien.js), avis juriste-btp du 4 nov. 2026, § 4.5, mot pour mot. Décision
 * D-38 (Hugo, 5 nov. 2026) : la chaudière, la PAC ou climatisation et le poêle ou insert, quand leurs conditions sont
 * connues (puissance, contrat de performance, combustible). La PAC donne la visite + 2 ans, jamais la date conseillée.
 */
export function phraseObligationServeur(e: EntretienServeur): string {
  if (!obligationConnueServeur(e)) return '';
  const visite = jourVisite(e.realise_le);
  if (e.categorie === 'chaudiere') {
    return `Pour rappel, l’entretien d’une chaudière doit être fait une fois par année civile (article R. 224-41-7 du code de l’environnement) : le prochain doit avoir lieu au plus tard le 31 décembre ${Number(visite.slice(0, 4)) + 1}.`;
  }
  if (e.categorie === 'pac') {
    return `Pour rappel, l'entretien d'une pompe à chaleur ou d'une climatisation de 4 à 70 kW doit être fait au moins tous les deux ans (article R. 224-44-3 du code de l'environnement) : le prochain doit avoir lieu au plus tard le ${dateEnLettresServeur(ajouterMoisServeur(visite, 24))}.`;
  }
  if (e.categorie === 'poele') {
    return "Pour rappel, l'entretien d'un poêle ou d'un insert à bois ou à granulés doit être fait au moins tous les douze mois lorsqu'il est utilisé (article R. 1331-68 du code de la santé publique).";
  }
  return '';
}
export const LIBRE_CHOIX = 'Vous restez libre de confier cet entretien au professionnel qualifié de votre choix.';

/** L'e-mail de rappel (objet, HTML, texte). `lien` : /rappel-entretien/{jeton}. */
export function emailRappelEntretien({ entreprise, client, entretien, lien }: {
  entreprise: EntrepriseServeur; client: ClientServeur; entretien: EntretienServeur; lien: string;
}): { objet: string; html: string; texte: string } {
  const nomAppareil = entretien.categorie === 'pac' && entretien.appareils?.[0]?.type === 'clim' ? 'climatisation' : (NOMS[entretien.categorie] || 'appareil');
  const prochain = dateFr(entretien.prochain_avant);
  const visite = dateFr(jourVisite(entretien.realise_le));
  const a = entretien.appareils?.[0] || {};
  const precision = [[a.marque, a.modele].filter(Boolean).join(' '), entretien.local].filter(Boolean).join(', ');
  const qui = [client.prenom, client.nom].filter(Boolean).join(' ').trim();
  const contact = [entreprise.telephone, entreprise.email].filter(Boolean).join(' · ');
  const obligation = phraseObligationServeur(entretien);
  const coordonnees = [entreprise.adresse, entreprise.telephone].filter(Boolean).join(', ');
  const participe = entretien.categorie === 'chaudiere' ? 'entretenu votre chaudière' : `entretenu votre ${nomAppareil}`;
  const pourquoi = `Vous recevez ce rappel parce que ${entreprise.nom}${coordonnees ? ` (${coordonnees})` : ''} a ${participe} le ${visite}.`;
  const objet = `Entretien de votre ${nomAppareil} à prévoir avant le ${prochain} — ${entreprise.nom}`;
  const couleur = /^#[0-9a-f]{6}$/i.test(String(entreprise.couleur || '')) ? String(entreprise.couleur) : '#12336F';
  const annonce = `L’entretien de votre ${nomAppareil}${precision ? ` (${precision})` : ''} est à prévoir avant le ${prochain}.`;
  const rdv = contact ? `Pour convenir d’un rendez-vous : ${contact}, ou répondez simplement à cet e-mail.` : 'Pour convenir d’un rendez-vous, répondez simplement à cet e-mail.';

  const texte = [
    `Bonjour${qui ? ` ${qui}` : ''},`, '', annonce, ...(obligation ? [obligation] : []), rdv, ...(obligation ? [LIBRE_CHOIX] : []), '',
    entreprise.nom, '', pourquoi, `Pour ne plus recevoir de rappel : ${lien} — ou répondez STOP à cet e-mail.`,
  ].join('\n');

  const p = (t: string) => `<p style="margin:0 0 14px;">${t}</p>`;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:${couleur};color:#ffffff;padding:18px 24px;font-size:17px;font-weight:bold;">${echapper(entreprise.nom)}</td></tr>
  <tr><td style="padding:24px;font-size:15px;line-height:1.55;">
    ${p(`Bonjour${qui ? ` ${echapper(qui)}` : ''},`)}
    ${p(`L’entretien de votre ${echapper(nomAppareil)}${precision ? ` (${echapper(precision)})` : ''} est à prévoir avant le <strong>${echapper(prochain)}</strong>.`)}
    ${obligation ? p(echapper(obligation)) : ''}
    ${p(echapper(rdv))}
    ${obligation ? p(echapper(LIBRE_CHOIX)) : ''}
    <p style="margin:0;">${echapper(entreprise.nom)}</p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px 24px;font-size:12px;color:#475569;border-top:1px solid #e2e8f0;line-height:1.5;">
    <p style="margin:0 0 6px;">${echapper(pourquoi)}</p>
    <p style="margin:0;">Pour ne plus recevoir de rappel : <a href="${echapper(lien)}" style="color:#1e3a8a;">Ne plus recevoir de rappel</a> — ou répondez STOP à cet e-mail.</p>
  </td></tr>
</table></td></tr></table></body></html>`;

  return { objet, html, texte };
}

/**
 * Les fiches entreprise qui envoient les rappels : une par organisation, celle de son propriétaire (relecture
 * gardien-securite du 4 nov. 2026, M1 : sinon un membre qui crée sa propre fiche avec l'envoi automatique écrivait aux
 * clients de l'organisation sous son identité, et recevait leurs réponses). Sans organisation : la fiche de son auteur.
 */
/** La fiche entreprise peut-elle envoyer les rappels du module ? Module actif et e-mail de réponse rempli. */
export const ficheValable = (module: 'ramonageActif' | 'entretienActif') => (f: { email?: string | null; settings_json?: any }): boolean => {
  const v = f?.settings_json?.reglages?.[module];
  return (v === true || v === 'true') && String(f?.email || '').includes('@');
};

export function fichesQuiEnvoient<T extends { user_id: string; organization_id?: string | null; archived_at?: string | null; created_at?: string | null }>(
  fiches: T[], proprietaires: Map<string, string>, valable: (f: T) => boolean = () => true,
): T[] {
  const retenues = new Map<string, T>();
  const triees = [...fiches].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
  for (const f of triees) {
    // D'abord écarter les fiches qui ne peuvent pas envoyer (archivée, module éteint, sans e-mail), PUIS choisir celle du
    // propriétaire : sinon une fiche inutilisable retenue en premier bloquerait une autre fiche valable (relecture du 4 nov., 5)
    if (f.archived_at || !valable(f)) continue;
    if (f.organization_id && proprietaires.get(f.organization_id) !== f.user_id) continue;
    const serie = f.organization_id || f.user_id;
    if (!retenues.has(serie)) retenues.set(serie, f);
  }
  return [...retenues.values()];
}

/**
 * Séries (organisation ou compte seul) sans aucune fiche qui envoie, alors que la fiche du propriétaire a le module actif
 * mais pas d'e-mail : à dire dans le rapport (« sans-email-entreprise »), pour qu'un arrêt des rappels ne soit pas muet.
 */
export function fichesSansEmail<T extends { user_id: string; organization_id?: string | null; archived_at?: string | null; email?: string | null; settings_json?: any; nom?: string }>(
  fiches: T[], proprietaires: Map<string, string>, module: 'ramonageActif' | 'entretienActif', retenues: T[],
): T[] {
  const servies = new Set(retenues.map((f) => f.organization_id || f.user_id));
  const vues = new Set<string>();
  return fiches.filter((f) => {
    const serie = f.organization_id || f.user_id;
    if (f.archived_at || servies.has(serie) || vues.has(serie)) return false;
    if (f.organization_id && proprietaires.get(f.organization_id) !== f.user_id) return false;
    const v = f?.settings_json?.reglages?.[module];
    if (!(v === true || v === 'true') || String(f.email || '').includes('@')) return false;
    vues.add(serie);
    return true;
  });
}

/**
 * Lignes lues pour une fiche : celles de son organisation ; sans organisation, celles de son auteur QUI NE SONT DANS
 * AUCUNE organisation (gardien-securite, 4 nov. 2026, reste de M1 : sinon la fiche personnelle d'un membre lisait les
 * clients qu'il a saisis chez son patron et leur écrivait sous son nom).
 */
export function porteeFiche(ent: { user_id: string; organization_id?: string | null }):
  { colonne: 'organization_id'; valeur: string } | { colonne: 'user_id'; valeur: string; horsOrganisation: true } {
  return ent.organization_id
    ? { colonne: 'organization_id', valeur: ent.organization_id }
    : { colonne: 'user_id', valeur: ent.user_id, horsOrganisation: true };
}
/** Applique porteeFiche à une requête PostgREST. */
export function dansPortee(requete: any, ent: { user_id: string; organization_id?: string | null }): any {
  const p = porteeFiche(ent);
  return 'horsOrganisation' in p ? requete.eq('user_id', p.valeur).is('organization_id', null) : requete.eq('organization_id', p.valeur);
}
