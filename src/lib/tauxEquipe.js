/**
 * Taux d'une personne de l'équipe (refonte du 9 oct. 2026).
 *
 * Deux champs, saisis dans la fiche :
 *   - tauxHoraire       : « Taux facturation » — ce que l'heure est facturée au client ;
 *   - coutHoraireCharge : « Coût horaire chargé » — ce que l'heure coûte à l'entreprise.
 *
 * Jamais de valeur par défaut : l'app affichait et enregistrait 45 € et 28 € quand rien n'était saisi,
 * et le bilan des chantiers comptait la main-d'œuvre au taux FACTURÉ (marges sous-estimées).
 */

const nombre = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Taux facturé au client, ou null s'il n'est pas renseigné. */
export const tauxFacture = (personne) => nombre(personne?.tauxHoraire);

/** Coût horaire chargé, ou null s'il n'est pas renseigné. */
export const coutHoraire = (personne) => nombre(personne?.coutHoraireCharge);

/**
 * Coût d'une heure pour le bilan d'un chantier : le coût chargé. Une fiche ancienne qui n'a que le taux
 * facturé garde ce taux (compatibilité : le bilan reste prudent plutôt que de compter zéro).
 */
export const coutPourBilan = (personne) => coutHoraire(personne) ?? tauxFacture(personne) ?? 0;

/**
 * Coût total de pointages (heures × coût chargé de la personne) et heures sans coût connu, pour le dire
 * à l'écran plutôt que d'inventer un taux.
 * @returns {{ montant: number, heuresSansCout: number }}
 */
export function coutDesPointages(pointages = [], equipe = []) {
  const parId = new Map(equipe.map((e) => [e.id, e]));
  return pointages.reduce((acc, p) => {
    const heures = Number(p.heures) || 0;
    const cout = coutHoraire(parId.get(p.employeId));
    if (cout == null) acc.heuresSansCout += heures;
    else acc.montant += heures * cout;
    return acc;
  }, { montant: 0, heuresSansCout: 0 });
}
