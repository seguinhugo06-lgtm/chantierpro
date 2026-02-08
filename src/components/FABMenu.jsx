import { useState } from 'react';
import { Plus, X, FileText, Users, Building2, Zap } from 'lucide-react';

/**
 * Floating Action Button Menu
 * Quick access to create new items and tools from anywhere
 */
export default function FABMenu({
  onNewDevis,
  onNewClient,
  onNewChantier,
  isDark = false,
  couleur = '#f97316',
  hidden = false
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render when hidden (on form pages, detail views, etc.)
  if (hidden) return null;

  // Actions: creation first, then tools
  const actions = [
    { icon: Zap, label: 'Devis Express', onClick: onNewDevis, color: couleur, description: 'Créer rapidement un devis' },
    { icon: Users, label: 'Nouveau client', onClick: onNewClient, color: couleur, description: 'Ajouter un contact' },
    { icon: Building2, label: 'Nouveau chantier', onClick: onNewChantier, color: couleur, description: 'Démarrer un projet' },
  ];

  const handleAction = (action) => {
    setIsOpen(false);
    action.onClick?.();
  };

  return (
    <>
      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* FAB Container - mobile only (hidden on desktop where header has "+ Nouveau" button) */}
      <div className="lg:hidden fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col-reverse items-end gap-2 sm:gap-3">
        {/* Action buttons */}
        {isOpen && actions.map((action, i) => (
          <button
            key={action.label}
            onClick={() => handleAction(action)}
            className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-full text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 animate-slide-up"
            style={{
              backgroundColor: action.color,
              animationDelay: `${i * 50}ms`
            }}
          >
            <action.icon size={20} />
            <span className="font-medium whitespace-nowrap">{action.label}</span>
          </button>
        ))}

        {/* Main FAB button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:shadow-xl hover:brightness-110 ${
            isOpen ? 'rotate-45' : ''
          }`}
          style={{ backgroundColor: couleur }}
          aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu actions rapides'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <Plus size={28} className="text-white" />
          )}
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
}
