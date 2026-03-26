import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RotateCcw, Check, X, Save, Send, ChevronDown, AlertCircle } from 'lucide-react';

/**
 * Canvas de signature inline (léger, sans dépendance externe)
 */
function SignatureField({ isDark, couleur, value, onChange }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Set canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isDark ? '#e2e8f0' : '#1a1a1a';
    // Restore existing signature
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = value;
    }
  }, [isDark]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    onChange?.(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    onChange?.(null);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className={`w-full rounded-xl border touch-none ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}
        style={{ height: 120 }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <button
        type="button"
        onClick={clear}
        className={`absolute top-2 right-2 p-1.5 rounded-lg transition-colors ${isDark ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}

export default function FormFiller({ template, isDark, couleur, showToast, onSubmit, chantierId, clientId, chantiers = [] }) {
  const [selectedChantierId, setSelectedChantierId] = useState(chantierId || '');
  const [values, setValues] = useState(() => {
    const init = {};
    (template?.champs || []).forEach(c => {
      if (c.type === 'checkbox') init[c.id] = false;
      else if (c.type === 'photo') init[c.id] = [];
      else init[c.id] = '';
    });
    return init;
  });
  const [errors, setErrors] = useState({});
  const fileInputRefs = useRef({});

  // Theme
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const updateValue = useCallback((fieldId, val) => {
    setValues(prev => ({ ...prev, [fieldId]: val }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const handlePhotoCapture = (fieldId, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setValues(prev => ({
          ...prev,
          [fieldId]: [...(prev[fieldId] || []), {
            dataUrl: ev.target.result,
            name: file.name,
            timestamp: new Date().toISOString(),
          }],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (fieldId, index) => {
    setValues(prev => {
      const photos = [...(prev[fieldId] || [])];
      photos.splice(index, 1);
      return { ...prev, [fieldId]: photos };
    });
  };

  const validate = () => {
    const newErrors = {};
    (template?.champs || []).forEach(champ => {
      if (!champ.obligatoire) return;
      const val = values[champ.id];
      if (champ.type === 'photo') {
        if (!val || val.length === 0) newErrors[champ.id] = 'Photo requise';
      } else if (champ.type === 'signature') {
        if (!val) newErrors[champ.id] = 'Signature requise';
      } else if (champ.type === 'checkbox') {
        if (!val) newErrors[champ.id] = 'Ce champ doit être coché';
      } else {
        if (!val && val !== 0) newErrors[champ.id] = 'Champ requis';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (draft = false) => {
    if (!draft && !validate()) {
      showToast?.('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    const submission = {
      id: `sub_${Date.now()}`,
      templateId: template?.id,
      templateName: template?.name,
      chantierId: selectedChantierId || chantierId || null,
      clientId: clientId || null,
      values,
      status: draft ? 'brouillon' : 'soumis',
      createdAt: new Date().toISOString(),
    };

    onSubmit?.(submission);
    showToast?.(draft ? 'Brouillon enregistré' : 'Formulaire soumis', 'success');
  };

  const renderField = (champ) => {
    const error = errors[champ.id];
    const errorClass = error ? 'border-red-400 ring-1 ring-red-400' : '';

    switch (champ.type) {
      case 'texte':
        return (
          <textarea
            value={values[champ.id] || ''}
            onChange={(e) => updateValue(champ.id, e.target.value)}
            placeholder={`Saisir ${champ.label.toLowerCase()}...`}
            rows={2}
            className={`w-full px-3 py-2.5 rounded-xl border text-sm resize-none ${inputBg} ${errorClass} focus:outline-none focus:ring-2`}
            style={{ '--tw-ring-color': couleur }}
          />
        );

      case 'nombre':
        return (
          <input
            type="number"
            inputMode="decimal"
            value={values[champ.id] || ''}
            onChange={(e) => updateValue(champ.id, e.target.value)}
            placeholder="0"
            className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} ${errorClass} focus:outline-none focus:ring-2`}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={values[champ.id] || ''}
            onChange={(e) => updateValue(champ.id, e.target.value)}
            className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} ${errorClass} focus:outline-none focus:ring-2`}
          />
        );

      case 'photo':
        return (
          <div className="space-y-2">
            {(values[champ.id] || []).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {(values[champ.id] || []).map((photo, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300">
                    <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(champ.id, i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={el => fileInputRefs.current[champ.id] = el}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => handlePhotoCapture(champ.id, e)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRefs.current[champ.id]?.click()}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-all w-full justify-center ${error ? 'border-red-400 text-red-400' : ''}`}
              style={!error ? { borderColor: `${couleur}40`, color: couleur } : {}}
            >
              <Camera size={16} />
              Prendre une photo
            </button>
          </div>
        );

      case 'signature':
        return (
          <div className={error ? 'ring-1 ring-red-400 rounded-xl' : ''}>
            <SignatureField
              isDark={isDark}
              couleur={couleur}
              value={values[champ.id]}
              onChange={(val) => updateValue(champ.id, val)}
            />
          </div>
        );

      case 'checkbox':
        return (
          <button
            type="button"
            onClick={() => updateValue(champ.id, !values[champ.id])}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border w-full transition-all ${cardBg} ${error ? 'border-red-400' : ''}`}
          >
            <div
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${values[champ.id] ? 'border-transparent' : isDark ? 'border-slate-500' : 'border-slate-300'}`}
              style={values[champ.id] ? { background: couleur } : {}}
            >
              {values[champ.id] && <Check size={14} className="text-white" />}
            </div>
            <span className={`text-sm ${textPrimary}`}>{champ.label}</span>
          </button>
        );

      case 'selection':
        return (
          <div className="relative">
            <select
              value={values[champ.id] || ''}
              onChange={(e) => updateValue(champ.id, e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm appearance-none ${inputBg} ${errorClass} focus:outline-none focus:ring-2`}
            >
              <option value="">Sélectionner...</option>
              {(champ.options || []).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${textSecondary}`} />
          </div>
        );

      case 'remarque':
        return (
          <textarea
            value={values[champ.id] || ''}
            onChange={(e) => updateValue(champ.id, e.target.value)}
            placeholder="Observations..."
            rows={3}
            className={`w-full px-3 py-2.5 rounded-xl border text-sm resize-none ${inputBg} ${errorClass} focus:outline-none focus:ring-2`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={values[champ.id] || ''}
            onChange={(e) => updateValue(champ.id, e.target.value)}
            className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inputBg} focus:outline-none focus:ring-2`}
          />
        );
    }
  };

  if (!template) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <h2 className={`text-lg font-bold ${textPrimary}`}>{template.name}</h2>
        <p className={`text-sm mt-0.5 ${textSecondary}`}>{template.categorie}</p>
      </div>

      {/* Chantier associé */}
      {chantiers.length > 0 && (
        <div className={`rounded-xl border p-4 ${cardBg}`}>
          <label className={`flex items-center gap-1.5 text-sm font-medium mb-2 ${textPrimary}`}>
            Chantier associé
          </label>
          <div className="relative">
            <select
              value={selectedChantierId}
              onChange={(e) => setSelectedChantierId(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm appearance-none ${inputBg} focus:outline-none focus:ring-2`}
            >
              <option value="">Aucun chantier</option>
              {chantiers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name || c.nom || c.titre || `Chantier ${c.id?.slice(0, 8)}`}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${textSecondary}`} />
          </div>
        </div>
      )}

      {/* Fields */}
      <div className="space-y-4">
        {(template.champs || []).map(champ => (
          <div key={champ.id} className={`rounded-xl border p-4 ${cardBg}`}>
            <label className={`flex items-center gap-1.5 text-sm font-medium mb-2 ${textPrimary}`}>
              {champ.label}
              {champ.obligatoire && <span className="text-red-400">*</span>}
            </label>
            {renderField(champ)}
            {errors[champ.id] && (
              <p className="flex items-center gap-1 text-xs text-red-400 mt-1.5">
                <AlertCircle size={12} />
                {errors[champ.id]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2 sticky bottom-4">
        <button
          onClick={() => handleSubmit(true)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all active:scale-95 ${cardBg} ${textPrimary}`}
        >
          <Save size={16} />
          Enregistrer brouillon
        </button>
        <button
          onClick={() => handleSubmit(false)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg transition-all active:scale-95"
          style={{ background: couleur }}
        >
          <Send size={16} />
          Soumettre
        </button>
      </div>
    </div>
  );
}
