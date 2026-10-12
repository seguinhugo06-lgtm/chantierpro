/**
 * Rétractation en ligne (C. conso. L221-21, D221-5) : accusé de réception envoyé au client, sur support durable
 * (e-mail), avec le contenu de sa déclaration et la date et l'heure de son envoi ; avis à l'artisan.
 * Sans import distant : testable sous vitest (src/lib/__tests__/accuseRetractation.test.js), câblé dans index.ts.
 */
import { echapperHtml, estEmail, nettoyerNom } from '../_shared/adresses.ts';

export interface DevisRetracte {
  numero?: string | null;
  execution_anticipee_le?: string | null;
  travaux_urgents?: boolean | null;
  date?: string | null;
  signature_date?: string | null;
  retractation_le?: string | null;
  retractation_nom?: string | null;
  retractation_email?: string | null;
}

export interface Professionnel {
  nom?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
}

export interface Message {
  a: string;
  repondreA?: string;
  sujet: string;
  html: string;
  texte: string;
}

const FUSEAU = 'Europe/Paris';

/** « 12/10/2026 » et « 14 h 32 » à Paris. */
export function dateEtHeure(iso: string | null | undefined): { date: string; heure: string } {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return { date: '', heure: '' };
  const [hh, mm] = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, hour: '2-digit', minute: '2-digit' }).format(d).split(':');
  return {
    date: new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d),
    heure: `${hh} h ${mm}`,
  };
}

/** Quatorze jours après un instant, « JJ/MM/AAAA » (remboursement, L221-24). */
export function quatorzeJoursApres(iso: string | null | undefined): string {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(d.getTime() + 14 * 86400000));
}

/** Demande expresse et rétractation : ce qui peut être facturé (L221-25). Rédaction juriste-btp du 12 oct. 2026. */
export const TRAVAUX_DEMANDES = 'Le client avait demandé que les travaux commencent avant la fin du délai : seuls les travaux réellement exécutés jusqu\'à sa rétractation peuvent lui être facturés, au prorata du prix total (art. L221-25).';

/** La déclaration affichée sur la page avant « Confirmer la rétractation » (reprise du modèle de l'annexe R221-1). */
export const DECLARATION = 'Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessus.';

/** « 2026-10-08 » → « 08/10/2026 » (une date sans heure, lue telle quelle). */
function jour(valeur: string | null | undefined): string {
  const m = String(valeur || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** Ce qui identifie le contrat, tel que le client l'a confirmé sur la page. */
export function libelleContrat(devis: DevisRetracte, pro: Professionnel): string {
  const signe = dateEtHeure(devis.signature_date).date;
  return [
    `Devis n° ${devis.numero || ''}`,
    devis.date ? `du ${jour(devis.date)}` : '',
    signe ? `signé en ligne le ${signe}` : '',
    pro.nom ? `— ${pro.nom}` : '',
  ].filter(Boolean).join(' ');
}

const STYLE = 'font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;max-width:560px;margin:0 auto';

/**
 * Accusé de réception au client (D221-5, dernier alinéa : il mentionne notamment le contenu de la déclaration et
 * la date et l'heure de son envoi). Null si l'adresse saisie n'est pas une adresse valide.
 */
export function accuseReception(devis: DevisRetracte, pro: Professionnel): Message | null {
  const a = String(devis.retractation_email || '').trim().toLowerCase();
  if (!estEmail(a) || !devis.retractation_le) return null;
  const { date, heure } = dateEtHeure(devis.retractation_le);
  const nomPro = nettoyerNom(pro.nom, 120) || 'L\'entreprise';
  const contrat = libelleContrat(devis, pro);
  const nom = String(devis.retractation_nom || '').trim();
  const coordonnees = [pro.adresse ? String(pro.adresse).replace(/\s*\n\s*/g, ', ') : '', pro.telephone, pro.email].filter(Boolean).join(' · ');
  const lignes: Array<[string, string]> = [
    ['Nom et prénom', nom],
    ['Contrat', contrat],
    ['Adresse électronique pour l\'accusé de réception', a],
    ['Déclaration', DECLARATION],
    ['Envoyée le', `${date} à ${heure} (heure de Paris)`],
  ];
  // Remboursement (L221-24), après déduction des travaux faits à sa demande (L221-25) ; exception du dépannage
  // urgent (L221-28, 8°). Rédaction juriste-btp du 12 oct. 2026.
  const remboursement = `Les sommes versées vous seront remboursées au plus tard quatorze jours après cette date${devis.execution_anticipee_le ? ', déduction faite, le cas échéant, du montant des travaux réalisés à votre demande avant votre rétractation (article L221-25 du Code de la consommation)' : ''} (article L221-24 du Code de la consommation).`;
  const urgence = devis.travaux_urgents
    ? 'Votre rétractation vaut pour tout le contrat, sauf pour les pièces et travaux strictement nécessaires au dépannage urgent (article L221-28, 8° du Code de la consommation).'
    : '';
  const texte = [
    `Bonjour ${nom},`,
    '',
    `${nomPro} a bien reçu votre déclaration de rétractation, envoyée en ligne le ${date} à ${heure} (heure de Paris).`,
    '',
    'Contenu de votre déclaration :',
    ...lignes.map(([k, v]) => `- ${k} : ${v}`),
    '',
    remboursement,
    ...(urgence ? ['', urgence] : []),
    '',
    `Accusé de réception envoyé par Mallettico pour le compte de ${nomPro}${coordonnees ? ` (${coordonnees})` : ''}. Conservez cet e-mail.`,
  ].join('\n');
  const html = `
  <div style="${STYLE}">
    <h2 style="margin:16px 0 8px">Accusé de réception de votre rétractation</h2>
    <p>Bonjour ${echapperHtml(nom)},</p>
    <p><strong>${echapperHtml(nomPro)}</strong> a bien reçu votre déclaration de rétractation, envoyée en ligne le
      <strong>${echapperHtml(date)} à ${echapperHtml(heure)}</strong> (heure de Paris).</p>
    <p style="margin-bottom:4px"><strong>Contenu de votre déclaration</strong></p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      ${lignes.map(([k, v]) => `<tr><td style="padding:6px 8px;border:1px solid #e2e8f0;color:#64748b;width:42%">${echapperHtml(k)}</td><td style="padding:6px 8px;border:1px solid #e2e8f0">${echapperHtml(v)}</td></tr>`).join('')}
    </table>
    <p>${echapperHtml(remboursement)}</p>
    ${urgence ? `<p>${echapperHtml(urgence)}</p>` : ''}
    <p style="font-size:13px;color:#64748b">Accusé de réception envoyé par Mallettico pour le compte de
      ${echapperHtml(nomPro)}${coordonnees ? ` (${echapperHtml(coordonnees)})` : ''}. Conservez cet e-mail.</p>
  </div>`;
  return {
    a,
    repondreA: estEmail(String(pro.email || '').trim()) ? String(pro.email).trim() : undefined,
    sujet: `Accusé de réception de votre rétractation — devis ${devis.numero || ''}`.trim(),
    html,
    texte,
  };
}

/** Avis à l'artisan : ce qui s'est passé et ce qu'il doit faire (rembourser sous 14 jours, L221-24 ; avoir). */
export function avisArtisan(devis: DevisRetracte, a: string | null | undefined, appUrl: string): Message | null {
  const dest = String(a || '').trim();
  if (!estEmail(dest) || !devis.retractation_le) return null;
  const { date, heure } = dateEtHeure(devis.retractation_le);
  const nom = String(devis.retractation_nom || '').trim() || 'Votre client';
  const texte = [
    `${nom} s'est rétracté du devis ${devis.numero || ''} le ${date} à ${heure} (rétractation en ligne, article L221-21 du Code de la consommation).`,
    'Le devis est passé à « annulé » s\'il n\'était pas encore facturé.',
    `Remboursez les sommes reçues au plus tard le ${quatorzeJoursApres(devis.retractation_le)}, par le même moyen de paiement (article L221-24), et annulez par un avoir toute facture émise.`,
    ...(devis.execution_anticipee_le ? [TRAVAUX_DEMANDES] : []),
    `Le client a reçu un accusé de réception à l'adresse ${devis.retractation_email || ''}.`,
    '',
    appUrl,
  ].join('\n');
  const html = `
  <div style="${STYLE}">
    <h2 style="margin:16px 0 8px">Rétractation reçue</h2>
    <p><strong>${echapperHtml(nom)}</strong> s'est rétracté du devis <strong>${echapperHtml(devis.numero || '')}</strong>
      le ${echapperHtml(date)} à ${echapperHtml(heure)} (rétractation en ligne, article L221-21 du Code de la consommation).</p>
    <p>Le devis est passé à « annulé » s'il n'était pas encore facturé.</p>
    <p>Remboursez les sommes reçues <strong>au plus tard le ${echapperHtml(quatorzeJoursApres(devis.retractation_le))}</strong>, par le
      même moyen de paiement (article L221-24), et annulez par un avoir toute facture émise.</p>
    ${devis.execution_anticipee_le ? `<p>${echapperHtml(TRAVAUX_DEMANDES)}</p>` : ''}
    <p style="font-size:13px;color:#64748b">Le client a reçu un accusé de réception à l'adresse ${echapperHtml(devis.retractation_email || '')}.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${echapperHtml(appUrl)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px">Ouvrir Mallettico</a>
    </div>
  </div>`;
  return { a: dest, sujet: `Rétractation reçue — devis ${devis.numero || ''}`.trim(), html, texte };
}
