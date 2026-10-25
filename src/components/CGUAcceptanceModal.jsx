/**
 * CGUAcceptanceModal — acceptation des conditions générales d'utilisation (LEGAL-001).
 *
 * Les CGU s'acceptent à l'inscription, par une case (App.jsx, décision du 25 oct. 2026). Cette fenêtre reste pour :
 * - un compte créé avant la case, au premier document (garde unique de DataContext, `exigerCgu`) ;
 * - une nouvelle version des CGU.
 * L'acceptation est enregistrée dans les métadonnées du compte de l'utilisateur (cgu_version, cgu_accepted_at) : un
 * membre invité accepte pour lui-même. Tant qu'elle ne l'est pas, la fenêtre reste ouverte et dit pourquoi.
 * Avant (retour d'Hugo sur « Au Bon Volt », 21-23 oct. 2026), elle surgissait au premier réglage enregistré.
 * Elle affiche le texte de la page /cgu (TexteCgu) : un seul texte sous une version (avant le 25 oct. 2026, un autre).
 */

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';
import { Bouton } from './ui/Bouton';

import { CGU_VERSION, CGU_VERSION_DATE } from '../lib/cgu';
import TexteCgu from './legal/TexteCgu';

/**
 * @param {(version: string) => Promise<true|string>} onAccept  enregistre l'acceptation ; sinon, le message qui dit pourquoi
 * @param {() => void} onAnnuler  l'artisan renonce au geste (le document n'est pas créé)
 * @param {'premier'|'version'} [motif]  compte d'avant la case de l'inscription, ou nouvelle version des conditions
 * @param {'document'|'envois'} [geste]  ce qui demande les conditions : un document (devis, facture, attestation) ou
 *   l'activation des envois automatiques (rappels de ramonage, relances) — la fenêtre dit la bonne raison
 */
export default function CGUAcceptanceModal({ onAccept, onAnnuler, motif = 'premier', geste = 'document' }) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [erreur, setErreur] = useState('');
  const scrollRef = useRef(null);

  // La case ne s'active qu'une fois le texte lu jusqu'au bout
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) setHasScrolledToEnd(true);
  };

  // Texte assez court pour tenir sans défiler (grand écran) : la case est active d'emblée
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 40) {
      setHasScrolledToEnd(true);
    }
  }, []);

  const handleAccept = async () => {
    if (!checked || isAccepting) return;
    setIsAccepting(true);
    setErreur('');
    try {
      const enregistree = await onAccept(CGU_VERSION);
      if (enregistree !== true) setErreur(typeof enregistree === 'string' ? enregistree : 'Acceptation non enregistrée. Vérifiez votre connexion, puis réessayez.');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Modal isOpen onClose={() => { if (!isAccepting) onAnnuler?.(); }} size="lg" closeOnBackdrop={false}>
      <ModalHeader>
        <ModalTitle>Conditions générales d'utilisation</ModalTitle>
        <ModalDescription>
          {motif === 'version'
            ? `Les conditions d'utilisation ont changé (version du ${CGU_VERSION_DATE}). Lisez-les et acceptez-les pour ${geste === 'envois' ? 'activer les envois automatiques' : 'continuer à créer des documents'}. Vos données et vos documents restent accessibles et exportables, que vous acceptiez ou non.`
            : geste === 'envois'
              ? 'Avant d’activer les envois automatiques, lisez et acceptez les conditions d’utilisation de Mallettico.'
              : 'Avant votre premier document, lisez et acceptez les conditions d’utilisation de Mallettico.'}
        </ModalDescription>
      </ModalHeader>

      <ModalBody ref={scrollRef} onScroll={handleScroll} className="text-sm">
        {/* Le texte même de la page /cgu (avis juriste du 24 oct. 2026, H1) : on accepte ce qu'on peut relire ensuite */}
        <TexteCgu compact />
      </ModalBody>

      {!hasScrolledToEnd && (
        <div className="flex items-center justify-center gap-1 py-2 text-xs text-encre-3 border-t border-bord">
          <ChevronDown size={14} className="animate-bounce" aria-hidden="true" />
          Faites défiler pour lire la suite
        </div>
      )}

      <ModalFooter className="flex-col !items-stretch gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <label className={`flex items-start gap-3 cursor-pointer ${!hasScrolledToEnd ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            disabled={!hasScrolledToEnd}
            className="mt-0.5 w-5 h-5 rounded border-bord-fort accent-accent flex-shrink-0"
          />
          <span className="text-sm text-encre">
            J'ai lu et j'accepte les <strong>Conditions Générales d'Utilisation</strong> de Mallettico (version du {CGU_VERSION_DATE})
          </span>
        </label>
        {erreur && <p role="alert" className="text-sm font-medium text-danger-texte">{erreur}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Bouton variante="discret" onClick={onAnnuler} disabled={isAccepting}>Annuler</Bouton>
          <Bouton variante="principal" icone={Check} onClick={handleAccept} disabled={!checked} chargement={isAccepting}>
            {isAccepting ? 'Enregistrement…' : 'Accepter et continuer'}
          </Bouton>
        </div>
      </ModalFooter>
    </Modal>
  );
}

export { CGU_VERSION, CGU_VERSION_DATE };
