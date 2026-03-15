import React, { useState, useEffect } from 'react';
import {
  User, Mail, Lock, Shield, Bell, Palette, LogOut, ChevronRight,
  Eye, EyeOff, Check, AlertCircle, Smartphone, Globe, Moon, Sun,
  ArrowLeft, Save, Loader2, Key, Trash2, Download, CreditCard,
} from 'lucide-react';
import { auth, isDemo } from '../supabaseClient';
import supabase from '../supabaseClient';
import { useData } from '../context/DataContext';
import { useSubscriptionStore } from '../stores/subscriptionStore';

/**
 * Page profil utilisateur — infos personnelles, sécurité, préférences, gestion compte.
 */
export default function UserProfile({ isDark, couleur, showToast, user, setPage, onLogout }) {
  const { clients, devis, chantiers, depenses, pointages, equipe, catalogue } = useData();
  const openBillingPortal = useSubscriptionStore((s) => s.openBillingPortal);
  const planId = useSubscriptionStore((s) => s.planId);
  const subscription = useSubscriptionStore((s) => s.subscription);

  const [activeTab, setActiveTab] = useState('infos');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Preferences (read from localStorage)
  const [emailNotifs, setEmailNotifs] = useState(() => {
    try { return localStorage.getItem('bg_email_notifs') !== 'false'; } catch { return true; }
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Theme vars
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const sectionBg = isDark ? 'bg-slate-700/50' : 'bg-slate-50';

  const tabs = [
    { id: 'infos', label: 'Informations', icon: User },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'preferences', label: 'Préférences', icon: Bell },
    { id: 'account', label: 'Compte', icon: Key },
  ];

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('Le mot de passe doit contenir au moins 8 caractères', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    if (isDemo) {
      showToast('Mot de passe mis à jour (mode démo)', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('Mot de passe mis à jour avec succès', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showToast(error.message || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle email notifications
  const toggleEmailNotifs = (val) => {
    setEmailNotifs(val);
    try { localStorage.setItem('bg_email_notifs', val.toString()); } catch {}
    showToast(val ? 'Notifications email activées' : 'Notifications email désactivées', 'success');
  };

  // Initials from email
  const initials = user?.email?.charAt(0).toUpperCase() || 'U';
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPage('dashboard')}
          className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors`}
        >
          <ArrowLeft size={20} className={textMuted} />
        </button>
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${textPrimary}`}>Mon profil</h1>
          <p className={`text-sm ${textMuted}`}>Gérez vos informations personnelles</p>
        </div>
      </div>

      {/* Avatar card */}
      <div className={`rounded-2xl border ${cardBg} p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4`}>
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg"
          style={{ background: couleur }}
        >
          {initials}
        </div>
        <div className="text-center sm:text-left flex-1">
          <p className={`text-lg font-semibold ${textPrimary}`}>{user?.email || 'utilisateur@demo.fr'}</p>
          <p className={`text-sm ${textMuted}`}>Membre depuis le {createdAt}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'text-white shadow-md'
                  : `${textMuted} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`
              }`}
              style={isActive ? { background: couleur } : {}}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
        {/* Informations tab */}
        {activeTab === 'infos' && (
          <div className="p-4 sm:p-6 space-y-4">
            <h2 className={`text-base font-semibold ${textPrimary}`}>Informations personnelles</h2>

            <div className="space-y-3">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>Adresse email</label>
                <div className={`flex items-center gap-2 p-3 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <Mail size={16} className={textMuted} />
                  <span className={textPrimary}>{user?.email || 'utilisateur@demo.fr'}</span>
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>L'email est utilisé pour la connexion et ne peut pas être modifié ici.</p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>Identifiant utilisateur</label>
                <div className={`flex items-center gap-2 p-3 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <User size={16} className={textMuted} />
                  <span className={`${textMuted} font-mono text-xs`}>{user?.id?.slice(0, 8) || 'demo-user'}…</span>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>Fournisseur d'authentification</label>
                <div className={`flex items-center gap-2 p-3 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <Shield size={16} className={textMuted} />
                  <span className={textPrimary}>{user?.app_metadata?.provider === 'google' ? 'Google' : 'Email / Mot de passe'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="p-4 sm:p-6 space-y-4">
            <h2 className={`text-base font-semibold ${textPrimary}`}>Changer le mot de passe</h2>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>Mot de passe actuel</label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full p-3 pr-10 rounded-xl border text-sm ${inputBg}`}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted}`}
                  >
                    {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full p-3 pr-10 rounded-xl border text-sm ${inputBg}`}
                    placeholder="Minimum 8 caractères"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted}`}
                  >
                    {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPassword && newPassword.length < 8 && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Minimum 8 caractères
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-sm ${inputBg}`}
                  placeholder="Retapez le mot de passe"
                  required
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity"
                style={{ background: couleur }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Mettre à jour
              </button>
            </form>

            <div className={`mt-6 p-4 rounded-xl ${sectionBg}`}>
              <h3 className={`text-sm font-semibold mb-2 ${textPrimary}`}>Sessions actives</h3>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-600' : 'bg-white border border-slate-200'}`}>
                  <Globe size={18} className={textMuted} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${textPrimary}`}>Session actuelle</p>
                  <p className={`text-xs ${textMuted}`}>Navigateur web — {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex items-center gap-1 text-green-500 text-xs">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Active
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preferences tab */}
        {activeTab === 'preferences' && (
          <div className="p-4 sm:p-6 space-y-4">
            <h2 className={`text-base font-semibold ${textPrimary}`}>Préférences</h2>

            <div className="space-y-3">
              {/* Email notifications */}
              <div className={`flex items-center justify-between p-4 rounded-xl ${sectionBg}`}>
                <div className="flex items-center gap-3">
                  <Bell size={18} style={{ color: couleur }} />
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Notifications par email</p>
                    <p className={`text-xs ${textMuted}`}>Recevez les alertes de relance et rappels</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleEmailNotifs(!emailNotifs)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${emailNotifs ? '' : (isDark ? 'bg-slate-600' : 'bg-slate-300')}`}
                  style={emailNotifs ? { background: couleur } : {}}
                >
                  <span className={`absolute top-0.5 ${emailNotifs ? 'right-0.5' : 'left-0.5'} w-5 h-5 rounded-full bg-white shadow transition-all`} />
                </button>
              </div>

              {/* Theme info */}
              <div className={`flex items-center justify-between p-4 rounded-xl ${sectionBg}`}>
                <div className="flex items-center gap-3">
                  {isDark ? <Moon size={18} style={{ color: couleur }} /> : <Sun size={18} style={{ color: couleur }} />}
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Thème</p>
                    <p className={`text-xs ${textMuted}`}>{isDark ? 'Mode sombre activé' : 'Mode clair activé'}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg ${isDark ? 'bg-slate-600' : 'bg-slate-200'} ${textMuted}`}>
                  Paramètres
                </span>
              </div>

              {/* Accent color */}
              <div className={`flex items-center justify-between p-4 rounded-xl ${sectionBg}`}>
                <div className="flex items-center gap-3">
                  <Palette size={18} style={{ color: couleur }} />
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>Couleur d'accent</p>
                    <p className={`text-xs ${textMuted}`}>Personnalisable dans Paramètres</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ background: couleur }} />
              </div>
            </div>

            <p className={`text-xs ${textMuted}`}>
              Le thème et la couleur se modifient dans{' '}
              <button onClick={() => setPage('settings')} className="underline" style={{ color: couleur }}>
                Paramètres
              </button>.
            </p>
          </div>
        )}

        {/* Account tab */}
        {activeTab === 'account' && (
          <div className="p-4 sm:p-6 space-y-4">
            <h2 className={`text-base font-semibold ${textPrimary}`}>Gestion du compte</h2>

            {/* Billing / Subscription */}
            {planId !== 'gratuit' && subscription?.stripeCustomerId && (
              <button
                onClick={async () => {
                  try {
                    const result = await openBillingPortal();
                    if (result?.demo) showToast('Mode démo : pas de portail Stripe', 'info');
                  } catch (err) {
                    showToast('Erreur d\'ouverture du portail de facturation', 'error');
                  }
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                  isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CreditCard size={18} style={{ color: couleur }} />
                <div className="text-left flex-1">
                  <p className={`text-sm font-medium ${textPrimary}`}>Gérer mon abonnement</p>
                  <p className={`text-xs ${textMuted}`}>Factures, moyen de paiement, annulation</p>
                </div>
                <ChevronRight size={16} className={textMuted} />
              </button>
            )}

            {/* GDPR Data Export */}
            <button
              onClick={async () => {
                setExporting(true);
                try {
                  const exportData = {
                    exportDate: new Date().toISOString(),
                    user: { email: user?.email, id: user?.id },
                    clients: clients || [],
                    devis: devis || [],
                    chantiers: chantiers || [],
                    depenses: depenses || [],
                    pointages: pointages || [],
                    equipe: equipe || [],
                    catalogue: catalogue || [],
                  };
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `batigesti-export-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  showToast('Données exportées avec succès', 'success');
                } catch (err) {
                  showToast('Erreur lors de l\'export', 'error');
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              {exporting ? <Loader2 size={18} className={`${textMuted} animate-spin`} /> : <Download size={18} style={{ color: couleur }} />}
              <div className="text-left flex-1">
                <p className={`text-sm font-medium ${textPrimary}`}>Exporter mes données (RGPD)</p>
                <p className={`text-xs ${textMuted}`}>Télécharger toutes vos données au format JSON</p>
              </div>
              <ChevronRight size={16} className={textMuted} />
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <LogOut size={18} className={textMuted} />
              <div className="text-left flex-1">
                <p className={`text-sm font-medium ${textPrimary}`}>Se déconnecter</p>
                <p className={`text-xs ${textMuted}`}>Fermer la session en cours</p>
              </div>
              <ChevronRight size={16} className={textMuted} />
            </button>

            {/* Danger zone */}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
              <h3 className="text-sm font-semibold text-red-500 mb-3">Zone de danger</h3>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-500 text-sm border border-red-300 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                  Supprimer mon compte
                </button>
              ) : (
                <div className={`p-4 rounded-xl border border-red-300 ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                  <p className={`text-sm mb-3 ${textPrimary}`}>
                    Pour demander la suppression définitive de votre compte et de toutes vos données (conformément à l'article 17 du RGPD),
                    contactez <a href="mailto:contact@batigesti.fr" className="underline" style={{ color: couleur }}>contact@batigesti.fr</a>.
                    Nous traiterons votre demande sous 30 jours.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-slate-700' : 'bg-slate-200'} ${textMuted}`}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
