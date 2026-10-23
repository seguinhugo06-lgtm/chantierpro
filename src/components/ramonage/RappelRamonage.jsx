import { useState } from 'react';
import { MessageCircle, Phone, BellOff, BellRing } from 'lucide-react';
import { Bouton } from '../ui/Bouton';
import { texteSms, lienSms, lienAppel, descriptionAppareil } from '../../lib/ramonage';
import { dateLue } from '../../lib/dates';

const jourFr = (jour) => dateLue(String(jour || '').slice(0, 10)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** « dans 26 jours » / « aujourd'hui » / « dépassé de 5 jours » */
export function echeanceLue(joursRestants) {
  if (joursRestants === 0) return 'aujourd’hui';
  if (joursRestants > 0) return `dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`;
  return `dépassé de ${-joursRestants} jour${joursRestants < -1 ? 's' : ''}`;
}

/**
 * Un rappel de ramonage à faire : SMS pré-rempli et appel depuis le téléphone (l'app ne sait pas si le SMS est parti :
 * le toucher marque le rappel comme fait, avec « Annuler »), ou « Ne plus rappeler » (refus du client, CPCE L. 34-5).
 * @param {{ ramonage, client, joursRestants }} rappel  élément de rappelsDus()
 */
export default function RappelRamonage({ rappel, entreprise, suivreRamonage, refuserRappels, envoiAutoPrevu = false }) {
  const { ramonage, client, joursRestants } = rappel;
  const [fait, setFait] = useState(null); // canal noté à l'instant, pour « Annuler »
  const sms = lienSms(client?.telephone, texteSms({ entreprise, ramonage }));
  const appel = lienAppel(client?.telephone);

  const noter = (canal) => {
    setFait(canal);
    suivreRamonage(ramonage.id, { rappel_fait_le: new Date().toISOString(), rappel_canal: canal });
  };
  const annuler = () => {
    setFait(null);
    suivreRamonage(ramonage.id, { rappel_fait_le: null, rappel_canal: null });
  };

  return (
    <div data-testid="rappel-ramonage" className="rounded-2xl border border-alerte-texte/30 bg-alerte-fond p-4">
      <div className="flex items-start gap-3">
        <BellRing size={20} className="text-alerte-texte flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-encre">Ramonage à prévoir avant le {jourFr(ramonage.prochain_avant)}</p>
          <p className="text-sm text-encre-2">{descriptionAppareil(ramonage)} — {echeanceLue(joursRestants)}</p>
          {envoiAutoPrevu && client?.email && joursRestants >= 0 ? (
            <p className="text-sm text-encre-2 mt-1">L’e-mail de rappel automatique part le matin à {client.email}.</p>
          ) : null}
        </div>
      </div>
      {fait ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm text-encre" role="status">Rappel noté ({fait === 'sms' ? 'SMS' : 'appel'}).</p>
          <Bouton variante="discret" taille="compacte" onClick={annuler}>Annuler</Bouton>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {sms ? (
            <a href={sms} onClick={() => noter('sms')} className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-surface border border-bord-fort text-sm font-semibold text-encre">
              <MessageCircle size={18} aria-hidden="true" /> SMS
            </a>
          ) : null}
          {appel ? (
            <a href={appel} onClick={() => noter('appel')} className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-surface border border-bord-fort text-sm font-semibold text-encre">
              <Phone size={18} aria-hidden="true" /> Appeler
            </a>
          ) : (
            <p className="text-sm text-encre-2 self-center">Aucun téléphone sur la fiche.</p>
          )}
          <Bouton variante="discret" taille="compacte" icone={BellOff} onClick={() => refuserRappels(client)}>Ne plus rappeler</Bouton>
        </div>
      )}
    </div>
  );
}
