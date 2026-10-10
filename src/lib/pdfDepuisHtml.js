/**
 * PDF (octets) d'un document HTML complet — devis, facture, avoir. Une seule voie pour l'e-mail,
 * le bouton « PDF » et la facture Factur-X.
 *
 * Recette du 9 oct. 2026 :
 * - la facture passait par jsPDF.html() avec un conteneur à `left:-9999px` : le décalage était reporté
 *   dans le PDF (texte en x = -7054), toutes les pages sortaient blanches ;
 * - le style du document (`body { width: 210mm }`) était injecté dans l'app : la page passait à 794 px
 *   pendant la génération ;
 * - le HTML était posé par `innerHTML` dans la page de l'app : un `<img onerror>` saisi s'y exécutait.
 *
 * Le document est donc rendu dans une iframe cachée, sans script (`sandbox` sans `allow-scripts`),
 * capturé par html2canvas, puis découpé en pages A4 entre les blocs.
 */

const LARGEUR_A4_PX = 794; // 210 mm à 96 ppp

// Le document s'affiche en feuille sur fond gris à l'écran (PAGE_CSS) : pour la capture, une page
// blanche bord à bord, à la largeur A4.
const STYLE_CAPTURE = `html,body{background:#ffffff!important;box-shadow:none!important;margin:0!important;min-height:0!important;width:${LARGEUR_A4_PX}px!important;box-sizing:border-box}`;

/**
 * Points de coupure (px du canvas) qui tombent ENTRE les blocs du document, jamais au milieu : lignes
 * de tableau, encadrés et bloc signature ne sont pas coupés. Mesure par le DOM, pas par les pixels.
 */
export function coupuresDePages(racine, canvas, hauteurPagePx) {
  const facteur = canvas.width / racine.offsetWidth; // px CSS → px canvas
  const hauteurPageCss = hauteurPagePx / facteur;
  const haut = racine.getBoundingClientRect().top;

  // Blocs « atomiques » : plus courts qu'une page → on ne coupe pas à l'intérieur.
  const blocs = [];
  racine.querySelectorAll('tr, td, div, p, table, section, h1, h2, h3, h4, li, img').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.height > hauteurPageCss) return;
    blocs.push({ top: (r.top - haut) * facteur, bottom: (r.bottom - haut) * facteur });
  });
  const traverse = (y) => blocs.some((b) => y > b.top + 1 && y < b.bottom - 1);

  const total = canvas.height;
  const coupures = [0];
  let courant = 0;
  while (courant + hauteurPagePx < total) {
    const limite = courant + hauteurPagePx;
    let meilleur = -1;
    for (const b of blocs) {
      if (b.bottom > courant && b.bottom <= limite && b.bottom > meilleur && !traverse(b.bottom)) meilleur = b.bottom;
    }
    if (meilleur <= courant) meilleur = limite; // aucun point sûr (bloc plus grand qu'une page) : coupe nette
    coupures.push(meilleur);
    courant = meilleur;
  }
  coupures.push(total);
  return coupures;
}

function chargerIframe(iframe, html) {
  return new Promise((resolve, reject) => {
    const delai = setTimeout(() => reject(new Error('Le document ne s\'est pas chargé pour le PDF.')), 15000);
    iframe.addEventListener('load', () => { clearTimeout(delai); resolve(); }, { once: true });
    iframe.srcdoc = html;
  });
}

async function imagesChargees(doc) {
  await Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((r) => {
    img.addEventListener('load', r, { once: true });
    img.addEventListener('error', r, { once: true });
  }))));
  try { await doc.fonts?.ready; } catch { /* polices : on capture avec ce qui est chargé */ }
}

/**
 * @param {string} htmlComplet document HTML complet (<!DOCTYPE html>…)
 * @returns {Promise<Uint8Array>} octets du PDF A4
 */
export async function pdfDepuisHtml(htmlComplet) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const iframe = document.createElement('iframe');
  // Pas de script dans le document ; même origine pour que l'app lise et capture son contenu.
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${LARGEUR_A4_PX}px;height:1123px;border:0;opacity:0;pointer-events:none;`;
  document.body.appendChild(iframe);

  try {
    await chargerIframe(iframe, htmlComplet);
    const doc = iframe.contentDocument;
    if (!doc?.body) throw new Error('Document vide : PDF impossible.');
    const style = doc.createElement('style');
    style.textContent = STYLE_CAPTURE;
    doc.head.appendChild(style);
    await imagesChargees(doc);
    await new Promise((r) => setTimeout(r, 50)); // laisser la mise en page se poser

    const racine = doc.body;
    const canvas = await html2canvas(racine, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: LARGEUR_A4_PX,
      logging: false,
    });
    if (!canvas.width || !canvas.height) throw new Error('Rendu vide : PDF impossible.');

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const largeurPage = 210;
    const hauteurPage = 297;
    const pxParMm = canvas.width / largeurPage;
    const coupures = coupuresDePages(racine, canvas, hauteurPage * pxParMm);
    const tranche = document.createElement('canvas');
    const ctx = tranche.getContext('2d');
    for (let i = 0; i < coupures.length - 1; i++) {
      const y0 = coupures[i];
      const h = coupures[i + 1] - y0;
      if (h <= 0) continue;
      tranche.width = canvas.width;
      tranche.height = h;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tranche.width, tranche.height);
      ctx.drawImage(canvas, 0, y0, canvas.width, h, 0, 0, canvas.width, h);
      if (i > 0) pdf.addPage();
      pdf.addImage(tranche.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, largeurPage, h / pxParMm, undefined, 'FAST');
    }
    return new Uint8Array(pdf.output('arraybuffer'));
  } finally {
    iframe.remove();
  }
}
