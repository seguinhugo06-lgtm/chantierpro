import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, ChevronDown, ChevronUp, Shield } from 'lucide-react';

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
 * CookieConsent - GDPR-compliant cookie consent banner
 * Shows a bottom banner with accept/refuse/customize options.
 * Stores preferences in localStorage for 12 months.
 */
export default function CookieConsent({ isDark = false, couleur = '#f97316', setPage }) {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showReopenButton, setShowReopenButton] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const toggleBg = isDark ? 'bg-slate-700' : 'bg-slate-100';
  const categoryBorder = isDark ? 'border-slate-700' : 'border-slate-200';

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
    saveConsent({ necessary: true, analytics: true, marketing: true });
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
      label: 'Cookies n\u00e9cessaires',
      description: 'Authentification, s\u00e9curit\u00e9 et pr\u00e9f\u00e9rences utilisateur. Indispensables au fonctionnement de l\u2019application.',
      locked: true,
    },
    {
      key: 'analytics',
      label: 'Cookies analytiques',
      description: 'Plausible Analytics \u2014 donn\u00e9es anonymis\u00e9es, pas de cookies tiers. Nous aide \u00e0 am\u00e9liorer l\u2019exp\u00e9rience.',
      locked: false,
    },
    {
      key: 'marketing',
      label: 'Cookies marketing',
      description: 'Pixel de retargeting pour vous proposer des offres pertinentes sur d\u2019autres plateformes.',
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
            className={`fixed bottom-4 left-4 z-[60] flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border text-sm font-medium transition-colors ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            aria-label="G\u00e9rer les cookies"
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
            className="fixed bottom-0 left-0 right-0 z-[60] p-0 sm:p-4"
          >
            <div
              className={`max-w-2xl mx-auto rounded-t-2xl sm:rounded-2xl border shadow-2xl backdrop-blur-sm ${cardBg}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-4 pb-2 sm:p-5 sm:pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl"
                    style={{ backgroundColor: `${couleur}15` }}
                  >
                    <Shield className="w-4.5 h-4.5" style={{ color: couleur }} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold ${textPrimary}`}>
                      Respect de votre vie priv\u00e9e
                    </h3>
                    <p className={`text-xs ${textMuted}`}>
                      RGPD conforme
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRefuse}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'
                  }`}
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Description */}
              <div className="px-4 pb-3 sm:px-5">
                <p className={`text-sm leading-relaxed ${textSecondary}`}>
                  Nous utilisons des cookies pour assurer le bon fonctionnement de ChantierPro et am\u00e9liorer votre exp\u00e9rience. Vous pouvez personnaliser vos choix \u00e0 tout moment.
                  {setPage && (
                    <>
                      {' '}
                      <button onClick={() => { setPage('confidentialite'); setVisible(false); }} className="underline hover:no-underline" style={{ color: couleur }}>
                        Politique de confidentialit\u00e9
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
                    <div className={`mx-4 mb-3 sm:mx-5 border rounded-xl divide-y ${categoryBorder} ${
                      isDark ? 'divide-slate-700' : 'divide-slate-200'
                    }`}>
                      {categories.map((cat) => (
                        <div key={cat.key} className="p-3">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${textPrimary}`}>
                              {cat.label}
                            </span>
                            {cat.locked ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                              }`}>
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
                                className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${
                                  preferences[cat.key]
                                    ? ''
                                    : toggleBg
                                }`}
                                style={
                                  preferences[cat.key]
                                    ? { backgroundColor: couleur }
                                    : undefined
                                }
                                role="switch"
                                aria-checked={preferences[cat.key]}
                                aria-label={cat.label}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                    preferences[cat.key] ? 'translate-x-[18px]' : 'translate-x-0'
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefuse}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                      isDark
                        ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Refuser
                  </button>

                  <button
                    onClick={() => setShowCustomize((prev) => !prev)}
                    className={`flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                      isDark
                        ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Personnaliser
                    {showCustomize ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showCustomize ? (
                    <button
                      onClick={handleSavePreferences}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: couleur }}
                    >
                      Enregistrer
                    </button>
                  ) : (
                    <button
                      onClick={handleAcceptAll}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: couleur }}
                    >
                      Accepter tout
                    </button>
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
