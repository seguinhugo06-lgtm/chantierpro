/**
 * Échéance d'un chantier : UNE règle pour la liste, la fiche et l'alerte « en retard ».
 *
 * Le rouge veut dire « en retard » : seul un chantier EN COURS dont la date de fin est passée l'est (un prospect, un
 * chantier terminé, archivé ou abandonné ne l'est jamais). Le jour même n'est pas un retard (à surveiller : ambre). Les
 * dates « AAAA-MM-JJ » sont lues en heure locale (src/lib/dates.js). La cloche, l'Accueil, la liste et la fiche passent
 * toutes par ici.
 */
import { dateLue, jourLocal } from './dates';

const JOUR_MS = 86400000;
const CLOS = ['termine', 'archive', 'abandonne'];

/**
 * Jours entiers entre aujourd'hui et la fin prévue : négatif = en retard, 0 = aujourd'hui.
 * @returns {number|null} null : pas de date de fin, ou chantier clos
 */
export function joursAvantFin(chantier, maintenant = new Date()) {
  const fin = chantier?.date_fin || chantier?.dateFin;
  if (!fin || CLOS.includes(chantier?.statut)) return null;
  const jour = String(fin).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return null;
  return Math.round((dateLue(jour) - dateLue(jourLocal(maintenant))) / JOUR_MS);
}

/**
 * Un chantier est en retard quand il est en cours et que sa fin prévue est passée.
 * (Nommé « chantier… » pour ne pas le confondre avec estEnRetard de ventes.js, qui parle des factures.)
 */
export function chantierEnRetard(chantier, maintenant = new Date()) {
  if (chantier?.statut !== 'en_cours') return false;
  const jours = joursAvantFin(chantier, maintenant);
  return jours !== null && jours < 0;
}

/**
 * Jours sans activité d'un chantier en cours (dernière mise à jour ou dernière photo), à partir de 7 jours.
 * @returns {number|null} null : pas de signal, ou activité récente
 */
export function joursSansActivite(chantier, maintenant = new Date()) {
  if (chantier?.statut !== 'en_cours') return null;
  const derniere = Math.max(
    chantier.updated_at || chantier.updatedAt ? new Date(chantier.updated_at || chantier.updatedAt).getTime() : 0,
    chantier.last_photo_at ? new Date(chantier.last_photo_at).getTime() : 0,
  );
  if (!derniere) return null;
  const jours = Math.floor((maintenant.getTime() - derniere) / JOUR_MS);
  return jours >= 7 ? jours : null;
}
