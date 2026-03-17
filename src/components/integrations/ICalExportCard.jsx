/**
 * ICalExportCard.jsx — iCal subscription URL generator
 *
 * Shows the iCal subscription URL for the user's calendar.
 * Allows copying, regenerating the token, and subscribing from any calendar app.
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar, Copy, RefreshCw, Check, ExternalLink, Smartphone,
  Monitor, AlertCircle, Loader2, Link2,
} from 'lucide-react';
import { getICalUrl, regenerateICalToken } from '../../services/syncService';

export default function ICalExportCard({ isDark, couleur }) {
  const [icalUrl, setIcalUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);

  const bgCard = isDark ? 'bg-slate-800' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const border = isDark ? 'border-slate-700' : 'border-slate-200';

  useEffect(() => {
    loadUrl();
  }, []);

  const loadUrl = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getICalUrl();
      setIcalUrl(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(icalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = icalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Régénérer le lien ? L\'ancien lien sera invalide et les calendriers abonnés ne recevront plus de mises à jour.')) {
      return;
    }
    setRegenerating(true);
    try {
      const data = await regenerateICalToken();
      setIcalUrl(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const calendarApps = [
    { name: 'Google Calendar', icon: '📅', url: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icalUrl?.replace('https://', 'webcal://') || '')}` },
    { name: 'Apple Calendar', icon: '🍎', url: icalUrl?.replace('https://', 'webcal://') || '' },
    { name: 'Outlook', icon: '📧', url: icalUrl?.replace('https://', 'webcal://') || '' },
  ];

  if (loading) {
    return (
      <div className={`${bgCard} rounded-xl border ${border} p-6 flex items-center justify-center`}>
        <Loader2 size={20} className="animate-spin" style={{ color: couleur }} />
      </div>
    );
  }

  return (
    <div className={`${bgCard} rounded-xl border ${border} overflow-hidden`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: '#3b82f6' }}
          >
            <Calendar size={20} />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${textPrimary}`}>Abonnement iCal</h3>
            <p className={`text-xs ${textMuted}`}>Abonnez n'importe quel calendrier à vos événements</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="px-4 pb-4">
          <div className={`p-3 rounded-lg flex items-start gap-2 ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
            <AlertCircle size={14} className="text-red-500 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* URL Field */}
          <div className="px-4 pb-3">
            <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${border} ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
              <Link2 size={14} className={textMuted} />
              <input
                type="text"
                value={icalUrl}
                readOnly
                className={`flex-1 bg-transparent text-xs font-mono ${textSecondary} outline-none truncate`}
              />
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  copied
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-white'
                }`}
                style={!copied ? { backgroundColor: couleur } : undefined}
              >
                {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
              </button>
            </div>
          </div>

          {/* Quick Subscribe */}
          <div className={`px-4 pb-3 border-t ${border} pt-3`}>
            <p className={`text-xs font-medium ${textSecondary} mb-2`}>S'abonner depuis :</p>
            <div className="flex gap-2">
              {calendarApps.map(app => (
                <a
                  key={app.name}
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${border} ${textSecondary} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'} transition-colors`}
                >
                  <span>{app.icon}</span>
                  {app.name}
                </a>
              ))}
            </div>
          </div>

          {/* Info + Regenerate */}
          <div className={`px-4 pb-4 border-t ${border} pt-3`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <AlertCircle size={12} className={`${textMuted} mt-0.5`} />
                <p className={`text-xs ${textMuted} max-w-xs`}>
                  Ce lien est privé. Toute personne disposant du lien pourra voir vos événements.
                </p>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${textMuted} hover:${isDark ? 'bg-slate-700' : 'bg-slate-100'} transition-colors`}
              >
                <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                {regenerating ? 'Régénération...' : 'Régénérer le lien'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
