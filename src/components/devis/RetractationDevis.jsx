import { Undo2, CalendarClock, Hammer } from 'lucide-react';
import { dateLue } from '../../lib/dates';
import { dateHeureParis, estConcerneParRetractation, finDelaiRetractation, jourParis } from '../../lib/retractation';
import { signatureDuClient } from '../../lib/signatureDocument';

const jourCourt = (jour) => (jour ? dateLue(jour).toLocaleDateString('fr-FR') : '');
const lendemain = (jour) => {
  const d = dateLue(jour);
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('fr-FR');
};
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
 * - Sinon, pour un particulier : la date à partir de laquelle les travaux sont possibles.
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
          {devis.execution_anticipee_le ? ' Les travaux ayant commencé à sa demande expresse, un montant proportionnel aux travaux faits reste dû (art. L221-25).' : ''}
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
  // Fin du délai : signé par le lien, la base sait si l'avis complet a été montré ; signé sur place, l'avis est
  // imprimé sur le devis présenté
  const jourSignature = sig.date ? jourParis(sig.date) : '';
  const fin = jourSignature ? finDelaiRetractation(jourSignature, devis.signature_data ? devis.avis_retractation === true : true) : '';
  if (!fin) return null;
  return (
    <p className="mt-3 flex items-start gap-2 text-sm text-encre-2" data-ui="TravauxPossibles">
      <CalendarClock size={16} className="mt-0.5 flex-shrink-0" />
      <span>Travaux possibles à partir du {lendemain(fin)} (délai de rétractation jusqu'au {jourCourt(fin)} inclus ; le client n'a pas demandé à commencer avant).</span>
    </p>
  );
}
