import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Send, Receipt, Ban, RotateCcw } from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Champ from '../ui/Champ';
import Pastille from '../ui/Pastille';
import { htmlCompteRendu, remettreCompteRendu, envoyerCompteRendu, donneesFactureCompteRendu } from './actionsCompteRendu';
import { isDemo } from '../../supabaseClient';
import { captureException } from '../../lib/sentry';
import { avertissementFactureCompteRendu } from '../../lib/electricite';

/**
 * Un compte rendu enregistré : le document, son PDF (partage ou téléchargement), son envoi au client par e-mail (comme
 * l'attestation de ramonage), la facture tirée du compte rendu (brouillon, sans ressaisie) et l'annulation motivée
 * (« Refaire » crée un compte rendu qui l'annule et le remplace). `client` : la fiche du client du compte rendu.
 */
export default function FicheCompteRendu({
  compteRendu: cr, client = null, entreprise, comptesRendus, devis = [], suivreCompteRendu, addDevis, peutModifier = false, peutFacturer, onRefaire, onOuvrirFacture, onFermer, showToast,
}) {
  const [action, setAction] = useState(null); // 'pdf' | 'envoi' | 'facture' | null
  const [annulation, setAnnulation] = useState(null);
  const html = useMemo(() => (cr.numero ? htmlCompteRendu({ compteRendu: cr, entreprise, comptesRendus }) : ''), [cr, entreprise, comptesRendus]);
  const facture = cr.facture_id ? devis.find((d) => d.id === cr.facture_id) : null;
  const annule = !!cr.annulee_le;
  const email = String(client?.email || '').trim();

  useEffect(() => {
    const echap = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onFermer(); } };
    window.addEventListener('keydown', echap, true);
    return () => window.removeEventListener('keydown', echap, true);
  }, [onFermer]);

  const pdf = async () => {
    setAction('pdf');
    try {
      await remettreCompteRendu({ html, compteRendu: cr });
    } catch (e) {
      captureException(e, { context: 'PDF compte rendu électricité' });
      showToast?.('Le PDF n’a pas pu être créé. Réessayez.', 'error');
    } finally {
      setAction(null);
    }
  };

  // Envoi par la fonction `send-email`, comme l'attestation de ramonage : on attend la réponse, et le message de succès ne
  // vient qu'après elle (un refus du serveur est dit tel quel). En démo, rien ne part et l'écran le dit.
  const envoyer = async () => {
    if (!email) return;
    if (isDemo) {
      showToast?.(`E-mail (démo) : le compte rendu partirait à ${email}.`, 'info');
      return;
    }
    setAction('envoi');
    try {
      await envoyerCompteRendu({ html, compteRendu: cr, entreprise, client });
      showToast?.(`Compte rendu envoyé à ${email}`, 'success');
    } catch (e) {
      captureException(e, { context: 'envoi compte rendu électricité' });
      showToast?.(e?.message || 'L’envoi a échoué. Réessayez.', 'error');
    } finally {
      setAction(null);
    }
  };

  const faireFacture = async () => {
    if (facture) { onOuvrirFacture(facture); return; }
    setAction('facture');
    try {
      const creee = await addDevis(donneesFactureCompteRendu({ compteRendu: cr, entreprise }));
      if (!creee) return; // refus déjà dit (limite, droits, base)
      const lie = await suivreCompteRendu(cr.id, { facture_id: creee.id });
      // Avertir sans bloquer (D-36, D-39) : le taux à vérifier, ou le devis d'un dépannage chez un particulier (10 s : le texte
      // est long, il doit pouvoir être lu)
      const avertissement = avertissementFactureCompteRendu(cr, client);
      if (lie === false) showToast?.('La facture est créée, mais son lien avec le compte rendu n’a pas été enregistré.', 'error');
      else if (avertissement) showToast?.(avertissement.texte, 'warning', avertissement.duree);
      onOuvrirFacture(creee);
    } finally {
      setAction(null);
    }
  };

  const confirmerAnnulation = async () => {
    const motif = String(annulation || '').trim();
    if (!motif) return;
    const ok = await suivreCompteRendu(cr.id, { annulee_le: new Date().toISOString(), annulation_motif: motif });
    if (ok !== false) {
      setAnnulation(null);
      showToast?.(`Compte rendu ${cr.numero} annulé.`, 'success');
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="fiche-cr-titre" className="fixed inset-0 z-[70] bg-fond flex flex-col">
      <header className="flex items-center gap-2 px-2 sm:px-4 border-b border-bord bg-surface flex-shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <BoutonIcone icone={X} libelle="Fermer" onClick={onFermer} />
        <h2 id="fiche-cr-titre" className="text-lg font-semibold text-encre truncate flex-1">Compte rendu {cr.numero || '(numéro en attente)'}</h2>
        {annule ? <Pastille ton="danger">Annulé</Pastille> : null}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-3">
          {!cr.numero ? (
            <p role="status" className="rounded-2xl bg-alerte-fond text-alerte-texte p-4 text-sm">
              Enregistré sur ce téléphone : le numéro et le PDF seront disponibles au retour du réseau, une fois le compte rendu reçu par le serveur.
            </p>
          ) : (
            <iframe title={`Compte rendu ${cr.numero}`} srcDoc={html} sandbox="" className="w-full h-[60vh] bg-white rounded-xl border border-bord" />
          )}
          {peutModifier && !annule && cr.numero && !email && (
            <p className="text-sm text-encre-2">Pas d’e-mail sur la fiche du client : partagez le PDF, ou ajoutez son e-mail à sa fiche pour l’envoyer d’ici.</p>
          )}
          {/* Annuler et refaire : droit de modifier le chantier (canPerform, relecture du 4 nov., point 4) */}
          {peutModifier && !annule && cr.numero && (annulation === null ? (
            <Bouton variante="discret" icone={Ban} onClick={() => setAnnulation('Erreur de saisie')}>Annuler le compte rendu (erreur de saisie)</Bouton>
          ) : (
            <div className="bg-surface border border-bord rounded-2xl p-4 space-y-3">
              <p className="text-sm text-encre-2">Le compte rendu reste dans l’historique, marqué « annulé ». Vous pourrez ensuite le refaire : le nouveau portera « annule et remplace le compte rendu n° {cr.numero} ».</p>
              <Champ libelle="Motif de l’annulation" value={annulation} onChange={(e) => setAnnulation(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <Bouton variante="discret" onClick={() => setAnnulation(null)}>Garder le compte rendu</Bouton>
                <Bouton variante="danger" disabled={!String(annulation).trim()} onClick={confirmerAnnulation}>Annuler le compte rendu</Bouton>
              </div>
            </div>
          ))}
          {annule && (
            <div className="bg-surface border border-bord rounded-2xl p-4 space-y-3">
              <p className="text-sm text-encre-2">Annulé{cr.annulation_motif ? ` : ${cr.annulation_motif}` : ''}.</p>
              {peutModifier && <Bouton variante="secondaire" icone={RotateCcw} onClick={() => onRefaire(cr)}>Refaire à partir de celui-ci</Bouton>}
            </div>
          )}
        </div>
      </div>

      {!annule && cr.numero && (
        <footer className="flex-shrink-0 border-t border-bord bg-surface px-3 sm:px-4 py-3 flex flex-wrap gap-2 justify-end" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <Bouton variante="secondaire" icone={Download} chargement={action === 'pdf'} onClick={pdf}>PDF</Bouton>
          {/* Envoyer au client : un e-mail part au nom de l'entreprise, donc le droit de modifier le chantier, comme annuler et refaire */}
          {peutModifier && (
            <Bouton variante="secondaire" icone={Send} chargement={action === 'envoi'} disabled={!email} onClick={envoyer}>Envoyer au client</Bouton>
          )}
          {(facture || peutFacturer) && (
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
