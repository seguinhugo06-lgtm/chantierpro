import { useState } from 'react';
import { Building2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { auth } from '../../supabaseClient';
import { captureException } from '../../lib/sentry';
import { traduireErreurAuth, motDePasseValide } from '../../lib/authErreurs';

/**
 * Écran affiché après un clic sur le lien « Réinitialiser mon mot de passe » reçu par e-mail.
 * Supabase a déjà ouvert une session temporaire à partir du lien : il reste à choisir le nouveau
 * mot de passe (updateUser). Même habillage que l'écran de connexion.
 */
export default function NouveauMotDePasse({ email, onTermine, onAnnuler }) {
  const [mdp, setMdp] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const champ = 'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all';

  const valider = async (e) => {
    e.preventDefault();
    setErreur('');
    if (!motDePasseValide(mdp)) { setErreur('Au moins 8 caractères, avec des lettres et des chiffres.'); return; }
    if (mdp !== confirmation) { setErreur('Les deux mots de passe ne sont pas identiques.'); return; }
    setEnCours(true);
    try {
      const { error } = await auth.updatePassword(mdp);
      if (error) { setErreur(traduireErreurAuth(error)); return; }
      onTermine();
    } catch (err) {
      captureException(err, { context: 'réinitialisation du mot de passe' });
      setErreur(traduireErreurAuth(err));
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
            <Building2 size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Mallettico</span>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-orange-500/15 flex items-center justify-center mb-4">
          <KeyRound size={22} className="text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Nouveau mot de passe</h1>
        <p className="text-slate-400 mb-8">
          {email ? <>Pour le compte <span className="text-slate-200">{email}</span>.</> : 'Choisissez votre nouveau mot de passe.'}
        </p>

        <form onSubmit={valider} className="space-y-4" noValidate>
          <div className="relative">
            <input
              type={visible ? 'text' : 'password'}
              className={`${champ} pr-12`}
              placeholder="Nouveau mot de passe"
              value={mdp}
              onChange={(e) => setMdp(e.target.value)}
              autoComplete="new-password"
              aria-label="Nouveau mot de passe"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white"
              aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <input
            type={visible ? 'text' : 'password'}
            className={champ}
            placeholder="Confirmer le mot de passe"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="new-password"
            aria-label="Confirmer le nouveau mot de passe"
            required
          />
          <p className="text-xs text-slate-500">Au moins 8 caractères, avec des lettres et des chiffres.</p>

          {erreur && (
            <div role="alert" className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">{erreur}</div>
          )}

          <button
            type="submit"
            disabled={enCours}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {enCours ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
          </button>
          <button type="button" onClick={onAnnuler} className="w-full py-3 text-sm text-slate-400 hover:text-white transition-colors">
            Annuler et me déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
