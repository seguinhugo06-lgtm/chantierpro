import { useState } from 'react';
import { Undo2, CalendarClock, Hammer, Send } from 'lucide-react';
import { supabase, isDemo } from '../../supabaseClient';
import { messageErreurFonction } from '../../lib/emailSender';
import { captureException } from '../../lib/sentry';
import { Bouton } from '../ui/Bouton';
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
  if (devis.retractation_le) return <RetractationRecue devis={devis} />;
  return <DelaiOuDemande devis={devis} client={client} />;
}

/**
 * Accusé pas encore parti (la page du client s'est fermée avant l'envoi) : le serveur réessaie toutes les 10 minutes
 * (migration 089), et l'artisan peut l'envoyer lui-même (D221-5 : « dans un délai raisonnable »). La fonction
 * n'envoie jamais un second accusé (tâche accuse-serveur).
 */
function RetractationRecue({ devis }) {
  const [envoi, setEnvoi] = useState({ etat: '', message: '' });
  const envoye = devis.retractation_accuse_le || envoi.etat === 'ok';
  // Les essais automatiques (migration 089) s'étalent sur environ 7 heures après la rétractation ; ensuite, l'accusé
  // ne partira plus seul : l'artisan doit l'envoyer (textes juriste-btp du 17 oct. 2026, D221-5)
  const relancesEnCours = Date.now() - new Date(devis.retractation_le).getTime() < 7 * 3600e3;
  const adresse = devis.retractation_email || 'aucune';
  const envoyerAccuse = async () => {
    setEnvoi({ etat: 'envoi', message: '' });
    try {
      const { data, error } = await supabase.functions.invoke('notify-signature', { body: { token: devis.signature_token, evenement: 'retractation' } });
      if (error) throw new Error(await messageErreurFonction(error));
      if (data?.en_cours) { setEnvoi({ etat: 'en_cours', message: '' }); return; }
      if (!data?.success) throw new Error(data?.error || 'accusé non envoyé');
      setEnvoi({ etat: 'ok', message: '' });
    } catch (e) {
      captureException(e, { context: 'accusé de rétractation envoyé par l\'artisan' });
      setEnvoi({ etat: 'erreur', message: e?.message || 'accusé non envoyé' });
    }
  };
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
        {envoye
          ? `Accusé de réception envoyé à ${devis.retractation_email}.`
          : relancesEnCours
            ? `Accusé de réception pas encore envoyé (adresse donnée : ${adresse}). Mallettico réessaie automatiquement pendant quelques heures ; vous pouvez aussi l'envoyer vous-même.`
            : `Accusé de réception non envoyé (adresse donnée : ${adresse}) : les envois automatiques n'ont pas abouti. Envoyez-le avec le bouton ci-dessous ; en cas d'échec, envoyez-le sans attendre depuis votre messagerie ou par courrier, en reprenant le nom du client, le devis, l'adresse indiquée et la date et l'heure de sa déclaration (${dateHeureParis(devis.retractation_le)}) (article D221-5 du Code de la consommation).`}
      </p>
      {!envoye && devis.signature_token && !isDemo && supabase && (
        <div className="mt-2">
          <Bouton taille="compacte" icone={Send} chargement={envoi.etat === 'envoi'} onClick={envoyerAccuse} data-ui="EnvoyerAccuse">
            Envoyer l'accusé
          </Bouton>
          {envoi.etat === 'en_cours' && <p role="status" className="mt-1 text-encre">Envoi de l'accusé en cours. Dans une minute, rouvrez la fiche : si elle n'indique pas « Accusé de réception envoyé », envoyez-le vous-même depuis votre messagerie ou par courrier (article D221-5 du Code de la consommation).</p>}
          {envoi.etat === 'erreur' && <p role="alert" className="mt-1 text-encre">Accusé non envoyé : {envoi.message}. Envoyez-le sans attendre depuis votre messagerie ou par courrier.</p>}
        </div>
      )}
    </div>
  );
}

function DelaiOuDemande({ devis, client }) {
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
