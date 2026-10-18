import { useEffect, useState } from 'react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton } from '../ui/Bouton';
import { dateLue } from '../../lib/dates';
import { effetCorrection } from '../../lib/paiementsFacture';

const euros = (n) => `${(Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const nombre = (v) => {
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Corriger un encaissement saisi par erreur (tâche encaissement-corriger, migration 098). Un encaissement enregistré
 * ne se modifie ni ne s'efface (CGI art. 286 I 3° bis) : la correction est une écriture négative, motivée, qui cite le
 * paiement corrigé et reste visible dans l'historique de la facture.
 * Textes : relecture juriste-btp du 18 oct. 2026 (correction ≠ avoir ; date du jour ; reste à encaisser).
 * @param {{ paiement: object|null, max: number, reste?: number, onConfirmer: (montant: number, motif: string) => Promise<boolean>, onClose: () => void, isDark?: boolean }} props
 *   reste : reste dû signé avant la correction (négatif en cas de trop-perçu, resteSigne)
 */
export default function CorrectionEncaissementModal({ paiement, max, reste = 0, onConfirmer, onClose, isDark }) {
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (paiement) {
      setMontant((Number(max) || 0).toFixed(2).replace('.', ','));
      setMotif('');
      setEnCours(false);
    }
  }, [paiement, max]);

  const valeur = nombre(montant);
  const montantValide = valeur > 0 && valeur <= (Number(max) || 0) + 0.005;
  const motifValide = motif.trim().length >= 5;

  const confirmer = async () => {
    if (!montantValide || !motifValide || enCours) return;
    setEnCours(true);
    const ok = await onConfirmer(Math.round(valeur * 100) / 100, motif.trim());
    setEnCours(false);
    if (ok) onClose();
  };

  return (
    <Modal isOpen={!!paiement} onClose={onClose} size="sm" isDark={isDark} closeOnBackdrop={!enCours} closeOnEscape={!enCours}>
      <ModalHeader>
        <ModalTitle>Corriger l’encaissement</ModalTitle>
        {paiement && (
          <ModalDescription>
            Encaissement du {dateLue(paiement.date).toLocaleDateString('fr-FR')} ({paiement.mode || 'virement'}) : {euros(paiement.montant)}.
            Un encaissement enregistré ne s’efface pas : la correction s’ajoute à l’historique de la facture, avec son motif.
            Elle ne change que ce que vous avez reçu : pour baisser le prix facturé (remise, travaux non faits), faites un avoir.
          </ModalDescription>
        )}
      </ModalHeader>
      <ModalBody className="space-y-4">
        <label className="block text-sm text-encre">
          Montant à retirer (au plus {euros(max)})
          <input
            type="text"
            inputMode="decimal"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            disabled={enCours}
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-bord-fort bg-surface text-encre tabular-nums"
            aria-invalid={montant !== '' && !montantValide}
          />
        </label>
        <label className="block text-sm text-encre">
          Motif (obligatoire, 5 caractères au moins)
          <input
            type="text"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            disabled={enCours}
            maxLength={200}
            placeholder="Ex. : virement saisi deux fois, chèque impayé, trop-perçu remboursé"
            className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-bord-fort bg-surface text-encre"
          />
        </label>
        {montant !== '' && !montantValide && (
          <p role="alert" className="text-sm text-danger-texte">Le montant doit être positif et ne pas dépasser {euros(max)}.</p>
        )}
        {montantValide && (() => {
          const { effet, apres } = effetCorrection(reste, valeur);
          return (
            <p className="text-sm text-encre-2">
              {effet === 'rouverte' && `La facture ne sera plus soldée : il restera ${euros(apres)} à encaisser, et elle pourra être relancée.`}
              {effet === 'reste' && `Il restera ${euros(apres)} à encaisser sur la facture.`}
              {effet === 'soldee' && 'La facture reste soldée.'}
            </p>
          );
        })()}
        <p className="text-xs text-encre-3">
          La correction est datée d’aujourd’hui. Si l’encaissement corrigé a déjà été déclaré (TVA, chiffre d’affaires), voyez-le avec votre comptable.
        </p>
      </ModalBody>
      <ModalFooter>
        <Bouton variante="discret" onClick={onClose} disabled={enCours}>Annuler</Bouton>
        <Bouton variante="principal" onClick={confirmer} disabled={!montantValide || !motifValide} chargement={enCours}>
          Enregistrer la correction
        </Bouton>
      </ModalFooter>
    </Modal>
  );
}
