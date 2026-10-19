import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Check, RotateCcw, Pen, Calendar, FileCheck, Info } from 'lucide-react';
import { DEMANDE_URGENCE, DEMANDE_EXPRESSE, DEMANDE_EXPRESSE_AIDE, estConcerneParRetractation } from '../lib/retractation';

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
  // Signature sur place chez un particulier (contrat hors établissement) : demande expresse de commencer avant la
  // fin du délai, recueillie avec la signature (L221-25, sur support durable : le devis signé et l'exemplaire), et
  // accord pour recevoir l'exemplaire signé par e-mail plutôt que sur papier (L221-9) — tâche confirmation-client
  const [executionAnticipee, setExecutionAnticipee] = useState(false);
  const [exemplaireParEmail, setExemplaireParEmail] = useState(false);

  // Theme classes
  const cardBg = "bg-surface";
  const textPrimary = "text-encre";
  const textSecondary = "text-encre-2";
  const textMuted = "text-encre-2";
  const inputBg = "bg-surface border-bord-fort";

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setAcceptCGV(false);
      setExecutionAnticipee(false);
      setExemplaireParEmail(false);
      setClientName(client ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '');
      setIsEmpty(true);
      if (sigPad.current) {
        sigPad.current.clear();
      }
    }
  }, [isOpen, client]);

  if (!isOpen || !document) return null;
  const particulier = estConcerneParRetractation({ doc: document, client });
  const emailClient = String(client?.email || '').trim();

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
      // Use both isEmpty() and check canvas data to be more reliable
      const canvasIsEmpty = sigPad.current.isEmpty();
      // Double-check by examining the canvas data
      const canvas = sigPad.current.getCanvas();
      const ctx = canvas?.getContext('2d');
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      const hasDrawing = imageData?.data.some((pixel, i) => i % 4 === 3 && pixel > 0); // Check alpha channel
      setIsEmpty(canvasIsEmpty && !hasDrawing);
    }
  };

  const handleSave = () => {
    if (!sigPad.current) return;
    if (!acceptCGV) return;
    // Rien de tracé : pas de signature (avant, recette du 9 oct. 2026 : un cadre vide passait le devis « Signé »)
    if (isEmpty) return;

    // Get signature data even if isEmpty() reports true (alpha version bug workaround)
    const signatureData = sigPad.current.toDataURL('image/png');

    // Verify we have actual signature data (not just a blank canvas)
    if (!signatureData || signatureData === 'data:,') return;

    onSave({
      signature: signatureData,
      signatureDate: new Date().toISOString(),
      signataire: clientName,
      acceptCGV: true,
      executionAnticipee: particulier && executionAnticipee,
      exemplaireParEmail: !!emailClient && exemplaireParEmail,
    });
    onClose();
  };

  const canProceed = acceptCGV && clientName.trim().length > 0;
  // Allow signing as long as CGV is accepted - the handleSave will verify actual signature exists
  const canSign = acceptCGV;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`${cardBg} rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
              <Pen size={20} className="text-accent-texte" />
            </div>
            <div>
              <h2 className={`font-bold text-lg ${textPrimary}`}>Signature electronique</h2>
              <p className={`text-sm ${textMuted}`}>{document.numero}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl hover:bg-surface-2 transition-colors`}
          >
            <X size={20} className={textSecondary} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {step === 'info' && (
            <>
              {/* Resume du document */}
              <div className={`rounded-xl p-4 mb-5 bg-fond`}>
                <div className="flex items-center gap-3 mb-3">
                  <FileCheck size={24} className="text-accent-texte" />
                  <div>
                    <p className={`font-medium ${textPrimary}`}>
                      {document.type === 'devis' ? 'Devis' : 'Facture'} {document.numero}
                    </p>
                    <p className={`text-sm ${textMuted}`}>
                      {entreprise?.nom || 'Entreprise'}
                    </p>
                  </div>
                </div>
                <div className={`pt-3 border-t border-bord`}>
                  <div className="flex justify-between items-center">
                    <span className={textSecondary}>Montant TTC</span>
                    <span className="text-xl font-bold text-accent-texte">
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
                  : 'border-bord'
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
                    {/* Même texte que la page de signature en ligne (avant : des « conditions générales de vente »
                        citées même sans conditions — relecture juriste-btp du 12 oct. 2026) */}
                    {entreprise?.cgv ? 'En signant, j\'accepte ce devis et les conditions particulières qui y figurent.' : 'En signant, j\'accepte ce devis.'}
                    {/* Réparation urgente (L221-28, 8°) : le client signe sa demande */}
                    {document?.travaux_urgents ? ` ${DEMANDE_URGENCE}` : ''}
                  </p>
                </div>
              </label>

              {/* Demande expresse (L221-25) : particulier seulement, facultative, séparée de l'acceptation */}
              {particulier && (
                <label className={`flex items-start gap-3 p-4 mt-3 rounded-xl border cursor-pointer transition-colors border-bord`} data-ui="DemandeExpresseSurPlace">
                  <input type="checkbox" checked={executionAnticipee} onChange={e => setExecutionAnticipee(e.target.checked)} className="mt-1 w-5 h-5 rounded flex-shrink-0" />
                  <div>
                    <p className={`text-sm font-medium ${textPrimary}`}>{DEMANDE_EXPRESSE}</p>
                    <p className={`text-sm mt-1 ${textMuted}`}>{DEMANDE_EXPRESSE_AIDE} Facultatif.</p>
                  </div>
                </label>
              )}

              {/* Exemplaire signé par e-mail : avec l'accord du client (L221-9), sinon il reçoit un exemplaire papier */}
              {emailClient && (
                <label className={`flex items-start gap-3 p-4 mt-3 rounded-xl border cursor-pointer transition-colors border-bord`} data-ui="ExemplaireParEmail">
                  <input type="checkbox" checked={exemplaireParEmail} onChange={e => setExemplaireParEmail(e.target.checked)} className="mt-1 w-5 h-5 rounded flex-shrink-0" />
                  <p className={`text-sm ${textPrimary}`}>J'accepte de recevoir mon exemplaire du contrat signé par e-mail, à l'adresse {emailClient}, plutôt que sur papier.</p>
                </label>
              )}

              {/* Bouton continuer */}
              <button
                onClick={() => setStep('sign')}
                disabled={!canProceed}
                className="w-full mt-5 py-4 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg bg-accent text-sur-accent"
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
              <div className={`relative border-2 rounded-xl overflow-hidden mb-4 border-bord-fort bg-surface`}>
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
                  className={`flex-1 py-3 rounded-xl font-medium bg-surface-2 text-encre-2`}
                >
                  Retour
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canSign || isEmpty}
                  className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg bg-accent text-sur-accent"
                >
                  <Check size={20} />
                  Valider
                </button>
              </div>

              {/* Mention légale */}
              <p className={`text-xs text-center mt-4 ${textMuted}`}>
                Signature électronique simple : votre nom, la date et l’heure de signature sont enregistrés avec le devis.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
