/**
 * PipelineKanban — Visual kanban board for devis/commercial pipeline
 *
 * Columns: Brouillon → Envoyé → Vu → Accepté → Facturé → Payé (+ Refusé)
 * Features:
 *  - Drag-and-drop cards between columns
 *  - Card shows client, amount, date, delay
 *  - Column totals
 *  - Filter by client/period
 *  - Click card to open devis
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  FileText, Users, Euro, Clock, ArrowRight, Filter, Eye,
  CheckCircle, XCircle, Send, PenTool, Receipt, Banknote,
  ChevronDown, Search, Calendar, TrendingUp, AlertTriangle,
  GripVertical, X
} from 'lucide-react';

// ─── Column definitions ─────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'brouillon', label: 'Brouillon', icon: FileText, color: '#94a3b8', bgLight: 'bg-slate-50', bgDark: 'bg-slate-800/50' },
  { id: 'envoye', label: 'Envoyé', icon: Send, color: '#3b82f6', bgLight: 'bg-blue-50', bgDark: 'bg-blue-900/20' },
  { id: 'vu', label: 'Vu', icon: Eye, color: '#8b5cf6', bgLight: 'bg-purple-50', bgDark: 'bg-purple-900/20' },
  { id: 'accepte', label: 'Signé', icon: CheckCircle, color: '#22c55e', bgLight: 'bg-green-50', bgDark: 'bg-green-900/20' },
  { id: 'facture', label: 'Facturé', icon: Receipt, color: '#f97316', bgLight: 'bg-orange-50', bgDark: 'bg-orange-900/20' },
  { id: 'payee', label: 'Payé', icon: Banknote, color: '#10b981', bgLight: 'bg-emerald-50', bgDark: 'bg-emerald-900/20' },
  { id: 'refuse', label: 'Refusé', icon: XCircle, color: '#ef4444', bgLight: 'bg-red-50', bgDark: 'bg-red-900/20' },
];

// Valid transitions for drag-and-drop
const VALID_TRANSITIONS = {
  brouillon: ['envoye', 'refuse'],
  envoye: ['vu', 'accepte', 'refuse'],
  vu: ['accepte', 'refuse'],
  accepte: ['facture'],
  signe: ['facture'],
  facture: ['payee'],
  acompte_facture: ['facture', 'payee'],
  refuse: ['brouillon'],
};

// ─── KanbanCard ──────────────────────────────────────────────────────────────

function KanbanCard({ devis, client, isDark, couleur, onOpenDevis, onDragStart }) {
  const daysSince = useMemo(() => {
    const d = new Date(devis.updated_at || devis.date || devis.created_at);
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  }, [devis]);

  const isLate = devis.statut === 'envoye' && daysSince > 7;
  const isVeryLate = devis.statut === 'envoye' && daysSince > 14;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('devisId', devis.id);
        e.dataTransfer.setData('fromStatus', devis.statut);
        onDragStart?.(devis.id);
      }}
      onClick={() => onOpenDevis?.(devis)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDevis?.(devis); } }}
      className={`group cursor-pointer rounded-xl border p-3 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.98] ${
        isDark
          ? 'bg-slate-800 border-slate-700 hover:border-slate-500'
          : 'bg-white border-slate-200 hover:border-slate-300'
      } ${isVeryLate ? 'border-red-300' : isLate ? 'border-amber-300' : ''}`}
    >
      {/* Header: numero + grip */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-mono font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {devis.numero || '—'}
        </span>
        <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Client name */}
      <p className={`text-sm font-semibold truncate mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {client?.nom || client?.name || 'Client inconnu'}
      </p>

      {/* Object/description */}
      {devis.objet && (
        <p className={`text-xs truncate mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {devis.objet}
        </p>
      )}

      {/* Amount + delay */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: couleur }}>
          {(devis.total_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
        </span>
        <div className={`flex items-center gap-1 text-[11px] ${
          isVeryLate ? 'text-red-500' : isLate ? 'text-amber-500' : 'text-slate-400'
        }`}>
          {(isLate || isVeryLate) && <AlertTriangle size={10} />}
          <Clock size={10} />
          <span>{daysSince}j</span>
        </div>
      </div>
    </div>
  );
}

// ─── KanbanColumn ────────────────────────────────────────────────────────────

function KanbanColumn({ column, cards, clients, isDark, couleur, onOpenDevis, onDragStart, onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const Icon = column.icon;

  const total = useMemo(() =>
    cards.reduce((s, d) => s + (d.total_ttc || 0), 0),
    [cards]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const devisId = e.dataTransfer.getData('devisId');
    const fromStatus = e.dataTransfer.getData('fromStatus');
    if (devisId && fromStatus !== column.id) {
      onDrop(devisId, fromStatus, column.id);
    }
  };

  return (
    <div
      className={`flex flex-col min-w-[240px] max-w-[280px] flex-1 rounded-2xl border transition-all ${
        isDragOver
          ? 'ring-2 ring-offset-2'
          : ''
      } ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
      style={isDragOver ? { ringColor: column.color } : {}}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={`px-3 py-3 rounded-t-2xl ${isDark ? column.bgDark : column.bgLight}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={14} style={{ color: column.color }} />
            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {column.label}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-500'}`}>
              {cards.length}
            </span>
          </div>
        </div>
        {cards.length > 0 && (
          <p className="text-xs mt-1 font-medium" style={{ color: column.color }}>
            {total.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
          </p>
        )}
      </div>

      {/* Cards */}
      <div className={`flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[100px] ${
        isDragOver ? (isDark ? 'bg-slate-800/50' : 'bg-slate-50') : ''
      }`}>
        {cards.length === 0 ? (
          <div className={`text-center py-8 text-xs ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
            Aucun devis
          </div>
        ) : (
          cards.map((devis) => (
            <KanbanCard
              key={devis.id}
              devis={devis}
              client={clients.find(c => c.id === devis.client_id)}
              isDark={isDark}
              couleur={couleur}
              onOpenDevis={onOpenDevis}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Stats bar ───────────────────────────────────────────────────────────────

function PipelineStats({ devis, isDark, couleur }) {
  const stats = useMemo(() => {
    const devisOnly = devis.filter(d => d.type === 'devis');
    const total = devisOnly.length;
    const enCours = devisOnly.filter(d => ['envoye', 'vu'].includes(d.statut)).length;
    const acceptes = devisOnly.filter(d => ['accepte', 'signe'].includes(d.statut)).length;
    const refuses = devisOnly.filter(d => d.statut === 'refuse').length;
    const tauxConversion = total > 0 ? Math.round((acceptes / Math.max(1, acceptes + refuses)) * 100) : 0;
    const montantEnCours = devisOnly
      .filter(d => ['envoye', 'vu'].includes(d.statut))
      .reduce((s, d) => s + (d.total_ttc || 0), 0);
    const montantGagne = devisOnly
      .filter(d => ['accepte', 'signe', 'acompte_facture', 'facture'].includes(d.statut))
      .reduce((s, d) => s + (d.total_ttc || 0), 0);

    return { total, enCours, acceptes, refuses, tauxConversion, montantEnCours, montantGagne };
  }, [devis]);

  const statItems = [
    { label: 'En cours', value: stats.enCours, icon: Send, color: '#3b82f6' },
    { label: 'Montant en jeu', value: `${(stats.montantEnCours / 1000).toFixed(1)}k €`, icon: Euro, color: '#f97316' },
    { label: 'Taux conversion', value: `${stats.tauxConversion}%`, icon: TrendingUp, color: '#22c55e' },
    { label: 'Gagné', value: `${(stats.montantGagne / 1000).toFixed(1)}k €`, icon: CheckCircle, color: '#10b981' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {statItems.map((item, i) => (
        <div
          key={i}
          className={`rounded-xl border p-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <item.icon size={14} style={{ color: item.color }} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
          </div>
          <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Main PipelineKanban ─────────────────────────────────────────────────────

export default function PipelineKanban({
  devis = [], clients = [], isDark, couleur,
  setPage, setSelectedDevis, onUpdateDevis
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all'); // all, month, quarter, year
  const [showRefused, setShowRefused] = useState(false);
  const [dragId, setDragId] = useState(null);
  const scrollRef = useRef(null);

  // Filter devis (only type='devis', not factures)
  const filteredDevis = useMemo(() => {
    let items = devis.filter(d => d.type === 'devis');

    // Period filter
    if (filterPeriod !== 'all') {
      const now = new Date();
      let start;
      if (filterPeriod === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (filterPeriod === 'quarter') {
        const q = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), q, 1);
      } else if (filterPeriod === 'year') {
        start = new Date(now.getFullYear(), 0, 1);
      }
      if (start) {
        items = items.filter(d => new Date(d.created_at || d.date) >= start);
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(d => {
        const client = clients.find(c => c.id === d.client_id);
        const clientName = (client?.nom || client?.name || '').toLowerCase();
        return (
          clientName.includes(q) ||
          (d.numero || '').toLowerCase().includes(q) ||
          (d.objet || '').toLowerCase().includes(q)
        );
      });
    }

    return items;
  }, [devis, clients, filterPeriod, searchQuery]);

  // Group by column
  const columnData = useMemo(() => {
    const groups = {};
    for (const col of COLUMNS) {
      groups[col.id] = [];
    }
    for (const d of filteredDevis) {
      let colId = d.statut || 'brouillon';
      // Map special statuses
      if (colId === 'signe') colId = 'accepte';
      if (colId === 'acompte_facture') colId = 'facture';
      if (groups[colId]) {
        groups[colId].push(d);
      }
    }
    // Sort each column by date (most recent first)
    for (const colId of Object.keys(groups)) {
      groups[colId].sort((a, b) => new Date(b.updated_at || b.date) - new Date(a.updated_at || a.date));
    }
    return groups;
  }, [filteredDevis]);

  // Handle drop (change devis status)
  const handleDrop = useCallback((devisId, fromStatus, toStatus) => {
    // Validate transition
    const allowed = VALID_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      return; // Invalid transition, ignore
    }

    const d = devis.find(d => d.id === devisId);
    if (!d) return;

    if (onUpdateDevis) {
      onUpdateDevis({ ...d, statut: toStatus });
    }
    setDragId(null);
  }, [devis, onUpdateDevis]);

  // Open devis detail
  const handleOpenDevis = useCallback((d) => {
    if (setSelectedDevis) setSelectedDevis(d);
    if (setPage) setPage('devis');
  }, [setSelectedDevis, setPage]);

  const visibleColumns = showRefused
    ? COLUMNS
    : COLUMNS.filter(c => c.id !== 'refuse');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Pipeline commercial
          </h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Suivez vos devis de la création au paiement
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className={`relative ${isDark ? '' : ''}`}>
            <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className={`pl-8 pr-3 py-1.5 text-sm rounded-lg border w-40 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-slate-300'
              }`}
            />
          </div>

          {/* Period filter */}
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className={`text-sm rounded-lg border py-1.5 px-2 ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">Tout</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>

          {/* Toggle refused */}
          <button
            onClick={() => setShowRefused(!showRefused)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              showRefused
                ? 'bg-red-50 border-red-200 text-red-600'
                : isDark ? 'border-slate-700 text-slate-400 hover:text-slate-200' : 'border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
          >
            <XCircle size={12} className="inline mr-1" />
            Refusés {showRefused ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <PipelineStats devis={filteredDevis} isDark={isDark} couleur={couleur} />

      {/* Kanban board */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-4 -mx-3 px-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        {visibleColumns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            cards={columnData[col.id] || []}
            clients={clients}
            isDark={isDark}
            couleur={couleur}
            onOpenDevis={handleOpenDevis}
            onDragStart={setDragId}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {/* Legend */}
      <div className={`flex items-center gap-4 text-xs flex-wrap ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-amber-500" /> Envoyé {'>'} 7 jours</span>
        <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-red-500" /> Envoyé {'>'} 14 jours</span>
        <span>Glissez-déposez les cartes pour changer le statut</span>
      </div>
    </div>
  );
}
