/**
 * Le brouillon de devis ou de facture créé depuis une dictée (DicteeModal) : lignes, taux et totaux à ENREGISTRER.
 *
 * Contrôle local du 4 nov. 2026 (écart « Juriste 9 ») : en franchise en base (art. 293 B du CGI), une ligne reprise du
 * catalogue gardait son taux (10 ou 20 %) : le brouillon dicté portait de la TVA. Une fois la pièce émise avec cette TVA
 * enregistrée, franchiseAppliquee() la réimprime avec la TVA (franchiseTva.js ; la TVA facturée est due, CGI art. 283, 3).
 * Comme les autres entrées (DevisExpressModal, DevisPage) : en franchise, chaque ligne passe à 0 % (sansTva), le document
 * à 0 %, TVA 0 et TTC = HT ; les totaux viennent de calculerTotaux (règle commune, arrondis au centime).
 */
import { sansTva } from './franchiseTva';
import { calculerTotaux } from './totauxDocument';

/** Taux d'une ligne dictée : celui du catalogue s'il existe, sinon celui du document ; 0 en franchise. */
export function tauxLigneDictee(ligne, { tvaDoc, franchise = false }) {
  if (franchise) return 0;
  const t = ligne?.tva;
  return Number(t !== undefined && t !== null && t !== '' ? t : tvaDoc) || 0;
}

/**
 * @param {Array} lignesDictees lignes de la relecture ({ description, quantite, unite, prixUnitaire, prixAchat, tva? })
 * @param {{ tvaDoc: number, franchise?: boolean, maintenant?: number }} o
 * @returns {{ lignes: Array, tvaRate: number, total_ht: number, tva: number, total_ttc: number }}
 */
export function brouillonDictee(lignesDictees, { tvaDoc, franchise = false, maintenant = Date.now() } = {}) {
  const base = (Array.isArray(lignesDictees) ? lignesDictees : []).map((l, i) => ({
    id: `${maintenant}-${i}`,
    description: l.description,
    quantite: Number(l.quantite) || 0,
    unite: l.unite || 'u',
    prixUnitaire: Number(l.prixUnitaire) || 0,
    prixAchat: l.prixAchat,
    // Sans ce champ, l'éditeur et le PDF retomberaient sur le défaut
    tva: tauxLigneDictee(l, { tvaDoc, franchise }),
    montant: (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0),
  }));
  const lignes = franchise ? sansTva(base) : base;
  const t = calculerTotaux(lignes, { tauxDefaut: franchise ? 0 : tvaDoc, toutesLesLignes: true, franchise });
  return {
    lignes,
    tvaRate: franchise ? 0 : tvaDoc,
    total_ht: t.totalHT,
    tva: t.totalTVA,
    total_ttc: t.totalTTC,
  };
}
