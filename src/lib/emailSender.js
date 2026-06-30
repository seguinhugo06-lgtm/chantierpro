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

// Encode un Uint8Array en base64 sans dépasser la limite d'arguments de String.fromCharCode.
function uint8ToBase64(bytes) {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// Génère un PDF (octets) à partir d'un HTML complet via html2canvas + jsPDF.
// Approche image multi-pages : fidèle au rendu HTML et fiable
// (l'ancienne voie jsPDF.html() produisait des pages blanches).
async function generateDocumentPdfBytes(fullHtml) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const styleMatch = fullHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi);
  const container = document.createElement('div');
  container.innerHTML = (styleMatch ? styleMatch.join('') : '') + (bodyMatch ? bodyMatch[1] : fullHtml);
  // Réplique le style du <body> d'origine (la règle body{} ne s'applique pas à un <div>) :
  // box-sizing + padding pour avoir des marges (sinon le contenu touche les bords / est rogné).
  container.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;box-sizing:border-box;padding:25px;background:#ffffff;color:#1e293b;font-family:'Segoe UI',Arial,sans-serif;font-size:10pt;line-height:1.4;";
  document.body.appendChild(container);

  try {
    await new Promise((r) => setTimeout(r, 80)); // laisser le layout / les polices se poser
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      logging: false,
    });
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWmm = 210;
    const pageHmm = 297;
    const W = canvas.width;
    const pxPerMm = W / pageWmm;
    const pageHpx = Math.floor(pageHmm * pxPerMm);

    // Données pixel pour détecter les lignes "blanches" (espaces entre blocs).
    // Peut échouer si le canvas est "tainted" (image cross-origin) → on retombe
    // alors sur une découpe à hauteur fixe.
    let rowData = null;
    try {
      rowData = canvas.getContext('2d').getImageData(0, 0, W, canvas.height).data;
    } catch {
      rowData = null;
    }
    const sampleStep = Math.max(1, Math.floor(W / 80));
    const isRowBlank = (y) => {
      if (!rowData) return false;
      const base = y * W * 4;
      for (let x = 0; x < W; x += sampleStep) {
        const i = base + x * 4;
        if (rowData[i] < 245 || rowData[i + 1] < 245 || rowData[i + 2] < 245) return false;
      }
      return true;
    };

    // Découpe page par page en cherchant un espace blanc près de la limite A4
    // (pour ne jamais couper au milieu d'un bloc / d'une ligne).
    let y = 0;
    let firstPage = true;
    while (y < canvas.height) {
      let sliceEnd = Math.min(y + pageHpx, canvas.height);
      if (sliceEnd < canvas.height && rowData) {
        const minEnd = y + Math.floor(pageHpx * 0.6);
        for (let yy = sliceEnd; yy > minEnd; yy--) {
          if (isRowBlank(yy)) { sliceEnd = yy; break; }
        }
      }
      const sliceH = sliceEnd - y;
      const slice = document.createElement('canvas');
      slice.width = W;
      slice.height = sliceH;
      const sctx = slice.getContext('2d');
      sctx.fillStyle = '#ffffff';
      sctx.fillRect(0, 0, W, sliceH);
      sctx.drawImage(canvas, 0, y, W, sliceH, 0, 0, W, sliceH);
      const sliceImg = slice.toDataURL('image/jpeg', 0.92);
      if (!firstPage) pdf.addPage();
      pdf.addImage(sliceImg, 'JPEG', 0, 0, pageWmm, sliceH / pxPerMm, undefined, 'FAST');
      firstPage = false;
      y = sliceEnd;
    }
    return new Uint8Array(pdf.output('arraybuffer'));
  } finally {
    document.body.removeChild(container);
  }
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
    const pdfBytes = await generateDocumentPdfBytes(pdfHtml);
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
