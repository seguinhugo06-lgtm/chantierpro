import { useEffect, useState } from 'react';
import { Bug, Lightbulb, MessageCircle, CheckCircle } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import Pastille from '../ui/Pastille';
import { Bouton } from '../ui/Bouton';
import { envoyerRetour, listerMesRetours, TYPES_RETOUR, STATUTS_RETOUR } from '../../services/retoursService';
import { dateLue } from '../../lib/dates';

const ICONES = { bug: Bug, idee: Lightbulb, autre: MessageCircle };
const AIDE = {
  bug: 'Qu’avez-vous fait, que s’est-il passé, qu’attendiez-vous ?',
  idee: 'Qu’est-ce qui vous ferait gagner du temps sur vos devis, factures ou chantiers ?',
  autre: 'Votre message',
};
// Un statut = un mot et un ton (src/lib/statuts.js) : envoyé et refusé neutres, lu « chez Hugo » (info), en cours à
// surveiller (alerte), fait acquis (succès)
const TONS_STATUT = { nouveau: 'neutre', lu: 'info', en_cours: 'alerte', fait: 'succes', refuse: 'neutre' };

/**
 * « Un bug ? Une idée ? » — envoi d'un retour et suivi de ses retours (statut, réponse).
 */
export default function RetourModal({ isOpen, onClose, isDark, couleur: _couleur, showToast, page, user, orgId }) {
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [mesRetours, setMesRetours] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    let annule = false;
    listerMesRetours().then(({ data }) => { if (!annule) setMesRetours(data || []); });
    return () => { annule = true; };
  }, [isOpen]);

  const textMuted = 'text-encre-2';
  const textPrimary = 'text-encre';
  const inputBg = 'bg-surface border-bord-fort text-encre placeholder:text-encre-3';

  const envoyer = async () => {
    setErreur('');
    setEnCours(true);
    const { data, error } = await envoyerRetour({ type, message, page, organizationId: orgId, email: user?.email });
    setEnCours(false);
    if (error) { setErreur(error); return; }
    setMesRetours((liste) => [data, ...liste]);
    setMessage('');
    showToast?.('Merci ! Votre message est bien arrivé.', 'success');
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !enCours && onClose()} size="md" isDark={isDark}>
      <ModalHeader>
        <ModalTitle>Un bug ? Une idée ?</ModalTitle>
        <ModalDescription>Votre message arrive directement chez le créateur de Mallettico, qui vous répond ici.</ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-4">
        <div role="radiogroup" aria-label="Type de retour" className="grid grid-cols-3 gap-2">
          {Object.entries(TYPES_RETOUR).map(([cle, libelle]) => {
            const Icone = ICONES[cle];
            const actif = type === cle;
            return (
              <button
                key={cle}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => setType(cle)}
                className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-sm font-medium transition-colors ${actif ? 'border-accent bg-accent/10 text-accent-texte font-semibold' : 'border-bord text-encre-2 hover:bg-surface-2'}`}
              >
                <Icone size={18} />
                {libelle}
              </button>
            );
          })}
        </div>
        <label className={`block text-sm ${textPrimary}`}>
          {AIDE[type]}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={5000}
            className={`mt-1.5 w-full px-3 py-2.5 rounded-xl border resize-y ${inputBg}`}
            aria-label="Votre message"
            disabled={enCours}
          />
        </label>
        <p className={`text-xs ${textMuted}`}>La page ouverte et le type d’appareil sont joints pour aider à comprendre. Rien d’autre.</p>
        {erreur && (
          <div role="alert" className="p-3 rounded-xl border border-danger-texte/20 bg-danger-fond text-danger-texte text-sm">{erreur}</div>
        )}

        {mesRetours.length > 0 && (
          <div className={`pt-3 border-t border-bord`}>
            <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>Vos derniers retours</h3>
            <ul className="space-y-2">
              {mesRetours.slice(0, 5).map((r) => (
                <li key={r.id} className={`p-3 rounded-xl text-sm bg-fond`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-xs ${textMuted}`}>
                      {TYPES_RETOUR[r.type] || r.type} · {dateLue(r.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <Pastille ton={TONS_STATUT[r.statut] || 'neutre'}>
                      {STATUTS_RETOUR[r.statut] || r.statut}
                    </Pastille>
                  </div>
                  <p className={`${textPrimary} line-clamp-2 whitespace-pre-line`}>{r.message}</p>
                  {r.reponse && (
                    <p className={`mt-2 pl-3 border-l-2 border-accent text-sm whitespace-pre-line ${textMuted}`}>
                      <CheckCircle size={13} className="inline mr-1 -mt-0.5 text-accent-texte" />
                      {r.reponse}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ModalBody>
      <ModalFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Bouton variante="discret" onClick={onClose} disabled={enCours}>
          Fermer
        </Bouton>
        <Bouton variante="principal" onClick={envoyer} disabled={message.trim().length < 3} chargement={enCours}>
          {enCours ? 'Envoi…' : 'Envoyer'}
        </Bouton>
      </ModalFooter>
    </Modal>
  );
}
