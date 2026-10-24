import { useEffect, useMemo, useState } from 'react';
import { Mail, MessageCircle, Smartphone, Check } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton } from '../ui/Bouton';
import { formatClientName } from '../../lib/formatters';

const estTelephone = () => typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

/**
 * Feuille « Relancer » (audit UX du 20 oct. 2026, P1) : avant, « Relancer » envoyait un e-mail en un seul toucher,
 * sans dire à qui ni par quel canal, et le message suivant (« Échange ajouté ») cachait l'envoi. Ici : le canal et le
 * destinataire, l'aperçu du message tel qu'il partira, puis un seul bouton.
 *
 * @param {object|null} doc devis ou facture à relancer (null : fermée)
 * @param {object} [client]
 * @param {(canal: 'email'|'sms'|'whatsapp') => { objet?: string, texte: string }} apercu
 * @param {(canal: 'email'|'sms'|'whatsapp') => Promise<void>|void} onEnvoyer
 * @param {Function} onFermer
 */
export default function FeuilleRelance({ doc, client, apercu, onEnvoyer, onFermer }) {
  const email = (client?.email || '').trim();
  const tel = (client?.telephone || client?.tel || '').trim();
  const smsPossible = !!tel && estTelephone();
  const canalParDefaut = email ? 'email' : tel ? 'whatsapp' : 'email';
  const [canal, setCanal] = useState(canalParDefaut);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (doc) { setCanal(canalParDefaut); setEnCours(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  const message = useMemo(() => (doc ? apercu(canal) : null), [doc, canal, apercu]);
  if (!doc) return null;

  const nom = formatClientName(client, '') || doc.client_nom || 'le client';
  const canaux = [
    { cle: 'email', icone: Mail, libelle: 'E-mail', detail: email || 'adresse demandée à l’envoi' },
    { cle: 'sms', icone: Smartphone, libelle: 'SMS', detail: !tel ? 'pas de téléphone sur la fiche' : smsPossible ? tel : 'depuis un téléphone seulement', desactive: !smsPossible },
    { cle: 'whatsapp', icone: MessageCircle, libelle: 'WhatsApp', detail: tel || 'pas de téléphone sur la fiche', desactive: !tel },
  ];
  const libelleBouton = canal === 'email' ? 'Envoyer la relance' : canal === 'sms' ? 'Préparer le SMS' : 'Préparer dans WhatsApp';

  const envoyer = async () => {
    if (enCours) return;
    setEnCours(true);
    try {
      await onEnvoyer(canal);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Modal isOpen={!!doc} onClose={onFermer} size="md" closeOnBackdrop={!enCours} closeOnEscape={!enCours}>
      <ModalHeader>
        <ModalTitle>Relancer {nom}</ModalTitle>
        <ModalDescription>{doc.type === 'facture' ? 'Facture' : 'Devis'} {doc.numero}</ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-encre-2">Par</legend>
          <div role="radiogroup" aria-label="Canal de la relance" className="rounded-xl border border-bord overflow-hidden divide-y divide-bord">
            {canaux.map(({ cle, icone: Icone, libelle, detail, desactive }) => {
              const oui = canal === cle;
              return (
                <button
                  key={cle} type="button" role="radio" aria-checked={oui} disabled={desactive}
                  onClick={() => setCanal(cle)}
                  className="w-full min-h-[56px] flex items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-surface-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Icone size={18} aria-hidden="true" className={oui ? 'text-encre' : 'text-encre-3'} />
                  <span className="flex-1 min-w-0">
                    <span className={`block text-base sm:text-sm text-encre ${oui ? 'font-semibold' : ''}`}>{libelle}</span>
                    <span className="block truncate text-sm text-encre-3">{detail}</span>
                  </span>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${oui ? 'bg-accent border-accent' : 'border-bord-fort'}`} aria-hidden="true">
                    {oui ? <Check size={12} strokeWidth={3.5} className="text-sur-accent" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {message ? (
          <section aria-label="Aperçu du message">
            <p className="mb-2 text-sm font-medium text-encre-2">Message</p>
            <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-encre whitespace-pre-line break-words">
              {message.objet ? <p className="mb-2 font-semibold">Objet : {message.objet}</p> : null}
              {message.texte}
            </div>
            <p className="mt-2 text-sm text-encre-3">
              {canal === 'email'
                ? `Le ${doc.type === 'facture' ? 'PDF de la facture' : 'PDF du devis'} est joint.`
                : canal === 'sms' ? 'Le message s’ouvre dans vos SMS : vous l’envoyez de là.' : 'Le message s’ouvre dans WhatsApp : vous l’envoyez de là.'}
            </p>
          </section>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Bouton variante="discret" onClick={onFermer} disabled={enCours}>Annuler</Bouton>
        <Bouton variante="principal" icone={canal === 'email' ? Mail : MessageCircle} onClick={envoyer} chargement={enCours}>{libelleBouton}</Bouton>
      </ModalFooter>
    </Modal>
  );
}
