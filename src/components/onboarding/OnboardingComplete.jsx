import { useState, useEffect } from 'react';
import { Trophy, ArrowRight, Gift, Sparkles, Star } from 'lucide-react';

/**
 * Celebration Screen - Make users feel accomplished
 * Goal: Create joy and excitement to start using the app
 */
export default function OnboardingComplete({
  userData,
  onComplete,
  isDark = false,
  couleur = '#f97316'
}) {
  const [showContent, setShowContent] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Generate confetti
    const particles = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
      size: 6 + Math.random() * 12,
      color: ['#f97316', '#ef4444', '#eab308', '#22c55e', '#3b82f6', '#a855f7'][Math.floor(Math.random() * 6)],
      rotation: Math.random() * 360
    }));
    setConfetti(particles);

    // Generate stars
    const starParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      delay: Math.random() * 2,
      size: 8 + Math.random() * 16
    }));
    setStars(starParticles);

    // Show content with delay
    setTimeout(() => setShowContent(true), 500);
  }, []);

  return (
    <div className={`fixed inset-0 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-orange-500 to-red-600'} overflow-hidden`}>
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-confetti-celebration"
            style={{
              left: `${particle.x}%`,
              top: '-5%',
              width: particle.size,
              height: particle.size * 0.6,
              backgroundColor: particle.color,
              borderRadius: '2px',
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              transform: `rotate(${particle.rotation}deg)`
            }}
          />
        ))}
      </div>

      {/* Floating stars */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute animate-twinkle"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              animationDelay: `${star.delay}s`
            }}
          >
            <Star
              className="text-yellow-300"
              style={{ width: star.size, height: star.size }}
              fill="currentColor"
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* Trophy */}
        <div
          className={`transition-all duration-700 ${
            showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        >
          <div className="relative">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <Trophy className="w-16 h-16 text-yellow-300" />
            </div>

            {/* Glow effect */}
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-50 animate-pulse"
              style={{ backgroundColor: 'rgba(255,200,0,0.4)' }}
            />
          </div>
        </div>

        {/* Title */}
        <div
          className={`transition-all duration-700 delay-200 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            🎉 Félicitations !
          </h1>
          <p className="text-xl text-white/90 mb-2">
            Votre ChantierPro est prêt
          </p>
          <p className="text-white/70">
            Vous allez gagner <span className="font-bold text-yellow-300">15 heures par semaine</span>
          </p>
        </div>

        {/* User info recap */}
        <div
          className={`mt-8 p-4 rounded-2xl transition-all duration-700 delay-400 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl">
              {userData?.metier === 'plombier' ? '🔧' :
               userData?.metier === 'electricien' ? '⚡' :
               userData?.metier === 'macon' ? '🧱' :
               userData?.metier === 'peintre' ? '🎨' :
               userData?.metier === 'menuisier' ? '🪵' :
               userData?.metier === 'carreleur' ? '⬜' :
               userData?.metier === 'chauffagiste' ? '🔥' :
               userData?.metier === 'couvreur' ? '🏠' : '🔨'}
            </div>
            <div className="text-left">
              <p className="font-semibold">{userData?.entreprise || 'Mon entreprise'}</p>
              <p className="text-sm text-white/70">
                {userData?.prenom} {userData?.nom}
              </p>
            </div>
          </div>
        </div>

        {/* Special offer badge */}
        <div
          className={`mt-6 transition-all duration-700 delay-500 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400 text-yellow-900 font-semibold animate-pulse">
            <Gift className="w-5 h-5" />
            <span>Offre de lancement : 19€/mois à vie (au lieu de 29€)</span>
          </div>
        </div>

        {/* CTA */}
        <div
          className={`mt-10 transition-all duration-700 delay-700 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <button
            onClick={onComplete}
            className="group px-8 py-4 bg-white text-gray-900 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-3"
          >
            <span>Ouvrir mon dashboard</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* What's next preview */}
        <div
          className={`mt-12 transition-all duration-700 delay-900 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-white/60 text-sm mb-4">Prochaines étapes suggérées :</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: '📝', label: 'Créer mon 1er devis' },
              { icon: '👤', label: 'Ajouter un client' },
              { icon: '⚙️', label: 'Compléter mes infos' }
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(5px)'
                }}
              >
                <span>{item.icon}</span>
                <span className="text-white/80 text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes confetti-celebration {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }

        .animate-confetti-celebration {
          animation: confetti-celebration ease-out infinite;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
}
