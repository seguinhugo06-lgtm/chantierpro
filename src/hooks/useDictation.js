/**
 * useDictation — Reconnaissance vocale partagée (Web Speech API du navigateur).
 *
 * Extrait de MemosPage (qui l'utilisait en local) pour être réutilisé par la
 * dictée globale. La transcription est faite par le navigateur : gratuite,
 * aucun audio ne quitte l'appareil, aucune clé API.
 *
 * Support : Chrome/Edge desktop + Android = complet. Safari/iOS = partiel selon
 * les versions — d'où `supported` qu'il faut tester avant d'afficher un micro.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const getSpeechRecognition = () =>
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

/** Messages d'erreur en français — l'API renvoie des codes techniques. */
const ERREURS = {
  'not-allowed': "Micro refusé. Autorisez l'accès au micro dans votre navigateur.",
  'service-not-allowed': "Micro refusé. Autorisez l'accès au micro dans votre navigateur.",
  'no-speech': "Je n'ai rien entendu. Réessayez en parlant plus près du micro.",
  'audio-capture': 'Aucun micro détecté sur cet appareil.',
  network: 'Pas de réseau — la reconnaissance vocale a besoin d’une connexion.',
  aborted: null, // arrêt volontaire : pas une erreur à afficher
};

export function useDictation({ lang = 'fr-FR', continuous = true } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');   // texte figé (résultats finaux)
  const [interim, setInterim] = useState('');         // texte en cours, non figé
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const finalRef = useRef('');       // accumulateur des segments finaux
  const stoppingRef = useRef(false); // distingue un arrêt volontaire d'une coupure

  const supported = !!getSpeechRecognition();

  const stop = useCallback(() => {
    stoppingRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* déjà arrêté */ }
      recognitionRef.current = null;
    }
    setListening(false);
    setInterim('');
  }, []);

  const reset = useCallback(() => {
    finalRef.current = '';
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR || recognitionRef.current) return;

    setError(null);
    stoppingRef.current = false;

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let enCours = '';
      // On ne repart pas de resultIndex : on reconstruit pour rester cohérent
      // même si le navigateur re-livre des segments déjà vus.
      let fige = '';
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) fige += res[0].transcript;
        else enCours += res[0].transcript;
      }
      finalRef.current = fige;
      setTranscript(fige);
      setInterim(enCours);
    };

    recognition.onerror = (e) => {
      const msg = ERREURS[e.error];
      if (msg) setError(msg);
      else if (!(e.error in ERREURS)) setError('La dictée a été interrompue.');
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // En mode continu, le navigateur coupe parfois tout seul après un silence.
      // Si l'utilisateur n'a pas demandé l'arrêt, on relance pour ne rien perdre.
      if (!stoppingRef.current && recognitionRef.current) {
        try { recognition.start(); return; } catch { /* relance impossible */ }
      }
      setListening(false);
      setInterim('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setError('Impossible de démarrer la dictée.');
    }
  }, [lang, continuous]);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  // Coupe le micro si le composant disparaît (navigation, fermeture de modale)
  useEffect(() => () => {
    stoppingRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  return {
    supported,
    listening,
    transcript,                       // figé
    interim,                          // en cours
    texte: (transcript + interim).trim(), // ce que l'utilisateur voit
    error,
    start,
    stop,
    toggle,
    reset,
    setTranscript,                    // permet la correction manuelle au clavier
  };
}

export default useDictation;
