/**
 * statuts — un statut = un libellé et un ton, partout (refonte du 9 oct. 2026).
 *
 * Avant : au moins 8 tables, « Facturé » violet, indigo ou orange selon l'écran, « Signé » et
 * « Accepté » pour la même chose. Les tons renvoient aux couleurs de src/styles/theme.css :
 *   neutre = brouillon ou clos · info = chez le client · succes = acquis
 *   alerte = à surveiller · danger = problème.
 * L'orange (accent) n'est jamais un statut.
 */

export const TONS = ['neutre', 'info', 'succes', 'alerte', 'danger'];

const DEVIS = {
  brouillon: { libelle: 'Brouillon', ton: 'neutre' },
  envoye: { libelle: 'Envoyé', ton: 'info' },
  // « vu » était posé quand l'artisan ouvrait son propre devis : il ne prouve rien, on affiche « Envoyé ».
  vu: { libelle: 'Envoyé', ton: 'info' },
  accepte: { libelle: 'Signé', ton: 'succes' },
  signe: { libelle: 'Signé', ton: 'succes' },
  acompte_facture: { libelle: 'Acompte facturé', ton: 'succes' },
  facture: { libelle: 'Facturé', ton: 'neutre' },
  refuse: { libelle: 'Refusé', ton: 'danger' },
  expire: { libelle: 'Expiré', ton: 'neutre' },
};

const FACTURE = {
  brouillon: { libelle: 'Brouillon', ton: 'neutre' },
  envoye: { libelle: 'Envoyée', ton: 'info' },
  vu: { libelle: 'Envoyée', ton: 'info' },
  partielle: { libelle: 'Payée en partie', ton: 'alerte' },
  en_retard: { libelle: 'En retard', ton: 'danger' },
  payee: { libelle: 'Payée', ton: 'succes' },
  paye: { libelle: 'Payée', ton: 'succes' },
  annulee: { libelle: 'Annulée', ton: 'neutre' },
};

const CHANTIER = {
  prospect: { libelle: 'Prospect', ton: 'neutre' },
  en_cours: { libelle: 'En cours', ton: 'info' },
  termine: { libelle: 'Terminé', ton: 'succes' },
  abandonne: { libelle: 'Abandonné', ton: 'neutre' },
  archive: { libelle: 'Archivé', ton: 'neutre' },
};

const CLIENT = {
  actif: { libelle: 'Actif', ton: 'succes' },
  en_devis: { libelle: 'En devis', ton: 'info' },
  prospect: { libelle: 'Prospect', ton: 'neutre' },
  inactif: { libelle: 'Inactif', ton: 'neutre' },
};

/**
 * La règle d'un statut de client, écrite une fois (audit UX du 20 oct. 2026 : « Actif / Inactif / En devis » n'étaient
 * expliqués nulle part ; une cliente qui avait payé était « Inactive »). Ce texte s'affiche tel quel dans l'app.
 */
export const REGLE_CLIENT = {
  actif: 'Un chantier est en cours ou prévu.',
  en_devis: 'Un devis est envoyé ou signé, sans chantier en cours.',
  prospect: 'Créé il y a moins de 90 jours, sans devis ni chantier.',
  inactif: 'Ni chantier ouvert, ni devis envoyé ou signé.',
};

const JOURS_PROSPECT = 90;

/**
 * Le statut d'un client, d'après ce qu'il a en cours — la seule règle (liste, fiche, filtres).
 * @param {{ chantiersEnCours?: number, chantiersActifs?: number, devisActifs?: number, chantiers?: number, devis?: number }} stats
 *   chantiersEnCours : chantiers « en cours » ; chantiersActifs : ni archivé, ni abandonné, ni terminé (en cours ou prévu) ;
 *   devisActifs : devis envoyé, vu, signé ou à acompte facturé ; chantiers et devis : totaux
 * @param {string|number|Date} [creeLe] date de création du client
 * @param {number} [maintenant] horloge (pour les tests)
 * @returns {'actif'|'en_devis'|'prospect'|'inactif'}
 */
export function statutClient(stats = {}, creeLe, maintenant = Date.now()) {
  const { chantiersEnCours = 0, chantiersActifs = 0, devisActifs = 0, chantiers = 0, devis = 0 } = stats;
  if (chantiersEnCours > 0) return 'actif';
  if (devisActifs > 0) return 'en_devis';
  if (creeLe) {
    const t = new Date(creeLe).getTime();
    if (Number.isFinite(t) && (maintenant - t) / 86400000 < JOURS_PROSPECT && chantiers === 0 && devis === 0) return 'prospect';
  }
  if (chantiersActifs > 0) return 'actif';
  return 'inactif';
}

const TABLES = { devis: DEVIS, facture: FACTURE, chantier: CHANTIER, client: CLIENT };

/**
 * Libellé et ton d'un statut.
 * @param {'devis'|'facture'|'chantier'|'client'} genre
 * @param {string} statut
 * @returns {{ libelle: string, ton: string }}
 */
export function statut(genre, statut) {
  const trouve = TABLES[genre]?.[statut];
  if (trouve) return trouve;
  const brut = String(statut || '').replace(/_/g, ' ');
  return { libelle: brut ? brut.charAt(0).toUpperCase() + brut.slice(1) : '—', ton: 'neutre' };
}

/** Les statuts d'un genre, dans l'ordre de la table (pour les filtres et le styleguide). */
export function statutsDe(genre) {
  return Object.entries(TABLES[genre] || {}).map(([cle, v]) => ({ cle, ...v }));
}
