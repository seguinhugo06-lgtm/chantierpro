/**
 * Préparer — transforme une intention comprise (contrat.js) en proposition prête à valider, À PARTIR DES DONNÉES de
 * l'artisan. Aucun chiffre ne vient du modèle : l'encaissé, les factures en retard et les restes dus sont calculés
 * par les mêmes fonctions que les écrans (ventes.js, paiementsFacture.js, messageRelance.js) ; le montant d'un devis
 * est celui que l'artisan a dicté, et ce que personne n'a dit (HT ou TTC, taux de TVA) devient une question.
 *
 * Rien ici n'écrit ni n'envoie : la proposition porte l'objet à enregistrer, le geste de validation l'enregistre.
 */
import { INTENTIONS } from './contrat';
import { encaisseEntre } from '../paiementsFacture';
import { relanceDe, texteCourt } from '../messageRelance';
import { estFranchiseTva } from '../franchiseTva';
import { jourLocal } from '../dates';

const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;
const nomClient = (c) => (c ? [c.prenom, c.nom].filter(Boolean).join(' ') || c.entreprise || 'Client' : '');

/** Taux proposés : jamais choisis à la place de l'artisan (le 10 % et le 5,5 % ont des conditions). */
export const CHOIX_TVA = Object.freeze([
  { valeur: '20', libelle: '20 %' },
  { valeur: '10', libelle: '10 % (rénovation d’un logement de plus de 2 ans)' },
  { valeur: '5.5', libelle: '5,5 % (rénovation énergétique)' },
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

/** « Combien j'ai encaissé » : le même calcul que la tuile « Encaissé » de l'accueil. */
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
  return { type: 'chiffre', total, libelle, debut, fin, lignes };
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

/**
 * Brouillon de devis. Le montant dicté est appliqué tel quel ; HT ou TTC et le taux de TVA viennent de l'artisan
 * (réponses), sinon restent des questions. En franchise (micro-entreprise), pas de TVA et pas de question.
 */
export function proposerDevis(parametres = {}, reponses = {}, { clients = [], entreprise = {} } = {}, maintenant = new Date()) {
  const franchise = estFranchiseTva(entreprise);
  const clientId = reponses.client && reponses.client !== 'nouveau' ? reponses.client : parametres.client_id;
  const client = reponses.client === 'nouveau' ? null : clients.find((c) => c.id === clientId) || null;
  const ligne = { ...(parametres.lignes?.[0] || { description: 'Travaux', quantite: 1, unite: 'forfait' }) };
  if (reponses.travaux) ligne.description = reponses.travaux;
  const montantDit = Number(String(reponses.montant ?? '').replace(/\s/g, '').replace(',', '.')) || ligne.montant || null;
  const base = franchise ? 'HT' : (reponses.base || parametres.base || null);
  const taux = franchise ? 0 : (reponses.tva != null ? Number(reponses.tva) : null);

  const manque = [];
  if (!client) manque.push(reponses.client === 'nouveau' || parametres.client_nom ? 'client_a_creer' : 'client');
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
    validite: 30,
    tvaRate: taux,
    lignes: [{ id: 'l1', description: ligne.description, quantite: 1, unite: ligne.unite || 'forfait', prixUnitaire: prixHT, montant: prixHT }],
    total_ht: totalHT,
    tva,
    total_ttc: arrondi(totalHT + tva),
    notes: '',
  };
  return {
    type: 'devis', client, clientNom: client ? nomClient(client) : (parametres.client_nom || ''), ligne,
    montantDit, base, taux, franchise, prixHT, totalTTC: brouillon?.total_ttc ?? null, manque, brouillon,
  };
}

/** Heures sur un chantier : le pointage à enregistrer, non approuvé (le circuit d'approbation reste le même). */
export function proposerHeures(parametres = {}, reponses = {}, { chantiers = [], equipe = [] } = {}, maintenant = new Date()) {
  const chantier = chantiers.find((c) => c.id === (reponses.chantier || parametres.chantier_id)) || null;
  const employe = equipe.find((e) => e.id === (reponses.employe || parametres.employe_id)) || null;
  const heures = Number(String(reponses.heures ?? '').replace(',', '.')) || parametres.heures || null;
  const jour = parametres.date === 'hier' ? new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - 1) : maintenant;
  const manque = [];
  if (!chantier) manque.push('chantier');
  if (!employe && equipe.length) manque.push('employe');
  if (!(heures > 0 && heures <= 24)) manque.push('heures');
  return {
    type: 'heures', chantier, employe, heures, date: jourLocal(jour), manque,
    pointage: manque.length ? null : { employeId: employe?.id || null, chantierId: chantier.id, date: jourLocal(jour), heures, approuve: false, manuel: true },
  };
}

/** Questions encore ouvertes : celles du modèle, plus le taux de TVA que l'app pose toujours elle-même. */
export function questionsOuvertes(comprise, proposition, reponses = {}) {
  const posees = (comprise.questions || []).filter((q) => reponses[q.id] == null || reponses[q.id] === '');
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
