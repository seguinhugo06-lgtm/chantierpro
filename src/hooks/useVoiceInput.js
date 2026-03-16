import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook for Web Speech API voice input (French)
 * Uses browser's built-in speech recognition (Chrome, Edge, Safari)
 *
 * @param {Object} options
 * @param {Function} options.onResult - Called with transcript text when speech recognized
 * @param {Function} options.onInterim - Called with interim (partial) results
 * @param {string} options.lang - Language code (default: 'fr-FR')
 * @param {boolean} options.continuous - Keep listening after first result
 */
export function useVoiceInput({ onResult, onInterim, lang = 'fr-FR', continuous = false } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);

  // Keep refs updated
  useEffect(() => {
    onResultRef.current = onResult;
    onInterimRef.current = onInterim;
  }, [onResult, onInterim]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognition();

    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && onInterimRef.current) {
        onInterimRef.current(interimTranscript);
      }

      if (finalTranscript && onResultRef.current) {
        onResultRef.current(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);

      switch (event.error) {
        case 'not-allowed':
          setError('Microphone non autorise. Activez-le dans les parametres du navigateur.');
          break;
        case 'no-speech':
          setError('Aucune voix detectee. Reessayez.');
          break;
        case 'network':
          setError('Erreur reseau. Verifiez votre connexion.');
          break;
        case 'aborted':
          // User cancelled, no error needed
          break;
        default:
          setError(`Erreur: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [lang, continuous]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started, ignore
        console.warn('Recognition already started');
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}

export default useVoiceInput;
