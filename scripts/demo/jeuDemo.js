/**
 * Jeu de démonstration du compte démo (contact@mallettico.fr, décision d'Hugo du 11 oct. 2026) : un électricien
 * micro-entrepreneur autour de Bordeaux, pour tester l'app de bout en bout et tourner des vidéos.
 *
 * - Clients, chantiers et pièces sont FICTIFS. L'entreprise, elle, est la fiche du compte (Paramètres), que ce
 *   jeu ne touche pas.
 * - Aucun e-mail ne peut partir chez un inconnu : chaque client a une adresse « + » de la boîte d'Hugo
 *   (seguin.hugo06+nom@gmail.com). Devis, liens de signature, relances et liens de paiement arrivent chez lui.
 * - Téléphones dans la plage que l'ARCEP réserve aux œuvres de fiction (06 39 98 xx xx).
 * - Micro-entreprise : franchise en base de TVA (art. 293 B du CGI), TVA 0 et TTC = HT sur toutes les pièces,
 *   comme l'app les enregistre (src/lib/franchiseTva.js).
 * - Dates relatives au jour de génération : l'accueil, les retards et les relances restent « vivants ».
 *
 * Objets au format de l'app (celui que l'interface passe à DataContext) ; scripts/demo/generer-sql.mjs les
 * convertit en lignes par FIELD_MAPPINGS (useSupabaseSync.js), comme le ferait l'app.
 */
import { createHash } from 'node:crypto';
import { SIGNATURE_DEMO } from './signatureDemo.js';

/** Identifiant stable (UUID au format v5) : régénérer le jeu redonne les mêmes identifiants. */
export function uuidDe(cle) {
  const h = createHash('sha1').update(`mallettico-demo:${cle}`).digest('hex');
  const v = (parseInt(h.slice(16, 18), 16) & 0x3f | 0x80).toString(16).padStart(2, '0');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${v}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Jour local « AAAA-MM-JJ », décalé de `n` jours. */
function jourDecale(base, n) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Instant (ISO) d'un jour décalé à une heure locale donnée. */
function instantDecale(base, n, heure = '09:30') {
  const [h, m] = heure.split(':').map(Number);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n, h, m).toISOString();
}

// ─── Clients ────────────────────────────────────────────────────────────────

const CLIENTS = [
  { cle: 'lefevre', prenom: 'Marie', nom: 'Lefèvre', adresse: '14 rue des Écoles, 33400 Talence', categorie: 'particulier' },
  { cle: 'moreau', prenom: 'Julien', nom: 'Moreau', adresse: '7 allée des Pins, 33700 Mérignac', categorie: 'particulier' },
  { cle: 'chartrons', prenom: 'Antoine', nom: 'Bernard', entreprise: 'SCI Les Quais', adresse: '22 rue Notre-Dame, 33000 Bordeaux', categorie: 'professionnel' },
  { cle: 'dubreuil', prenom: 'Sophie', nom: 'Dubreuil', entreprise: 'Boulangerie Dubreuil', adresse: '3 place de la Mairie, 33600 Pessac', categorie: 'professionnel' },
  { cle: 'garnier', prenom: 'Thomas', nom: 'Garnier', adresse: '58 avenue de la Libération, 33130 Bègles', categorie: 'particulier' },
  { cle: 'rousseau', prenom: 'Nathalie', nom: 'Rousseau', adresse: '9 rue du Château, 33110 Le Bouscat', categorie: 'particulier' },
  { cle: 'kine', prenom: 'Paul', nom: 'Martin', entreprise: 'Cabinet de kinésithérapie Martin', adresse: '120 avenue de Paris, 33310 Lormont', categorie: 'professionnel' },
  { cle: 'fournier', prenom: 'Isabelle', nom: 'Fournier', adresse: '31 chemin du Moulin, 33170 Gradignan', categorie: 'particulier' },
  { cle: 'lambert', prenom: 'Hervé', nom: 'Lambert', adresse: '6 impasse des Vignes, 33140 Villenave-d’Ornon', categorie: 'particulier' },
  { cle: 'agence', prenom: 'Claire', nom: 'Petit', entreprise: 'Agence immobilière Logis du Parc', adresse: '45 cours de l’Intendance, 33000 Bordeaux', categorie: 'professionnel' },
  { cle: 'girard', prenom: 'Lucas', nom: 'Girard', adresse: '17 rue Camille-Pelletan, 33150 Cenon', categorie: 'particulier' },
  { cle: 'robin', prenom: 'Émilie', nom: 'Robin', adresse: '2 allée des Tilleuls, 33520 Bruges', categorie: 'particulier' },
  { cle: 'vidal', prenom: 'Pierre', nom: 'Vidal', adresse: '40 rue Gambetta, 33400 Talence', categorie: 'particulier' },
  { cle: 'chevalier', prenom: 'Laura', nom: 'Chevalier', adresse: '12 rue de la Gare, 33700 Mérignac', categorie: 'particulier' },
];

// ─── Pièces ─────────────────────────────────────────────────────────────────
// j : jour de la pièce (décalage depuis aujourd'hui) ; envoi : jour d'envoi ; lots : [titre, [[désignation, qté, unité, PU, prix d'achat]]]

const L = (description, quantite, unite, prixUnitaire, prixAchat = 0) => ({ description, quantite, unite, prixUnitaire, prixAchat });

const DEVIS = [
  {
    cle: 'dev-vidal', client: 'vidal', j: -185, envoi: -185, validite: 30, statut: 'facture',
    objet: 'Remplacement du tableau électrique',
    signe: { j: -182, nom: 'Pierre Vidal', aDistance: true },
    lots: [['', [
      L('Tableau électrique 2 rangées équipé', 1, 'u', 690, 310),
      L('Mise à la terre et liaison équipotentielle', 1, 'forfait', 260, 40),
      L('Reprise des circuits existants', 1, 'forfait', 1500, 220),
    ]]],
  },
  {
    cle: 'dev-garnier', client: 'garnier', j: -8, validite: 30, statut: 'facture',
    objet: 'Dépannage : recherche de court-circuit et remplacement de prises',
    signe: { j: -8, nom: 'Thomas Garnier', aDistance: false },
    conditions: 'Devis de dépannage établi avant l’intervention, à la demande du client (réparation urgente). Déplacement et diagnostic payants. Les pièces remplacées sont laissées au client.',
    lots: [['', [
      L('Déplacement et diagnostic', 1, 'forfait', 65, 0),
      L('Prise 2P+T 16 A remplacée', 3, 'u', 40, 7),
      L('Main d’œuvre électricien', 2, 'h', 55, 0),
    ]]],
  },
  {
    cle: 'dev-chevalier', client: 'chevalier', j: -3, validite: 30, statut: 'facture',
    objet: 'Dépannage : disjoncteur qui saute (circuit du lave-linge)',
    signe: { j: -3, nom: 'Laura Chevalier', aDistance: false },
    conditions: 'Devis de dépannage établi avant l’intervention, à la demande du client (réparation urgente). Déplacement et diagnostic payants. Les pièces remplacées sont laissées au client.',
    lots: [['', [
      L('Déplacement et diagnostic', 1, 'forfait', 65, 0),
      L('Disjoncteur divisionnaire 20 A remplacé', 1, 'u', 38, 9),
      L('Main d’œuvre électricien', 1, 'h', 55, 0),
    ]]],
  },
  {
    cle: 'dev-lambert', client: 'lambert', chantier: 'lambert', j: -80, envoi: -80, validite: 30, statut: 'acompte_facture',
    objet: 'Électricité de l’extension (salon et suite parentale)',
    signe: { j: -75, nom: 'Hervé Lambert', aDistance: true }, acompte: 30,
    // Le 2e acompte (40 %) doit figurer au devis signé (C. civ. 1103, 1193)
    conditions: 'Acompte de 30 % à la commande, 40 % au passage des câbles, solde à la fin des travaux.',
    lots: [
      ['Tableau et protections', [
        L('Tableau électrique 3 rangées équipé (interrupteurs différentiels 30 mA type A et AC)', 1, 'u', 890, 420),
        L('Disjoncteurs divisionnaires 10 A, 16 A et 20 A', 14, 'u', 24, 9.5),
        L('Liaison équipotentielle et raccordement à la terre', 1, 'forfait', 180, 35),
      ]],
      ['Circuits prises et éclairage', [
        L('Prise 2P+T 16 A encastrée, fournie et posée', 18, 'u', 62, 11),
        L('Point lumineux en plafond avec interrupteur', 9, 'u', 85, 14),
        L('Spot LED encastré 6 W, fourni et posé', 12, 'u', 48, 13),
        L('Circuit spécialisé 32 A (plaque de cuisson)', 1, 'u', 240, 55),
        L('Câblage, gaines et boîtes d’encastrement', 1, 'forfait', 1150, 380),
      ]],
      ['Extérieur', [
        L('Applique extérieure avec détecteur de présence', 2, 'u', 135, 48),
        L('Prise extérieure étanche IP55', 1, 'u', 95, 21),
      ]],
    ],
  },
  {
    cle: 'dev-lefevre', client: 'lefevre', chantier: 'lefevre', j: -45, envoi: -45, validite: 30, statut: 'acompte_facture',
    objet: 'Rénovation électrique complète d’un appartement T3',
    signe: { j: -40, nom: 'Marie Lefèvre', aDistance: false }, acompte: 30,
    // Signé chez la cliente : aucun paiement avant 7 jours (C. conso. L221-10, délit L242-7)
    conditions: 'Acompte de 30 % à régler après le délai de 7 jours suivant la signature, solde à la fin des travaux.',
    lots: [
      ['Mise en sécurité', [
        L('Dépose de l’ancienne installation', 1, 'forfait', 380, 0),
        L('Tableau électrique 2 rangées équipé', 1, 'u', 690, 310),
      ]],
      ['Pièces de vie', [
        L('Prise 2P+T 16 A encastrée, fournie et posée', 22, 'u', 58, 11),
        L('Point lumineux avec interrupteur va-et-vient', 8, 'u', 92, 16),
        L('Prise RJ45 catégorie 6', 3, 'u', 75, 18),
      ]],
      ['Salle de bain et cuisine', [
        L('Circuits spécialisés (four, lave-linge, lave-vaisselle)', 3, 'u', 165, 40),
        L('Raccordement du sèche-serviettes', 1, 'u', 120, 15),
        L('Saignées, rebouchage et finitions', 1, 'forfait', 720, 90),
      ]],
    ],
  },
  {
    cle: 'dev-moreau', client: 'moreau', chantier: 'moreau', j: -35, envoi: -35, validite: 30, statut: 'facture',
    objet: 'Borne de recharge 7,4 kW pour véhicule électrique',
    signe: { j: -33, nom: 'Julien Moreau', aDistance: true },
    lots: [['', [
      L('Borne de recharge 7,4 kW monophasée, fournie et posée', 1, 'u', 1180, 690),
      L('Ligne dédiée depuis le tableau (câble 3G10, protection 40 A)', 1, 'forfait', 390, 110),
      L('Mise en service et essais', 1, 'forfait', 120, 0),
    ]]],
  },
  {
    cle: 'dev-dubreuil', client: 'dubreuil', chantier: 'dubreuil', j: -60, envoi: -60, validite: 30, statut: 'facture',
    objet: 'Remplacement du tableau et circuits du fournil',
    signe: { j: -55, nom: 'Sophie Dubreuil', aDistance: false },
    lots: [['', [
      L('Tableau triphasé 4 rangées équipé', 1, 'u', 1490, 640),
      L('Circuits triphasés pour four et pétrin', 2, 'u', 520, 145),
      L('Éclairage LED du fournil (dalles 60×60)', 6, 'u', 95, 38),
      L('Main d’œuvre électricien', 4, 'h', 55, 0),
    ]]],
  },
  {
    cle: 'dev-chartrons', client: 'chartrons', chantier: 'chartrons', j: -12, envoi: -12, validite: 30, statut: 'envoye',
    objet: 'Mise en conformité et éclairage LED des parties communes',
    lots: [
      ['Parties communes', [
        L('Remplacement des luminaires de cage d’escalier par des LED avec détection', 18, 'u', 165, 58),
        L('Minuterie et boutons-poussoirs lumineux', 6, 'u', 78, 22),
        L('Éclairage de sécurité (blocs autonomes)', 8, 'u', 140, 52),
      ]],
      ['Mise en conformité', [
        L('Tableau des services généraux', 1, 'u', 1350, 560),
        L('Reprise des liaisons équipotentielles', 1, 'forfait', 680, 120),
        L('Rapport de vérification et schéma unifilaire', 1, 'forfait', 450, 0),
      ]],
    ],
  },
  {
    cle: 'dev-fournier', client: 'fournier', chantier: 'fournier', j: -3, envoi: -3, validite: 30, statut: 'envoye',
    objet: 'Volets roulants connectés et éclairage du jardin',
    lots: [['', [
      L('Motorisation radio de volet roulant', 5, 'u', 245, 120),
      L('Box domotique et paramétrage', 1, 'u', 290, 140),
      L('Borne d’éclairage extérieur LED', 6, 'u', 115, 42),
      L('Tranchée, gaine et câble enterré', 1, 'forfait', 480, 95),
    ]]],
  },
  {
    cle: 'dev-rousseau', client: 'rousseau', chantier: 'rousseau', j: -1, validite: 30, statut: 'brouillon',
    objet: 'VMC hygroréglable et salle de bain',
    lots: [['', [
      L('VMC simple flux hygroréglable type B, fournie et posée', 1, 'u', 690, 310),
      L('Bouches d’extraction et conduits', 3, 'u', 85, 24),
      L('Mise aux normes du volume de la salle de bain', 1, 'forfait', 380, 60),
    ]]],
  },
  {
    cle: 'dev-kine', client: 'kine', j: -40, envoi: -40, validite: 30, statut: 'refuse',
    objet: 'Éclairage et réseau du cabinet',
    lots: [['', [
      L('Dalle LED 60×60 4000 K', 12, 'u', 98, 38),
      L('Prise RJ45 catégorie 6', 8, 'u', 75, 18),
      L('Baie de brassage et raccordements', 1, 'forfait', 560, 210),
      L('Main d’œuvre électricien', 6, 'h', 55, 0),
    ]]],
  },
  {
    cle: 'dev-girard', client: 'girard', j: -52, envoi: -52, validite: 30, statut: 'envoye',
    objet: 'Remplacement des convecteurs par des radiateurs à inertie',
    lots: [['', [
      L('Radiateur à inertie 1500 W, fourni et posé', 4, 'u', 590, 290),
      L('Radiateur à inertie 1000 W, fourni et posé', 2, 'u', 480, 230),
      L('Dépose et évacuation des anciens convecteurs', 1, 'forfait', 160, 0),
    ]]],
  },
  {
    cle: 'dev-robin', client: 'robin', j: -18, envoi: -18, validite: 30, statut: 'envoye',
    objet: 'Remplacement du tableau électrique',
    lots: [['', [
      L('Tableau électrique 2 rangées équipé', 1, 'u', 690, 310),
      L('Diagnostic et repérage des circuits', 1, 'forfait', 150, 0),
      L('Main d’œuvre électricien', 3, 'h', 55, 0),
    ]]],
  },
];

// Factures : depuis un devis (acompte, solde, totale) ou seules (dépannage, petites interventions).
// paiements : [[jour, montant, mode]] ; echeance : délai en jours
const FACTURES = [
  { cle: 'fac-vidal', client: 'vidal', devis: 'dev-vidal', type: 'totale', j: -170, echeance: 30, paiements: [[-160, 'tout', 'virement']] },
  { cle: 'fac-garnier-1', client: 'garnier', j: -150, echeance: 0, objet: 'Dépannage : remplacement d’un interrupteur différentiel', lignes: [L('Déplacement et diagnostic', 1, 'forfait', 65, 0), L('Interrupteur différentiel 40 A 30 mA type A', 1, 'u', 125, 58)], paiements: [[-150, 'tout', 'carte']] },
  { cle: 'fac-dubreuil-1', client: 'dubreuil', j: -140, echeance: 30, objet: 'Remplacement des néons du magasin', lignes: [L('Réglette LED 120 cm', 6, 'u', 45, 16), L('Main d’œuvre électricien', 1.5, 'h', 55, 0)], paiements: [[-130, 'tout', 'cheque']] },
  { cle: 'fac-agence-1', client: 'agence', j: -120, echeance: 30, objet: 'Remise en état électrique avant location (studio, rue Sainte-Catherine)', lignes: [L('Remplacement de prises et interrupteurs', 6, 'u', 45, 9), L('Détecteur de fumée', 2, 'u', 35, 12), L('Main d’œuvre électricien', 2, 'h', 55, 0)], paiements: [[-100, 'tout', 'virement']] },
  { cle: 'fac-chevalier', client: 'chevalier', j: -95, echeance: 30, objet: 'Éclairage de la cuisine et de la terrasse', lignes: [L('Spot LED encastré 6 W, fourni et posé', 10, 'u', 48, 13), L('Ruban LED sous meubles avec alimentation', 1, 'forfait', 260, 85), L('Applique extérieure avec détecteur de présence', 2, 'u', 135, 48), L('Main d’œuvre électricien', 3, 'h', 55, 0)], paiements: [[-80, 'tout', 'virement']] },
  { cle: 'fac-lambert-acompte', client: 'lambert', devis: 'dev-lambert', type: 'acompte', pct: 30, j: -74, echeance: 15, paiements: [[-70, 'tout', 'virement']] },
  { cle: 'fac-dubreuil', client: 'dubreuil', devis: 'dev-dubreuil', type: 'totale', j: -35, echeance: 30 },
  { cle: 'fac-lefevre-acompte', client: 'lefevre', devis: 'dev-lefevre', type: 'acompte', pct: 30, j: -40, echeance: 10, paiements: [[-31, 'tout', 'virement']] },
  { cle: 'fac-lambert-acompte-2', client: 'lambert', devis: 'dev-lambert', type: 'acompte', pct: 40, j: -28, echeance: 14, paiements: [[-20, 1000, 'cheque']] },
  { cle: 'fac-agence-2', client: 'agence', j: -50, echeance: 30, objet: 'Recherche de panne et remplacement du ballon d’eau chaude (T2, quai des Chartrons)', lignes: [L('Recherche de panne', 1, 'forfait', 90, 0), L('Thermostat et résistance stéatite', 1, 'u', 185, 72), L('Main d’œuvre électricien', 2.5, 'h', 55, 0), L('Déplacement', 1, 'forfait', 35, 0)] },
  { cle: 'fac-garnier-2', client: 'garnier', devis: 'dev-garnier', type: 'totale', j: -8, echeance: 0, paiements: [[-8, 'tout', 'carte']] },
  { cle: 'fac-chevalier-2', client: 'chevalier', devis: 'dev-chevalier', type: 'totale', j: -3, echeance: 0, paiements: [[-3, 'tout', 'carte']] },
  { cle: 'fac-moreau', client: 'moreau', devis: 'dev-moreau', type: 'totale', j: -12, echeance: 30 },
  { cle: 'fac-agence-3', client: 'agence', j: -6, echeance: 30, objet: 'Pose de détecteurs de fumée et remplacement de luminaires (T3, cours Victor-Hugo)', lignes: [L('Détecteur de fumée', 3, 'u', 35, 12), L('Plafonnier LED', 4, 'u', 68, 24), L('Main d’œuvre électricien', 2, 'h', 55, 0)] },
];

// ─── Chantiers ──────────────────────────────────────────────────────────────

const CHANTIERS = [
  { cle: 'lambert', client: 'lambert', nom: 'Extension Lambert', statut: 'en_cours', debut: -60, fin: 20, avancement: 70, description: 'Électricité de l’extension de 40 m² (salon et suite parentale).', taches: [['Passage des gaines', true], ['Pose du tableau', true], ['Tirage des câbles', true], ['Pose de l’appareillage', false], ['Essais et autocontrôle', false]] },
  { cle: 'lefevre', client: 'lefevre', nom: 'Rénovation T3 Lefèvre', statut: 'en_cours', debut: -14, fin: 10, avancement: 55, description: 'Rénovation électrique complète, appartement occupé.', taches: [['Dépose de l’ancienne installation', true], ['Saignées et gaines', true], ['Tableau', false], ['Appareillage et essais', false]] },
  { cle: 'moreau', client: 'moreau', nom: 'Borne de recharge Moreau', statut: 'termine', debut: -15, fin: -14, avancement: 100, description: 'Borne 7,4 kW au garage, ligne dédiée.', taches: [['Ligne dédiée', true], ['Pose de la borne', true], ['Mise en service', true]] },
  { cle: 'dubreuil', client: 'dubreuil', nom: 'Fournil Boulangerie Dubreuil', statut: 'termine', debut: -38, fin: -36, avancement: 100, description: 'Tableau triphasé et circuits du four, travaux un lundi (jour de fermeture).', taches: [['Coupure et dépose', true], ['Nouveau tableau', true], ['Essais avec le four', true]] },
  { cle: 'chartrons', client: 'chartrons', nom: 'Parties communes SCI Les Quais', statut: 'prospect', debut: 25, fin: 32, avancement: 0, description: 'Immeuble de 4 étages, cage d’escalier et caves.', taches: [] },
  { cle: 'fournier', client: 'fournier', nom: 'Domotique Fournier', statut: 'prospect', debut: 21, fin: 23, avancement: 0, description: 'Volets connectés et éclairage du jardin.', taches: [] },
  { cle: 'rousseau', client: 'rousseau', nom: 'VMC Rousseau', statut: 'prospect', debut: 30, fin: 30, avancement: 0, description: 'Maison de 1975, salle de bain à mettre aux normes.', taches: [] },
];

// ─── Construction ───────────────────────────────────────────────────────────

/**
 * @param {{ aujourdhui?: Date, boite?: string }} options
 * @returns {{ clients, chantiers, devis, paiements, echanges, planning, memos, depenses }}
 */
export function construireJeu({ aujourdhui = new Date(), boite = 'seguin.hugo06@gmail.com' } = {}) {
  const [local, domaine] = boite.split('@');
  const jour = (n) => jourDecale(aujourdhui, n);
  const instant = (n, h) => instantDecale(aujourdhui, n, h);
  const id = (cle) => uuidDe(cle);

  const clients = CLIENTS.map((c, i) => ({
    id: id(`client:${c.cle}`),
    nom: c.nom,
    prenom: c.prenom,
    entreprise: c.entreprise || '',
    email: `${local}+${c.cle}@${domaine}`,
    telephone: `06 39 98 ${String(10 + i).padStart(2, '0')} ${String(20 + i * 3).padStart(2, '0')}`,
    adresse: c.adresse,
    categorie: c.categorie,
    notes: '',
  }));
  const client = Object.fromEntries(CLIENTS.map((c, i) => [c.cle, clients[i]]));
  const nomClient = (c) => (c.entreprise || `${c.prenom} ${c.nom}`);

  const chantiers = CHANTIERS.map((ch) => {
    const [rue, cpVille] = client[ch.client].adresse.split(', ');
    const [codePostal, ...ville] = cpVille.split(' ');
    return {
      id: id(`chantier:${ch.cle}`),
      client_id: client[ch.client].id,
      nom: ch.nom,
      description: ch.description,
      adresse: rue,
      codePostal,
      ville: ville.join(' '),
      statut: ch.statut,
      date_debut: jour(ch.debut),
      date_fin: jour(ch.fin),
      avancement: ch.avancement,
      taches: ch.taches.map(([text, done], k) => ({ id: id(`tache:${ch.cle}:${k}`), text, done })),
    };
  });
  const chantier = Object.fromEntries(CHANTIERS.map((ch, i) => [ch.cle, chantiers[i]]));

  const ligne = (cle, l, k) => ({
    id: id(`ligne:${cle}:${k}`),
    description: l.description,
    quantite: l.quantite,
    unite: l.unite,
    prixUnitaire: l.prixUnitaire,
    prixAchat: l.prixAchat,
    montant: arrondi(l.quantite * l.prixUnitaire),
    tva: 0,
  });
  const totaux = (lignes) => {
    const ht = arrondi(lignes.reduce((s, l) => s + l.montant, 0));
    return { total_ht: ht, tva: 0, total_ttc: ht };
  };

  // Devis
  const devis = DEVIS.map((d) => {
    let k = 0;
    const sections = d.lots.map(([titre, lignes], s) => ({
      id: id(`lot:${d.cle}:${s}`), titre, nom: titre, lignes: lignes.map((l) => ligne(d.cle, l, k++)),
    }));
    const lignes = sections.flatMap((s) => s.lignes);
    // Lots enregistrés seulement s'ils ont un titre (sinon la pièce est à plat, comme une pièce sans lots)
    const lots = sections.some((s) => s.titre) ? sections : [];
    const signature = d.signe ? {
      signatureDate: instant(d.signe.j, '18:42'),
      // Signature à distance (page /devis/signer) : colonnes écrites par sign_devis ; sur place : par l'app
      ...(d.signe.aDistance
        ? { signature_data: SIGNATURE_DEMO, signataire_nom: d.signe.nom, signature_cgv_accepted: true }
        : { signature: SIGNATURE_DEMO, signataire: d.signe.nom }),
    } : {};
    return {
      id: id(`devis:${d.cle}`),
      cle: d.cle,
      type: 'devis',
      client_id: client[d.client].id,
      client_nom: nomClient(client[d.client]),
      chantier_id: d.chantier ? chantier[d.chantier].id : null,
      date: jour(d.j),
      validite: d.validite,
      date_envoi: d.envoi != null ? instant(d.envoi, '17:15') : null,
      statut: d.signe && d.statut === 'envoye' ? 'signe' : d.statut,
      objet: d.objet,
      tvaRate: 0,
      lignes,
      sections: lots,
      acompte_pct: d.acompte || null,
      conditions: d.conditions || (d.acompte ? `Acompte de ${d.acompte} % à la commande, solde à la fin des travaux.` : 'Paiement à réception de la facture.'),
      notes: '',
      ...totaux(lignes),
      ...signature,
    };
  });
  const devisParCle = Object.fromEntries(devis.map((d) => [d.cle, d]));
  // Budget d'un chantier : le montant de son devis
  for (const ch of chantiers) ch.budget_estime = arrondi(devis.filter((d) => d.chantier_id === ch.id).reduce((s, d) => s + d.total_ht, 0));

  // Factures
  const factures = FACTURES.map((f) => {
    const source = f.devis ? devisParCle[f.devis] : null;
    let lignes;
    let objet = f.objet;
    if (source && f.type === 'acompte') {
      const montant = arrondi(source.total_ttc * f.pct / 100);
      lignes = [ligne(f.cle, L(`Acompte de ${f.pct} % sur le devis ${'{numero}'} — ${source.objet}`, 1, 'forfait', montant), 0)];
      objet = `Acompte de ${f.pct} % — ${source.objet}`;
    } else if (source) {
      lignes = source.lignes.map((l, k) => ({ ...l, id: id(`ligne:${f.cle}:${k}`) }));
      objet = source.objet;
    } else {
      lignes = f.lignes.map((l, k) => ligne(f.cle, l, k));
    }
    const t = totaux(lignes);
    const regle = (f.paiements || []).map(([j, montant, mode]) => ({ j, montant: montant === 'tout' ? t.total_ttc : montant, mode }));
    const paye = arrondi(regle.reduce((s, p) => s + p.montant, 0));
    const soldee = paye >= t.total_ttc - 0.005;
    return {
      id: id(`facture:${f.cle}`),
      cle: f.cle,
      sourceCle: f.devis || null,
      type: 'facture',
      facture_type: f.type || 'totale',
      devis_source_id: source?.id || null,
      acompte_pct: f.type === 'acompte' ? f.pct : null,
      client_id: client[f.client].id,
      client_nom: nomClient(client[f.client]),
      chantier_id: source?.chantier_id || null,
      date: jour(f.j),
      date_envoi: instant(f.j, '18:05'),
      date_echeance: jour(f.j + f.echeance),
      statut: soldee ? 'payee' : 'envoye',
      montant_paye: paye,
      date_paiement: soldee ? jour(regle[regle.length - 1].j) : null,
      mode_paiement: soldee ? regle[regle.length - 1].mode : null,
      objet,
      tvaRate: 0,
      lignes,
      sections: [],
      conditions: f.echeance ? `Paiement à ${f.echeance} jours.` : 'Paiement à réception.',
      notes: '',
      ...t,
      _paiements: regle,
    };
  });

  // Numérotation chronologique, comme l'app (DEV-AAAA-NNNNN / FAC-AAAA-NNNNN, par année)
  const numeroter = (docs, prefixe) => {
    const compteurs = {};
    [...docs].sort((a, b) => a.date.localeCompare(b.date) || a.cle.localeCompare(b.cle)).forEach((d) => {
      const annee = d.date.slice(0, 4);
      compteurs[annee] = (compteurs[annee] || 0) + 1;
      d.numero = `${prefixe}-${annee}-${String(compteurs[annee]).padStart(5, '0')}`;
    });
  };
  numeroter(devis, 'DEV');
  numeroter(factures, 'FAC');
  for (const f of factures) {
    for (const l of f.lignes) l.description = l.description.replace('{numero}', devisParCle[f.sourceCle]?.numero || '');
  }

  const paiements = factures.flatMap((f) => f._paiements.map((p, k) => ({
    id: id(`paiement:${f.cle}:${k}`),
    devisId: f.id,
    documentNumero: f.numero,
    montant: p.montant,
    date: jour(p.j),
    mode: p.mode,
    notes: '',
  })));

  // Journal des échanges : envois, signatures, paiements, un appel
  const echanges = [];
  const echange = (cle, doc, type, contenu, quand) => echanges.push({
    id: id(`echange:${cle}`), client_id: doc.client_id, chantier_id: doc.chantier_id || null, devis_id: doc.id, type, contenu, date: quand,
  });
  for (const d of devis) {
    if (d.date_envoi) echange(`envoi:${d.cle}`, d, 'email', `Envoi du devis ${d.numero} par e-mail`, d.date_envoi);
    if (d.signatureDate) echange(`signature:${d.cle}`, d, 'note', `Devis ${d.numero} signé par ${d.signataire_nom || d.signataire}${d.signature_data ? ' (signature en ligne)' : ' (sur place)'}`, d.signatureDate);
    if (d.statut === 'refuse') echange(`refus:${d.cle}`, d, 'note', `Devis ${d.numero} refusé : le client a choisi un autre prestataire`, instant(-30, '11:20'));
  }
  for (const f of factures) {
    echange(`envoi:${f.cle}`, f, 'email', `Envoi de la facture ${f.numero} par e-mail`, f.date_envoi);
  }
  echange('appel:chartrons', devisParCle['dev-chartrons'], 'note', 'Appel de M. Bernard : visite des parties communes à caler avec le syndic', instant(-5, '10:05'));

  // Planning : cette semaine et la suivante
  const planning = [
    { cle: 'lefevre-1', title: 'Chantier Lefèvre : tableau et circuits', date: jour(0), time: '08:00', duration: 480, type: 'chantier', chantier: 'lefevre', client: 'lefevre' },
    { cle: 'lefevre-2', title: 'Chantier Lefèvre : appareillage', date: jour(1), time: '08:00', duration: 480, type: 'chantier', chantier: 'lefevre', client: 'lefevre' },
    { cle: 'chartrons', title: 'Visite technique SCI Les Quais', date: jour(2), time: '14:00', duration: 90, type: 'rdv', chantier: 'chartrons', client: 'chartrons', location: '22 rue Notre-Dame, Bordeaux' },
    { cle: 'lambert', title: 'Extension Lambert : pose de l’appareillage', date: jour(3), time: '08:00', duration: 480, type: 'chantier', chantier: 'lambert', client: 'lambert' },
    { cle: 'fournier', title: 'Rendez-vous Mme Fournier (domotique)', date: jour(6), time: '10:00', duration: 60, type: 'rdv', chantier: 'fournier', client: 'fournier', location: '31 chemin du Moulin, Gradignan' },
    { cle: 'consuel', title: 'Essais et autocontrôle : extension Lambert', date: jour(9), time: '09:00', duration: 60, type: 'rdv', chantier: 'lambert', client: 'lambert' },
  ].map((e) => ({
    id: id(`planning:${e.cle}`), title: e.title, date: e.date, time: e.time, duration: e.duration, type: e.type,
    chantierId: chantier[e.chantier]?.id || null, clientId: client[e.client]?.id || null, location: e.location || '', description: '',
  }));

  const memos = [
    { cle: 'commande', text: 'Commander l’appareillage pour l’extension Lambert', due: 1, priority: 'haute', chantier: 'lambert' },
    { cle: 'rappel', text: 'Rappeler M. Bernard (SCI Les Quais) pour la visite', due: 0, priority: 'moyenne', client: 'chartrons' },
    { cle: 'acompte', text: 'Faire le point sur le 2e acompte Lambert', due: 2, priority: 'moyenne', client: 'lambert' },
    { cle: 'consuel', text: 'Envoyer à M. Moreau le procès-verbal de mise en service de la borne', done: -10, client: 'moreau' },
  ].map((m, k) => ({
    id: id(`memo:${m.cle}`), text: m.text, priority: m.priority || null, due_date: m.due != null ? jour(m.due) : null,
    chantier_id: m.chantier ? chantier[m.chantier].id : null, client_id: m.client ? client[m.client].id : null,
    is_done: m.done != null, done_at: m.done != null ? instant(m.done, '19:00') : null, position: k,
  }));

  const depenses = [
    { cle: 'lambert-tableau', chantier: 'lambert', description: 'Tableau 3 rangées et disjoncteurs', montant: 486.4, j: -58 },
    { cle: 'lambert-cables', chantier: 'lambert', description: 'Câbles, gaines et boîtes', montant: 312.9, j: -55 },
    { cle: 'lefevre-materiel', chantier: 'lefevre', description: 'Appareillage et tableau 2 rangées', montant: 742.5, j: -13 },
    { cle: 'moreau-borne', chantier: 'moreau', description: 'Borne de recharge 7,4 kW et protection', montant: 768, j: -16 },
    { cle: 'dubreuil-tableau', chantier: 'dubreuil', description: 'Tableau triphasé et disjoncteurs', montant: 912.3, j: -40 },
  ].map((dp) => ({
    id: id(`depense:${dp.cle}`), chantierId: chantier[dp.chantier].id, description: dp.description, montant: dp.montant,
    date: jour(dp.j), categorie: 'Matériaux', fournisseur: 'Grossiste en matériel électrique',
  }));

  const pieces = [...devis, ...factures].map(({ cle: _cle, sourceCle: _source, _paiements, ...d }) => d);
  return { clients, chantiers, devis: pieces, paiements, echanges, planning, memos, depenses };
}
