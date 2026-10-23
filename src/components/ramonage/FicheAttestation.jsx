import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Send, Receipt, Ban, RotateCcw } from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Champ from '../ui/Champ';
import Pastille from '../ui/Pastille';
import { htmlAttestation, remettreAttestation, envoyerAttestation, donneesFacture } from './actionsRamonage';
import { isDemo } from '../../supabaseClient';
import { captureException } from '../../lib/sentry';

/**
 * Une attestation enregistrée : le document, son PDF (partage ou téléchargement), l'envoi au client par e-mail, la
 * facture tirée de l'attestation (sans ressaisie), et l'annulation motivée (« Refaire » ensuite crée une attestation
 * qui l'annule et la remplace : la base fige le contenu dès l'enregistrement).
 */
export default function FicheAttestation({
  ramonage, client, entreprise, ramonages, clients, devis = [], suivreRamonage, addDevis, onRefaire, onOuvrirFacture, onFermer, showToast,
}) {
  const [action, setAction] = useState(null); // 'pdf' | 'envoi' | 'facture' | null
  const [annulation, setAnnulation] = useState(null); // motif en cours de saisie
  const html = useMemo(() => (ramonage.numero ? htmlAttestation({ ramonage, entreprise, ramonages, clients }) : ''), [ramonage, entreprise, ramonages, clients]);
  const facture = ramonage.facture_id ? devis.find((d) => d.id === ramonage.facture_id) : null;
  const annulee = !!ramonage.annulee_le;
  const email = String(client?.email || '').trim();

  useEffect(() => {
    const echap = (e) => { if (e.key === 'Escape') onFermer(); };
    document.addEventListener('keydown', echap);
    return () => document.removeEventListener('keydown', echap);
  }, [onFermer]);

  const pdf = async () => {
    setAction('pdf');
    try {
      await remettreAttestation({ html, ramonage });
    } catch (e) {
      captureException(e, { context: 'PDF attestation de ramonage' });
      showToast?.('Le PDF n’a pas pu être créé. Réessayez.', 'error');
    } finally {
      setAction(null);
    }
  };

  const envoyer = async () => {
    if (!email) return;
    if (isDemo) {
      showToast?.(`E-mail (démo) : l’attestation partirait à ${email}.`, 'info');
      return;
    }
    setAction('envoi');
    try {
      await envoyerAttestation({ html, ramonage, entreprise, client });
      showToast?.(`Attestation envoyée à ${email}`, 'success');
    } catch (e) {
      captureException(e, { context: 'envoi attestation de ramonage' });
      showToast?.(e?.message || 'L’envoi a échoué. Réessayez.', 'error');
    } finally {
      setAction(null);
    }
  };

  const faireFacture = async () => {
    if (facture) { onOuvrirFacture(facture); return; }
    setAction('facture');
    try {
      const creee = await addDevis(donneesFacture({ ramonages: [ramonage], entreprise }));
      if (!creee) return; // refus déjà dit (limite, droits, base)
      const lie = await suivreRamonage(ramonage.id, { facture_id: creee.id });
      if (lie === false) showToast?.('La facture est créée, mais son lien avec l’attestation n’a pas été enregistré.', 'error');
      onOuvrirFacture(creee);
    } finally {
      setAction(null);
    }
  };

  const confirmerAnnulation = async () => {
    const motif = String(annulation || '').trim();
    if (!motif) return;
    const ok = await suivreRamonage(ramonage.id, { annulee_le: new Date().toISOString(), annulation_motif: motif });
    if (ok !== false) {
      setAnnulation(null);
      showToast?.(`Attestation ${ramonage.numero} annulée.`, 'success');
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="fiche-attestation-titre" className="fixed inset-0 z-[70] bg-fond flex flex-col">
      <header className="flex items-center gap-2 px-2 sm:px-4 h-14 border-b border-bord bg-surface flex-shrink-0" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <BoutonIcone icone={X} libelle="Fermer" onClick={onFermer} />
        <h2 id="fiche-attestation-titre" className="text-lg font-semibold text-encre truncate flex-1">
          Attestation {ramonage.numero || '(numéro en attente)'}
        </h2>
        {annulee ? <Pastille ton="danger">Annulée</Pastille> : null}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-3">
          {!ramonage.numero ? (
            <p role="status" className="rounded-2xl bg-alerte-fond text-alerte-texte p-4 text-sm">
              Enregistrée sur ce téléphone : le numéro et le PDF seront disponibles au retour du réseau, une fois l’attestation reçue par le serveur.
            </p>
          ) : (
            <iframe title={`Attestation ${ramonage.numero}`} srcDoc={html} sandbox="" className="w-full h-[60vh] bg-white rounded-xl border border-bord" />
          )}

          {!annulee && ramonage.numero && (
            <>
              {!email && <p className="text-sm text-encre-2">Pas d’e-mail sur la fiche du client : partagez le PDF, ou ajoutez son e-mail à sa fiche pour l’envoyer d’ici.</p>}
              {annulation === null ? (
                <Bouton variante="discret" icone={Ban} onClick={() => setAnnulation('Erreur de saisie')}>Annuler l’attestation (erreur de saisie)</Bouton>
              ) : (
                <div className="bg-surface border border-bord rounded-2xl p-4 space-y-3">
                  <p className="text-sm text-encre-2">L’attestation reste dans l’historique, marquée « annulée ». Vous pourrez ensuite la refaire : la nouvelle portera « annule et remplace l’attestation n° {ramonage.numero} ».</p>
                  <Champ libelle="Motif de l’annulation" value={annulation} onChange={(e) => setAnnulation(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Bouton variante="discret" onClick={() => setAnnulation(null)}>Garder l’attestation</Bouton>
                    <Bouton variante="danger" disabled={!String(annulation).trim()} onClick={confirmerAnnulation}>Annuler l’attestation</Bouton>
                  </div>
                </div>
              )}
            </>
          )}
          {annulee && (
            <div className="bg-surface border border-bord rounded-2xl p-4 space-y-3">
              <p className="text-sm text-encre-2">Annulée{ramonage.annulation_motif ? ` : ${ramonage.annulation_motif}` : ''}.</p>
              <Bouton variante="secondaire" icone={RotateCcw} onClick={() => onRefaire(ramonage)}>Refaire à partir de celle-ci</Bouton>
            </div>
          )}
        </div>
      </div>

      {!annulee && ramonage.numero && (
        <footer className="flex-shrink-0 border-t border-bord bg-surface px-3 sm:px-4 py-3 flex flex-wrap gap-2 justify-end" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <Bouton variante="secondaire" icone={Download} chargement={action === 'pdf'} onClick={pdf}>PDF</Bouton>
          <Bouton variante="secondaire" icone={Send} chargement={action === 'envoi'} disabled={!email} onClick={envoyer}>Envoyer au client</Bouton>
          <Bouton variante={facture ? 'secondaire' : 'principal'} icone={Receipt} chargement={action === 'facture'} onClick={faireFacture}>
            {facture ? `Facture ${facture.numero || ''}`.trim() : 'Faire la facture'}
          </Bouton>
        </footer>
      )}
    </div>,
    document.body,
  );
}
