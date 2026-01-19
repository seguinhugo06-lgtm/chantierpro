import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Check, RotateCcw, Pen, Calendar, FileCheck, Info } from 'lucide-react';

/**
 * Composant de signature electronique
 * Permet au client de signer directement sur tablette/mobile
 */
export default function SignaturePad({
  isOpen,
  onClose,
  onSave,
  document,
  client,
  entreprise,
  isDark,
  couleur
}) {
  const sigPad = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [acceptCGV, setAcceptCGV] = useState(false);
  const [clientName, setClientName] = useState('');
  const [step, setStep] = useState('info'); // 'info' ou 'sign'

  // Theme classes
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300";

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setAcceptCGV(false);
      setClientName(client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '');
      setIsEmpty(true);
      if (sigPad.current) {
        sigPad.current.clear();
      }
    }
  }, [isOpen, client]);

  if (!isOpen || !document) return null;

  const formatMoney = (n) => (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' EUR';
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleClear = () => {
    if (sigPad.current) {
      sigPad.current.clear();
      setIsEmpty(true);
    }
  };

  const handleEnd = () => {
    if (sigPad.current) {
      setIsEmpty(sigPad.current.isEmpty());
    }
  };

  const handleSave = () => {
    if (!sigPad.current || sigPad.current.isEmpty()) return;
    if (!acceptCGV) return;

    const signatureData = sigPad.current.toDataURL('image/png');
    onSave({
      signature: signatureData,
      signatureDate: new Date().toISOString(),
      signataire: clientName,
      acceptCGV: true
    });
    onClose();
  };

  const canProceed = acceptCGV && clientName.trim().length > 0;
  const canSign = !isEmpty && acceptCGV;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`${cardBg} rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
              <Pen size={20} style={{ color: couleur }} />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${textPrimary}`}>Signature electronique</h2>
              <p className={`text-sm ${textMuted}`}>{document.numero}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors`}
          >
            <X size={20} className={textSecondary} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {step === 'info' && (
            <>
              {/* Resume du document */}
              <div className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <FileCheck size={24} style={{ color: couleur }} />
                  <div>
                    <p className={`font-medium ${textPrimary}`}>
                      {document.type === 'devis' ? 'Devis' : 'Facture'} {document.numero}
                    </p>
                    <p className={`text-sm ${textMuted}`}>
                      {entreprise?.nom || 'Entreprise'}
                    </p>
                  </div>
                </div>
                <div className={`pt-3 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={textSecondary}>Montant TTC</span>
                    <span className="text-xl font-bold" style={{ color: couleur }}>
                      {formatMoney(document.total_ttc)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nom du signataire */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>
                  Nom du signataire *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Prenom Nom"
                  className={`w-full px-4 py-3 border rounded-xl ${inputBg}`}
                />
              </div>

              {/* Date */}
              <div className={`flex items-center gap-2 mb-4 ${textSecondary}`}>
                <Calendar size={16} />
                <span className="text-sm">Date de signature : {today}</span>
              </div>

              {/* CGV */}
              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                acceptCGV
                  ? (isDark ? 'border-emerald-500 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50')
                  : (isDark ? 'border-slate-600' : 'border-slate-200')
              }`}>
                <input
                  type="checkbox"
                  checked={acceptCGV}
                  onChange={e => setAcceptCGV(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded"
                />
                <div>
                  <p className={`font-medium ${textPrimary}`}>J'accepte ce devis</p>
                  <p className={`text-sm ${textMuted}`}>
                    En signant, j'accepte le devis et les conditions générales de vente de {entreprise?.nom || 'l\'entreprise'}.
                  </p>
                </div>
              </label>

              {/* Bouton continuer */}
              <button
                onClick={() => setStep('sign')}
                disabled={!canProceed}
                className="w-full mt-5 py-4 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg"
                style={{ background: couleur }}
              >
                <Pen size={20} />
                Passer a la signature
              </button>
            </>
          )}

          {step === 'sign' && (
            <>
              {/* Instructions */}
              <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <Info size={20} className="text-blue-500" />
                <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  Signez dans le cadre ci-dessous avec votre doigt ou un stylet
                </p>
              </div>

              {/* Zone de signature */}
              <div className={`relative border-2 rounded-xl overflow-hidden mb-4 ${isDark ? 'border-slate-600 bg-white' : 'border-slate-300 bg-white'}`}>
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

              {/* Bouton effacer */}
              <button
                onClick={handleClear}
                className={`w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 mb-4 ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <RotateCcw size={16} />
                Effacer
              </button>

              {/* Resume */}
              <div className={`text-sm ${textMuted} mb-4`}>
                <p><strong className={textPrimary}>Signataire :</strong> {clientName}</p>
                <p><strong className={textPrimary}>Date :</strong> {today}</p>
                <p><strong className={textPrimary}>Document :</strong> {document.numero} - {formatMoney(document.total_ttc)}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className={`flex-1 py-3 rounded-xl font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                >
                  Retour
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canSign}
                  className="flex-1 py-3 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg"
                  style={{ background: couleur }}
                >
                  <Check size={20} />
                  Valider
                </button>
              </div>

              {/* Mention légale */}
              <p className={`text-xs text-center mt-4 ${textMuted}`}>
                Cette signature électronique a valeur légale conformément au règlement eIDAS (UE 910/2014).
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
