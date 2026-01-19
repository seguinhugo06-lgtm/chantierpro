import { useState, useEffect } from 'react';
import {
  FileText, CreditCard, PieChart, Wifi, WifiOff, Shield, Check,
  ChevronRight, X, Play, Pause, RotateCcw, Zap, Clock, QrCode,
  Smartphone, CheckCircle, AlertTriangle, Signal, SignalZero
} from 'lucide-react';

/**
 * Interactive Tour - 5 mini-demos of 10 seconds each
 * Goal: Make users EXPERIENCE the "Aha!" moments
 */
export default function OnboardingTour({
  onComplete,
  onSkip,
  isDark = false,
  couleur = '#f97316'
}) {
  const [currentDemo, setCurrentDemo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [demoProgress, setDemoProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Demo data
  const demos = [
    {
      id: 'devis',
      title: 'Créez un devis en 3 minutes',
      subtitle: '(Pas 30 minutes comme avant)',
      userStory: 'Jean, plombier, crée son devis pour une rénovation de SDB pendant qu\'il boit son café ☕',
      before: { label: 'AVANT', value: '20-30 min perdues', color: '#ef4444' },
      after: { label: 'APRÈS', value: '3 minutes', color: '#22c55e' },
      gain: '💰 17 min gagnées × 10 devis/mois = 2h50/mois',
      icon: FileText,
      color: '#f97316'
    },
    {
      id: 'paiement',
      title: 'Encaissez l\'acompte sur place',
      subtitle: 'Le client paie par CB en 10 secondes',
      userStory: 'Sophie, électricienne, fait signer le devis puis génère un QR Code. Le client paie instantanément.',
      before: { label: 'AVANT', value: 'Virement J+3', color: '#ef4444' },
      after: { label: 'APRÈS', value: 'Paiement immédiat', color: '#22c55e' },
      gain: '🎯 Trésorerie sécurisée à 100%',
      icon: CreditCard,
      color: '#10b981'
    },
    {
      id: 'marge',
      title: 'Suivez vos marges en temps réel',
      subtitle: 'Sachez si vous gagnez vraiment de l\'argent',
      userStory: 'Marc, chef d\'entreprise, voit que son chantier est à 12% de marge. Il ajuste ses prix pour les prochains devis.',
      before: { label: 'AVANT', value: 'Marge approximative', color: '#ef4444' },
      after: { label: 'APRÈS', value: 'Visibilité totale', color: '#22c55e' },
      gain: '📊 +10% de marges globales',
      icon: PieChart,
      color: '#8b5cf6'
    },
    {
      id: 'offline',
      title: 'Travaillez partout, même sans réseau',
      subtitle: 'Cave, sous-sol, campagne : ça marche toujours',
      userStory: 'Léa, peintre, crée un devis dans une maison en rénovation sans WiFi. Tout se synchronise automatiquement.',
      before: { label: 'AVANT', value: 'Bloqué sans 4G', color: '#ef4444' },
      after: { label: 'APRÈS', value: '100% autonome', color: '#22c55e' },
      gain: '🚀 Zéro friction',
      icon: Wifi,
      color: '#3b82f6'
    },
    {
      id: 'legal',
      title: '100% conforme aux normes françaises',
      subtitle: 'SIRET, TVA, garanties décennales... automatique',
      userStory: 'Tous vos devis incluent automatiquement TOUTES les mentions légales obligatoires.',
      before: { label: 'AVANT', value: 'Risque amende 5-10k€', color: '#ef4444' },
      after: { label: 'APRÈS', value: '0 risque', color: '#22c55e' },
      gain: '😌 Sérénité totale',
      icon: Shield,
      color: '#f59e0b'
    }
  ];

  // Auto-advance demo progress
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setDemoProgress(prev => {
        if (prev >= 100) {
          // Move to next demo or complete
          if (currentDemo < demos.length - 1) {
            setCurrentDemo(c => c + 1);
            return 0;
          } else {
            setIsPlaying(false);
            setShowConfetti(true);
            return 100;
          }
        }
        return prev + 2; // 2% every 100ms = 5 seconds per demo
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, currentDemo, demos.length]);

  // Show confetti when complete
  useEffect(() => {
    if (showConfetti) {
      setTimeout(() => onComplete(), 2000);
    }
  }, [showConfetti, onComplete]);

  const handleDemoClick = (index) => {
    setCurrentDemo(index);
    setDemoProgress(0);
    setIsPlaying(true);
  };

  const currentDemoData = demos[currentDemo];
  const Icon = currentDemoData.icon;

  return (
    <div className={`fixed inset-0 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Progress dots */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {demos.map((demo, index) => (
          <button
            key={demo.id}
            onClick={() => handleDemoClick(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentDemo
                ? 'w-8'
                : index < currentDemo
                ? 'bg-green-500'
                : isDark
                ? 'bg-gray-600'
                : 'bg-gray-300'
            }`}
            style={index === currentDemo ? { backgroundColor: currentDemoData.color } : {}}
          />
        ))}
      </div>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className={`absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-lg z-20 transition-colors ${
          isDark
            ? 'text-gray-400 hover:text-white hover:bg-gray-800'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
        }`}
      >
        <span className="text-sm">Passer</span>
        <X className="w-4 h-4" />
      </button>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-20">
        {/* Demo visualization */}
        <div className="w-full max-w-lg mb-8">
          <DemoVisualization
            demo={currentDemoData}
            progress={demoProgress}
            isDark={isDark}
            couleur={couleur}
          />
        </div>

        {/* Demo info */}
        <div className="text-center max-w-lg">
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${currentDemoData.color}20` }}
          >
            <Icon className="w-8 h-8" style={{ color: currentDemoData.color }} />
          </div>

          {/* Title */}
          <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {currentDemoData.title}
          </h2>
          <p className={`text-lg mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {currentDemoData.subtitle}
          </p>

          {/* User story */}
          <div
            className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}
          >
            <p className={`text-sm italic ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              "{currentDemoData.userStory}"
            </p>
          </div>

          {/* Before/After */}
          <div className="flex gap-4 justify-center mb-4">
            <div className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <span className="text-xs font-medium text-gray-500">{currentDemoData.before.label}</span>
              <p className="font-semibold" style={{ color: currentDemoData.before.color }}>
                {currentDemoData.before.value}
              </p>
            </div>
            <div className="flex items-center">
              <ChevronRight className={isDark ? 'text-gray-600' : 'text-gray-400'} />
            </div>
            <div className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <span className="text-xs font-medium text-gray-500">{currentDemoData.after.label}</span>
              <p className="font-semibold" style={{ color: currentDemoData.after.color }}>
                {currentDemoData.after.value}
              </p>
            </div>
          </div>

          {/* Gain */}
          <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {currentDemoData.gain}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md mt-8">
          <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <div
              className="h-full transition-all duration-100 rounded-full"
              style={{
                width: `${demoProgress}%`,
                backgroundColor: currentDemoData.color
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={() => { setDemoProgress(0); setIsPlaying(true); }}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
          >
            <RotateCcw className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 rounded-full text-white"
            style={{ backgroundColor: currentDemoData.color }}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>

          <button
            onClick={() => {
              if (currentDemo < demos.length - 1) {
                setCurrentDemo(c => c + 1);
                setDemoProgress(0);
                setIsPlaying(true);
              } else {
                onComplete();
              }
            }}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
          >
            <ChevronRight className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Demo counter */}
        <p className={`text-sm mt-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {currentDemo + 1} / {demos.length}
        </p>
      </div>

      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center animate-scale-in">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-3xl font-bold text-white mb-2">Maintenant c'est à vous !</h2>
            <p className="text-white/70">En 2 minutes, personnalisez votre ChantierPro</p>
          </div>
        </div>
      )}

      <style>{`
        .animate-scale-in {
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/**
 * Demo-specific visualizations
 */
function DemoVisualization({ demo, progress, isDark, couleur }) {
  switch (demo.id) {
    case 'devis':
      return <DevisDemo progress={progress} isDark={isDark} couleur={couleur} />;
    case 'paiement':
      return <PaiementDemo progress={progress} isDark={isDark} couleur={couleur} />;
    case 'marge':
      return <MargeDemo progress={progress} isDark={isDark} couleur={couleur} />;
    case 'offline':
      return <OfflineDemo progress={progress} isDark={isDark} couleur={couleur} />;
    case 'legal':
      return <LegalDemo progress={progress} isDark={isDark} couleur={couleur} />;
    default:
      return null;
  }
}

function DevisDemo({ progress, isDark, couleur }) {
  const steps = [
    { text: 'Client : Martin Dupont', threshold: 20 },
    { text: 'Template : Rénovation SDB', threshold: 40 },
    { text: 'Démolition carrelage...', threshold: 55 },
    { text: 'Plomberie complète...', threshold: 70 },
    { text: 'Total : 4 850,00 € TTC', threshold: 85 },
  ];

  return (
    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Nouveau devis
        </span>
        {progress > 95 && (
          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full animate-bounce">
            PDF généré !
          </span>
        )}
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg transition-all duration-300 ${
              progress >= step.threshold
                ? isDark
                  ? 'bg-gray-700 opacity-100'
                  : 'bg-gray-100 opacity-100'
                : 'opacity-30'
            }`}
            style={{
              transform: progress >= step.threshold ? 'translateX(0)' : 'translateX(-10px)'
            }}
          >
            <div className="flex items-center gap-2">
              {progress >= step.threshold && (
                <Check className="w-4 h-4 text-green-500" />
              )}
              <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                {step.text}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaiementDemo({ progress, isDark, couleur }) {
  const stage = progress < 25 ? 0 : progress < 50 ? 1 : progress < 75 ? 2 : 3;

  return (
    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
      <div className="flex justify-center gap-8">
        {/* Tablet/signature */}
        <div className={`flex flex-col items-center transition-all duration-500 ${stage >= 0 ? 'opacity-100' : 'opacity-30'}`}>
          <div className={`w-20 h-28 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
            {stage === 0 && <span className="text-3xl">✍️</span>}
            {stage >= 1 && <QrCode className="w-12 h-12" style={{ color: couleur }} />}
          </div>
          <span className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {stage === 0 ? 'Signature' : 'QR Code'}
          </span>
        </div>

        {/* Arrow */}
        <div className={`flex items-center transition-all duration-500 ${stage >= 2 ? 'opacity-100' : 'opacity-30'}`}>
          <ChevronRight className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
        </div>

        {/* Phone */}
        <div className={`flex flex-col items-center transition-all duration-500 ${stage >= 2 ? 'opacity-100' : 'opacity-30'}`}>
          <div className={`w-14 h-24 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center border-2 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
            {stage === 2 && <Smartphone className="w-8 h-8" style={{ color: couleur }} />}
            {stage >= 3 && <CheckCircle className="w-8 h-8 text-green-500" />}
          </div>
          <span className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {stage >= 3 ? 'Payé !' : 'Client scanne'}
          </span>
        </div>
      </div>

      {stage >= 3 && (
        <div className="mt-6 p-3 bg-green-500/10 rounded-xl text-center animate-pulse">
          <span className="text-green-500 font-bold">✓ 1 200,00 € reçus</span>
        </div>
      )}
    </div>
  );
}

function MargeDemo({ progress, isDark, couleur }) {
  const chantiers = [
    { nom: 'Réno SDB Dupont', marge: progress > 50 ? 67 : 45, color: '#22c55e' },
    { nom: 'Peinture T3 Martin', marge: progress > 70 ? 28 : 12, color: progress > 70 ? '#eab308' : '#ef4444' },
    { nom: 'Élec maison Bernard', marge: 38, color: '#eab308' }
  ];

  return (
    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
      <div className="space-y-4">
        {chantiers.map((chantier, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{chantier.nom}</span>
              <span className="font-bold" style={{ color: chantier.color }}>
                {chantier.marge}%
                {i === 1 && progress < 70 && (
                  <AlertTriangle className="inline w-4 h-4 ml-1 text-red-500" />
                )}
              </span>
            </div>
            <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${chantier.marge}%`,
                  backgroundColor: chantier.color
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {progress > 70 && (
        <div className="mt-4 p-2 bg-green-500/10 rounded-lg text-center text-sm text-green-500 animate-pulse">
          Marge corrigée : 12% → 28%
        </div>
      )}
    </div>
  );
}

function OfflineDemo({ progress, isDark, couleur }) {
  const isOffline = progress > 20 && progress < 70;
  const isSyncing = progress >= 70 && progress < 90;
  const isSynced = progress >= 90;

  return (
    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
      <div className="flex items-center justify-center gap-8">
        {/* Signal indicator */}
        <div className="flex flex-col items-center">
          {isOffline ? (
            <SignalZero className="w-12 h-12 text-red-500 animate-pulse" />
          ) : (
            <Signal className="w-12 h-12 text-green-500" />
          )}
          <span className={`text-xs mt-2 ${isOffline ? 'text-red-500' : 'text-green-500'}`}>
            {isOffline ? 'Hors ligne' : 'En ligne'}
          </span>
        </div>

        {/* App status */}
        <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-orange-500' : 'bg-green-500'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              ChantierPro
            </span>
          </div>
          <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isSyncing ? '🔄 Synchronisation...' : isSynced ? '✓ Synchronisé' : 'Devis en cours...'}
          </p>
        </div>
      </div>

      {isSynced && (
        <div className="mt-4 text-center">
          <span className="px-3 py-1 bg-green-500 text-white text-sm rounded-full">
            ✓ Tout est sauvegardé
          </span>
        </div>
      )}
    </div>
  );
}

function LegalDemo({ progress, isDark, couleur }) {
  const mentions = [
    { text: 'SIRET 123 456 789 00012', threshold: 15 },
    { text: 'TVA FR12345678901', threshold: 30 },
    { text: 'RC Pro AXA N°RC110', threshold: 45 },
    { text: 'Garantie Décennale', threshold: 60 },
    { text: 'Pénalités de retard 3× taux légal', threshold: 75 },
    { text: 'Droit rétractation 14 jours', threshold: 90 }
  ];

  return (
    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
      <div className="space-y-2">
        {mentions.map((mention, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 transition-all duration-300 ${
              progress >= mention.threshold ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transform: progress >= mention.threshold ? 'translateX(0)' : 'translateX(-20px)'
            }}
          >
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {mention.text}
            </span>
          </div>
        ))}
      </div>

      {progress >= 95 && (
        <div className="mt-4 p-3 bg-green-500 text-white rounded-xl text-center font-bold animate-bounce">
          100% CONFORME
        </div>
      )}
    </div>
  );
}
