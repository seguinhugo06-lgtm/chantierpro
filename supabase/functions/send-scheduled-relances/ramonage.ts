/**
 * Rappels automatiques du prochain ramonage (tâche ramonage, D-30, migration 104) : quels rappels partent aujourd'hui,
 * et l'e-mail envoyé au client. Sans import distant : testé sous vitest (src/lib/__tests__/rappelsRamonageServeur.test.js),
 * avec la même règle que l'app (src/lib/ramonage.js, rappelsDus).
 *
 * Un rappel est de la prospection directe (CPCE L. 34-5), permise envers un client pour le même service si chaque
 * message donne l'identité de l'expéditeur et un moyen simple de s'y opposer (relecture juriste-btp du 23 oct. 2026) :
 *   - objet « Ramonage à prévoir avant le … — {entreprise} », expéditeur affiché : l'artisan ;
 *   - pied : pourquoi ce rappel, lien de désinscription qui marche sans compte, ou réponse STOP ;
 *   - jamais « obligatoire », ni ton d'avis administratif (C. conso. L. 121-2) ;
 *   - jamais à un client qui a refusé, un seul rappel par échéance, seulement pour un ramonage enregistré.
 */

export interface RamonageServeur {
  id: string;
  client_id: string | null;
  appareil_ref: string;
  realise_le: string;
  prochain_avant: string;
  appareil_type?: string;
  combustible?: string;
  conduit?: string;
  localisation?: string | null;
  precisions?: string | null;
  annulee_le?: string | null;
  rappel_fait_le?: string | null;
  jeton_rappel?: string;
}

export interface ClientServeur {
  id: string;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  rappels_refuses_le?: string | null;
}

/** Jour « AAAA-MM-JJ » à Paris. */
export function jourParis(instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

/** « AAAA-MM-JJ » décalé de n jours (calcul en UTC sur la date seule : pas d'effet d'heure d'été). */
export function decalerJour(jour: string, n: number): string {
  const [a, m, j] = String(jour).slice(0, 10).split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + n));
  return d.toISOString().slice(0, 10);
}

/**
 * Rappels à envoyer aujourd'hui : pour chaque appareil, son dernier passage non annulé, rappel pas encore fait, client
 * connu avec une adresse e-mail et sans refus, à partir de « prochain − jours » et jusqu'à la date du prochain
 * ramonage (une échéance dépassée reste dans « À faire » de l'app, pour un appel ou un SMS : pas d'e-mail en retard).
 */
export function rappelsAEnvoyer(
  ramonages: RamonageServeur[],
  clients: ClientServeur[],
  { jours = 30, aujourdhui = jourParis() }: { jours?: number; aujourdhui?: string } = {},
): { ramonage: RamonageServeur; client: ClientServeur }[] {
  const parClient = new Map(clients.map((c) => [c.id, c]));
  const derniers = new Map<string, RamonageServeur>();
  for (const r of ramonages) {
    if (r.annulee_le || !r.appareil_ref) continue;
    const actuel = derniers.get(r.appareil_ref);
    if (!actuel || String(r.realise_le) > String(actuel.realise_le)) derniers.set(r.appareil_ref, r);
  }
  const delai = Math.max(0, Number(jours) || 0);
  const dus: { ramonage: RamonageServeur; client: ClientServeur }[] = [];
  for (const r of derniers.values()) {
    const client = r.client_id ? parClient.get(r.client_id) : undefined;
    if (!client || client.rappels_refuses_le || r.rappel_fait_le || !r.prochain_avant) continue;
    if (!String(client.email || '').includes('@')) continue;
    const prochain = String(r.prochain_avant).slice(0, 10);
    if (aujourdhui < decalerJour(prochain, -delai) || aujourdhui > prochain) continue;
    dus.push({ ramonage: r, client });
  }
  return dus.sort((a, b) => String(a.ramonage.prochain_avant).localeCompare(String(b.ramonage.prochain_avant)));
}

const TYPES: Record<string, string> = {
  cheminee_ouverte: 'cheminée ouverte', insert: 'insert', poele_bois: 'poêle à bois', poele_granules: 'poêle à granulés',
  chaudiere: 'chaudière', autre: 'appareil',
};

export function echapper(t: unknown): string {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const dateFr = (jour: string) => {
  const [a, m, j] = String(jour).slice(0, 10).split('-');
  return `${j}/${m}/${a}`;
};

export interface EntrepriseServeur {
  nom: string;           // nom imprimé (avec « EI »)
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  couleur?: string | null;
}

/** L'e-mail de rappel (objet, HTML, texte). `lien` : page publique de désinscription (/rappel-ramonage/{jeton}). */
export function emailRappelRamonage({ entreprise, client, ramonage, lien }: {
  entreprise: EntrepriseServeur; client: ClientServeur; ramonage: RamonageServeur; lien: string;
}): { objet: string; html: string; texte: string } {
  const prochain = dateFr(ramonage.prochain_avant);
  const dernier = dateFr(String(ramonage.realise_le).slice(0, 10));
  const appareil = `${TYPES[ramonage.appareil_type || ''] || 'appareil'}${ramonage.localisation ? ` (${ramonage.localisation})` : ''}`;
  const qui = [client.prenom, client.nom].filter(Boolean).join(' ').trim();
  const contact = [entreprise.telephone, entreprise.email].filter(Boolean).join(' · ');
  const pourquoi = `Vous recevez ce rappel parce que ${entreprise.nom}${[entreprise.adresse, entreprise.telephone].filter(Boolean).length ? ` (${[entreprise.adresse, entreprise.telephone].filter(Boolean).join(', ')})` : ''} a ramoné votre conduit le ${dernier}.`;
  const objet = `Ramonage à prévoir avant le ${prochain} — ${entreprise.nom}`;
  const couleur = /^#[0-9a-f]{6}$/i.test(String(entreprise.couleur || '')) ? String(entreprise.couleur) : '#12336F';

  const texte = [
    `Bonjour${qui ? ` ${qui}` : ''},`,
    '',
    `Votre ramonage (${appareil}) est à prévoir avant le ${prochain}.`,
    contact ? `Pour convenir d'un rendez-vous : ${contact}, ou répondez simplement à cet e-mail.` : 'Pour convenir d\'un rendez-vous, répondez simplement à cet e-mail.',
    '',
    entreprise.nom,
    '',
    pourquoi,
    `Pour ne plus recevoir de rappel : ${lien}, ou répondez STOP.`,
  ].join('\n');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:${couleur};color:#ffffff;padding:18px 24px;font-size:17px;font-weight:bold;">${echapper(entreprise.nom)}</td></tr>
  <tr><td style="padding:24px;font-size:15px;line-height:1.55;">
    <p style="margin:0 0 14px;">Bonjour${qui ? ` ${echapper(qui)}` : ''},</p>
    <p style="margin:0 0 14px;">Votre ramonage (${echapper(appareil)}) est à prévoir avant le <strong>${echapper(prochain)}</strong>.</p>
    <p style="margin:0 0 14px;">${contact ? `Pour convenir d’un rendez-vous : ${echapper(contact)}, ou répondez simplement à cet e-mail.` : 'Pour convenir d’un rendez-vous, répondez simplement à cet e-mail.'}</p>
    <p style="margin:0;">${echapper(entreprise.nom)}</p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px 24px;font-size:12px;color:#475569;border-top:1px solid #e2e8f0;line-height:1.5;">
    <p style="margin:0 0 6px;">${echapper(pourquoi)}</p>
    <p style="margin:0;">Pour ne plus recevoir de rappel : <a href="${echapper(lien)}" style="color:#1e3a8a;">ne plus recevoir de rappel</a>, ou répondez STOP.</p>
  </td></tr>
</table></td></tr></table></body></html>`;

  return { objet, html, texte };
}
