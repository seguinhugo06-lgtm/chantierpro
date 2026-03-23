import React from 'react';
import { Globe, Eye, Lock, Phone, Mail, MapPin, Star, Briefcase, Camera, ArrowLeft } from 'lucide-react';

export default function SiteVitrine({ isDark, couleur, entreprise, chantiers = [], catalogue = [], setPage }) {
  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';

  // Extract unique categories from catalogue
  const categories = [...new Set((catalogue || []).map(item => item.categorie).filter(Boolean))].slice(0, 6);

  // Completed chantiers for "Réalisations" section
  const chantiersTermines = (chantiers || []).filter(ch => ch.statut === 'termine' || ch.statut === 'finished').slice(0, 4);

  // Demo data fallbacks
  const nomEntreprise = entreprise?.nom || 'Mon Entreprise';
  const slogan = entreprise?.slogan || 'Artisan du bâtiment de confiance';
  const tel = entreprise?.tel || '01 23 45 67 89';
  const email = entreprise?.email || 'contact@monentreprise.fr';
  const adresse = entreprise?.adresse
    ? `${entreprise.adresse}${entreprise.codePostal ? ', ' + entreprise.codePostal : ''}${entreprise.ville ? ' ' + entreprise.ville : ''}`
    : '12 rue du Bâtiment, 75001 Paris';

  const demoCategories = categories.length > 0 ? categories : ['Plomberie', 'Électricité', 'Peinture', 'Maçonnerie'];
  const demoRealisations = chantiersTermines.length > 0
    ? chantiersTermines.map(ch => ch.nom)
    : ['Rénovation appartement Haussmannien', 'Extension maison individuelle', 'Salle de bain moderne', 'Aménagement combles'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage('dashboard')}
            className={`p-2 rounded-xl border transition-colors ${cardBg} hover:opacity-80`}
            aria-label="Retour au tableau de bord"
          >
            <ArrowLeft size={18} className={textPrimary} />
          </button>
          <div>
            <h1 className={`text-lg sm:text-2xl font-bold ${textPrimary}`}>Mon site web</h1>
            <p className={`text-xs sm:text-sm ${textMuted}`}>Prévisualisez votre mini-site vitrine auto-généré</p>
          </div>
        </div>
        <button
          disabled
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}
          title="Bientôt disponible"
        >
          <Lock size={14} />
          <span className="hidden sm:inline">Publier</span>
          <span className="text-[10px] sm:text-xs font-normal ml-1">(bientôt)</span>
        </button>
      </div>

      {/* Browser mockup frame */}
      <div className={`rounded-2xl border overflow-hidden shadow-lg ${cardBg}`}>
        {/* Browser chrome */}
        <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className={`flex-1 flex items-center gap-2 px-3 py-1 rounded-lg text-xs ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-white text-slate-500'}`}>
            <Globe size={12} />
            <span>{nomEntreprise.toLowerCase().replace(/\s+/g, '-')}.batigesti.fr</span>
          </div>
        </div>

        {/* Site preview content — always light for realistic preview */}
        <div className="bg-white">
          {/* Hero / Header */}
          <div className="p-6 sm:p-10 text-white text-center" style={{ background: couleur }}>
            <h1 className="text-xl sm:text-3xl font-bold mb-2">{nomEntreprise}</h1>
            <p className="text-white/80 text-sm sm:text-base">{slogan}</p>
          </div>

          {/* Services section */}
          <div className="p-5 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase size={18} style={{ color: couleur }} />
              Nos services
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {demoCategories.map((cat, i) => (
                <div key={i} className="p-3 sm:p-4 rounded-xl text-center border border-slate-100 bg-slate-50">
                  <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: `${couleur}15` }}>
                    <Briefcase size={18} style={{ color: couleur }} />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-700">{cat}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Réalisations section */}
          <div className="p-5 sm:p-8 bg-slate-50">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Camera size={18} style={{ color: couleur }} />
              Nos réalisations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demoRealisations.map((realisation, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100">
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${couleur}10` }}>
                    <Camera size={16} style={{ color: couleur }} />
                  </div>
                  <p className="text-sm font-medium text-slate-700">{realisation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Avis section */}
          <div className="p-5 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Star size={18} style={{ color: couleur }} />
              Avis clients
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5 text-yellow-400 text-2xl">
                {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
              </div>
              <p className="text-sm text-slate-600">4.8/5 — 12 avis Google</p>
            </div>
          </div>

          {/* Contact section */}
          <div className="p-5 sm:p-8 bg-slate-50">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Mail size={18} style={{ color: couleur }} />
              Contact
            </h2>
            <div className="space-y-2 text-sm text-slate-700">
              <p className="flex items-center gap-2">
                <Phone size={14} style={{ color: couleur }} />
                {tel}
              </p>
              <p className="flex items-center gap-2">
                <Mail size={14} style={{ color: couleur }} />
                {email}
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={14} style={{ color: couleur }} />
                {adresse}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-8 py-4 text-center text-xs text-slate-400 border-t border-slate-100">
            {nomEntreprise} — Site généré par BatiGesti
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${isDark ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-200'}`}>
        <Eye size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
        <div>
          <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Aperçu uniquement</p>
          <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            Ce mini-site est généré automatiquement à partir de vos données. La publication en ligne arrivera prochainement.
          </p>
        </div>
      </div>
    </div>
  );
}
