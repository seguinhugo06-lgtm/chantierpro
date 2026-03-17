/**
 * GarantieAlertWidget.jsx — Compact alert widget for warranties expiring soon
 *
 * Displays in the main dashboard sidebar when warranties are expiring within 90 days.
 * Shows the 3 most urgent warranties with chantier name, type, and days remaining.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ChevronRight,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';
import supabase from '../../supabaseClient';
import { GARANTIE_TYPES, getGarantieProgress, getDashboardStats, getAll } from '../../services/garantieService';

// ── Helpers ─────────────────────────────────────────────────────────────────────

function formatDaysRemaining(days) {
  if (days <= 0) return 'Expiree';
  if (days === 1) return '1 jour';
  if (days < 30) return `${days}j`;
  if (days < 365) return `${Math.floor(days / 30)} mois`;
  return `${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`;
}

function getDaysRemainingColor(days) {
  if (days <= 0) return 'text-red-600';
  if (days <= 30) return 'text-red-500';
  if (days <= 60) return 'text-orange-600';
  return 'text-orange-500';
}

// ── Urgent Warranty Item ────────────────────────────────────────────────────────

function UrgentItem({ garantie, isDark }) {
  const progress = getGarantieProgress(garantie);
  const typeInfo = GARANTIE_TYPES[garantie.typeGarantie];
  const daysColor = getDaysRemainingColor(progress.daysRemaining);

  return (
    <div className={`flex items-center gap-2 py-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: typeInfo?.color || '#f97316' }}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {garantie.chantierNom || 'Chantier'}
        </p>
        <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {typeInfo?.label || garantie.typeGarantie}
        </p>
      </div>
      <span className={`text-xs font-semibold whitespace-nowrap ${daysColor}`}>
        {formatDaysRemaining(progress.daysRemaining)}
      </span>
    </div>
  );
}

// ── Main Widget ─────────────────────────────────────────────────────────────────

export default function GarantieAlertWidget({ isDark = false, couleur, onClick }) {
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const stats = await getDashboardStats(supabase, {
        userId: 'demo-user-id',
        orgId: 'demo-org-id',
      });

      if (stats.expiring90j && stats.expiring90j.length > 0) {
        // Sort by dateFin ascending (most urgent first)
        const sorted = [...stats.expiring90j].sort(
          (a, b) => new Date(a.dateFin) - new Date(b.dateFin)
        );
        setExpiringSoon(sorted);
      } else {
        setExpiringSoon([]);
      }
    } catch (err) {
      console.error('Error loading garantie alerts:', err);
      setExpiringSoon([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Don't render if loading or no expiring warranties
  if (loading) return null;
  if (expiringSoon.length === 0) return null;

  const displayItems = expiringSoon.slice(0, 3);
  const totalCount = expiringSoon.length;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border p-3 transition-all
        hover:shadow-md cursor-pointer
        ${isDark
          ? 'bg-orange-900/20 border-orange-700/40 hover:border-orange-600/60'
          : 'bg-orange-50 border-orange-200 hover:border-orange-300'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-orange-800/40' : 'bg-orange-100'}`}>
            <Shield className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <span className={`text-sm font-semibold ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
            {totalCount} garantie{totalCount > 1 ? 's' : ''} expire{totalCount > 1 ? 'nt' : ''} bientot
          </span>
        </div>
        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-orange-500' : 'text-orange-400'}`} />
      </div>

      {/* Urgent items */}
      <div className={`space-y-0.5 ${isDark ? 'divide-slate-700/50' : 'divide-orange-100'}`}>
        {displayItems.map((g) => (
          <UrgentItem key={g.id} garantie={g} isDark={isDark} />
        ))}
      </div>

      {/* "More" indicator */}
      {totalCount > 3 && (
        <p className={`text-[11px] mt-2 ${isDark ? 'text-orange-500' : 'text-orange-500'}`}>
          + {totalCount - 3} autre{totalCount - 3 > 1 ? 's' : ''}
        </p>
      )}
    </button>
  );
}
