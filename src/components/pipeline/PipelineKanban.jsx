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

// Tons des statuts (src/lib/statuts.js) : un statut = un mot et un ton, partout ; plus de couleurs en dur
const COLUMNS = [
  { id: 'brouillon', label: 'Brouillon', icon: FileText, fond: 'bg-neutre-fond', texte: 'text-neutre-texte' },
  { id: 'envoye', label: 'Envoyé', icon: Send, fond: 'bg-info-fond', texte: 'text-info-texte' },
  { id: 'vu', label: 'Vu', icon: Eye, fond: 'bg-info-fond', texte: 'text-info-texte' },
  { id: 'accepte', label: 'Signé', icon: CheckCircle, fond: 'bg-succes-fond', texte: 'text-succes-texte' },
  { id: 'facture', label: 'Facturé', icon: Receipt, fond: 'bg-neutre-fond', texte: 'text-neutre-texte' },
  { id: 'payee', label: 'Payé', icon: Banknote, fond: 'bg-succes-fond', texte: 'text-succes-texte' },
  { id: 'refuse', label: 'Refusé', icon: XCircle, fond: 'bg-danger-fond', texte: 'text-danger-texte' },
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
      className={`group cursor-pointer rounded-xl border p-3 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.98] bg-surface border-bord hover:border-bord-fort ${isVeryLate ? 'border-red-300' : isLate ? 'border-amber-300' : ''}`}
    >
      {/* Header: numero + grip */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-mono font-medium text-encre-3`}>
          {devis.numero || '—'}
        </span>
        <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Client name */}
      <p className={`text-sm font-semibold truncate mb-1 text-encre`}>
        {client?.nom || client?.name || 'Client inconnu'}
      </p>

      {/* Object/description */}
      {devis.objet && (
        <p className={`text-xs truncate mb-2 text-encre-3`}>
          {devis.objet}
        </p>
      )}

      {/* Amount + delay */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-accent-texte">
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
          ? 'ring-2 ring-accent'
          : ''
      } border-bord`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={`px-3 py-3 rounded-t-2xl ${column.fond}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={14} className={column.texte} aria-hidden="true" />
            <span className={`text-sm font-semibold text-encre`}>
              {column.label}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium bg-surface text-encre-3`}>
              {cards.length}
            </span>
          </div>
        </div>
        {cards.length > 0 && (
          <p className={`text-xs mt-1 font-medium ${column.texte}`}>
            {total.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
          </p>
        )}
      </div>

      {/* Cards */}
      <div className={`flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[100px] ${
        isDragOver ? 'bg-fond' : ''
      }`}>
        {cards.length === 0 ? (
          <div className="text-center py-8 text-xs text-encre-3">
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
    { label: 'En cours', value: stats.enCours, icon: Send },
    { label: 'Montant en jeu', value: `${(stats.montantEnCours / 1000).toFixed(1)}k €`, icon: Euro },
    { label: 'Taux conversion', value: `${stats.tauxConversion}%`, icon: TrendingUp },
    { label: 'Gagné', value: `${(stats.montantGagne / 1000).toFixed(1)}k €`, icon: CheckCircle },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {statItems.map((item, i) => (
        <div
          key={i}
          className={`rounded-xl border p-3 bg-surface border-bord`}
        >
          <div className="flex items-center gap-2 mb-1">
            <item.icon size={14} className="text-encre-3" aria-hidden="true" />
            <span className={`text-xs text-encre-3`}>{item.label}</span>
          </div>
          <p className={`text-lg font-bold text-encre`}>
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
          <h1 className={`text-2xl font-bold text-encre`}>
            Pipeline commercial
          </h1>
          <p className={`text-sm text-encre-3`}>
            Suivez vos devis de la création au paiement
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className={`relative `}>
            <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-encre-3`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              aria-label="Rechercher dans les colonnes"
              className="pl-8 pr-3 h-11 text-sm rounded-lg border w-40 focus:outline-none focus:ring-2 focus:ring-accent bg-surface border-bord-fort text-encre placeholder:text-encre-3"
            />
          </div>

          {/* Period filter */}
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className={`text-sm rounded-lg border py-1.5 px-2 bg-surface border-bord text-encre-2`}
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
                : 'border-bord text-encre-3 hover:text-encre-2'
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
      <div className={`flex items-center gap-4 text-xs flex-wrap text-encre-3`}>
        <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-amber-500" /> Envoyé {'>'} 7 jours</span>
        <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-red-500" /> Envoyé {'>'} 14 jours</span>
        <span>Glissez-déposez les cartes pour changer le statut</span>
      </div>
    </div>
  );
}
