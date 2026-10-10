/**
 * emailSender — envoi réel d'emails de documents (devis / factures) via Resend.
 *
 * Remplace l'ancien `mailto:` (qui n'envoyait rien) : génère le PDF à partir
 * du HTML du document, l'encode en base64 et appelle l'Edge Function `send-email`.
 *
 * Pré-requis prod : Edge Function `send-email` déployée + secret `RESEND_API_KEY`
 * configuré dans Supabase, et domaine d'envoi vérifié côté Resend.
 */
import supabase from '../supabaseClient';
import { echapperHtml } from './echapperHtml';
import { pdfDepuisHtml } from './pdfDepuisHtml';

// Encode un Uint8Array en base64 sans dépasser la limite d'arguments de String.fromCharCode.
function uint8ToBase64(bytes) {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Appelle `send-email` et remonte le vrai message du serveur (destinataire qui
 * n'est pas un client, plafond quotidien atteint…). Sur une réponse 4xx/5xx,
 * supabase-js ne donne que « Edge Function returned a non-2xx status code » et
 * range la réponse dans `error.context`.
 */
export async function invoquerEnvoiEmail(body) {
  if (!supabase) throw new Error('Envoi indisponible en mode démo');
  const { data, error } = await supabase.functions.invoke('send-email', { body });
  if (error) throw new Error(await messageErreurFonction(error));
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Le message d'erreur réel d'une fonction Edge (champ `error` de sa réponse), sinon celui de supabase-js. */
export async function messageErreurFonction(error) {
  try {
    const corps = await error?.context?.json?.();
    if (corps?.error) return corps.error;
  } catch { /* corps illisible : on garde le message d'origine */ }
  return error?.message || "Erreur lors de l'envoi";
}

/**
 * Envoie un email, avec en option un PDF généré depuis un HTML complet.
 *
 * @param {Object} p
 * @param {string|string[]} p.to        - destinataire(s)
 * @param {string} p.subject            - objet
 * @param {string} p.bodyHtml           - corps HTML (email-safe)
 * @param {string} [p.fromName]         - nom affiché de l'expéditeur
 * @param {string} [p.replyTo]          - adresse de réponse
 * @param {string} [p.pdfHtml]          - HTML complet à convertir en PDF joint
 * @param {string} [p.pdfFilename]      - nom du fichier PDF
 * @returns {Promise<{ id?: string }>}
 */
export async function sendDocumentEmail({ to, subject, bodyHtml, fromName, replyTo, pdfHtml, pdfFilename }) {
  if (!supabase) throw new Error('Envoi indisponible en mode démo');

  let attachments;
  if (pdfHtml) {
    const pdfBytes = await pdfDepuisHtml(pdfHtml);
    attachments = [{ filename: pdfFilename || 'document.pdf', content: uint8ToBase64(pdfBytes) }];
  }

  return invoquerEnvoiEmail({
    action: 'send_email',
    to,
    subject,
    html: bodyHtml,
    from_name: fromName || undefined,
    reply_to: replyTo || undefined,
    attachments,
  });
}

/**
 * Construit un corps d'email HTML simple et lisible (compatible clients mail).
 */
export function buildDocumentEmailBody({ doc, client, entreprise, couleur = '#f97316', montantFormatte, signatureUrl = null, solde = null, lienPaiement = '' }) {
  const isFacture = doc.type === 'facture';
  const label = isFacture ? 'facture' : 'devis';
  // Tout texte saisi est échappé (un nom contenant du HTML cassait l'e-mail, ou pire)
  const clientNom = echapperHtml(`${client.prenom || ''} ${client.nom || ''}`.trim()) || 'Madame, Monsieur';
  const nomEntreprise = echapperHtml(entreprise?.nom || 'Votre artisan');
  const numero = echapperHtml(doc.numero);
  const echeanceTexte = solde?.echeance ? new Date(solde.echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const euro = (n) => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  // Bouton de paiement seulement s'il reste quelque chose à payer
  const lienBlock = isFacture && lienPaiement && (!solde || solde.reste > 0.005) ? `
    <div style="margin:24px 0;text-align:center">
      <a href="${echapperHtml(lienPaiement)}" style="display:inline-block;background:${couleur};color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:10px">Régler en ligne</a>
    </div>` : '';
  const validite = doc.validite || entreprise?.validiteDevis || 30;

  const signatureBlock = !isFacture && signatureUrl ? `
    <div style="margin:28px 0;text-align:center">
      <a href="${echapperHtml(signatureUrl)}"
         style="display:inline-block;background:${couleur};color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:10px">
        Consulter et signer le devis en ligne
      </a>
      <p style="font-size:12px;color:#64748b;margin-top:10px">
        Signature électronique sécurisée, sans créer de compte.<br>
        Si le bouton ne fonctionne pas : <a href="${echapperHtml(signatureUrl)}" style="color:${couleur}">${echapperHtml(signatureUrl)}</a>
      </p>
    </div>` : '';

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;max-width:560px;margin:0 auto">
    <p>Bonjour ${clientNom},</p>
    ${solde?.enRetard
      ? `<p>Sauf erreur de ma part, la facture <strong>${numero}</strong>${echeanceTexte ? `, arrivée à échéance le ${echeanceTexte},` : ''} n'est pas encore réglée : il reste <strong>${euro(solde.reste)}</strong> à payer. Vous la trouverez en pièce jointe.</p>
    <p>Si votre règlement est déjà parti, merci de ne pas tenir compte de ce message.</p>`
      : isFacture && solde
        ? `<p>Veuillez trouver ci-joint votre facture <strong>${numero}</strong>, d'un montant de <strong>${euro(solde.total)}</strong>${solde.reste > 0.005 && echeanceTexte ? `, à régler au plus tard le ${echeanceTexte}` : ''}${solde.acompteRecu && solde.reste > 0.005 ? ` (reste à régler : <strong>${euro(solde.reste)}</strong>)` : ''}${solde.reste <= 0.005 ? ', entièrement réglée' : ''}.</p>`
        : `<p>Veuillez trouver ci-joint votre ${label} <strong>${numero}</strong>${montantFormatte ? `, d'un montant de <strong>${montantFormatte}</strong>` : ''}.</p>`}
    ${signatureBlock}
    ${lienBlock}
    ${isFacture
      ? `<p>Je vous remercie de votre confiance.</p>`
      : `<p>Ce devis reste valable <strong>${validite} jours</strong>. N'hésitez pas à me contacter pour toute question.</p>`}
    <p style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
      Cordialement,<br>
      <strong style="color:${couleur}">${nomEntreprise}</strong>
      ${entreprise?.tel ? `<br>${echapperHtml(entreprise.tel)}` : ''}
      ${entreprise?.email ? `<br>${echapperHtml(entreprise.email)}` : ''}
    </p>
  </div>`;
}

/**
 * Reçu de paiement envoyé au client quand l'artisan encaisse une facture.
 */
export function buildPaymentReceiptEmailBody({ doc, client, entreprise, couleur = '#f97316', montantFormatte, modePaiement, datePaiement }) {
  const clientNom = echapperHtml(`${client.prenom || ''} ${client.nom || ''}`.trim()) || 'Madame, Monsieur';
  const nomEntreprise = echapperHtml(entreprise?.nom || 'Votre artisan');
  const modeLabels = { virement: 'virement bancaire', cheque: 'chèque', especes: 'espèces', cb: 'carte bancaire', carte: 'carte bancaire' };
  const modeLabel = echapperHtml(modeLabels[modePaiement] || modePaiement || '');
  const dateLabel = datePaiement
    ? new Date(datePaiement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;max-width:560px;margin:0 auto">
    <p>Bonjour ${clientNom},</p>
    <p>Nous confirmons la bonne réception de votre paiement :</p>
    <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:12px;padding:16px 20px;margin:16px 0">
      <p style="margin:0"><strong>Facture ${echapperHtml(doc.numero)}</strong></p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:bold;color:#059669">${montantFormatte}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#475569">Reçu le ${dateLabel}${modeLabel ? ` — ${modeLabel}` : ''}</p>
    </div>
    <p>Merci de votre confiance !</p>
    <p style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
      Cordialement,<br>
      <strong style="color:${couleur}">${nomEntreprise}</strong>
      ${entreprise?.tel ? `<br>${echapperHtml(entreprise.tel)}` : ''}
      ${entreprise?.email ? `<br>${echapperHtml(entreprise.email)}` : ''}
    </p>
  </div>`;
}
