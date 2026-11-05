import { useEffect, useState } from 'react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton } from '../ui/Bouton';
import { MODES_REMISE } from '../../lib/remiseDevis';

/**
 * 2e fenêtre de « Faire signer » sur un brouillon (src/lib/remiseDevis.js) : l'artisan dit si le client a reçu le devis et
 * comment, « Imprimé et remis » ou « Envoyé par e-mail ou par message » (preuve de la remise, C. conso. L221-7). Aucun
 * choix par défaut : le bouton « Devis remis au client » reste éteint tant que le mode n'est pas choisi. « Pas encore »,
 * la croix, Échap ou un clic à côté : rien n'est enregistré.
 * Textes : avis juriste-btp du 5 nov. 2026, point 7 (`TEXTES_REMISE.apres`).
 *
 * @param {{ ouvert: boolean, textes: { title: string, message: string, confirmText: string, cancelText: string }, onRepondre: (mode: string|null) => void, isDark?: boolean }} props
 */
export default function RemiseDevisModal({ ouvert, textes, onRepondre, isDark }) {
  const [mode, setMode] = useState(null);

  useEffect(() => {
    if (ouvert) setMode(null);
  }, [ouvert]);

  const pasEncore = () => onRepondre(null);

  return (
    <Modal isOpen={!!ouvert} onClose={pasEncore} size="sm" isDark={isDark}>
      <ModalHeader>
        <ModalTitle>{textes.title}</ModalTitle>
        <ModalDescription>{textes.message}</ModalDescription>
      </ModalHeader>
      <ModalBody>
        <div role="radiogroup" aria-label={textes.title} data-ui="ModeRemise">
          {MODES_REMISE.map((m) => (
            <label key={m.valeur} className="flex items-center gap-3 min-h-11 cursor-pointer text-sm text-encre">
              <input type="radio" name="mode-remise" value={m.valeur} checked={mode === m.valeur} onChange={() => setMode(m.valeur)} className="w-5 h-5" />
              {m.libelle}
            </label>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Bouton variante="discret" onClick={pasEncore}>{textes.cancelText}</Bouton>
        <Bouton variante="principal" disabled={!mode} onClick={() => onRepondre(mode)}>{textes.confirmText}</Bouton>
      </ModalFooter>
    </Modal>
  );
}
