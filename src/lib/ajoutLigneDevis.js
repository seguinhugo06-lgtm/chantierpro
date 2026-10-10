/**
 * Ajouter un article (catalogue, référentiel, bibliothèque d'ouvrages) à un devis BROUILLON, avec les mêmes
 * règles que l'éditeur : la ligne a une désignation (sinon l'aperçu et les PDF l'écartent), elle entre dans
 * les lots (`sections`) quand le devis en a, et HT, TVA par taux et TTC sont recalculés ensemble
 * (src/lib/totauxDocument.js `calculerTotaux`).
 *
 * Recette du 9 oct. 2026 : la ligne n'apparaissait pas (désignation rangée dans un champ non lu, lots ignorés)
 * et seul le HT était recalculé (« HT 32 636 € / TVA 6 520 € / TTC 39 120 € » inchangés : HT + TVA ≠ TTC).
 */
import { calculerTotaux, arrondi } from './totauxDocument';

const nombre = (v, defaut = 0) => {
  if (v === '' || v === null || v === undefined) return defaut;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : defaut;
};

function lignesDe(doc) {
  let l = doc?.lignes ?? [];
  if (typeof l === 'string') { try { l = JSON.parse(l); } catch { l = []; } }
  return Array.isArray(l) ? l : [];
}

/**
 * @param {object} devis devis brouillon
 * @param {object} article { nom, description?, unite?, prix | prixUnitaire | prixUnitaireHT, prixAchat?, tva | tva_rate, id? }
 * @param {{ quantite?: number, franchise?: boolean, tauxDefaut?: number, id?: string }} o
 * @returns {object} les champs du devis à enregistrer (lignes, sections, totaux)
 */
export function devisAvecLigneAjoutee(devis, article, { quantite = 1, franchise = false, tauxDefaut = 20, id } = {}) {
  const nom = String(article?.nom || article?.designation || '').trim();
  const detail = String(article?.description || '').trim();
  const pu = nombre(article?.prix ?? article?.prixUnitaire ?? article?.prixUnitaireHT, 0);
  const q = nombre(quantite, 1);
  const taux = franchise ? 0 : nombre(article?.tva ?? article?.tva_rate, tauxDefaut);
  const ligne = {
    id: id || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    ...(article?.id ? { catalogueId: article.id } : {}),
    // La désignation est `description` (lue par l'aperçu et les PDF) : le nom, puis le détail s'il diffère
    description: detail && detail !== nom ? `${nom}\n${detail}` : nom,
    quantite: q,
    unite: article?.unite || 'u',
    prixUnitaire: pu,
    prixAchat: nombre(article?.prixAchat ?? article?.prix_achat, 0),
    tva: taux,
    montant: arrondi(q * pu),
  };

  const lignes = [...lignesDe(devis), ligne];
  // Lots : la ligne va dans le dernier lot (le devis imprime `sections` quand elles existent)
  const sections = Array.isArray(devis?.sections) && devis.sections.length
    ? devis.sections.map((s, i, tout) => (i === tout.length - 1 ? { ...s, lignes: [...(s.lignes || []), ligne] } : s))
    : undefined;

  const t = calculerTotaux(lignes, { remisePct: nombre(devis?.remise ?? devis?.remise_globale, 0), tauxDefaut, franchise });
  return {
    lignes,
    ...(sections ? { sections } : {}),
    total_ht: t.totalHT,
    tva: t.totalTVA,
    total_ttc: t.totalTTC,
    tvaParTaux: t.tvaParTaux,
    tvaDetails: t.tvaParTaux,
  };
}
