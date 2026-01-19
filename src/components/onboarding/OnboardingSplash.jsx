import { useState, useEffect } from 'react';
import { Rocket, Zap, Clock, CheckCircle, ChevronRight } from 'lucide-react';

/**
 * Splash Screen - Creates the "wow effect" immediately
 * Goal: Make users fall in love with the app in 5 seconds
 */
export default function OnboardingSplash({
  onStart,
  onSkip,
  isDark = false,
  couleur = '#f97316'
}) {
  const [showLogo, setShowLogo] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showBadges, setShowBadges] = useState([false, false, false]);
  const [showCTA, setShowCTA] = useState(false);
  const [confetti, setConfetti] = useState([]);

  // Staggered animations
  useEffect(() => {
    // Logo appears
    setTimeout(() => setShowLogo(true), 100);

    // Tagline appears
    setTimeout(() => setShowTagline(true), 600);

    // Badges appear one by one
    setTimeout(() => setShowBadges([true, false, false]), 1000);
    setTimeout(() => setShowBadges([true, true, false]), 1300);
    setTimeout(() => setShowBadges([true, true, true]), 1600);

    // CTA appears
    setTimeout(() => setShowCTA(true), 2000);

    // Generate confetti
    const particles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
      size: 4 + Math.random() * 8,
      color: ['#f97316', '#ef4444', '#eab308', '#22c55e', '#3b82f6'][Math.floor(Math.random() * 5)]
    }));
    setConfetti(particles);
  }, []);

  const badges = [
    { icon: Zap, text: 'Devis en 3 min', color: '#f97316' },
    { icon: Clock, text: '20h/mois économisées', color: '#22c55e' },
    { icon: CheckCircle, text: '100% conforme légal FR', color: '#3b82f6' }
  ];

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: `linear-gradient(135deg, ${couleur} 0%, #dc2626 50%, ${couleur} 100%)`,
          backgroundSize: '400% 400%',
          animation: 'gradientShift 8s ease infinite'
        }}
      />

      {/* Confetti particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-confetti-fall"
            style={{
              left: `${particle.x}%`,
              top: '-20px',
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: particle.size > 8 ? '2px' : '50%',
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              opacity: 0.8
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">

        {/* Logo with animation */}
        <div
          className={`transition-all duration-700 ease-out ${
            showLogo
              ? 'opacity-100 scale-100 rotate-0'
              : 'opacity-0 scale-50 -rotate-12'
          }`}
        >
          {/* Construction icon */}
          <div className="relative mb-6">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl mx-auto"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <span className="text-6xl animate-bounce-gentle">🏗️</span>
            </div>
            {/* Glow effect */}
            <div
              className="absolute inset-0 rounded-3xl blur-xl opacity-50"
              style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
            />
          </div>

          {/* App name */}
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
            Chantier<span className="text-yellow-300">Pro</span>
          </h1>
        </div>

        {/* Tagline */}
        <div
          className={`transition-all duration-500 ease-out ${
            showTagline
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-xl text-white/90 mb-2 font-medium">
            Gérez vos chantiers. Pas votre paperasse.
          </p>
          <p className="text-white/70 text-lg">
            L'application qui vous fait gagner <span className="font-bold text-yellow-300">15 heures par semaine</span>
          </p>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-3 mt-8 mb-10">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <div
                key={index}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-500 ease-out ${
                  showBadges[index]
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-4 scale-90'
                }`}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  transitionDelay: `${index * 100}ms`
                }}
              >
                <Icon className="w-5 h-5" style={{ color: badge.color }} />
                <span className="text-white font-medium text-sm">{badge.text}</span>
              </div>
            );
          })}
        </div>

        {/* CTA Buttons */}
        <div
          className={`transition-all duration-500 ease-out ${
            showCTA
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Main CTA */}
          <button
            onClick={onStart}
            className="group relative px-8 py-4 bg-white text-gray-900 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
          >
            <span>Découvrir en 60 secondes</span>
            <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />

            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-2xl animate-ping-slow bg-white/30" />
          </button>

          {/* Skip link */}
          <button
            onClick={onSkip}
            className="mt-6 text-white/60 hover:text-white/90 text-sm font-medium transition-colors flex items-center gap-1 mx-auto"
          >
            Passer l'introduction
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-confetti-fall {
          animation: confetti-fall linear infinite;
        }

        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }

        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.5; }
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
