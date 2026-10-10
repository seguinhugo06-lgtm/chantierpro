import { useEffect, useState } from 'react';
import { Bug, Lightbulb, MessageCircle, Loader2, CheckCircle } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import { envoyerRetour, listerMesRetours, TYPES_RETOUR, STATUTS_RETOUR } from '../../services/retoursService';
import { dateLue } from '../../lib/dates';

const ICONES = { bug: Bug, idee: Lightbulb, autre: MessageCircle };
const AIDE = {
  bug: 'Qu’avez-vous fait, que s’est-il passé, qu’attendiez-vous ?',
  idee: 'Qu’est-ce qui vous ferait gagner du temps sur vos devis, factures ou chantiers ?',
  autre: 'Votre message',
};
const COULEURS_STATUT = {
  nouveau: 'bg-slate-100 text-slate-700',
  lu: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-amber-100 text-amber-800',
  fait: 'bg-emerald-100 text-emerald-700',
  refuse: 'bg-slate-200 text-slate-600',
};

/**
 * « Un bug ? Une idée ? » — envoi d'un retour et suivi de ses retours (statut, réponse).
 */
export default function RetourModal({ isOpen, onClose, isDark, couleur = '#f97316', showToast, page, user, orgId }) {
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

  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';

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
                className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-sm font-medium transition-colors ${actif ? 'text-white border-transparent' : isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                style={actif ? { background: couleur } : undefined}
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
          <div role="alert" className={`p-3 rounded-xl border text-sm ${isDark ? 'bg-red-900/30 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>{erreur}</div>
        )}

        {mesRetours.length > 0 && (
          <div className={`pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>Vos derniers retours</h3>
            <ul className="space-y-2">
              {mesRetours.slice(0, 5).map((r) => (
                <li key={r.id} className={`p-3 rounded-xl text-sm ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-xs ${textMuted}`}>
                      {TYPES_RETOUR[r.type] || r.type} · {dateLue(r.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${COULEURS_STATUT[r.statut] || COULEURS_STATUT.nouveau}`}>
                      {STATUTS_RETOUR[r.statut] || r.statut}
                    </span>
                  </div>
                  <p className={`${textPrimary} line-clamp-2 whitespace-pre-line`}>{r.message}</p>
                  {r.reponse && (
                    <p className={`mt-2 pl-3 border-l-2 text-sm whitespace-pre-line ${textMuted}`} style={{ borderColor: couleur }}>
                      <CheckCircle size={13} className="inline mr-1 -mt-0.5" style={{ color: couleur }} />
                      {r.reponse}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={onClose} disabled={enCours} className={`px-4 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
          Fermer
        </button>
        <button
          type="button"
          onClick={envoyer}
          disabled={enCours || message.trim().length < 3}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ background: couleur }}
        >
          {enCours && <Loader2 size={16} className="animate-spin" />}
          {enCours ? 'Envoi…' : 'Envoyer'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
