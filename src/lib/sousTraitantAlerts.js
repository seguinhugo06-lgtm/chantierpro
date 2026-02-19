/**
 * Sous-traitant compliance alerts
 * Checks for expired or soon-to-expire insurance and URSSAF attestations
 */

/**
 * Compute alerts for all sous-traitants
 * @param {Array} sousTraitants - List of sous-traitant members (type === 'sous_traitant')
 * @returns {Array} alerts - [{sousTraitantId, sousTraitantNom, type, severity, message, date}]
 */
export function computeSousTraitantAlerts(sousTraitants = []) {
  const alerts = [];
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

  sousTraitants.forEach(st => {
    const stName = st.entreprise || st.nom || 'Sous-traitant';

    // Decennale insurance check
    if (st.decennale_expiration) {
      const expDate = new Date(st.decennale_expiration);
      if (expDate < now) {
        alerts.push({
          sousTraitantId: st.id,
          sousTraitantNom: stName,
          type: 'decennale_expired',
          severity: 'critical',
          message: `Assurance decennale de ${stName} expiree depuis le ${expDate.toLocaleDateString('fr-FR')}`,
          date: st.decennale_expiration
        });
      } else if (expDate < in30Days) {
        alerts.push({
          sousTraitantId: st.id,
          sousTraitantNom: stName,
          type: 'decennale_expiring',
          severity: 'warning',
          message: `Assurance decennale de ${stName} expire le ${expDate.toLocaleDateString('fr-FR')}`,
          date: st.decennale_expiration
        });
      }
    }

    // URSSAF attestation check (> 6 months old = warning)
    if (st.urssaf_date) {
      const urssafDate = new Date(st.urssaf_date);
      if (urssafDate < sixMonthsAgo) {
        alerts.push({
          sousTraitantId: st.id,
          sousTraitantNom: stName,
          type: 'urssaf_outdated',
          severity: 'warning',
          message: `Attestation URSSAF de ${stName} date de plus de 6 mois (${urssafDate.toLocaleDateString('fr-FR')})`,
          date: st.urssaf_date
        });
      }
    }
  });

  // Sort: critical first, then warning
  return alerts.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    return 0;
  });
}

/**
 * Check if a specific sous-traitant has any alerts
 * @param {Object} st - Sous-traitant object
 * @returns {Object|null} Worst alert or null
 */
export function getSousTraitantWorstAlert(st) {
  const alerts = computeSousTraitantAlerts([st]);
  return alerts.length > 0 ? alerts[0] : null;
}

export default { computeSousTraitantAlerts, getSousTraitantWorstAlert };
