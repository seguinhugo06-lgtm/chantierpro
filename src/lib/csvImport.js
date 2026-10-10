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

const sansAccent = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_-]+/g, ' ').trim();

/**
 * Colonnes du fichier → champs de l'article. Égalité d'abord, puis mot entier (« u » ne reconnaît plus
 * « seuil alerte »), une colonne ne sert qu'une fois.
 */
export const INDICES_COLONNES = {
  designation: ['nom', 'designation', 'article', 'name', 'libelle'],
  reference: ['reference', 'ref', 'sku', 'code'],
  description: ['description', 'desc'],
  prix: ['prix vente', 'prix vente ht', 'prix unitaire ht', 'prix ht', 'prix', 'price', 'tarif'],
  prixAchat: ['prix achat', 'prix achat ht', 'cout', 'cost', 'pa'],
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
