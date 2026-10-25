import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { Bouton } from './ui/Bouton';

const STORAGE_KEY = 'cp_cookie_consent';
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * getCookieConsent - Read stored cookie consent preferences
 * @returns {{ necessary: boolean, analytics: boolean, marketing: boolean, timestamp: number } | null}
 */
export function getCookieConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const consent = JSON.parse(raw);

    // Check expiry (12 months)
    if (consent.timestamp && Date.now() - consent.timestamp > TWELVE_MONTHS_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return consent;
  } catch {
    return null;
  }
}

/**
 * CookieConsent — bandeau de consentement aux cookies (choix gardé 12 mois sur l'appareil).
 * Charte « Glacier vif » (Task 5 « ancien code », 25 oct. 2026) : jetons ; « Refuser » et « Accepter tout » de même poids
 * (aucun des deux mis en avant, et pas de second bouton plein sur l'écran) ; plus de « RGPD conforme » (une affirmation
 * que l'écran ne prouve pas) ni de catégorie « marketing » (aucun pixel publicitaire n'existe : la politique de
 * confidentialité le dit, « Mallettico n'utilise pas de cookies publicitaires ni de cookies de tracking tiers »).
 */
export default function CookieConsent({ isDark: _isDark = false, couleur: _couleur, setPage }) {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showReopenButton, setShowReopenButton] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  // Theme classes
  const cardBg = 'bg-surface border-bord';
  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-2';
  const textMuted = 'text-encre-3';
  const toggleBg = 'bg-surface-2';
  const categoryBorder = 'border-bord';

  // Check if consent already given
  useEffect(() => {
    const existing = getCookieConsent();
    if (existing) {
      // Consent already given — don't show banner or reopen button
      // Users can manage cookies from Settings/footer link
      setVisible(false);
      setShowReopenButton(false);
      return;
    }

    // Show banner after 1.5s delay for first-time visitors
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const saveConsent = useCallback((consent) => {
    const data = {
      ...consent,
      necessary: true,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage full or unavailable
    }

    setVisible(false);
    setShowCustomize(false);
    setShowReopenButton(false);
  }, []);

  const handleAcceptAll = useCallback(() => {
    saveConsent({ necessary: true, analytics: true, marketing: false });
  }, [saveConsent]);

  const handleRefuse = useCallback(() => {
    saveConsent({ necessary: true, analytics: false, marketing: false });
  }, [saveConsent]);

  const handleSavePreferences = useCallback(() => {
    saveConsent(preferences);
  }, [saveConsent, preferences]);

  const handleReopen = useCallback(() => {
    // Load existing preferences if any
    const existing = getCookieConsent();
    if (existing) {
      setPreferences({
        necessary: true,
        analytics: existing.analytics ?? false,
        marketing: existing.marketing ?? false,
      });
    }
    setShowReopenButton(false);
    setVisible(true);
    setShowCustomize(false);
  }, []);

  const categories = [
    {
      key: 'necessary',
      label: 'Cookies nécessaires',
      description: 'Authentification, sécurité et préférences utilisateur. Indispensables au fonctionnement de l\u2019application.',
      locked: true,
    },
    {
      key: 'analytics',
      label: 'Cookies analytiques',
      description: 'Plausible Analytics — données anonymisées, pas de cookies tiers. Nous aide à améliorer l\u2019expérience.',
      locked: false,
    },
  ];

  return (
    <>
      {/* Reopen button - bottom-left corner */}
      <AnimatePresence>
        {showReopenButton && !visible && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={handleReopen}
            className={`fixed bottom-4 left-4 z-[1050] flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border text-sm font-medium transition-colors bg-surface border-bord text-encre-2 hover:bg-surface-2`}
            aria-label="Gérer les cookies"
          >
            <Cookie className="w-4 h-4" />
            <span className="hidden sm:inline">Cookies</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main consent banner */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[1050] p-0 sm:p-4"
          >
            <div
              className={`max-w-2xl mx-auto rounded-t-2xl sm:rounded-2xl border shadow-e3 pb-[env(safe-area-inset-bottom)] ${cardBg}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-4 pb-2 sm:p-5 sm:pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent/10">
                    <Shield size={18} className="text-accent-texte" aria-hidden="true" />
                  </div>
                  <h3 className={`text-sm font-semibold ${textPrimary}`}>
                    Respect de votre vie privée
                  </h3>
                </div>
                <button
                  onClick={handleRefuse}
                  className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-surface-2 text-encre-3"
                  aria-label="Fermer (refuser les cookies facultatifs)"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Description */}
              <div className="px-4 pb-3 sm:px-5">
                <p className={`text-sm leading-relaxed ${textSecondary}`}>
                  Nous utilisons des cookies pour assurer le bon fonctionnement de Mallettico et améliorer votre expérience. Vous pouvez personnaliser vos choix à tout moment.
                  {setPage && (
                    <>
                      {' '}
                      <button onClick={() => { setPage('confidentialite'); setVisible(false); }} className="cible-compacte underline hover:no-underline text-accent-texte">
                        Politique de confidentialité
                      </button>
                    </>
                  )}
                </p>
              </div>

              {/* Customization panel */}
              <AnimatePresence>
                {showCustomize && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className={`mx-4 mb-3 sm:mx-5 border rounded-xl divide-y divide-bord ${categoryBorder}`}>
                      {categories.map((cat) => (
                        <div key={cat.key} className="p-3">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${textPrimary}`}>
                              {cat.label}
                            </span>
                            {cat.locked ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-surface-2 text-encre-3`}>
                                Toujours actif
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  setPreferences((prev) => ({
                                    ...prev,
                                    [cat.key]: !prev[cat.key],
                                  }))
                                }
                                className={`cible-compacte relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
                                  preferences[cat.key] ? 'bg-accent' : toggleBg
                                }`}
                                role="switch"
                                aria-checked={preferences[cat.key]}
                                aria-label={cat.label}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-e1 transition-transform duration-200 ${
                                    preferences[cat.key] ? 'translate-x-5 bg-sur-accent' : 'translate-x-0 bg-encre-3'
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                          <p className={`text-xs mt-1 leading-relaxed ${textMuted}`}>
                            {cat.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Bouton variante="secondaire" className="!px-2" onClick={handleRefuse}>
                    Refuser
                  </Bouton>
                  <Bouton
                    variante="discret"
                    className="!px-2 col-span-2 sm:col-span-1 order-last sm:order-none"
                    iconeFin={showCustomize ? ChevronUp : ChevronDown}
                    aria-expanded={showCustomize}
                    onClick={() => setShowCustomize((prev) => !prev)}
                  >
                    Personnaliser
                  </Bouton>
                  {showCustomize ? (
                    <Bouton variante="principal" className="!px-2" onClick={handleSavePreferences}>
                      Enregistrer
                    </Bouton>
                  ) : (
                    <Bouton variante="secondaire" className="!px-2" onClick={handleAcceptAll}>
                      Accepter tout
                    </Bouton>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
