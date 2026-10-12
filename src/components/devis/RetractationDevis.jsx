import { Undo2, CalendarClock, Hammer } from 'lucide-react';
import { dateLue } from '../../lib/dates';
import { dateHeureParis, delaiRetractationDevis, estConcerneParRetractation } from '../../lib/retractation';
import { signatureDuClient } from '../../lib/signatureDocument';

const jourCourt = (jour) => (jour ? dateLue(jour).toLocaleDateString('fr-FR') : '');
const plusQuatorzeJours = (instant) => {
  const d = new Date(instant);
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString('fr-FR');
};

/**
 * Fiche du devis, côté artisan : la rétractation du client (C. conso. L221-18 à L221-28), en trois cas.
 * - Rétractation reçue en ligne (D221-5) : quand, par qui, l'accusé, et ce qu'il doit faire (rembourser sous
 *   14 jours, L221-24 ; avoir).
 * - Demande expresse de commencer avant la fin du délai (L221-25) : recueillie, avec sa date.
 * - Sinon, pour un particulier : la fin du délai (prolongé sans l'avis complet, L221-20) et ce qu'elle implique.
 * Textes : relecture juriste-btp du 12 oct. 2026.
 */
export default function RetractationDevis({ devis, client }) {
  if (!devis || devis.type === 'facture') return null;
  if (devis.retractation_le) {
    return (
      <div className="mt-4 rounded-xl border border-bord bg-danger-fond p-3 text-sm text-danger-texte" role="status" data-ui="RetractationRecue">
        <p className="flex items-center gap-2 font-semibold"><Undo2 size={16} /> Rétractation reçue le {dateHeureParis(devis.retractation_le)}</p>
        <p className="mt-1">
          {devis.retractation_nom || 'Le client'} a renoncé au contrat en ligne. Remboursez les sommes reçues au plus tard le{' '}
          <strong>{plusQuatorzeJours(devis.retractation_le)}</strong>, par le même moyen de paiement (art. L221-24 du Code de la consommation),
          et annulez par un avoir toute facture émise.
          {devis.execution_anticipee_le ? ' Le client avait demandé que les travaux commencent avant la fin du délai : seuls les travaux réellement exécutés jusqu\'à sa rétractation peuvent lui être facturés, au prorata du prix total (art. L221-25).' : ''}
        </p>
        <p className="mt-1 text-encre-2">
          {devis.retractation_accuse_le
            ? `Accusé de réception envoyé à ${devis.retractation_email}.`
            : `Accusé de réception pas encore envoyé (adresse donnée : ${devis.retractation_email || 'aucune'}).`}
        </p>
      </div>
    );
  }
  const sig = signatureDuClient(devis);
  if (!sig || !estConcerneParRetractation({ doc: devis, client })) return null;
  if (devis.execution_anticipee_le) {
    return (
      <p className="mt-3 flex items-start gap-2 text-sm text-encre-2" data-ui="DemandeExpresseRecue">
        <Hammer size={16} className="mt-0.5 flex-shrink-0" />
        <span>Le client a demandé que les travaux commencent avant la fin du délai de rétractation (demande expresse du {dateHeureParis(devis.execution_anticipee_le)}).</span>
      </p>
    );
  }
  const delai = delaiRetractationDevis(devis, sig.date);
  if (!delai?.fin) return null;
  return (
    <p className="mt-3 flex items-start gap-2 text-sm text-encre-2" data-ui="DelaiRetractation">
      <CalendarClock size={16} className="mt-0.5 flex-shrink-0" />
      <span>
        Délai de rétractation jusqu'au {jourCourt(delai.fin)} inclus{delai.prolonge ? ' (prolongé de 12 mois : avis complet non remis, art. L221-20)' : ''}.
        {' '}Le client n'a pas demandé à commencer avant : des travaux faits avant cette date ne lui seraient pas dus s'il se rétracte (art. L221-25).
      </span>
    </p>
  );
}
