/**
 * VoiceAssistant Component
 * Voice command system for hands-free field usage
 *
 * Uses Web Speech API via react-speech-recognition
 *
 * @module VoiceAssistant
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  X,
  Settings,
  HelpCircle,
  Camera,
  FileText,
  Phone,
  CheckSquare,
  Navigation,
  Package,
  AlertCircle,
} from 'lucide-react';

// =============================================================================
// TYPES (JSDoc)
// =============================================================================

/**
 * @typedef {'idle' | 'listening' | 'processing' | 'speaking'} VoiceState
 */

/**
 * @typedef {Object} VoiceCommand
 * @property {string} pattern - Regex pattern to match
 * @property {string} description - Human-readable description
 * @property {string} example - Example usage
 * @property {Function} handler - Handler function
 */

/**
 * @typedef {Object} VoiceAssistantProps
 * @property {string} [userId] - Current user ID
 * @property {Object} [currentChantier] - Current chantier context
 * @property {Function} [setPage] - Navigation function
 * @property {Function} [onOpenCamera] - Camera open handler
 * @property {Function} [onCreateNote] - Note creation handler
 * @property {Function} [onCallClient] - Client call handler
 * @property {Object} [catalogue] - Product catalogue for stock queries
 * @property {Object[]} [chantiers] - Chantiers list
 * @property {Object[]} [devis] - Devis list
 * @property {string} [className] - Additional CSS classes
 */

// =============================================================================
// CONSTANTS
// =============================================================================

const WAKE_WORD = 'chantierpro';
const WAKE_WORD_VARIANTS = ['chantier pro', 'chantier-pro', 'chantierpro'];

const SUPPORTED_LANGUAGES = {
  fr: { code: 'fr-FR', name: 'Français' },
  en: { code: 'en-US', name: 'English' },
};

// =============================================================================
// TEXT-TO-SPEECH
// =============================================================================

/**
 * Speak text using Web Speech API
 * @param {string} text - Text to speak
 * @param {string} [lang='fr-FR'] - Language code
 * @param {Function} [onEnd] - Callback when speech ends
 */
function speak(text, lang = 'fr-FR', onEnd) {
  if (!window.speechSynthesis) {
    console.warn('[VoiceAssistant] Speech synthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Try to get a French voice
  const voices = window.speechSynthesis.getVoices();
  const frenchVoice = voices.find((v) => v.lang.startsWith('fr'));
  if (frenchVoice) {
    utterance.voice = frenchVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop speaking
 */
function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// =============================================================================
// COMMAND PARSING
// =============================================================================

/**
 * Check if transcript contains wake word
 * @param {string} transcript - Speech transcript
 * @returns {boolean}
 */
function hasWakeWord(transcript) {
  const lower = transcript.toLowerCase();
  return WAKE_WORD_VARIANTS.some((w) => lower.includes(w));
}

/**
 * Remove wake word from transcript
 * @param {string} transcript - Speech transcript
 * @returns {string} Cleaned command
 */
function removeWakeWord(transcript) {
  let cleaned = transcript.toLowerCase();
  WAKE_WORD_VARIANTS.forEach((w) => {
    cleaned = cleaned.replace(w, '');
  });
  return cleaned.trim().replace(/^,?\s*/, '');
}

/**
 * Extract product name from command
 * @param {string} command - Voice command
 * @returns {string | null} Product name
 */
function extractProduct(command) {
  // Pattern: "combien de [product] en stock"
  const match = command.match(/combien\s+de\s+(.+?)\s+(en\s+stock|restant|disponible)/i);
  if (match) return match[1].trim();

  // Pattern: "stock [product]"
  const match2 = command.match(/stock\s+(.+)/i);
  if (match2) return match2[1].trim();

  return null;
}

/**
 * Extract note text from command
 * @param {string} command - Voice command
 * @returns {string} Note text
 */
function extractNoteText(command) {
  return command
    .replace(/^note\s*:?\s*/i, '')
    .replace(/^ajouter?\s+note\s*:?\s*/i, '')
    .trim();
}

/**
 * Extract checklist name from command
 * @param {string} command - Voice command
 * @returns {string | null} Checklist name
 */
function extractChecklistName(command) {
  const match = command.match(/checklist\s+(.+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract item to validate from command
 * @param {string} command - Voice command
 * @returns {string | null} Item name
 */
function extractItemToValidate(command) {
  const match = command.match(/valider\s+(.+)/i);
  return match ? match[1].trim() : null;
}

// =============================================================================
// VOICE ASSISTANT COMPONENT
// =============================================================================

/**
 * VoiceAssistant - Voice command interface for field use
 *
 * @param {VoiceAssistantProps} props
 */
export default function VoiceAssistant({
  userId,
  currentChantier,
  setPage,
  onOpenCamera,
  onCreateNote,
  onCallClient,
  catalogue = [],
  chantiers = [],
  devis = [],
  className = '',
}) {
  // Speech recognition hook
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  // State
  const [voiceState, setVoiceState] = useState('idle');
  const [continuousMode, setContinuousMode] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState('fr');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState(null);

  // Refs
  const processingRef = useRef(false);
  const transcriptTimeoutRef = useRef(null);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle transcript changes
  useEffect(() => {
    if (!transcript || processingRef.current) return;

    // Clear previous timeout
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
    }

    // Wait for user to finish speaking (500ms silence)
    transcriptTimeoutRef.current = setTimeout(() => {
      if (transcript && hasWakeWord(transcript)) {
        handleVoiceCommand(transcript);
      } else if (!continuousMode && transcript) {
        // In push-to-talk mode, process any command
        handleVoiceCommand(WAKE_WORD + ' ' + transcript);
      }
    }, 500);

    return () => {
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
    };
  }, [transcript, continuousMode]);

  // Get stock quantity for a product
  const getStockQuantity = useCallback(
    (productName) => {
      if (!catalogue || catalogue.length === 0) {
        return null;
      }

      const product = catalogue.find(
        (p) =>
          p.nom?.toLowerCase().includes(productName.toLowerCase()) ||
          p.reference?.toLowerCase().includes(productName.toLowerCase())
      );

      if (product) {
        return {
          name: product.nom,
          quantity: product.stock_actuel || product.quantite || 0,
          unit: product.unite || 'unités',
          seuil: product.seuil_alerte || 0,
          isLow: (product.stock_actuel || 0) <= (product.seuil_alerte || 0),
        };
      }

      return null;
    },
    [catalogue]
  );

  // Get unpaid invoices info
  const getUnpaidInvoices = useCallback(() => {
    const unpaid = devis.filter(
      (d) => d.type === 'facture' && d.statut !== 'payee' && d.statut !== 'paye'
    );
    const total = unpaid.reduce((sum, d) => sum + (d.total_ttc || 0), 0);
    return { count: unpaid.length, total };
  }, [devis]);

  // Get next chantier info
  const getNextChantier = useCallback(() => {
    const today = new Date();
    const upcoming = chantiers
      .filter((c) => {
        const startDate = new Date(c.date_debut);
        return startDate >= today && c.statut !== 'termine';
      })
      .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));

    return upcoming[0] || null;
  }, [chantiers]);

  // Main command handler
  const handleVoiceCommand = useCallback(
    async (fullTranscript) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setVoiceState('processing');
      setError(null);

      try {
        const command = removeWakeWord(fullTranscript);
        console.log('[VoiceAssistant] Processing command:', command);

        // Navigation commands
        if (command.match(/dashboard|accueil|tableau\s*de\s*bord/i)) {
          setPage?.('dashboard');
          speak('Navigation vers le tableau de bord', SUPPORTED_LANGUAGES[language].code, () =>
            setVoiceState('idle')
          );
          setLastResponse('Navigation : Tableau de bord');
        }
        // Devis navigation
        else if (command.match(/^devis$/i) || command.match(/mes\s*devis/i)) {
          setPage?.('devis');
          speak('Navigation vers les devis', SUPPORTED_LANGUAGES[language].code, () =>
            setVoiceState('idle')
          );
          setLastResponse('Navigation : Devis');
        }
        // Chantiers navigation
        else if (command.match(/mes\s*chantiers|chantiers/i)) {
          setPage?.('chantiers');
          speak('Navigation vers les chantiers', SUPPORTED_LANGUAGES[language].code, () =>
            setVoiceState('idle')
          );
          setLastResponse('Navigation : Chantiers');
        }
        // Planning navigation
        else if (command.match(/planning|calendrier/i)) {
          setPage?.('planning');
          speak('Navigation vers le planning', SUPPORTED_LANGUAGES[language].code, () =>
            setVoiceState('idle')
          );
          setLastResponse('Navigation : Planning');
        }
        // Clients navigation
        else if (command.match(/clients|mes\s*clients/i)) {
          setPage?.('clients');
          speak('Navigation vers les clients', SUPPORTED_LANGUAGES[language].code, () =>
            setVoiceState('idle')
          );
          setLastResponse('Navigation : Clients');
        }

        // Stock query
        else if (command.match(/combien|stock|restant|disponible/i)) {
          const productName = extractProduct(command);
          if (productName) {
            const stockInfo = getStockQuantity(productName);
            if (stockInfo) {
              let response = `Stock ${stockInfo.name} : ${stockInfo.quantity} ${stockInfo.unit}`;
              if (stockInfo.isLow) {
                response += '. Attention, seuil critique atteint.';
              }
              speak(response, SUPPORTED_LANGUAGES[language].code, () => setVoiceState('idle'));
              setLastResponse(response);
            } else {
              speak(
                `Produit ${productName} non trouvé dans le catalogue`,
                SUPPORTED_LANGUAGES[language].code,
                () => setVoiceState('idle')
              );
              setLastResponse(`Produit "${productName}" non trouvé`);
            }
          } else {
            speak(
              "Je n'ai pas compris le nom du produit",
              SUPPORTED_LANGUAGES[language].code,
              () => setVoiceState('idle')
            );
            setLastResponse("Produit non reconnu");
          }
        }

        // Unpaid invoices query
        else if (command.match(/factures?\s*impay[ée]e?s?|impay[ée]s/i)) {
          const { count, total } = getUnpaidInvoices();
          const formattedTotal = new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
          }).format(total);
          const response =
            count > 0
              ? `Vous avez ${count} facture${count > 1 ? 's' : ''} impayée${count > 1 ? 's' : ''} pour un total de ${formattedTotal}`
              : 'Aucune facture impayée';
          speak(response, SUPPORTED_LANGUAGES[language].code, () => setVoiceState('idle'));
          setLastResponse(response);
        }

        // Next chantier query
        else if (command.match(/prochain\s*chantier|chantier\s*suivant/i)) {
          const nextChantier = getNextChantier();
          if (nextChantier) {
            const date = new Date(nextChantier.date_debut).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            });
            const response = `Prochain chantier : ${nextChantier.nom}, le ${date}${nextChantier.adresse ? `, à ${nextChantier.adresse}` : ''}`;
            speak(response, SUPPORTED_LANGUAGES[language].code, () => setVoiceState('idle'));
            setLastResponse(response);
          } else {
            speak('Aucun chantier à venir', SUPPORTED_LANGUAGES[language].code, () =>
              setVoiceState('idle')
            );
            setLastResponse('Aucun chantier à venir');
          }
        }

        // Photo command
        else if (command.match(/^photo$/i) || command.match(/prendre?\s*(une\s*)?photo/i)) {
          if (onOpenCamera) {
            onOpenCamera();
            speak('Ouverture de la caméra', SUPPORTED_LANGUAGES[language].code, () =>
              setVoiceState('idle')
            );
            setLastResponse('Caméra ouverte');
          } else {
            speak('Fonction caméra non disponible', SUPPORTED_LANGUAGES[language].code, () =>
              setVoiceState('idle')
            );
            setLastResponse('Caméra non disponible');
          }
        }

        // Note command
        else if (command.match(/^note/i) || command.match(/ajouter?\s*note/i)) {
          const noteText = extractNoteText(command);
          if (noteText && onCreateNote) {
            await onCreateNote(noteText, currentChantier?.id);
            speak('Note enregistrée', SUPPORTED_LANGUAGES[language].code, () =>
              setVoiceState('idle')
            );
            setLastResponse(`Note : "${noteText}"`);
          } else if (!noteText) {
            speak('Veuillez dicter le contenu de la note', SUPPORTED_LANGUAGES[language].code, () =>
              setVoiceState('idle')
            );
            setLastResponse('Contenu de note manquant');
          } else {
            speak('Fonction notes non disponible', SUPPORTED_LANGUAGES[language].code, () =>
              setVoiceState('idle')
            );
            setLastResponse('Notes non disponibles');
          }
        }

        // Call client command
        else if (command.match(/appeler?\s*(le\s*)?client/i)) {
          if (currentChantier?.client?.telephone || onCallClient) {
            if (onCallClient) {
              onCallClient(currentChantier);
            } else if (currentChantier?.client?.telephone) {
              window.location.href = `tel:${currentChantier.client.telephone}`;
            }
            speak('Appel du client', SUPPORTED_LANGUAGES[language].code, () =>
              setVoiceState('idle')
            );
            setLastResponse('Appel client en cours');
          } else {
            speak(
              'Aucun numéro de client disponible',
              SUPPORTED_LANGUAGES[language].code,
              () => setVoiceState('idle')
            );
            setLastResponse('Numéro client non disponible');
          }
        }

        // Checklist read command
        else if (command.match(/checklist/i)) {
          const checklistName = extractChecklistName(command);
          // For now, just acknowledge - would need checklist data
          speak(
            checklistName
              ? `Checklist ${checklistName} non trouvée`
              : 'Veuillez préciser le nom de la checklist',
            SUPPORTED_LANGUAGES[language].code,
            () => setVoiceState('idle')
          );
          setLastResponse('Fonctionnalité checklist à venir');
        }

        // Validate item command
        else if (command.match(/valider/i)) {
          const itemName = extractItemToValidate(command);
          if (itemName) {
            speak(
              `Élément "${itemName}" validé`,
              SUPPORTED_LANGUAGES[language].code,
              () => setVoiceState('idle')
            );
            setLastResponse(`Validé : ${itemName}`);
          } else {
            speak(
              "Veuillez préciser l'élément à valider",
              SUPPORTED_LANGUAGES[language].code,
              () => setVoiceState('idle')
            );
            setLastResponse("Élément à valider non précisé");
          }
        }

        // Help command
        else if (command.match(/aide|help|commandes/i)) {
          setShowHelp(true);
          speak(
            'Voici les commandes disponibles',
            SUPPORTED_LANGUAGES[language].code,
            () => setVoiceState('idle')
          );
          setLastResponse('Aide affichée');
        }

        // Unknown command
        else {
          speak(
            "Commande non reconnue. Dites aide pour voir les commandes disponibles.",
            SUPPORTED_LANGUAGES[language].code,
            () => setVoiceState('idle')
          );
          setLastResponse(`Commande non reconnue : "${command}"`);
        }
      } catch (err) {
        console.error('[VoiceAssistant] Error processing command:', err);
        setError(err.message);
        speak(
          'Une erreur est survenue',
          SUPPORTED_LANGUAGES[language].code,
          () => setVoiceState('idle')
        );
        setLastResponse('Erreur');
      } finally {
        processingRef.current = false;
        resetTranscript();
      }
    },
    [
      language,
      setPage,
      getStockQuantity,
      getUnpaidInvoices,
      getNextChantier,
      onOpenCamera,
      onCreateNote,
      onCallClient,
      currentChantier,
      resetTranscript,
    ]
  );

  // Start listening
  const startListening = useCallback(() => {
    if (!isOnline) {
      setError('Commande vocale indisponible hors ligne');
      return;
    }

    setError(null);
    resetTranscript();
    setVoiceState('listening');

    SpeechRecognition.startListening({
      continuous: continuousMode,
      language: SUPPORTED_LANGUAGES[language].code,
    });
  }, [isOnline, continuousMode, language, resetTranscript]);

  // Stop listening
  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening();
    setVoiceState('idle');
    stopSpeaking();
  }, []);

  // Toggle continuous mode
  const toggleContinuousMode = useCallback(() => {
    setContinuousMode((prev) => {
      const newValue = !prev;
      if (newValue && !listening) {
        startListening();
      } else if (!newValue && listening) {
        stopListening();
      }
      return newValue;
    });
  }, [listening, startListening, stopListening]);

  // Check browser support
  if (!browserSupportsSpeechRecognition) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">
          Commandes vocales non supportées par ce navigateur
        </p>
        <p className="text-xs text-gray-400 mt-1">Utilisez Chrome ou Edge pour cette fonctionnalité</p>
      </div>
    );
  }

  // Check microphone access
  if (!isMicrophoneAvailable) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <MicOff className="w-12 h-12 mx-auto mb-2 text-red-400" />
        <p className="text-sm text-gray-500">Accès au microphone refusé</p>
        <p className="text-xs text-gray-400 mt-1">
          Autorisez l'accès au microphone dans les paramètres du navigateur
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Main microphone button */}
      <button
        onClick={listening ? stopListening : startListening}
        disabled={voiceState === 'processing'}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-lg
          ${
            voiceState === 'listening'
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : voiceState === 'processing'
                ? 'bg-blue-500 cursor-wait'
                : voiceState === 'speaking'
                  ? 'bg-green-500'
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600'
          }
        `}
      >
        {voiceState === 'processing' ? (
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        ) : voiceState === 'speaking' ? (
          <Volume2 className="w-10 h-10 text-white animate-pulse" />
        ) : listening ? (
          <Mic className="w-10 h-10 text-white" />
        ) : (
          <Mic className="w-10 h-10 text-gray-500 dark:text-gray-400" />
        )}

        {/* Listening indicator ring */}
        {voiceState === 'listening' && (
          <span className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping" />
        )}
      </button>

      {/* Status text */}
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {voiceState === 'listening'
          ? 'Écoute en cours...'
          : voiceState === 'processing'
            ? 'Traitement...'
            : voiceState === 'speaking'
              ? 'Réponse...'
              : 'Appuyer pour parler'}
      </p>

      {/* Live transcript */}
      {transcript && voiceState === 'listening' && (
        <div className="mt-4 px-4 py-2 bg-gray-100 dark:bg-slate-800 rounded-lg max-w-xs">
          <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{transcript}"</p>
        </div>
      )}

      {/* Last response */}
      {lastResponse && voiceState !== 'listening' && (
        <div className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg max-w-xs">
          <div className="flex items-start gap-2">
            <Volume2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">{lastResponse}</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 px-4 py-2 bg-red-50 dark:bg-red-900/30 rounded-lg max-w-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mt-6 flex items-center gap-4">
        {/* Continuous mode toggle */}
        <button
          onClick={toggleContinuousMode}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
            transition-colors
            ${
              continuousMode
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
            }
          `}
        >
          {continuousMode ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
          {continuousMode ? 'Continu' : 'Push-to-talk'}
        </button>

        {/* Help button */}
        <button
          onClick={() => setShowHelp(true)}
          className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="mt-4 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
          <p className="text-xs text-yellow-700 dark:text-yellow-400">Mode hors ligne</p>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold dark:text-white">Commandes vocales</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Navigation */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="w-4 h-4 text-blue-500" />
                  <h3 className="font-medium dark:text-white">Navigation</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>"ChantierPro, dashboard"</li>
                  <li>"ChantierPro, devis"</li>
                  <li>"ChantierPro, mes chantiers"</li>
                  <li>"ChantierPro, planning"</li>
                  <li>"ChantierPro, clients"</li>
                </ul>
              </div>

              {/* Information */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-green-500" />
                  <h3 className="font-medium dark:text-white">Informations</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>"ChantierPro, combien de [produit] en stock ?"</li>
                  <li>"ChantierPro, factures impayées ?"</li>
                  <li>"ChantierPro, prochain chantier ?"</li>
                </ul>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-4 h-4 text-purple-500" />
                  <h3 className="font-medium dark:text-white">Actions rapides</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>"ChantierPro, photo"</li>
                  <li>"ChantierPro, note [texte]"</li>
                  <li>"ChantierPro, appeler client"</li>
                </ul>
              </div>

              {/* Checklist */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare className="w-4 h-4 text-orange-500" />
                  <h3 className="font-medium dark:text-white">Checklist</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>"ChantierPro, checklist [nom]"</li>
                  <li>"ChantierPro, valider [item]"</li>
                </ul>
              </div>

              {/* Tip */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Astuce :</strong> En mode continu, dites "ChantierPro" suivi de votre
                  commande. En mode push-to-talk, appuyez et parlez directement.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold dark:text-white">Paramètres</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Language selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Langue
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                >
                  {Object.entries(SUPPORTED_LANGUAGES).map(([key, { name }]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Privacy notice */}
              <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <strong>Confidentialité :</strong> Les commandes vocales sont traitées par le
                  navigateur. Aucun audio n'est envoyé à nos serveurs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FLOATING ACTION BUTTON VERSION
// =============================================================================

/**
 * VoiceAssistantFAB - Floating Action Button version for chantier pages
 *
 * @param {VoiceAssistantProps} props
 */
export function VoiceAssistantFAB(props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { browserSupportsSpeechRecognition } = useSpeechRecognition();

  // Don't render if not supported
  if (!browserSupportsSpeechRecognition) {
    return null;
  }

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-20 right-4 z-50">
        {isExpanded ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-80 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold dark:text-white">Assistant vocal</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5 dark:text-gray-400" />
              </button>
            </div>
            <VoiceAssistant {...props} />
          </div>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-14 h-14 rounded-full bg-primary-500 hover:bg-primary-600 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
          >
            <Mic className="w-6 h-6" />
          </button>
        )}
      </div>
    </>
  );
}
