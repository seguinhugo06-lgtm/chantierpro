/**
 * Préparer — transforme une intention comprise (contrat.js) en proposition prête à valider, À PARTIR DES DONNÉES de
 * l'artisan. Aucun total ni taux ne vient du modèle ; le seul nombre qu'il transmet est celui que l'artisan a dit.
 * L'encaissé, les factures en retard et les restes dus sont calculés par les mêmes fonctions que les écrans
 * (paiementsFacture.js, messageRelance.js) ; ce que personne n'a dit (client, montant, heures, HT ou TTC, taux de
 * TVA) devient une question, posée par l'app si le modèle ne l'a pas posée.
 *
 * Rien ici n'écrit ni n'envoie : la proposition porte l'objet à enregistrer, le geste de validation l'enregistre.
 */
import { INTENTIONS } from './contrat';
import { encaisseEntre } from '../paiementsFacture';
import { relanceDe, texteCourt } from '../messageRelance';
import { estFranchiseTva } from '../franchiseTva';
import { jourLocal } from '../dates';
import { lireMontant, lireHeures } from './simulateur';

const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;
const nomClient = (c) => (c ? [c.prenom, c.nom].filter(Boolean).join(' ') || c.entreprise || 'Client' : '');

/**
 * Taux proposés : jamais choisis à la place de l'artisan (le 10 % et le 5,5 % ont des conditions, CGI art. 279-0 bis et
 * 278-0 bis A ; libellés relus par juriste-btp le 3 nov. 2026). L'autoliquidation (sous-traitance) reste à ajouter avec
 * le lot 1 : le brouillon ne sait pas encore la porter.
 */
export const CHOIX_TVA = Object.freeze([
  { valeur: '20', libelle: '20 %' },
  { valeur: '10', libelle: '10 % — logement achevé depuis plus de 2 ans (le client certifie sur le devis)' },
  { valeur: '5.5', libelle: '5,5 % — rénovation énergétique éligible, logement achevé depuis plus de 2 ans (le client certifie sur le devis)' },
]);

/** Bornes d'une période, en jours « AAAA-MM-JJ » locaux. */
export function bornesPeriode(periode = 'mois', maintenant = new Date()) {
  const a = maintenant.getFullYear();
  const m = maintenant.getMonth();
  if (periode === 'mois_precedent') {
    return { debut: jourLocal(new Date(a, m - 1, 1)), fin: jourLocal(new Date(a, m, 0)), libelle: new Date(a, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) };
  }
  if (periode === 'annee') return { debut: `${a}-01-01`, fin: jourLocal(maintenant), libelle: `depuis le 1er janvier ${a}` };
  if (periode === 'semaine') {
    const lundi = new Date(a, m, maintenant.getDate() - ((maintenant.getDay() + 6) % 7));
    return { debut: jourLocal(lundi), fin: jourLocal(maintenant), libelle: 'cette semaine' };
  }
  return { debut: jourLocal(new Date(a, m, 1)), fin: jourLocal(maintenant), libelle: 'ce mois-ci' };
}

/**
 * « Combien j'ai encaissé » : `encaisseEntre` (paiementsFacture.js), du 1er de la période à aujourd'hui. Le détail liste
 * les paiements enregistrés ; `horsDetail` est la part du total venue de factures marquées payées sans paiement détaillé.
 */
export function repondreEncaisse({ periode = 'mois' } = {}, { devis = [], paiements = [] } = {}, maintenant = new Date()) {
  const { debut, fin, libelle } = bornesPeriode(periode, maintenant);
  const total = encaisseEntre(devis, paiements, debut, fin);
  const dans = (d) => !!d && d >= debut && d <= fin;
  const lignes = paiements
    .filter((p) => dans(p.date || p.date_paiement || String(p.createdAt || '').slice(0, 10)))
    .map((p) => {
      const f = devis.find((d) => d.id === (p.facture_id || p.devis_id || p.devisId));
      return { id: p.id, date: p.date, montant: Number(p.montant ?? p.amount) || 0, numero: f?.numero || '' };
    })
    .sort((x, y) => String(y.date).localeCompare(String(x.date)));
  const detaille = arrondi(lignes.reduce((t, l) => t + l.montant, 0));
  return { type: 'chiffre', total, libelle, debut, fin, lignes, horsDetail: Math.max(0, arrondi(total - detaille)) };
}

/** « Relance les factures en retard » : une relance par facture échue et due, avec le message déjà relu. */
export function proposerRelances({ devis = [], paiements = [], clients = [], entreprise = {} } = {}, maintenant = new Date()) {
  const relances = devis
    .map((f) => ({ f, solde: relanceDe(f, paiements, maintenant) }))
    .filter((x) => x.solde)
    .map(({ f, solde }) => {
      const client = clients.find((c) => c.id === f.client_id) || null;
      const canal = client?.email ? 'email' : client?.telephone ? 'sms' : null;
      return {
        id: f.id,
        facture: f,
        client,
        clientNom: nomClient(client),
        solde,
        canal,
        message: texteCourt(f, { solde, entrepriseNom: entreprise?.nom || '' }),
      };
    })
    .sort((a, b) => b.solde.jours - a.solde.jours);
  return { type: 'relances', relances };
}

const sansAccents = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const motsDe = (s) => sansAccents(s).split(/[^a-z0-9]+/).filter((m) => m.length >= 3);
const MOTS_VIDES = new Set(['madame', 'monsieur', 'mme', 'client', 'sci', 'sarl', 'eurl', 'sas', 'fils']);

/** Clients dont un mot du nom (prénom, nom, entreprise) figure dans le texte tapé. */
export function clientsNommes(texte, clients = []) {
  const dits = new Set(motsDe(texte).filter((m) => !MOTS_VIDES.has(m)));
  if (!dits.size) return [];
  return clients.filter((c) => motsDe([c.prenom, c.nom, c.entreprise].filter(Boolean).join(' ')).some((m) => !MOTS_VIDES.has(m) && dits.has(m)));
}

/**
 * Le client du devis : la réponse de l'artisan (un identifiant choisi, ou un nom tapé), sinon celui du modèle.
 * `autre` (« Non, un autre client ») et un nom qui ne correspond à rien laissent le client à préciser.
 */
function resoudreClient(parametres, reponses, clients) {
  const r = reponses.client;
  if (r == null || r === '') return { client: clients.find((c) => c.id === parametres.client_id) || null };
  if (r === 'autre') return { client: null, autre: true };
  const parId = clients.find((c) => c.id === r);
  if (parId) return { client: parId };
  const trouves = clientsNommes(r, clients);
  if (trouves.length === 1) return { client: trouves[0] };
  return { client: null, cherche: String(r), trouves };
}

/** Montant tapé en réponse : « 1 200 », « 1 200 € », « 1200,50 » (lireMontant, comme pour la demande). */
export function lireMontantSaisi(valeur) {
  const v = String(valeur ?? '').trim();
  if (!v) return null;
  return lireMontant(/€|euro/i.test(v) ? v : `${v} €`);
}

/** Heures tapées en réponse : « 3h », « 3 h 30 », « 2,5 heures » (lireHeures), ou un nombre seul (« 3 »). */
export function lireHeuresSaisies(valeur) {
  const v = String(valeur ?? '').trim();
  if (!v) return null;
  const h = lireHeures(v) ?? (/^\d{1,2}(?:[.,]\d{1,2})?$/.test(v) ? Number(v.replace(',', '.')) : null);
  return h > 0 && h <= 24 ? h : null;
}

/**
 * Brouillon de devis. Le montant dit est appliqué tel quel ; le client, HT ou TTC et le taux de TVA viennent de
 * l'artisan (réponses), sinon restent des questions. En franchise (micro-entreprise), pas de TVA et pas de question.
 */
export function proposerDevis(parametres = {}, reponses = {}, { clients = [], entreprise = {} } = {}, maintenant = new Date()) {
  const franchise = estFranchiseTva(entreprise);
  const { client, autre, cherche, trouves } = resoudreClient(parametres, reponses, clients);
  const ligne = { ...(parametres.lignes?.[0] || { description: 'Travaux', quantite: 1, unite: 'forfait' }) };
  if (reponses.travaux) ligne.description = reponses.travaux;
  const montantRepondu = reponses.montant != null && reponses.montant !== '';
  const montantDit = (montantRepondu ? lireMontantSaisi(reponses.montant) : null) ?? (ligne.montant > 0 ? ligne.montant : null);
  const base = franchise ? 'HT' : (reponses.base || parametres.base || null);
  const taux = franchise ? 0 : (reponses.tva != null ? Number(reponses.tva) : null);

  const manque = [];
  if (!client) manque.push('client');
  if (!montantDit) manque.push('montant');
  if (!base) manque.push('base');
  if (taux == null) manque.push('tva');

  let prixHT = null;
  if (montantDit && base && taux != null) prixHT = base === 'TTC' ? arrondi(montantDit / (1 + taux / 100)) : arrondi(montantDit);
  const totalHT = prixHT ?? 0;
  const tva = arrondi(totalHT * (taux || 0) / 100);
  const brouillon = manque.length ? null : {
    type: 'devis',
    statut: 'brouillon',
    client_id: client.id,
    date: jourLocal(maintenant),
    // Comme l'éditeur et DevisPage : la durée de validité réglée par l'entreprise
    validite: Number(entreprise?.validiteDevis || entreprise?.validite_devis) || 30,
    tvaRate: taux,
    lignes: [{ id: 'l1', description: ligne.description, quantite: 1, unite: ligne.unite || 'forfait', prixUnitaire: prixHT, montant: prixHT }],
    total_ht: totalHT,
    tva,
    total_ttc: arrondi(totalHT + tva),
    notes: '',
  };
  return {
    type: 'devis', client, clientNom: client ? nomClient(client) : '', ligne,
    montantDit, base, taux, franchise, prixHT, totalTTC: brouillon?.total_ttc ?? null, manque, brouillon,
    recherche: { autre: !!autre, cherche: cherche || '', trouves: trouves || [], montantIllisible: montantRepondu && !montantDit ? String(reponses.montant) : '' },
  };
}

/** Heures sur un chantier : le pointage à enregistrer, non approuvé (le circuit d'approbation reste le même). */
export function proposerHeures(parametres = {}, reponses = {}, { chantiers = [], equipe = [] } = {}, maintenant = new Date()) {
  const chantier = chantiers.find((c) => c.id === (reponses.chantier || parametres.chantier_id)) || null;
  const employe = equipe.find((e) => e.id === (reponses.employe || parametres.employe_id)) || null;
  const heuresRepondues = reponses.heures != null && reponses.heures !== '';
  const heuresLues = heuresRepondues ? lireHeuresSaisies(reponses.heures) : null;
  const heures = heuresLues ?? (parametres.heures > 0 && parametres.heures <= 24 ? parametres.heures : null);
  const jour = parametres.date === 'hier' ? new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - 1) : maintenant;
  const manque = [];
  if (!chantier) manque.push('chantier');
  if (!employe && equipe.length) manque.push('employe');
  if (!(heures > 0 && heures <= 24)) manque.push('heures');
  return {
    type: 'heures', chantier, employe, heures, date: jourLocal(jour), manque,
    heuresIllisibles: heuresRepondues && !heuresLues ? String(reponses.heures) : '',
    pointage: manque.length ? null : { employeId: employe?.id || null, chantierId: chantier.id, date: jourLocal(jour), heures, approuve: false, manuel: true },
  };
}

/**
 * Questions encore ouvertes : celles du modèle, plus celles que l'app pose elle-même quand une information manque
 * encore (client, montant, heures, taux de TVA, HT ou TTC) : jamais d'impasse sans explication. En franchise, ni
 * « HT » ni « TTC » ni taux : ces questions-là ne sont pas posées.
 */
export function questionsOuvertes(comprise, proposition, reponses = {}) {
  const franchise = proposition?.type === 'devis' && proposition.franchise;
  const posees = (comprise.questions || [])
    .filter((q) => reponses[q.id] == null || reponses[q.id] === '')
    .filter((q) => !(franchise && (q.id === 'base' || q.id === 'tva')));
  const ajouter = (q) => { if (!posees.some((x) => x.id === q.id)) posees.push(q); };
  if (proposition?.type === 'devis' && proposition.manque.includes('client')) {
    const { autre, cherche, trouves } = proposition.recherche || {};
    if (trouves?.length > 1) {
      ajouter({ id: 'client', texte: `Plusieurs clients correspondent à « ${cherche} ». Lequel ?`, choix: trouves.slice(0, 8).map((c) => ({ valeur: c.id, libelle: nomClient(c) })) });
    } else if (cherche) {
      ajouter({ id: 'client', texte: `Aucun de vos clients ne correspond à « ${cherche} ». Tapez un autre nom, ou créez d’abord la fiche du client (Clients), puis refaites la demande.` });
    } else if (autre) {
      ajouter({ id: 'client', texte: 'Pour quel client ? Tapez son nom (pour un nouveau client, créez d’abord sa fiche).' });
    } else {
      ajouter({ id: 'client', texte: 'Pour quel client ? Tapez son nom.' });
    }
  }
  if (proposition?.type === 'devis' && proposition.manque.includes('montant')) {
    const illisible = proposition.recherche?.montantIllisible;
    ajouter({ id: 'montant', texte: illisible ? `Je n’ai pas lu de montant dans « ${illisible} ». Tapez un nombre, par exemple 1 200.` : 'Quel montant ? (par exemple 1 200)' });
  }
  if (proposition?.type === 'heures' && proposition.manque.includes('heures')) {
    ajouter({ id: 'heures', texte: proposition.heuresIllisibles ? `Je n’ai pas lu d’heures dans « ${proposition.heuresIllisibles} ». Tapez un nombre, par exemple 3 ou 3h30.` : 'Combien d’heures ? (par exemple 3 ou 3h30)' });
  }
  if (proposition?.type === 'devis' && proposition.manque.includes('tva') && !posees.some((q) => q.id === 'tva')) {
    posees.push({ id: 'tva', texte: 'Quel taux de TVA ?', choix: CHOIX_TVA });
  }
  if (proposition?.type === 'devis' && proposition.manque.includes('base') && proposition.montantDit && !posees.some((q) => q.id === 'base')) {
    posees.push({ id: 'base', texte: 'Ce montant est hors taxes ou TTC ?', choix: [{ valeur: 'HT', libelle: 'Hors taxes' }, { valeur: 'TTC', libelle: 'TTC' }] });
  }
  return posees;
}

/** Prépare la proposition correspondant à l'intention comprise. */
export function preparer(comprise, reponses, donnees, maintenant = new Date()) {
  switch (comprise.intention) {
    case INTENTIONS.DEVIS: return proposerDevis(comprise.parametres, reponses, donnees, maintenant);
    case INTENTIONS.RELANCES: return proposerRelances(donnees, maintenant);
    case INTENTIONS.ENCAISSE: return repondreEncaisse(comprise.parametres, donnees, maintenant);
    case INTENTIONS.HEURES: return proposerHeures(comprise.parametres, reponses, donnees, maintenant);
    default: return { type: 'inconnue' };
  }
}
