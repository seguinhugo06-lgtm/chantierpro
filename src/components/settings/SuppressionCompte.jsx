import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, Download, CreditCard } from 'lucide-react';
import supabase, { auth, isDemo } from '../../supabaseClient';
import { useOrg } from '../../context/OrgContext';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { createPortalSession } from '../../services/subscriptionsApi';
import { supprimerMonCompte, messageErreurSuppression } from '../../services/suppressionCompte';
import { captureException } from '../../lib/sentry';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';

const MOT_CLE = 'SUPPRIMER';

/**
 * Zone de danger des paramètres : suppression définitive du compte et de toutes ses données.
 * Le travail est fait par la fonction serveur `supprimer_mon_compte` (migration 072), qui refuse
 * si un abonnement payant ou une équipe dépend encore du compte — et le dit.
 */
export default function SuppressionCompte({ isDark, showToast, onExporter }) {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const { orgId, isOwner } = useOrg();
  const planId = useSubscriptionStore((s) => s.planId);
  const abonnement = useSubscriptionStore((s) => s.subscription);

  // Indication côté app ; la vérification qui fait foi est faite par le serveur.
  const abonnementPayantActif = planId !== 'gratuit'
    && ['active', 'trialing', 'past_due'].includes(abonnement?.status)
    && !abonnement?.cancel_at_period_end
    && !!abonnement?.stripe_subscription_id;

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300';

  const fermer = () => { if (!enCours) { setOuvert(false); setSaisie(''); setErreur(''); } };

  const ouvrirPortail = async () => {
    const { url, error } = await createPortalSession();
    if (error || !url) { showToast('Impossible d’ouvrir la gestion de l’abonnement. Réessayez.', 'error'); return; }
    window.location.href = url;
  };

  const confirmer = async () => {
    if (saisie.trim().toUpperCase() !== MOT_CLE) return;
    setErreur('');
    setEnCours(true);
    try {
      if (!isDemo && supabase) {
        const utilisateur = await auth.getCurrentUser();
        if (!utilisateur?.id) throw new Error('NON_CONNECTE');
        await supprimerMonCompte({
          supabase,
          userId: utilisateur.id,
          orgIdProprietaire: isOwner && orgId && orgId !== 'demo-org-id' ? orgId : null,
        });
      }
      // Le compte n'existe plus côté serveur : on efface aussi tout ce que l'appareil garde.
      Object.keys(localStorage)
        .filter((k) => k.startsWith('cp_') || k.startsWith('mallettico') || k.startsWith('batigesti'))
        .forEach((k) => localStorage.removeItem(k));
      let residuLocal = false;
      try {
        indexedDB.deleteDatabase('mallettico-offline');
      } catch (e) {
        residuLocal = true;
        captureException(e, { context: 'suppression compte : base hors-ligne non supprimée' });
      }
      await auth.signOut().catch(() => { /* la session est déjà invalide : le compte n'existe plus */ });
      showToast(
        residuLocal
          ? 'Compte supprimé. Des données restent sur cet appareil : videz les données du site dans votre navigateur.'
          : isDemo ? 'Données de démonstration effacées.' : 'Compte et données supprimés définitivement.',
        residuLocal ? 'warning' : 'success',
      );
      setTimeout(() => window.location.replace('/'), 1200);
    } catch (e) {
      captureException(e, { context: 'suppression de compte' });
      setErreur(messageErreurSuppression(e));
      setEnCours(false);
    }
  };

  return (
    <div className={`rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6 ${isDark ? 'bg-red-950/20 border-red-800/50' : 'bg-red-50 border-red-300'}`}>
      <h3 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
        <Trash2 size={18} />
        Zone de danger
      </h3>
      <p className={`text-sm mb-2 ${isDark ? 'text-red-300/80' : 'text-red-700/80'}`}>
        <strong>Supprimer mon compte et mes données.</strong> Devis, factures, clients, chantiers, photos et
        paramètres sont effacés définitivement, ainsi que votre accès.
      </p>
      <p className={`text-xs mb-4 ${isDark ? 'text-red-400/70' : 'text-red-600/70'}`}>
        Vos factures doivent être conservées 10 ans : exportez-les avant de continuer.
      </p>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${isDark ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-red-500 text-white hover:bg-red-600'}`}
      >
        <Trash2 size={18} />
        Supprimer mon compte
      </button>

      <Modal isOpen={ouvert} onClose={fermer} size="sm" isDark={isDark} closeOnBackdrop={!enCours} closeOnEscape={!enCours}>
        <ModalHeader>
          <ModalTitle>Supprimer définitivement le compte ?</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {abonnementPayantActif && (
            <div className={`p-3 rounded-xl border text-sm flex gap-2 ${isDark ? 'bg-amber-900/20 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <CreditCard size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                Votre abonnement est encore actif : résiliez-le d’abord, sinon il continuerait d’être prélevé.
                <button type="button" onClick={ouvrirPortail} className="block mt-2 font-semibold underline">
                  Gérer mon abonnement
                </button>
              </div>
            </div>
          )}
          <ul className={`text-sm space-y-1.5 ${textMuted}`}>
            <li className="flex gap-2"><AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" /> Irréversible : rien ne pourra être récupéré.</li>
            <li className="flex gap-2"><AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" /> Les liens de signature et de paiement déjà envoyés à vos clients cesseront de fonctionner.</li>
          </ul>
          {onExporter && (
            <button type="button" onClick={onExporter} className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
              <Download size={16} /> Exporter mes données d’abord
            </button>
          )}
          <label className={`block text-sm ${textPrimary}`}>
            Pour confirmer, tapez <strong>{MOT_CLE}</strong>
            <input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              className={`mt-1.5 w-full px-3 py-2.5 rounded-xl border ${inputBg}`}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={enCours}
              aria-label={`Tapez ${MOT_CLE} pour confirmer`}
            />
          </label>
          {erreur && (
            <div role="alert" className={`p-3 rounded-xl border text-sm ${isDark ? 'bg-red-900/30 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {erreur}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={fermer} disabled={enCours} className={`px-4 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
            Annuler
          </button>
          <button
            type="button"
            onClick={confirmer}
            disabled={enCours || saisie.trim().toUpperCase() !== MOT_CLE}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {enCours && <Loader2 size={16} className="animate-spin" />}
            {enCours ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
