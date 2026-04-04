/**
 * ChatSidebar.jsx — Channel list sidebar for the messaging page
 *
 * Shows: channel list grouped into collapsible sections:
 *   - Pinned, Team, Chantiers, Clients, Archived
 * Handles: channel selection, unread badges, muted state.
 * Section collapse state persisted to localStorage.
 */

import React, { useState, useMemo, memo, useCallback, useEffect, useRef } from 'react';
import {
  Search, Plus, Hash, Users, MessageCircle, Building2,
  ChevronRight, ChevronDown, VolumeX, X, Pin, Archive, User,
  MoreHorizontal, LogOut,
} from 'lucide-react';

const STORAGE_KEY = 'chat_sidebar_collapsed';

const SECTION_CONFIG = [
  { key: 'pinned', label: 'Epingles', icon: Pin, color: '#eab308' },
  { key: 'equipe', label: 'Equipe', icon: Users, color: '#3b82f6' },
  { key: 'chantier', label: 'Chantiers', icon: Building2, color: '#22c55e' },
  { key: 'direct', label: 'Clients', icon: User, color: '#f97316' },
  { key: 'archived', label: 'Archives', icon: Archive, color: '#6b7280' },
];

function loadCollapsedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCollapsedState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

const ChatSidebar = memo(function ChatSidebar({
  channels = [],
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  onMuteChannel,
  onArchiveChannel,
  isDark = false,
  couleur = '#f97316',
  isMobile = false,
  onClose,
  currentUserId,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState(() => loadCollapsedState());

  // Persist collapsed state
  useEffect(() => {
    saveCollapsedState(collapsedSections);
  }, [collapsedSections]);

  const toggleSection = useCallback((key) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
  }, []);

  // Filter channels by search
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.otherUser?.name?.toLowerCase().includes(q) ||
      c.lastMessagePreview?.toLowerCase().includes(q)
    );
  }, [channels, searchQuery]);

  // Group channels into sections
  const sections = useMemo(() => {
    const pinned = [];
    const equipe = [];
    const chantier = [];
    const direct = [];
    const archived = [];

    filteredChannels.forEach(ch => {
      if (ch.archived) {
        archived.push(ch);
      } else if (ch.pinned) {
        pinned.push(ch);
      } else {
        const type = ch.type || 'custom';
        if (type === 'equipe' || type === 'custom') equipe.push(ch);
        else if (type === 'chantier') chantier.push(ch);
        else if (type === 'direct') direct.push(ch);
        else equipe.push(ch);
      }
    });

    return { pinned, equipe, chantier, direct, archived };
  }, [filteredChannels]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const bgClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';

  const totalUnread = channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className={`${bgClass} ${isMobile ? 'w-full' : 'w-80 border-r'} flex flex-col h-full`}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: isDark ? 'rgb(51,65,85)' : 'rgb(229,231,235)' }}>
        <div className="flex items-center gap-2">
          <h2 className={`text-base font-semibold ${textPrimary}`}>Messages</h2>
          {totalUnread > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold min-w-[18px] text-center">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreateChannel}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
            title="Nouveau canal"
          >
            <Plus size={18} />
          </button>
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="relative">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs ${inputBg}`}
          />
        </div>
      </div>

      {/* Channel list by sections */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {SECTION_CONFIG.map(({ key, label, icon: SectionIcon, color }) => {
          const sectionChannels = sections[key] || [];
          const isCollapsed = !!collapsedSections[key];
          const sectionUnread = sectionChannels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
          const isEmpty = sectionChannels.length === 0;

          // Always show equipe/chantier/direct sections even if empty
          const alwaysShow = ['equipe', 'chantier', 'direct'].includes(key);
          // Hide pinned/archived if empty
          if (isEmpty && !alwaysShow) return null;

          return (
            <div key={key} className="mb-1">
              {/* Section header */}
              <button
                onClick={() => toggleSection(key)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition-colors ${textMuted} ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
              >
                {isCollapsed ? (
                  <ChevronRight size={12} className="flex-shrink-0" />
                ) : (
                  <ChevronDown size={12} className="flex-shrink-0" />
                )}
                <SectionIcon size={12} style={{ color }} className="flex-shrink-0" />
                <span>{label}</span>
                {sectionUnread > 0 && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">
                    {sectionUnread}
                  </span>
                )}
              </button>

              {/* Channel items or empty message */}
              {!isCollapsed && (
                <>
                  {sectionChannels.map(channel => (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      isActive={channel.id === activeChannelId}
                      isDark={isDark}
                      couleur={couleur}
                      currentUserId={currentUserId}
                      onSelect={() => onSelectChannel(channel.id)}
                      onMute={onMuteChannel}
                      onArchive={onArchiveChannel}
                    />
                  ))}
                  {isEmpty && (
                    <p className={`text-[11px] px-4 py-2 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                      Aucun canal
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Global empty state (no channels at all) */}
        {filteredChannels.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-8">
            <MessageCircle size={32} className={textMuted} />
            <p className={`text-sm mt-2 ${textMuted}`}>
              Aucun résultat
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

// ── Channel Item ────────────────────────────────────────────────────────────────

const ChannelItem = memo(function ChannelItem({
  channel,
  isActive,
  isDark,
  couleur,
  currentUserId,
  onSelect,
  onMute,
  onArchive,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);
  const displayName = channel.type === 'direct'
    ? channel.otherUser?.name || 'Direct'
    : channel.name;

  const initial = displayName?.charAt(0).toUpperCase() || '?';

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const activeBg = isDark
    ? 'bg-slate-700/70'
    : 'bg-gray-100';

  const hoverBg = isDark
    ? 'hover:bg-slate-700/40'
    : 'hover:bg-gray-50';

  const typeIcon = {
    equipe: <Users size={12} className="text-blue-500" />,
    chantier: <Building2 size={12} className="text-emerald-500" />,
    direct: null,
    custom: <Hash size={12} className="text-purple-500" />,
  };

  return (
    <button
      onClick={onSelect}
      className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors ${
        isActive ? activeBg : hoverBg
      } mb-0.5`}
    >
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
        channel.type === 'direct'
          ? 'bg-gradient-to-br from-orange-400 to-orange-600'
          : channel.type === 'equipe'
            ? 'bg-gradient-to-br from-blue-400 to-blue-600'
            : channel.type === 'chantier'
              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
              : 'bg-gradient-to-br from-purple-400 to-purple-600'
      }`}>
        {initial}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1">
          {typeIcon[channel.type]}
          <span className={`text-sm font-medium truncate ${
            channel.unreadCount > 0
              ? isDark ? 'text-white' : 'text-gray-900'
              : isDark ? 'text-slate-300' : 'text-gray-700'
          }`}>
            {displayName}
          </span>
          {channel.pinned && (
            <Pin size={10} className={isDark ? 'text-yellow-500' : 'text-yellow-600'} />
          )}
          {channel.muted && (
            <VolumeX size={10} className={isDark ? 'text-slate-600' : 'text-gray-300'} />
          )}
        </div>
        {channel.lastMessagePreview && (
          <p className={`text-[11px] truncate ${
            channel.unreadCount > 0
              ? isDark ? 'text-slate-300 font-medium' : 'text-gray-600 font-medium'
              : isDark ? 'text-slate-500' : 'text-gray-400'
          }`}>
            {channel.lastMessagePreview}
          </p>
        )}
      </div>

      {/* Right side: time + unread + menu */}
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <div className="flex items-center gap-0.5">
          <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            {formatTime(channel.lastMessageAt)}
          </span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors opacity-0 group-hover:opacity-100 ${
                isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-400'
              }`}
            >
              <MoreHorizontal size={12} />
            </button>
            {showMenu && (
              <div className={`absolute right-0 top-full mt-1 w-36 rounded-xl border shadow-lg py-1 z-50 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              }`} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { onMute?.(channel.id); setShowMenu(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <VolumeX size={12} /> {channel.muted ? 'Réactiver' : 'Muter'}
                </button>
                <button
                  onClick={() => { onArchive?.(channel.id); setShowMenu(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Archive size={12} /> {channel.isArchived ? 'Désarchiver' : 'Archiver'}
                </button>
              </div>
            )}
          </div>
        </div>
        {channel.unreadCount > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold min-w-[16px] text-center">
            {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
          </span>
        )}
      </div>
    </button>
  );
});

export default ChatSidebar;
