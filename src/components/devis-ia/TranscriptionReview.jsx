import React, { useState } from 'react';
import { Edit3, Check, RotateCcw, MapPin, Sparkles } from 'lucide-react';

/**
 * Validation transcription : brut vs nettoyé, édition manuelle, badges corrections.
 */
export default function TranscriptionReview({
  rawText,
  cleanedText,
  corrections,
  detectedCity,
  onUpdate,
  isDark,
  couleur,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(cleanedText);
  const [showRaw, setShowRaw] = useState(false);

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const chipBg = isDark ? 'bg-slate-700' : 'bg-slate-100';

  const handleSave = () => {
    onUpdate(editedText);
    setIsEditing(false);
  };

  const handleReset = () => {
    setEditedText(cleanedText);
    setIsEditing(false);
  };

  return (
    <div className={`rounded-2xl border p-4 sm:p-6 space-y-4 ${cardBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles size={18} style={{ color: couleur }} />
          Transcription nettoyée
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${
              showRaw
                ? 'text-white'
                : `${chipBg} ${textMuted} hover:opacity-80`
            }`}
            style={showRaw ? { background: couleur } : {}}
          >
            {showRaw ? 'Nettoyé' : 'Voir brut'}
          </button>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${chipBg} ${textMuted} hover:opacity-80`}
            >
              <Edit3 size={12} />
              Modifier
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={handleSave}
                className="text-xs px-2 py-1 rounded-lg text-white flex items-center gap-1"
                style={{ background: couleur }}
              >
                <Check size={12} />
              </button>
              <button
                onClick={handleReset}
                className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${chipBg} ${textMuted}`}
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Text content */}
      {showRaw ? (
        <div className={`p-3 rounded-xl text-sm leading-relaxed ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} ${textMuted}`}>
          {rawText}
        </div>
      ) : isEditing ? (
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          rows={4}
          className={`w-full p-3 rounded-xl text-sm leading-relaxed border resize-none focus:outline-none focus:ring-2 ${inputBg}`}
          style={{ focusRingColor: couleur }}
          autoFocus
        />
      ) : (
        <div className={`p-3 rounded-xl text-sm leading-relaxed ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
          {editedText || cleanedText}
        </div>
      )}

      {/* Corrections chips */}
      {corrections && corrections.length > 0 && (
        <div className="space-y-2">
          <p className={`text-xs font-medium ${textMuted}`}>Corrections appliquées :</p>
          <div className="flex flex-wrap gap-1.5">
            {corrections.map((c, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${chipBg}`}
              >
                <span className={textMuted} style={{ textDecoration: 'line-through' }}>{c.from}</span>
                <span style={{ color: couleur }}>→</span>
                <span className="font-medium">{c.to}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detected location */}
      {detectedCity && (
        <div
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
          style={{ background: `${couleur}15`, color: couleur }}
        >
          <MapPin size={14} />
          <span>📍 Tarifs adaptés pour <strong>{detectedCity}</strong></span>
        </div>
      )}
    </div>
  );
}
