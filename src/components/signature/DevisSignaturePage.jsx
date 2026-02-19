import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FileText, Check, X, RotateCcw, Pen, Calendar, Info, CheckCircle, AlertCircle, Loader2, ArrowRight, ArrowLeft, Shield, Download } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { buildDevisHtml } from '../../lib/devisHtmlBuilder';
import { notifyArtisanSignature } from '../../services/CommunicationsService';

/**
 * Page publique de signature électronique de devis
 * Accessible sans authentification via /devis/signer/{token}
 *
 * Flow: preview → info → sign → success
 */
export default function DevisSignaturePage({ signatureToken }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [devisData, setDevisData] = useState(null);
  const [step, setStep] = useState('preview'); // preview, info, sign, success
  const [signataire, setSignataire] = useState('');
  const [acceptCGV, setAcceptCGV] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const sigPad = useRef(null);

  const couleur = devisData?.entreprise?.couleur || '#f97316';
  const formatMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

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
          setAlreadySigned(true);
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
        p_user_agent: navigator.userAgent
      });

      if (signError) throw signError;

      if (!data?.success) {
        setError(data?.error || 'Erreur lors de la signature. Veuillez réessayer.');
      } else {
        // Update local devis data with signature info for PDF download
        setDevisData(prev => ({
          ...prev,
          devis: {
            ...prev.devis,
            signature_data: signatureImage,
            signature_date: new Date().toISOString(),
            signataire_nom: signataire.trim()
          }
        }));
        setStep('success');

        // Notify artisan in background (don't block success page)
        notifyArtisanSignature({
          entreprise,
          devis,
          client,
          signataire: signataire.trim()
        }).catch(err => console.warn('Failed to notify artisan:', err));
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
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: '#f97316' }} />
          <p className="text-slate-600">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  // === ALREADY SIGNED STATE ===
  if (alreadySigned) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-3">Devis déjà signé</h1>
          <p className="text-slate-600 leading-relaxed">
            Ce devis a déjà été signé. Aucune action supplémentaire n'est nécessaire.
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
          <h1 className="text-xl font-bold text-slate-900 mb-3">Lien invalide</h1>
          <p className="text-slate-600 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  const { devis, client, entreprise } = devisData;
  const canProceed = acceptCGV && signataire.trim().length > 0;

  // === SUCCESS STATE ===
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
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

          {/* Download signed PDF button */}
          <button
            onClick={() => {
              const signedHtml = buildDevisHtml({
                doc: {
                  ...devis,
                  signature_data: devis.signature_data,
                  signature_date: devis.signature_date,
                  signataire_nom: devis.signataire_nom
                },
                client,
                chantier: null,
                entreprise,
                couleur
              });
              const w = window.open('', '_blank');
              if (w) {
                w.document.write(signedHtml);
                w.document.close();
                setTimeout(() => w.print(), 500);
              }
            }}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 mb-4 transition-all hover:shadow-lg text-white"
            style={{ background: couleur }}
          >
            <Download className="w-5 h-5" />
            Télécharger mon devis signé
          </button>

          <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Signature électronique conforme au règlement eIDAS (UE 910/2014)</span>
          </div>

          <p className="text-sm text-slate-500 mt-4">
            {entreprise?.nom || 'Votre artisan'} a été notifié de votre signature et vous recontactera sous 48h.
          </p>
        </div>
      </div>
    );
  }

  // === PREVIEW STEP ===
  if (step === 'preview') {
    const devisHtml = buildDevisHtml({
      doc: devis,
      client,
      chantier: null,
      entreprise,
      couleur
    });

    return (
      <div className="min-h-screen bg-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
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
                    En signant, j'accepte le devis et les conditions générales de vente de {entreprise?.nom || "l'entreprise"}.
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
                  Mention obligatoire : « Bon pour accord »
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
                  {submitting ? 'Envoi...' : 'Signer ce devis'}
                </button>
              </div>

              {/* Legal mention */}
              <p className="text-xs text-center mt-4 text-slate-400">
                Cette signature électronique a valeur légale conformément au règlement eIDAS (UE 910/2014).
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
