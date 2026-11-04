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
  appareils?: { marque?: string; modele?: string }[] | null;
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
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const dateLongue = (jour: string) => {
  const [a, m, j] = String(jour).slice(0, 10).split('-').map(Number);
  return `${j} ${MOIS[m - 1]} ${a}`;
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
  return e.categorie === 'poele';
}

/** Même texte que phraseObligation (src/lib/entretien.js), avis § 4.5. */
export function phraseObligationServeur(e: EntretienServeur): string {
  if (!obligationConnueServeur(e)) return '';
  const visite = jourVisite(e.realise_le);
  if (e.categorie === 'chaudiere') {
    return `Pour rappel, l’entretien d’une chaudière doit être fait une fois par année civile (article R. 224-41-7 du code de l’environnement) : le prochain doit avoir lieu au plus tard le 31 décembre ${Number(visite.slice(0, 4)) + 1}.`;
  }
  if (e.categorie === 'pac') {
    const [a, m, j] = visite.split('-').map(Number);
    // + 2 ans, jour ramené au dernier du mois (29 février)
    const dernier = new Date(Date.UTC(a + 2, m, 0)).getUTCDate();
    const echeance = `${a + 2}-${String(m).padStart(2, '0')}-${String(Math.min(j, dernier)).padStart(2, '0')}`;
    return `Pour rappel, l’entretien d’une pompe à chaleur ou d’une climatisation de 4 à 70 kW doit être fait au moins tous les deux ans (article R. 224-44-3 du code de l’environnement) : le prochain doit avoir lieu au plus tard le ${dateLongue(echeance)}.`;
  }
  return 'Pour rappel, l’entretien d’un poêle ou d’un insert à bois ou à granulés doit être fait au moins tous les douze mois lorsqu’il est utilisé (article R. 1331-68 du code de la santé publique).';
}
export const LIBRE_CHOIX = 'Vous restez libre de confier cet entretien au professionnel qualifié de votre choix.';

/** L'e-mail de rappel (objet, HTML, texte). `lien` : /rappel-entretien/{jeton}. */
export function emailRappelEntretien({ entreprise, client, entretien, lien }: {
  entreprise: EntrepriseServeur; client: ClientServeur; entretien: EntretienServeur; lien: string;
}): { objet: string; html: string; texte: string } {
  const nomAppareil = NOMS[entretien.categorie] || 'appareil';
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
