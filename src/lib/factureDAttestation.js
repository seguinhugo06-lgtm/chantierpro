/**
 * Facture tirée d'une attestation, ramonage ou entretien : ce que l'app dit à l'artisan juste après l'avoir créée. Les
 * deux fiches (src/components/ramonage/FicheAttestation.jsx et src/components/entretien/FicheEntretien.jsx) emploient
 * ce module : le même texte, à la même condition, dans les deux.
 */
import { estClientParticulier } from './retractation';

/**
 * Rappel des sept jours (C. conso. L221-10) : texte de juriste-btp, avis du lot 4 du 5 nov. 2026, point 11, mot pour mot.
 * Une facture tirée d'une attestation n'est pas tirée d'un devis : le mécanisme « Paiement au plus tôt le … » de
 * src/lib/retractation.js ne joue pas, et rien d'autre ne dit à l'artisan de ne pas demander le paiement.
 */
export const AVERTISSEMENT_SEPT_JOURS = 'Client particulier : si le contrat a été conclu chez lui (devis signé ou accord donné sur place), vous ne pouvez recevoir aucun paiement ni aucune contrepartie avant sept jours à compter de sa conclusion (code de la consommation, article L. 221-10), sauf travaux d’entretien ou de réparation urgents qu’il a expressément demandés, dans la limite des pièces de rechange et travaux strictement nécessaires pour répondre à l’urgence. La facture peut être émise, mais n’en demandez pas le paiement avant cette date.';

/** Durée de l'avertissement : de quoi le lire (comme le message de l'émission hors ligne, DevisPage). */
export const DUREE_AVERTISSEMENT_MS = 10000;

export const MESSAGE_LIEN_NON_ENREGISTRE = 'La facture est créée, mais son lien avec l’attestation n’a pas été enregistré.';

/**
 * Le message à afficher juste après la création de la facture tirée d'une attestation, ou null.
 *   - le lien de l'attestation vers la facture n'a pas été enregistré (`lie === false`) : l'erreur, plus grave, garde la
 *     place (une seule notification à la fois) ;
 *   - sinon, pour un client particulier : le rappel des sept jours, sans bloquer, assez longtemps pour être lu ;
 *   - sinon rien (professionnel, copropriété : pas de contrat de consommation).
 * `lie` est le retour de l'écriture du lien de l'attestation vers la facture (false : refusée).
 * @returns {null | { texte: string, type: 'error' | 'warning', duree?: number }}
 */
export function messageApresFacture({ client, lie } = {}) {
  if (lie === false) return { texte: MESSAGE_LIEN_NON_ENREGISTRE, type: 'error' };
  if (!estClientParticulier(client)) return null;
  return { texte: AVERTISSEMENT_SEPT_JOURS, type: 'warning', duree: DUREE_AVERTISSEMENT_MS };
}
