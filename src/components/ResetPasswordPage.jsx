import { useState, useEffect } from 'react';
import supabase, { isDemo } from '../supabaseClient';
import { Building2, Eye, EyeOff, CheckCircle } from 'lucide-react';

/**
 * ResetPasswordPage — Page de réinitialisation de mot de passe
 * Accessible via /reset-password après clic sur le lien email Supabase
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(isDemo);

  // Supabase auto-signs in the user from the email link hash
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if already in a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    if (isDemo) { setSuccess(true); setIsSubmitting(false); return; }    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour du mot de passe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
            <Building2 size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white">BatiGesti</span>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          {success ? (
            <div className="text-center">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Mot de passe mis à jour</h2>
              <p className="text-slate-400 mb-6">Votre mot de passe a été réinitialisé avec succès.</p>
              <a
                href="/"
                className="inline-block w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all text-center"
              >
                Se connecter
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Nouveau mot de passe</h2>
              <p className="text-slate-400 mb-6">Choisissez un nouveau mot de passe pour votre compte.</p>

              {!sessionReady && (
                <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-300 text-sm mb-4">
                  Chargement de la session... Si cette page ne se charge pas, le lien a peut-être expiré.
                  <a href="/" className="underline ml-1">Réessayer</a>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={inputClass}
                    placeholder="Nouveau mot de passe (8 car. min)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    aria-label="Nouveau mot de passe"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={inputClass}
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  aria-label="Confirmer le mot de passe"
                  autoComplete="new-password"
                />
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || !sessionReady}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
