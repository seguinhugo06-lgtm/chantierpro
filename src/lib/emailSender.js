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

// Détermine les points de coupure (en px canvas) qui tombent ENTRE les blocs du
// document, jamais au milieu — pour une pagination A4 propre (bloc signature, lignes
// de tableau, encadrés… ne sont plus coupés). Mesure via le DOM (getBoundingClientRect),
// pas de scan pixel (qui faisait planer la génération).
function computeSafeBreaks(container, canvas, pageHeightPx) {
  const factor = canvas.width / container.offsetWidth; // css px → px canvas
  const pageHeightCss = pageHeightPx / factor;
  const containerTop = container.getBoundingClientRect().top;

  // Blocs « atomiques » : plus courts qu'une page → on ne coupe pas à l'intérieur.
  const blocks = [];
  container.querySelectorAll('tr, td, div, p, table, section, h1, h2, h3, h4, li, img').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.height > pageHeightCss) return;
    blocks.push({ top: (r.top - containerTop) * factor, bottom: (r.bottom - containerTop) * factor });
  });
  const straddles = (y) => blocks.some((b) => y > b.top + 1 && y < b.bottom - 1);

  const total = canvas.height;
  const breaks = [0];
  let cur = 0;
  while (cur + pageHeightPx < total) {
    const limit = cur + pageHeightPx;
    let best = -1;
    for (const b of blocks) {
      if (b.bottom > cur && b.bottom <= limit && b.bottom > best && !straddles(b.bottom)) best = b.bottom;
    }
    if (best <= cur) best = limit; // aucun point sûr (bloc plus grand qu'une page) : coupe nette
    breaks.push(best);
    cur = best;
  }
  breaks.push(total);
  return breaks;
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
    const pageW = 210;
    const pageH = 297;
    const pxPerMm = canvas.width / pageW;
    const pageHeightPx = pageH * pxPerMm;

    // Coupures alignées sur les blocs → aucun contenu coupé en travers.
    const breaks = computeSafeBreaks(container, canvas, pageHeightPx);
    const slice = document.createElement('canvas');
    const ctx = slice.getContext('2d');
    for (let i = 0; i < breaks.length - 1; i++) {
      const y0 = breaks[i];
      const sliceH = breaks[i + 1] - y0;
      if (sliceH <= 0) continue;
      slice.width = canvas.width;
      slice.height = sliceH;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, y0, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const imgData = slice.toDataURL('image/jpeg', 0.92);
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, sliceH / pxPerMm, undefined, 'FAST');
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
export function buildDocumentEmailBody({ doc, client, entreprise, couleur = '#f97316', montantFormatte, signatureUrl = null }) {
  const isFacture = doc.type === 'facture';
  const label = isFacture ? 'facture' : 'devis';
  const clientNom = `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Madame, Monsieur';
  const nomEntreprise = entreprise?.nom || 'Votre artisan';
  const validite = doc.validite || entreprise?.validiteDevis || 30;

  const signatureBlock = !isFacture && signatureUrl ? `
    <div style="margin:28px 0;text-align:center">
      <a href="${signatureUrl}"
         style="display:inline-block;background:${couleur};color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:10px">
        Consulter et signer le devis en ligne
      </a>
      <p style="font-size:12px;color:#64748b;margin-top:10px">
        Signature électronique sécurisée, sans créer de compte.<br>
        Si le bouton ne fonctionne pas : <a href="${signatureUrl}" style="color:${couleur}">${signatureUrl}</a>
      </p>
    </div>` : '';

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;line-height:1.6;max-width:560px;margin:0 auto">
    <p>Bonjour ${clientNom},</p>
    <p>Veuillez trouver ci-joint votre ${label} <strong>${doc.numero}</strong>${montantFormatte ? `, d'un montant de <strong>${montantFormatte}</strong>` : ''}.</p>
    ${signatureBlock}
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
