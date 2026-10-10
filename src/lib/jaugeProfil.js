/**
 * La jauge « Profil complété » des Paramètres et son menu « Champs manquants ».
 *
 * Trois groupes :
 * - obligatoires : ce qui bloque l'envoi (lib/profilLegal, la liste du contrôle d'envoi). Seuls comptés dans le
 *   pourcentage : 100 % veut dire que le profil ne bloque plus l'envoi ;
 * - selonSituation : les autres mentions obligatoires pour qui est concerné, qui n'empêchent pas l'envoi —
 *   capital social et RCS d'une société (service-public F31808 ; C. com. R123-237), n° de TVA
 *   intracommunautaire hors franchise, médiateur de la consommation (C. conso. L612-1) et coordonnées et zone
 *   de l'assureur décennal (C. conso. R111-2 9°) pour qui travaille pour des particuliers. Bloquer l'envoi sans
 *   le capital, le RCS ou la TVA intracom attend Hugo (docs/decisions.md, Q-capital-envoi) ;
 * - recommandes : utiles, pas obligatoires — code APE, RC Pro (pas obligatoire dans le BTP).
 *
 * Contre-relecture juridique du 10 oct. 2026 : avant ce module, la jauge rangeait capital, RCS, TVA intracom,
 * médiateur et assureur décennal sous « Recommandés », à côté du code APE, alors que l'onglet Facture 2026
 * (lib/mentionsFacture) disait « Obligatoires » pour les trois premiers ; et à 100 % le menu ne s'ouvrait plus,
 * si bien qu'une société sans capital social ne voyait plus ce qui lui manquait.
 *
 * Chaque champ manquant : `{ id, champ, libelle, onglet, precision? }` ; « → onglet » ouvre l'onglet des
 * Réglages sur le champ `settings-field-<champ>`. `precision` : la situation qui rend la mention obligatoire,
 * quand l'app ne la connaît pas (elle ne sait pas si l'artisan travaille pour des particuliers).
 */

import { PROFIL_EXIGE, profilManquant } from './profilLegal';
import { estSociete, rcsConcerne, rcsRenseigne, tvaIntraConcernee } from './mentionsFacture';

const rempli = (valeur) => (typeof valeur === 'string' ? valeur.trim() !== '' : Boolean(valeur));
// Entreprise relue telle quelle depuis la base : clés snake_case
const lire = (e, cle, cleBase) => e[cle] ?? e[cleBase];

const POUR_PARTICULIERS = 'si vous travaillez pour des particuliers';

// `concerne` : la mention ne vise que certaines entreprises (ailleurs, elle n'est pas listée)
// `manque` : ce qui reste à saisir, ou null ; renvoie le champ à cibler quand il y en a plusieurs
const SELON_SITUATION = [
  {
    id: 'capital',
    libelle: 'Capital social',
    onglet: 'identite',
    concerne: estSociete,
    manque: (e) => (rempli(e.capital) ? null : 'capital'),
  },
  {
    // La ville du greffe et le numéro (les PDF n'impriment rien sans les deux), ou l'ancien champ libre `rcs`
    id: 'rcs',
    libelle: 'RCS et ville du greffe',
    onglet: 'legal',
    concerne: rcsConcerne,
    // `settings-field-rcs` : la ville du greffe
    manque: (e) => {
      if (rcsRenseigne(e)) return null;
      return rempli(lire(e, 'rcsVille', 'rcs_ville')) ? 'rcsNumero' : 'rcs';
    },
  },
  {
    id: 'tvaIntra',
    libelle: 'N° de TVA intracommunautaire',
    onglet: 'legal',
    concerne: tvaIntraConcernee,
    manque: (e) => (rempli(lire(e, 'tvaIntra', 'tva_intra')) ? null : 'tvaIntra'),
  },
  {
    // Ses coordonnées, pas seulement son nom (L612-1) ; les PDF les impriment pour un client particulier
    id: 'mediateur',
    libelle: 'Médiateur de la consommation (nom et site)',
    onglet: 'documents',
    precision: POUR_PARTICULIERS,
    manque: (e) => {
      if (!rempli(e.mediateur)) return 'mediateur';
      return rempli(lire(e, 'mediateurContact', 'mediateur_contact')) ? null : 'mediateurContact';
    },
  },
  {
    // Sans objet quand l'artisan déclare ses travaux non soumis à la décennale (D-24)
    id: 'decennaleAssureurAdresse',
    libelle: 'Coordonnées de l\'assureur décennal',
    onglet: 'assurances',
    precision: POUR_PARTICULIERS,
    concerne: (e) => e.decennaleNonSoumis !== true,
    manque: (e) => (rempli(lire(e, 'decennaleAssureurAdresse', 'decennale_assureur_adresse')) ? null : 'decennaleAssureurAdresse'),
  },
  {
    id: 'decennaleZone',
    libelle: 'Zone couverte par la décennale',
    onglet: 'assurances',
    precision: POUR_PARTICULIERS,
    concerne: (e) => e.decennaleNonSoumis !== true,
    manque: (e) => (rempli(lire(e, 'decennaleZone', 'decennale_zone')) ? null : 'decennaleZone'),
  },
];

const RECOMMANDES = [
  { id: 'codeApe', libelle: 'Code APE', onglet: 'legal', manque: (e) => (rempli(lire(e, 'codeApe', 'code_ape')) ? null : 'codeApe') },
  { id: 'rcProAssureur', libelle: 'Assureur RC Pro', onglet: 'assurances', manque: (e) => (rempli(lire(e, 'rcProAssureur', 'rc_pro_assureur')) ? null : 'rcPro') },
  { id: 'rcProNumero', libelle: 'N° de police RC Pro', onglet: 'assurances', manque: (e) => (rempli(lire(e, 'rcProNumero', 'rc_pro_numero')) ? null : 'rcProNumero') },
];

const manquants = (liste, e) => liste
  .filter((m) => !m.concerne || m.concerne(e))
  .map((m) => ({ m, champ: m.manque(e) }))
  .filter(({ champ }) => champ)
  .map(({ m, champ }) => ({ id: m.id, champ, libelle: m.libelle, onglet: m.onglet, ...(m.precision ? { precision: m.precision } : {}) }));

/**
 * `{ obligatoires, selonSituation, recommandes, completude }` : les champs manquants de chaque groupe et le
 * pourcentage de la jauge (0 à 100), calculé sur les seuls obligatoires.
 */
export function jaugeProfil(entreprise) {
  const e = entreprise || {};
  const obligatoires = profilManquant(e).map((m) => ({ id: m.id, champ: m.champ, libelle: m.libelle, onglet: m.onglet }));
  const completude = Math.round(((PROFIL_EXIGE.length - obligatoires.length) / PROFIL_EXIGE.length) * 100);
  return {
    obligatoires,
    selonSituation: manquants(SELON_SITUATION, e),
    recommandes: manquants(RECOMMANDES, e),
    completude,
  };
}
