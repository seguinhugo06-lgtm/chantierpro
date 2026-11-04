/**
 * Lecture d'un fichier CSV d'import (catalogue, tarif fournisseur, export réimporté).
 *
 * Recette du 9 oct. 2026 : découpe naïve `split(';')` — un nom entre guillemets contenant « ; » ou « , »
 * décalait toutes les colonnes ; « 1 250,00 » devenait 1 € ; « 5,5 » une TVA de 5 ; un prix illisible un
 * article à 0 € ; et l'indice « u » de l'unité reconnaissait « Seuil alerte » (l'export réimporté écrasait
 * les unités par le seuil).
 */

/** Séparateur de la ligne d'en-tête (hors guillemets) : « ; » s'il y en a, sinon « , », sinon tabulation. */
function separateurDe(ligne) {
  let dans = false;
  const compte = { ';': 0, ',': 0, '\t': 0 };
  for (const c of ligne) {
    if (c === '"') dans = !dans;
    else if (!dans && c in compte) compte[c]++;
  }
  if (compte[';']) return ';';
  if (compte[',']) return ',';
  return compte['\t'] ? '\t' : ';';
}

/**
 * CSV selon la RFC 4180 : champs entre guillemets (séparateurs et retours à la ligne admis dedans, « "" » pour
 * un guillemet), fin de ligne CRLF ou LF, marque d'ordre des octets retirée.
 * @returns {{ entetes: string[], lignes: Array<Record<string, string>> }}
 */
export function lireCsv(texte) {
  const t = String(texte || '').replace(/^﻿/, '');
  const premiereLigne = t.split(/\r?\n/)[0] || '';
  const sep = separateurDe(premiereLigne);
  const enregistrements = [];
  let champ = '';
  let ligne = [];
  let dans = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dans) {
      if (c === '"') {
        if (t[i + 1] === '"') { champ += '"'; i++; } else dans = false;
      } else champ += c;
    } else if (c === '"') {
      dans = true;
    } else if (c === sep) {
      ligne.push(champ); champ = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      ligne.push(champ); champ = '';
      enregistrements.push(ligne); ligne = [];
    } else champ += c;
  }
  if (champ !== '' || ligne.length) { ligne.push(champ); enregistrements.push(ligne); }

  const nonVides = enregistrements.filter((l) => l.some((v) => String(v).trim() !== ''));
  if (!nonVides.length) return { entetes: [], lignes: [] };
  const entetes = nonVides[0].map((h) => h.trim());
  const lignes = nonVides.slice(1).map((vals) => {
    const o = {};
    entetes.forEach((h, i) => { o[h] = (vals[i] ?? '').trim(); });
    return o;
  });
  return { entetes, lignes };
}

/** Nombre écrit à la française ou non : « 1 250,00 € », « 1250.5 », « 5,5 % » ; NaN si illisible ou vide. */
export function nombreFr(valeur) {
  if (typeof valeur === 'number') return valeur;
  let s = String(valeur ?? '').replace(/[\s  €%]/g, '');
  if (!s) return NaN;
  // « 1.250,00 » (points de milliers) : on retire les points avant la virgule décimale
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else s = s.replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

// Apostrophes (droite ou typographique) lues comme une espace : « Prix d’achat » (export en franchise) = « prix d achat »
const sansAccent = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\-'’]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Colonnes du fichier → champs de l'article. Égalité d'abord, puis mot entier (« u » ne reconnaît plus
 * « seuil alerte »), une colonne ne sert qu'une fois.
 */
export const INDICES_COLONNES = {
  designation: ['nom', 'designation', 'article', 'name', 'libelle'],
  reference: ['reference', 'ref', 'sku', 'code'],
  description: ['description', 'desc'],
  // prixAchat avant prix : sinon le mot « prix » prend la colonne « Prix d’achat »
  prixAchat: ['prix achat', 'prix achat ht', 'prix d achat', 'prix d achat ht', 'cout', 'cost', 'pa'],
  prix: ['prix vente', 'prix vente ht', 'prix unitaire', 'prix unitaire ht', 'prix ht', 'prix', 'price', 'tarif'],
  unite: ['unite', 'unit', 'u'],
  categorie: ['categorie', 'category', 'cat'],
  tva_rate: ['tva', 'tva rate', 'taux tva', 'taux de tva'],
  stock: ['stock', 'stock actuel', 'quantite', 'qty'],
};

export function associerColonnes(entetes = []) {
  const normes = entetes.map((h) => ({ h, n: sansAccent(h) }));
  const prises = new Set();
  const correspondance = {};
  const trouver = (indices, test) => normes.find(({ h, n }) => !prises.has(h) && indices.some((x) => test(n, x)));
  for (const [champ, indices] of Object.entries(INDICES_COLONNES)) {
    const egal = trouver(indices, (n, x) => n === x);
    const motEntier = egal || trouver(indices, (n, x) => x.length > 2 && new RegExp(`(^| )${x}( |$)`).test(n));
    if (motEntier) { correspondance[champ] = motEntier.h; prises.add(motEntier.h); }
  }
  return correspondance;
}

/**
 * Une ligne du fichier → l'article à créer ou la mise à jour d'un article existant (même référence). Prix et TVA lus à la
 * française (« 1 250,00 », « 5,5 ») ; un prix illisible ou nul écarte la ligne (avant : 1 €, TVA 5, articles à 0 €) ;
 * TVA 0 % respectée. En franchise en base de TVA (art. 293 B du CGI), le champ « Taux TVA » n'est pas proposé
 * (FenetresCatalogue.champsImport) : la colonne TVA du fichier est ignorée — un article existant garde son taux, un
 * nouveau est créé à 0 % (Catalogue.creerArticle).
 * Renvoie { ecartee: true } (sans nom), { prixIllisible: true }, { maj } ou { nouveau }.
 */
export function articleDepuisLigneCsv(row, mapping, { catalogue = [], franchise = false } = {}) {
  const tvaDe = (v, defaut) => { const n = nombreFr(v); return Number.isFinite(n) ? n : defaut; };
  const colTva = franchise ? undefined : mapping.tva_rate;
  const nom = row[mapping.designation] || '';
  if (!nom) return { ecartee: true };
  const ref = row[mapping.reference] || '';
  const prix = nombreFr(row[mapping.prix]);
  const achatLu = nombreFr(row[mapping.prixAchat]);
  const stockLu = nombreFr(row[mapping.stock]);
  const existant = ref ? catalogue.find((c) => c.reference === ref) : null; // doublon par référence
  if (!(prix > 0) && !existant) return { prixIllisible: true };
  if (existant) {
    return {
      maj: {
        ...existant,
        nom: nom || existant.nom,
        prix: prix > 0 ? prix : existant.prix,
        prixAchat: Number.isFinite(achatLu) ? achatLu : existant.prixAchat,
        unite: row[mapping.unite] || existant.unite,
        categorie: row[mapping.categorie] || existant.categorie,
        description: row[mapping.description] || existant.description,
        tva_rate: tvaDe(row[colTva], existant.tva_rate),
        tva: tvaDe(row[colTva], existant.tva ?? existant.tva_rate),
        stock_actuel: Number.isFinite(stockLu) ? Math.round(stockLu) : existant.stock_actuel,
      },
    };
  }
  const tva = tvaDe(row[colTva], 20);
  return {
    nouveau: {
      nom, reference: ref, description: row[mapping.description] || '', prix,
      prixAchat: Number.isFinite(achatLu) ? achatLu : null, unite: row[mapping.unite] || 'u', categorie: row[mapping.categorie] || 'Autre',
      tva_rate: tva, tva, favori: false, stock_actuel: Number.isFinite(stockLu) ? Math.round(stockLu) : undefined, stock_seuil_alerte: undefined,
    },
  };
}
