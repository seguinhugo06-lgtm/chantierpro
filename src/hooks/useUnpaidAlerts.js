import { useMemo } from 'react';

/**
 * Hook to detect and alert on unpaid invoices
 * Critical for Jean-Marc's cash flow management
 *
 * @param {Array} factures - List of invoices from useDevis hook
 * @returns {Object} { alerts, criticalCount, totalUnpaid }
 */
export function useUnpaidAlerts(factures = []) {
  return useMemo(() => {
    const now = new Date();
    const alerts = [];
    let totalUnpaid = 0;

    factures.forEach(facture => {
      // Only process unpaid invoices (factures only, not devis)
      if (facture.type !== 'facture' || facture.statut === 'payee') return;

      // Calculate days overdue
      let joursRetard = 0;
      if (facture.date_echeance) {
        const echeance = new Date(facture.date_echeance);
        joursRetard = Math.floor((now - echeance) / (1000 * 60 * 60 * 24));
      } else if (facture.date) {
        // Default: 30 days payment term from invoice date
        const dateFacture = new Date(facture.date);
        const echeanceDefault = new Date(dateFacture);
        echeanceDefault.setDate(echeanceDefault.getDate() + 30);
        joursRetard = Math.floor((now - echeanceDefault) / (1000 * 60 * 60 * 24));
      }

      // Calculate remaining amount
      const montantRestant = (facture.total_ttc || 0) - (facture.montant_paye || 0);

      if (montantRestant <= 0) return; // Fully paid

      totalUnpaid += montantRestant;

      // Only alert if overdue (joursRetard > 0)
      if (joursRetard > 0) {
        let type = 'medium';
        let urgenceLabel = 'A relancer';

        if (joursRetard > 60) {
          type = 'critical';
          urgenceLabel = 'Contentieux';
        } else if (joursRetard > 30) {
          type = 'critical';
          urgenceLabel = 'Urgent';
        } else if (joursRetard > 15) {
          type = 'high';
          urgenceLabel = 'Important';
        }

        alerts.push({
          id: facture.id,
          type,
          priority: type, // For ActionsList compatibility
          title: `Facture ${facture.numero || 'N/A'} - ${joursRetard}j de retard`,
          description: urgenceLabel,
          amount: montantRestant,
          dueDate: facture.date_echeance
            ? new Date(facture.date_echeance).toLocaleDateString('fr-FR')
            : null,
          joursRetard,
          facture,
          // For ActionsList
          action: 'relance'
        });
      } else if (joursRetard > -7) {
        // Upcoming due (within 7 days)
        alerts.push({
          id: facture.id,
          type: 'low',
          priority: 'low',
          title: `Facture ${facture.numero || 'N/A'} - Echeance proche`,
          description: joursRetard === 0 ? "Echue aujourd'hui" : `Echue dans ${Math.abs(joursRetard)}j`,
          amount: montantRestant,
          dueDate: facture.date_echeance
            ? new Date(facture.date_echeance).toLocaleDateString('fr-FR')
            : null,
          joursRetard,
          facture,
          action: 'rappel'
        });
      }
    });

    // Sort by urgency (critical first, then by days overdue)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => {
      const priorityDiff = priorityOrder[a.type] - priorityOrder[b.type];
      if (priorityDiff !== 0) return priorityDiff;
      return b.joursRetard - a.joursRetard;
    });

    return {
      alerts,
      criticalCount: alerts.filter(a => a.type === 'critical').length,
      highCount: alerts.filter(a => a.type === 'high').length,
      totalCount: alerts.length,
      totalUnpaid
    };
  }, [factures]);
}

/**
 * Get action text for alert type
 */
export function getAlertActionText(alert) {
  if (alert.type === 'critical') {
    return alert.joursRetard > 60
      ? 'Envoyer mise en demeure'
      : 'Relance urgente';
  }
  if (alert.type === 'high') {
    return 'Relancer par telephone';
  }
  if (alert.type === 'medium') {
    return 'Envoyer rappel email';
  }
  return 'Preparer relance';
}

export default useUnpaidAlerts;
