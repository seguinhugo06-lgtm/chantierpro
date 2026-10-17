/**
 * Exemplaire signé envoyé au client (tâche confirmation-client) : la confirmation du contrat sur support durable
 * (e-mail avec le devis signé en PDF), due au client après la signature (C. conso. L221-13 pour un contrat à
 * distance ; L221-9 pour un contrat hors établissement), le devis joint portant l'avis et le formulaire de
 * rétractation d'un particulier. Utilisé par notify-signature (signature par le lien) et par l'app (signature sur
 * place, envoi par l'artisan). Sans import distant : testable sous vitest (src/lib/__tests__/exemplaireSigne.test.js).
 */
import { echapperHtml, estEmail, nettoyerNom, surUneLigne } from '../_shared/adresses.ts';
import { dateEtHeure, type Professionnel } from './retractation.ts';

export interface DevisSigne {
  numero?: string | null;
  date?: string | null;
  total_ttc?: number | null;
  signature_date?: string | null;
  signatureDate?: string | null;
  execution_anticipee_le?: string | null;
  travaux_urgents?: boolean | null;
}

export interface ClientSigne {
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
}

export interface Exemplaire {
  a: string;
  repondreA?: string;
  sujet: string;
  html: string;
  texte: string;
}

/** « 2026-10-08 » → « 08/10/2026 ». */
function jour(valeur: string | null | undefined): string {
  const m = String(valeur || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

const euros = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

const STYLE = 'font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;max-width:560px;margin:0 auto';

/** Nom du fichier joint : « Devis-DEV-2026-00012-signe.pdf » (caractères sûrs seulement). */
export function nomFichierExemplaire(numero: string | null | undefined): string {
  const n = String(numero || 'devis').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'devis';
  return `Devis-${n}-signe.pdf`;
}

/**
 * E-mail qui accompagne l'exemplaire signé. Null si le client n'a pas d'adresse valide.
 * @param p.particulier client consommateur : le devis joint porte l'avis et le formulaire de rétractation
 * @param p.lienRetractation lien de la page de signature, où se trouve « Renoncer au contrat ici » (signature en
 *   ligne d'un particulier depuis le 19/06/2026), sinon vide
 * @param p.surPlace signé sur place, sur l'appareil de l'artisan (sinon : en ligne, par le lien)
 * @param p.accordEmail le client a accepté, à la signature, de recevoir son exemplaire par e-mail (L221-9)
 * Textes : relecture juriste-btp du 17 oct. 2026.
 */
export function messageExemplaire(p: {
  devis: DevisSigne;
  pro: Professionnel;
  client: ClientSigne;
  particulier?: boolean;
  lienRetractation?: string;
  surPlace?: boolean;
  accordEmail?: boolean;
}): Exemplaire | null {
  const a = String(p.client?.email || '').trim().toLowerCase();
  if (!estEmail(a)) return null;
  const { devis, pro } = p;
  const nomPro = nettoyerNom(pro.nom, 120) || 'L\'entreprise';
  const nomClient = [p.client.prenom, p.client.nom].map((x) => String(x || '').trim()).filter(Boolean).join(' ');
  const signe = dateEtHeure(devis.signature_date || devis.signatureDate);
  const demande = devis.execution_anticipee_le ? dateEtHeure(devis.execution_anticipee_le) : null;
  const coordonnees = [pro.adresse ? String(pro.adresse).replace(/\s*\n\s*/g, ', ') : '', pro.telephone, pro.email].filter(Boolean).join(' · ');

  const paragraphes = [
    `Vous avez signé${p.surPlace ? '' : ' en ligne'}, ${signe.date ? `le ${signe.date} à ${signe.heure} (heure de Paris), ` : ''}le devis n° ${devis.numero || ''}${devis.date ? ` du ${jour(devis.date)}` : ''}, établi par ${nomPro}, d'un montant total de ${euros(devis.total_ttc)}.`,
    `Par ce message, ${nomPro} vous confirme le contrat conclu, aux conditions du devis joint.`,
    'Vous trouverez ci-joint votre exemplaire du devis signé (PDF). Conservez-le.',
    ...(p.accordEmail ? ['Comme vous l\'avez accepté lors de la signature, cet exemplaire vous est remis par e-mail.'] : []),
    ...(demande ? [`Vous avez demandé que les travaux commencent avant la fin du délai de rétractation de quatorze jours (demande faite le ${demande.date} à ${demande.heure}, heure de Paris) et reconnu qu'une fois les travaux entièrement exécutés, vous n'aurez plus le droit de vous rétracter. Si vous vous rétractez après le début des travaux, vous paierez un montant proportionnel aux travaux réalisés jusqu'à votre rétractation.`] : []),
    ...(devis.travaux_urgents ? ['Vous avez demandé que ces travaux de dépannage soient réalisés en urgence à votre domicile. Pour les pièces et travaux strictement nécessaires pour répondre à l\'urgence, vous ne bénéficiez pas du droit de rétractation (article L221-28, 8° du Code de la consommation).'] : []),
    ...(p.particulier ? ['Le devis joint comprend l\'information sur votre droit de rétractation et le formulaire de rétractation.'] : []),
    ...(p.particulier && p.lienRetractation ? [`Pendant le délai de rétractation, vous pouvez aussi renoncer au contrat en ligne, sur cette page : ${p.lienRetractation}`] : []),
  ];
  const signatureEmail = `Message envoyé par Mallettico pour le compte de l'entreprise ${nomPro}${coordonnees ? ` (${coordonnees})` : ''}.`;
  const texte = [`Bonjour${nomClient ? ` ${nomClient}` : ''},`, '', ...paragraphes.flatMap((x) => [x, '']), signatureEmail].join('\n');
  const html = `
  <div style="${STYLE}">
    <h2 style="margin:16px 0 8px">Votre exemplaire du devis signé</h2>
    <p>Bonjour${nomClient ? ` ${echapperHtml(nomClient)}` : ''},</p>
    ${paragraphes.map((x) => `<p>${echapperHtml(x)}</p>`).join('\n    ')}
    <p style="font-size:13px;color:#64748b">${echapperHtml(signatureEmail)}</p>
  </div>`;
  return {
    a,
    repondreA: estEmail(String(pro.email || '').trim()) ? String(pro.email).trim() : undefined,
    sujet: surUneLigne(`Votre exemplaire signé — devis ${devis.numero || ''} — ${nomPro}`).slice(0, 250),
    html,
    texte,
  };
}

/** PDF reçu de la page du client, en base64 : vrai PDF (« %PDF » = « JVBER »), taille bornée (≈ 10 Mo). */
export const MAX_PDF_BASE64 = 14_000_000;
export function pdfAcceptable(pdf: unknown): pdf is string {
  return typeof pdf === 'string' && pdf.length <= MAX_PDF_BASE64 && pdf.length % 4 === 0 && /^JVBER[A-Za-z0-9+/]*={0,2}$/.test(pdf);
}
