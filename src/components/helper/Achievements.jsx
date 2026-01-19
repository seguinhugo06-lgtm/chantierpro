import { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Zap, CreditCard, PieChart, Target, User, Wifi, Star,
  Award, Medal, Crown, Flame, Rocket, Heart, X
} from 'lucide-react';

/**
 * Achievement Toast - Celebration when user accomplishes something
 */
export function AchievementToast({
  achievement,
  onClose,
  isDark = false,
  couleur = '#f97316'
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    // Show with animation
    setTimeout(() => setIsVisible(true), 100);

    // Generate confetti
    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 60,
      delay: Math.random() * 0.5,
      duration: 1 + Math.random() * 1,
      size: 4 + Math.random() * 6,
      color: ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'][Math.floor(Math.random() * 5)]
    }));
    setConfetti(particles);

    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    // Play sound (optional)
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleH5lp/3YfEgWQ5zO0pRsSkZxuePTgUMzXJzP1Z5mPk17xN7TgkE1ZJjP05xyQ1F4x+DXgT0xb5LP0J90RFR+y+PXfTsyf4zO0p92R1h/0+TXezcuh4vN05t3SVx/1+LYdy0mkon+/f39/g==');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}

    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    trophy: Trophy,
    zap: Zap,
    credit: CreditCard,
    chart: PieChart,
    target: Target,
    user: User,
    wifi: Wifi,
    star: Star,
    award: Award,
    medal: Medal,
    crown: Crown,
    flame: Flame,
    rocket: Rocket,
    heart: Heart
  };

  const Icon = icons[achievement.icon] || Trophy;

  return (
    <div
      className={`fixed bottom-24 right-6 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-achievement-confetti"
            style={{
              left: `${particle.x}%`,
              bottom: '50%',
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: '50%',
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`
            }}
          />
        ))}
      </div>

      {/* Toast card */}
      <div
        className={`relative w-80 rounded-2xl shadow-2xl overflow-hidden ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Gradient header */}
        <div
          className="p-4"
          style={{
            background: `linear-gradient(135deg, ${achievement.color || couleur}, ${achievement.colorEnd || '#dc2626'})`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-bounce-achievement">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-white">
                <p className="text-sm opacity-80">Succès débloqué !</p>
                <h3 className="font-bold">{achievement.title}</h3>
              </div>
            </div>
            <button
              onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className={`text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {achievement.message}
          </p>

          {/* Reward */}
          {achievement.reward && (
            <div
              className="px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: `${achievement.color || couleur}15` }}
            >
              <span className="font-medium" style={{ color: achievement.color || couleur }}>
                🎁 {achievement.reward}
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes achievement-confetti {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) rotate(360deg) scale(0);
            opacity: 0;
          }
        }

        .animate-achievement-confetti {
          animation: achievement-confetti ease-out forwards;
        }

        .animate-bounce-achievement {
          animation: bounce-achievement 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes bounce-achievement {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/**
 * Achievement definitions
 */
export const ACHIEVEMENTS = {
  FIRST_QUOTE: {
    id: 'first-quote',
    title: 'Premier devis !',
    message: 'Vous venez de créer votre premier devis sur ChantierPro 🎉',
    icon: 'trophy',
    color: '#f97316',
    colorEnd: '#dc2626',
    reward: 'Débloquer : Templates avancés'
  },
  SPEED_DEMON: {
    id: 'speed-demon',
    title: 'Éclair ⚡',
    message: 'Devis créé en moins de 3 minutes !',
    icon: 'zap',
    color: '#eab308',
    colorEnd: '#f97316',
    reward: '+10 points rapidité'
  },
  FIRST_PAYMENT: {
    id: 'first-payment',
    title: 'Premier paiement !',
    message: 'Vous avez reçu votre premier acompte via ChantierPro 💳',
    icon: 'credit',
    color: '#22c55e',
    colorEnd: '#10b981',
    reward: 'Débloquer : Statistiques avancées'
  },
  MARGIN_MASTER: {
    id: 'margin-master',
    title: 'Maître des marges 📊',
    message: 'Tous vos chantiers sont au-dessus de 30% de marge',
    icon: 'chart',
    color: '#8b5cf6',
    colorEnd: '#6366f1',
    reward: '+50 points rentabilité'
  },
  PRODUCTIVE: {
    id: 'productive',
    title: 'Productif ! 🎯',
    message: '10 devis créés. Vous maîtrisez ChantierPro !',
    icon: 'target',
    color: '#3b82f6',
    colorEnd: '#2563eb',
    reward: 'Badge : Expert devis'
  },
  FIRST_CLIENT: {
    id: 'first-client',
    title: 'Bienvenue à votre premier client !',
    message: 'Votre base clients commence à se remplir',
    icon: 'user',
    color: '#ec4899',
    colorEnd: '#db2777',
    reward: '+5 points organisation'
  },
  OFFLINE_HERO: {
    id: 'offline-hero',
    title: 'Autonome ! 📴',
    message: 'Vous avez travaillé hors ligne pour la première fois',
    icon: 'wifi',
    color: '#06b6d4',
    colorEnd: '#0891b2',
    reward: 'Badge : Tout-terrain'
  },
  WEEK_STREAK: {
    id: 'week-streak',
    title: 'Une semaine de suite ! 🔥',
    message: 'Vous utilisez ChantierPro depuis 7 jours consécutifs',
    icon: 'flame',
    color: '#f97316',
    colorEnd: '#ef4444',
    reward: '+20 points fidélité'
  },
  SIGNATURE_PRO: {
    id: 'signature-pro',
    title: 'Pro de la signature ✍️',
    message: '5 devis signés électroniquement',
    icon: 'award',
    color: '#10b981',
    colorEnd: '#059669',
    reward: 'Badge : Paperless'
  },
  REVENUE_MILESTONE: {
    id: 'revenue-milestone',
    title: 'Objectif 10K€ ! 💰',
    message: 'Vous avez dépassé 10 000€ de devis ce mois-ci',
    icon: 'crown',
    color: '#eab308',
    colorEnd: '#ca8a04',
    reward: 'Badge : Business en or'
  }
};

/**
 * Hook to manage achievements
 */
export function useAchievements() {
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [pendingToast, setPendingToast] = useState(null);

  // Load unlocked achievements from localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('achievements_unlocked') || '[]');
    setUnlockedAchievements(saved);
  }, []);

  // Unlock an achievement
  const unlockAchievement = useCallback((achievementId) => {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return;

    // Check if already unlocked
    if (unlockedAchievements.includes(achievementId)) return;

    // Add to unlocked list
    const newUnlocked = [...unlockedAchievements, achievementId];
    setUnlockedAchievements(newUnlocked);
    localStorage.setItem('achievements_unlocked', JSON.stringify(newUnlocked));

    // Show toast
    setPendingToast(achievement);

    // Log analytics
    console.log('Analytics: achievement_unlocked', { achievementId });
  }, [unlockedAchievements]);

  // Dismiss toast
  const dismissToast = useCallback(() => {
    setPendingToast(null);
  }, []);

  // Check if achievement is unlocked
  const isUnlocked = useCallback((achievementId) => {
    return unlockedAchievements.includes(achievementId);
  }, [unlockedAchievements]);

  // Get all achievements with unlock status
  const getAllAchievements = useCallback(() => {
    return Object.entries(ACHIEVEMENTS).map(([key, achievement]) => ({
      ...achievement,
      key,
      isUnlocked: unlockedAchievements.includes(key)
    }));
  }, [unlockedAchievements]);

  return {
    unlockedAchievements,
    pendingToast,
    unlockAchievement,
    dismissToast,
    isUnlocked,
    getAllAchievements
  };
}

/**
 * Achievement badge component
 */
export function AchievementBadge({
  achievement,
  isUnlocked = false,
  size = 'md',
  isDark = false
}) {
  const icons = {
    trophy: Trophy,
    zap: Zap,
    credit: CreditCard,
    chart: PieChart,
    target: Target,
    user: User,
    wifi: Wifi,
    star: Star,
    award: Award,
    medal: Medal,
    crown: Crown,
    flame: Flame,
    rocket: Rocket,
    heart: Heart
  };

  const Icon = icons[achievement.icon] || Trophy;

  const sizes = {
    sm: { container: 'w-10 h-10', icon: 'w-4 h-4' },
    md: { container: 'w-14 h-14', icon: 'w-6 h-6' },
    lg: { container: 'w-20 h-20', icon: 'w-8 h-8' }
  };

  return (
    <div
      className={`${sizes[size].container} rounded-full flex items-center justify-center transition-all ${
        isUnlocked
          ? ''
          : isDark
          ? 'bg-gray-700'
          : 'bg-gray-200'
      }`}
      style={isUnlocked ? {
        background: `linear-gradient(135deg, ${achievement.color}, ${achievement.colorEnd})`
      } : {}}
      title={achievement.title}
    >
      <Icon
        className={`${sizes[size].icon} ${isUnlocked ? 'text-white' : isDark ? 'text-gray-500' : 'text-gray-400'}`}
      />
    </div>
  );
}

export default AchievementToast;
