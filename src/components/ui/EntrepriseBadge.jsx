/**
 * EntrepriseBadge.jsx — Compact badge showing entreprise initiales
 *
 * Used in listing rows when viewing "Toutes" to identify which
 * entreprise a document belongs to.
 */

import React, { memo } from 'react';
import { useEntreprise } from '../../context/EntrepriseContext';

const EntrepriseBadge = memo(function EntrepriseBadge({
  entrepriseId,
  className = '',
}) {
  const { entreprises } = useEntreprise();

  if (!entrepriseId) return null;

  const ent = entreprises.find(e => e.id === entrepriseId);
  if (!ent) return null;

  const initiales = ent.initiales || (ent.nom || '').slice(0, 2).toUpperCase();
  const couleur = ent.couleur || '#94a3b8';

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${className}`}
      style={{
        background: couleur + '15',
        color: couleur,
      }}
      title={ent.nom}
    >
      {initiales}
    </span>
  );
});

export default EntrepriseBadge;
