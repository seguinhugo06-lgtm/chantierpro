import { FlaskConical } from 'lucide-react';
import { LIBELLE_DONNEES_FICTIVES } from '../../lib/donneesFictives';

/**
 * Bandeau « Données fictives — démonstration » d'un compte de démonstration (D-26) : sur les écrans de
 * l'app et sur les pages publiques (signature, paiement). Les documents portent le filigrane « EXEMPLE ».
 */
export default function BandeauDonneesFictives({ className = '' }) {
  return (
    <div
      role="note"
      data-ui="BandeauDonneesFictives"
      className={`pointer-events-none select-none inline-flex items-center gap-1.5 rounded-full border border-alerte-point/50 bg-alerte-fond px-3 py-0.5 text-xs font-semibold text-alerte-texte shadow-e1 whitespace-nowrap ${className}`}
    >
      <FlaskConical size={12} aria-hidden="true" />
      {LIBELLE_DONNEES_FICTIVES}
    </div>
  );
}
