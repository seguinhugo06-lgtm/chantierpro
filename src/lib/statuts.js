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
  vu: { libelle: 'Vu', ton: 'info' },
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
  vu: { libelle: 'Vue', ton: 'info' },
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
  prospect: { libelle: 'Prospect', ton: 'info' },
  inactif: { libelle: 'Inactif', ton: 'neutre' },
};

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
