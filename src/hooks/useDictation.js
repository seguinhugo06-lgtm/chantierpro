/**
 * useDictation — Reconnaissance vocale partagée (Web Speech API du navigateur).
 *
 * La transcription est faite par le navigateur : gratuite, aucun audio ne quitte
 * l'appareil, aucune clé API.
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

/**
 * Recolle les segments renvoyés par le navigateur.
 *
 * Chrome livre chaque segment final SANS espace de séparation : concaténer
 * bêtement donne « Devispourrénovationdemaison ». On rejoint donc à l'espace,
 * après avoir retiré les espaces déjà présents (certaines versions en ajoutent
 * un en tête) pour ne pas doubler.
 */
function recoller(segments) {
  return segments
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?%€])/g, '$1')   // « mot , » → « mot, »
    .replace(/([('"«])\s+/g, '$1')
    .replace(/\s+'/g, "'")               // « l ' adresse » → « l'adresse »
    .trim();
}

export function useDictation({ lang = 'fr-FR', continuous = true } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');   // texte figé (résultats finaux)
  const [interim, setInterim] = useState('');         // texte en cours, non figé
  const [error, setError] = useState(null);
  const [duree, setDuree] = useState(0);              // secondes d'écoute (pour le chrono)
  const [dernierMot, setDernierMot] = useState(0);     // timestamp du dernier mot entendu
  // 'inconnue' → on n'a pas encore demandé | 'accordee' | 'refusee'
  const [permission, setPermission] = useState('inconnue');

  // Lit l'autorisation déjà donnée SANS rien demander : permet d'expliquer avant
  // la première fois, et de ne pas ré-expliquer à quelqu'un qui a déjà accepté.
  // L'API Permissions ne connaît pas 'microphone' partout (Safari) : on reste
  // alors sur 'inconnue', ce qui n'empêche rien.
  useEffect(() => {
    let vivant = true;
    navigator.permissions?.query({ name: 'microphone' })
      .then((etat) => {
        if (!vivant) return;
        const lu = { granted: 'accordee', denied: 'refusee', prompt: 'inconnue' }[etat.state];
        setPermission(lu || 'inconnue');
        etat.onchange = () => {
          const maj = { granted: 'accordee', denied: 'refusee', prompt: 'inconnue' }[etat.state];
          setPermission(maj || 'inconnue');
        };
      })
      .catch(() => { /* API absente : on demandera au moment voulu */ });
    return () => { vivant = false; };
  }, []);

  const recognitionRef = useRef(null);
  const demarrageRef = useRef(false); // verrou le temps de la demande d'autorisation
  const stoppingRef = useRef(false); // distingue un arrêt volontaire d'une coupure
  // Texte acquis avant la session d'écoute en cours : reprendre le micro (ou
  // corriger au clavier puis reprendre) doit compléter la dictée, pas l'effacer.
  const baseRef = useRef('');
  const sessionRef = useRef(''); // segments figés de la session en cours

  /** Fige la session courante dans la base — appelé à chaque arrêt du micro. */
  const consoliderBase = useCallback(() => {
    baseRef.current = recoller([baseRef.current, sessionRef.current]);
    sessionRef.current = '';
  }, []);

  const supported = !!getSpeechRecognition();

  const stop = useCallback(() => {
    stoppingRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* déjà arrêté */ }
      recognitionRef.current = null;
    }
    consoliderBase();
    setListening(false);
    setInterim('');
  }, [consoliderBase]);

  const reset = useCallback(() => {
    baseRef.current = '';
    sessionRef.current = '';
    setTranscript('');
    setInterim('');
    setError(null);
    setDuree(0);
    setDernierMot(0);
  }, []);

  /**
   * Remplace le texte (correction au clavier, exemple pré-rempli).
   * On met aussi à jour la base : si l'utilisateur reprend le micro ensuite,
   * la suite de la dictée s'ajoute derrière sa correction.
   */
  const remplacerTexte = useCallback((valeur) => {
    baseRef.current = valeur || '';
    sessionRef.current = '';
    setTranscript(valeur || '');
    setInterim('');
  }, []);

  /**
   * Demande explicitement le micro avant de lancer la reconnaissance.
   *
   * `SpeechRecognition.start()` est censé déclencher la demande d'autorisation,
   * mais il ne le fait pas partout : selon le navigateur et le mode (installée
   * en PWA, WebView, iOS), il échoue en `not-allowed` SANS avoir rien demandé —
   * l'artisan voit « Micro refusé » alors qu'on ne lui a jamais posé la question.
   * `getUserMedia`, lui, ouvre toujours la boîte de dialogue.
   *
   * Le flux est refermé aussitôt : la reconnaissance ouvre le sien.
   */
  const demanderMicro = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return 'indisponible';
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      flux.getTracks().forEach((piste) => piste.stop());
      setPermission('accordee');
      return 'accordee';
    } catch (e) {
      const refus = e?.name === 'NotAllowedError' || e?.name === 'SecurityError';
      setPermission(refus ? 'refusee' : 'inconnue');
      return refus ? 'refusee' : 'erreur';
    }
  }, []);

  const start = useCallback(async () => {
    const SR = getSpeechRecognition();
    // `recognitionRef` n'est posée qu'après l'await : sans ce second verrou, deux
    // appuis rapides lanceraient deux reconnaissances concurrentes.
    if (!SR || recognitionRef.current || demarrageRef.current) return;
    demarrageRef.current = true;

    try {
      setError(null);

      // On demande d'abord, on écoute ensuite.
      const etat = await demanderMicro();
    if (etat === 'refusee') {
      setPermission('refusee');
      setError("Micro refusé. Autorisez l'accès au micro dans votre navigateur, puis réessayez.");
      return;
    }
    if (etat === 'erreur') {
      setError('Micro introuvable. Vérifiez qu\'un micro est bien branché.');
      return;
    }
    stoppingRef.current = false;
    consoliderBase(); // repart proprement : tout l'acquis passe dans la base

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      // On reconstruit tout à chaque fois plutôt que de repartir de resultIndex :
      // le navigateur peut re-livrer des segments déjà vus, et on veut un texte
      // cohérent quoi qu'il arrive.
      const figes = [];
      const encours = [];
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        (res.isFinal ? figes : encours).push(res[0].transcript);
      }
      // On préfixe par ce qui était déjà acquis avant cette session d'écoute.
      sessionRef.current = recoller(figes);
      setTranscript(recoller([baseRef.current, sessionRef.current]));
      setInterim(recoller(encours));
      setDernierMot(Date.now());
    };

    recognition.onerror = (e) => {
      const msg = ERREURS[e.error];
      if (msg) setError(msg);
      else if (!(e.error in ERREURS)) setError('La dictée a été interrompue.');
      consoliderBase();
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // Un redémarrage remet `event.results` à zéro : il faut figer ce qui vient
      // d'être entendu AVANT de relancer, sinon la suite écrase le début.
      consoliderBase();
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
      // Remis à zéro volontairement : `dernierMot` ne doit dater que d'un mot
      // réellement entendu. Sinon un appelant qui surveille le silence croirait
      // que l'utilisateur vient de parler alors qu'il n'a pas encore commencé.
      setDernierMot(0);
      } catch {
        recognitionRef.current = null;
        setError('Impossible de démarrer la dictée.');
      }
    } finally {
      // Verrou relâché quoi qu'il arrive : refus, absence de micro ou succès.
      demarrageRef.current = false;
    }
  }, [lang, continuous, consoliderBase, demanderMicro]);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  // Chrono d'écoute — sert au retour visuel « je vous écoute depuis 0:07 »
  useEffect(() => {
    if (!listening) return undefined;
    const t = setInterval(() => setDuree((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  // Coupe le micro si le composant disparaît (navigation, fermeture de modale)
  useEffect(() => () => {
    stoppingRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  const texte = recoller([transcript, interim]);

  return {
    supported,
    listening,
    transcript,                       // figé
    interim,                          // en cours
    texte,                            // ce que l'utilisateur voit
    error,
    duree,                            // secondes écoulées depuis le démarrage
    dernierMot,                       // timestamp du dernier mot (détection de silence)
    permission,                       // 'inconnue' | 'accordee' | 'refusee'
    demanderMicro,                    // ouvre la demande d'autorisation sans démarrer l'écoute
    motsCount: texte ? texte.split(/\s+/).filter(Boolean).length : 0,
    start,
    stop,
    toggle,
    reset,
    setTranscript: remplacerTexte,    // correction au clavier, sans perdre la suite
  };
}

export default useDictation;
