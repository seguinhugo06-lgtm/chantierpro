import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Send, Receipt, Ban, RotateCcw, FileText } from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Champ from '../ui/Champ';
import Pastille from '../ui/Pastille';
import { htmlAttestation, remettreAttestation, envoyerAttestation, donneesFacture, donneesDevis } from './actionsEntretien';
import { avertissementSeptJours } from '../../lib/entretien';
import { isDemo } from '../../supabaseClient';
import { captureException } from '../../lib/sentry';
import { usePermissions } from '../../hooks/usePermissions';

/**
 * Une attestation d'entretien enregistrée : le document, son PDF, l'envoi au client, la facture tirée de l'attestation
 * et l'annulation motivée (« Refaire » crée ensuite une attestation qui l'annule et la remplace). Comme FicheAttestation
 * (ramonage), avec les droits : facture et envoi pour qui peut créer ou envoyer un document.
 */
export default function FicheEntretien({
  entretien, client, entreprise, entretiens, clients, devis = [], suivreEntretien, addDevis, onRefaire, onOuvrirFacture, onOuvrirEditeur, onFermer, showToast,
}) {
  const { canPerform } = usePermissions();
  const [action, setAction] = useState(null);
  const [annulation, setAnnulation] = useState(null);
  const html = useMemo(() => (entretien.numero ? htmlAttestation({ entretien, entreprise, entretiens, clients }) : ''), [entretien, entreprise, entretiens, clients]);
  const facture = entretien.facture_id ? devis.find((d) => d.id === entretien.facture_id) : null;
  const annulee = !!entretien.annulee_le;
  const email = String(client?.email || '').trim();
  const peutFacturer = canPerform('devis', 'create');
  const peutEnvoyer = canPerform('devis', 'send');
  const peutAnnuler = canPerform('client', 'edit');

  useEffect(() => {
    const echap = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onFermer(); } };
    window.addEventListener('keydown', echap, true);
    return () => window.removeEventListener('keydown', echap, true);
  }, [onFermer]);

  const pdf = async () => {
    setAction('pdf');
    try {
      await remettreAttestation({ html, entretien });
    } catch (e) {
      captureException(e, { context: 'PDF attestation d’entretien' });
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
      await envoyerAttestation({ html, entretien, entreprise, client });
      showToast?.(`Attestation envoyée à ${email}`, 'success');
    } catch (e) {
      captureException(e, { context: 'envoi attestation d’entretien' });
      showToast?.(e?.message || 'L’envoi a échoué. Réessayez.', 'error');
    } finally {
      setAction(null);
    }
  };

  const faireFacture = async () => {
    if (facture) { onOuvrirFacture(facture); return; }
    setAction('facture');
    try {
      const creee = await addDevis(donneesFacture({ entretien, entreprise }));
      if (!creee) return;
      const lie = await suivreEntretien(entretien.id, { facture_id: creee.id });
      if (lie === false) {
        showToast?.('La facture est créée, mais son lien avec l’attestation n’a pas été enregistré.', 'error');
      } else {
        // Chez un client particulier, un entretien convenu chez lui ne se paie pas avant sept jours (L221-10) : D-38,
        // décision 2. Une seule notification à la fois : l'erreur de lien, plus grave, garde la place.
        const sept = avertissementSeptJours(client);
        if (sept) showToast?.(sept, 'warning', 9000);
      }
      onOuvrirFacture(creee);
    } finally {
      setAction(null);
    }
  };

  // « Faire le devis de la visite » (D-38, décision 2) : un devis brouillon prérempli par la création de devis habituelle
  // (numéro, limite du plan, conditions d'utilisation), ouvert dans l'éditeur. Il n'est jamais envoyé d'ici.
  const faireDevis = async () => {
    setAction('devis');
    try {
      const cree = await addDevis(donneesDevis({ entretien, entreprise }));
      if (!cree) return; // refusé (limite du plan, conditions non acceptées, client absent) : addDevis l'a dit
      onOuvrirEditeur(cree);
    } finally {
      setAction(null);
    }
  };

  const confirmerAnnulation = async () => {
    const motif = String(annulation || '').trim();
    if (!motif) return;
    const ok = await suivreEntretien(entretien.id, { annulee_le: new Date().toISOString(), annulation_motif: motif });
    if (ok !== false) {
      setAnnulation(null);
      showToast?.(`Attestation ${entretien.numero} annulée.`, 'success');
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="fiche-entretien-titre" className="fixed inset-0 z-[70] bg-fond flex flex-col" data-testid="fiche-entretien">
      <header className="flex items-center gap-2 px-2 sm:px-4 min-h-14 border-b border-bord bg-surface flex-shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <BoutonIcone icone={X} libelle="Fermer" onClick={onFermer} />
        <h2 id="fiche-entretien-titre" className="text-lg font-semibold text-encre truncate flex-1">
          Attestation {entretien.numero || '(numéro en attente)'}
        </h2>
        {annulee ? <Pastille ton="danger">Annulée</Pastille> : null}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-3">
          {!entretien.numero ? (
            <p role="status" className="rounded-2xl bg-alerte-fond text-alerte-texte p-4 text-sm">
              Enregistrée sur ce téléphone : le numéro et le PDF seront disponibles au retour du réseau, une fois l’attestation reçue par le serveur.
            </p>
          ) : (
            <iframe title={`Attestation ${entretien.numero}`} srcDoc={html} sandbox="" className="w-full h-[60vh] bg-white rounded-xl border border-bord" />
          )}

          {!annulee && entretien.numero && peutAnnuler && (
            <>
              {!email && <p className="text-sm text-encre-2">Pas d’e-mail sur la fiche du client : partagez le PDF, ou ajoutez son e-mail à sa fiche pour l’envoyer d’ici.</p>}
              {annulation === null ? (
                <Bouton variante="discret" icone={Ban} onClick={() => setAnnulation('Erreur de saisie')}>Annuler l’attestation (erreur de saisie)</Bouton>
              ) : (
                <div className="bg-surface border border-bord rounded-2xl p-4 space-y-3">
                  <p className="text-sm text-encre-2">L’attestation reste dans l’historique, marquée « annulée ». Vous pourrez ensuite la refaire : la nouvelle portera « annule et remplace l’attestation n° {entretien.numero} ».</p>
                  <Champ libelle="Motif de l’annulation" value={annulation} onChange={(e) => setAnnulation(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <Bouton variante="discret" onClick={() => setAnnulation(null)}>Garder l’attestation</Bouton>
                    <Bouton variante="danger" disabled={!String(annulation).trim()} onClick={confirmerAnnulation}>Annuler l’attestation</Bouton>
                  </div>
                </div>
              )}
            </>
          )}
          {annulee && peutAnnuler && (
            <div className="bg-surface border border-bord rounded-2xl p-4 space-y-3">
              <p className="text-sm text-encre-2">Annulée{entretien.annulation_motif ? ` : ${entretien.annulation_motif}` : ''}.</p>
              <Bouton variante="secondaire" icone={RotateCcw} onClick={() => onRefaire(entretien)}>Refaire à partir de celle-ci</Bouton>
            </div>
          )}
        </div>
      </div>

      {!annulee && entretien.numero && (
        <footer className="flex-shrink-0 border-t border-bord bg-surface px-3 sm:px-4 py-3 flex flex-wrap gap-2 justify-end" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <Bouton variante="secondaire" icone={Download} chargement={action === 'pdf'} onClick={pdf}>PDF</Bouton>
          {peutEnvoyer && <Bouton variante="secondaire" icone={Send} chargement={action === 'envoi'} disabled={!email} onClick={envoyer}>Envoyer au client</Bouton>}
          {peutFacturer && (
            <Bouton variante="secondaire" icone={FileText} chargement={action === 'devis'} onClick={faireDevis}>Faire le devis de la visite</Bouton>
          )}
          {peutFacturer && (
            <Bouton variante={facture ? 'secondaire' : 'principal'} icone={Receipt} chargement={action === 'facture'} onClick={faireFacture}>
              {facture ? `Facture ${facture.numero || ''}`.trim() : 'Faire la facture'}
            </Bouton>
          )}
        </footer>
      )}
    </div>,
    document.body,
  );
}
