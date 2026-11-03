/**
 * Simulateur de l'assistant pour la démonstration (?demo=true) — joue le rôle du modèle, sans réseau ni coût.
 * Il renvoie EXACTEMENT la forme du contrat (`contrat.js`) : une intention, des paramètres désignant des fiches du
 * repère, et des questions pour ce qu'il ne sait pas. Il comprend les demandes les plus fréquentes de la feuille
 * de route (docs/ia/ligne-directrice.md § 6) ; le vrai modèle comprendra bien plus de tournures.
 *
 * Il ne calcule aucun montant : les chiffres affichés viennent de `preparer.js`, à partir des données.
 */
import { INTENTIONS } from './contrat';

const sansAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const mots = (s) => sansAccents(s).split(/[^a-z0-9]+/).filter((m) => m.length >= 3);
const MOTS_VIDES = new Set(['pour', 'chez', 'les', 'des', 'une', 'sur', 'dans', 'avec', 'madame', 'monsieur', 'mme', 'devis', 'chantier', 'facture', 'factures', 'client', 'sci', 'sarl', 'fils']);

/** Montant dicté : « 1 200 € », « 1200 euros », « 1 200,50 € ». Rien sans le signe ou le mot « euro ». */
export function lireMontant(texte) {
  const m = String(texte).match(/(\d[\d\s  .]*(?:,\d{1,2})?)\s*(?:€|euros?\b)/i);
  if (!m) return null;
  const n = Number(m[1].replace(/[\s  .]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Heures dictées : « 3 h », « 3h30 », « 2,5 heures », « une heure ». */
export function lireHeures(texte) {
  const t = sansAccents(texte);
  const hm = t.match(/(\d{1,2})\s*h\s*(\d{2})\b/);
  if (hm) return Number(hm[1]) + Number(hm[2]) / 60;
  const m = t.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:h\b|heures?\b)/);
  if (m) return Number(m[1].replace(',', '.'));
  if (/\bune heure\b/.test(t)) return 1;
  return null;
}

/** Fiches du repère dont un mot significatif du nom figure dans la demande (« Dupont », « Martin »). */
function correspondances(texte, liste) {
  const dits = new Set(mots(texte).filter((m) => !MOTS_VIDES.has(m)));
  return liste.filter((x) => mots(x.nom).some((m) => !MOTS_VIDES.has(m) && dits.has(m)));
}

const question = (id, texte, choix) => ({ id, texte, ...(choix ? { choix } : {}) });

function comprendreDevis(texte, repere) {
  const clients = correspondances(texte, repere.clients);
  const questions = [];
  const p = { lignes: [] };
  if (clients.length === 1) {
    p.client_id = clients[0].id;
    // Le nom seul a été reconnu : on confirme plutôt que de deviner (« Mme Martin » ≠ forcément « Jean Martin »)
    const prenom = mots(clients[0].nom)[0];
    const prenomDit = !!prenom && mots(texte).includes(prenom);
    if (!prenomDit) {
      questions.push(question('client', `C’est bien ${clients[0].nom} ?`, [
        { valeur: clients[0].id, libelle: `Oui, ${clients[0].nom}` },
        { valeur: 'nouveau', libelle: 'Non, un nouveau client' },
      ]));
    }
  } else if (clients.length > 1) {
    questions.push(question('client', 'Pour quel client ?', clients.map((c) => ({ valeur: c.id, libelle: c.nom }))));
  } else {
    const nom = texte.match(/\b(?:pour|chez)\s+((?:mme|madame|m\.|monsieur)\s+)?([A-ZÀ-Ý][\p{L}-]+)/u);
    p.client_nom = nom ? `${nom[1] || ''}${nom[2]}`.trim() : null;
    questions.push(question('client', p.client_nom ? `${p.client_nom} n’est pas dans vos clients. Je le crée ?` : 'Pour quel client ?',
      p.client_nom ? [{ valeur: 'nouveau', libelle: `Créer « ${p.client_nom} »` }] : undefined));
  }

  // Travaux : le morceau de phrase qui n'est ni le client ni le montant
  const morceaux = texte.split(/[,;]|\bet\b/).map((s) => s.trim()).filter(Boolean);
  const travaux = morceaux.find((s) => !/devis|€|euros?\b|\d{3,}/i.test(s) && s.length > 3)
    || morceaux.find((s) => /devis/i.test(s) && s.replace(/.*devis\s+(pour|chez)\s+\S+(\s+\S+)?/i, '').trim().length > 3)?.replace(/.*devis\s+(pour|chez)\s+\S+(\s+\S+)?/i, '').trim();
  const montant = lireMontant(texte);
  if (travaux) {
    p.lignes.push({ description: travaux.charAt(0).toUpperCase() + travaux.slice(1), quantite: 1, unite: 'forfait', ...(montant ? { montant } : {}) });
  } else {
    p.lignes.push({ description: 'Travaux', quantite: 1, unite: 'forfait', ...(montant ? { montant } : {}) });
    questions.push(question('travaux', 'Quels travaux ? Une ligne suffit, vous détaillerez ensuite.'));
  }
  if (!montant) questions.push(question('montant', 'Quel montant ?'));

  const t = sansAccents(texte);
  if (/\bttc\b/.test(t)) p.base = 'TTC';
  else if (/\bht\b|hors taxe/.test(t)) p.base = 'HT';
  else if (montant) {
    questions.push(question('base', `${montant.toLocaleString('fr-FR')} €, c’est hors taxes ou TTC ?`, [
      { valeur: 'HT', libelle: 'Hors taxes' }, { valeur: 'TTC', libelle: 'TTC' },
    ]));
  }
  // Le taux de TVA n'est jamais deviné : il dépend du logement et d'une attestation (posé par l'app, cf. preparer.js)
  return { intention: INTENTIONS.DEVIS, parametres: p, questions, confiance: questions.length ? 'moyenne' : 'haute' };
}

function comprendreHeures(texte, repere) {
  const heures = lireHeures(texte);
  const p = { heures: heures ?? 0 };
  const questions = [];
  const t = sansAccents(texte);
  p.date = /\bhier\b/.test(t) ? 'hier' : 'aujourdhui';
  // Le chantier d'abord : le nom d'un ouvrier peut ressembler à celui d'un client (« Garcia »)
  const chantiers = correspondances(texte, repere.chantiers);
  if (chantiers.length === 1) p.chantier_id = chantiers[0].id;
  else questions.push(question('chantier', 'Sur quel chantier ?', (chantiers.length ? chantiers : repere.chantiers.slice(0, 6)).map((c) => ({ valeur: c.id, libelle: c.nom }))));
  const nomsChantier = new Set(chantiers.flatMap((c) => mots(c.nom)));
  const equipe = correspondances(texte, repere.equipe).filter((e) => !mots(e.nom).every((m) => nomsChantier.has(m)));
  if (equipe.length === 1) p.employe_id = equipe[0].id;
  else if (repere.equipe.length === 1) p.employe_id = repere.equipe[0].id;
  else if (repere.equipe.length) questions.push(question('employe', 'Pour qui ?', repere.equipe.map((e) => ({ valeur: e.id, libelle: e.nom }))));
  if (!heures) {
    p.heures = 1;
    questions.push(question('heures', 'Combien d’heures ?'));
  }
  return { intention: INTENTIONS.HEURES, parametres: p, questions, confiance: questions.length ? 'moyenne' : 'haute' };
}

function comprendreEncaisse(texte) {
  const t = sansAccents(texte);
  const periode = /mois dernier|mois precedent/.test(t) ? 'mois_precedent'
    : /\bsemaine\b/.test(t) ? 'semaine'
      : /\bannee\b|\bcette annee\b|\bdepuis janvier\b/.test(t) ? 'annee' : 'mois';
  return { intention: INTENTIONS.ENCAISSE, parametres: { periode }, questions: [], confiance: 'haute' };
}

/**
 * « Comprend » une demande comme le ferait le modèle, et répond selon le contrat.
 * @param {string} texte
 * @param {{ clients: Array, chantiers: Array, equipe: Array }} repere — tel que construit par `construireRequete`
 */
export function comprendreDemo(texte, repere = { clients: [], chantiers: [], equipe: [] }) {
  const t = sansAccents(texte).trim();
  if (!t) return { ok: false, code: 'demande_refusee' };
  // Une consigne glissée dans la demande (« ignore tes règles », « envoie à tous ») ne déclenche rien de plus :
  // l'intention reste une proposition à valider, et l'envoi n'existe pas dans le contrat.
  let r;
  if (/\brelan/.test(t)) r = { intention: INTENTIONS.RELANCES, parametres: {}, questions: [], confiance: 'haute' };
  else if (/encaiss|\btouche\b|\brentre\b|combien.*(recu|gagne|paye)/.test(t)) r = comprendreEncaisse(texte);
  else if (/\bdevis\b/.test(t)) r = comprendreDevis(texte, repere);
  else if (lireHeures(texte) != null || /\bheures?\b|\bpointe/.test(t)) r = comprendreHeures(texte, repere);
  else r = { intention: INTENTIONS.INCONNUE, parametres: {}, questions: [], confiance: 'basse' };
  return { ok: true, ...r, restant: null };
}

/** Exemples proposés sous le champ (les quatre demandes du prototype). */
export const EXEMPLES = Object.freeze([
  'Devis pour Mme Martin, remplacement du tableau, 1 200 €',
  'Relance les factures en retard',
  'Combien j’ai encaissé ce mois-ci',
  'Ajoute 3 h sur le chantier Dupont',
]);
