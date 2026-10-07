/**
 * Mention de TVA à taux réduit sur les devis et factures de travaux.
 *
 * Depuis la loi de finances 2025 (n° 2025-127 du 14 février 2025, art. 41), l'attestation
 * Cerfa 1300-SD / 1301-SD est supprimée : le client CERTIFIE sur le devis ou la facture que les
 * conditions du taux réduit sont remplies. Sans cette mention, l'administration peut réclamer
 * la TVA à 20 % sur l'ensemble des travaux — à l'artisan.
 *
 * Textes : modèles I (10 %, art. 279-0 bis du CGI) et II (5,5 %, art. 278-0 bis A du CGI)
 * publiés au BOFiP, BOI-LETTRE-000280 du 22/10/2025. Reproduits à l'identique, seul le nom du
 * client est prérempli quand il est connu.
 *
 * Utilisé par LES DEUX générateurs : src/lib/devisHtmlBuilder.js (page de signature) et le
 * générateur inline de DevisPage.jsx (aperçu et impression).
 */

const CONDITIONS_COMMUNES = 'que les travaux réalisés concernent des locaux à usage d’habitation achevés depuis plus de deux ans'
  + '{SEP} n’ont pas eu pour effet, sur une période de deux ans au plus, de concourir à la production d’un immeuble neuf'
  + ' au sens du 2° du 2 du I de l’article 257 du CGI, ni d’entraîner une augmentation de la surface de plancher des'
  + ' locaux existants supérieure à 10 %';

const echapper = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Taux réduits présents dans le document (lignes à base non nulle).
 * @param {Record<string, {base: number}>} tvaDetails - { "10": { base, montant }, "5.5": {...} }
 * @returns {{ dix: boolean, cinqCinq: boolean }}
 */
export function tauxReduitsPresents(tvaDetails = {}) {
  const taux = Object.entries(tvaDetails || {})
    .filter(([, d]) => (d?.base ?? 0) > 0)
    .map(([t]) => parseFloat(String(t).replace(',', '.')));
  return { dix: taux.includes(10), cinqCinq: taux.includes(5.5) };
}

/**
 * Texte de la certification du client (modèle I et/ou II).
 * @param {{ dix: boolean, cinqCinq: boolean }} presents
 * @param {string} [nomClient]
 * @returns {string[]} un paragraphe par modèle applicable
 */
export function textesCertification(presents, nomClient) {
  const soussigne = nomClient ? `Je soussigné(e) ${nomClient}` : 'Je soussigné(e) ............................ (Nom, prénom)';
  const debut = `${soussigne} certifie, en qualité de preneur de la prestation, `;
  const textes = [];
  if (presents.dix) {
    textes.push(`${debut}${CONDITIONS_COMMUNES.replace('{SEP}', ' et qu’ils')}.`);
  }
  if (presents.cinqCinq) {
    textes.push(`${debut}${CONDITIONS_COMMUNES.replace('{SEP}', ', qu’ils')} et qu’ils ont la nature de travaux de rénovation énergétique.`);
  }
  return textes;
}

/**
 * Bloc HTML à insérer dans le PDF, ou chaîne vide si aucun taux réduit / micro-entreprise.
 * @param {object} p
 * @param {Record<string, {base: number}>} p.tvaDetails
 * @param {string} [p.nomClient]
 * @param {boolean} [p.isMicro] - franchise en base : pas de TVA, donc pas de mention
 * @param {boolean} [p.isFacture]
 */
export function mentionTvaReduiteHtml({ tvaDetails, nomClient, isMicro = false, isFacture = false }) {
  if (isMicro) return '';
  const presents = tauxReduitsPresents(tvaDetails);
  const textes = textesCertification(presents, nomClient);
  if (!textes.length) return '';
  const taux = [presents.cinqCinq && '5,5 %', presents.dix && '10 %'].filter(Boolean).join(' et ');
  const articles = [presents.cinqCinq && 'art. 278-0 bis A', presents.dix && 'art. 279-0 bis'].filter(Boolean).join(' et ');
  return `<div class="tva-reduite" style="margin-top:12px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:7.5pt;line-height:1.45;color:#334155;page-break-inside:avoid">
    <strong>TVA À TAUX RÉDUIT (${taux}) — CERTIFICATION DU CLIENT</strong> (${articles} du CGI ; loi n° 2025-127, art. 41)<br>
    ${textes.map((t) => echapper(t)).join('<br>')}
    <div style="margin-top:6px;color:#64748b">${isFacture
      ? 'À défaut de certification, le taux normal de 20 % s’applique. Document à conserver jusqu’au 31 décembre de la cinquième année suivant les travaux.'
      : 'La signature du présent devis vaut certification. À défaut, le taux normal de 20 % s’applique. Document à conserver jusqu’au 31 décembre de la cinquième année suivant les travaux.'}</div>
    ${isFacture ? '<div style="margin-top:8px">Date et signature du client :</div>' : ''}
  </div>`;
}
