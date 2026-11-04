/**
 * AccordIaModal — l'écran « Avant votre première dictée » (décision d'Hugo du 4 nov. 2026 ; texte de juriste-btp,
 * src/lib/accordIa.js). Montré au premier « Dicter », et de nouveau après un retrait de l'accord (Paramètres).
 *
 * - « J'accepte et je dicte » : l'accord est écrit en base (migration 109) ; la dictée ne s'ouvre qu'une fois l'écriture
 *   confirmée. En cas d'échec, on le dit, et rien n'est envoyé.
 * - « Non, je saisis à la main » : ouvre un devis vierge ; rien n'est envoyé ni enregistré.
 * Fenêtre commune (Modal.jsx) : focus sur le premier bouton, cibles de 44 px, un seul bouton plein.
 */
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Bouton } from '../ui/Bouton';
import { ouvrirLienExterne } from '../../lib/natif';
import { urlPublique } from '../../lib/urlPublique';
import {
  ACCORD_IA_TITRE, ACCORD_IA_TEXTE, ACCORD_IA_ACCEPTER, ACCORD_IA_REFUSER, ACCORD_IA_EN_SAVOIR_PLUS, ACCORD_IA_LIEN,
} from '../../lib/accordIa';

export default function AccordIaModal({ isOpen, onClose, onAccepter, onRefuser }) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  const accepter = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await onAccepter?.();
      if (!r?.ok) setErreur('Votre accord n’a pas pu être enregistré. Vérifiez votre connexion et réessayez, ou saisissez votre devis à la main.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!envoi) onClose?.(); }} title={ACCORD_IA_TITRE} showClose={false} size="md">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-encre">{ACCORD_IA_TEXTE}</p>
        {erreur && (
          <p role="alert" className="text-sm rounded-xl p-3 bg-danger-fond text-danger-texte">{erreur}</p>
        )}
        <div className="flex flex-col gap-2">
          <Bouton variante="principal" pleineLargeur onClick={accepter} chargement={envoi} disabled={envoi}>
            {ACCORD_IA_ACCEPTER}
          </Bouton>
          <Bouton variante="secondaire" pleineLargeur onClick={() => onRefuser?.()} disabled={envoi}>
            {ACCORD_IA_REFUSER}
          </Bouton>
          <button
            type="button"
            onClick={() => { ouvrirLienExterne(urlPublique(ACCORD_IA_LIEN)).catch(() => {}); }}
            className="min-h-[44px] px-2 text-sm font-medium underline text-accent-texte"
          >
            {ACCORD_IA_EN_SAVOIR_PLUS}
          </button>
        </div>
      </div>
    </Modal>
  );
}
