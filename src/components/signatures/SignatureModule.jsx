import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PenTool,
  FileCheck,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Trash2,
  Download,
  Eye,
  FileText,
  Users,
  Hash,
  Globe,
  Calendar,
  Mail,
  User,
  X,
  ChevronRight,
  Info,
  Check
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LS_KEY = 'cp_signatures';

const loadSignatures = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveSignatures = (sigs) => {
  localStorage.setItem(LS_KEY, JSON.stringify(sigs));
};

const generateHash = () => {
  const chars = '0123456789abcdef';
  return Array.from({ length: 64 }, () => chars[Math.floor(Math.random() * 16)]).join('');
};

const generateIP = () => `192.168.1.${Math.floor(Math.random() * 200) + 10}`;

const formatMoney = (n) =>
  (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatDateTime = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ROLE_LABELS = {
  client: 'Client',
  artisan: 'Artisan',
  sous_traitant: 'Sous-traitant',
  maitre_ouvrage: "Maître d'ouvrage",
};

const STATUT_CONFIG = {
  en_attente: { label: 'En attente', color: 'amber', Icon: Clock },
  signee: { label: 'Signé', color: 'green', Icon: CheckCircle },
  refusee: { label: 'Refusé', color: 'red', Icon: XCircle },
  expiree: { label: 'Expiré', color: 'gray', Icon: AlertCircle },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({ label, value, color, Icon, isDark }) {
  const colorMap = {
    blue: isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600',
    amber: isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-50 text-amber-600',
    green: isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-600',
    red: isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600',
  };
  const iconBg = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-4 ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}
    >
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          {value}
        </p>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ statut, isDark }) {
  const cfg = STATUT_CONFIG[statut] || STATUT_CONFIG.en_attente;
  const colorStyles = {
    amber: isDark
      ? 'bg-amber-900/30 text-amber-400 border-amber-800'
      : 'bg-amber-50 text-amber-700 border-amber-200',
    green: isDark
      ? 'bg-green-900/30 text-green-400 border-green-800'
      : 'bg-green-50 text-green-700 border-green-200',
    red: isDark
      ? 'bg-red-900/30 text-red-400 border-red-800'
      : 'bg-red-50 text-red-700 border-red-200',
    gray: isDark
      ? 'bg-slate-700 text-slate-400 border-slate-600'
      : 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const style = colorStyles[cfg.color] || colorStyles.gray;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style}`}>
      <cfg.Icon size={13} />
      {cfg.label}
    </span>
  );
}

function DocumentTypeBadge({ type, isDark }) {
  const isDevis = type === 'devis';
  const style = isDevis
    ? isDark
      ? 'bg-blue-900/30 text-blue-400 border-blue-800'
      : 'bg-blue-50 text-blue-700 border-blue-200'
    : isDark
    ? 'bg-purple-900/30 text-purple-400 border-purple-800'
    : 'bg-purple-50 text-purple-700 border-purple-200';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      <FileText size={11} />
      {isDevis ? 'Devis' : 'Facture'}
    </span>
  );
}

function AuditTrail({ events, isDark }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="space-y-0">
      {events.map((evt, i) => (
        <div key={i} className="flex items-start gap-3 relative">
          {/* Vertical line */}
          {i < events.length - 1 && (
            <div
              className={`absolute left-[9px] top-5 bottom-0 w-px ${
                isDark ? 'bg-slate-700' : 'bg-slate-200'
              }`}
            />
          )}
          {/* Dot */}
          <div
            className={`w-[19px] h-[19px] mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              i === events.length - 1
                ? 'bg-green-500 border-green-500'
                : isDark
                ? 'bg-slate-800 border-slate-600'
                : 'bg-white border-slate-300'
            }`}
          >
            {i === events.length - 1 && <Check size={10} className="text-white" />}
          </div>
          {/* Content */}
          <div className="pb-4">
            <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {evt.action}
            </p>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {formatDateTime(evt.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SignatureModule({ devis = [], chantiers = [], clients = [], isDark = false, couleur = '#f97316' }) {
  // ---- State ----
  const [signatures, setSignatures] = useState(loadSignatures);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'sign' | 'detail'
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedSignature, setSelectedSignature] = useState(null);
  const [toast, setToast] = useState(null);

  // Sign flow state
  const [signStep, setSignStep] = useState(1); // 1, 2, 3
  const [certifie, setCertifie] = useState(false);
  const [signataireNom, setSignataireNom] = useState('');
  const [signataireEmail, setSignataireEmail] = useState('');
  const [signataireRole, setSignataireRole] = useState('client');
  const [signatureData, setSignatureData] = useState(null);
  const [signatureHash, setSignatureHash] = useState('');
  const [auditEvents, setAuditEvents] = useState([]);

  // Canvas state
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // ---- Persist signatures ----
  useEffect(() => {
    saveSignatures(signatures);
  }, [signatures]);

  // ---- Toast auto-dismiss ----
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ---- Theme helpers ----
  const cardClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputClass = isDark
    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
    : 'bg-white border-slate-300 text-slate-900';
  const textClass = isDark ? 'text-slate-100' : 'text-slate-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-600';
  const overlayClass = isDark ? 'bg-slate-900/80' : 'bg-black/50';

  // ---- Build document list from devis ----
  const documents = devis.map((d) => ({
    id: d.id,
    type: d.type || 'devis',
    ref: d.numero || d.ref || `D-${d.id?.slice(0, 8) || '0000'}`,
    client_name:
      d.client_name ||
      d.client?.nom ||
      (d.client_id
        ? (clients.find(c => c.id === d.client_id)?.nom ||
           clients.find(c => c.id === d.client_id)?.entreprise ||
           `Client ${d.client_id.slice(0, 6)}`)
        : 'Client inconnu'),
    date: d.date || d.created_at || new Date().toISOString(),
    montant_ttc: d.montant_ttc ?? d.total_ttc ?? d.montant ?? 0,
  }));

  // Map signatures by document id
  const sigByDoc = {};
  signatures.forEach((s) => {
    sigByDoc[s.document_id] = s;
  });

  // ---- KPIs ----
  const totalSigs = signatures.length;
  const enAttente = signatures.filter((s) => s.statut === 'en_attente').length;
  const signes = signatures.filter((s) => s.statut === 'signee').length;
  const refuses = signatures.filter((s) => s.statut === 'refusee').length;

  // ---- Canvas setup ----
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.min(container.offsetWidth - 2, 500);
    const height = 200;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = isDark ? '#ffffff' : '#1e293b';
  }, [isDark]);

  useEffect(() => {
    if (view === 'sign' && signStep === 2) {
      // Small delay to ensure DOM is rendered
      const t = setTimeout(setupCanvas, 50);
      return () => clearTimeout(t);
    }
  }, [view, signStep, setupCanvas]);

  useEffect(() => {
    if (view === 'sign' && signStep === 2) {
      const handleResize = () => setupCanvas();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [view, signStep, setupCanvas]);

  // ---- Canvas Drawing ----
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    ctx.strokeStyle = isDark ? '#ffffff' : '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    draw({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    stopDrawing();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasSignature(false);
  };

  // ---- Flow actions ----
  const openSignFlow = (doc) => {
    setSelectedDoc(doc);
    setSignStep(1);
    setCertifie(false);
    setSignataireNom('');
    setSignataireEmail('');
    setSignataireRole('client');
    setSignatureData(null);
    setSignatureHash('');
    setHasSignature(false);
    setAuditEvents([
      { action: 'Document ouvert', timestamp: new Date().toISOString() },
    ]);
    setView('sign');
  };

  const goToStep2 = () => {
    setAuditEvents((prev) => [
      ...prev,
      { action: 'Signature commencée', timestamp: new Date().toISOString() },
    ]);
    setSignStep(2);
  };

  const validateSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/png');
    setSignatureData(dataURL);
    setSignatureHash(generateHash());
    setSignStep(3);
  };

  const confirmSignature = () => {
    const now = new Date().toISOString();
    const finalAudit = [
      ...auditEvents,
      { action: 'Signature validée', timestamp: now },
    ];

    const newSig = {
      id: crypto.randomUUID(),
      document_id: selectedDoc.id,
      document_type: selectedDoc.type,
      document_ref: selectedDoc.ref,
      document_montant: selectedDoc.montant_ttc,
      signataire_nom: signataireNom.trim(),
      signataire_email: signataireEmail.trim(),
      signataire_role: signataireRole,
      signature_data: signatureData,
      ip_address: generateIP(),
      hash_document: signatureHash,
      date_signature: now,
      statut: 'signee',
      audit_trail: finalAudit,
      created_at: now,
    };

    setSignatures((prev) => [newSig, ...prev]);
    setToast('Signature enregistrée avec succès');
    setView('dashboard');
  };

  const cancelSignature = () => {
    setView('dashboard');
    setSelectedDoc(null);
  };

  const openDetail = (sig) => {
    setSelectedSignature(sig);
    setView('detail');
  };

  const backToDashboard = () => {
    setView('dashboard');
    setSelectedDoc(null);
    setSelectedSignature(null);
  };

  // ---- Documents not yet signed ----
  const unsignedDocs = documents.filter((d) => !sigByDoc[d.id]);
  const recentSigs = [...signatures].sort(
    (a, b) => new Date(b.date_signature) - new Date(a.date_signature)
  );

  // =========================================================================
  // RENDER: Detail View
  // =========================================================================
  if (view === 'detail' && selectedSignature) {
    const sig = selectedSignature;
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={backToDashboard}
            className={`p-2 rounded-lg border transition-colors ${
              isDark
                ? 'border-slate-700 hover:bg-slate-700 text-slate-300'
                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${textClass}`}>
              Détail de la signature
            </h2>
            <p className={`text-sm ${mutedClass}`}>{sig.document_ref}</p>
          </div>
          <StatusBadge statut={sig.statut} isDark={isDark} />
        </div>

        {/* Document info */}
        <div className={`rounded-xl border p-5 space-y-4 ${cardClass}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${mutedClass}`}>
            Document
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <FileText size={16} className={mutedClass} />
              <div>
                <p className={`text-xs ${mutedClass}`}>Référence</p>
                <p className={`text-sm font-medium ${textClass}`}>{sig.document_ref}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DocumentTypeBadge type={sig.document_type} isDark={isDark} />
              <div>
                <p className={`text-xs ${mutedClass}`}>Type</p>
                <p className={`text-sm font-medium ${textClass}`}>
                  {sig.document_type === 'devis' ? 'Devis' : 'Facture'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={16} className={mutedClass} />
              <div>
                <p className={`text-xs ${mutedClass}`}>Montant TTC</p>
                <p className={`text-sm font-bold ${textClass}`}>
                  {formatMoney(sig.document_montant)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Signature image */}
        <div className={`rounded-xl border p-5 space-y-4 ${cardClass}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${mutedClass}`}>
            Signature
          </h3>
          {sig.signature_data && (
            <div
              className={`rounded-lg border p-4 flex justify-center ${
                isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <img
                src={sig.signature_data}
                alt="Signature"
                className="max-w-full h-auto max-h-32"
                style={isDark ? { filter: 'invert(0)' } : {}}
              />
            </div>
          )}
        </div>

        {/* Signataire info */}
        <div className={`rounded-xl border p-5 space-y-4 ${cardClass}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${mutedClass}`}>
            Signataire
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User size={16} className={mutedClass} />
              <div>
                <p className={`text-xs ${mutedClass}`}>Nom</p>
                <p className={`text-sm font-medium ${textClass}`}>{sig.signataire_nom}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={16} className={mutedClass} />
              <div>
                <p className={`text-xs ${mutedClass}`}>Email</p>
                <p className={`text-sm font-medium ${textClass}`}>{sig.signataire_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users size={16} className={mutedClass} />
              <div>
                <p className={`text-xs ${mutedClass}`}>Rôle</p>
                <p className={`text-sm font-medium ${textClass}`}>
                  {ROLE_LABELS[sig.signataire_role] || sig.signataire_role}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical details */}
        <div className={`rounded-xl border p-5 space-y-4 ${cardClass}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${mutedClass}`}>
            Informations techniques
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar size={16} className={mutedClass} />
              <div>
                <p className={`text-xs ${mutedClass}`}>Date et heure de signature</p>
                <p className={`text-sm font-medium ${textClass}`}>
                  {formatDateTime(sig.date_signature)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Globe size={16} className={mutedClass} />
              <div>
                <p className={`text-xs ${mutedClass}`}>Adresse IP</p>
                <p className={`text-sm font-mono ${textClass}`}>{sig.ip_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:col-span-2">
              <Hash size={16} className={`${mutedClass} mt-0.5`} />
              <div className="min-w-0">
                <p className={`text-xs ${mutedClass}`}>Hash du document</p>
                <p className={`text-xs font-mono break-all ${textClass}`}>{sig.hash_document}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Audit trail */}
        <div className={`rounded-xl border p-5 space-y-4 ${cardClass}`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${mutedClass}`}>
            Piste d'audit
          </h3>
          <AuditTrail events={sig.audit_trail} isDark={isDark} />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setToast('Fonctionnalité disponible prochainement')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: couleur }}
          >
            <Download size={16} />
            Télécharger le certificat
          </button>
          <button
            onClick={backToDashboard}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              isDark
                ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Sign Flow (Modal overlay)
  // =========================================================================
  if (view === 'sign' && selectedDoc) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={cancelSignature}
            className={`p-2 rounded-lg border transition-colors ${
              isDark
                ? 'border-slate-700 hover:bg-slate-700 text-slate-300'
                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${textClass}`}>Signature de document</h2>
            <p className={`text-sm ${mutedClass}`}>{selectedDoc.ref}</p>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  s === signStep
                    ? 'text-white'
                    : s < signStep
                    ? 'text-white opacity-70'
                    : isDark
                    ? 'bg-slate-700 text-slate-500'
                    : 'bg-slate-100 text-slate-400'
                }`}
                style={
                  s <= signStep ? { backgroundColor: couleur } : {}
                }
              >
                {s < signStep ? <Check size={14} /> : s}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Document Summary */}
        {signStep === 1 && (
          <div className="space-y-5">
            {/* Doc summary card */}
            <div className={`rounded-xl border p-5 space-y-4 ${cardClass}`}>
              <h3 className={`text-base font-semibold ${textClass}`}>
                Résumé du document
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className={`text-xs ${mutedClass}`}>Référence</p>
                  <p className={`text-sm font-medium ${textClass}`}>{selectedDoc.ref}</p>
                </div>
                <div>
                  <p className={`text-xs ${mutedClass}`}>Client</p>
                  <p className={`text-sm font-medium ${textClass}`}>{selectedDoc.client_name}</p>
                </div>
                <div>
                  <p className={`text-xs ${mutedClass}`}>Montant TTC</p>
                  <p className={`text-sm font-bold ${textClass}`}>
                    {formatMoney(selectedDoc.montant_ttc)}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${mutedClass}`}>Date</p>
                  <p className={`text-sm font-medium ${textClass}`}>
                    {formatDate(selectedDoc.date)}
                  </p>
                </div>
              </div>
              <DocumentTypeBadge type={selectedDoc.type} isDark={isDark} />
            </div>

            {/* Certification checkbox */}
            <div className={`rounded-xl border p-5 ${cardClass}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={certifie}
                  onChange={(e) => setCertifie(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded accent-current"
                  style={{ accentColor: couleur }}
                />
                <span className={`text-sm ${textClass}`}>
                  Je certifie avoir pris connaissance du document et de son contenu.
                </span>
              </label>
            </div>

            {/* Signataire info */}
            <div className={`rounded-xl border p-5 space-y-4 ${cardClass}`}>
              <h3 className={`text-base font-semibold ${textClass}`}>
                Informations du signataire
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textClass}`}>Nom complet</label>
                  <input
                    type="text"
                    value={signataireNom}
                    onChange={(e) => setSignataireNom(e.target.value)}
                    placeholder="Jean Dupont"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-colors ${inputClass}`}
                    style={{ '--tw-ring-color': couleur }}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textClass}`}>Email</label>
                  <input
                    type="email"
                    value={signataireEmail}
                    onChange={(e) => setSignataireEmail(e.target.value)}
                    placeholder="jean@exemple.fr"
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-colors ${inputClass}`}
                    style={{ '--tw-ring-color': couleur }}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${textClass}`}>Rôle</label>
                  <select
                    value={signataireRole}
                    onChange={(e) => setSignataireRole(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 transition-colors ${inputClass}`}
                    style={{ '--tw-ring-color': couleur }}
                  >
                    {Object.entries(ROLE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Next button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelSignature}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  isDark
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={goToStep2}
                disabled={
                  !certifie || !signataireNom.trim() || !signataireEmail.trim()
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: couleur }}
              >
                Continuer
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Signature Pad */}
        {signStep === 2 && (
          <div className="space-y-5">
            <div className={`rounded-xl border p-5 space-y-4 ${cardClass}`}>
              <h3 className={`text-base font-semibold ${textClass}`}>
                Dessinez votre signature
              </h3>
              <p className={`text-sm ${mutedClass}`}>
                Utilisez votre souris ou votre doigt pour signer dans le cadre ci-dessous.
              </p>

              {/* Canvas container */}
              <div ref={containerRef} className="flex justify-center">
                <div className="relative w-full" style={{ maxWidth: 500 }}>
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`w-full rounded-lg border-2 border-dashed cursor-crosshair touch-none ${
                      isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                    style={{ height: 200 }}
                  />
                  {/* Hint text */}
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span
                        className={`text-lg font-light select-none ${
                          isDark ? 'text-slate-700' : 'text-slate-200'
                        }`}
                      >
                        Signez ici
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Canvas actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={clearCanvas}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    isDark
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Trash2 size={14} />
                  Effacer
                </button>
                <p className={`text-xs ${mutedClass}`}>
                  {hasSignature ? 'Signature détectée' : 'En attente de signature...'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSignStep(1)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  isDark
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Retour
              </button>
              <button
                onClick={validateSignature}
                disabled={!hasSignature}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: couleur }}
              >
                <PenTool size={16} />
                Valider la signature
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {signStep === 3 && (
          <div className="space-y-5">
            {/* Signature preview */}
            <div className={`rounded-xl border p-5 space-y-4 ${cardClass}`}>
              <h3 className={`text-base font-semibold ${textClass}`}>
                Confirmation de signature
              </h3>

              {signatureData && (
                <div
                  className={`rounded-lg border p-4 flex justify-center ${
                    isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <img
                    src={signatureData}
                    alt="Aperçu de la signature"
                    className="max-w-full h-auto max-h-28"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className={`text-xs ${mutedClass}`}>Signataire</p>
                  <p className={`text-sm font-medium ${textClass}`}>{signataireNom}</p>
                </div>
                <div>
                  <p className={`text-xs ${mutedClass}`}>Date et heure</p>
                  <p className={`text-sm font-medium ${textClass}`}>
                    {formatDateTime(new Date().toISOString())}
                  </p>
                </div>
              </div>

              {/* Hash */}
              <div
                className={`rounded-lg border p-3 ${
                  isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Hash size={13} className={mutedClass} />
                  <p className={`text-xs font-semibold ${mutedClass}`}>Hash SHA-256 du document</p>
                </div>
                <p className={`text-xs font-mono break-all ${textClass}`}>{signatureHash}</p>
              </div>
            </div>

            {/* Legal text */}
            <div
              className={`rounded-xl border p-4 flex items-start gap-3 ${
                isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <Shield size={18} className={isDark ? 'text-blue-400 mt-0.5' : 'text-blue-600 mt-0.5'} />
              <p className={`text-xs leading-relaxed ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                En validant, vous confirmez que cette signature a la même valeur juridique
                qu'une signature manuscrite conformément au règlement eIDAS.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={cancelSignature}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  isDark
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={confirmSignature}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: couleur }}
              >
                <FileCheck size={16} />
                Confirmer et enregistrer
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER: Dashboard (default)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-pulse"
          style={{ backgroundColor: couleur }}
        >
          <CheckCircle size={16} />
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textClass}`}>
            Signature électronique
          </h1>
          <p className={`text-sm mt-1 ${mutedClass}`}>
            Signez et gérez vos documents en toute sécurité
          </p>
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundColor: couleur }}
        >
          <PenTool size={20} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Total signatures"
          value={totalSigs}
          color="blue"
          Icon={PenTool}
          isDark={isDark}
        />
        <KpiCard
          label="En attente"
          value={enAttente}
          color="amber"
          Icon={Clock}
          isDark={isDark}
        />
        <KpiCard
          label="Signés"
          value={signes}
          color="green"
          Icon={CheckCircle}
          isDark={isDark}
        />
        <KpiCard
          label="Refusés"
          value={refuses}
          color="red"
          Icon={XCircle}
          isDark={isDark}
        />
      </div>

      {/* Documents a signer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-semibold ${textClass}`}>
            Documents à signer
          </h2>
          <span className={`text-sm ${mutedClass}`}>
            {unsignedDocs.length} document{unsignedDocs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {unsignedDocs.length === 0 ? (
          <div
            className={`rounded-xl border p-8 text-center ${cardClass}`}
          >
            <FileCheck size={40} className={`mx-auto mb-3 ${mutedClass}`} />
            <p className={`text-sm font-medium ${textClass}`}>
              Tous les documents sont signés
            </p>
            <p className={`text-xs mt-1 ${mutedClass}`}>
              Aucun document en attente de signature.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {unsignedDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => openSignFlow(doc)}
                className={`w-full text-left rounded-xl border p-4 transition-colors group ${cardClass} ${
                  isDark ? 'hover:bg-slate-750 hover:border-slate-600' : 'hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-semibold truncate ${textClass}`}>
                        {doc.ref}
                      </p>
                      <DocumentTypeBadge type={doc.type} isDark={isDark} />
                    </div>
                    <p className={`text-xs truncate ${mutedClass}`}>{doc.client_name}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-xs ${mutedClass}`}>{formatDate(doc.date)}</span>
                      <span className={`text-sm font-bold ${textClass}`}>
                        {formatMoney(doc.montant_ttc)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        isDark
                          ? 'bg-slate-700 text-slate-400 border-slate-600'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      Non signé
                    </span>
                    <ChevronRight
                      size={18}
                      className={`transition-transform group-hover:translate-x-0.5 ${mutedClass}`}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Signatures recentes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-semibold ${textClass}`}>
            Signatures récentes
          </h2>
          <span className={`text-sm ${mutedClass}`}>
            {recentSigs.length} signature{recentSigs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {recentSigs.length === 0 ? (
          <div
            className={`rounded-xl border p-8 text-center ${cardClass}`}
          >
            <PenTool size={40} className={`mx-auto mb-3 ${mutedClass}`} />
            <p className={`text-sm font-medium ${textClass}`}>
              Aucune signature enregistrée
            </p>
            <p className={`text-xs mt-1 ${mutedClass}`}>
              Les signatures apparaîtront ici une fois effectuées.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSigs.map((sig) => (
              <button
                key={sig.id}
                onClick={() => openDetail(sig)}
                className={`w-full text-left rounded-xl border p-4 transition-colors group ${cardClass} ${
                  isDark ? 'hover:bg-slate-750 hover:border-slate-600' : 'hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-semibold truncate ${textClass}`}>
                        {sig.document_ref}
                      </p>
                      <DocumentTypeBadge type={sig.document_type} isDark={isDark} />
                    </div>
                    <p className={`text-xs truncate ${mutedClass}`}>
                      {sig.signataire_nom} &middot; {ROLE_LABELS[sig.signataire_role] || sig.signataire_role}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-xs ${mutedClass}`}>
                        {formatDateTime(sig.date_signature)}
                      </span>
                      <span className={`text-sm font-bold ${textClass}`}>
                        {formatMoney(sig.document_montant)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge statut={sig.statut} isDark={isDark} />
                    <ChevronRight
                      size={18}
                      className={`transition-transform group-hover:translate-x-0.5 ${mutedClass}`}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Security footer */}
      <div
        className={`rounded-xl border p-4 flex items-start gap-3 ${
          isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <Shield size={18} className={mutedClass} />
        <div>
          <p className={`text-sm font-medium ${textClass}`}>
            Signatures sécurisées
          </p>
          <p className={`text-xs mt-0.5 ${mutedClass}`}>
            Vos signatures électroniques sont conformes au règlement eIDAS et ont la
            même valeur juridique qu'une signature manuscrite. Chaque signature est
            horodatée et associée à un hash unique pour garantir l'intégrité du document.
          </p>
        </div>
      </div>
    </div>
  );
}
