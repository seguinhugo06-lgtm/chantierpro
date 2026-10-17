import { MailCheck, Send } from 'lucide-react';
import { Bouton } from '../ui/Bouton';
import { dateHeureParis, estConcerneParRetractation, jourParis } from '../../lib/retractation';
import { signatureDuClient } from '../../lib/signatureDocument';

/** Mise en production de l'exemplaire envoyé par Mallettico : avant, rien ne partait (texte neutre). */
const DATE_EXEMPLAIRE = '2026-10-17';

/**
 * Fiche d'un devis signé, côté artisan : l'exemplaire signé du client (tâche confirmation-client, migration 090).
 * Signé par le lien : la page du client l'envoie elle-même (notify-signature) ; signé sur place, ou si cet envoi a
 * échoué : l'artisan l'envoie d'ici, à l'adresse de la fiche du client. Pour un particulier, l'exemplaire est dû :
 * hors établissement, sur papier signé par les parties ou, avec son accord, par e-mail, à peine de nullité
 * (C. conso. L221-9, L242-1) ; à distance, la confirmation du contrat avant le début des travaux (L221-13).
 * L'app ne sait pas si un exemplaire papier a été remis : elle dit ce qu'elle sait (rien n'est parti par e-mail).
 * Textes : relecture juriste-btp du 17 oct. 2026.
 */
export default function ExemplaireSigne({ devis, client, onEnvoyer, envoiEnCours = false }) {
  const sig = signatureDuClient(devis || {});
  if (!devis || devis.type === 'facture' || !sig) return null;
  if (devis.exemplaire_client_le) {
    return (
      <p className="mt-3 flex items-start gap-2 text-sm text-encre-2" data-ui="ExemplaireEnvoye">
        <MailCheck size={16} className="mt-0.5 flex-shrink-0" />
        <span>Exemplaire signé envoyé au client par e-mail le {dateHeureParis(devis.exemplaire_client_le)}.</span>
      </p>
    );
  }
  const particulier = estConcerneParRetractation({ doc: devis, client });
  const surPlace = !!devis.signature && !devis.signature_data;
  const ancien = sig.date && jourParis(sig.date) < DATE_EXEMPLAIRE;
  const adresse = String(client?.email || '').trim();

  let texte;
  let alerte = false;
  if (!particulier || ancien) {
    texte = ancien
      ? 'Aucun exemplaire signé n\'a été envoyé au client depuis Mallettico.'
      : 'Aucun exemplaire signé n\'a été envoyé au client par e-mail.';
  } else if (surPlace) {
    alerte = true;
    texte = [
      'Signé chez le client : remettez-lui dès maintenant son exemplaire daté du devis signé, sur papier signé par vous deux, ou, s\'il l\'accepte, par e-mail. Sans cet exemplaire, le contrat est nul (articles L221-9 et L242-1 du Code de la consommation).',
      devis.execution_anticipee_le ? 'Sa demande de commencer avant la fin du délai de rétractation doit figurer sur cet exemplaire : ne commencez pas les travaux avant de le lui avoir remis (article L221-25).' : '',
      adresse ? '' : 'Pour le lui envoyer par e-mail, ajoutez son adresse à sa fiche.',
    ].filter(Boolean).join(' ');
  } else {
    alerte = true;
    texte = [
      'L\'exemplaire signé n\'a pas été envoyé au client. Envoyez-le-lui sans attendre, et au plus tard avant de commencer les travaux : la confirmation du contrat, avec le formulaire de rétractation, lui est due sur papier ou par e-mail (article L221-13 du Code de la consommation).',
      adresse ? '' : 'Ajoutez son adresse à sa fiche pour le lui envoyer d\'ici.',
    ].filter(Boolean).join(' ');
  }

  return (
    <div
      className={`mt-3 text-sm ${alerte ? 'rounded-xl border border-bord bg-alerte-fond p-3 text-alerte-texte' : 'text-encre-2'}`}
      role={alerte ? 'alert' : undefined}
      data-ui="ExemplaireAEnvoyer"
    >
      <p>{texte}</p>
      {adresse && onEnvoyer && (
        <Bouton taille="compacte" icone={Send} chargement={envoiEnCours} onClick={onEnvoyer} className="mt-2" data-ui="EnvoyerExemplaire">
          Envoyer son exemplaire par e-mail
        </Bouton>
      )}
    </div>
  );
}
