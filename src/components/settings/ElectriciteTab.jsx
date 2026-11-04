import { Zap } from 'lucide-react';
import Carte from '../ui/Carte';
import { Interrupteur } from './RamonageTab';

/** Paramètres › Électricité : allume l'onglet « Électricité » des fiches chantier (lot 4, migration 111). */
export default function ElectriciteTab({ entreprise, setEntreprise }) {
  return (
    <div className="space-y-4" data-testid="reglages-electricite">
      <Carte>
        <div className="flex items-center gap-2 mb-3 text-encre-2">
          <Zap size={18} aria-hidden="true" />
          <h3 className="text-lg font-semibold text-encre">Électricité</h3>
        </div>
        <Interrupteur
          id="electricite-actif"
          actif={!!entreprise?.electriciteActif}
          onChange={(v) => setEntreprise((p) => ({ ...p, electriciteActif: v }))}
          libelle="Je fais des travaux d’électricité"
          description="Ajoute l’onglet « Électricité » aux fiches chantier : le rappel de la demande d’attestation Consuel, et le compte rendu d’intervention et d’autocontrôle en PDF, d’où vous tirez la facture."
        />
        {/* Rappel du risque de D-30, comme Paramètres › Ramonage (relecture du 4 nov., point 7), sans bloquer */}
        <p className="text-sm text-encre-2 mt-3">Client particulier : un devis détaillé est obligatoire avant tout dépannage, toute réparation ou tout entretien (arrêté du 24 janvier 2017, article 4) et, si le contrat est conclu chez lui, aucun paiement ne peut être reçu avant sept jours (code de la consommation, article L. 221-10). Le compte rendu ne fait pas ce devis : faites-le depuis « Devis ».</p>
      </Carte>
    </div>
  );
}
