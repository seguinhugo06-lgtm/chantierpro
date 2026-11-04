import { useState } from 'react';
import { MessageCircle, Phone, BellOff, BellRing } from 'lucide-react';
import { Bouton } from '../ui/Bouton';
import { texteSms, descriptionAppareil } from '../../lib/entretien';
import { lienSms, lienAppel } from '../../lib/ramonage';
import { echeanceLue } from '../ramonage/RappelRamonage';
import { noterRappel } from '../ramonage/actionsRamonage';
import { dateLue } from '../../lib/dates';
import { estClientPro } from '../../lib/relanceUtils';

const jourFr = (jour) => dateLue(String(jour || '').slice(0, 10)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Un rappel d'entretien à faire, comme RappelRamonage : SMS pré-rempli (le toucher marque le rappel comme fait, avec
 * « Annuler »), « Appeler » pour un client professionnel seulement (C. conso. L. 223-1), « Ne plus rappeler ».
 * @param {{ entretien, client, joursRestants }} rappel  élément de rappelsDus() (src/lib/entretien.js)
 */
export default function RappelEntretien({ rappel, entreprise, suivreEntretien, refuserRappels, envoiAutoPrevu = false }) {
  const { entretien, client, joursRestants } = rappel;
  const [fait, setFait] = useState(null);
  const sms = lienSms(client?.telephone, texteSms({ entreprise, entretien }));
  const appel = estClientPro(client) ? lienAppel(client?.telephone) : '';
  // « Rappel noté » seulement après l'écriture : false = échec (message déjà affiché), la carte reste dans son état
  const noter = (canal) => noterRappel(() => suivreEntretien(entretien.id, { rappel_fait_le: new Date().toISOString(), rappel_canal: canal }), () => setFait(canal));
  const annuler = () => noterRappel(() => suivreEntretien(entretien.id, { rappel_fait_le: null, rappel_canal: null }), () => setFait(null));

  return (
    <div data-testid="rappel-entretien" className="rounded-2xl border border-alerte-texte/30 bg-alerte-fond p-4">
      <div className="flex items-start gap-3">
        <BellRing size={20} className="text-alerte-texte flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-encre">Entretien à prévoir avant le {jourFr(entretien.prochain_avant)}</p>
          <p className="text-sm text-encre-2">{descriptionAppareil(entretien)} — {echeanceLue(joursRestants)}</p>
          {envoiAutoPrevu && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(client?.email || '').trim()) && joursRestants >= 0 ? (
            <p className="text-sm text-encre-2 mt-1">Envoi automatique activé : un e-mail de rappel est prévu le matin à {client.email}. Le SMS reste possible.</p>
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
          ) : <p className="text-sm text-encre-2 self-center">Aucun téléphone sur la fiche.</p>}
          {appel ? (
            <a href={appel} onClick={() => noter('appel')} className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-surface border border-bord-fort text-sm font-semibold text-encre">
              <Phone size={18} aria-hidden="true" /> Appeler
            </a>
          ) : null}
          <Bouton variante="discret" taille="compacte" icone={BellOff} onClick={() => refuserRappels(client)}>Ne plus rappeler</Bouton>
        </div>
      )}
    </div>
  );
}
