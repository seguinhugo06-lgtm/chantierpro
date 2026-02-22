/**
 * CGUAcceptanceModal - Blocks app until user accepts CGU
 * LEGAL-001: Required for commercial launch (RGPD compliance)
 *
 * Shows on first login or when CGU version changes.
 * Stores acceptance timestamp in entreprise.cguAcceptedAt → synced to Supabase.
 */

import { useState, useRef, useEffect } from 'react';
import { Building2, ScrollText, Check, ChevronDown } from 'lucide-react';

const CGU_VERSION = '2025-02'; // Bump this when CGU content changes

export default function CGUAcceptanceModal({ onAccept, couleur = '#f97316' }) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const scrollRef = useRef(null);

  // Track scroll position to enable the checkbox only after reading
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) setHasScrolledToEnd(true);
  };

  // Auto-enable if content is short enough to not need scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 40) {
      setHasScrolledToEnd(true);
    }
  }, []);

  const handleAccept = async () => {
    if (!checked || isAccepting) return;
    setIsAccepting(true);
    try {
      await onAccept(CGU_VERSION);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: couleur }}>
            <ScrollText size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Conditions Générales d'Utilisation</h2>
            <p className="text-sm text-slate-500">Veuillez lire et accepter les CGU pour continuer</p>
          </div>
        </div>

        {/* Scrollable CGU Content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5 text-sm text-slate-600 leading-relaxed space-y-5"
        >
          <section>
            <h3 className="text-base font-semibold text-slate-800 mb-2">1. Objet</h3>
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation du service ChantierPro. En créant un compte ou en utilisant le service, l'utilisateur accepte sans réserve les présentes CGU.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-slate-800 mb-2">2. Description du service</h3>
            <p>
              ChantierPro est un logiciel en ligne (SaaS) de gestion de chantier destiné aux artisans et entreprises du BTP. Il permet notamment la création et gestion de devis et factures, le suivi de chantier et de rentabilité, la gestion d'équipe, le suivi de trésorerie, la gestion d'un catalogue de prestations, et la planification.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-slate-800 mb-2">3. Inscription et compte</h3>
            <p>
              L'accès au service nécessite la création d'un compte avec une adresse email valide et un mot de passe. L'utilisateur est responsable de la confidentialité de ses identifiants. Toute utilisation du compte est réputée faite par l'utilisateur.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-slate-800 mb-2">4. Offres et tarification</h3>
            <p>
              ChantierPro propose plusieurs formules d'abonnement, dont une offre gratuite avec des fonctionnalités limitées. Les tarifs des offres payantes sont indiqués sur la page Tarifs et peuvent être modifiés avec un préavis de 30 jours.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-slate-800 mb-2">5. Données de l'utilisateur</h3>
            <p>
              L'utilisateur reste propriétaire de l'ensemble des données qu'il saisit dans le service. ChantierPro s'engage à ne pas utiliser ces données à des fins commerciales. L'utilisateur peut à tout moment exporter ou supprimer ses données. En cas de résiliation, les données seront conservées pendant 30 jours puis supprimées définitivement.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-slate-800 mb-2">6. Protection des données (RGPD)</h3>
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD), ChantierPro s'engage à protéger les données personnelles de ses utilisateurs. Les données sont hébergées dans l'Union Européenne. L'utilisateur dispose d'un droit d'accès, de rectification, de portabilité et de suppression de ses données, exerçable depuis les paramètres du compte ou par email à contact@chantierpro.fr.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-slate-800 mb-2">7. Responsabilité</h3>
            <p>
              ChantierPro fournit le service "en l'état" et ne garantit pas l'absence d'erreurs ou d'interruptions. L'utilisateur est seul responsable de la vérification des montants, calculs et informations générées par le service. ChantierPro ne se substitue pas à un expert-comptable.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-slate-800 mb-2">8. Disponibilité</h3>
            <p>
              ChantierPro s'efforce de maintenir le service accessible 24h/24, 7j/7, mais ne peut garantir une disponibilité permanente. Des interruptions pour maintenance pourront avoir lieu.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-slate-800 mb-2">9. Résiliation</h3>
            <p>
              L'utilisateur peut résilier son compte à tout moment depuis les paramètres. ChantierPro se réserve le droit de suspendre un compte en cas de violation des CGU, après notification préalable.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-slate-800 mb-2">10. Droit applicable</h3>
            <p>
              Les présentes CGU sont régies par le droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable.
            </p>
          </section>

          <p className="text-xs text-slate-400 pt-2">Version {CGU_VERSION} — Dernière mise à jour : février 2025</p>
        </div>

        {/* Scroll hint */}
        {!hasScrolledToEnd && (
          <div className="flex items-center justify-center gap-1 py-2 text-xs text-slate-400 bg-gradient-to-t from-slate-50 to-transparent border-t border-slate-100">
            <ChevronDown size={14} className="animate-bounce" />
            Faites défiler pour lire la suite
          </div>
        )}

        {/* Acceptance footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0 space-y-3">
          <label className={`flex items-start gap-3 cursor-pointer ${!hasScrolledToEnd ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              disabled={!hasScrolledToEnd}
              className="mt-0.5 w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm text-slate-700">
              J'ai lu et j'accepte les <strong>Conditions Générales d'Utilisation</strong> de ChantierPro
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!checked || isAccepting}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: checked ? couleur : '#94a3b8' }}
          >
            {isAccepting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Check size={18} />
                Accepter et continuer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export { CGU_VERSION };
