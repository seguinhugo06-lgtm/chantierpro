import React, { useState, useEffect, useMemo } from 'react';
import AuditTimeline from './AuditTimeline';
import { getEntityHistory, getEntitiesHistory } from '../../lib/auditService';
import supabase, { isDemo } from '../../supabaseClient';
import { useData } from '../../context/DataContext';

/**
 * ChantierJournal — Activity timeline for a chantier
 * Shows audit entries for the chantier + its linked devis/factures
 *
 * Props:
 *  - chantierId: string
 *  - isDark, couleur, modeDiscret
 */
export default function ChantierJournal({ chantierId, isDark, couleur, modeDiscret }) {
  const { devis } = useData();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Find devis linked to this chantier
  const linkedDevisIds = useMemo(() => {
    return devis
      .filter(d => d.chantier_id === chantierId || d.chantierId === chantierId)
      .map(d => d.id);
  }, [devis, chantierId]);

  useEffect(() => {
    if (!chantierId) return;
    let cancelled = false;
    setIsLoading(true);

    const sb = isDemo ? null : supabase;

    const load = async () => {
      const results = [];

      // Get chantier audit entries
      const chantierEntries = await getEntityHistory(sb, 'chantier', chantierId, { limit: 50 });
      results.push(...chantierEntries);

      // Get linked devis/factures audit entries
      if (linkedDevisIds.length > 0) {
        const devisEntries = await getEntitiesHistory(sb, 'devis', linkedDevisIds, { limit: 50 });
        results.push(...devisEntries);

        const factureEntries = await getEntitiesHistory(sb, 'facture', linkedDevisIds, { limit: 50 });
        results.push(...factureEntries);
      }

      // Sort by date DESC
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (!cancelled) {
        setEntries(results.slice(0, 100));
        setIsLoading(false);
      }
    };

    load().catch(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [chantierId, linkedDevisIds]);

  return (
    <div className="p-4">
      <AuditTimeline
        entries={entries}
        isDark={isDark}
        couleur={couleur}
        modeDiscret={modeDiscret}
        isLoading={isLoading}
        emptyMessage="Aucune activité enregistrée pour ce chantier"
        showEntityBadge={true}
      />
    </div>
  );
}
