/**
 * Compte de démonstration (D-26) : une fiche entreprise marquée « données fictives » (réglage
 * `donneesFictives`, settings_json.reglages). Ses écrans portent un bandeau et ses documents un filigrane
 * « EXEMPLE » : rien de ce qui est montré (vidéos, revue des stores) ne passe pour une vraie entreprise ou
 * un vrai contrat (relecture juridique du 11 oct. 2026, C. conso. L121-2).
 */

export const LIBELLE_DONNEES_FICTIVES = 'Données fictives — démonstration';

/** La fiche est-elle celle d'un compte de démonstration ? (vrai, ou « true » lu d'un JSON) */
export function estDonneesFictives(entreprise) {
  const v = entreprise?.donneesFictives ?? entreprise?.donnees_fictives;
  return v === true || v === 'true';
}

// Une page A4 à 96 ppp mesure 794 × 1 123 px : un « EXEMPLE » par hauteur de page, en image de fond répétée
// sur toute la hauteur du document. Un fond grandit avec le document sans jamais l'allonger (des éléments
// positionnés plus bas allongeaient l'impression à 12 pages) ; il est forcé à l'impression (print-color-adjust)
// et repris par la capture du PDF.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123"><text x="397" y="561" text-anchor="middle" dominant-baseline="middle" transform="rotate(-30 397 561)" font-family="Arial, Helvetica, sans-serif" font-size="120" font-weight="800" letter-spacing="14" fill="rgb(220,38,38)" fill-opacity="0.12">EXEMPLE</text></svg>`;
const FOND = `url("data:image/svg+xml,${encodeURIComponent(SVG)}")`;

const CSS = `
    body { position: relative; }
    .filigrane-demo { position: absolute; inset: 0; pointer-events: none; z-index: 50; background-image: ${FOND}; background-repeat: repeat-y; background-position: center top; background-size: 100% 1123px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .bandeau-demo { margin: 0 0 12px 0; padding: 6px 10px; border: 1px dashed #dc2626; border-radius: 4px; color: #b91c1c; font: 600 8.5pt Arial, Helvetica, sans-serif; text-align: center; }`;

function calque() {
  return '<div class="filigrane-demo" aria-hidden="true" data-filigrane="EXEMPLE"></div>'
    + `<div class="bandeau-demo">${LIBELLE_DONNEES_FICTIVES} : document d’exemple, sans valeur juridique ni commerciale.</div>`;
}

/**
 * Document (devis, facture, avoir, situation, mise en demeure) d'une fiche de démonstration : filigrane
 * « EXEMPLE » sur chaque page et mention en tête. Pour toute autre fiche, le document est rendu tel quel.
 * @param {object} entreprise
 * @param {string} html document HTML complet
 */
export function marquerDocumentFictif(entreprise, html) {
  if (!estDonneesFictives(entreprise) || typeof html !== 'string') return html;
  const avecStyle = html.includes('</head>') ? html.replace('</head>', `<style>${CSS}\n  </style>\n</head>`) : html;
  return avecStyle.replace(/<body([^>]*)>/, (balise) => `${balise}\n${calque()}`);
}
