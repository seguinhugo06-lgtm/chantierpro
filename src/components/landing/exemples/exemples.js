/**
 * « Les fonctionnalités en action » du site public — logique pure des cinq exemples (sans React), testée dans
 * `__tests__/exemples.test.js`. L'affichage est dans `Exemple*.jsx`, les onglets dans `FonctionnalitesSection.jsx`.
 *
 * Chaque montant vient du code de l'app ou de la bibliothèque des métiers, jamais d'un chiffre écrit ici :
 *   - le devis : un lot de la bibliothèque, totalisé par `calculerTotaux` (le calcul de l'éditeur de devis) ;
 *   - le métré : `calculerMetre` (src/lib/metre.js, celui de la fenêtre « Métré ») et une ligne de la bibliothèque ;
 *   - les relances : le scénario proposé par l'app (`DEFAULT_DEVIS_STEPS`), objets résolus par `resolveVariables` ;
 *   - les encaissements : le statut d'une facture selon l'app (`statutFacture`, libellés de `statuts.js`).
 */
import { calculerTotaux } from '../../../lib/totauxDocument';
import { jourLocal } from '../../../lib/dates';
import { formatMoney } from '../../../lib/formatters';
import { statutFacture } from '../../../lib/paiementsFacture';
import { resolveVariables } from '../../../lib/relanceUtils';
import { statut } from '../../../lib/statuts';
import { NUMERO_DEVIS } from '../devisVivantEtapes';
import { CLIENT_FICTIF, ENTREPRISE_FICTIVE, PAS_ENCAISSEMENT_CENTIMES } from './donneesFictives';

/** Taux de TVA du devis d'exemple : celui de la fiche fictive (10 %, rénovation de logement). */
const TAUX = ENTREPRISE_FICTIVE.tva_defaut;

/** Pourcentage d'acompte du devis d'exemple (celui de la page de signature des captures du site). */
const ACOMPTE_DEVIS_PCT = 30;

// ─── Le document ──────────────────────────────────────────────────────────────────────────────────────────

/** Les lignes d'un lot de la bibliothèque au format de l'app (celui que produit l'éditeur de devis). */
export function lignesDuLot(lot) {
  return lot.lignes.map((l, i) => ({
    id: `l${i + 1}`, description: l.designation, quantite: l.quantite, unite: l.unite, prixUnitaire: l.prixUnitaire, tva: l.tva,
  }));
}

/** Les totaux du devis d'exemple, calculés comme l'éditeur de devis (`calculerTotaux`) : HT, TVA, TTC, et le taux. */
export function totauxDuDevis(lot) {
  const totaux = calculerTotaux(lignesDuLot(lot), { tauxDefaut: TAUX });
  return { totalHT: totaux.totalHT, totalTVA: totaux.totalTVA, totalTTC: totaux.totalTTC, taux: Object.keys(totaux.tvaParTaux).map(Number) };
}

/** Le total TTC du devis d'exemple (2 081,20 € pour le lot du tableau). */
export function montantDuDevis(lot) {
  return totauxDuDevis(lot).totalTTC;
}

/**
 * Ce que reçoit `buildDevisHtml` pour le devis d'exemple : DEV-2026-00012 d'Élec Exemple pour M. Martin, le lot en
 * une section titrée, daté du jour (`maintenant`), en mode « client » (la vue de la page de signature).
 */
export function parametresDuDocument(lot, maintenant = new Date()) {
  const lignes = lignesDuLot(lot);
  const totaux = calculerTotaux(lignes, { tauxDefaut: TAUX });
  const doc = {
    id: 'exemple-du-site',
    numero: NUMERO_DEVIS,
    type: 'devis',
    statut: 'envoye',
    date: jourLocal(maintenant),
    validite: 30,
    objet: lot.nom,
    lignes,
    sections: [{ titre: lot.nom, lignes }],
    tvaRate: TAUX,
    total_ht: totaux.totalHT,
    tva: totaux.totalTVA,
    total_ttc: totaux.totalTTC,
    tvaDetails: totaux.tvaParTaux,
    acompte_pct: ACOMPTE_DEVIS_PCT,
  };
  return { doc, client: CLIENT_FICTIF, chantier: null, entreprise: ENTREPRISE_FICTIVE, couleur: ENTREPRISE_FICTIVE.couleur, mode: 'client' };
}

/** Texte lisible d'un document HTML : styles, commentaires et balises retirés, entités usuelles décodées. */
function texteDuDocument(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/**
 * Les mentions que l'on cherche dans le document (spec : identité et SIRET, assurance décennale, TVA réduite,
 * conditions de paiement et pénalités, garanties, droit de rétractation). `repere` : le texte exact que le générateur
 * écrit (src/lib/devisHtmlBuilder.js et ses blocs) ; `libelle` : ces mêmes mots, en casse de phrase quand le
 * générateur les met en capitales (« GARANTIES LÉGALES »). Sensible à la casse : « pénalités de retard » du pied de
 * page ne compte pas pour le bloc « Pénalités de retard ».
 */
const MENTIONS = [
  { repere: /\bSIRET\s*:\s*\S/, libelle: () => 'SIRET' },
  { repere: /Assurance décennale\s*:/, libelle: () => 'Assurance décennale' },
  { repere: /TVA À TAUX RÉDUIT \(([^)]+)\)/, libelle: (m) => `TVA à taux réduit (${m[1]})` },
  { repere: /Délai de paiement/, libelle: () => 'Délai de paiement' },
  { repere: /Pénalités de retard/, libelle: () => 'Pénalités de retard' },
  { repere: /GARANTIES LÉGALES/, libelle: () => 'Garanties légales' },
  { repere: /Droit de rétractation/, libelle: () => 'Droit de rétractation' },
];

/**
 * Les mentions que le document porte réellement, lues dans le HTML produit par le générateur : une mention que le
 * générateur n'écrit pas pour ce document (micro-entreprise : pas de TVA réduite ; client professionnel : pas de
 * rétractation) n'est pas annoncée.
 * @param {string} html
 * @returns {string[]}
 */
export function mentionsDuDocument(html) {
  const texte = texteDuDocument(html);
  return MENTIONS.flatMap(({ repere, libelle }) => {
    const m = repere.exec(texte);
    return m ? [libelle(m)] : [];
  });
}

// ─── La signature ─────────────────────────────────────────────────────────────────────────────────────────

const deuxChiffres = (n) => String(n).padStart(2, '0');

/** Le tampon posé à la validation : « Signé le JJ/MM/AAAA à HH:MM », à l'heure locale du visiteur. */
export function tamponDeSignature(date) {
  return `Signé le ${deuxChiffres(date.getDate())}/${deuxChiffres(date.getMonth() + 1)}/${date.getFullYear()} à ${deuxChiffres(date.getHours())}:${deuxChiffres(date.getMinutes())}`;
}

// ─── Le métré ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * La ligne chiffrée par l'exemple : dans le lot « Carrelage d'une pièce de vie » de la bibliothèque Carrelage, la
 * première fourniture et pose au m² (grès cérame 60 x 60). Erreur explicite si elle n'y est plus.
 */
export function ligneDuMetre(bibliotheque) {
  const lot = bibliotheque?.carrelage?.lots?.find((l) => l.id === 'sol-piece-de-vie');
  const ligne = lot?.lignes?.find((l) => l.unite === 'm²' && /^Fourniture et pose/.test(l.designation));
  if (!ligne) {
    throw new Error(
      'Métré express : aucune fourniture et pose au m² dans le lot « sol-piece-de-vie » de la bibliothèque Carrelage '
      + '(src/lib/templates/trade-library.js). Choisir une autre ligne dans src/components/landing/exemples/exemples.js.',
    );
  }
  return ligne;
}

/** Montant HT de la ligne : quantité × prix unitaire, au centime (sans l'erreur du binaire : 10,005 × 100). */
export function montantDuMetre(quantite, prixUnitaire) {
  return Math.round(Number((quantite * prixUnitaire * 100).toPrecision(12))) / 100;
}

// ─── Les relances ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * L'objet du message d'une étape, comme l'app l'envoie : l'objet de l'étape s'il y en a un, sinon
 * « Relance : Devis <numéro> » (règle du moteur, src/lib/relanceEngine.js, et de l'envoi programmé,
 * supabase/functions/send-scheduled-relances ; un test casse si elle change là-bas), variables résolues par
 * `resolveVariables` de l'app.
 */
export function objetDeRelance(etape, numero) {
  const doc = { numero, type: 'devis', statut: 'envoye' };
  return resolveVariables(etape.objet_email || `Relance : Devis ${numero}`, doc, CLIENT_FICTIF, ENTREPRISE_FICTIVE);
}

/**
 * La frise du scénario de relance de devis : ses étapes actives, dans l'ordre, avec le délai, son libellé et le nom
 * de l'étape lus dans le scénario (`DEFAULT_DEVIS_STEPS`, src/lib/scenariosRelance.js), et l'objet du message.
 * @returns {{ id: string, delai: number, libelleDelai: string, nom: string, objet: string }[]}
 */
export function friseDesRelances(etapes, numero) {
  return (etapes || []).filter((e) => e.enabled).map((e) => ({
    id: e.id, delai: e.delay, libelleDelai: e.delayLabel, nom: e.name, objet: objetDeRelance(e, numero),
  }));
}

// ─── Les encaissements ────────────────────────────────────────────────────────────────────────────────────

const ID_FACTURE = 'exemple-encaissements';

/** Les paiements reçus au départ : l'acompte (calculé) puis le virement partiel. Montants en centimes. */
export function paiementsDeDepart(facture) {
  return [
    { id: 'acompte', libelle: `Acompte de ${facture.acomptePct} %`, centimes: Math.round((facture.totalCentimes * facture.acomptePct) / 100) },
    { id: 'virement', libelle: 'Virement partiel', centimes: facture.virementCentimes },
  ];
}

/**
 * Où en est la facture : encaissé, reste dû, ce qu'encaissera le prochain clic (`pas`, ou le reste s'il est plus
 * petit ; 0 une fois soldée), et son statut selon l'app (`statutFacture` : « payee » seulement si les paiements la
 * soldent) avec son libellé (`statuts.js`). Les montants sont en centimes entiers : le solde est exact.
 */
export function etatDesEncaissements(facture, paiements, pas = PAS_ENCAISSEMENT_CENTIMES) {
  const encaisseCentimes = paiements.reduce((somme, p) => somme + p.centimes, 0);
  const resteCentimes = Math.max(0, facture.totalCentimes - encaisseCentimes);
  const statutApp = statutFacture(
    { id: ID_FACTURE, numero: facture.numero, type: 'facture', statut: 'envoye', total_ttc: facture.totalCentimes / 100 },
    paiements.map((p) => ({ devis_id: ID_FACTURE, montant: p.centimes / 100 })),
  );
  return {
    totalCentimes: facture.totalCentimes,
    encaisseCentimes,
    resteCentimes,
    prochainCentimes: Math.min(pas, resteCentimes),
    statut: statutApp,
    libelle: statut('facture', statutApp).libelle,
  };
}

/** Les paiements après un clic sur « Encaisser » : jamais plus que le reste dû ; soldée, rien ne change. */
export function encaisser(facture, paiements, pas = PAS_ENCAISSEMENT_CENTIMES) {
  const { prochainCentimes } = etatDesEncaissements(facture, paiements, pas);
  if (prochainCentimes <= 0) return paiements;
  return [...paiements, { id: `encaissement-${paiements.length + 1}`, libelle: 'Encaissement', centimes: prochainCentimes }];
}

/** « Encaisser 500 € », ou « Encaisser 395,20 € » pour le dernier clic. */
export function libelleEncaisser(centimes) {
  return `Encaisser ${formatMoney(centimes / 100)}`;
}
