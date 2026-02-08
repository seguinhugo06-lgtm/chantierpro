/**
 * LandingPage.jsx
 *
 * Marketing landing page for ChantierPro.
 * Shown to unauthenticated visitors. Includes hero, features,
 * testimonials, pricing CTA, and footer.
 */
import React, { useState } from 'react';
import {
  FileText, Building2, Calendar, Users, Wallet, ShieldCheck,
  CheckCircle, ArrowRight, Star, ChevronDown, ChevronUp,
  Smartphone, Zap, Clock, BarChart3, PenTool, Package
} from 'lucide-react';

const FEATURES = [
  { icon: FileText, title: 'Devis & Factures', desc: 'Créez des devis professionnels en 2 minutes avec mentions légales automatiques.' },
  { icon: Building2, title: 'Gestion de chantiers', desc: 'Suivez l\u2019avancement, les dépenses et la rentabilité de chaque projet.' },
  { icon: Calendar, title: 'Planning équipe', desc: 'Planifiez vos équipes, gérez les pointages et le coût horaire.' },
  { icon: Wallet, title: 'Trésorerie', desc: 'Vision en temps réel de votre trésorerie, prévisions et alertes.' },
  { icon: ShieldCheck, title: 'Conformité légale', desc: 'Mentions légales, assurance décennale, attestations URSSAF intégrées.' },
  { icon: PenTool, title: 'Signature électronique', desc: 'Faites signer vos devis en ligne avec traçabilité complète.' },
  { icon: Users, title: 'Sous-traitants', desc: 'Gérez vos sous-traitants, vérifiez leur conformité en un clic.' },
  { icon: Package, title: 'Catalogue & stocks', desc: 'Bibliothèque d\u2019ouvrages, suivi des stocks et prix fournisseurs.' },
  { icon: BarChart3, title: 'Analytique', desc: 'Tableaux de bord, KPI et rapports pour piloter votre activité.' },
];

const TESTIMONIALS = [
  { name: 'Jean-Pierre M.', role: 'Maçon, Toulouse', text: 'Je gagne au moins 5 heures par semaine sur mes devis. L\u2019outil est simple et vraiment adapté au BTP.', stars: 5 },
  { name: 'Sophie L.', role: 'Électricienne, Lyon', text: 'Mes factures partent le jour même. Le portail client a impressionné mes clients particuliers.', stars: 5 },
  { name: 'Marc D.', role: 'Plombier, Paris', text: 'Enfin un outil abordable et complet. Le suivi de trésorerie m\u2019a évité des problèmes de trésorerie.', stars: 4 },
];

const FAQ = [
  { q: 'Puis-je essayer gratuitement\u00a0?', a: 'Oui\u00a0! Le plan Découverte est 100% gratuit, sans limite de durée. Vous pouvez créer jusqu\u2019à 3 devis et gérer 5 clients.' },
  { q: 'Mes données sont-elles sécurisées\u00a0?', a: 'Absolument. Vos données sont hébergées en Europe (Supabase), chiffrées en transit et au repos, avec sauvegarde quotidienne.' },
  { q: 'L\u2019application fonctionne-t-elle hors-ligne\u00a0?', a: 'Oui, ChantierPro est une PWA. Vous pouvez consulter vos données et créer des documents même sans connexion.' },
  { q: 'Est-ce conforme à la réglementation française\u00a0?', a: 'Oui. Mentions légales obligatoires, TVA détaillée, droit de rétractation, numérotation séquentielle... tout est intégré.' },
];

export default function LandingPage({ onLogin, onSignUp, onNavigate, couleur = '#f97316' }) {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ─── Navigation ─── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: couleur }}>CP</div>
            <span className="text-xl font-bold" style={{ color: couleur }}>ChantierPro</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Connexion
            </button>
            <button
              onClick={onSignUp}
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all hover:shadow-lg"
              style={{ background: couleur }}
            >
              Essai gratuit
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 30% 50%, ${couleur}, transparent 70%)` }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 text-orange-700 text-sm font-medium mb-6">
            <Zap size={14} />
            <span>Solution n°1 pour artisans du BTP</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            Gérez vos chantiers<br />
            <span style={{ color: couleur }}>comme un pro</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Devis, factures, planning, trésorerie, équipe... tout en une seule plateforme
            conçue spécialement pour les artisans du bâtiment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onSignUp}
              className="w-full sm:w-auto px-8 py-3.5 text-white font-semibold rounded-xl text-lg flex items-center justify-center gap-2 hover:shadow-xl transition-all"
              style={{ background: couleur }}
            >
              Commencer gratuitement <ArrowRight size={18} />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle size={16} className="text-green-500" />
              <span>Pas de carte bancaire requise</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: '2 min', label: 'pour créer un devis' },
              { value: '100%', label: 'conforme légalement' },
              { value: 'PWA', label: 'fonctionne hors-ligne' },
              { value: '0\u20ac', label: 'pour démarrer' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold" style={{ color: couleur }}>{s.value}</p>
                <p className="text-sm text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">Des outils professionnels pour gérer votre activité de A à Z.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${couleur}15`, color: couleur }}>
                  <f.icon size={20} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple comme 1-2-3</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Inscrivez-vous', desc: 'Créez votre compte en 30 secondes. Aucune carte bancaire requise.' },
              { step: '2', title: 'Configurez', desc: 'Ajoutez votre logo, vos infos légales et vos premiers clients.' },
              { step: '3', title: 'Produisez', desc: 'Créez vos devis, gérez vos chantiers et suivez votre trésorerie.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-2xl text-white font-bold text-xl flex items-center justify-center mx-auto mb-4" style={{ background: couleur }}>
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ils nous font confiance</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-4 italic">&laquo;&nbsp;{t.text}&nbsp;&raquo;</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-slate-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">Questions fréquentes</h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-medium hover:bg-slate-50 transition-colors"
                >
                  <span>{item.q}</span>
                  {openFaq === i ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="rounded-3xl p-8 sm:p-12 text-white" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Prêt à simplifier votre gestion&nbsp;?</h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Rejoignez les artisans qui gagnent du temps chaque jour avec ChantierPro.
            </p>
            <button
              onClick={onSignUp}
              className="px-8 py-3.5 bg-white font-semibold rounded-xl text-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
              style={{ color: couleur }}
            >
              Commencer maintenant <ArrowRight size={18} />
            </button>
            <p className="text-white/60 text-sm mt-4">Gratuit, sans engagement</p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: couleur }}>CP</div>
                <span className="text-lg font-bold">ChantierPro</span>
              </div>
              <p className="text-slate-400 text-sm">La solution de gestion pour les artisans du bâtiment.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Produit</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button className="hover:text-white transition-colors">Fonctionnalités</button></li>
                <li><button onClick={() => { /* scroll to pricing */ }} className="hover:text-white transition-colors">Tarifs</button></li>
                <li><button onClick={() => onNavigate?.('changelog')} className="hover:text-white transition-colors">Changelog</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Légal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button onClick={() => onNavigate?.('cgv')} className="hover:text-white transition-colors">CGV</button></li>
                <li><button onClick={() => onNavigate?.('mentions-legales')} className="hover:text-white transition-colors">Mentions légales</button></li>
                <li><button onClick={() => onNavigate?.('confidentialite')} className="hover:text-white transition-colors">Confidentialité</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Contact</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="mailto:contact@chantierpro.fr" className="hover:text-white transition-colors">contact@chantierpro.fr</a></li>
                <li><button className="hover:text-white transition-colors">Support</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-6 text-center text-slate-500 text-sm">
            <p>&copy; {new Date().getFullYear()} ChantierPro. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
