import { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FileText, Check, RotateCcw, Pen, Calendar, Info, CheckCircle, AlertCircle, Loader2, ArrowRight, ArrowLeft, Shield, Download } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { buildDevisHtml } from '../../lib/devisHtmlBuilder';
import { dateLue } from '../../lib/dates';
import { captureException } from '../../lib/sentry';
import BandeauDonneesFictives from '../ui/BandeauDonneesFictives';
import { estDonneesFictives } from '../../lib/donneesFictives';
import { estClientParticulier, estConcerneParRetractation, DEMANDE_EXPRESSE, DEMANDE_EXPRESSE_AIDE, DEMANDE_URGENCE } from '../../lib/retractation';
import RetractationEnLigne from './RetractationEnLigne';

/**
 * Page publique de signature électronique de devis
 * Accessible sans authentification via /devis/signer/{token}
 *
 * Flow: preview → info → sign → success
 */
export default function DevisSignaturePage({ signatureToken }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [titreErreur, setTitreErreur] = useState('Lien invalide');
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [devisData, setDevisData] = useState(null);
  const [step, setStep] = useState('preview'); // preview, info, sign, success
  const [signataire, setSignataire] = useState('');
  const [acceptCGV, setAcceptCGV] = useState(false);
  // Demande expresse de commencer avant la fin du délai de rétractation (L221-25) : facultative, non cochée
  const [executionAnticipee, setExecutionAnticipee] = useState(false);
  // Devis signé par le lien, client particulier : rétractation en ligne (D221-5), lue en base
  const [signe, setSigne] = useState(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [telechargementEchoue, setTelechargementEchoue] = useState(false);
  // Exemplaire signé envoyé par e-mail au client (L221-13, tâche confirmation-client) : '', envoi, ok, erreur
  const [exemplaire, setExemplaire] = useState('');
  const sigPad = useRef(null);

  const couleur = devisData?.entreprise?.couleur || '#f97316';
  const formatMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Après la signature (ou au retour sur le lien) : état de la rétractation en ligne, décidé par la base
  const relireSigne = async () => {
    const { data, error: e } = await supabase.rpc('get_devis_for_signature', { p_token: signatureToken });
    if (e) throw e;
    if (data?.devis?.already_signed && data.devis.retractation) setSigne(data);
    return data;
  };

  // Fetch devis data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error: fetchError } = await supabase.rpc('get_devis_for_signature', {
          p_token: signatureToken
        });

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Ce lien de signature est invalide ou a expiré. Veuillez contacter votre artisan pour obtenir un nouveau lien.');
          setLoading(false);
          return;
        }

        if (data.devis?.already_signed) {
          if (data.devis.retractation) setSigne(data);
          setAlreadySigned(true);
          setLoading(false);
          return;
        }
        // Migration 083 : un devis expiré (C. civ. 1117) ou qui n'est plus proposé (refusé, brouillon) ne se signe pas
        if (data.devis?.expire) {
          const fin = data.devis.date_validite ? dateLue(data.devis.date_validite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/^1 /, '1er ') : '';
          setTitreErreur('Devis expiré');
          setError(`Ce devis n'était valable que jusqu'au ${fin}. Contactez votre artisan : il peut prolonger sa validité et vous envoyer un nouveau lien.`);
          setLoading(false);
          return;
        }
        if (data.devis?.indisponible) {
          setTitreErreur('Devis indisponible');
          setError('Ce devis n\'est plus proposé à la signature. Contactez votre artisan.');
          setLoading(false);
          return;
        }

        // Parse lignes if JSON string
        if (data.devis?.lignes && typeof data.devis.lignes === 'string') {
          try { data.devis.lignes = JSON.parse(data.devis.lignes); } catch { data.devis.lignes = []; }
        }
        if (data.devis?.sections && typeof data.devis.sections === 'string') {
          try { data.devis.sections = JSON.parse(data.devis.sections); } catch { data.devis.sections = []; }
        }

        setDevisData(data);
        // Pre-fill signataire name
        const clientName = `${data.client?.prenom || ''} ${data.client?.nom || ''}`.trim();
        setSignataire(clientName);
      } catch (err) {
        console.error('Error fetching signature data:', err);
        setError('Impossible de charger le devis. Veuillez réessayer ou contacter votre artisan.');
      }
      setLoading(false);
    };

    fetchData();
  }, [signatureToken]);

  // Signature canvas handlers
  const handleClear = () => {
    if (sigPad.current) {
      sigPad.current.clear();
      setIsEmpty(true);
    }
  };

  const handleEnd = () => {
    if (sigPad.current) {
      const canvasIsEmpty = sigPad.current.isEmpty();
      const canvas = sigPad.current.getCanvas();
      const ctx = canvas?.getContext('2d');
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      const hasDrawing = imageData?.data.some((pixel, i) => i % 4 === 3 && pixel > 0);
      setIsEmpty(canvasIsEmpty && !hasDrawing);
    }
  };

  // Le PDF du devis signé, tel que le client le télécharge et le reçoit (src/lib/pdfDepuisHtml.js, sans script)
  const pdfDuDevisSigne = async (devisSigne) => {
    const html = buildDevisHtml({
      doc: devisSigne,
      client: devisData.client,
      chantier: devisData.chantier || null,
      entreprise: devisData.entreprise,
      couleur,
      mode: 'client',
      signatureToken,
    });
    const { pdfDepuisHtml } = await import('../../lib/pdfDepuisHtml');
    return pdfDepuisHtml(html);
  };

  // Juste après la signature : le PDF part à l'adresse de la fiche du client (le serveur la lit en base, vérifie le
  // PDF et n'en envoie qu'un). Le téléchargement reste proposé quoi qu'il arrive.
  const envoyerExemplaire = async (devisSigne) => {
    setExemplaire('envoi');
    try {
      const octets = await pdfDuDevisSigne(devisSigne);
      let binaire = '';
      for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode.apply(null, octets.subarray(i, i + 0x8000));
      const { data, error: e } = await supabase.functions.invoke('notify-signature', {
        body: { token: signatureToken, evenement: 'exemplaire', pdf: btoa(binaire) },
      });
      if (e || !data?.success) throw new Error(data?.error || e?.message || 'exemplaire non envoyé');
      setExemplaire('ok');
    } catch (err) {
      captureException(err, { context: 'exemplaire signé envoyé au client (page de signature)' });
      setExemplaire('erreur');
    }
  };

  // Submit signature
  const handleSign = async () => {
    if (!sigPad.current || submitting) return;

    const signatureImage = sigPad.current.toDataURL('image/png');
    if (!signatureImage || signatureImage === 'data:,') return;

    setSubmitting(true);
    try {
      const { data, error: signError } = await supabase.rpc('sign_devis', {
        p_token: signatureToken,
        p_signature_data: signatureImage,
        p_signataire_nom: signataire.trim(),
        p_ip: null, // Cannot reliably get IP client-side
        p_user_agent: navigator.userAgent,
        // Particulier : demande expresse cochée (L221-25), et l'avis et le formulaire de rétractation lui ont été
        // montrés dans le devis (L221-5, 7°) ; sinon la base compte le délai prolongé (L221-20)
        p_execution_anticipee: estClientParticulier(devisData?.client) && executionAnticipee,
        p_avis_retractation: estConcerneParRetractation({ doc: devisData?.devis, client: devisData?.client }),
      });

      if (signError) throw signError;

      if (!data?.success) {
        setTitreErreur('Signature non enregistrée');
        setError(data?.error || 'Erreur lors de la signature. Veuillez réessayer.');
      } else {
        // Le devis tel qu'il vient d'être signé : pour le PDF téléchargé et l'exemplaire envoyé
        const maintenant = new Date().toISOString();
        const devisSigne = {
          ...devisData.devis,
          signature_data: signatureImage,
          signature_date: maintenant,
          signataire_nom: signataire.trim(),
          ...(estClientParticulier(devisData?.client) && executionAnticipee ? { execution_anticipee_le: maintenant } : {}),
        };
        setDevisData(prev => ({ ...prev, devis: devisSigne }));
        setStep('success');
        envoyerExemplaire(devisSigne);
        relireSigne().catch((err) => captureException(err, { context: 'Rétractation en ligne : relecture après signature' }));
        // Notifier l'artisan par email (fire-and-forget — l'échec ne doit pas
        // gêner le client qui vient de signer)
        supabase.functions.invoke('notify-signature', { body: { token: signatureToken } })
          .catch(() => { /* silencieux */ });
      }
    } catch (err) {
      console.error('Error signing devis:', err);
      setError('Erreur lors de la signature. Veuillez réessayer.');
    }
    setSubmitting(false);
  };

  // === LOADING STATE ===
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-encre-3" aria-hidden="true" />
          <p className="text-slate-600">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  // === ALREADY SIGNED STATE ===
  // Signé par le lien par un particulier : la rétractation en ligne reste disponible pendant tout le délai (D221-5)
  if (alreadySigned && signe) {
    const fictifSigne = estDonneesFictives(signe.entreprise);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {fictifSigne && <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50"><BandeauDonneesFictives /></div>}
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 sm:p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Devis {signe.devis.numero} signé</h1>
          <p className="text-slate-600 leading-relaxed">
            {signe.entreprise?.nom ? `Contrat conclu avec ${signe.entreprise.nom}` : 'Contrat conclu'}
            {signe.devis.signature_date ? ` le ${dateLue(signe.devis.signature_date).toLocaleDateString('fr-FR')}` : ''}.
          </p>
          <RetractationEnLigne
            token={signatureToken}
            devis={signe.devis}
            client={signe.client}
            entreprise={signe.entreprise}
            retractation={signe.devis.retractation}
            couleur={signe.entreprise?.couleur || '#f97316'}
            onChange={() => relireSigne().catch((err) => captureException(err, { context: 'Rétractation en ligne : relecture' }))}
          />
        </div>
      </div>
    );
  }
  if (alreadySigned) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-3">Devis déjà accepté</h1>
          <p className="text-slate-600 leading-relaxed">
            Ce devis a déjà été accepté : aucune action n'est nécessaire.
          </p>
        </div>
      </div>
    );
  }

  // === ERROR STATE ===
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-3">{titreErreur}</h1>
          <p className="text-slate-600 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  const { devis, client, entreprise } = devisData;
  // Compte de démonstration (D-26) : bandeau sur la page, filigrane sur le document
  const fictif = estDonneesFictives(entreprise);
  const canProceed = acceptCGV && signataire.trim().length > 0;
  // Client particulier : demande expresse proposée (l'avis et le formulaire sont imprimés dans le devis)
  const particulier = estClientParticulier(client);

  // === SUCCESS STATE ===
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {fictif && <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50"><BandeauDonneesFictives /></div>}
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center animate-bounce" style={{ background: `${couleur}15` }}>
            <CheckCircle className="w-10 h-10" style={{ color: couleur }} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Devis signé !</h1>
          <p className="text-slate-600 mb-6">
            Votre signature a été enregistrée avec succès.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Devis</span>
              <span className="font-medium text-slate-900">{devis.numero}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Montant TTC</span>
              <span className="font-bold" style={{ color: couleur }}>{formatMoney(devis.total_ttc)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Signataire</span>
              <span className="font-medium text-slate-900">{signataire}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Date</span>
              <span className="font-medium text-slate-900">{today}</span>
            </div>
          </div>

          {exemplaire && (
            <p role="status" data-ui="ExemplaireEnvoye" className="text-sm text-slate-600 mb-4">
              {exemplaire === 'envoi' && 'Envoi de votre exemplaire signé par e-mail…'}
              {exemplaire === 'ok' && (client?.email
                ? `Votre exemplaire signé vous a été envoyé par e-mail, à l'adresse ${client.email}. Conservez-le. Si cette adresse n'est pas la vôtre, téléchargez-le ci-dessous et prévenez l'entreprise.`
                : 'Votre exemplaire signé vous a été envoyé par e-mail. Conservez-le.')}
              {exemplaire === 'erreur' && 'Votre exemplaire n\'a pas pu vous être envoyé par e-mail : téléchargez-le ci-dessous et conservez-le.'}
            </p>
          )}

          {/* Download signed PDF button */}
          <button
            onClick={async () => {
              setTelechargementEchoue(false);
              // Un vrai PDF, rendu sans script (src/lib/pdfDepuisHtml.js). Avant : une fenêtre à l'origine du site
              // où le document était écrit par document.write (relecture gardien-securite du 10 oct. 2026).
              try {
                const { remettreFichier } = await import('../../lib/natif');
                const octets = await pdfDuDevisSigne(devis);
                await remettreFichier(new Blob([octets], { type: 'application/pdf' }), `Devis_${devis.numero || 'signe'}.pdf`, 'application/pdf', { titre: `Devis ${devis.numero || ''} signé` });
              } catch (err) {
                captureException(err, { context: 'PDF du devis signé (page de signature)' });
                setTelechargementEchoue(true);
              }
            }}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 mb-4 transition-all hover:shadow-lg text-white"
            style={{ background: couleur }}
          >
            <Download className="w-5 h-5" />
            Télécharger mon devis signé
          </button>
          {telechargementEchoue && (
            <p role="alert" className="text-sm text-red-600 text-center mb-4">Le PDF n'a pas pu être créé. Réessayez, ou demandez-le à l'entreprise.</p>
          )}

          <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Signature électronique simple, datée</span>
          </div>

          <p className="text-sm text-slate-500 mt-4">
            Votre signature est enregistrée. Votre artisan reviendra vers vous pour la suite.
          </p>
          {signe?.devis?.retractation && (
            <div className="mt-4">
              <RetractationEnLigne
                token={signatureToken}
                devis={signe.devis}
                client={signe.client}
                entreprise={signe.entreprise}
                retractation={signe.devis.retractation}
                couleur={couleur}
                onChange={() => relireSigne().catch((err) => captureException(err, { context: 'Rétractation en ligne : relecture' }))}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // === PREVIEW STEP ===
  if (step === 'preview') {
    const devisHtml = buildDevisHtml({
      doc: devis,
      client,
      // Lieu des travaux (migration 083 ; avant : jamais transmis à la page du client)
      chantier: devisData.chantier || null,
      entreprise,
      couleur,
      mode: 'client',
      signatureToken,
    });

    return (
      <div className="min-h-screen bg-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
          {fictif && <div className="flex justify-center pt-2"><BandeauDonneesFictives /></div>}
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                <FileText className="w-5 h-5" style={{ color: couleur }} />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-sm sm:text-base">
                  Devis {devis.numero}
                </h1>
                <p className="text-xs text-slate-500">{entreprise?.nom}</p>
              </div>
            </div>
            <button
              onClick={() => setStep('info')}
              className="px-4 py-2.5 text-white rounded-xl font-medium flex items-center gap-2 text-sm shadow-lg hover:shadow-xl transition-all"
              style={{ background: couleur }}
            >
              <Pen className="w-4 h-4" />
              <span className="hidden sm:inline">Signer ce devis</span>
              <span className="sm:hidden">Signer</span>
            </button>
          </div>
        </div>

        {/* Devis Preview */}
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            <iframe
              srcDoc={devisHtml}
              sandbox=""
              className="w-full border-0"
              style={{ minHeight: '297mm' }}
              title="Aperçu du devis"
            />
          </div>
        </div>

        {/* Fixed bottom CTA - mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 sm:hidden">
          <button
            onClick={() => setStep('info')}
            className="w-full py-3.5 text-white rounded-xl font-medium flex items-center justify-center gap-2"
            style={{ background: couleur }}
          >
            <Pen className="w-5 h-5" />
            Signer ce devis
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Meta for SEO */}
        <meta name="robots" content="noindex, nofollow" />
      </div>
    );
  }

  // === INFO + SIGN STEPS ===
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {fictif && <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50"><BandeauDonneesFictives /></div>}
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
              <Pen className="w-5 h-5" style={{ color: couleur }} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">Signature électronique</h2>
              <p className="text-sm text-slate-500">{devis.numero} · {entreprise?.nom}</p>
            </div>
          </div>
          {step === 'sign' && (
            <button
              onClick={() => setStep('info')}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="px-5 pt-4 flex gap-2">
          <div className="flex-1 h-1.5 rounded-full" style={{ background: couleur }} />
          <div className="flex-1 h-1.5 rounded-full" style={{ background: step === 'sign' ? couleur : '#e2e8f0' }} />
        </div>

        <div className="p-5">
          {/* === INFO STEP === */}
          {step === 'info' && (
            <>
              {/* Document summary */}
              <div className="rounded-xl p-4 mb-5 bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6" style={{ color: couleur }} />
                  <div>
                    <p className="font-medium text-slate-900">
                      Devis {devis.numero}
                    </p>
                    <p className="text-sm text-slate-500">
                      {entreprise?.nom}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Montant TTC</span>
                    <span className="text-xl font-bold" style={{ color: couleur }}>
                      {formatMoney(devis.total_ttc)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signataire name */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-slate-900">
                  Nom du signataire *
                </label>
                <input
                  type="text"
                  value={signataire}
                  onChange={e => setSignataire(e.target.value)}
                  placeholder="Prénom Nom"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-offset-0 focus:outline-none transition-shadow"
                  style={{ focusRingColor: couleur }}
                />
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 mb-4 text-slate-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Date de signature : {today}</span>
              </div>

              {/* CGV acceptance */}
              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                acceptCGV
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="checkbox"
                  checked={acceptCGV}
                  onChange={e => setAcceptCGV(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded accent-emerald-500"
                />
                <div>
                  <p className="font-medium text-slate-900">J'accepte ce devis</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {entreprise?.cgv
                      ? <>En signant, j'accepte ce devis et les conditions particulières qui y figurent.</>
                      : <>En signant, j'accepte ce devis.</>}
                    {/* Réparation urgente (L221-28, 8°) : le client signe sa demande */}
                    {devis.travaux_urgents && <> {DEMANDE_URGENCE}</>}
                    <button
                      type="button"
                      onClick={(ev) => { ev.preventDefault(); setStep('preview'); }}
                      className="ml-1 underline"
                      style={{ color: couleur }}
                    >
                      Revoir le devis
                    </button>
                  </p>
                </div>
              </label>

              {/* Demande expresse (L221-25) : particulier seulement, facultative, séparée de l'acceptation */}
              {particulier && (
                <label className={`flex items-start gap-3 p-4 mt-3 rounded-xl border cursor-pointer transition-colors ${
                  executionAnticipee ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                }`} data-ui="DemandeExpresse">
                  <input
                    type="checkbox"
                    checked={executionAnticipee}
                    onChange={e => setExecutionAnticipee(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{DEMANDE_EXPRESSE}</p>
                    <p className="text-sm text-slate-500 mt-1">{DEMANDE_EXPRESSE_AIDE} Facultatif.</p>
                  </div>
                </label>
              )}

              {/* Continue button */}
              <button
                onClick={() => setStep('sign')}
                disabled={!canProceed}
                className="w-full mt-5 py-4 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg"
                style={{ background: couleur }}
              >
                <Pen className="w-5 h-5" />
                Passer à la signature
              </button>
            </>
          )}

          {/* === SIGN STEP === */}
          {step === 'sign' && (
            <>
              {/* Instructions */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  Signez dans le cadre ci-dessous avec votre doigt ou un stylet
                </p>
              </div>

              {/* Signature canvas */}
              <div className="relative border-2 border-slate-300 rounded-xl overflow-hidden mb-4 bg-white">
                <SignatureCanvas
                  ref={sigPad}
                  canvasProps={{
                    className: 'signature-canvas w-full',
                    style: { width: '100%', height: '200px' }
                  }}
                  backgroundColor="rgb(255, 255, 255)"
                  penColor="rgb(0, 0, 0)"
                  onEnd={handleEnd}
                />
                {isEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-slate-400 text-sm">Signez ici</p>
                  </div>
                )}
              </div>

              {/* Clear button */}
              <button
                onClick={handleClear}
                className="w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 mb-4 bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Effacer
              </button>

              {/* Summary */}
              <div className="text-sm text-slate-500 mb-2 space-y-1">
                <p><strong className="text-slate-900">Signataire :</strong> {signataire}</p>
                <p><strong className="text-slate-900">Date :</strong> {today}</p>
                <p><strong className="text-slate-900">Document :</strong> {devis.numero} — {formatMoney(devis.total_ttc)}</p>
              </div>

              {/* Bon pour accord */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-amber-800 font-medium text-center">
                  Bon pour accord
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className="flex-1 py-3 rounded-xl font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleSign}
                  disabled={isEmpty || submitting}
                  className="flex-1 py-3 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg"
                  style={{ background: couleur }}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  {/* L221-14 : la validation dit qu'elle oblige à payer (« commande avec obligation de paiement ») */}
                  {submitting ? 'Envoi...' : 'Signer avec obligation de paiement'}
                </button>
              </div>

              {/* Legal mention */}
              <p className="text-xs text-center mt-4 text-slate-400">
                Signature électronique simple : votre nom, la date et l’heure de signature sont enregistrés avec le devis.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
