/**
 * Dépannage express (lot 3 de docs/metiers/synthese.md, § 3.5) : grille tarifaire de l'artisan, lignes du devis
 * express, mentions du devis de dépannage, page imprimable de la grille. Logique pure, sans React ni Supabase :
 * testée dans src/lib/__tests__/depannage.test.js.
 *
 * Droit (arrêté du 24 janvier 2017, relu au texte et résumé dans docs/metier-btp.md § 2) : devis détaillé avant
 * toute prestation de dépannage, réparation ou entretien chez un particulier, sans seuil ; le devis dit s'il est
 * gratuit ou payant (art. 4, I) et que le client peut conserver les pièces, éléments ou appareils remplacés (art. 4,
 * III, annexe 2) ; taux horaires TTC, décompte du temps, forfaits, frais de déplacement, caractère gratuit ou payant du
 * devis et toute autre condition de rémunération communiqués au client avant le contrat, affichés dans les locaux si
 * l'artisan y reçoit des clients, et accessibles sur tout espace en ligne (art. 2 et 3) ; une note remise sur un support
 * durable (art. 5 ; arrêté du 3 octobre 1983, art. 3).
 *
 * Choix (relectures critique-produit et juriste-btp du 4 nov. 2026) :
 * - la case « urgence demandée par le client » ne change jamais le prix : elle sert au droit (L221-10, 4° ;
 *   L221-28, 8°), pas au tarif. Aucune majoration « urgence » (décision d'Hugo du 5 nov. 2026, D-40) ; seules les
 *   majorations de la grille (nuit, dimanche et jour férié) peuvent s'ajouter, et aucune hors de la grille ;
 * - devis gratuit, et seulement sur un dépannage : devis express, case « urgence demandée », ou case facultative
 *   « Dépannage, réparation ou entretien » de l'éditeur (décision d'Hugo du 5 nov. 2026, D-40). Pas de devis payant,
 *   et jamais « Devis gratuit. » sur un devis ordinaire ;
 * - la grille est saisie HT, comme les lignes du devis (aucun écart d'arrondi) ; elle s'imprime TTC, aux deux taux
 *   d'un dépannage (10 % : logement achevé depuis plus de deux ans ; 20 % : sinon), car l'art. 3 exige des prix
 *   TTC et un seul taux rendrait faux les prix d'un logement récent (juriste-btp) ;
 * - le choix du client de conserver les pièces remplacées est demandé sur le devis (case Oui / Non), enregistré
 *   sur les lignes « pièce » quand il est connu (art. 4, III, annexe 2) ;
 * - les libellés des lignes ne portent aucun montant : le prix unitaire est sur la ligne, et un TTC figé dans le texte
 *   serait faux si la TVA change ensuite dans l'éditeur.
 */
import { echapperHtml as h } from './echapperHtml';
import { euros } from './formatDocument';
import { nomImprime, formeImprimee } from './identiteEntreprise';
import { estClientParticulier } from './retractation';
import { arrondi } from './totauxDocument';

/**
 * Obligations, résumées (pas citées) : textes recopiés à l'identique de docs/metier-btp.md § 2 (le test les compare),
 * rédaction juriste-btp au texte de l'arrêté du 24 janvier 2017, art. 2 à 5 (Légifrance, version du 01/04/2017,
 * consulté le 04/11/2026), reformulée le 05/11/2026 après la relecture du lot 4 (point 8 : « toute autre condition de
 * rémunération », affichage dans les locaux seulement si l'artisan y reçoit des clients, note de l'arrêté du 3 octobre
 * 1983, art. 3). La source affichée ne nomme pas le fichier du dépôt.
 */
export const OBLIGATIONS = [
  {
    texte: 'Taux horaires TTC, décompte du temps, prix TTC des forfaits, frais de déplacement, caractère gratuit ou payant du devis et toute autre condition de rémunération (majorations comprises) : communiqués au client avant le contrat, affichés dans vos locaux si vous y recevez des clients, et accessibles sur votre site ou vos pages en ligne (art. 2 et 3)',
    source: 'Arrêté du 24 janvier 2017, articles 2 et 3',
  },
  {
    texte: 'Un devis détaillé est remis avant toute intervention ; conclu dans vos locaux, il dit s’il est gratuit ou payant (art. 4, I) ; il informe le client qu’il peut conserver les pièces, éléments ou appareils remplacés, selon le modèle de l’annexe 2 (art. 4, III)',
    source: 'Arrêté du 24 janvier 2017, article 4',
  },
  {
    texte: 'une note est remise gratuitement sur un support durable dès la fin de l’intervention, avant le paiement ; votre facture en tient lieu si elle indique la date et le lieu de l’intervention (art. 5 ; arrêté du 3 octobre 1983, art. 3)',
    source: 'Arrêté du 24 janvier 2017, article 5',
  },
];

/** Façons de décompter le temps, imprimées sur la grille (art. 3 : « décompte du temps »). */
export const DECOMPTES = [
  { valeur: 'quart', libelle: 'Par quart d’heure entamé', pas: 0.25 },
  { valeur: 'demi', libelle: 'Par demi-heure entamée', pas: 0.5 },
  { valeur: 'heure', libelle: 'Par heure entamée', pas: 1 },
];

export const GRILLE_DEFAUT = {
  tauxHoraire: null, // € HT par heure
  decompte: 'quart',
  deplacement: null, // € HT par intervention
  deplacementZone: '', // texte libre : « Bordeaux et 20 km autour »
  majorationNuit: null, // % de la main-d'œuvre
  horairesNuit: '', // texte libre : « de 20 h à 8 h »
  majorationDimanche: null, // % de la main-d'œuvre (dimanche et jours fériés)
  forfaits: [], // [{ libelle, prix }] € HT
};

const nombre = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : null;
};
const positif = (v) => {
  const n = nombre(v);
  return n !== null && n > 0 ? arrondi(n) : null;
};
const texte = (v, max = 120) => String(v ?? '').trim().slice(0, max);

/** Grille lue des réglages (valeurs illisibles, négatives ou nulles retirées). */
export function normaliserGrille(brute) {
  const g = brute && typeof brute === 'object' ? brute : {};
  const decompte = DECOMPTES.some((d) => d.valeur === g.decompte) ? g.decompte : GRILLE_DEFAUT.decompte;
  const pct = (v) => {
    const n = nombre(v);
    return n !== null && n > 0 && n <= 300 ? Math.round(n * 100) / 100 : null;
  };
  return {
    tauxHoraire: positif(g.tauxHoraire),
    decompte,
    deplacement: positif(g.deplacement),
    deplacementZone: texte(g.deplacementZone),
    majorationNuit: pct(g.majorationNuit),
    horairesNuit: texte(g.horairesNuit, 60),
    majorationDimanche: pct(g.majorationDimanche),
    forfaits: (Array.isArray(g.forfaits) ? g.forfaits : [])
      .map((f) => ({ libelle: texte(f?.libelle), prix: positif(f?.prix) }))
      .filter((f) => f.libelle && f.prix !== null)
      .slice(0, 20),
  };
}

/** Ce qui manque à la grille pour être affichée et servir au devis express ('' si rien). */
export function grilleIncomplete(grille) {
  const g = normaliserGrille(grille);
  if (g.tauxHoraire === null) return 'Indiquez votre taux horaire.';
  return '';
}

export const pasDuDecompte = (grille) => DECOMPTES.find((d) => d.valeur === normaliserGrille(grille).decompte)?.pas || 0.25;

/** Prix TTC d'un prix HT à un taux de TVA, comme l'imprime un devis d'une ligne (HT + TVA arrondie au centime). */
export const ttcDe = (ht, taux) => arrondi(arrondi(ht) + arrondi(arrondi(ht) * (Number(taux) || 0) / 100));

/** Taux de TVA d'un dépannage imprimés sur la grille (logement de plus de deux ans ; sinon ou local professionnel). */
export const TAUX_GRILLE = [10, 20];

/** Arrondit une durée (heures) au décompte de la grille, vers le haut (« entamé »). */
export function dureeDecomptee(heures, grille) {
  const h0 = nombre(heures);
  if (h0 === null || h0 <= 0) return 0;
  const pas = pasDuDecompte(grille);
  return Math.ceil(arrondi(h0 / pas) - 1e-9) * pas;
}

const fmtNombre = (n) => String(n).replace('.', ',');

/**
 * Lignes du devis express, en deux lots : « Intervention » (déplacement, main-d'œuvre, majoration, forfaits) et
 * « Pièces remplacées ». Chaque ligne porte `depannage` (sa catégorie) : le devis se reconnaît ainsi, et
 * l'information reste figée avec ses lignes.
 *
 * @param {object} p
 * @param {object} p.grille        grille tarifaire (réglages)
 * @param {boolean} [p.avecDeplacement]
 * @param {number|string} [p.heures]   main-d'œuvre estimée
 * @param {''|'nuit'|'dimanche'} [p.majoration]
 * @param {number[]} [p.forfaits]   index des forfaits de la grille retenus
 * @param {Array<{ libelle: string, quantite: number|string, prix: number|string }>} [p.pieces] prix HT unitaire
 * @param {boolean|null} [p.conserverPieces] réponse du client (art. 4 III), null si pas encore donnée
 * @param {number} [p.tva]          taux de TVA des lignes (0 en franchise)
 * @param {boolean} [p.franchise]
 * @returns {{ sections: Array<{ id: string, titre: string, lignes: object[] }>, lignes: object[], erreur: string }}
 */
export function lignesDevisExpress({ grille, avecDeplacement = true, heures = 0, majoration = '', forfaits = [], pieces = [], conserverPieces = null, tva = 10, franchise = false } = {}) {
  const g = normaliserGrille(grille);
  const taux = franchise ? 0 : Number(tva) || 0;
  let n = 0;
  const ligne = (categorie, description, quantite, unite, prixUnitaire) => {
    n += 1;
    return {
      id: `dep-${categorie}-${n}`,
      description,
      quantite,
      unite,
      prixUnitaire,
      prixAchat: 0,
      tva: taux,
      montant: arrondi(quantite * prixUnitaire),
      depannage: categorie,
      ...(categorie === 'piece' && typeof conserverPieces === 'boolean' ? { conservee: conserverPieces } : {}),
    };
  };

  const intervention = [];
  if (avecDeplacement && g.deplacement !== null) {
    intervention.push(ligne('deplacement', 'Frais de déplacement', 1, 'forfait', g.deplacement));
  }
  const duree = dureeDecomptee(heures, g);
  if (duree > 0) {
    if (g.tauxHoraire === null) return { sections: [], lignes: [], erreur: 'Indiquez votre taux horaire dans Paramètres › Dépannage.' };
    intervention.push(ligne('main_oeuvre', 'Main-d’œuvre, au taux horaire', duree, 'h', g.tauxHoraire));
    const pct = majoration === 'nuit' ? g.majorationNuit : majoration === 'dimanche' ? g.majorationDimanche : null;
    if (majoration && pct === null) return { sections: [], lignes: [], erreur: 'Cette majoration n’est pas dans votre grille tarifaire.' };
    if (pct !== null) {
      const nom = majoration === 'nuit' ? `Majoration de nuit${g.horairesNuit ? ` (${g.horairesNuit})` : ''}` : 'Majoration dimanche et jour férié';
      // Le pourcentage s'applique au taux horaire de la grille, puis à la durée décomptée
      intervention.push(ligne('majoration', `${nom} : + ${fmtNombre(pct)} % du taux horaire`, duree, 'h', arrondi(g.tauxHoraire * pct / 100)));
    }
  } else if (majoration) {
    return { sections: [], lignes: [], erreur: 'Une majoration s’applique à la main-d’œuvre : indiquez sa durée.' };
  }
  for (const i of forfaits) {
    const f = g.forfaits[i];
    if (f) intervention.push(ligne('forfait', f.libelle, 1, 'forfait', f.prix));
  }

  const lignesPieces = [];
  for (const p of Array.isArray(pieces) ? pieces : []) {
    const libelle = texte(p?.libelle, 200);
    const q = nombre(p?.quantite) ?? 1;
    const prix = positif(p?.prix);
    if (!libelle && prix === null) continue;
    if (!libelle) return { sections: [], lignes: [], erreur: 'Donnez un nom à chaque pièce.' };
    if (prix === null) return { sections: [], lignes: [], erreur: `Indiquez le prix de « ${libelle} ».` };
    if (!(q > 0)) return { sections: [], lignes: [], erreur: `Indiquez la quantité de « ${libelle} ».` };
    lignesPieces.push(ligne('piece', libelle, q, 'u', prix));
  }

  if (!intervention.length && !lignesPieces.length) return { sections: [], lignes: [], erreur: 'Ajoutez au moins une ligne : déplacement, main-d’œuvre, forfait ou pièce.' };
  const sections = [
    ...(intervention.length ? [{ id: 'dep-intervention', titre: 'Intervention', lignes: intervention }] : []),
    ...(lignesPieces.length ? [{ id: 'dep-pieces', titre: 'Pièces remplacées', lignes: lignesPieces }] : []),
  ];
  return { sections, lignes: sections.flatMap((s) => s.lignes), erreur: '' };
}

const lignesDe = (doc) => {
  let l = doc?.lignes || [];
  if (typeof l === 'string') {
    try { l = JSON.parse(l); } catch { l = []; }
  }
  return Array.isArray(l) ? l : [];
};

/**
 * Devis de dépannage, réparation ou entretien : une ligne porte `depannage` (devis express, ou case « Dépannage,
 * réparation ou entretien » de l'éditeur, qui marque ses lignes), ou la case « urgence demandée par le client ».
 */
export function estDevisDepannage(doc) {
  if (!doc || doc.type === 'facture' || doc.facture_type) return false;
  return doc.travaux_urgents === true || lignesDe(doc).some((l) => l && !l._isSection && l.depannage);
}

/** Lignes de l'éditeur marquées « dépannage » (case cochée) ou démarquées ; les catégories du devis express restent. */
export function marquerLignesDepannage(lignes, actif) {
  return (Array.isArray(lignes) ? lignes : []).map((l) => {
    if (!l || l._isSection) return l;
    if (actif) return l.depannage ? l : { ...l, depannage: 'ligne' };
    if (!l.depannage) return l;
    const { depannage: _retire, conservee: _c, ...reste } = l;
    return reste;
  });
}

/** Mentions du devis de dépannage d'un client particulier (arrêté du 24 janv. 2017, art. 2 et 4 III). */
export const MENTION_DEVIS_GRATUIT = 'Devis gratuit.';
/**
 * Question de l'art. 4, III, posée selon le modèle-type de l'annexe 2 de l'arrêté du 24 janvier 2017 (Légifrance,
 * version du 01/04/2017, consulté le 04/11/2026 par juriste-btp) : « OUI □ NON □ », puis la signature du consommateur
 * précédée de la mention manuscrite « Lu et approuvé ». Avis : docs/metiers/avis-juriste-2026-11-04-depannage.md.
 */
export const QUESTION_PIECES = 'Souhaitez-vous conserver les pièces, éléments ou appareils remplacés ?';

/** Réponse du client enregistrée sur les lignes « pièce » : true, false, ou null (pas encore donnée). */
export function choixConserverPieces(doc) {
  const p = lignesDe(doc).find((l) => l && l.depannage === 'piece' && typeof l.conservee === 'boolean');
  return p ? p.conservee : null;
}

/** Les mentions à imprimer, ou null si le devis n'est pas un dépannage pour un particulier. */
export function mentionsDepannage({ doc, client } = {}) {
  if (!estDevisDepannage(doc) || !estClientParticulier(client)) return null;
  return { gratuit: MENTION_DEVIS_GRATUIT, question: QUESTION_PIECES, conserver: choixConserverPieces(doc) };
}

/** Bloc HTML inséré par les générateurs de devis ('' si rien à imprimer). Textes fixes : rien à échapper. */
export function mentionsDepannageHtml({ doc, client } = {}) {
  const m = mentionsDepannage({ doc, client });
  if (!m) return '';
  const caseHtml = (cochee) => `<span style="display:inline-block;width:9px;height:9px;border:1px solid #334155;margin:0 3px 0 8px;vertical-align:-1px;text-align:center;line-height:8px;font-size:8pt">${cochee ? '✕' : ''}</span>`;
  return `<div class="depannage-mentions" style="margin-top:8px;font-size:8pt;color:#334155">`
    + `<p style="margin:0 0 3px">${m.gratuit}</p>`
    + `<p style="margin:0">${m.question} OUI${caseHtml(m.conserver === true)} NON${caseHtml(m.conserver === false)}</p>`
    + '<p style="margin:4px 0 0">Signature du consommateur précédée de la mention manuscrite « Lu et approuvé » :</p>'
    + '<div style="height:32px;border-bottom:1px solid #94a3b8;width:60%"></div>'
    + '</div>';
}

const pctTexte = (n) => `+ ${fmtNombre(n)} %`;

/**
 * Page imprimable de la grille (A4), à afficher dans les locaux, le véhicule, ou sur le site (arrêté du 24 janv.
 * 2017, art. 3). Prix TTC aux deux taux d'un dépannage (10 % et 20 %) ; en franchise, une seule colonne et la
 * mention 293 B. Document HTML complet ; toutes les saisies sont échappées.
 * @param {{ entreprise: object, grille: object, franchise?: boolean, date?: Date }} p
 */
export function grilleImprimableHtml({ entreprise, grille, franchise = false, date = new Date() } = {}) {
  const g = normaliserGrille(grille);
  const e = entreprise || {};
  const nom = h(nomImprime(e) || e.nom || '');
  const adresse = h([e.adresse, [e.codePostal, e.ville].filter(Boolean).join(' ')].filter((x) => String(x || '').trim()).join(', '));
  const contact = h([e.tel, e.email].filter((x) => String(x || '').trim()).join(' · '));
  const forme = h(formeImprimee(e) || '');
  const decompte = DECOMPTES.find((d) => d.valeur === g.decompte)?.libelle || '';
  const taux = franchise ? [0] : TAUX_GRILLE;
  const prix = (ht, unite = '') => taux.map((t) => `<td class="prix">${h(euros(ttcDe(ht, t)))}${unite}</td>`).join('');
  const pct = (v) => taux.map(() => `<td class="prix">${pctTexte(v)}</td>`).join('');
  const ligne = (libelle, cellules, detail = '') => `<tr><td>${libelle}${detail ? `<div class="detail">${detail}</div>` : ''}</td>${cellules}</tr>`;
  const entete = franchise ? '' : `<tr><th></th>${TAUX_GRILLE.map((t) => `<th>Prix TTC<br>TVA ${t} %</th>`).join('')}</tr>`;
  const rangs = [
    g.tauxHoraire !== null ? ligne('Taux horaire de main-d’œuvre', prix(g.tauxHoraire, ' / h'), h(decompte)) : '',
    g.deplacement !== null ? ligne('Frais de déplacement', prix(g.deplacement), h(g.deplacementZone)) : '',
    g.majorationNuit !== null ? ligne('Majoration de nuit, sur le taux horaire', pct(g.majorationNuit), h(g.horairesNuit)) : '',
    g.majorationDimanche !== null ? ligne('Majoration dimanche et jours fériés, sur le taux horaire', pct(g.majorationDimanche)) : '',
    ...g.forfaits.map((f) => ligne(`Forfait : ${h(f.libelle)}`, prix(f.prix))),
  ].join('');
  const jour = date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
  // Rédaction juriste-btp du 4 nov. 2026, confirmée au texte (avis-juriste-2026-11-04-depannage.md)
  const mentionTva = franchise
    ? 'TVA non applicable, article 293 B du CGI'
    : 'Prix toutes taxes comprises. TVA de 10 % pour un logement achevé depuis plus de deux ans ; sinon, TVA de 20 %. Le prix toutes taxes comprises de votre intervention est indiqué sur le devis.';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tarifs — ${nom}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; padding: 16px; }
  @media print { body { padding: 0; } }
  h1 { font-size: 26pt; margin: 0 0 4mm; }
  .entreprise { font-size: 11pt; color: #374151; margin-bottom: 8mm; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; font-size: 14pt; }
  th { font-size: 10pt; color: #4b5563; text-align: right; font-weight: normal; padding: 0 2mm 2mm; }
  td { padding: 4mm 2mm; border-bottom: 1px solid #d1d5db; vertical-align: top; }
  td.prix { text-align: right; font-weight: bold; white-space: nowrap; }
  .detail { font-size: 10pt; color: #4b5563; margin-top: 1mm; }
  .pied { margin-top: 8mm; font-size: 11pt; line-height: 1.6; }
</style></head><body>
<h1>Nos tarifs</h1>
<div class="entreprise"><strong>${nom}</strong>${forme ? `<br>${forme}` : ''}${adresse ? `<br>${adresse}` : ''}${contact ? `<br>${contact}` : ''}${e.siret ? `<br>SIRET ${h(e.siret)}` : ''}</div>
<table>${entete}${rangs}</table>
<div class="pied">
  <p>${mentionTva}</p>
  <p>${h(MENTION_DEVIS_GRATUIT)} Un devis détaillé vous est remis avant toute intervention.</p>
  <p>Tarifs en vigueur au ${h(jour)}.</p>
</div>
</body></html>`;
}

/**
 * Avertissement à l'artisan quand la case urgence est cochée. Rédaction juriste-btp au texte (C. conso. L221-10, 4°,
 * version du 01/07/2016 : « strictement nécessaires pour répondre à l'urgence » ; L221-28, 8°, version du 28/05/2022 ;
 * Légifrance, consultés le 04/11/2026) ; les sept jours ne valent que pour un contrat signé chez le client.
 */
export const AVERTISSEMENT_URGENCE = 'Urgence : seuls les pièces de rechange et travaux strictement nécessaires pour répondre à l’urgence peuvent être payés sur place et échappent à la rétractation (articles L221-10, 4° et L221-28, 8° du Code de la consommation). Mettez tout le reste (amélioration, confort, remplacement non urgent) sur un devis séparé : signé chez le client, il ne permet de recevoir aucun paiement avant l’expiration d’un délai de sept jours (article L221-10).';
