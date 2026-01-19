import { useState, useMemo } from 'react';
import {
  X, Search, PlayCircle, MessageCircle, Book, Sparkles,
  FileText, CreditCard, Building2, PieChart, Settings, ChevronRight,
  ThumbsUp, ThumbsDown, ExternalLink, Clock
} from 'lucide-react';

/**
 * Help Center Modal
 * Searchable documentation and support access
 */
export default function HelpCenter({
  isOpen,
  onClose,
  isDark = false,
  couleur = '#f97316'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeArticle, setActiveArticle] = useState(null);
  const [articleFeedback, setArticleFeedback] = useState({});

  // Quick access cards
  const quickAccess = [
    {
      id: 'videos',
      icon: PlayCircle,
      title: 'Tutoriels vidéo',
      description: 'Apprenez en regardant',
      action: 'open_videos',
      color: '#ef4444'
    },
    {
      id: 'contact',
      icon: MessageCircle,
      title: 'Nous contacter',
      description: 'Support direct',
      action: 'open_support',
      color: '#3b82f6'
    },
    {
      id: 'docs',
      icon: Book,
      title: 'Documentation',
      description: 'Guide utilisateur PDF',
      action: 'download_pdf',
      color: '#8b5cf6'
    },
    {
      id: 'updates',
      icon: Sparkles,
      title: 'Nouveautés',
      description: 'Dernières mises à jour',
      action: 'open_changelog',
      color: '#22c55e'
    }
  ];

  // Help articles by category
  const categories = [
    {
      id: 'devis',
      icon: FileText,
      title: 'Devis & Factures',
      articles: [
        { id: 'create-quote', title: 'Comment créer un devis en 3 minutes', duration: '2 min', hasVideo: true },
        { id: 'use-templates', title: 'Comment utiliser les templates métier', duration: '1 min', hasVideo: true },
        { id: 'edit-quote', title: 'Comment éditer un devis existant', duration: '1 min' },
        { id: 'quote-to-invoice', title: 'Comment transformer un devis en facture', duration: '1 min' },
        { id: 'send-email', title: 'Comment envoyer un devis par email', duration: '1 min' },
        { id: 'legal-mentions', title: 'Mentions légales obligatoires sur les devis', duration: '3 min' }
      ]
    },
    {
      id: 'payments',
      icon: CreditCard,
      title: 'Paiements',
      articles: [
        { id: 'qr-payment', title: 'Comment recevoir un acompte par QR Code', duration: '2 min', hasVideo: true },
        { id: 'stripe-setup', title: 'Comment configurer Stripe', duration: '3 min', hasVideo: true },
        { id: 'track-payments', title: 'Comment suivre les paiements reçus', duration: '1 min' },
        { id: 'payment-reminder', title: 'Comment relancer un client pour paiement', duration: '2 min' }
      ]
    },
    {
      id: 'chantiers',
      icon: Building2,
      title: 'Chantiers',
      articles: [
        { id: 'create-project', title: 'Comment créer un nouveau chantier', duration: '2 min' },
        { id: 'track-progress', title: 'Comment suivre l\'avancement d\'un chantier', duration: '2 min' },
        { id: 'photos', title: 'Comment ajouter des photos avant/après', duration: '1 min', hasVideo: true },
        { id: 'project-profitability', title: 'Comment calculer la rentabilité d\'un chantier', duration: '3 min' }
      ]
    },
    {
      id: 'rentability',
      icon: PieChart,
      title: 'Rentabilité',
      articles: [
        { id: 'track-margins', title: 'Comment suivre mes marges en temps réel', duration: '2 min', hasVideo: true },
        { id: 'add-expenses', title: 'Comment ajouter les dépenses d\'un chantier', duration: '2 min' },
        { id: 'time-tracking', title: 'Comment pointer les heures de main d\'œuvre', duration: '2 min' },
        { id: 'dashboard', title: 'Comment lire le dashboard rentabilité', duration: '3 min' }
      ]
    },
    {
      id: 'features',
      icon: Sparkles,
      title: 'Fonctionnalités',
      articles: [
        { id: 'offline-mode', title: 'Comment fonctionne le mode offline', duration: '2 min', hasVideo: true },
        { id: 'e-signature', title: 'Comment faire signer un devis électroniquement', duration: '2 min', hasVideo: true },
        { id: 'accounting', title: 'Comment utiliser l\'intégration comptable', duration: '3 min' },
        { id: 'export-data', title: 'Comment exporter mes données', duration: '2 min' }
      ]
    },
    {
      id: 'settings',
      icon: Settings,
      title: 'Paramètres',
      articles: [
        { id: 'legal-info', title: 'Comment compléter mes informations légales', duration: '3 min' },
        { id: 'templates-custom', title: 'Comment personnaliser mes modèles de documents', duration: '3 min' },
        { id: 'subscription', title: 'Comment gérer mon abonnement', duration: '2 min' },
        { id: 'team', title: 'Comment inviter des collaborateurs', duration: '2 min' }
      ]
    }
  ];

  // Article content (simplified for demo)
  const articleContent = {
    'create-quote': {
      title: 'Comment créer un devis en 3 minutes',
      videoUrl: 'https://example.com/video1',
      steps: [
        'Cliquez sur "Nouveau devis" dans le menu de gauche',
        'Sélectionnez le client ou créez-en un nouveau',
        'Choisissez un template métier (ou partez de zéro)',
        'Ajoutez vos lignes (l\'auto-complétion vous aide)',
        'Vérifiez le total HT et TTC',
        'Cliquez sur "Générer PDF"'
      ],
      tip: 'Utilisez les templates pré-remplis pour aller 10× plus vite !'
    },
    'qr-payment': {
      title: 'Comment recevoir un acompte par QR Code',
      videoUrl: 'https://example.com/video2',
      steps: [
        'Ouvrez un devis signé',
        'Cliquez sur "Recevoir acompte"',
        'Un QR Code s\'affiche automatiquement',
        'Le client scanne avec son téléphone',
        'Il paie par CB sécurisée (Stripe)',
        'Vous recevez une notification de paiement'
      ],
      tip: 'L\'argent arrive sur votre compte en 2-3 jours ouvrés !'
    }
  };

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results = [];

    categories.forEach(category => {
      category.articles.forEach(article => {
        if (article.title.toLowerCase().includes(query)) {
          results.push({ ...article, categoryId: category.id, categoryTitle: category.title });
        }
      });
    });

    return results.slice(0, 8);
  }, [searchQuery, categories]);

  const handleArticleFeedback = (articleId, helpful) => {
    setArticleFeedback(prev => ({ ...prev, [articleId]: helpful }));
    console.log('Analytics: help_center_article_feedback', { articleId, helpful });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          isDark ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div
          className="p-6 text-white"
          style={{ background: `linear-gradient(135deg, ${couleur}, #dc2626)` }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Centre d'aide</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans l'aide... (Ex: comment créer un devis)"
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border border-white/20 focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search results */}
          {searchQuery && searchResults.length > 0 && (
            <div className="mb-6">
              <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {searchResults.length} résultat(s) pour "{searchQuery}"
              </h3>
              <div className="space-y-2">
                {searchResults.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setActiveArticle(article)}
                    className={`w-full p-3 rounded-xl text-left transition-colors flex items-center justify-between ${
                      isDark
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {article.title}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {article.categoryTitle}
                      </p>
                    </div>
                    <ChevronRight className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No search - show quick access and categories */}
          {!searchQuery && !activeArticle && !activeCategory && (
            <>
              {/* Quick access */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {quickAccess.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={`p-4 rounded-xl text-center transition-all hover:scale-105 active:scale-95 ${
                        isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: item.color }} />
                      </div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {item.title}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Categories */}
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Articles par catégorie
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category)}
                      className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] ${
                        isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-6 h-6 mb-2" style={{ color: couleur }} />
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {category.title}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {category.articles.length} articles
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Category view */}
          {activeCategory && !activeArticle && (
            <div>
              <button
                onClick={() => setActiveCategory(null)}
                className={`mb-4 flex items-center gap-2 text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                ← Retour
              </button>

              <h3 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {activeCategory.title}
              </h3>

              <div className="space-y-2">
                {activeCategory.articles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setActiveArticle(article)}
                    className={`w-full p-4 rounded-xl text-left transition-colors flex items-center justify-between ${
                      isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {article.hasVideo && (
                        <PlayCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {article.title}
                        </p>
                        <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          <Clock className="w-3 h-3" />
                          {article.duration}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Article view */}
          {activeArticle && (
            <div>
              <button
                onClick={() => setActiveArticle(null)}
                className={`mb-4 flex items-center gap-2 text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                ← Retour
              </button>

              <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {activeArticle.title}
              </h2>

              {/* Video placeholder */}
              {activeArticle.hasVideo && (
                <div
                  className={`w-full aspect-video rounded-xl mb-6 flex items-center justify-center ${
                    isDark ? 'bg-gray-800' : 'bg-gray-100'
                  }`}
                >
                  <div className="text-center">
                    <PlayCircle className="w-16 h-16 mx-auto mb-2" style={{ color: couleur }} />
                    <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      Tutoriel vidéo disponible
                    </p>
                  </div>
                </div>
              )}

              {/* Article content */}
              {articleContent[activeArticle.id] && (
                <>
                  <div className="space-y-3 mb-6">
                    {articleContent[activeArticle.id].steps.map((step, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          isDark ? 'bg-gray-800' : 'bg-gray-50'
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: couleur }}
                        >
                          {i + 1}
                        </span>
                        <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Tip */}
                  <div
                    className="p-4 rounded-xl mb-6"
                    style={{ backgroundColor: `${couleur}15` }}
                  >
                    <p className="text-sm">
                      <span className="font-semibold" style={{ color: couleur }}>💡 Astuce : </span>
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        {articleContent[activeArticle.id].tip}
                      </span>
                    </p>
                  </div>
                </>
              )}

              {/* Feedback */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <p className={`text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Cet article vous a aidé ?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleArticleFeedback(activeArticle.id, true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      articleFeedback[activeArticle.id] === true
                        ? 'bg-green-500 text-white'
                        : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Oui
                  </button>
                  <button
                    onClick={() => handleArticleFeedback(activeArticle.id, false)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      articleFeedback[activeArticle.id] === false
                        ? 'bg-red-500 text-white'
                        : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Non
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Keyboard shortcut hint */}
        <div className={`px-6 py-3 text-center text-xs border-t ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
          Appuyez sur <kbd className={`px-2 py-0.5 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>Cmd/Ctrl+K</kbd> pour ouvrir l'aide rapidement
        </div>
      </div>
    </div>
  );
}
