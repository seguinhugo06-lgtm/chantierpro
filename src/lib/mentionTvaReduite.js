/**
 * Mention de TVA à taux réduit sur les devis et factures de travaux.
 *
 * Depuis la loi de finances 2025 (n° 2025-127 du 14 février 2025, art. 41), l'attestation
 * Cerfa 1300-SD / 1301-SD est supprimée : le client CERTIFIE sur le devis ou la facture que les
 * conditions du taux réduit sont remplies (CGI art. 279-0 bis, 3 et 278-0 bis A, IV). Sans cette
 * mention, l'administration peut réclamer la TVA à 20 % sur l'ensemble des travaux — à l'artisan
 * seul (BOI-TVA-LIQ-30-20-90-40 du 09/09/2026, § 130 et 230).
 *
 * Textes : BOFiP, BOI-LETTRE-000280 du 09/09/2026 (relevé au texte le 24 oct. 2026, confirmé par
 * juriste-btp), modèles pour l'art. 279-0 bis du CGI (10 %) et l'art. 278-0 bis A du CGI (5,5 %) :
 * - devis, § 10 et 20 : « Je soussigné(e) … certifie … qu'ils n'auront pas pour effet … », signé
 *   avec le devis ;
 * - facture, § 30 et 40 : « Par le règlement de la présente facture, le client certifie … », sans
 *   signature — la facture d'un ramonage sans devis (D-30) part par e-mail et n'est jamais signée.
 * Reproduits mot pour mot, sauf deux écarts admis par la rédaction libre (§ 1 de la LETTRE ;
 * BOI-TVA-LIQ-30-20-90-40 § 85 : tous les éléments de fond du § 80 restent) : le § 10 omet « (Nom,
 * prénoms) » et « en qualité de preneur de la prestation », que le § 20 porte, et on les garde ; une
 * facture d'acompte précède les travaux, d'où le futur du devis (« n'auront pas ») dans le modèle de facture.
 * Seul le nom du client est prérempli, sur le devis, quand il est connu.
 *
 * Utilisé par LES DEUX générateurs : src/lib/devisHtmlBuilder.js (page de signature) et le
 * générateur inline de DevisPage.jsx (aperçu et impression).
 */

const SOUSSIGNE_INCONNU = '............................ (Nom, prénoms)';

const DEVIS_10 = 'Je soussigné(e) {NOM} certifie, en qualité de preneur de la prestation, que les travaux réalisés concernent'
  + ' des locaux à usage d’habitation achevés depuis plus de deux ans et qu’ils n’auront pas pour effet, sur une période de deux'
  + ' ans au plus, de concourir à la production d’un immeuble neuf au sens du 2° du 2 du I de l’article 257 du CGI, ni'
  + ' d’entraîner une augmentation de la surface de plancher des locaux existants supérieure à 10 %.';

const DEVIS_5_5 = 'Je soussigné(e) {NOM} certifie, en qualité de preneur de la prestation, que les travaux réalisés concernent'
  + ' des locaux à usage d’habitation achevés depuis plus de deux ans, qu’ils n’auront pas pour effet, sur une période de deux'
  + ' ans au plus, de concourir à la production d’un immeuble neuf au sens du 2° du 2 du I de l’article 257 du CGI, ni'
  + ' d’entraîner une augmentation de la surface de plancher des locaux existants supérieure à 10 % et qu’ils ont la nature de'
  + ' travaux de rénovation énergétique.';

const FACTURE_10 = 'Par le règlement de la présente facture, le client certifie, en qualité de preneur de la prestation, que les'
  + ' travaux réalisés concernent des locaux à usage d’habitation achevés depuis plus de deux ans, qu’ils n’ont pas eu pour'
  + ' effet, sur une période de deux ans au plus, de concourir à la production d’un immeuble neuf au sens du 2° du 2 du I de'
  + ' l’article 257 du CGI, ni d’entraîner une augmentation de la surface de plancher des locaux existants supérieure à 10 %.';

const FACTURE_5_5 = 'Par le règlement de la présente facture, le client certifie, en qualité de preneur de la prestation, que les'
  + ' travaux réalisés concernent des locaux à usage d’habitation achevés depuis plus de deux ans, qu’ils n’ont pas eu pour'
  + ' effet, sur une période de deux ans au plus, de concourir à la production d’un immeuble neuf au sens du 2° du 2 du I de'
  + ' l’article 257 du CGI, ni d’entraîner une augmentation de la surface de plancher des locaux existants supérieure à 10 %'
  + ' et qu’ils ont la nature de travaux de rénovation énergétique.';

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
 * Texte de la certification du client : modèle du devis (signé) ou de la facture (réglée).
 * @param {{ dix: boolean, cinqCinq: boolean }} presents
 * @param {string} [nomClient] - prérempli sur le devis seulement (le modèle de facture dit « le client »)
 * @param {{ isFacture?: boolean, isAcompte?: boolean }} [options] - isAcompte : facture d'acompte, travaux à venir
 * @returns {string[]} un paragraphe par modèle applicable
 */
export function textesCertification(presents, nomClient, { isFacture = false, isAcompte = false } = {}) {
  const auFutur = (t) => (isAcompte ? t.replace('qu’ils n’ont pas eu pour effet', 'qu’ils n’auront pas pour effet') : t);
  const [dix, cinqCinq] = isFacture ? [FACTURE_10, FACTURE_5_5].map(auFutur) : [DEVIS_10, DEVIS_5_5];
  const nom = nomClient || SOUSSIGNE_INCONNU;
  const textes = [];
  // Remplacement par fonction : un « $ » dans le nom ne doit pas être lu comme un motif de replace()
  if (presents.dix) textes.push(dix.replace('{NOM}', () => nom));
  if (presents.cinqCinq) textes.push(cinqCinq.replace('{NOM}', () => nom));
  return textes;
}

// Conservation par le client : 31 décembre de la cinquième année « suivant la réalisation de ces travaux » (10 %,
// CGI 279-0 bis, 3) ou « qui suit l'émission des factures » (5,5 %, CGI 278-0 bis A, IV) : la plus tardive des deux.
const CONSERVATION = 'Document à conserver jusqu’au 31 décembre de la cinquième année suivant la réalisation des travaux et leur facturation.';

/**
 * Bloc HTML à insérer dans le PDF, ou chaîne vide si aucun taux réduit / micro-entreprise / avoir.
 * @param {object} p
 * @param {Record<string, {base: number}>} p.tvaDetails
 * @param {string} [p.nomClient]
 * @param {boolean} [p.isMicro] - franchise en base : pas de TVA, donc pas de mention
 * @param {boolean} [p.isFacture]
 * @param {boolean} [p.isAcompte] - facture d'acompte : certification au futur
 * @param {boolean} [p.isAvoir] - un avoir ne se règle pas : il ne porte pas la certification
 */
export function mentionTvaReduiteHtml({ tvaDetails, nomClient, isMicro = false, isFacture = false, isAcompte = false, isAvoir = false }) {
  if (isMicro || isAvoir) return '';
  const presents = tauxReduitsPresents(tvaDetails);
  const textes = textesCertification(presents, nomClient, { isFacture, isAcompte });
  if (!textes.length) return '';
  const taux = [presents.cinqCinq && '5,5 %', presents.dix && '10 %'].filter(Boolean).join(' et ');
  const articles = [presents.cinqCinq && 'art. 278-0 bis A', presents.dix && 'art. 279-0 bis'].filter(Boolean).join(' et ');
  return `<div class="tva-reduite" style="margin-top:12px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:7.5pt;line-height:1.45;color:#334155;page-break-inside:avoid">
    <strong>TVA À TAUX RÉDUIT (${taux}) — CERTIFICATION DU CLIENT</strong> (${articles} du CGI ; loi n° 2025-127, art. 41)<br>
    ${textes.map((t) => echapper(t)).join('<br>')}
    ${''/* Facture : pas de « à défaut de certification, 20 % », qui s'y lirait « à défaut de paiement » (juriste-btp, 24 oct. 2026) */}
    <div style="margin-top:6px;color:#64748b">${isFacture
      ? CONSERVATION
      : `La signature du présent devis vaut certification. À défaut, le taux normal de 20 % s’applique. ${CONSERVATION}`}</div>
  </div>`;
}
