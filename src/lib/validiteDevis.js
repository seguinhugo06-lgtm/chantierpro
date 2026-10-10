/**
 * Validité d'un devis : jusqu'à quand le client peut l'accepter. L'offre faite avec un délai devient caduque
 * à son expiration (C. civ. art. 1117).
 *
 * Recette du 9 oct. 2026 : l'e-mail disait « Ce devis reste valable 30 jours » quoi qu'il arrive (même expiré,
 * même à J+20), un devis expiré se relançait et se signait en ligne, la page de signature affichait 30 jours
 * quelle que soit la validité choisie, et la fiche disait le devis expiré dès son dernier jour de validité.
 * Une seule définition pour la fiche, les deux générateurs de PDF et l'e-mail.
 */
import { jourLocal } from './dates';

const VALIDITE_PAR_DEFAUT = 30;

const lireJour = (texte) => {
  const [a, m, j] = String(texte || '').slice(0, 10).split('-').map(Number);
  return a && m && j ? Date.UTC(a, m - 1, j) : null;
};

const versJour = (t) => new Date(t).toISOString().slice(0, 10);

/**
 * Dernier jour de validité, « AAAA-MM-JJ » : date du devis + validité choisie ; sinon la date de fin
 * enregistrée ; sinon la validité par défaut de l'entreprise (30 jours si elle n'en a pas).
 */
export function finValidite(doc, entreprise = null) {
  const debut = lireJour(doc?.date);
  const jours = Number(doc?.validite);
  if (debut !== null && jours > 0) return versJour(debut + jours * 86400000);
  if (doc?.date_validite && lireJour(doc.date_validite) !== null) return String(doc.date_validite).slice(0, 10);
  const defaut = Number(entreprise?.validiteDevis || entreprise?.validite_devis) || VALIDITE_PAR_DEFAUT;
  return debut !== null ? versJour(debut + defaut * 86400000) : null;
}

/** Jours de validité restants : 0 le dernier jour, négatif une fois expiré, null sans date. */
export function joursRestants(doc, aujourdHui = jourLocal(), entreprise = null) {
  const fin = lireJour(finValidite(doc, entreprise));
  const jour = lireJour(aujourdHui);
  return fin === null || jour === null ? null : Math.round((fin - jour) / 86400000);
}

/** Le devis n'est plus valable (le dernier jour de validité est passé). */
export function estExpire(doc, aujourdHui = jourLocal(), entreprise = null) {
  const j = joursRestants(doc, aujourdHui, entreprise);
  return j !== null && j < 0;
}
