/**
 * La jauge « Profil complété » des Paramètres et son menu « Champs manquants ».
 *
 * Trois groupes :
 * - obligatoires : ce qui bloque l'envoi (lib/profilLegal, la liste du contrôle d'envoi) ;
 * - selonSituation : les autres mentions obligatoires pour qui est concerné, qui n'empêchent pas l'envoi —
 *   capital social et RCS d'une société (service-public F31808 ; C. com. R123-237), n° de TVA
 *   intracommunautaire hors franchise (CGI ann. II art. 242 nonies A), et pour qui travaille pour des
 *   particuliers : coordonnées et site du médiateur de la consommation (C. conso. L616-1, R616-1),
 *   coordonnées de l'assureur décennal et zone couverte (C. conso. R111-2 9°). Bloquer l'envoi sans le
 *   capital, le RCS ou la TVA intracom attend Hugo (docs/decisions.md, Q-capital-envoi) ;
 * - recommandes : pas obligatoires — code APE, RC Pro (pas obligatoire dans le bâtiment : C. artisanat
 *   L132-1 ne s'applique pas à qui est soumis à la décennale).
 *
 * Le pourcentage est la note de l'onglet Facture 2026 (lib/mentionsFacture) : ce qui bloque l'envoi, plus
 * capital, RCS et TVA intracom quand ils concernent l'entreprise. 100 % = le profil ne bloque plus l'envoi
 * ET ces mentions sont saisies. Le médiateur et l'assureur décennal n'y comptent pas : l'app ne sait pas si
 * l'artisan travaille pour des particuliers. Les obligatoires et ces trois mentions reprennent la liste de
 * Facture 2026 (mêmes libellés, même champ ciblé) : les deux écrans ne peuvent plus se contredire.
 *
 * Contre-relecture juridique du 10 oct. 2026 : avant ce module, la jauge rangeait capital, RCS, TVA intracom,
 * médiateur et assureur décennal sous « Recommandés », à côté du code APE, alors que l'onglet Facture 2026
 * disait « Obligatoires » pour les trois premiers ; elle affichait 100 % et fermait son menu pour une société
 * sans capital social, que Facture 2026 ne note pas complète.
 *
 * Chaque champ manquant : `{ id, champ, libelle, onglet, precision? }` ; « → onglet » ouvre l'onglet des
 * Réglages sur le champ `settings-field-<champ>`. `precision` : à qui la mention est due, quand l'app ne le
 * sait pas.
 */

import { PROFIL_EXIGE } from './profilLegal';
import { mentionsFacture } from './mentionsFacture';

const rempli = (valeur) => (typeof valeur === 'string' ? valeur.trim() !== '' : Boolean(valeur));
// Entreprise relue telle quelle depuis la base : clés snake_case
const lire = (e, cle, cleBase) => e[cle] ?? e[cleBase];
// Le premier champ vide parmi `[cle, cleBase, champ]`, ou null : le champ à cibler
const premierVide = (e, champs) => champs.find(([cle, cleBase]) => !rempli(lire(e, cle, cleBase)))?.[2] ?? null;

const BLOQUANTES = new Set(PROFIL_EXIGE.map((m) => m.id));

// `concerne` : la mention ne vise que certaines entreprises (ailleurs, elle n'est pas listée)
// `manque` : le champ à cibler s'il reste quelque chose à saisir, sinon null
const POUR_PARTICULIERS = [
  {
    // Ses coordonnées et l'adresse de son site, pas seulement son nom (R616-1) : un champ « site internet et adresse »
    id: 'mediateur',
    libelle: 'Médiateur de la consommation (nom, site et adresse)',
    onglet: 'documents',
    precision: 'si vous travaillez pour des particuliers',
    manque: (e) => premierVide(e, [['mediateur', 'mediateur', 'mediateur'], ['mediateurContact', 'mediateur_contact', 'mediateurContact']]),
  },
  {
    // Sans objet quand l'artisan déclare ses travaux non soumis à la décennale (D-24)
    id: 'decennaleAssureur',
    libelle: 'Coordonnées de l\'assureur décennal et zone couverte',
    onglet: 'assurances',
    // R111-2 9° vise le consommateur ; l'attestation, qui les porte, se joint pour tout client (C. assur. L243-2)
    // Espace insécable avant le point-virgule (typographie française) : il ne commence pas une ligne
    precision: 'dues à vos clients particuliers\u00a0; l\'attestation se joint à tous vos devis et factures',
    concerne: (e) => e.decennaleNonSoumis !== true,
    manque: (e) => premierVide(e, [
      ['decennaleAssureurAdresse', 'decennale_assureur_adresse', 'decennaleAssureurAdresse'],
      ['decennaleZone', 'decennale_zone', 'decennaleZone'],
    ]),
  },
];

const RECOMMANDES = [
  { id: 'codeApe', libelle: 'Code APE', onglet: 'legal', manque: (e) => premierVide(e, [['codeApe', 'code_ape', 'codeApe']]) },
  {
    id: 'rcPro',
    libelle: 'Assurance RC Pro (assureur et n° de contrat)',
    onglet: 'assurances',
    // Souscrite, ses coordonnées et sa couverture sont dues au client particulier (C. conso. R111-2 9°)
    precision: 'si vous en avez une, à indiquer à vos clients particuliers',
    manque: (e) => premierVide(e, [['rcProAssureur', 'rc_pro_assureur', 'rcPro'], ['rcProNumero', 'rc_pro_numero', 'rcProNumero']]),
  },
];

const manquants = (liste, e) => liste
  .filter((m) => !m.concerne || m.concerne(e))
  .map((m) => ({ m, champ: m.manque(e) }))
  .filter(({ champ }) => champ)
  .map(({ m, champ }) => ({ id: m.id, champ, libelle: m.libelle, onglet: m.onglet, ...(m.precision ? { precision: m.precision } : {}) }));

/**
 * `{ obligatoires, selonSituation, recommandes, completude }` : les champs manquants de chaque groupe et le
 * pourcentage de la jauge (0 à 100), la note de l'onglet Facture 2026.
 */
export function jaugeProfil(entreprise) {
  const e = entreprise || {};
  const facture = mentionsFacture(e);
  const manquantes = facture.obligatoires
    .filter((m) => !m.rempli)
    .map(({ id, champ, libelle, onglet }) => ({ id, champ, libelle, onglet }));
  return {
    obligatoires: manquantes.filter((m) => BLOQUANTES.has(m.id)),
    selonSituation: [...manquantes.filter((m) => !BLOQUANTES.has(m.id)), ...manquants(POUR_PARTICULIERS, e)],
    recommandes: manquants(RECOMMANDES, e),
    completude: facture.note,
  };
}
