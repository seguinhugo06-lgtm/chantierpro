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
import { htmlToPdfBytes } from './facturx-pdf';

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
    const pdfBytes = await htmlToPdfBytes(pdfHtml);
    attachments = [{ filename: pdfFilename || 'document.pdf', content: uint8ToBase64(pdfBytes) }];
  }

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      action: 'send_email',
      to,
      subject,
      html: bodyHtml,
      from_name: fromName || undefined,
      reply_to: replyTo || undefined,
      attachments,
    },
  });

  if (error) throw new Error(error.message || "Erreur lors de l'envoi");
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Construit un corps d'email HTML simple et lisible (compatible clients mail).
 */
export function buildDocumentEmailBody({ doc, client, entreprise, couleur = '#f97316', montantFormatte }) {
  const isFacture = doc.type === 'facture';
  const label = isFacture ? 'facture' : 'devis';
  const clientNom = `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Madame, Monsieur';
  const nomEntreprise = entreprise?.nom || 'Votre artisan';
  const validite = doc.validite || entreprise?.validiteDevis || 30;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;max-width:560px;margin:0 auto">
    <p>Bonjour ${clientNom},</p>
    <p>Veuillez trouver ci-joint votre ${label} <strong>${doc.numero}</strong>${montantFormatte ? `, d'un montant de <strong>${montantFormatte}</strong>` : ''}.</p>
    ${isFacture
      ? `<p>Je vous remercie de votre confiance.</p>`
      : `<p>Ce devis reste valable <strong>${validite} jours</strong>. N'hésitez pas à me contacter pour toute question.</p>`}
    <p style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
      Cordialement,<br>
      <strong style="color:${couleur}">${nomEntreprise}</strong>
      ${entreprise?.tel ? `<br>${entreprise.tel}` : ''}
      ${entreprise?.email ? `<br>${entreprise.email}` : ''}
    </p>
  </div>`;
}
